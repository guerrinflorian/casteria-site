// LES PEAUX DES JOUEURS (le prototype du 29/10/2026) : la tête découpée de la peau (en pixels nets), le joueur dessiné de
// face (une image tout de suite), puis le joueur EN 3D (la bibliothèque skinview3d, copiée dans le site :
// assets/vendor/skinview3d/, sa licence MIT à côté ; jamais un CDN).
// La 3D est lourde (480 Ko, trois.js dedans) : elle ne se charge qu'APRÈS la page, quand le navigateur est libre, ou dès
// que le visiteur bouge la souris, touche l'écran ou fait défiler ; jamais avec « économie de données », jamais sans WebGL.
// Le joueur dessiné de face reste à sa place tant qu'elle n'est pas là : la page est entière sans elle.
// Une adresse de peau passe toujours par CasteriaApi.peau() (une adresse du site ou de l'API, rien d'autre).
(function () {
  'use strict'
  var A = window.CasteriaApi
  if (!A) return
  var BIBLIO = 'assets/vendor/skinview3d/skinview3d.bundle.js'
  var calme = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  var photo = /[?&]photo\b/.test(location.search)

  // ---------- la tête : la face (8 x 8) et le chapeau par-dessus, deux fonds de la même image, agrandis au pixel près ----------
  function tete(e, url, taille) {
    var u = A.peau(url), k = taille / 8
    e.style.width = e.style.height = taille + 'px'
    e.style.backgroundImage = 'url("' + u + '"), url("' + u + '")'
    e.style.backgroundSize = (64 * k) + 'px ' + (64 * k) + 'px'
    e.style.backgroundPosition = (-40 * k) + 'px ' + (-8 * k) + 'px, ' + (-8 * k) + 'px ' + (-8 * k) + 'px'
    return e
  }

  // ---------- le joueur de face (16 x 32 pixels de la peau), sur un canvas, au pixel près ----------
  var images = {}
  function image(u) {
    if (!images[u]) images[u] = new Promise(function (ok, non) { var i = new Image(); i.decoding = 'async'; i.onload = function () { ok(i) }; i.onerror = non; i.src = u })
    return images[u]
  }
  function deFace(canvas, url, modele) {
    var u = A.peau(url), fin = modele === 'fin', b = fin ? 3 : 4
    canvas.width = 16; canvas.height = 32
    return image(u).then(function (i) {
      var c = canvas.getContext('2d')
      if (!c) return
      c.imageSmoothingEnabled = false
      c.clearRect(0, 0, 16, 32)
      var vieille = i.height === 32
      // [x, y, l, h, dx, dy] : la face avant de chaque partie, puis sa seconde couche
      var parts = [[8, 8, 8, 8, 4, 0], [20, 20, 8, 12, 4, 8], [44, 20, b, 12, 4 - b, 8], [vieille ? 44 : 36, vieille ? 20 : 52, b, 12, 12, 8], [4, 20, 4, 12, 4, 20], [vieille ? 4 : 20, vieille ? 20 : 52, 4, 12, 8, 20]]
      var dessus = vieille ? [[40, 8, 8, 8, 4, 0]] : [[40, 8, 8, 8, 4, 0], [20, 36, 8, 12, 4, 8], [44, 36, b, 12, 4 - b, 8], [52, 52, b, 12, 12, 8], [4, 36, 4, 12, 4, 20], [4, 52, 4, 12, 8, 20]]
      parts.concat(dessus).forEach(function (p) { c.drawImage(i, p[0], p[1], p[2], p[3], p[4], p[5], p[2], p[3]) })
      canvas.classList.add('pret')
    }).catch(function () {})
  }

  // ---------- la 3D : chargée une fois, à la demande ----------
  var promesse3d = null, voulu = false
  function webgl() { try { var c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))) } catch (e) { return false } }
  // le test du WebGL, une fois et seulement au besoin (créer un contexte coûte : jamais pendant le chargement de la page)
  // possible3d : un test léger (la page s'en sert pour ses boutons) ; webglVu : le vrai (un contexte créé), une fois, au premier
  // geste, avant de charger la bibliothèque (Lighthouse, 29/10 : le créer pendant le chargement coûtait 0,4 s au téléphone)
  var webglVu = null
  function possible3d() { return !!window.WebGLRenderingContext && !(navigator.connection && navigator.connection.saveData) && webglVu !== false }
  function charger3d() {
    if (!possible3d()) return Promise.reject(new Error('sans 3D'))
    if (webglVu === null) webglVu = webgl()
    if (!webglVu) return Promise.reject(new Error('sans 3D'))
    if (!promesse3d) promesse3d = new Promise(function (ok, non) {
      if (window.skinview3d) return ok(window.skinview3d)
      var s = document.createElement('script')
      s.src = BIBLIO; s.async = true
      s.onload = function () { window.skinview3d ? ok(window.skinview3d) : non(new Error('skinview3d')) }
      s.onerror = function () { non(new Error('skinview3d')) }
      document.head.appendChild(s)
    })
    return promesse3d
  }
  // AU PREMIER GESTE du visiteur (bouger la souris, toucher, défiler, une touche) : les vues 3D en attente arrivent ; d'ici là,
  // les peaux de face (jamais un podium vide). Plus de minuteur « au repos » : la bibliothèque (three.js) tombait dans la
  // mesure du chargement (Lighthouse, le 29/10 : 2 s de blocage au téléphone)
  // (b5, l'assemblage du 29/10 ; la tete : « skinview3d charge seulement quand le podium arrive a l'ecran ») ET une vue en
  // attente a l'ecran : une page dont les vues 3D sont plus bas ne charge rien tant qu'on n'y est pas descendu
  // (une boite est souvent encore hors de la page quand sa vue est demandee : elle est observee a l'image suivante, et
  // regardee directement au geste)
  var attente = [], geste = false, aLEcran = false, guettees = []
  var guetteur = ('IntersectionObserver' in window) ? new IntersectionObserver(function (es) {
    for (var i = 0; i < es.length; i++) if (es[i].isIntersecting) { aLEcran = true; guetteur.disconnect(); essayer(); return }
  }, { rootMargin: '200px 0px' }) : null
  function guetter(boite) {
    if (!guetteur) { aLEcran = true; return }
    if (aLEcran) return
    guettees.push(boite)
    requestAnimationFrame(function () { if (!aLEcran) guetteur.observe(boite) })
  }
  function visible(b) { var r = b.getBoundingClientRect(); return r.width > 0 && r.bottom > -200 && r.top < (window.innerHeight || 800) + 200 }
  function essayer() {
    if (!aLEcran && geste) for (var i = 0; i < guettees.length; i++) if (visible(guettees[i])) { aLEcran = true; if (guetteur) guetteur.disconnect(); break }
    if (geste && aLEcran) lancer()
  }
  function auGeste() {
    geste = true
    ;['pointermove', 'pointerdown', 'keydown', 'scroll', 'wheel', 'touchstart'].forEach(function (t) { window.removeEventListener(t, auGeste, true) })
    essayer()
  }
  function lancer() {
    if (voulu) return
    voulu = true
    charger3d().then(function () { var l = attente; attente = []; (function une() { var f = l.shift(); if (!f) return; f(); setTimeout(une, 60) })() }).catch(function () { attente = [] })
  }
  if (!photo) {
    ;['pointermove', 'pointerdown', 'keydown', 'scroll', 'wheel', 'touchstart'].forEach(function (t) { window.addEventListener(t, auGeste, { capture: true, passive: true }) })
  }
  if (photo && possible3d()) { voulu = true; charger3d().then(function () { var l = attente; attente = []; l.forEach(function (f) { f() }) }).catch(function () {}) }

  // LE REGARD : la tête (et un peu le corps) de chaque joueur en 3D suit la souris, en douceur
  var regards = []
  if (!calme && window.matchMedia && window.matchMedia('(hover: hover)').matches) {
    window.addEventListener('pointermove', function (e) {
      for (var i = 0; i < regards.length; i++) {
        var r = regards[i], b = r.canvas.getBoundingClientRect()
        if (!b.width) continue
        var dx = (e.clientX - (b.left + b.width / 2)) / Math.max(320, window.innerWidth / 2), dy = (e.clientY - (b.top + b.height * 0.22)) / Math.max(320, window.innerHeight / 2)
        r.cible.y = Math.max(-0.9, Math.min(0.9, dx * 1.1)); r.cible.x = Math.max(-0.5, Math.min(0.5, dy * 0.7))
      }
    }, { passive: true })
  }

  // une vue 3D dans « boite » (le canvas de face y reste jusqu'à ce qu'elle soit prête) ; o : { largeur, hauteur, tourne
  // (le corps de biais, en radians), zoom, pose ('repos', 'victoire', 'marche', 'salut'), glisser (tourner au doigt) }
  // rend { poser(nom), saluer(), detruire() }
  function vue3d(boite, url, modele, o) {
    o = o || {}
    var poignee = { vue: null, poseVoulue: o.pose || 'repos', detruit: false }
    poignee.poser = function (nom) { poignee.poseVoulue = nom; if (poignee.vue) appliquer(poignee, nom) }
    poignee.saluer = function () { if (!poignee.vue || calme) return; poignee.salut = 1.4 }
    // une autre taille seulement (redonner la même taille à un canvas l'efface)
    poignee.taille = function (l, h) { var v = poignee.vue; if (v && l > 0 && h > 0 && (Math.round(l) !== Math.round(v.width) || Math.round(h) !== Math.round(v.height))) { v.width = l; v.height = h } }
    poignee.detruire = function () { poignee.detruit = true; if (poignee.vue) { try { poignee.vue.dispose() } catch (e) {} } regards = regards.filter(function (r) { return r.p !== poignee }) }
    var essais = 0
    function creer() {
      if (poignee.detruit || !window.skinview3d) return
      // la boîte pas encore à sa place (elle entre dans la page juste après) : l'image suivante, dix fois au plus
      if ((!boite.isConnected || !boite.clientWidth) && essais++ < 10) { requestAnimationFrame(creer); return }
      var S = window.skinview3d, canvas = document.createElement('canvas')
      canvas.className = 'vue3d'
      canvas.setAttribute('aria-hidden', 'true')
      // un fond TRANSPARENT : le contexte est demandé avant skinview3d, avec la transparence (il le reprend tel quel)
      var attributs = { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: photo }
      try { canvas.getContext('webgl2', attributs) || canvas.getContext('webgl', attributs) } catch (e) {}
      var l = boite.clientWidth || o.largeur || 160, h = boite.clientHeight || o.hauteur || 240
      var v
      try {
        v = new S.SkinViewer({ canvas: canvas, width: l, height: h, zoom: o.zoom || 0.86, fov: 38,
          pixelRatio: Math.min(window.devicePixelRatio || 1, 2), enableControls: !!o.glisser, preserveDrawingBuffer: photo })
      } catch (e) { return }
      // JAMAIS UN PODIUM VIDE : le joueur de face (2D) reste tant que la peau n'est pas chargée dans la 3D et dessinée deux fois ;
      // une peau qui ne se charge pas, un WebGL qui manque : le 2D reste, la 3D ne se montre jamais
      var montrer = function () { requestAnimationFrame(function () { requestAnimationFrame(function () { if (!poignee.detruit) boite.classList.add('en-3d') }) }) }
      try { v.loadSkin(A.peau(url), { model: modele === 'fin' ? 'slim' : 'default' }).then(montrer, function () {}) } catch (e) { return }
      v.globalLight.intensity = 2.6; v.cameraLight.intensity = 0.9
      if (v.controls) { v.controls.enableZoom = false; v.controls.enablePan = false; v.controls.enableRotate = !!o.glisser }
      v.playerObject.rotation.y = o.tourne || 0
      poignee.vue = v
      var regard = { p: poignee, canvas: canvas, cible: { x: 0, y: 0 } }
      regards.push(regard)
      appliquer(poignee, poignee.poseVoulue, regard)
      boite.appendChild(canvas)
      // hors de l'écran ou onglet caché : la vue se repose (aucun calcul pour rien) ; pour une photo de la page entière, jamais
      if (!photo && 'IntersectionObserver' in window) new IntersectionObserver(function (es) { es.forEach(function (x) { poignee.visible = x.isIntersecting; v.renderPaused = !x.isIntersecting || document.hidden }) }).observe(boite)
      document.addEventListener('visibilitychange', function () { v.renderPaused = document.hidden || poignee.visible === false })
    }
    if (window.skinview3d) creer(); else { attente.push(creer); guetter(boite); if (voulu) charger3d().then(function () { var l = attente; attente = []; l.forEach(function (f) { f() }) }).catch(function () {}) }
    return poignee
  }
  // LES POSES : une animation maison (skinview3d.FunctionAnimation) : le souffle, les bras qui se balancent, le regard qui
  // suit la souris ; la victoire lève un bras de temps en temps ; la marche ; un salut au clic
  function appliquer(poignee, nom, regard) {
    var S = window.skinview3d, v = poignee.vue
    if (!S || !v) return
    regard = regard || regards.filter(function (r) { return r.p === poignee })[0] || { cible: { x: 0, y: 0 } }
    var base = v.playerObject.rotation.y
    if (calme || photo) {
      v.animation = null
      var s = v.playerObject.skin
      s.leftArm.rotation.z = 0.08; s.rightArm.rotation.z = -0.08
      if (nom === 'victoire') { s.rightArm.rotation.x = Math.PI; s.rightArm.rotation.z = -0.2 }
      return
    }
    if (nom === 'marche') { v.animation = new S.WalkingAnimation(); v.animation.speed = 0.7; return }
    v.animation = new S.FunctionAnimation(function (j, t) {
      var s = j.skin, sw = Math.sin(t * 2), cw = Math.cos(t * 2)
      s.leftArm.rotation.z = cw * 0.03 + 0.06; s.rightArm.rotation.z = -cw * 0.03 - 0.06
      s.leftArm.rotation.x = sw * 0.03; s.rightArm.rotation.x = -sw * 0.03
      // la victoire : le bras droit levé quelques secondes, toutes les dix secondes ; le salut (un clic) : le bras qui s'agite
      var cycle = t % 10, leve = nom === 'victoire' && cycle > 6 ? Math.min(1, (cycle - 6) * 2, (10 - cycle) * 2) : 0
      if (poignee.salut > 0) { poignee.salut -= 1 / 60; leve = Math.max(leve, Math.min(1, poignee.salut * 3)) }
      if (leve > 0) { s.rightArm.rotation.x = -Math.PI * 0.92 * leve; s.rightArm.rotation.z = -0.1 - (poignee.salut > 0 ? Math.sin(t * 14) * 0.35 : 0.2) * leve }
      // le regard : la tête vers la souris, le corps un peu
      s.head.rotation.y += (regard.cible.y - s.head.rotation.y) * 0.1
      s.head.rotation.x += (regard.cible.x - s.head.rotation.x) * 0.1
      j.rotation.y += (base + regard.cible.y * 0.25 - j.rotation.y) * 0.05
    })
  }

  window.CasteriaPeau = { tete: tete, deFace: deFace, vue3d: vue3d, possible3d: possible3d }
})()
