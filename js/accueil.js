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
  var COLS = tresEtroit ? 6 : etroit ? 7 : 9, RANGS = 5
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
    var h = A.el('h3', 'fiche-nom', A.texte(il.nom || 'Une île'))
    var hote = A.el('p', 'fiche-hote'), t = tete(A.el('span', 'tete-pixel'), il.peau, 24)
    hote.appendChild(t); hote.appendChild(A.el('span', '', 'Île de ' + il.hote))
    var e = A.el('p', 'fiche-etoiles', etoiles(il.etoiles)); e.setAttribute('aria-label', 'Beauté : ' + (Number(il.etoiles) || 0) + ' étoile' + ((Number(il.etoiles) || 0) > 1 ? 's' : '') + ' sur 5')
    var l = A.el('ul', 'fiche-traits')
    l.appendChild(A.el('li', il.ouverte ? 'ouverte' : 'fermee', il.ouverte ? 'Ouverte aux visites' : 'Fermée aux visites'))
    if (Number(il.amis) > 0) l.appendChild(A.el('li', '', A.nombre(il.amis) + ' ami' + (Number(il.amis) > 1 ? 's' : '') + ' invité' + (Number(il.amis) > 1 ? 's' : '')))
    if (Number(il.en_ligne) > 0) l.appendChild(A.el('li', 'en-jeu', A.nombre(il.en_ligne) + ' en jeu sur l\'île'))
    fiche.appendChild(h); fiche.appendChild(hote); fiche.appendChild(e); fiche.appendChild(l)
    // le classement des îles (classement.html#iles : le thème « Îles » de /top, sa beauté, sa taille, ses machines, ses bêtes)
    var vers = A.el('a', 'fiche-lien', 'Les plus belles îles ›'); vers.href = 'classement.html#iles'
    fiche.appendChild(vers)
    Array.prototype.forEach.call(carte.querySelectorAll('.ilot.choisi'), function (b) { b.classList.remove('choisi') })
    if (bouton) bouton.classList.add('choisi')
  }
  function poserCarte(c) {
    var iles = (c.iles || []).filter(function (il) { return il && isFinite(il.i) && isFinite(il.j) && il.hote })
    if (!iles.length) return
    // le centre : la moyenne des cases ; la fenêtre : 9 x 5 autour de lui
    // le centre : le milieu de l'etendue des iles (pas la moyenne : une ile au loin tirait la fenetre vers un bord vide)
    var imin = 1e9, imax = -1e9, jmin = 1e9, jmax = -1e9
    iles.forEach(function (il) { var i = Number(il.i), j = Number(il.j); imin = Math.min(imin, i); imax = Math.max(imax, i); jmin = Math.min(jmin, j); jmax = Math.max(jmax, j) })
    var ci = Math.round((imin + imax) / 2), cj = Math.round((jmin + jmax) / 2)
    var i0 = ci - Math.floor(COLS / 2), j0 = cj - Math.floor(RANGS / 2), prises = {}
    A.vider(carte)
    iles.forEach(function (il) {
      var x = Number(il.i) - i0, y = Number(il.j) - j0
      if (x < 0 || x >= COLS || y < 0 || y >= RANGS) return
      prises[x + ',' + y] = 1
      var b = A.el('button', 'ilot' + (il.ouverte ? ' ouverte' : '') + (Number(il.en_ligne) > 0 ? ' habitee' : '') + (Number(il.etoiles) >= 4 ? ' belle' : ''))
      b.type = 'button'
      b.style.setProperty('--i', x + 1); b.style.setProperty('--j', y + 1)
      // (18:1x) son bercement (--b : un rythme à elle, tiré de sa case, jamais au hasard) et son rang dans l'ouverture (--n)
      b.style.setProperty('--b', String(((x * 7 + y * 3) % 5) / 5)); b.style.setProperty('--n', String(x + y))
      b.setAttribute('aria-label', A.texte(il.nom || 'Une île') + ', l\'île de ' + il.hote)
      b.appendChild(A.el('span', 'ilot-nom', A.texte(il.nom || il.hote)))
      b.addEventListener('mouseenter', function () { montrerFiche(il, b) })
      b.addEventListener('focus', function () { montrerFiche(il, b) })
      b.addEventListener('click', function () { montrerFiche(il, b) })
      carte.appendChild(b)
    })
    // la place libre la plus proche du centre de la fenêtre
    var meilleure = null, dmin = 1e9
    for (var y = 0; y < RANGS; y++) for (var x = 0; x < COLS; x++) {
      if (prises[x + ',' + y]) continue
      // pres du centre, et jamais au bord du haut ou du bas (la place se lit mal contre le cadre)
      if (y === 0 || y === RANGS - 1) continue
      var d = Math.abs(x - (COLS - 1) / 2) + Math.abs(y - (RANGS - 1) / 2) * 1.5
      if (d < dmin) { dmin = d; meilleure = [x, y] }
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
    poserPhare()
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
