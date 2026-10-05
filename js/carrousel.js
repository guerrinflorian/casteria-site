// Casteria, le site : les carrousels (css/carrousel.css les habille). Rien n'est indispensable : sans ce fichier chaque
// carrousel reste une rangée qu'on fait défiler au doigt, à la molette ou au clavier.
// LE CONTRAT : <div data-carrousel="defile | glisse | pile"> et, en enfants directs, des <figure class="vue">.
//   defile : la frise défile seule, en boucle ; elle s'arrête au survol, au focus, au doigt, hors de l'écran
//   glisse : la rangée s'aimante sur chaque vue ; deux flèches, des points, les flèches du clavier
//   pile   : la carte du dessus part sur le côté au clic, au glissé, aux flèches ; la suivante monte
// Sous « réduire les animations » (et dans une capture, index.html?photo) : la frise ne bouge pas, la pile devient une
// rangée à flèches. Le HTML de la page n'est pas changé : le script ajoute seulement, après la rangée, ses flèches et ses
// points (leur place est réservée par la feuille de style : aucun saut), et dans la frise les copies qui ferment la boucle.
(function () {
  'use strict'
  var calme = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || /[?&]photo/.test(location.search)
  var NS = 'http://www.w3.org/2000/svg'

  function vuesDe(c) {
    var out = [], k
    for (k = 0; k < c.children.length; k++) if (c.children[k].classList.contains('vue') && !c.children[k].classList.contains('copie')) out.push(c.children[k])
    return out
  }
  function chevron(sens) {
    var s = document.createElementNS(NS, 'svg'), p = document.createElementNS(NS, 'path')
    s.setAttribute('viewBox', '0 0 18 18'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false')
    p.setAttribute('d', sens < 0 ? 'M11.5 3 5.5 9l6 6' : 'M6.5 3l6 6-6 6')
    p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor'); p.setAttribute('stroke-width', '3')
    p.setAttribute('stroke-linecap', 'square'); p.setAttribute('stroke-linejoin', 'miter')
    s.appendChild(p)
    return s
  }
  // Les flèches et les points, posés APRÈS la rangée. aller(i) : montrer la vue i ; pas(sens) : la suivante ou la précédente.
  function commandes(c, n, aller, pas) {
    var boite = document.createElement('div'), avant = document.createElement('button'), apres = document.createElement('button')
    var points = document.createElement('div'), lu = document.createElement('span'), liste = [], k
    boite.className = 'carrousel-commandes'
    avant.type = apres.type = 'button'
    avant.className = apres.className = 'fleche'
    avant.setAttribute('aria-label', 'Vue précédente'); apres.setAttribute('aria-label', 'Vue suivante')
    avant.appendChild(chevron(-1)); apres.appendChild(chevron(1))
    avant.addEventListener('click', function () { pas(-1) })
    apres.addEventListener('click', function () { pas(1) })
    points.className = 'carrousel-points'
    function point(i) {
      var b = document.createElement('button')
      b.type = 'button'; b.setAttribute('aria-label', 'Vue ' + (i + 1) + ' sur ' + n)
      b.addEventListener('click', function () { aller(i) })
      points.appendChild(b); liste.push(b)
    }
    for (k = 0; k < n; k++) point(k)
    lu.className = 'carrousel-lu'; lu.setAttribute('aria-live', 'polite')
    boite.appendChild(avant); boite.appendChild(points); boite.appendChild(apres); boite.appendChild(lu)
    c.parentNode.insertBefore(boite, c.nextSibling)
    var dernier = -1
    return {
      // i : la vue montrée ; auDebut, aLaFin : la rangée est à un bout (sa flèche se grise) ; une pile n'a pas de bout
      montrer: function (i, auDebut, aLaFin) {
        avant.disabled = !!auDebut
        apres.disabled = !!aLaFin
        if (i === dernier) return
        dernier = i
        for (var j = 0; j < liste.length; j++) { if (j === i) liste[j].setAttribute('aria-current', 'true'); else liste[j].removeAttribute('aria-current') }
        lu.textContent = 'Vue ' + (i + 1) + ' sur ' + n
      }
    }
  }
  function region(c, nomDefaut) {
    if (!c.hasAttribute('tabindex')) c.setAttribute('tabindex', '0')
    c.setAttribute('role', 'group')
    c.setAttribute('aria-roledescription', 'carrousel')
    if (!c.hasAttribute('aria-label') && !c.hasAttribute('aria-labelledby')) c.setAttribute('aria-label', c.getAttribute('data-nom') || nomDefaut)
  }
  function fige(c) { var im = c.querySelectorAll('img'), k; for (k = 0; k < im.length; k++) im[k].setAttribute('draggable', 'false') }

  // ---------- GLISSE : la rangée aimantée, ses flèches, ses points ----------
  function glisse(c) {
    var vues = vuesDe(c)
    if (vues.length < 2) return
    region(c, 'Galerie : ' + vues.length + ' vues, flèches gauche et droite')
    // Sur un grand écran plusieurs vues tiennent ensemble et la rangée ne peut pas centrer la première ni la dernière :
    // la place d'une vue est le défilement qui la centre, BORNÉ au début et à la fin de la rangée. Plusieurs vues peuvent
    // donc partager la même place : au début c'est la première qui est « montrée », à la fin la dernière.
    function fin() { return Math.max(0, c.scrollWidth - c.clientWidth) }
    function place(i) { return Math.max(0, Math.min(fin(), vues[i].offsetLeft + vues[i].offsetWidth / 2 - c.clientWidth / 2)) }
    function courante() {
      var s = c.scrollLeft, m = fin(), i = 0, d = Infinity, k, e
      if (s <= 1) return 0
      if (s >= m - 1) return vues.length - 1
      for (k = 0; k < vues.length; k++) { e = Math.abs(place(k) - s); if (e < d - 0.5) { d = e; i = k } }
      return i
    }
    function aller(i) {
      i = Math.max(0, Math.min(vues.length - 1, i))
      var x = i === 0 ? 0 : (i === vues.length - 1 ? fin() : place(i))
      if (c.scrollTo) c.scrollTo({ left: x, behavior: calme ? 'auto' : 'smooth' }); else c.scrollLeft = x
    }
    // la flèche : la première vue, dans ce sens, dont la place fait vraiment bouger la rangée
    function pas(sens) {
      var s = c.scrollLeft, k
      if (sens > 0) { for (k = 0; k < vues.length; k++) if (place(k) > s + 2) { aller(k); return } aller(vues.length - 1) }
      else { for (k = vues.length - 1; k >= 0; k--) if (place(k) < s - 2) { aller(k); return } aller(0) }
    }
    var cmd = commandes(c, vues.length, aller, pas)
    var attente = false
    function suivre() { attente = false; cmd.montrer(courante(), c.scrollLeft <= 1, c.scrollLeft >= fin() - 1) }
    c.addEventListener('scroll', function () { if (!attente) { attente = true; requestAnimationFrame(suivre) } }, { passive: true })
    c.addEventListener('keydown', function (e) {
      if (e.target !== c) return
      if (e.key === 'ArrowRight') { e.preventDefault(); pas(1) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); pas(-1) }
      else if (e.key === 'Home') { e.preventDefault(); aller(0) }
      else if (e.key === 'End') { e.preventDefault(); aller(vues.length - 1) }
    })
    window.addEventListener('resize', function () { if (!attente) { attente = true; requestAnimationFrame(suivre) } })
    suivre()
  }

  // ---------- DEFILE : la frise en boucle ----------
  function defile(c) {
    var vues = vuesDe(c)
    if (!vues.length || calme) return   // sans animation : une rangée qu'on fait défiler
    region(c, 'Frise : ' + vues.length + ' vues qui défilent ; elle s\'arrête au survol et au focus')
    fige(c)
    c.classList.add('est-frise')
    // les copies qui ferment la boucle : muettes pour un lecteur d'écran, hors du clavier, une vidéo réduite à son affiche
    function copies() {
      var k, cl, vids, v, im, liens, j
      for (k = 0; k < vues.length; k++) {
        cl = vues[k].cloneNode(true)
        cl.classList.add('copie'); cl.setAttribute('aria-hidden', 'true'); cl.setAttribute('inert', '')
        cl.removeAttribute('id')
        vids = cl.querySelectorAll('video')
        for (j = 0; j < vids.length; j++) {
          v = vids[j]; im = document.createElement('img')
          im.src = v.getAttribute('poster') || ''; im.alt = ''; im.setAttribute('draggable', 'false'); im.loading = 'lazy'
          if (v.getAttribute('width')) im.setAttribute('width', v.getAttribute('width'))
          if (v.getAttribute('height')) im.setAttribute('height', v.getAttribute('height'))
          v.parentNode.replaceChild(im, v)
        }
        liens = cl.querySelectorAll('a, button, [tabindex]')
        for (j = 0; j < liens.length; j++) liens[j].setAttribute('tabindex', '-1')
        liens = cl.querySelectorAll('[id]')
        for (j = 0; j < liens.length; j++) liens[j].removeAttribute('id')
        c.appendChild(cl)
      }
    }
    var tours = 0
    do { copies(); tours++ } while (tours < 6 && c.scrollWidth < c.clientWidth * 2 + 40)
    var vitesse = Math.max(8, Math.min(160, Number(c.getAttribute('data-vitesse')) || 36))
    var boucle = 0, pos = 0, avant = 0, arrets = {}, vu = true, image = 0
    function mesurer() { var premiere = c.querySelector('.vue.copie'); boucle = premiere ? premiere.offsetLeft - vues[0].offsetLeft : 0 }
    function arrete() { for (var k in arrets) if (arrets[k]) return true; return !vu || document.hidden }
    function pas(t) {
      image = 0
      if (arrete() || boucle <= 0) { avant = 0; return }
      if (!avant) { avant = t; pos = c.scrollLeft }
      pos += Math.min(64, t - avant) / 1000 * vitesse
      avant = t
      if (pos >= boucle) pos -= boucle
      c.scrollLeft = pos
      image = requestAnimationFrame(pas)
    }
    function relancer() { if (!image && !arrete()) { avant = 0; image = requestAnimationFrame(pas) } }
    function arret(nom, oui) { arrets[nom] = oui; if (!oui) relancer() }
    // la main reprise par le visiteur (le doigt, la molette) : la boucle se referme aussi dans ce cas
    c.addEventListener('scroll', function () {
      if (!arrete() || boucle <= 0) return
      if (c.scrollLeft >= boucle) c.scrollLeft -= boucle
    }, { passive: true })
    c.addEventListener('mouseenter', function () { arret('survol', true) })
    c.addEventListener('mouseleave', function () { arret('survol', false) })
    c.addEventListener('focusin', function () { arret('focus', true) })
    c.addEventListener('focusout', function () { arret('focus', false) })
    var doigt = 0
    c.addEventListener('touchstart', function () { clearTimeout(doigt); arret('doigt', true) }, { passive: true })
    c.addEventListener('touchend', function () { clearTimeout(doigt); doigt = setTimeout(function () { arret('doigt', false) }, 2500) }, { passive: true })
    c.addEventListener('keydown', function (e) {
      if (e.target !== c) return
      if (e.key === 'ArrowRight') { e.preventDefault(); c.scrollLeft += 160 }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); c.scrollLeft = c.scrollLeft < 160 && boucle > 0 ? c.scrollLeft + boucle - 160 : c.scrollLeft - 160 }
    })
    document.addEventListener('visibilitychange', relancer)
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { vu = es[es.length - 1].isIntersecting; relancer() }, { rootMargin: '80px' }).observe(c)
    if ('ResizeObserver' in window) new ResizeObserver(mesurer).observe(c); else window.addEventListener('resize', mesurer)
    window.addEventListener('load', mesurer)
    mesurer()
    relancer()
  }

  // ---------- PILE : la carte du dessus part sur le côté ----------
  function pile(c) {
    var vues = vuesDe(c)
    if (vues.length < 2) return
    if (calme) { glisse(c); return }   // sans animation : une rangée à flèches
    region(c, 'Pile de ' + vues.length + ' cartes : clique la carte du dessus, ou flèches gauche et droite')
    fige(c)
    c.scrollLeft = 0
    c.classList.add('est-pile')
    var ordre = vues.slice(), occupe = false, DUREE = 420
    var cmd = commandes(c, vues.length, function (i) { allerA(i) }, function (s) { if (s > 0) suivante(1); else precedente() })
    function ranger(sauf) {
      for (var k = 0; k < ordre.length; k++) {
        var v = ordre[k]
        if (v === sauf) continue
        v.style.setProperty('--rang', String(Math.min(k, 3)))
        v.classList.toggle('dessous', k >= 3)
        if (k === 0) v.removeAttribute('aria-hidden'); else v.setAttribute('aria-hidden', 'true')
      }
      cmd.montrer(vues.indexOf(ordre[0]), false, false)
    }
    // la carte du dessus part du côté « sens » (1 : à droite, -1 : à gauche) et repasse sous la pile
    function suivante(sens, apres) {
      if (occupe) return
      occupe = true
      var v = ordre[0]
      ordre = ordre.slice(1).concat([v])
      v.style.setProperty('--sens', String(sens < 0 ? -1 : 1))
      v.classList.add('part')
      ranger(v)
      setTimeout(function () {
        v.classList.add('sans-elan'); v.classList.remove('part')
        ranger(null)
        void v.offsetWidth
        v.classList.remove('sans-elan')
        occupe = false
        if (apres) apres()
      }, DUREE)
    }
    // la carte du dessous de la pile revient par la gauche se poser dessus
    function precedente() {
      if (occupe) return
      occupe = true
      var v = ordre[ordre.length - 1]
      ordre = [v].concat(ordre.slice(0, -1))
      v.style.setProperty('--sens', '-1')
      v.classList.add('sans-elan'); v.classList.add('part'); v.classList.remove('dessous')
      void v.offsetWidth
      v.classList.remove('sans-elan'); v.classList.remove('part')
      ranger(null)
      setTimeout(function () { occupe = false }, DUREE)
    }
    function allerA(i) {
      var n = (ordre.indexOf(vues[i]) + ordre.length) % ordre.length
      if (n === 0 || occupe) return
      // au plus court : en avant (les cartes partent une à une) ou en arrière
      if (n <= ordre.length / 2) suivante(1, function () { allerA(i) })
      else { precedente(); setTimeout(function () { allerA(i) }, DUREE + 20) }
    }
    c.addEventListener('keydown', function (e) {
      if (e.target !== c) return
      if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); suivante(1) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); precedente() }
    })
    // le glissé : la carte du dessus suit le doigt ou la souris ; lâchée assez loin, elle part de ce côté
    var prise = null, glissee = false
    function interactif(t) { return !!(t && t.closest && t.closest('a, button, input, select, textarea, video[controls]')) }
    c.addEventListener('pointerdown', function (e) {
      if (occupe || (e.button !== undefined && e.button !== 0) || interactif(e.target) || !ordre[0].contains(e.target)) return
      prise = { v: ordre[0], x: e.clientX, y: e.clientY, id: e.pointerId, tire: false, dx: 0 }
    })
    c.addEventListener('pointermove', function (e) {
      if (!prise || e.pointerId !== prise.id) return
      var dx = e.clientX - prise.x, dy = e.clientY - prise.y
      if (!prise.tire) {
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return
        prise.tire = true
        prise.v.classList.add('tenue')
        if (c.setPointerCapture) { try { c.setPointerCapture(prise.id) } catch (err) { /* le pointeur est déjà parti */ } }
      }
      prise.dx = dx
      prise.v.style.transform = 'translateX(' + dx + 'px) rotate(' + (dx / 18) + 'deg)'
    })
    function lacher(e) {
      if (!prise || (e && e.pointerId !== prise.id)) return
      var p = prise
      prise = null
      if (!p.tire) return
      glissee = true
      setTimeout(function () { glissee = false }, 60)
      void p.v.offsetWidth
      p.v.classList.remove('tenue')
      p.v.style.transform = ''
      if (Math.abs(p.dx) > 70 && p.v === ordre[0]) suivante(p.dx < 0 ? -1 : 1)
    }
    c.addEventListener('pointerup', lacher)
    c.addEventListener('pointercancel', lacher)
    c.addEventListener('click', function (e) {
      if (glissee || interactif(e.target) || !ordre[0].contains(e.target)) return
      suivante(1)
    })
    ranger(null)
  }

  function lancer() {
    var tous = document.querySelectorAll('[data-carrousel]'), k, c, sorte
    for (k = 0; k < tous.length; k++) {
      c = tous[k]
      if (c.getAttribute('data-carrousel-pret')) continue
      c.setAttribute('data-carrousel-pret', '1')
      sorte = c.getAttribute('data-carrousel')
      try {
        if (sorte === 'defile') defile(c); else if (sorte === 'pile') pile(c); else glisse(c)
      } catch (err) { if (window.console) console.warn('carrousel : ' + err) }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', lancer); else lancer()
})()
