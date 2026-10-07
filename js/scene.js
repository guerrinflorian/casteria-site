// Casteria, le site : LA SCÈNE EN COUCHES de l'accueil (INTERFACES, 07/10 ; le style demandé par le propriétaire). Rien
// n'est indispensable : sans ce fichier la page se lit entière (ses éléments sont visibles par défaut).
//   [data-scene] .pointeur[data-profondeur]  la souris déplace chaque couche selon sa profondeur (en pixels), adoucie
//   body.scene-prete                        les choses du haut de page arrivent (css/scene.css : .entree)
//   .monte                                  monte quand on y arrive (.vu)
//   [data-defile]                           glisse moins vite que la page (un facteur : 0,18 = 18 % du défilement)
//   .poussieres                             des poussières lumineuses qui montent
//   .carte-tresor b[data-n]                 les chiffres comptent jusqu'à leur valeur
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
