// Casteria, le site : ce qui bouge. Rien n'est indispensable : sans ce fichier la page se lit entière.
(function () {
  'use strict'
  var calme = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // index.html?photo : la page entière d'un coup, pour une capture (outils/capturer.sh)
  if (/[?&]photo\b/.test(location.search)) { document.documentElement.classList.add('photo'); calme = true }

  // (23/10/2026 ; le propriétaire : « oui bientôt ») LE SERVEUR N'EST PAS ENCORE OUVERT : un bandeau en bas de l'écran, sur
  // chaque page, le même message que le Discord. LE JOUR DE L'OUVERTURE : OUVERT = true (cette ligne seule), le bandeau
  // disparaît. Les mots qui disent la fermeture ne vivent QUE dans bandeauOuverture : partout ailleurs, ils restent
  // interdits (outils/verifier.js, MOTS_INTERDITS). Écrit en texte (textContent), jamais comme du code de page.
  var OUVERT = false
  function bandeauOuverture() {
    var b = document.createElement('div'), t = document.createElement('p'), a = document.createElement('a')
    b.className = 'ouverture'
    b.setAttribute('role', 'note')
    t.appendChild(document.createTextNode('Casteria ouvre bientôt : le serveur n\'est pas encore ouvert à tous. Installe déjà le launcher ; l\'ouverture sera annoncée sur notre '))
    a.href = '/discord'
    a.textContent = 'Discord'
    t.appendChild(a)
    t.appendChild(document.createTextNode('.'))
    b.appendChild(t)
    document.body.appendChild(b)
    document.documentElement.classList.add('avec-ouverture')
    // (27/10/2026 ; le propriétaire : « c'est encore écrit sur le site serveur en ligne… ça devrait mettre ouverture bientôt
    // partout ») LE BADGE DU HAUT (data-en-ligne) dit l'ouverture tant que le serveur est fermé, jamais « en ligne » ni un
    // nombre de joueurs (les comptes de test) ; son carré passe à l'or (css/style.css, .en-ligne.ferme). Le jour de
    // l'ouverture (OUVERT = true), il redevient le nombre de joueurs du réseau.
    Array.prototype.forEach.call(document.querySelectorAll('[data-en-ligne]'), function (e) {
      e.textContent = 'Ouverture bientôt'
      e.classList.add('ferme')
      e.hidden = false
    })
  }
  if (!OUVERT) bandeauOuverture()

  // (23/10/2026 ; le propriétaire : « faudra aussi mettre le nombre de joueurs sur le serveur sur le site ») LES JOUEURS EN
  // LIGNE, sur tout le réseau : le jeu les écrit dans le fichier qu'il publie déjà toutes les 5 minutes (le gist du
  // classement : leaderboard.js, Site.publier), au premier niveau : « en_ligne » (un entier), son heure « en_ligne_lu » ou,
  // sans elle, « lu ». Seuls ces champs sont lus ici (le classement, lui, reste caché tant que GIST_ID de classement.js est
  // vide). Seulement sur une page qui a sa place (data-en-ligne).
  // (25/10/2026 ; le propriétaire : « y a pas le nombre de joueurs du serveur sur le site sur la hero section ») LE BADGE DU
  // HAUT : « 3 joueurs en ligne », « 1 joueur en ligne » ; à 0 joueur, « Serveur en ligne » (jamais un « 0 » : le jeu qui
  // publie, c'est le serveur allumé) ; rien si le champ manque, n'est pas un entier positif ou nul, ou date de plus de 15
  // minutes (le serveur ne publie plus). Relu toutes les 5 minutes tant que la page est ouverte et visible.
  var enLigne = document.querySelectorAll('[data-en-ligne]')
  // (b5, la bascule du 29/10 ; la tete) plus le gist : l'API du site, la meme origine (API.md 2.1 : { en_ligne, lu, lieux } ; la
  // cle du maitre de plus de 3 minutes : en_ligne null, le badge se tait)
  var SOURCE_EN_LIGNE = '/api/en-ligne'
  var EN_LIGNE_VIEUX_MS = 15 * 60000, EN_LIGNE_RELIRE_MS = 5 * 60000
  function montrerEnLigne(d) {
    var n = d ? d.en_ligne : null, lu = d ? Date.parse(String(d.en_ligne_lu || d.lu || '')) : NaN
    var bon = typeof n === 'number' && n === Math.floor(n) && n >= 0 && !isNaN(lu) && Date.now() - lu <= EN_LIGNE_VIEUX_MS
    Array.prototype.forEach.call(enLigne, function (e) {
      if (!bon) { e.hidden = true; return }
      e.textContent = ''
      if (n === 0) e.appendChild(document.createTextNode('Serveur en ligne'))
      else {
        var b = document.createElement('b')
        b.className = 'nombre'
        // « 1 200 » : l'espace fine du français (U+202F) manque à la police du site, l'espace insécable (U+00A0) la remplace
        b.textContent = n.toLocaleString('fr-FR').split('\u202f').join('\u00a0')
        e.appendChild(b)
        e.appendChild(document.createTextNode(n === 1 ? ' joueur en ligne' : ' joueurs en ligne'))
      }
      e.hidden = false
    })
  }
  var enLigneDernier = null
  function lireEnLigne() {
    if (document.hidden) return
    fetch(SOURCE_EN_LIGNE, { credentials: 'omit', cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null })
      .then(function (d) { enLigneDernier = d; montrerEnLigne(d) })
      // le réseau coupé : la dernière lecture, jugée à l'heure qu'il est (elle s'efface après ses 15 minutes)
      .catch(function () { montrerEnLigne(enLigneDernier) })
  }
  // fermé : le badge garde l'ouverture que le bandeau y a écrite (aucune lecture du nombre de joueurs)
  if (OUVERT && enLigne.length && SOURCE_EN_LIGNE && window.fetch) {
    lireEnLigne()
    setInterval(lireEnLigne, EN_LIGNE_RELIRE_MS)
    document.addEventListener('visibilitychange', lireEnLigne)
  }

  // la barre du haut : elle se pose quand on descend ; la ligne de progression ; le menu des petits écrans
  var barre = document.querySelector('.barre'), progres = document.querySelector('.progres')
  var menu = document.querySelector('.menu'), liens = document.querySelector('.barre nav')
  if (menu && liens) {
    menu.addEventListener('click', function () { var o = liens.classList.toggle('ouvert'); menu.setAttribute('aria-expanded', o ? 'true' : 'false') })
    liens.addEventListener('click', function (e) { if (e.target.tagName === 'A') liens.classList.remove('ouvert') })
  }

  // (29/10/2026 ; le propriétaire : « sur mobile faire un petit menu déroulant plutôt que les icônes vu que y'a quelques petits
  // trucs en plus ») LE MENU DÉROULANT DU TÉLÉPHONE ET DE LA TABLETTE (960 px et moins ; css/style.css, .menu-bouton) : un
  // bouton « Menu » dans la barre, qui déroule les pages du menu EN MOTS (les liens de <nav aria-label="Le menu"> de la page,
  // sauf « Jouer », qui reste dans la barre), puis « Connexion », ou « Mon compte » quand on est connecté ; il se ferme au clic
  // dehors, à la touche Échap (le bouton reprend la main), après un choix, et quand l'écran s'élargit. Une page neuve du menu
  // (la carte, les exploits) y entre seule : il suffit qu'elle soit dans le <nav> des pages.
  function connecte() {
    // l'indice posé par l'API à la connexion (un cookie lisible, sans rien de secret : API.md 1.3), ou la session d'essai
    if (/(?:^|;\s*)casteria_connecte=1(?:;|$)/.test(document.cookie || '')) return true
    try { return !!sessionStorage.getItem('casteria_essai_session') } catch (e) { return false }
  }
  function menuTelephone() {
    var barre = document.querySelector('.barre'), nav = barre ? barre.querySelector('nav') : null
    if (!barre || !nav || barre.querySelector('.menu-bouton')) return
    var bouton = document.createElement('button'), tiroir = document.createElement('div'), liste = document.createElement('ul'), barres = document.createElement('span'), compte = null
    bouton.type = 'button'; bouton.className = 'menu-bouton'
    bouton.setAttribute('aria-expanded', 'false'); bouton.setAttribute('aria-controls', 'menu-tiroir')
    barres.className = 'menu-barres'; barres.setAttribute('aria-hidden', 'true')
    bouton.appendChild(barres); bouton.appendChild(document.createTextNode('Menu'))
    tiroir.className = 'menu-tiroir'; tiroir.id = 'menu-tiroir'; tiroir.hidden = true
    liste.setAttribute('aria-label', 'Les pages de Casteria')
    function ligne(href, mot, ici) {
      var li = document.createElement('li'), a = document.createElement('a')
      a.href = href; a.textContent = mot
      if (ici) a.setAttribute('aria-current', 'page')
      li.appendChild(a); liste.appendChild(li)
      return a
    }
    Array.prototype.forEach.call(nav.querySelectorAll('a'), function (a) {
      if (a.classList.contains('bouton')) return
      var l = ligne(a.getAttribute('href'), (a.getAttribute('aria-label') || a.textContent).trim(), !!a.getAttribute('aria-current'))
      if (a.classList.contains('compte')) compte = l
    })
    // « Connexion » ou « Mon compte » (le dernier mot de la liste)
    if (!compte) compte = ligne('compte.html', 'Mon compte', /compte\.html$/.test(location.pathname))
    if (!connecte()) { compte.href = 'connexion.html'; compte.textContent = 'Connexion'; if (/connexion\.html$/.test(location.pathname)) compte.setAttribute('aria-current', 'page') }
    tiroir.appendChild(liste)
    barre.insertBefore(bouton, nav)
    barre.insertBefore(tiroir, nav)
    function ouvrir(oui) {
      tiroir.hidden = !oui
      bouton.setAttribute('aria-expanded', oui ? 'true' : 'false')
      barre.classList.toggle('menu-ouvert', oui)
    }
    bouton.addEventListener('click', function () { ouvrir(tiroir.hidden) })
    tiroir.addEventListener('click', function (e) { if (e.target.tagName === 'A') ouvrir(false) })
    document.addEventListener('click', function (e) { if (!tiroir.hidden && !tiroir.contains(e.target) && !bouton.contains(e.target)) ouvrir(false) })
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !tiroir.hidden) { ouvrir(false); bouton.focus() } })
    window.addEventListener('resize', function () { if (!tiroir.hidden && window.innerWidth > 960) ouvrir(false) })
  }
  menuTelephone()

  // le héros : les trois téléphones et le logo glissent à des vitesses différentes, le fond s'éloigne (la bannière du
  // classement, elle, reste en place : elle porte son texte)
  var eventail = document.querySelector('.eventail'), fond = document.querySelector('.heros:not(.banniere) .fond'), logo = document.querySelector('.heros .logo')
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
