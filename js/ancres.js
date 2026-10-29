// LES ANCRES DU SITE (af, 29/10/2026 23:5x ; le propriétaire : « que les ancres du site et redirections emmènent bien au bon
// endroit au bon scroll sur mobile et PC, fais un truc parfait »). Chargé par TOUTES les pages, après les autres scripts.
// UNE ANCRE ARRIVE SUR SON TITRE : la cible (l'élément de cet id), ou, pour une ancre qu'un script lit (carte.html#ile=1,0,
// classement.html#iles/...), l'élément marqué data-ancre-defaut de la page. Son TITRE : un élément marqué data-ancre-titre, sinon
// son premier h1, h2 ou h3 visible (jamais dans un <aside> ni une fenêtre), sinon elle-même. Il se pose 16 px sous la barre
// flottante (sa VRAIE hauteur, mesurée : 76 px sur ordinateur, 68 au téléphone), jamais dessous, jamais au milieu de l'écran.
//  - à l'arrivée sur une page avec une ancre : posé dès que la page est là, puis REPOSÉ tant que ce qui se charge au-dessus
//    (les données, les images) déplace le titre, 6 s au plus, jusqu'au premier geste de la personne (molette, doigt, touche) ;
//    une cible encore cachée (un bloc qui attend ses données) : attendue, 6 s au plus ;
//  - un clic sur une ancre de la même page : un défilement doux (immédiat pour qui demande moins de mouvement), l'adresse
//    mise à jour, le focus sur le titre (le clavier et les lecteurs d'écran suivent), une correction à la fin s'il a bougé.
// Sans ce script : css/kit.css garde [id] { scroll-margin-top } (l'arrivée du navigateur sous la barre).
;(function () {
  'use strict'
  var ECART = 16, DUREE = 6000
  var calme = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  function basBarre() {
    var b = document.querySelector('.barre')
    if (!b) return 0
    var p = getComputedStyle(b).position
    return p === 'fixed' || p === 'sticky' ? Math.max(0, b.getBoundingClientRect().bottom) : 0
  }
  function visible(e) { var r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' }
  function cible(hash) {
    var h = ''
    try { h = decodeURIComponent(String(hash || '').replace(/^#/, '')) } catch (e) { return null }
    if (!h) return null
    var t = document.getElementById(h)
    // un id de sprite d'icônes (#i-...) ou un élément d'un <svg> : jamais une cible
    if (t && t.closest && t.closest('svg')) t = null
    return t || document.querySelector('[data-ancre-defaut]')
  }
  function titre(t) {
    if (/^H[1-3]$/.test(t.tagName)) return t
    var m = t.querySelector('[data-ancre-titre]')
    if (m && visible(m)) return m
    var l = t.querySelectorAll('h1, h2, h3')
    for (var k = 0; k < l.length; k++) if (!l[k].closest('aside, dialog, [role="dialog"], [hidden]') && visible(l[k])) return l[k]
    return t
  }
  // où mettre la page pour que le titre de t soit à ECART sous la barre
  function hauteurPour(t) {
    var h = titre(t), y = window.scrollY + h.getBoundingClientRect().top - basBarre() - ECART
    var maxi = document.documentElement.scrollHeight - window.innerHeight
    return Math.max(0, Math.min(maxi, Math.round(y)))
  }
  function aller(y, doux) {
    try { window.scrollTo({ top: y, behavior: doux && !calme ? 'smooth' : 'instant' }) } catch (e) { window.scrollTo(0, y) }
  }
  function focaliser(t) {
    var h = titre(t)
    if (!h.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(h.tagName)) h.setAttribute('tabindex', '-1')
    try { h.focus({ preventScroll: true }) } catch (e) {}
  }

  // ---------- l'arrivée : posé, puis reposé tant que la page bouge, jusqu'au premier geste ----------
  var geste = false
  function surGeste() { geste = true }
  ;['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (n) { window.addEventListener(n, surGeste, { passive: true, capture: true }) })
  function arriver() {
    if (!location.hash || location.hash.length < 2) return
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    var debut = Date.now(), dernier = -1, calmes = 0
    function tour() {
      if (geste || Date.now() - debut > DUREE) return
      var t = cible(location.hash)
      if (t && visible(t)) {
        var y = hauteurPour(t)
        if (Math.abs(y - window.scrollY) > 2) aller(y, false)
        calmes = y === dernier ? calmes + 1 : 0
        dernier = y
      }
      // posé et immobile une seconde (après le chargement) : fini
      if (calmes > 60 && document.readyState === 'complete') return
      requestAnimationFrame(tour)
    }
    tour()
  }
  // la page n'est pas encore descendue par le navigateur : on prend la main dès le DOM prêt, puis au chargement
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arriver); else arriver()

  // ---------- le clic sur une ancre de la même page ----------
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    var a = e.target.closest && e.target.closest('a[href*="#"]')
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return
    var u
    try { u = new URL(a.href, location.href) } catch (er) { return }
    if (u.origin !== location.origin || u.pathname.replace(/\/index\.html$/, '/') !== location.pathname.replace(/\/index\.html$/, '/') || u.search !== location.search) return
    // une ancre qu'un script de la page lit (la carte, le classement) : on le laisse faire, puis on pose la page
    var id = ''
    try { id = decodeURIComponent(u.hash.slice(1)) } catch (er) { return }
    var t = cible(u.hash)
    if (!t) return
    if (!document.getElementById(id)) { setTimeout(function () { var t2 = cible(u.hash); if (t2) aller(hauteurPour(t2), true) }, 60); return }
    e.preventDefault()
    if (location.hash !== u.hash) history.pushState(null, '', u.hash)
    geste = true
    aller(hauteurPour(t), true)
    focaliser(t)
    // la correction de la fin (une image qui s'est chargée en chemin) : quand le défilement s'arrête
    var fin = function () { var y = hauteurPour(t); if (Math.abs(y - window.scrollY) > 3) aller(y, false) }
    if ('onscrollend' in window) window.addEventListener('scrollend', fin, { once: true }); else setTimeout(fin, 900)
  })
  // le retour en arrière entre deux ancres de la même page
  window.addEventListener('popstate', function () { var t = cible(location.hash); if (t) aller(hauteurPour(t), false) })
  window.CasteriaAncres = { poser: function () { var t = cible(location.hash); if (t) aller(hauteurPour(t), false) } }
})()
