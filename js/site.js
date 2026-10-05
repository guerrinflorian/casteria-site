// Casteria, le site : ce qui bouge. Rien n'est indispensable : sans ce fichier la page se lit entière.
(function () {
  'use strict'
  var calme = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // index.html?photo : la page entière d'un coup, pour une capture (outils/capturer.sh)
  if (/[?&]photo/.test(location.search)) { document.documentElement.classList.add('photo'); calme = true }

  // la barre du haut : elle se pose quand on descend ; la ligne de progression ; le menu des petits écrans
  var barre = document.querySelector('.barre'), progres = document.querySelector('.progres')
  var menu = document.querySelector('.menu'), liens = document.querySelector('.barre nav')
  if (menu && liens) {
    menu.addEventListener('click', function () { var o = liens.classList.toggle('ouvert'); menu.setAttribute('aria-expanded', o ? 'true' : 'false') })
    liens.addEventListener('click', function (e) { if (e.target.tagName === 'A') liens.classList.remove('ouvert') })
  }

  // le héros : les trois téléphones et le logo glissent à des vitesses différentes, le fond s'éloigne
  var eventail = document.querySelector('.eventail'), fond = document.querySelector('.heros .fond'), logo = document.querySelector('.heros .logo')
  var poses = [
    { e: document.querySelector('.eventail .t1'), base: 'translate(-118%, -50%) rotate(-9deg) scale(.86)', v: -0.10, r: -6 },
    { e: document.querySelector('.eventail .t2'), base: 'translate(-50%, -52%)', v: -0.22, r: 0 },
    { e: document.querySelector('.eventail .t3'), base: 'translate(18%, -50%) rotate(9deg) scale(.86)', v: -0.14, r: 6 }
  ]
  var vols = document.querySelectorAll('.scene .vol'), scene = document.querySelector('.scene')
  var attente = false
  function defile() {
    attente = false
    var y = window.scrollY || 0, h = document.documentElement.scrollHeight - window.innerHeight
    if (barre) barre.classList.toggle('posee', y > 30)
    // jamais deux logos à la fois : le petit de la barre attend que le grand soit passé sous elle
    if (barre && logo) barre.classList.toggle('avec-logo', logo.getBoundingClientRect().bottom < 56)
    if (progres) progres.style.width = (h > 0 ? Math.min(100, y / h * 100) : 0) + '%'
    if (calme || y > window.innerHeight * 1.2) return
    var p = y / window.innerHeight
    if (fond) fond.style.transform = 'translateY(' + (y * 0.25) + 'px) scale(' + (1 + p * 0.12) + ')'
    if (logo) logo.style.marginTop = (-y * 0.08) + 'px'
    if (eventail) poses.forEach(function (t) { if (t.e) t.e.style.transform = t.base + ' translateY(' + (y * t.v) + 'px) rotate(' + (p * t.r) + 'deg)' })
    // la scène en volume : chaque chose glisse à sa vitesse (data-v), les plus proches plus vite
    Array.prototype.forEach.call(vols, function (e) { e.style.setProperty('--vy', (y * Number(e.dataset.v || 0)) + 'px'); e.style.transform = 'translate(var(--sx, 0px), calc(var(--vy, 0px) + var(--sy, 0px)))' })
  }
  window.addEventListener('scroll', function () { if (!attente) { attente = true; requestAnimationFrame(defile) } }, { passive: true })
  window.addEventListener('load', defile)
  window.addEventListener('hashchange', defile)
  defile()

  // les téléphones du héros suivent un peu la souris
  if (eventail && !calme && window.matchMedia('(hover: hover)').matches) {
    eventail.addEventListener('mousemove', function (e) {
      var r = eventail.getBoundingClientRect(), dx = (e.clientX - r.left) / r.width - 0.5, dy = (e.clientY - r.top) / r.height - 0.5
      eventail.style.transform = 'rotateY(' + (dx * 8) + 'deg) rotateX(' + (-dy * 6) + 'deg)'
    })
    eventail.addEventListener('mouseleave', function () { eventail.style.transform = '' })
    eventail.style.transition = 'transform .3s ease-out'
  }

  // la scène en volume suit un peu la souris (les choses proches bougent plus)
  if (scene && vols.length && !calme && window.matchMedia('(hover: hover)').matches) {
    var tete = scene.closest('section') || scene
    tete.addEventListener('mousemove', function (e) {
      var r = tete.getBoundingClientRect(), dx = (e.clientX - r.left) / r.width - 0.5, dy = (e.clientY - r.top) / r.height - 0.5
      Array.prototype.forEach.call(vols, function (v) { var k = Math.abs(Number(v.dataset.v || 0)) * 220; v.style.setProperty('--sx', (-dx * k) + 'px'); v.style.setProperty('--sy', (-dy * k) + 'px'); v.style.transform = 'translate(var(--sx, 0px), calc(var(--vy, 0px) + var(--sy, 0px)))' })
    })
  }

  // les braises du héros
  var braises = document.querySelector('.braises')
  if (braises && !calme) {
    for (var i = 0; i < 26; i++) {
      var b = document.createElement('i'), t = 3 + Math.random() * 5
      b.style.left = (Math.random() * 100) + '%'; b.style.width = b.style.height = t + 'px'
      b.style.animationDuration = (7 + Math.random() * 9) + 's'; b.style.animationDelay = (-Math.random() * 14) + 's'
      braises.appendChild(b)
    }
  }

  // ce qui apparaît quand on y arrive
  var vus = document.querySelectorAll('.apparait')
  if (!('IntersectionObserver' in window)) {
    vus.forEach(function (e) { e.classList.add('vu') })
  } else {
    var oeil = new IntersectionObserver(function (es) {
      es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('vu'); oeil.unobserve(x.target) } })
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' })
    vus.forEach(function (e) { oeil.observe(e) })
    // un filet : ce qui est déjà à l'écran deux secondes après l'arrivée se montre, quoi qu'il arrive
    setTimeout(function () { vus.forEach(function (e) { var r = e.getBoundingClientRect(); if (r.top < window.innerHeight && r.bottom > 0) e.classList.add('vu') }) }, 2000)
  }

  // les vidéos : chargées seulement quand elles approchent, jouées seulement quand on les voit
  function charger(v) { if (!v.src && v.dataset.src) { v.src = v.dataset.src; v.load() } }
  var auto = document.querySelectorAll('video[data-auto]')
  if ('IntersectionObserver' in window) {
    var cinema = new IntersectionObserver(function (es) {
      es.forEach(function (x) {
        var v = x.target
        if (x.isIntersecting) { charger(v); if (!calme) { var p = v.play(); if (p && p.catch) p.catch(function () {}) } } else if (v.src) v.pause()
      })
    }, { threshold: 0.25, rootMargin: '200px 0px' })
    auto.forEach(function (v) { cinema.observe(v) })
  } else auto.forEach(charger)

  // le carrousel de vidéos (css/carrousel.css) : un clic, ou Entrée, lance celle-là et arrête les autres
  var clics = document.querySelectorAll('video[data-clic]')
  Array.prototype.forEach.call(clics, function (v) {
    function basculer() {
      charger(v)
      if (v.paused) {
        Array.prototype.forEach.call(clics, function (w) { if (w !== v && w.src) { w.pause(); w.parentNode.classList.remove('joue') } })
        var p = v.play(); if (p && p.catch) p.catch(function () {}); v.parentNode.classList.add('joue')
      } else { v.pause(); v.parentNode.classList.remove('joue') }
    }
    v.addEventListener('click', basculer)
    v.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); basculer() } })
  })

  // les chiffres comptent jusqu'à leur valeur
  var chiffres = document.querySelectorAll('.chiffres b[data-n]')
  if (chiffres.length && 'IntersectionObserver' in window && !calme) {
    var compteur = new IntersectionObserver(function (es) {
      es.forEach(function (x) {
        if (!x.isIntersecting) return
        compteur.unobserve(x.target)
        var but = +x.target.dataset.n, debut = performance.now()
        ;(function pas(m) { var k = Math.min(1, (m - debut) / 1100); x.target.textContent = Math.round(but * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(pas) })(debut)
      })
    }, { threshold: 0.6 })
    chiffres.forEach(function (c) { compteur.observe(c) })
  }
})()
