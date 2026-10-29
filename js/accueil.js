// L'ACCUEIL VIVANT (af, 29/10/2026 ; le propriétaire : « ça doit vraiment être interactif et donner envie aux joueurs de faire
// partie du serveur, d'avoir leur île et de monter dans le classement ») : la carte des îles (API.md 2.6), le podium du
// classement général (2.2), le fil des exploits (2.8), les joueurs sur leurs îles (2.1). Tout passe par CasteriaApi (api.js) ;
// ce qui revient s'écrit en TEXTE. Une source muette : son bloc reste caché ou dessiné sans un nom ni un chiffre (jamais une
// donnée inventée). La page se lit entière sans JavaScript.
(function () {
  'use strict'
  var A = window.CasteriaApi
  if (!A) return
  // (18:0x) au téléphone, 7 colonnes au lieu de 9 : des cases plus larges pour le doigt (44 px au moins à 360)
  var etroit = window.matchMedia && window.matchMedia('(max-width: 520px)').matches
  var tresEtroit = window.matchMedia && window.matchMedia('(max-width: 400px)').matches   // 6 colonnes : 44 px dès 360
  // (la tête, 22:06 ; le propriétaire : « pourquoi y'a pas l'île de m9_dopplerrr ? ») la fenêtre GRANDIT pour contenir toutes
  // les îles : au moins ces colonnes et 5 rangs, au plus le plafond (12 x 9 ; au téléphone, les colonnes restent celles du doigt
  // et seuls les rangs grandissent) ; au-delà (le jour J), la fenêtre qui en contient le plus
  // (af, 22:3x ; le propriétaire : « la carte de l'accueil est moche et bâclée ») la fenêtre SERRÉE autour des îles (une case de mer
  // autour), presque carrée sur un ordinateur (au moins autant de colonnes que de rangs moins un), jamais plus de colonnes que le
  // doigt n'en tient au téléphone : des îles plus grandes, plus de mer vide
  var COLS_MIN = 6, COLS_MAX = tresEtroit ? 6 : etroit ? 7 : 12, RANGS_MIN = 5, RANGS_MAX = 9
  var COLS = COLS_MIN, RANGS = RANGS_MIN
  var calme = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // la tête d'un joueur : la face (8 x 8) et le chapeau, découpés de sa peau, au pixel près (comme js/peau.js du compte)
  function tete(e, url, taille) {
    var u = A.peau(url), k = taille / 8
    e.style.width = e.style.height = taille + 'px'
    e.style.backgroundImage = 'url("' + u + '"), url("' + u + '")'
    e.style.backgroundSize = (64 * k) + 'px ' + (64 * k) + 'px'
    e.style.backgroundPosition = (-40 * k) + 'px ' + (-8 * k) + 'px, ' + (-8 * k) + 'px ' + (-8 * k) + 'px'
    return e
  }
  function ok(r) { return r && r.statut === 200 && r.corps && typeof r.corps === 'object' }

  // ---------- LA CARTE DES ÎLES : une fenêtre de 9 x 5 cases autour du centre des îles ; un survol, un focus ou un clic montre
  // sa fiche ; la case libre la plus proche du centre dit « Ton île ici ? » ----------
  var carte = document.querySelector('[data-carte-iles]'), fiche = document.querySelector('[data-fiche-ile]')
  function etoiles(n) { var v = Math.max(0, Math.min(5, Math.floor(Number(n) || 0))), s = ''; for (var k = 0; k < 5; k++) s += k < v ? '★' : '☆'; return s }
  function montrerFiche(il, bouton) {
    if (!fiche) return
    A.vider(fiche)
    // (af, 22:3x ; le propriétaire : « Île de X » deux fois) UNE ligne : la tête de l'hôte et le nom de l'île ; le pseudo seul en
    // dessous seulement pour une île au nom à elle (le nom du jeu, « Île de <hôte> », le dit déjà)
    var h = A.el('h3', 'fiche-nom'), t = tete(A.el('span', 'tete-pixel'), il.peau, 28)
    h.appendChild(t); h.appendChild(A.el('span', '', A.texte(il.nom || 'Une île')))
    var hote = nomDuJeu(il) ? null : A.el('p', 'fiche-hote', 'L\'île ' + deNom(il.hote))
    var ne = Number(il.etoiles) || 0
    var e = A.el('p', 'fiche-etoiles', etoiles(ne)); e.setAttribute('aria-label', 'Beauté : ' + String(ne).replace('.', ',') + ' étoile' + (ne > 1 ? 's' : '') + ' sur 5')
    if (ne > 0) e.appendChild(A.el('b', 'fiche-etoiles-nb', String(Math.round(ne * 10) / 10).replace('.', ',')))
    var l = A.el('ul', 'fiche-traits')
    l.appendChild(A.el('li', il.ouverte ? 'ouverte' : 'fermee', il.ouverte ? 'Ouverte aux visites' : 'Fermée aux visites'))
    if (Number(il.amis) > 0) l.appendChild(A.el('li', '', A.nombre(il.amis) + ' ami' + (Number(il.amis) > 1 ? 's' : '') + ' invité' + (Number(il.amis) > 1 ? 's' : '')))
    if (Number(il.en_ligne) > 0) l.appendChild(A.el('li', 'en-jeu', A.nombre(il.en_ligne) + ' en jeu sur l\'île'))
    fiche.appendChild(h); if (hote) fiche.appendChild(hote); fiche.appendChild(e); fiche.appendChild(l)
    // le classement des îles (classement.html#iles : le thème « Îles » de /top, sa beauté, sa taille, ses machines, ses bêtes)
    var liens = A.el('p', 'fiche-liens')
    var sur = A.el('a', 'fiche-lien', 'Voir sur la carte ›'); sur.href = versCarte(il)
    var vers = A.el('a', 'fiche-lien', 'Les plus belles îles ›'); vers.href = 'classement.html#iles'
    liens.appendChild(sur); liens.appendChild(vers)
    fiche.appendChild(liens)
    Array.prototype.forEach.call(carte.querySelectorAll('.ilot.choisi'), function (b) { b.classList.remove('choisi') })
    if (bouton) bouton.classList.add('choisi')
  }
  // (la tête, l'audit du site : « Île de Aviteur ») L'ÉLISION comme le jeu (ciDeNom, aa_casino_partage.js) : « d' » devant une
  // voyelle, le Y selon la lettre qui le suit (« d'Yves », « de Yann »), « de » devant une consonne ou un h
  var VOYELLES = 'aeiouyàâäéèêëîïôöùûüAEIOUYÀÂÄÉÈÊËÎÏÔÖÙÛÜ'
  function deNom(nom) {
    var n = String(nom === undefined || nom === null ? '' : nom), c = n.charAt(0), s = n.charAt(1)
    if (c === 'y' || c === 'Y') return (s !== '' && VOYELLES.indexOf(s) !== -1 ? 'de ' : 'd\'') + n
    return (n && VOYELLES.indexOf(c) !== -1 ? 'd\'' : 'de ') + n
  }
  function nomDuJeu(il) { var n = String(il.nom || ''), h = String(il.hote || ''); return !n || n === 'Île ' + deNom(h) || n === 'Île de ' + h || n === 'Île d\'' + h || n === 'Île d’' + h }
  function compterDans(iles, a0, b0) {
    var n = 0
    iles.forEach(function (il) { var x = Number(il.i) - a0, y = Number(il.j) - b0; if (x >= 0 && x < COLS && y >= 0 && y < RANGS) n++ })
    return n
  }
  // (la tête, 22:1x) une île de l'aperçu ouvre la grande carte SUR ELLE (carte.js lit #ile=i,j) : à la souris, le survol montre
  // sa fiche et le clic l'ouvre ; au doigt, le premier toucher montre la fiche, le second l'ouvre
  var souris = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches
  function versCarte(il) { return 'carte.html#ile=' + Number(il.i) + ',' + Number(il.j) }
  function poserCarte(c) {
    var iles = (c.iles || []).filter(function (il) { return il && isFinite(il.i) && isFinite(il.j) && il.hote })
    if (!iles.length) return
    // la fenêtre : l'étendue des îles et une case de mer autour (une île jamais collée au cadre), entre le minimum et le plafond ;
    // centrée sur le milieu de l'étendue (pas la moyenne : une île au loin tirait la fenêtre vers un bord vide)
    var imin = 1e9, imax = -1e9, jmin = 1e9, jmax = -1e9
    iles.forEach(function (il) { var i = Number(il.i), j = Number(il.j); imin = Math.min(imin, i); imax = Math.max(imax, i); jmin = Math.min(jmin, j); jmax = Math.max(jmax, j) })
    RANGS = Math.max(RANGS_MIN, Math.min(RANGS_MAX, jmax - jmin + 3))
    COLS = Math.max(COLS_MIN, Math.min(COLS_MAX, Math.max(imax - imin + 3, etroit ? 0 : RANGS - 1)))
    // autant de mer à gauche qu'à droite, et en haut qu'en bas : la même parité que l'étendue des îles
    if ((COLS - (imax - imin + 1)) % 2) COLS += COLS < COLS_MAX ? 1 : -1
    if ((RANGS - (jmax - jmin + 1)) % 2) RANGS += RANGS < RANGS_MAX ? 1 : -1
    var i0 = Math.floor((imin + imax + 1) / 2) - Math.floor(COLS / 2), j0 = Math.floor((jmin + jmax + 1) / 2) - Math.floor(RANGS / 2), prises = {}
    // plus large que le plafond : la fenêtre qui contient le plus d'îles (à égalité, la plus proche du milieu)
    if (imax - imin + 1 > COLS || jmax - jmin + 1 > RANGS) {
      var mieux = -1, dm = 1e9
      for (var a0 = imin - 1; a0 <= imax - COLS + 2; a0++) for (var b0 = jmin - 1; b0 <= jmax - RANGS + 2; b0++) {
        var n = compterDans(iles, a0, b0), d0 = Math.abs(a0 - i0) + Math.abs(b0 - j0)
        if (n > mieux || (n === mieux && d0 < dm)) { mieux = n; dm = d0; i0 = a0; j0 = b0 }
      }
      if (imax - imin + 1 <= COLS) i0 = Math.floor((imin + imax + 1) / 2) - Math.floor(COLS / 2)
      if (jmax - jmin + 1 <= RANGS) j0 = Math.floor((jmin + jmax + 1) / 2) - Math.floor(RANGS / 2)
    }
    carte.style.setProperty('--cols', String(COLS)); carte.style.setProperty('--rangs', String(RANGS))
    A.vider(carte)
    var dessin = !!(window.IlePixel && window.IlePixel.grande)
    carte.classList.toggle('dessinee', dessin)
    iles.forEach(function (il) {
      var x = Number(il.i) - i0, y = Number(il.j) - j0
      if (x < 0 || x >= COLS || y < 0 || y >= RANGS) return
      prises[x + ',' + y] = 1
      var b = A.el('button', 'ilot' + (il.ouverte ? ' ouverte' : '') + (Number(il.en_ligne) > 0 ? ' habitee' : '') + (Number(il.etoiles) >= 4 ? ' belle' : ''))
      b.type = 'button'
      b.style.setProperty('--i', x + 1); b.style.setProperty('--j', y + 1)
      // (18:1x) son bercement (--b : un rythme à elle, tiré de sa case, jamais au hasard) et son rang dans l'ouverture (--n)
      b.style.setProperty('--b', String(((x * 7 + y * 3) % 5) / 5)); b.style.setProperty('--n', String(x + y))
      b.setAttribute('aria-label', A.texte(il.nom || 'Une île') + ', l\'île ' + deNom(il.hote))
      // (af, 22:3x) l'île DESSINÉE comme sur la grande carte (js/ile.js, IlePixel.grande : sa forme, sa plage, sa maison, ses
      // arbres, ses fleurs) et son ÉPINGLE : la tête de l'hôte et ses étoiles (aucune pour une île neuve)
      if (dessin) {
        var cv = document.createElement('canvas'); cv.width = 20; cv.height = 20; cv.className = 'ilot-dessin'; cv.setAttribute('aria-hidden', 'true')
        cv.getContext('2d').drawImage(window.IlePixel.grande(Number(il.i), Number(il.j), Math.max(0, Math.min(5, Math.floor(Number(il.etoiles) || 0))), !!il.ouverte), 0, 0)
        b.appendChild(cv)
        var ep = A.el('span', 'ilot-epingle'); ep.setAttribute('aria-hidden', 'true')
        ep.appendChild(tete(A.el('span', 'tete-pixel'), il.peau, 16))
        if (Number(il.etoiles) > 0) ep.appendChild(A.el('span', '', '★ ' + String(Math.round(Number(il.etoiles) * 10) / 10).replace('.', ',')))
        b.appendChild(ep)
      }
      b.appendChild(A.el('span', 'ilot-nom', A.texte(il.nom || il.hote)))
      b.addEventListener('mouseenter', function () { montrerFiche(il, b) })
      b.addEventListener('focus', function () { montrerFiche(il, b) })
      b.addEventListener('click', function () {
        if (souris || b.classList.contains('choisi')) { location.href = versCarte(il); return }
        montrerFiche(il, b)
      })
      carte.appendChild(b)
    })
    // la place libre la plus proche du centre de la fenêtre
    var meilleure = null, dmin = 1e9
    // pres du centre, et jamais au bord du haut ou du bas (la place se lit mal contre le cadre) ; une mer pleine hors des bords :
    // un bord plutôt que rien (« Ton île ici ? » est toujours là)
    for (var tour = 0; tour < 2 && !meilleure; tour++) for (var y = 0; y < RANGS; y++) for (var x = 0; x < COLS; x++) {
      if (prises[x + ',' + y]) continue
      if (tour === 0 && (y === 0 || y === RANGS - 1)) continue
      var d = Math.abs(x - (COLS - 1) / 2) + Math.abs(y - (RANGS - 1) / 2) * 1.5
      if (d < dmin) { dmin = d; meilleure = [x, y] }
    }
    if (dessin && c.etendue && c.etendue.de && c.etendue.a) for (var pj = 0; pj < RANGS; pj++) for (var pi = 0; pi < COLS; pi++) {
      var gi = pi + i0, gj = pj + j0
      if (prises[pi + ',' + pj] || (meilleure && meilleure[0] === pi && meilleure[1] === pj)) continue
      if (gi < c.etendue.de[0] || gi > c.etendue.a[0] || gj < c.etendue.de[1] || gj > c.etendue.a[1]) continue
      var pl = A.el('i', 'ilot-place'); pl.setAttribute('aria-hidden', 'true')
      pl.style.setProperty('--i', pi + 1); pl.style.setProperty('--j', pj + 1)
      carte.appendChild(pl)
    }
    if (meilleure) {
      var a = A.el('a', 'ilot libre'); a.href = '#telecharger'
      a.style.setProperty('--i', meilleure[0] + 1); a.style.setProperty('--j', meilleure[1] + 1)
      a.appendChild(A.el('span', '', 'Ton île ici ?'))
      carte.appendChild(a)
    }
    var titre = document.querySelector('[data-carte-titre]'), lu = document.querySelector('[data-carte-lu]')
    if (titre) titre.textContent = 'La mer des îles, en direct'
    if (lu && c.lu) lu.textContent = 'relue ' + A.ilYa(c.lu)
    // la première île montrée : la plus belle de la fenêtre
    var premiere = carte.querySelector('.ilot.belle') || carte.querySelector('button.ilot')
    if (premiere && fiche) premiere.dispatchEvent(new Event('mouseenter'))
    if (!dessin) poserPhare()
    else { var vieux = carte.querySelector('.phare'); if (vieux) vieux.remove() }
  }
  // (18:1x) LE PHARE au coin de la mer, et L'OUVERTURE : la caméra descend de la mer vers les îles (2,4 s), une fois par visite
  // (sessionStorage), seulement quand la carte entre à l'écran ; un clic, une touche ou un défilement la passent ; jamais pour qui
  // demande moins de mouvement
  function poserPhare() { if (carte && !carte.querySelector('.phare')) { var ph = A.el('i', 'phare'); ph.setAttribute('aria-hidden', 'true'); carte.appendChild(ph) } }
  function dejaVue() { try { return sessionStorage.getItem('casteria_ouverture') === '1' } catch (e) { return true } }
  function noterVue() { try { sessionStorage.setItem('casteria_ouverture', '1') } catch (e) {} }
  function finOuverture() { if (carte) carte.classList.remove('ouverture'); var b = document.querySelector('.passer-ouverture'); if (b) b.remove(); noterVue() }
  function ouverture() {
    if (!carte || calme || dejaVue() || !window.IntersectionObserver) return
    var vu = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return
      vu.disconnect()
      carte.classList.add('ouverture')
      var cadre = carte.parentNode, passer = A.el('button', 'passer-ouverture', 'Passer')
      passer.type = 'button'; passer.addEventListener('click', finOuverture)
      if (cadre) { cadre.style.position = 'relative'; cadre.appendChild(passer) }
      var t = setTimeout(finOuverture, 2600)
      var stop = function () { clearTimeout(t); finOuverture(); window.removeEventListener('keydown', stop); window.removeEventListener('wheel', stop); window.removeEventListener('touchmove', stop) }
      window.addEventListener('keydown', stop, { once: true }); window.addEventListener('wheel', stop, { once: true, passive: true }); window.addEventListener('touchmove', stop, { once: true, passive: true })
    }, { threshold: 0.45 })
    vu.observe(carte)
  }
  if (carte) {
    poserPhare()
    ouverture()
    A.carte('iles').then(function (r) { if (ok(r)) poserCarte(r.corps) })
  }

  // ---------- LES JOUEURS SUR LEURS ÎLES (le vrai nombre ; caché sans lui ou à zéro) ----------
  var surIles = document.querySelector('[data-iles-en-ligne]')
  if (surIles) A.enLigne().then(function (r) {
    if (!ok(r) || !r.corps.lieux) return
    var n = null
    r.corps.lieux.forEach(function (l) { if (l && l.cle === 'iles' && isFinite(l.joueurs)) n = Number(l.joueurs) })
    if (!(n > 0)) return
    surIles.textContent = A.nombre(n) + (n > 1 ? ' joueurs sont' : ' joueur est') + ' sur leur île en ce moment.'
    surIles.hidden = false
  })

  function ajusterPseudos() {
    Array.prototype.forEach.call(document.querySelectorAll('.marche-pseudo'), function (e) {
      e.style.fontSize = ''
      var t = parseFloat(getComputedStyle(e).fontSize) || 17
      while (t > 11 && e.scrollWidth > e.clientWidth + 1) { t -= 1; e.style.fontSize = t + 'px' }
    })
  }
  // ---------- LE PODIUM DU MOMENT : les trois premiers du classement général ----------
  var podium = document.querySelector('[data-podium]'), marches = document.querySelector('[data-podium-marches]')
  if (podium && marches) A.classement('general').then(function (r) {
    var top = ok(r) && r.corps.categorie && r.corps.categorie.top
    if (!top || top.length < 3) return
    A.vider(marches)
    // l'ordre des marches : 2, 1, 3 (le premier au milieu, le plus haut)
    ;[top[1], top[0], top[2]].forEach(function (j) {
      var li = A.el('li', 'marche marche-' + j.rang)
      var t = tete(A.el('span', 'tete-pixel'), j.peau, 56)
      li.appendChild(t)
      li.appendChild(A.el('b', 'marche-pseudo', j.pseudo))
      li.appendChild(A.el('span', 'marche-texte', A.texte(j.texte)))
      li.appendChild(A.el('span', 'marche-rang', A.rang(j.rang)))
      marches.appendChild(li)
    })
    podium.hidden = false
    // un pseudo jamais coupé sur deux lignes : sur une ligne, sa taille baisse jusqu'à tenir (11 px au plus petit)
    ajusterPseudos()
    window.addEventListener('resize', ajusterPseudos)
  })

  // ---------- LES DERNIERS EXPLOITS, qui défilent (immobiles pour qui a demandé moins de mouvement) ----------
  var bande = document.querySelector('[data-exploits]'), liste = document.querySelector('[data-exploits-liste]')
  function ligneExploit(x) {
    var li = A.el('li', 'exploit exploit-' + String(x.sorte || '').replace(/[^a-z_]/g, ''))
    li.appendChild(A.el('span', 'exploit-texte', A.texte(x.texte)))
    if (x.quand) li.appendChild(A.el('span', 'exploit-quand', A.ilYa(x.quand)))
    return li
  }
  if (bande && liste) A.exploits(12).then(function (r) {
    var l = ok(r) && r.corps.exploits
    if (!l || !l.length) return
    A.vider(liste)
    l.forEach(function (x) { if (x && x.texte) liste.appendChild(ligneExploit(x)) })
    if (!liste.children.length) return
    // la boucle sans couture : la liste recopiée une fois derrière elle (cachée aux lecteurs d'écran)
    if (!calme) {
      var copie = liste.cloneNode(true); copie.setAttribute('aria-hidden', 'true'); copie.classList.add('copie')
      liste.parentNode.appendChild(copie)
      liste.parentNode.style.setProperty('--duree', Math.max(30, liste.children.length * 6) + 's')
      liste.parentNode.classList.add('defile')
    }
    bande.hidden = false
  })
})()
