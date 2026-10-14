// Casteria, le site : LA SCÈNE EN COUCHES de l'accueil (INTERFACES, 07/10 ; le style demandé par le propriétaire). Rien
// n'est indispensable : sans ce fichier la page se lit entière (ses éléments sont visibles par défaut).
//   [data-scene] .pointeur[data-profondeur]  la souris déplace chaque couche selon sa profondeur (en pixels), adoucie
//   body.scene-prete                        les choses du haut de page arrivent (css/scene.css : .entree)
//   .monte                                  monte quand on y arrive (.vu)
//   [data-defile]                           glisse moins vite que la page (un facteur : 0,18 = 18 % du défilement)
//   .poussieres                             des poussières lumineuses qui montent
//   .carte-tresor b[data-n]                 les chiffres comptent jusqu'à leur valeur
//   [data-cinema]                           le haut de page en cinéma : ses lueurs, ses braises et ses étoiles
(function () {
  'use strict'
  var calme = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (/[?&]photo/.test(location.search)) calme = true
  var souris = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches
  var corps = document.body
  corps.classList.add('scene-js')

  // ---------- l'arrivée du haut de page ----------
  function pret() { corps.classList.add('scene-prete') }
  if (calme) pret()
  else if (document.readyState === 'complete') setTimeout(pret, 120)
  else window.addEventListener('load', function () { setTimeout(pret, 120) }, { once: true })
  setTimeout(pret, 2500) // un filet : une image lente ne retient jamais la scène

  // ---------- ce qui monte quand on y arrive ----------
  var montes = document.querySelectorAll('.monte')
  if (calme || !('IntersectionObserver' in window)) montes.forEach(function (e) { e.classList.add('vu') })
  else {
    var oeil = new IntersectionObserver(function (es) {
      es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('vu'); oeil.unobserve(x.target) } })
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' })
    montes.forEach(function (e) { oeil.observe(e) })
    setTimeout(function () { montes.forEach(function (e) { var r = e.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) e.classList.add('vu') }) }, 1800)
  }

  // ---------- les chiffres de la carte au trésor ----------
  var chiffres = document.querySelectorAll('.carte-tresor b[data-n]')
  if (!calme && 'IntersectionObserver' in window) {
    var compteur = new IntersectionObserver(function (es) {
      es.forEach(function (x) {
        if (!x.isIntersecting) return
        compteur.unobserve(x.target)
        var but = +x.target.dataset.n, debut = performance.now()
        ;(function pas(m) { var k = Math.min(1, (m - debut) / 1200); x.target.textContent = Math.round(but * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(pas) })(debut)
      })
    }, { threshold: 0.6 })
    chiffres.forEach(function (c) { compteur.observe(c) })
  }

  // ---------- les poussières lumineuses ----------
  if (!calme) document.querySelectorAll('.poussieres').forEach(function (p) {
    var n = window.innerWidth < 700 ? 12 : 26
    for (var i = 0; i < n; i++) {
      var s = document.createElement('span'), t = 3 + Math.random() * 7
      s.style.setProperty('--t', t.toFixed(1) + 'px')
      s.style.left = (Math.random() * 100).toFixed(1) + '%'
      s.style.animationDuration = (8 + Math.random() * 10).toFixed(1) + 's'
      s.style.animationDelay = (-Math.random() * 16).toFixed(1) + 's'
      p.appendChild(s)
    }
  })

  // ---------- le haut de page en cinéma (14/10/2026) : les lueurs posées sur l'image exacte, des braises, des étoiles ----------
  // Chaque .lueur porte data-paysage et data-portrait : x et y en % de l'image, puis son diamètre en % de la largeur de
  // l'image ; elle suit le cadrage réel (object-fit: cover et l'object-position de la feuille de style), quelle que soit la
  // version que le <picture> a choisie. La toile « ciel-vivant » : au plus 34 braises qui montent de la fusée et 28 étoiles
  // qui scintillent, 40 images par seconde au plus, rien quand l'onglet est caché ou le haut de page hors de la vue.
  if (!calme) document.querySelectorAll('[data-cinema]').forEach(function (plan) {
    var img = plan.querySelector('img'), toile = plan.querySelector('.ciel-vivant'), lueurs = plan.querySelectorAll('.lueur')
    if (!img) return
    var c = toile && toile.getContext ? toile.getContext('2d') : null
    var cadre = null, braises = [], etoiles = [], visible = true, dernier = 0, boucle = 0
    // un point lumineux pré-dessiné (un dégradé rond), copié à chaque image : bien moins cher qu'un dégradé par point
    function sprite(r, g, b) {
      var s = document.createElement('canvas'), x = s.getContext('2d'), d = x.createRadialGradient(16, 16, 0, 16, 16, 16)
      s.width = s.height = 32
      d.addColorStop(0, 'rgba(255,255,255,1)'); d.addColorStop(0.18, 'rgba(' + r + ',' + g + ',' + b + ',.9)'); d.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)')
      x.fillStyle = d; x.fillRect(0, 0, 32, 32)
      return s
    }
    var feu = c ? sprite(255, 170, 80) : null, astre = c ? sprite(210, 200, 255) : null
    function cadrer() {
      if (!img.naturalWidth || !img.clientWidth) return
      var W = img.clientWidth, H = img.clientHeight, iw = img.naturalWidth, ih = img.naturalHeight
      var op = getComputedStyle(img).objectPosition.split(' ')
      var px = parseFloat(op[0]) / 100, py = parseFloat(op[1] || '50%') / 100
      if (isNaN(px)) px = 0.5
      if (isNaN(py)) py = 0.5
      var k = Math.max(W / iw, H / ih)
      cadre = { W: W, H: H, w: iw * k, h: ih * k, ox: (W - iw * k) * px, oy: (H - ih * k) * py, portrait: ih > iw }
      lueurs.forEach(function (l) {
        var v = (l.getAttribute(cadre.portrait ? 'data-portrait' : 'data-paysage') || '').split(' ').map(Number)
        if (v.length < 3 || v.some(isNaN)) return
        l.style.left = (cadre.ox + cadre.w * v[0] / 100).toFixed(1) + 'px'
        l.style.top = (cadre.oy + cadre.h * v[1] / 100).toFixed(1) + 'px'
        l.style.setProperty('--d', (cadre.w * v[2] / 100).toFixed(1) + 'px')
        l.classList.add('placee')
      })
      if (!c) return
      // la toile : la taille de l'image, 2,4 millions de pixels au plus (un grand écran ne coûte pas plus)
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(2400000 / (W * H)))
      toile.width = Math.round(W * dpr); toile.height = Math.round(H * dpr)
      toile.style.width = W + 'px'; toile.style.height = H + 'px'
      c.setTransform(dpr, 0, 0, dpr, 0, 0)
      // les étoiles : dans le ciel de l'image (le haut), chacune à son rythme
      etoiles = []
      var n = W < 700 ? 16 : 28, haut = cadre.portrait ? 0.42 : 0.4
      for (var i = 0; i < n; i++) etoiles.push({ x: Math.random(), y: 0.02 + Math.random() * haut, t: 0.8 + Math.random() * 1.6, p: Math.random() * 6.3, s: 0.8 + Math.random() * 1.4 })
      braises = []
    }
    // une braise naît au pied de la fusée (la zone du décollage, en % de l'image) et monte en dérivant
    function naitre() {
      var z = cadre.portrait ? [0.22, 0.5, 0.62, 0.76] : [0.3, 0.52, 0.46, 0.6]
      braises.push({ x: z[0] + Math.random() * (z[1] - z[0]), y: z[2] + Math.random() * (z[3] - z[2]), vy: 0.022 + Math.random() * 0.035, vx: -0.009 + Math.random() * 0.014,
        age: 0, vie: 3.5 + Math.random() * 3.5, s: 0.7 + Math.random() * 1.1, p: Math.random() * 6.3 })
    }
    function image(m) {
      boucle = 0
      if (!visible || document.hidden || !cadre || !c) return
      boucle = requestAnimationFrame(image)
      if (m - dernier < 24) return
      var dt = Math.min(0.1, (m - dernier) / 1000 || 0.016), t = m / 1000
      dernier = m
      var max = cadre.W < 700 ? 18 : 34
      if (braises.length < max && Math.random() < 0.5) naitre()
      c.clearRect(0, 0, cadre.W, cadre.H)
      c.globalCompositeOperation = 'lighter'
      var i, e, a, r
      for (i = 0; i < etoiles.length; i++) {
        e = etoiles[i]
        a = Math.sin(t * e.t + e.p)
        if (a <= 0.2) continue
        a = (a - 0.2) / 0.8
        c.globalAlpha = a * a * 0.9
        r = e.s * 4
        c.drawImage(astre, cadre.ox + cadre.w * e.x - r, cadre.oy + cadre.h * e.y - r, r * 2, r * 2)
      }
      for (i = braises.length - 1; i >= 0; i--) {
        e = braises[i]
        e.age += dt
        if (e.age >= e.vie) { braises.splice(i, 1); continue }
        e.y -= e.vy * dt
        e.x += (e.vx + Math.sin(e.age * 1.6 + e.p) * 0.004) * dt
        a = Math.min(1, e.age / 0.5) * Math.min(1, (e.vie - e.age) / (e.vie * 0.45))
        c.globalAlpha = Math.max(0, a * (0.7 + 0.3 * Math.sin(e.age * 11 + e.p)))
        r = e.s * Math.max(3, cadre.w / 520)
        c.drawImage(feu, cadre.ox + cadre.w * e.x - r, cadre.oy + cadre.h * e.y - r, r * 2, r * 2)
      }
      c.globalAlpha = 1
      c.globalCompositeOperation = 'source-over'
    }
    function relancer() { if (!boucle && visible && !document.hidden && cadre && c) boucle = requestAnimationFrame(image) }
    var attente = 0
    function recadrer() { if (!attente) attente = requestAnimationFrame(function () { attente = 0; cadrer(); relancer() }) }
    if (img.complete) recadrer()
    img.addEventListener('load', recadrer)
    window.addEventListener('resize', recadrer, { passive: true })
    document.addEventListener('visibilitychange', relancer)
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; relancer() }).observe(plan)
  })

  if (calme) return

  // ---------- la souris : chaque couche suit selon sa profondeur, adoucie (une seule boucle d'images) ----------
  var couches = []
  if (souris) {
    document.querySelectorAll('[data-scene]').forEach(function (scene) {
      var miennes = Array.prototype.map.call(scene.querySelectorAll('.pointeur[data-profondeur]'), function (e) {
        return { e: e, d: Number(e.dataset.profondeur) || 0, x: 0, y: 0, vx: 0, vy: 0 }
      })
      couches = couches.concat(miennes)
      scene.addEventListener('pointermove', function (ev) {
        if (ev.pointerType !== 'mouse') return
        var r = scene.getBoundingClientRect(), dx = (ev.clientX - r.left) / r.width - 0.5, dy = (ev.clientY - r.top) / r.height - 0.5
        miennes.forEach(function (c) { c.vx = -dx * c.d; c.vy = -dy * c.d * 0.7 })
        demarrer()
      })
      scene.addEventListener('pointerleave', function () { miennes.forEach(function (c) { c.vx = 0; c.vy = 0 }); demarrer() })
    })
  }
  var defilants = Array.prototype.slice.call(document.querySelectorAll('[data-defile]'))
  var enCours = false
  function demarrer() { if (!enCours) { enCours = true; requestAnimationFrame(image) } }
  function image() {
    var bouge = false
    couches.forEach(function (c) {
      c.x += (c.vx - c.x) * 0.08; c.y += (c.vy - c.y) * 0.08
      if (Math.abs(c.vx - c.x) > 0.05 || Math.abs(c.vy - c.y) > 0.05) bouge = true
      c.e.style.transform = 'translate3d(' + c.x.toFixed(2) + 'px,' + c.y.toFixed(2) + 'px,0)'
    })
    defilants.forEach(function (e) {
      var r = e.parentNode.getBoundingClientRect()
      if (r.bottom < -200 || r.top > innerHeight + 200) return
      e.style.transform = 'translate3d(0,' + (-r.top * Number(e.dataset.defile || 0)).toFixed(1) + 'px,0) scale(1.15)'
    })
    if (bouge) requestAnimationFrame(image)
    else enCours = false
  }
  window.addEventListener('scroll', demarrer, { passive: true })
  demarrer()
})()
