// LA CARTE VIVANTE (carte.html ; l'API : /api/carte, /api/navires, /api/exploits : API.md 2.6, 2.7, 2.8 ; par
// js/vivant_api.js). Le propriétaire (29/10) : « interactif, donner envie d'avoir son île et de monter », « la beauté des
// îles des joueurs, de mini animations, que ce soit beau » ; 60 images par seconde sur un téléphone moyen.
// LES ÎLES : une case par île (une place tous les 320 blocs en jeu). La page ne demande à l'API QUE ce qu'elle montre :
// des pavés de 16 x 16 cases, UNE demande par geste (&de=i,j&a=i,j), un pavé lu ne se redemande pas avant 2 minutes.
// Trois vues : de loin une image par pavé (2 pixels par case) ; plus près l'île dessinée (js/ile.js) qui BERCE sur l'eau,
// les îles où l'on joue S'ALLUMENT, les places LIBRES de la grille se voient (« Ton île ici ? ») ; tout près la tête de
// l'hôte et ses étoiles (« ★ 3,1 »), puis le nom de l'île. Un clic : sa fiche. La HOULE passe ; le SOIR et la NUIT
// suivent l'heure de Paris (?heure=21 pour la photo) ; une ÉTINCELLE sur l'île d'un joueur qui vient de faire un exploit.
// Au premier affichage, la caméra GLISSE vers le centre (2 s ; un geste la passe ; immobile pour qui demande moins de
// mouvement). LA MER : ses lieux, le PHARE qui balaie, et (NAVIRES vrai : API.md 2.7, le mot du propriétaire) les
// navires des joueurs, relus toutes les 10 s, qui glissent avec leur SILLAGE.
// Sans animation (prefers-reduced-motion) : tout reste, immobile ; on ne redessine que ce qui change.
;(function () {
  'use strict'
  var A = window.CasteriaApi, V = window.CasteriaVivant, P = window.IlePixel
  var vue = document.getElementById('carte-vue'), toile = document.getElementById('carte-canvas')
  if (!vue || !toile || !A || !V || !P || !window.Tete) return
  var NAVIRES = false
  var PAVE = 16, VIE_PAVE = 120000, ATTENTE = 220
  var ZOOM_MIN = 2.5, ZOOM_MAX = 140, MER_MIN = 0.03, MER_MAX = 1.6, DEPART_S = 26
  var COULEURS = P.COULEURS
  var g = toile.getContext('2d')
  var etat = document.getElementById('carte-etat'), note = document.getElementById('carte-note')
  var fiche = document.getElementById('fiche'), ficheCorps = document.getElementById('fiche-corps'), bulle = document.getElementById('bulle')
  var fil = document.getElementById('carte-fil')
  var calme = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  var photo = /[?&]photo\b/.test(location.search), mesure = /[?&]mesure\b/.test(location.search)
  if (A.essai && /[?&]navires\b/.test(location.search)) NAVIRES = true
  var heureForcee = (location.search.match(/[?&]heure=(\d{1,2})\b/) || [])[1]

  var zone = 'iles'
  var I = { cx: 0, cy: 0, s: mesure ? ZOOM_MIN : DEPART_S }, M = { cx: 0, cy: 0, s: 0.12 }
  var L = 0, H = 0, dpr = 1, sale = true, visible = true, t = 0
  var paves = {}, total = 0, etendue = null, choisie = null, libreChoisie = null, survolee = null, survolLibre = null, demande = null, enCours = false
  var lieux = null, navires = {}, relevePrec = 0, releveDernier = 0
  // (af, 23:2x, la mesure : une île unique neuve coûte 1 ms, 7,6 au téléphone lent) les dessins neufs (îles uniques, épingles) ne
  // se fabriquent que pendant les 4 premières ms d'une image ; la suite attend l'image suivante : rien ne saccade
  var intro = null, etincelles = [], ilesDe = {}, debutImage = 0
  function aLeTemps() { return performance.now() - debutImage < 4 }

  function ecrire(t2) { etat.textContent = t2; etat.hidden = !t2 }
  function cle(pi, pj) { return pi + ',' + pj }
  function etoilesTexte(e) { return '★ ' + String(Math.round(Number(e || 0) * 10) / 10).replace('.', ',') }
  function rangN(r) { return r === 1 ? '1er' : A.nombre(r) + 'e' }
  function niveauEtoiles(e) { return Math.max(0, Math.min(5, Math.floor(Number(e) || 0))) }

  // ---------------------------------------------------------------- l'heure de Paris : le jour, le soir, la nuit
  function heureParis() {
    if (heureForcee !== undefined) return Number(heureForcee)
    try { return Number(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: 'numeric', hour12: false }).format(new Date())) % 24 } catch (e) { return new Date().getHours() }
  }
  var AMB = { jour: { haut: '#16506F', bas: '#0E2C40', voile: null, nuit: false }, soir: { haut: '#3B3A6E', bas: '#1C2244', voile: 'rgba(255,140,90,0.07)', nuit: false },
    nuit: { haut: '#0A1630', bas: '#040A16', voile: 'rgba(8,10,36,0.34)', nuit: true }, aube: { haut: '#3E5C86', bas: '#1A3550', voile: 'rgba(255,190,150,0.06)', nuit: false } }
  var amb = AMB.jour
  function ambiance() { var h = heureParis(); amb = h >= 21 || h < 6 ? AMB.nuit : (h >= 18 ? AMB.soir : (h < 8 ? AMB.aube : AMB.jour)); document.documentElement.setAttribute('data-heure-carte', h >= 21 || h < 6 ? 'nuit' : (h >= 18 ? 'soir' : (h < 8 ? 'aube' : 'jour'))) }
  ambiance()

  // ---------------------------------------------------------------- la taille de la toile
  function taille() {
    var r = vue.getBoundingClientRect()
    dpr = Math.min(2, window.devicePixelRatio || 1)
    L = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height))
    toile.width = Math.round(L * dpr); toile.height = Math.round(H * dpr)
    toile.style.width = L + 'px'; toile.style.height = H + 'px'
    sale = true; plusTard()
  }

  // ---------------------------------------------------------------- les îles : ce qu'on demande à l'API
  function visibles() {
    var i0 = Math.floor(I.cx - L / 2 / I.s) - 1, i1 = Math.ceil(I.cx + L / 2 / I.s) + 1
    var j0 = Math.floor(I.cy - H / 2 / I.s) - 1, j1 = Math.ceil(I.cy + H / 2 / I.s) + 1
    return { i0: i0, i1: i1, j0: j0, j1: j1, pi0: Math.floor(i0 / PAVE), pi1: Math.floor(i1 / PAVE), pj0: Math.floor(j0 / PAVE), pj1: Math.floor(j1 / PAVE) }
  }
  function plusTard() { clearTimeout(demande); demande = setTimeout(charger, ATTENTE) }
  function charger() {
    if (zone !== 'iles' || enCours) return
    var v = visibles(), maintenant = Date.now(), manque = [], a = { i0: 1e9, i1: -1e9, j0: 1e9, j1: -1e9 }
    for (var pi = v.pi0; pi <= v.pi1; pi++) for (var pj = v.pj0; pj <= v.pj1; pj++) {
      var p = paves[cle(pi, pj)]
      if (p && maintenant - p.lu < VIE_PAVE) continue
      manque.push([pi, pj])
      a.i0 = Math.min(a.i0, pi); a.i1 = Math.max(a.i1, pi); a.j0 = Math.min(a.j0, pj); a.j1 = Math.max(a.j1, pj)
    }
    if (!manque.length) return
    enCours = true
    V.carte('iles', { de: [a.i0 * PAVE, a.j0 * PAVE], a: [a.i1 * PAVE + PAVE - 1, a.j1 * PAVE + PAVE - 1] }).then(function (r) {
      enCours = false
      if (r.statut !== 200) { ecrire('La carte ne répond pas pour l\'instant. Réessaie dans une minute.'); return }
      var j = r.corps, tl = Date.now(), neufs = {}, k
      for (k = 0; k < manque.length; k++) neufs[cle(manque[k][0], manque[k][1])] = { lu: tl, iles: [], occ: {} }
      for (k = 0; k < j.iles.length; k++) {
        var x = j.iles[k], c = cle(Math.floor(x.i / PAVE), Math.floor(x.j / PAVE))
        if (!neufs[c]) continue
        neufs[c].iles.push(x); neufs[c].occ[x.i + ',' + x.j] = x
        ilesDe[String(x.hote).toLowerCase()] = x
      }
      for (var c2 in neufs) paves[c2] = neufs[c2]
      if (P.noterDessins) P.noterDessins(j.iles)
      if (j.total != null) total = j.total
      if (j.etendue) etendue = j.etendue
      ecrire(''); dire(); sale = true
      if (!intro && !mesure) { cadrerIles(); lancerIntro() }
      plusTard()
    })
  }
  function dire() {
    if (!note) return
    note.textContent = zone === 'iles'
      ? (total ? A.nombre(total) + ' îles sur la mer de Casteria. ' : '') + 'Relue toutes les 2 minutes.'
      : 'Les lieux de la mer que tout le monde connaît.' + (NAVIRES ? ' Les navires des joueurs, toutes les 10 secondes.' : '')
  }

  // (af, 22:4x ; avant : le point 0,0 au zoom 26, les îles minuscules dans un coin d'une mer vide) LE CADRE DES ÎLES : toute
  // l'étendue de la grille (les îles et les places entre elles) au milieu de la vue, aussi près que la vue le permet (une demi-case
  // de mer autour, la tête de l'hôte visible dès 44 px par case), jamais plus près que 96 ni plus loin que 26
  function cadrerIles() {
    if (!etendue) return
    // la colonne des boutons du zoom (à gauche, 60 px) reste à la mer : les îles se cadrent à sa droite
    var w = etendue.a[0] - etendue.de[0] + 1, h = etendue.a[1] - etendue.de[1] + 1, gauche = 60
    I.s = Math.max(26, Math.min(96, Math.min((L - gauche) / (w + 1.5), H / (h + 1.5))))
    I.cx = (etendue.de[0] + etendue.a[0]) / 2 - gauche / 2 / I.s; I.cy = (etendue.de[1] + etendue.a[1]) / 2
  }
  // ---------------------------------------------------------------- L'ARRIVÉE : la caméra glisse vers le centre (2 s)
  function lancerIntro() {
    intro = { fini: true }
    if (calme || photo) return
    var de = { cx: I.cx + 9, cy: I.cy - 6, s: 6 }, vers = { cx: I.cx, cy: I.cy, s: I.s }
    I.cx = de.cx; I.cy = de.cy; I.s = de.s
    intro = { t0: performance.now(), de: de, vers: vers, fini: false }
  }
  function finirIntro() { if (intro && !intro.fini) { I.cx = intro.vers.cx; I.cy = intro.vers.cy; I.s = intro.vers.s; intro.fini = true; sale = true; plusTard() } }
  function avancerIntro(maint) {
    if (!intro || intro.fini) return
    var k = Math.min(1, (maint - intro.t0) / 2000), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
    I.cx = intro.de.cx + (intro.vers.cx - intro.de.cx) * e; I.cy = intro.de.cy + (intro.vers.cy - intro.de.cy) * e
    I.s = Math.exp(Math.log(intro.de.s) + (Math.log(intro.vers.s) - Math.log(intro.de.s)) * e)
    if (k >= 1) { intro.fini = true; plusTard() }
  }

  // ---------------------------------------------------------------- le dessin
  // des images faites une fois : le halo d'une île où l'on joue, l'étincelle
  var halo = (function () {
    var c = document.createElement('canvas'); c.width = 64; c.height = 64
    var x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 4, 32, 32, 32)
    gr.addColorStop(0, 'rgba(255,225,120,0.75)'); gr.addColorStop(0.45, 'rgba(255,200,80,0.28)'); gr.addColorStop(1, 'rgba(255,200,80,0)')
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64)
    return c
  })()
  function dessiner(maint) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.imageSmoothingEnabled = false
    if (zone === 'iles') dessinerIles(maint); else dessinerMer(maint)
    if (amb.voile) { g.fillStyle = amb.voile; g.fillRect(0, 0, L, H) }
  }
  function fondMer(pas, ox, oy) {
    var f = g.createLinearGradient(0, 0, 0, H)
    f.addColorStop(0, amb.haut); f.addColorStop(1, amb.bas)
    g.fillStyle = f
    g.fillRect(0, 0, L, H)
    if (pas >= 18) {
      g.strokeStyle = 'rgba(255,255,255,.045)'; g.lineWidth = 1; g.beginPath()
      var x0 = ((ox % pas) + pas) % pas, y0 = ((oy % pas) + pas) % pas
      for (var x = x0; x < L; x += pas) { g.moveTo(Math.round(x) + .5, 0); g.lineTo(Math.round(x) + .5, H) }
      for (var y = y0; y < H; y += pas) { g.moveTo(0, Math.round(y) + .5); g.lineTo(L, Math.round(y) + .5) }
      g.stroke()
    }
  }
  // (af, 22:5x) LES REFLETS : quatre taches de lumière douces qui glissent lentement sur l'eau (une image faite une fois ; la nuit,
  // plus pâles) ; immobiles pour qui demande moins de mouvement
  var reflet = (function () {
    // un carré, son dégradé tout entier dedans (aucun bord coupé), étiré en ovale au dessin
    var c = document.createElement('canvas'); c.width = 64; c.height = 64
    var x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 1, 32, 32, 32)
    gr.addColorStop(0, 'rgba(140,220,255,0.14)'); gr.addColorStop(0.6, 'rgba(140,220,255,0.05)'); gr.addColorStop(1, 'rgba(140,220,255,0)')
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64)
    return c
  })()
  function reflets() {
    g.globalAlpha = amb.nuit ? 0.45 : 1
    for (var k = 0; k < 4; k++) {
      var w = 240 + (k % 2) * 120, h = w * 0.45, v = calme ? 0 : t * (6 + k * 2)
      var x = ((k * 397 + v) % (L + w)) - w, y = ((k * 211) % Math.max(1, H - h)) + Math.sin(t * 0.3 + k) * (calme ? 0 : 8)
      g.drawImage(reflet, Math.round(x), Math.round(y), Math.round(w), Math.round(h))
    }
    g.globalAlpha = 1
  }
  // LA HOULE : trois longues crêtes qui descendent lentement la mer (quelques segments par image)
  function houle() {
    reflets()
    if (calme) return
    g.strokeStyle = amb.nuit ? 'rgba(170,200,255,0.07)' : 'rgba(220,240,255,0.08)'
    g.lineWidth = 2
    for (var k = 0; k < 3; k++) {
      var base = ((t * 14 + k * H / 3) % (H + 60)) - 30
      g.beginPath()
      for (var x = 0; x <= L; x += 24) {
        var y = base + Math.sin(x / 70 + t * 0.9 + k * 2) * 5 + x * 0.06
        if (x === 0) g.moveTo(x, y); else g.lineTo(x, y)
      }
      g.stroke()
    }
    // la nuit : quelques reflets d'étoiles sur l'eau
    if (amb.nuit) {
      g.fillStyle = 'rgba(255,255,255,0.5)'
      for (var s = 0; s < 18; s++) {
        var px = (s * 97.3) % L, py = (s * 57.1 + 13) % H
        if (Math.sin(t * 2 + s) > 0.6) g.fillRect(Math.round(px), Math.round(py), 1, 1)
      }
    }
  }
  function ecranI(i, j) { return [(i - I.cx) * I.s + L / 2, (j - I.cy) * I.s + H / 2] }
  function dessinerIles(maint) {
    var s = I.s, o = ecranI(0, 0)
    fondMer(s >= 18 ? s : s * 10, o[0] - s / 2, o[1] - s / 2)
    houle()
    var v = visibles(), pres = s >= 16, tout = s >= 44, pi, pj, p, k
    if (pres) navirePassant(v)
    g.textAlign = 'center'; g.textBaseline = 'top'
    // les places libres : dans l'étendue de la grille, une case sans île (un pavé lu : on sait qu'elle est vide)
    if (pres && etendue) {
      var a0 = Math.max(v.i0, etendue.de[0]), a1 = Math.min(v.i1, etendue.a[0]), b0 = Math.max(v.j0, etendue.de[1]), b1 = Math.min(v.j1, etendue.a[1])
      g.strokeStyle = 'rgba(227,207,142,0.32)'; g.lineWidth = 1
      if (g.setLineDash) g.setLineDash([3, 3])
      g.beginPath()
      for (var li = a0; li <= a1; li++) for (var lj = b0; lj <= b1; lj++) {
        p = paves[cle(Math.floor(li / PAVE), Math.floor(lj / PAVE))]
        if (!p || p.occ[li + ',' + lj]) continue
        var el = ecranI(li, lj), dl = Math.round(s * .56)
        g.rect(Math.round(el[0] - dl / 2) + .5, Math.round(el[1] - dl / 2) + .5, dl, dl)
      }
      g.stroke()
      if (g.setLineDash) g.setLineDash([])
    }
    for (pi = v.pi0; pi <= v.pi1; pi++) for (pj = v.pj0; pj <= v.pj1; pj++) {
      p = paves[cle(pi, pj)]
      if (!p) continue
      if (!pres) {
        var o0 = ecranI(pi * PAVE, pj * PAVE)
        g.drawImage(imagePave(p, pi, pj), Math.round(o0[0] - s / 4), Math.round(o0[1] - s / 4), Math.round(PAVE * s), Math.round(PAVE * s))
        continue
      }
      for (k = 0; k < p.iles.length; k++) {
        var x = p.iles[k], e = ecranI(x.i, x.j)
        if (e[0] < -s || e[0] > L + s || e[1] < -s || e[1] > H + s) continue
        ile(x, e[0], e[1], s, tout)
      }
    }
    // la place libre survolée ou choisie : « Ton île ici ? »
    var lb = libreChoisie || survolLibre
    if (lb && pres) {
      var ec = ecranI(lb.i, lb.j), dd = Math.round(s * .7)
      g.strokeStyle = '#FFD75E'; g.lineWidth = 2
      g.strokeRect(Math.round(ec[0] - dd / 2) - .5, Math.round(ec[1] - dd / 2) - .5, dd + 1, dd + 1)
      g.font = '600 13px Fredoka, system-ui, sans-serif'
      etiquette('Ton île ici ?', ec[0], ec[1] + dd / 2 + 4, 13, '#FFD75E')
    }
    // (af, 22:5x) l'île choisie : quatre coins d'or (comme une case de jeu), sans cacher l'île
    if (choisie) {
      var c = ecranI(choisie.i, choisie.j), r = Math.round(Math.max(7, s * .56)), lc = Math.max(5, Math.round(r * .38)), ep = Math.max(2, Math.round(s / 30))
      var x0 = Math.round(c[0] - r), y0 = Math.round(c[1] - r), x1 = Math.round(c[0] + r), y1 = Math.round(c[1] + r)
      g.fillStyle = 'rgba(0,0,0,.35)'
      coins(x0 + 2, y0 + 2, x1 + 2, y1 + 2, lc, ep)
      g.fillStyle = '#FFD75E'
      coins(x0, y0, x1, y1, lc, ep)
    }
    dessinerEtincelles(maint)
    if (pres) mouettes()
  }
  function coins(x0, y0, x1, y1, lc, ep) {
    g.fillRect(x0, y0, lc, ep); g.fillRect(x0, y0, ep, lc)
    g.fillRect(x1 - lc, y0, lc, ep); g.fillRect(x1 - ep, y0, ep, lc)
    g.fillRect(x0, y1 - ep, lc, ep); g.fillRect(x0, y1 - lc, ep, lc)
    g.fillRect(x1 - lc, y1 - ep, lc, ep); g.fillRect(x1 - ep, y1 - lc, ep, lc)
  }
  function imagePave(p, pi, pj) {
    if (p.img) return p.img
    var c = document.createElement('canvas')
    c.width = PAVE * 2; c.height = PAVE * 2
    var x = c.getContext('2d')
    for (var k = 0; k < p.iles.length; k++) {
      var il = p.iles[k]
      x.fillStyle = il.en_ligne > 0 ? '#FFFFFF' : (COULEURS[niveauEtoiles(il.etoiles)] || COULEURS[0])
      x.fillRect((il.i - pi * PAVE) * 2, (il.j - pj * PAVE) * 2, 1, 1)
    }
    p.img = c
    return c
  }
  // une île : elle berce (sa phase vient de sa case) ; allumée si l'on y joue ; la nuit, sa fenêtre luit ; tout près, la
  // tête de l'hôte et ses étoiles ; plus près encore, son nom
  function ile(x, px, py, s, tout) {
    var d = Math.round(s * .86), berce = calme ? 0 : Math.sin(t * 1.3 + x.i * 0.7 + x.j * 1.3) * Math.max(0.6, s * 0.025)
    var a = Math.round(px - d / 2), b = Math.round(py - d / 2 + berce), u = d / 12
    if (x.en_ligne > 0) {
      var hl = Math.round(d * (1.55 + (calme ? 0 : Math.sin(t * 2.4 + x.i) * 0.12)))
      g.globalAlpha = 0.9
      g.drawImage(halo, Math.round(px - hl / 2), Math.round(py - hl / 2 + berce), hl, hl)
      g.globalAlpha = 1
    }
    // (af, 23:1x ; le propriétaire : « incroyables ») L'ÎLE UNIQUE (IlePixel.unique, 28 x 28 : sa forme, ses maisons, ses arbres,
    // ses fleurs, ses bêtes et ses machines si l'API les compte), un peu plus grande que sa case ; SON ÉCUME BAT (deux images, à
    // son rythme) ; on y joue : sa cheminée fume ; la nuit, sa fenêtre s'allume ; de loin, la petite de 12 x 12
    var un = null
    // (af, 23:2x ; la tête : « sa vraie vue du ciel, fondue dans ta mer ») UNE ÎLE OUVERTE déjà rendue en 3D (x.ciel, l'API) : son
    // image du ciel (67 : 320 x 320 par case, un pixel par bloc, le bord déjà fondu dans l'eau), agrandie pour que sa terre (le
    // pont et l'île 2 compris, environ 200 blocs de large) ait la taille d'une île dessinée, centrée sur cette terre ; tant qu'elle
    // n'est pas lue, le dessin ; une île fermée n'a jamais d'image (l'API répond 404 partout, le même mot)
    var vc = x.ciel && s >= 40 ? cielDe(x) : null
    if (vc) {
      var tc = Math.round(s * 1.45), cx0 = Math.round(px - tc * (CIEL_X / 320 - 0.5)), cy0 = Math.round(py - tc * (CIEL_Y / 320 - 0.5) + berce)
      // un peu plus vive que le rendu brut, pour tenir à côté des îles dessinées (le filtre : là où le navigateur le sait)
      g.imageSmoothingEnabled = true
      if (FILTRE) g.filter = 'saturate(1.3) brightness(1.12)'
      g.drawImage(vc, Math.round(cx0 - tc / 2), Math.round(cy0 - tc / 2), tc, tc)
      if (FILTRE) g.filter = 'none'
      g.imageSmoothingEnabled = false
      if (!tout) return
      var ttc = Math.round(s * .12) * 2, epc = epingle(x, ttc), sommetC = cy0 - tc / 2 + tc * CIEL_HAUT / 320
      if (epc) g.drawImage(epc, Math.round(px - (epc.width - 2) / 2), Math.round(sommetC - ttc - 6))
      return
    }
    var xd = P.pourDessin ? P.pourDessin(x) : x
    if (P.unique && s >= 40 && (P.uniqueDeja(xd) || aLeTemps())) un = P.unique(xd)
    else if (P.grande && s >= 16 && (!P.grandeDeja || P.grandeDeja(x.i, x.j, niveauEtoiles(x.etoiles), x.ouverte) || aLeTemps())) { var gd = Math.round(s * .92); g.drawImage(P.grande(x.i, x.j, niveauEtoiles(x.etoiles), x.ouverte), Math.round(px - gd / 2), Math.round(py - gd / 2 + berce), gd, gd); if (tout) { var tt0 = Math.round(s * .12) * 2, ep0 = epingle(x, tt0); if (ep0) g.drawImage(ep0, Math.round(px - (ep0.width - 2) / 2), Math.round(py - gd / 2 + berce - tt0 - 6)) } return }
    var dg = un ? Math.round(s * 1.18) : d, sc = un ? dg / un.U : u
    if (un) {
      a = Math.round(px - dg / 2); b = Math.round(py - dg / 2 + berce)
      var vague = calme ? 0 : Math.floor(t * 1.15 + (x.i * 0.37 + x.j * 0.61)) & 1
      g.drawImage(un.f[vague], a, b, dg, dg)
      if (amb.nuit && un.fenetre) { g.fillStyle = '#FFD75E'; g.fillRect(Math.round(a + un.fenetre[0] * sc), Math.round(b + un.fenetre[1] * sc), Math.max(2, Math.round(sc)), Math.max(2, Math.round(sc))) }
      if (x.en_ligne > 0 && un.cheminee && !calme && s >= 30) fumee(a + (un.cheminee[0] + 0.5) * sc, b + un.cheminee[1] * sc, sc, x.i * 1.7 + x.j)
    } else {
      g.drawImage(P.sprite(x.i, x.j, niveauEtoiles(x.etoiles), x.ouverte), a, b, d, d)
      if (amb.nuit) { g.fillStyle = '#FFD75E'; g.fillRect(Math.round(a + u * 5), Math.round(b + u * 6), Math.max(2, Math.round(u * 1.5)), Math.max(2, Math.round(u * 1.5))) }
    }
    if (!tout) return
    // (af, 22:5x) L'ÉPINGLE au-dessus de l'île (elle ne la cache plus) : la tête de l'hôte et, à côté, ses étoiles en petit (le
    // propriétaire : « sans prendre de place » ; aucune pour une île neuve : son fanion gris le dit), sa pointe sur le haut de
    // l'île ; (22:4x, la mesure : 24,7 ms par image avec les têtes) dessinée UNE fois par île et par taille, puis recopiée
    var tt = Math.round(s * .12) * 2, ep = epingle(x, tt), sommet = un ? b + un.haut * sc : b
    if (ep) g.drawImage(ep, Math.round(px - (ep.width - 2) / 2), Math.round(sommet - tt - 6))
    d = un ? Math.round((un.U - 4) * sc) : dg
    if (s < 110) return
    var f = Math.min(15, Math.max(12, Math.round(s / 8)))
    g.font = '600 ' + f + 'px Fredoka, system-ui, sans-serif'
    etiquette(x.nom, px, b + d + 12, f, '#fff')
  }
  // (af, 23:1x) LES PASSANTS : un NAVIRE qui traverse de temps en temps (toutes les 35 à 60 s, sur la mer, son sillage derrière
  // lui ; dans le monde : il suit la carte quand on la glisse) et des MOUETTES rares (une à trois, toutes les 9 à 21 s, dans le
  // ciel, leur ombre sur l'eau). Rien pour qui demande moins de mouvement, rien pendant la mesure. Des carrés, aucune image.
  var NAV = ['......W.......', '.....WWW......', '....WWPWW.....', '...WWWPWWW....', '......M.......', 'BBBBBBBBBBBBB.', '.BBBBBBBBBBB..', '..bbbbbbbbb...']
  var NAV_T = { W: '#F4EAFF', P: '#8E4FB5', M: '#5A3A1C', B: '#8C5A2E', b: '#6B4423' }
  var passant = null, prochainNavire = 6, volee = [], prochaineMouette = 4
  function navirePassant(v) {
    if (calme || mesure) return
    if (!passant && t > prochainNavire) {
      var sens = Math.random() < 0.5 ? 1 : -1
      passant = { i: sens > 0 ? v.i0 - 1 : v.i1 + 1, j: v.j0 + 1.5 + Math.random() * Math.max(1, v.j1 - v.j0 - 3), sens: sens, t0: t, i0: sens > 0 ? v.i0 - 1 : v.i1 + 1 }
    }
    if (!passant) return
    var ip = passant.i0 + passant.sens * (t - passant.t0) * 0.22, e = ecranI(ip, passant.j)
    if (e[0] < -120 || e[0] > L + 120 || ip < v.i0 - 3 || ip > v.i1 + 3) { passant = null; prochainNavire = t + 35 + Math.random() * 25; return }
    var u = Math.max(1, Math.round(I.s / 26)), lg = NAV[0].length, y0 = Math.round(e[1] - 4 * u + Math.sin(t * 1.6) * u * 0.6), x0 = Math.round(e[0] - lg * u / 2)
    // le sillage : des traits clairs derrière la poupe, qui s'ouvrent et s'effacent
    for (var k = 1; k <= 5; k++) {
      g.fillStyle = 'rgba(230,245,255,' + (0.34 - k * 0.06).toFixed(2) + ')'
      var sx = passant.sens > 0 ? x0 - k * 4 * u : x0 + lg * u + (k * 4 - 3) * u
      g.fillRect(sx, y0 + 6 * u - k * u * 0.5, 3 * u, u); g.fillRect(sx, y0 + 7 * u + k * u * 0.5, 3 * u, u)
    }
    for (var y = 0; y < NAV.length; y++) for (var c = 0; c < lg; c++) {
      var ch = NAV[y][passant.sens > 0 ? c : lg - 1 - c]
      if (ch === '.') continue
      g.fillStyle = NAV_T[ch]; g.fillRect(x0 + c * u, y0 + y * u, u, u)
    }
  }
  function mouettes() {
    if (calme || mesure) return
    if (t > prochaineMouette) {
      var n = 1 + Math.floor(Math.random() * 3), sens = Math.random() < 0.5 ? 1 : -1, y = H * (0.12 + Math.random() * 0.6), vit = 46 + Math.random() * 20
      for (var k = 0; k < n; k++) volee.push({ x: sens > 0 ? -20 - k * 22 : L + 20 + k * 22, y: y + k * 9 - (k % 2) * 14, sens: sens, vit: vit, ph: k * 0.7, t0: t })
      prochaineMouette = t + 9 + Math.random() * 12
    }
    for (var m = volee.length - 1; m >= 0; m--) {
      var o = volee[m], x = o.x + o.sens * (t - o.t0) * o.vit
      if (x < -60 || x > L + 60) { volee.splice(m, 1); continue }
      var yy = o.y + Math.sin((t - o.t0) * 1.3 + o.ph) * 4, haut = Math.floor((t * 5 + o.ph * 3)) & 1, u = 3
      g.fillStyle = 'rgba(4,20,32,.28)'; g.fillRect(Math.round(x - 5), Math.round(yy + 30), 10, 3)
      g.fillStyle = '#F7F7F2'
      g.fillRect(Math.round(x - u / 2), Math.round(yy), u, u)
      if (haut) { g.fillRect(Math.round(x - 3 * u), Math.round(yy - u), 2 * u, u); g.fillRect(Math.round(x + u), Math.round(yy - u), 2 * u, u) }
      else { g.fillRect(Math.round(x - 3 * u), Math.round(yy + u), 2 * u, u); g.fillRect(Math.round(x + u), Math.round(yy + u), 2 * u, u) }
      g.fillStyle = '#E8A33C'; g.fillRect(Math.round(x + (o.sens > 0 ? u : -u - 1)), Math.round(yy), 2, 2)
    }
  }
  // les images du ciel : lues une fois par île (le cache de l'API : 5 minutes), seulement pour les îles qu'on voit de près ;
  // CIEL_X, CIEL_Y : le milieu de la terre dans l'image (l'île 1, le pont, l'île 2 : 67, « l'emprise jusqu'à x 281 ») ;
  // CIEL_HAUT : le haut de sa terre (où se pose l'épingle)
  var CIEL_X = 200, CIEL_Y = 162, CIEL_HAUT = 95, ciels = {}, FILTRE = 'filter' in g
  function cielDe(x) {
    var k = x.i + ',' + x.j, c = ciels[k]
    if (c) return c.pret ? c.img : null
    c = ciels[k] = { img: new Image(), pret: false }
    c.img.decoding = 'async'
    c.img.onload = function () { c.pret = true; sale = true }
    c.img.onerror = function () { x.ciel = false }
    c.img.src = '/api/ile/' + Math.floor(x.i) + ',' + Math.floor(x.j) + '/ciel.png'
    return null
  }
  // LA FUMÉE d'une île où l'on joue : trois bouffées qui montent de la cheminée, grandissent et s'effacent (quelques carrés)
  function fumee(cx, cy, sc, ph) {
    for (var k = 0; k < 3; k++) {
      var age = ((t * 0.55 + ph + k / 3) % 1), tl = Math.max(2, Math.round(sc * (1 + age * 1.4)))
      g.fillStyle = 'rgba(225,228,235,' + (0.55 * (1 - age)).toFixed(2) + ')'
      g.fillRect(Math.round(cx - tl / 2 + Math.sin(age * 5 + ph) * sc * 0.8), Math.round(cy - age * sc * 7 - tl), tl, tl)
    }
  }
  // l'image d'une épingle : son ombre, son fond, sa pointe, la tête de l'hôte et ses étoiles ; gardée (refaite une fois quand la
  // tête arrive) ; au-delà de 800 gardées, on repart de zéro
  var epingles = {}, nbEpingles = 0
  function epingle(x, tt) {
    var et = Number(x.etoiles) > 0 ? etoilesTexte(x.etoiles) : '', cleE = x.hote + '|' + et + '|' + tt, deja = epingles[cleE]
    if (deja && (deja.t || !Tete.image(x.peau))) return deja.c
    if (!aLeTemps()) return deja ? deja.c : null
    var te = Tete.image(x.peau, deja ? null : function () { sale = true })
    var c = document.createElement('canvas'), k = c.getContext('2d')
    k.font = '700 10px Fredoka, system-ui, sans-serif'
    var w = et ? Math.ceil(k.measureText(et).width) + 6 : 0, lp = tt + 4 + w
    c.width = lp + 2; c.height = tt + 10
    k.imageSmoothingEnabled = false
    k.fillStyle = 'rgba(0,0,0,.35)'; k.fillRect(2, 2, lp, tt + 4)
    k.fillStyle = 'rgba(14,8,24,.82)'; k.fillRect(0, 0, lp, tt + 4)
    k.beginPath(); k.moveTo(lp / 2 - 4, tt + 4); k.lineTo(lp / 2 + 4, tt + 4); k.lineTo(lp / 2, tt + 8); k.closePath(); k.fill()
    if (te) k.drawImage(te, 2, 2, tt, tt)
    if (et) { k.font = '700 10px Fredoka, system-ui, sans-serif'; k.fillStyle = '#FFD75E'; k.textAlign = 'left'; k.textBaseline = 'middle'; k.fillText(et, tt + 6, tt / 2 + 3) }
    if (nbEpingles > 800) { epingles = {}; nbEpingles = 0 }
    if (!deja) nbEpingles++
    epingles[cleE] = { c: c, t: !!te }
    return c
  }
  function etiquette(t2, px, py, f, couleur) {
    var w = g.measureText(t2).width
    g.fillStyle = 'rgba(14, 8, 24, .72)'
    g.fillRect(Math.round(px - w / 2 - 4), Math.round(py - 1), Math.round(w + 8), f + 4)
    g.fillStyle = couleur
    g.fillText(t2, px, py + 1)
  }

  // ---------------------------------------------------------------- L'ÉTINCELLE d'un exploit : sur l'île du joueur, 4 s
  function etinceler(x) { if (!calme) etincelles.push({ i: x.i, j: x.j, t0: t }) }
  function dessinerEtincelles() {
    for (var k = etincelles.length - 1; k >= 0; k--) {
      var e = etincelles[k], age = t - e.t0
      if (age > 4) { etincelles.splice(k, 1); continue }
      var c = ecranI(e.i, e.j), r = Math.max(6, I.s * 0.5) * (0.6 + age * 0.35), al = 1 - age / 4
      for (var n = 0; n < 8; n++) {
        var an = n * Math.PI / 4 + age * 1.5, px = c[0] + Math.cos(an) * r, py = c[1] + Math.sin(an) * r * 0.8 - age * 6
        g.fillStyle = 'rgba(255,230,140,' + al.toFixed(2) + ')'
        var sz = n % 2 ? 2 : 3
        g.fillRect(Math.round(px) - 1, Math.round(py) - 1, sz, sz)
      }
    }
  }

  // ---------------------------------------------------------------- la mer
  function ecranM(x, z) { return [(x - M.cx) * M.s + L / 2, (z - M.cy) * M.s + H / 2] }
  function dessinerMer() {
    var o = ecranM(0, 0)
    fondMer(500 * M.s, o[0], o[1])
    houle()
    if (!lieux) return
    g.textAlign = 'center'; g.textBaseline = 'top'
    var k, l, e
    // les phares balaient : un pinceau de lumière qui tourne (la nuit, plus fort)
    if (!calme) for (k = 0; k < lieux.length; k++) {
      l = lieux[k]
      if (l.sorte !== 'phare') continue
      e = ecranM(l.x, l.z)
      var an = t * 0.9 + k, lg = 140, ouv = 0.22
      var gr = g.createRadialGradient(e[0], e[1], 4, e[0], e[1], lg)
      gr.addColorStop(0, amb.nuit ? 'rgba(255,230,150,0.35)' : 'rgba(255,240,190,0.18)'); gr.addColorStop(1, 'rgba(255,230,150,0)')
      g.fillStyle = gr
      g.beginPath(); g.moveTo(e[0], e[1]); g.arc(e[0], e[1], lg, an - ouv, an + ouv); g.closePath(); g.fill()
    }
    g.font = '600 13px Fredoka, system-ui, sans-serif'
    for (k = 0; k < lieux.length; k++) {
      l = lieux[k]; e = ecranM(l.x, l.z)
      if (e[0] < -80 || e[0] > L + 80 || e[1] < -40 || e[1] > H + 40) continue
      icone(l.sorte, e[0], e[1])
      if (M.s >= 0.07 || l.sorte === 'port') etiquette(l.nom, e[0], e[1] + 12, 13, l.sorte === 'repaire' ? '#FFB4A8' : '#fff')
    }
    if (!NAVIRES) return
    var f = Math.min(1, (Date.now() - releveDernier) / Math.max(1000, releveDernier - relevePrec || 10000))
    for (var p in navires) {
      var n = navires[p], x = n.ax + (n.x - n.ax) * f, z = n.az + (n.z - n.az) * f, en = ecranM(x, z)
      if (en[0] < -40 || en[0] > L + 40 || en[1] < -40 || en[1] > H + 40) continue
      navire(en[0], en[1], n.cap, n.en_combat, n.pseudo)
      if (M.s >= 0.09) etiquette(n.pseudo, en[0], en[1] + 11, 12, '#FFD75E')
    }
  }
  var FORMES = {
    port: ['..XX..', '..XX..', 'XXXXXX', '..XX..', 'X.XX.X', '.XXXX.'],
    phare: ['..YY..', '.YYYY.', '..XX..', '..RR..', '..XX..', '.XXXX.'],
    ile: ['..GG..', '.GGGG.', 'GGGGGG', 'SSSSSS', '.SSSS.', '......'],
    epave: ['...X..', '..XX..', '.X.X..', 'XXXXXX', '.XXXX.', '......'],
    recif: ['R...R.', 'RR.RR.', '.RRR..', '..R...', '.RRR..', '......'],
    repaire: ['.XXXX.', 'X.XX.X', 'XXXXXX', '.X..X.', '.XXXX.', 'X....X']
  }
  var TEINTES = { X: '#F4EAFF', Y: '#FFD75E', R: '#E8604C', G: '#6CC04A', S: '#E3CF8E' }
  function icone(sorte, px, py) {
    var f = FORMES[sorte] || FORMES.ile, u = 3, a = Math.round(px - 9), b = Math.round(py - 9)
    g.fillStyle = 'rgba(14,8,24,.6)'
    g.fillRect(a - 2, b - 2, 22, 22)
    for (var y = 0; y < 6; y++) for (var x = 0; x < 6; x++) {
      var c = f[y][x]
      if (c === '.') continue
      g.fillStyle = sorte === 'repaire' && c === 'X' ? '#FFB4A8' : TEINTES[c]
      g.fillRect(a + x * u, b + y * u, u, u)
    }
  }
  // un navire : sa coque qui tangue un peu, et son SILLAGE (deux traînées qui s'ouvrent et s'effacent derrière lui)
  function navire(px, py, cap, combat, pseudo) {
    var r = cap * Math.PI / 180, tangue = calme ? 0 : Math.sin(t * 2 + pseudo.length) * 0.06
    g.save()
    g.translate(px, py)
    g.rotate(r + tangue)
    if (!calme) {
      for (var k = 1; k <= 4; k++) {
        g.fillStyle = 'rgba(230,245,255,' + (0.32 - k * 0.07).toFixed(2) + ')'
        var dz = 6 + k * 5, ec = 2 + k * 2.2
        g.fillRect(-ec - 1, dz, 2, 2); g.fillRect(ec - 1, dz, 2, 2)
      }
    }
    g.fillStyle = combat ? '#E8604C' : '#FFD75E'
    g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 6); g.lineTo(0, 3); g.lineTo(-6, 6); g.closePath(); g.fill()
    g.strokeStyle = 'rgba(14,8,24,.8)'; g.lineWidth = 1.5; g.stroke()
    g.restore()
  }
  function chargerMer() {
    if (lieux) { sale = true; return }
    ecrire('La mer se charge...')
    V.carte('mer').then(function (r) {
      if (r.statut !== 200) { ecrire('La mer ne répond pas pour l\'instant.'); return }
      lieux = r.corps.lieux || []
      cadrerMer(); ecrire(''); sale = true
    })
  }
  function cadrerMer() {
    if (!lieux || !lieux.length) return
    var x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9
    for (var k = 0; k < lieux.length; k++) { x0 = Math.min(x0, lieux[k].x); x1 = Math.max(x1, lieux[k].x); z0 = Math.min(z0, lieux[k].z); z1 = Math.max(z1, lieux[k].z) }
    M.cx = (x0 + x1) / 2; M.cy = (z0 + z1) / 2
    M.s = Math.max(MER_MIN, Math.min(MER_MAX, Math.min((L - 160) / Math.max(1, x1 - x0), (H - 120) / Math.max(1, z1 - z0))))
  }
  function relireNavires() {
    if (!NAVIRES || zone !== 'mer' || document.hidden) return
    V.navires().then(function (r) {
      if (r.statut !== 200) return
      var tl = Date.now(), vus = {}, l = r.corps.navires || []
      for (var k = 0; k < l.length; k++) {
        var n = l[k], avant = navires[n.pseudo], ax = n.x, az = n.z
        vus[n.pseudo] = 1
        if (avant) { var f = Math.min(1, (tl - releveDernier) / Math.max(1000, releveDernier - relevePrec || 10000)); ax = avant.ax + (avant.x - avant.ax) * f; az = avant.az + (avant.z - avant.az) * f }
        navires[n.pseudo] = { pseudo: n.pseudo, x: n.x, z: n.z, ax: ax, az: az, cap: n.cap, en_combat: n.en_combat }
      }
      for (var p in navires) if (!vus[p]) delete navires[p]
      relevePrec = releveDernier || tl - 10000; releveDernier = tl
      sale = true
    })
  }

  // ---------------------------------------------------------------- la fiche d'une île, d'une place libre
  function caseSous(mx, my) { return { i: Math.round(I.cx + (mx - L / 2) / I.s), j: Math.round(I.cy + (my - H / 2) / I.s) } }
  function trouverSous(mx, my) {
    if (zone !== 'iles') return null
    var c = caseSous(mx, my), p = paves[cle(Math.floor(c.i / PAVE), Math.floor(c.j / PAVE))]
    if (!p) return null
    var e = ecranI(c.i, c.j), r = Math.max(7, I.s * .45)
    if (Math.abs(e[0] - mx) > r || Math.abs(e[1] - my) > r) return null
    return p.occ[c.i + ',' + c.j] || null
  }
  // une place libre sous le pointeur : dans l'étendue, son pavé lu, sans île
  function libreSous(mx, my) {
    if (zone !== 'iles' || !etendue || I.s < 16) return null
    var c = caseSous(mx, my), p = paves[cle(Math.floor(c.i / PAVE), Math.floor(c.j / PAVE))]
    if (!p || p.occ[c.i + ',' + c.j]) return null
    if (c.i < etendue.de[0] || c.i > etendue.a[0] || c.j < etendue.de[1] || c.j > etendue.a[1]) return null
    return c
  }
  function etoilesHtml(e) {
    var n = niveauEtoiles(e), s = ''
    for (var k = 0; k < 5; k++) s += '<span class="etoile' + (k < n ? ' pleine' : '') + '" aria-hidden="true">★</span>'
    return '<span class="etoiles" role="img" aria-label="' + etoilesTexte(e).replace('★ ', '') + ' étoiles sur 5">' + s + '</span> <b class="etoiles-nb">' + etoilesTexte(e).replace('★ ', '') + '</b>'
  }
  // le nom que le jeu donne à une île neuve : « Île de <hôte> » ou « Île d'<hôte> » (devant une voyelle)
  // (la tête, l'audit du site : « Île de Aviteur ») L'ÉLISION comme le jeu (ciDeNom, aa_casino_partage.js) : « d' » devant une
  // voyelle, le Y selon la lettre qui le suit (« d'Yves », « de Yann »), « de » devant une consonne ou un h
  var VOYELLES = 'aeiouyàâäéèêëîïôöùûüAEIOUYÀÂÄÉÈÊËÎÏÔÖÙÛÜ'
  function deDevant(nom) {
    var n = String(nom === undefined || nom === null ? '' : nom), c = n.charAt(0), s = n.charAt(1)
    if (c === 'y' || c === 'Y') return s !== '' && VOYELLES.indexOf(s) !== -1 ? 'de ' : 'd\''
    return n && VOYELLES.indexOf(c) !== -1 ? 'd\'' : 'de '
  }
  function nomDuJeu(x) { var n = String(x.nom || ''), h = String(x.hote || ''); return !n || n === 'Île ' + deDevant(h) + h || n === 'Île de ' + h || n === 'Île d\'' + h || n === 'Île d’' + h }
  // (af, 22:5x) au téléphone, la fiche monte du bas de la carte : l'île montrée se pose au tiers du haut, au-dessus d'elle
  function sousLaFiche() { return L < 600 ? H * 0.2 / I.s : 0 }
  function echapper(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] }) }
  function montrer(x, centrer) {
    choisie = x; libreChoisie = null; sale = true
    if (!x) { fiche.hidden = true; history.replaceState(null, '', location.pathname + location.search); return }
    if (centrer) { finirIntro(); if (I.s < 50) I.s = 60; I.cx = x.i; I.cy = x.j + sousLaFiche(); plusTard() }
    var profil = 'joueur/' + encodeURIComponent(x.hote)
    var cl = x.classement ? '<li>' + rangN(x.classement.rang) + ' au Classement des îles · ' + A.nombre(x.classement.points) + '&nbsp;/&nbsp;' + A.nombre(x.classement.sur) + ' points</li>' : ''
    // (af, 22:4x ; le propriétaire : « Île de X » deux fois) le nom donné par le jeu dit déjà l'hôte : la ligne de l'hôte ne
    // s'écrit que pour une île au nom à elle
    ficheCorps.innerHTML =
      '<div class="fiche-haut"><span class="fiche-tete" id="fiche-tete"></span><div><h2>' + echapper(x.nom) + '</h2>' +
      (nomDuJeu(x) ? '' : '<p class="hote">L\'île ' + deDevant(x.hote) + '<a href="' + profil + '">' + echapper(x.hote) + '</a></p>') + '</div></div>' +
      '<p>' + etoilesHtml(x.etoiles) + '</p>' +
      '<ul class="fiche-faits">' + cl +
      '<li>' + (x.amis ? 'Avec ' + x.amis + ' ami' + (x.amis > 1 ? 's' : '') + ' sur l\'île' : 'Son hôte y vit seul') + '</li>' +
      '<li>' + (x.ouverte ? '<b class="ouverte">Ouverte aux visites</b>' : 'Fermée aux visites') + '</li>' +
      (x.en_ligne > 0 ? '<li class="vivante">' + x.en_ligne + ' joueur' + (x.en_ligne > 1 ? 's' : '') + ' dessus en ce moment</li>' : '') +
      '</ul><p class="fiche-gestes"><a class="bouton bouton-or petit" href="ile/' + x.i + ',' + x.j + '">La voir en 3D</a><a class="bouton bouton-bois petit" href="' + profil + '">Son profil</a></p>'
    Tete.poser(document.getElementById('fiche-tete'), x.peau)
    fiche.hidden = false
    history.replaceState(null, '', '#ile=' + x.i + ',' + x.j)
  }
  // une place libre : l'envie d'y être
  function montrerLibre(c) {
    choisie = null; libreChoisie = c; sale = true
    ficheCorps.innerHTML = '<div class="fiche-libre"><h2>Cette place est libre</h2>' +
      '<p>Une île de 184 sur 112 blocs, rien qu\'à toi, avec ses machines, ses bêtes et ses amis. La prochaine île de Casteria peut être la tienne.</p>' +
      '<a class="bouton bouton-or" href="./#telecharger">Jouer gratuitement</a>' +
      '<p class="petit">Le launcher installe tout. En jeu : <b>/ile</b>.</p></div>'
    fiche.hidden = false
  }
  document.getElementById('fiche-fermer').addEventListener('click', function () { montrer(null); libreChoisie = null })

  // ---------------------------------------------------------------- les gestes : glisser, zoomer, cliquer
  var doigts = {}, depart = null, bouge = false
  function vueDe() { return zone === 'iles' ? I : M }
  function zoomer(f, mx, my) {
    finirIntro()
    var v = vueDe(), min = zone === 'iles' ? ZOOM_MIN : MER_MIN, max = zone === 'iles' ? ZOOM_MAX : MER_MAX
    var s = Math.max(min, Math.min(max, v.s * f))
    if (mx == null) { mx = L / 2; my = H / 2 }
    var wx = v.cx + (mx - L / 2) / v.s, wy = v.cy + (my - H / 2) / v.s
    v.s = s; v.cx = wx - (mx - L / 2) / s; v.cy = wy - (my - H / 2) / s
    sale = true; plusTard()
  }
  function pos(e) { var r = toile.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] }
  toile.addEventListener('pointerdown', function (e) {
    finirIntro()
    toile.setPointerCapture(e.pointerId)
    doigts[e.pointerId] = pos(e)
    var ids = Object.keys(doigts)
    if (ids.length === 1) { depart = { p: pos(e), cx: vueDe().cx, cy: vueDe().cy }; bouge = false }
    else if (ids.length === 2) { var a = doigts[ids[0]], b = doigts[ids[1]]; depart = { ecart: Math.hypot(a[0] - b[0], a[1] - b[1]), s: vueDe().s }; bouge = true }
  })
  toile.addEventListener('pointermove', function (e) {
    var p = pos(e)
    if (!doigts[e.pointerId]) { survoler(p); return }
    doigts[e.pointerId] = p
    var ids = Object.keys(doigts), v = vueDe()
    if (ids.length === 1 && depart && depart.p) {
      var dx = p[0] - depart.p[0], dy = p[1] - depart.p[1]
      if (Math.abs(dx) + Math.abs(dy) > 4) bouge = true
      v.cx = depart.cx - dx / v.s; v.cy = depart.cy - dy / v.s
      sale = true; plusTard()
    } else if (ids.length === 2 && depart && depart.ecart) {
      var a = doigts[ids[0]], b = doigts[ids[1]], ecart = Math.hypot(a[0] - b[0], a[1] - b[1])
      zoomer(depart.s * ecart / depart.ecart / v.s, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
    }
  })
  function lacher(e) {
    var p = doigts[e.pointerId]
    delete doigts[e.pointerId]
    if (!Object.keys(doigts).length) {
      if (!bouge && p && e.type === 'pointerup') {
        var x = trouverSous(p[0], p[1])
        if (x) montrer(x, false)
        else { var lb = libreSous(p[0], p[1]); if (lb) montrerLibre(lb); else if (zone === 'iles') { montrer(null); libreChoisie = null } }
      }
      depart = null
    } else depart = null
  }
  toile.addEventListener('pointerup', lacher)
  toile.addEventListener('pointercancel', lacher)
  toile.addEventListener('wheel', function (e) { e.preventDefault(); var p = pos(e); zoomer(Math.pow(1.0015, -e.deltaY), p[0], p[1]) }, { passive: false })
  function survoler(p) {
    var x = trouverSous(p[0], p[1]), lb = x ? null : libreSous(p[0], p[1])
    toile.style.cursor = x || lb ? 'pointer' : 'grab'
    var changeLibre = (lb ? lb.i + ',' + lb.j : '') !== (survolLibre ? survolLibre.i + ',' + survolLibre.j : '')
    survolLibre = lb
    if (changeLibre) sale = true
    if (x === survolee) return
    survolee = x
    if (!x || I.s >= 110) { bulle.hidden = true; return }
    bulle.textContent = x.nom + ' · ' + x.hote + ' · ' + etoilesTexte(x.etoiles)
    bulle.style.left = Math.round(p[0]) + 'px'; bulle.style.top = Math.round(p[1]) + 'px'
    bulle.hidden = false
  }
  toile.addEventListener('pointerleave', function () { bulle.hidden = true; survolee = null; if (survolLibre) { survolLibre = null; sale = true } })
  document.getElementById('zoom-plus').addEventListener('click', function () { zoomer(1.6) })
  document.getElementById('zoom-moins').addEventListener('click', function () { zoomer(1 / 1.6) })
  document.getElementById('zoom-centre').addEventListener('click', function () { finirIntro(); var v = vueDe(); if (zone === 'mer') cadrerMer(); else if (etendue) cadrerIles(); else { v.cx = 0; v.cy = 0; v.s = DEPART_S } sale = true; plusTard() })
  vue.addEventListener('keydown', function (e) {
    finirIntro()
    var v = vueDe(), pas = 60 / v.s, k = e.key
    if (k === 'ArrowLeft') v.cx -= pas; else if (k === 'ArrowRight') v.cx += pas
    else if (k === 'ArrowUp') v.cy -= pas; else if (k === 'ArrowDown') v.cy += pas
    else if (k === '+' || k === '=') { zoomer(1.4); return } else if (k === '-') { zoomer(1 / 1.4); return }
    else if (k === 'Escape') { montrer(null); return } else return
    e.preventDefault(); sale = true; plusTard()
  })

  // ---------------------------------------------------------------- trouver l'île d'un joueur
  function ileDe(pseudo) {
    var b = String(pseudo).toLowerCase()
    if (ilesDe[b]) return Promise.resolve(ilesDe[b])
    return V.carte('iles', { hote: pseudo }).then(function (r) { var x = r.statut === 200 && r.corps.iles && r.corps.iles[0]; if (x) ilesDe[b] = x; return x || null })
  }
  document.getElementById('trouver').addEventListener('submit', function (e) {
    e.preventDefault()
    var p = String(document.getElementById('trouver-pseudo').value || '').trim()
    if (!A.PSEUDO.test(p)) { ecrire('Un pseudo, de 3 à 16 lettres, chiffres ou « _ ».'); return }
    if (zone !== 'iles') choisirZone('iles')
    ecrire('On cherche l\'île de ' + p + '...')
    ileDe(p).then(function (x) { if (!x) { ecrire(p + ' n\'a pas d\'île à son nom.'); return } ecrire(''); montrer(x, true) })
  })

  // ---------------------------------------------------------------- les exploits : l'étincelle et la ligne du fil
  var dernierExploit = 0
  function direExploit(x) {
    if (!fil) return
    var a = document.createElement('a')
    a.className = 'fil-ligne'
    a.href = 'joueur/' + encodeURIComponent(x.pseudo)
    a.textContent = '✦ ' + A.texte(x.texte)
    fil.insertBefore(a, fil.firstChild)
    while (fil.children.length > 3) fil.removeChild(fil.lastChild)
  }
  function exploitsNeufs(liste, premier) {
    for (var k = liste.length - 1; k >= 0; k--) {
      var x = liste[k]
      if (x.id <= dernierExploit) continue
      dernierExploit = Math.max(dernierExploit, x.id)
      if (premier && k > 2) continue
      direExploit(x)
      ;(function (xx) { ileDe(xx.pseudo).then(function (il) { if (il) { etinceler(il); sale = true } }) })(x)
    }
  }
  function lireExploits() {
    if (document.hidden) return
    V.exploits(dernierExploit ? { depuis: dernierExploit, n: 10 } : { n: 10 }).then(function (r) { if (r.statut === 200) exploitsNeufs(r.corps.exploits || [], !dernierExploit) })
  }

  // ---------------------------------------------------------------- les onglets
  function choisirZone(z) {
    finirIntro()
    zone = z
    var bs = document.querySelectorAll('.onglet')
    for (var k = 0; k < bs.length; k++) bs[k].setAttribute('aria-selected', bs[k].dataset.zone === z ? 'true' : 'false')
    document.getElementById('legende-iles').hidden = z !== 'iles'
    document.getElementById('legende-mer').hidden = z !== 'mer'
    vue.setAttribute('aria-label', z === 'iles' ? 'La carte des îles : glisse pour te déplacer, la molette ou deux doigts pour zoomer' : 'La carte de la mer : glisse pour te déplacer, la molette ou deux doigts pour zoomer')
    fiche.hidden = true; bulle.hidden = true; choisie = null; libreChoisie = null
    if (z === 'mer') { chargerMer(); relireNavires() } else plusTard()
    dire(); sale = true
  }
  var bts = document.querySelectorAll('.onglet')
  for (var kb = 0; kb < bts.length; kb++) bts[kb].addEventListener('click', function () { choisirZone(this.dataset.zone) })
  if (NAVIRES) { var si = document.querySelector('.si-navires'); if (si) si.hidden = false }
  // (af, 22:4x) LA LÉGENDE DES ÎLES DESSINÉE : chaque pastille devient une petite île comme sur la carte (son fanion, ses fleurs,
  // son ponton ; celle où l'on joue, sa lueur d'or)
  if (P.grande) [].forEach.call(document.querySelectorAll('#legende-iles .pastille'), function (el) {
    var m = null
    for (var ke = 0; ke <= 5; ke++) if (el.classList.contains('e' + ke)) m = [0, ke]
    var et = m ? m[1] : (el.classList.contains('ponton') ? 2 : (el.classList.contains('vivante') ? 3 : -1))
    if (et < 0) return
    var c = document.createElement('canvas')
    c.width = 20; c.height = 20; c.className = 'pastille-dessin' + (el.classList.contains('vivante') ? ' vivante' : ''); c.setAttribute('aria-hidden', 'true')
    c.getContext('2d').drawImage(P.grande(m ? 1 : 3, m ? 2 : 0, et, el.classList.contains('ponton')), 0, 0)
    el.replaceWith(c)
  })
  ;[].forEach.call(document.querySelectorAll('#legende-mer .lieu-icone'), function (el) {
    var sorte = ['port', 'phare', 'ile', 'epave', 'recif', 'repaire'].filter(function (x) { return el.classList.contains(x) })[0]
    if (!sorte) return
    var c = document.createElement('canvas'), garde = g
    c.width = 22; c.height = 22; c.className = 'lieu-icone-dessin'; c.setAttribute('aria-hidden', 'true')
    g = c.getContext('2d'); icone(sorte, 11, 11); g = garde
    el.replaceWith(c)
  })

  // ---------------------------------------------------------------- la boucle : 60 images par seconde quand ça bouge,
  // rien quand la carte est hors de l'écran ou l'onglet caché ; immobile (prefers-reduced-motion) : seulement ce qui change
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; sale = true }).observe(vue)
  var tPrec = 0
  function boucle(maint) {
    requestAnimationFrame(boucle)
    if (!visible || document.hidden) return
    t = maint / 1000
    var anime = !calme && !mesure
    avancerIntro(maint)
    if (!anime && !sale && !(intro && !intro.fini) && !etincelles.length) return
    sale = false
    debutImage = performance.now()
    dessiner(maint)
    tPrec = maint
  }
  window.addEventListener('resize', taille)
  setInterval(relireNavires, 10000)
  setInterval(function () { if (zone === 'iles' && !document.hidden) plusTard() }, VIE_PAVE)
  setInterval(lireExploits, 30000)
  setInterval(function () { ambiance(); sale = true }, 60000)
  taille(); dire()
  var m = location.hash.match(/^#ile=(-?\d+),(-?\d+)$/)
  if (m) {
    intro = { fini: true }
    // (af, 22:5x) venu d'un lien vers une île (l'accueil, un profil) : la page descend tout de suite sur la carte, sous la grande image
    var sec = document.getElementById('carte'); if (sec && sec.scrollIntoView) sec.scrollIntoView()
    I.s = 60; I.cx = +m[1]; I.cy = +m[2] + sousLaFiche()
    V.carte('iles', { de: [+m[1], +m[2]], a: [+m[1], +m[2]] }).then(function (r) { if (r.statut === 200 && r.corps.iles && r.corps.iles[0]) montrer(r.corps.iles[0], false) })
  } else if (location.hash === '#mer') { intro = { fini: true }; choisirZone('mer') }
  lireExploits()
  requestAnimationFrame(boucle)

  // LA MESURE (essai seulement, carte.html?mesure) : le temps d'une image, animations comprises, de loin et de près
  if (A.essai && mesure) setTimeout(function mesurer() {
    if (enCours || !total) { setTimeout(mesurer, 300); return }
    var res = []
    ;[[ZOOM_MIN, 'de loin'], [26, 'les îles dessinées'], [60, 'avec les têtes']].forEach(function (z) {
      I.s = z[0]; I.cx = 0; I.cy = 0
      // (af, 23:2x) la première image (elle fabrique les îles uniques de la vue pendant ses 4 premières ms), puis le régime
      var t1 = performance.now()
      debutImage = performance.now(); dessiner(t1)
      var premiere = performance.now() - t1
      var t0 = performance.now(), n = 60
      for (var k = 0; k < n; k++) { t += 1 / 60; I.cx += 0.01; debutImage = performance.now(); dessiner(t0) }
      res.push(z[1] + ' : ' + String(Math.round((performance.now() - t0) / n * 10) / 10).replace('.', ',') + ' ms (la première ' + String(Math.round(premiere * 10) / 10).replace('.', ',') + ')')
    })
    // le prix d'une île unique neuve (100 îles jamais vues)
    var tu = performance.now()
    for (var ku = 0; P.unique && ku < 100; ku++) P.unique({ i: 9000 + ku, j: 9000, hote: 'mesure' + ku, etoiles: ku % 6, amis: ku % 4, ouverte: ku % 2 === 0 })
    res.push('une île unique : ' + String(Math.round((performance.now() - tu) / 100 * 100) / 100).replace('.', ',') + ' ms')
    var nb = 0
    for (var c in paves) nb += paves[c].iles.length
    ecrire(nb + ' îles lues ; une image ' + res.join(', '))
    etat.dataset.mesure = '1'
  }, 4000)
  window.__carte = { I: I, M: M, zone: function (z) { choisirZone(z) } }
})()
