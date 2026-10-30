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
  // (2c, 30/10) la mer vue du ciel : l'onglet et « #mer » (false : ni l'un ni l'autre, son code jamais appelé)
  var MER_OUVERTE = true
  var NAVIRES = true        // (2c, 30/10) les navires des joueurs, en direct (/api/navires répond, vide ou non)
  var PAVE = 16, VIE_PAVE = 120000, ATTENTE = 220
  var ZOOM_MIN = 2.5, ZOOM_MAX = 140, MER_MIN = 0.03, MER_MAX = 8, DEPART_S = 26
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
      : 'La mer de Casteria : plus tu t\'éloignes du palais, plus les pirates sont forts et les cargaisons riches. Touche une zone ou un lieu pour sa fiche. Les navires des joueurs, toutes les 10 secondes.'
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
      var bc = ciels[x.i + ',' + x.j].boite || { cx: CIEL_X, cy: CIEL_Y, haut: CIEL_HAUT, large: 200 }
      var tc = Math.round(s * Math.min(1.45, 1.25 * 320 / bc.large)), cx0 = Math.round(px - tc * (bc.cx / 320 - 0.5)), cy0 = Math.round(py - tc * (bc.cy / 320 - 0.5) + berce)
      // un peu plus vive que le rendu brut, pour tenir à côté des îles dessinées (le filtre : là où le navigateur le sait)
      g.imageSmoothingEnabled = true
      if (FILTRE) g.filter = 'saturate(1.3) brightness(1.12)'
      g.drawImage(vc, Math.round(cx0 - tc / 2), Math.round(cy0 - tc / 2), tc, tc)
      if (FILTRE) g.filter = 'none'
      g.imageSmoothingEnabled = false
      if (!tout) return
      var ttc = Math.round(s * .12) * 2, epc = epingle(x, ttc), sommetC = cy0 - tc / 2 + tc * bc.haut / 320
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
  // la terre de chaque image est lue à sa lecture (IlePixel.boiteCiel : son milieu, son haut, sa largeur) ; CIEL_X, CIEL_Y,
  // CIEL_HAUT : ceux d'une île neuve (l'île 1, le pont, l'île 2), si la lecture échoue
  var CIEL_X = 200, CIEL_Y = 162, CIEL_HAUT = 95, ciels = {}, FILTRE = 'filter' in g
  function cielDe(x) {
    var k = x.i + ',' + x.j, c = ciels[k]
    if (c) return c.pret ? c.img : null
    c = ciels[k] = { img: new Image(), pret: false }
    c.img.decoding = 'async'
    c.img.onload = function () { c.boite = P.boiteCiel ? P.boiteCiel(c.img) : null; c.pret = true; sale = true }
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
    // (2c) jamais coupé au bord du cadre : le nom glisse vers l'intérieur
    if (w + 12 < L) px = Math.max(w / 2 + 6, Math.min(L - w / 2 - 6, px))
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

  // ---------------------------------------------------------------- LA MER (2c, 30/10/2026 ; le propriétaire : « je comprends
  // pas c'est quoi, y'a juste des phares ? », puis « fais toute la carte de la mer ») : on la comprend au premier regard.
  // LES ZONES sont des BANDES autour de la ligne (le mur du palais : la boîte de la ligne), comme le jeu les compte
  // (casinomer Carte.distanceLigne) : la Rade, les Hauts-Fonds, le Large, la Mer Noire, les Abysses, coupées par le disque de la
  // mer ; chacune son nom, son niveau et ses lieux à découvrir. LA FOSSE AUX CORSAIRES (le combat entre joueurs) : son secteur,
  // vu de (0, 0) (Carte.dansFosse), et ses récifs (son terrain). LE PALAIS de haut, ses murs, le port et ses quais. LES LIEUX DE
  // L'ATLAS à leur place (phares, îles, épaves, ruines). LES NAVIRES des joueurs (/api/navires, toutes les 10 s), et dès que le
  // jeu les publie, LES PIRATES et LES ÉVÉNEMENTS en mer. Un clic : la fiche d'un lieu ou d'une zone.
  // La forme vient de l'API (/api/carte?zone=mer : ligne, rayon, zones, port, atlas) ; tant qu'elle ne la donne pas : MER_DEFAUT,
  // les valeurs du jeu (ai_mer_table.js, reglages.mer ; Carte.java, BOITE_*), jamais une autre forme.
  var MER_DEFAUT = { ligne: { xMin: -55, xMax: 245, zMin: -143, zMax: 157 }, rayon: 5000, rade: 150,
    fosse: { id: 'fosse', nom: 'La Fosse aux Corsaires', de: 700, a: 1900, cap: 90, largeur: 38, niveau: 25, pvp: true, terrain: { de: 700, a: 1200, largeur: 30 } } }
  var mer = null       // { ligne, rayon, anneaux (rangés par a), rade, fosse, port, lieux, atlas, parZone }
  var pirates = [], evenements = []
  var ZONES_TEINTES = { rade: '#3C9BCB', hauts_fonds: '#2373AA', large: '#164F7E', mer_noire: '#0D3157', abysses: '#061A33' }
  var GENRES = { phare: 'Phare', ile: 'Île sauvage', epave: 'Épave', ruine: 'Ruine', port: 'Port', repaire: 'Repaire de pirates', recif: 'Récif' }

  // ---------- LA MER VUE DU CIEL (2c, 30/10 ; le propriétaire : « vraiment vue du dessus, magnifique, comme les îles ») ----------
  // assets/mer/decor.json : CHAQUE lieu posé par le jeu (le vrai Decor.java de casteria-mer, joué hors du jeu : 433 lieux, les 40 de
  // l'Atlas à leur bloc près), son gabarit et son quart de tour ; les images rendues de leurs blocs (gabarits.png, un pixel par bloc),
  // du palais et du port (palais.png, les régions du monde de spawn) et des navires vus du dessus (navires.png, leurs modèles).
  // De loin : une image de toute la mer faite UNE fois (DECOR_LOIN blocs par pixel) ; de près : les images à l'écran seulement.
  var DECOR_LOIN = 6, DECOR_PRES = 0.12
  // (2c, la tête : « à l'ouverture, les lieux de l'Atlas sont des miettes ») un lieu de l'Atlas n'est jamais plus petit que LIEU_MIN
  // pixels à l'écran : son image agrandie telle quelle (sa forme de près ne change pas ; au-delà, sa vraie taille)
  var LIEU_MIN = 26
  var decor = null      // { gab: [{ px, py, w, h, c }], lieux: [[g, x, z, rot]], palais: { x, z, l, h }, nav: { echelle, n }, img: {}, loin }
  function chargerDecor() {
    if (decor) return
    decor = { pret: false, img: {} }
    var n = 0, fin = function () { if (++n === 4) { faireLoin(); decor.pret = true; sale = true } }
    fetch('assets/mer/decor.json').then(function (r) { return r.json() }).then(function (j) {
      decor.gab = j.gabarits.map(function (g) { return { px: g[1], py: g[2], w: g[3], h: g[4], c: g[5] } })
      decor.lieux = j.lieux; decor.palais = j.palais; decor.nav = j.navires
      decor.atlas = null
      fin()
    }).catch(function () { decor = null })
    ;['gabarits', 'palais', 'navires'].forEach(function (k) {
      var im = new Image()
      im.onload = fin
      im.onerror = function () { decor = null }
      im.src = 'assets/mer/' + k + '.png'
      decor.img[k] = im
    })
  }
  // un lieu à sa place : le centre de son bloc central en (0, 0), tourné de rot quarts de tour (StructureTemplate, autour du centre)
  function poserLieu(c, l, s) {
    var gb = decor.gab[l[0]]
    c.save()
    c.translate(l[1] + 0.5, l[2] + 0.5)
    if (l[3] & 3) c.rotate((l[3] & 3) * Math.PI / 2)
    c.drawImage(decor.img.gabarits, gb.px, gb.py, gb.w, gb.h, -gb.c - 0.5, -gb.c - 0.5, gb.w, gb.h)
    c.restore()
  }
  function faireLoin() {
    var R = mer ? mer.rayon : 5000, n = Math.ceil(2 * R / DECOR_LOIN), cv = document.createElement('canvas')
    cv.width = n; cv.height = n
    var c = cv.getContext('2d')
    c.imageSmoothingEnabled = true
    c.setTransform(1 / DECOR_LOIN, 0, 0, 1 / DECOR_LOIN, R / DECOR_LOIN, R / DECOR_LOIN)
    for (var k = 0; k < decor.lieux.length; k++) poserLieu(c, decor.lieux[k])
    var P = decor.palais
    c.drawImage(decor.img.palais, P.x, P.z, P.l, P.h)
    decor.loin = cv; decor.R = R
  }
  // les lieux de l'Atlas parmi ceux du décor (la même place au bloc près), une fois
  function lieuxAtlas() {
    if (decor.atlas) return decor.atlas
    var par = {}, k, l = []
    for (k = 0; k < decor.lieux.length; k++) par[decor.lieux[k][1] + ',' + decor.lieux[k][2]] = k
    for (k = 0; mer && k < mer.atlas.length; k++) { var i = par[mer.atlas[k].x + ',' + mer.atlas[k].z]; if (i !== undefined) l.push(i) }
    decor.atlas = l
    return l
  }
  function atlasLisible() {
    var l = lieuxAtlas(), k
    for (k = 0; k < l.length; k++) {
      var d = decor.lieux[l[k]], gb = decor.gab[d[0]], vrai = gb.w * M.s
      if (vrai >= LIEU_MIN) continue
      var e = ecranM(d[1] + 0.5, d[2] + 0.5)
      if (e[0] < -LIEU_MIN || e[0] > L + LIEU_MIN || e[1] < -LIEU_MIN || e[1] > H + LIEU_MIN) continue
      var q = LIEU_MIN / gb.w
      g.save()
      g.translate(e[0], e[1])
      if (d[3] & 3) g.rotate((d[3] & 3) * Math.PI / 2)
      g.scale(q, q)
      g.imageSmoothingEnabled = q < 1
      g.drawImage(decor.img.gabarits, gb.px, gb.py, gb.w, gb.h, -gb.c - 0.5, -gb.c - 0.5, gb.w, gb.h)
      g.restore()
    }
    g.imageSmoothingEnabled = false
  }
  function dessinerDecor() {
    if (!decor || !decor.pret) return
    if (M.s < 0.25) {
      var o = ecranM(-decor.R, -decor.R)
      g.imageSmoothingEnabled = true
      g.drawImage(decor.loin, o[0], o[1], 2 * decor.R * M.s, 2 * decor.R * M.s)
      g.imageSmoothingEnabled = false
      atlasLisible()
      return
    }
    // (2c, la tête : « de près c'est flou ») le pixel NET dès un pixel par bloc ; en dessous, lissé (une image réduite ne scintille pas)
    g.imageSmoothingEnabled = M.s < 1
    var w0 = monde(-60, -60), w1 = monde(L + 60, H + 60)
    g.save()
    g.setTransform(dpr * M.s, 0, 0, dpr * M.s, dpr * (L / 2 - M.cx * M.s), dpr * (H / 2 - M.cy * M.s))
    for (var k = 0; k < decor.lieux.length; k++) {
      var l = decor.lieux[k]
      if (l[1] < w0[0] - 40 || l[1] > w1[0] + 40 || l[2] < w0[1] - 40 || l[2] > w1[1] + 40) continue
      poserLieu(g, l)
    }
    var P = decor.palais
    if (P.x < w1[0] && P.x + P.l > w0[0] && P.z < w1[1] && P.z + P.h > w0[1]) g.drawImage(decor.img.palais, P.x, P.z, P.l, P.h)
    g.restore()
    g.imageSmoothingEnabled = false
    atlasLisible()
  }
  // L'EAU DE PRÈS : une texture d'eau dessinée ici (aucune image du jeu), un pixel par bloc, qui coule lentement vers le sud-est
  var eauTuile = null
  function tuileEau() {
    // 64 blocs de côté : de petits reflets épars (deux à quatre pixels en biais, comme l'eau du jeu vue d'en haut) et quelques
    // creux plus sombres, posés au hasard (une graine fixe) : aucune forme qui se répète à l'œil
    var cv = document.createElement('canvas'), n = 64
    cv.width = n; cv.height = n
    var c = cv.getContext('2d'), graine = 11
    var hasard = function () { graine = (graine * 16807) % 2147483647; return graine / 2147483647 }
    for (var k = 0; k < 150; k++) {
      var x = Math.floor(hasard() * n), y = Math.floor(hasard() * n), lg = 2 + Math.floor(hasard() * 3), clair = hasard() < 0.72
      c.fillStyle = clair ? 'rgba(225,244,255,' + (0.28 + hasard() * 0.3).toFixed(2) + ')' : 'rgba(0,20,60,.22)'
      for (var j = 0; j < lg; j++) c.fillRect((x + j) % n, (y + (j >> 1)) % n, 1, 1)
    }
    return g.createPattern(cv, 'repeat')
  }
  function eauDePres() {
    if (M.s < 1.2) return
    if (!eauTuile) eauTuile = tuileEau()
    var w0 = monde(0, 0), w1 = monde(L, H), d = calme ? 0 : (t * 0.6) % 64
    g.save()
    g.globalAlpha = Math.min(0.75, (M.s - 1.2) * 0.25 + 0.2)
    g.setTransform(dpr * M.s, 0, 0, dpr * M.s, dpr * (L / 2 - M.cx * M.s), dpr * (H / 2 - M.cy * M.s))
    g.translate(d, d)
    g.fillStyle = eauTuile
    g.fillRect(Math.floor(w0[0] - 66), Math.floor(w0[1] - 66), Math.ceil(w1[0] - w0[0]) + 132, Math.ceil(w1[1] - w0[1]) + 132)
    g.restore()
  }
  // un navire VU DU DESSUS : son image (navires.png ; la proue vers +z, le cap 180), tournée de (cap - 180) degrés, à sa vraie taille
  // de près, jamais moins de NAV_MIN pixels de long ; son SILLAGE : les places où il était (un relevé toutes les 400 ms)
  var NAV_MIN = 26
  function navireVu(px, py, cap, coque, combat, pirate) {
    var d = decor && decor.pret && decor.nav ? (decor.nav.n[coque] || decor.nav.n[pirate ? 'corsaire' : 'sloop']) : null
    if (!d) return false
    var k = Math.max(M.s / decor.nav.echelle, NAV_MIN / d[3]), tangue = calme ? 0 : Math.sin(t * 1.6 + px * 0.01) * 0.03
    g.save()
    g.translate(px, py)
    g.rotate((cap - 180) * Math.PI / 180 + tangue)
    if (combat || pirate) {
      g.fillStyle = pirate ? 'rgba(232,96,76,.28)' : 'rgba(232,96,76,' + (0.2 + (calme ? 0 : Math.sin(t * 5) * 0.1)).toFixed(2) + ')'
      g.beginPath(); g.ellipse(0, 0, d[2] * k * 0.75 + 4, d[3] * k * 0.6 + 4, 0, 0, Math.PI * 2); g.fill()
    }
    g.imageSmoothingEnabled = k * decor.nav.echelle < 1
    g.drawImage(decor.img.navires, d[0], d[1], d[2], d[3], -d[4] * k, -d[5] * k, d[2] * k, d[3] * k)
    g.imageSmoothingEnabled = false
    g.restore()
    return true
  }
  function sillage(n) {
    var tr = n.trace
    if (!tr || tr.length < 2 || calme) return
    g.lineCap = 'round'
    for (var k = 1; k < tr.length; k++) {
      var a = ecranM(tr[k - 1][0], tr[k - 1][1]), b = ecranM(tr[k][0], tr[k][1]), q = k / tr.length
      g.strokeStyle = 'rgba(235,248,255,' + (q * 0.45).toFixed(2) + ')'
      g.lineWidth = 1 + q * 3
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke()
    }
  }
  function ecranM(x, z) { return [(x - M.cx) * M.s + L / 2, (z - M.cy) * M.s + H / 2] }
  function monde(mx, my) { return [M.cx + (mx - L / 2) / M.s, M.cy + (my - H / 2) / M.s] }
  // la distance à la ligne (Carte.distanceLigne : 0 dans la boîte)
  function distLigne(x, z) {
    var b = mer.ligne, dx = Math.max(0, b.xMin - x, x - b.xMax), dz = Math.max(0, b.zMin - z, z - b.zMax)
    return Math.sqrt(dx * dx + dz * dz)
  }
  // le cap de (x, z) vu de (0, 0), comme le jeu (0 = +z, 90 = -x) ; l'écart entre deux caps dans [-180, 180]
  function capDe(x, z) { var c = Math.atan2(-x, z) * 180 / Math.PI; return c < 0 ? c + 360 : c }
  function ecart(a, b) { var d = (a - b) % 360; if (d > 180) d -= 360; else if (d < -180) d += 360; return d }
  function dansFosse(x, z) {
    var f = mer.fosse
    if (!f || x * x + z * z > mer.rayon * mer.rayon) return false
    var d = distLigne(x, z)
    return d >= f.de && d < f.a && Math.abs(ecart(capDe(x, z), f.cap)) <= f.largeur / 2
  }
  // la zone en (x, z), comme Carte.zoneEn : la Rade, puis la Fosse, puis l'anneau ; hors du disque : null
  function zoneEn(x, z) {
    if (x * x + z * z > mer.rayon * mer.rayon) return null
    var d = distLigne(x, z)
    if (d <= mer.rade.a) return mer.rade
    if (dansFosse(x, z)) return mer.fosse
    for (var k = 0; k < mer.anneaux.length; k++) if (d >= mer.anneaux[k].de && d < mer.anneaux[k].a) return mer.anneaux[k]
    return mer.anneaux.length ? mer.anneaux[mer.anneaux.length - 1] : null
  }
  // (2c, 30/10 ; la tête : « Le Sillage de la Damnation » était sur la carte) LES NOMS TUS : un nom venu des données qui nomme ce
  // qu'on ne nomme jamais (un boss secret) se dit par un nom neutre. La liste est SPOILERS d'outils/verifier.js, mot pour mot :
  // verifier.js le vérifie, et joue nomPublic sur chacun de ses noms
  var NOMS_TUS = ['Abyssarque', 'Dragon Ancien', 'salle du trône', 'Cœur Creux', 'Coeur Creux', 'Sphinx d\'Or', 'Sphinx d’Or',
    'Dévoreur', 'devoreur', 'Mécha Titan', 'Mecha Titan', 'mecha_titan', 'IA Néon', 'Archimage', 'Chevalier Noir',
    'Capitaine Fantôme', 'Minotaure', 'Djinn des Sables', 'djinn_sables', 'Colosse des Profondeurs', 'Dernier Amiral',
    'Gaspard-des-Brumes', 'La Damnation']
  var NEUTRES = { epave: 'Une épave sans nom', ile: 'Une île sans nom', ruine: 'Des ruines sans nom', phare: 'Un phare sans nom', repaire: 'Un repaire sans nom', recif: 'Un récif sans nom' }
  function nomPublic(nom, neutre) {
    var n = String(nom == null ? '' : nom), b = n.toLowerCase()
    for (var k = 0; k < NOMS_TUS.length; k++) if (b.indexOf(NOMS_TUS[k].toLowerCase()) >= 0) return neutre
    return n
  }
  function lieuPublic(a) { return Object.assign({}, a, { nom: nomPublic(a.nom, NEUTRES[a.genre || a.sorte] || 'Un lieu sans nom') }) }
  function zonePublique(z) { return Object.assign({}, z, { nom: nomPublic(z.nom, 'Une zone de la mer'), guide: nomPublic(z.guide, '') }) }
  function lireMer(c) {
    var zs = (c.zones || []).map(zonePublique), ligne = c.ligne || MER_DEFAUT.ligne, rayon = Number(c.rayon) || MER_DEFAUT.rayon
    var anneaux = [], rade = null, fosse = null, secteurs = [], k
    for (k = 0; k < zs.length; k++) {
      var z = zs[k]
      if (z.id === 'rade') rade = Object.assign({}, z, { a: Number(z.a) > 0 ? Number(z.a) : MER_DEFAUT.rade })
      else if (z.id === 'fosse') fosse = z
      // (2c) une autre zone en secteur (le Gouffre aux Flibustiers de la 156, a8) : à part, jamais à la place de la Fosse
      else if (z.secteur) secteurs.push(z)
      else if (Number(z.rang) > 0) anneaux.push(z)
    }
    anneaux.sort(function (p, q) { return p.de - q.de })
    if (!rade) rade = { id: 'rade', nom: 'La Rade', niveau: 0, de: 0, a: MER_DEFAUT.rade }
    if (!fosse) fosse = MER_DEFAUT.fosse
    if (!fosse.terrain) fosse.terrain = MER_DEFAUT.fosse.terrain
    var lieux = (c.lieux || []).map(lieuPublic), atlas = (c.atlas || []).filter(function (a) { return isFinite(a.x) && isFinite(a.z) }).map(lieuPublic)
    var parZone = {}
    ;(c.atlas || []).concat(lieux.filter(function (l) { return l.sorte === 'phare' })).forEach(function (a) { if (a.zone) parZone[a.zone] = (parZone[a.zone] || 0) + 1 })
    mer = { ligne: ligne, rayon: rayon, anneaux: anneaux, rade: rade, fosse: fosse, secteurs: secteurs, port: c.port || null, lieux: lieux, atlas: atlas, parZone: parZone }
  }

  // ---------- le dessin ----------
  // un rectangle à coins ronds autour de la ligne, à la distance d (la frontière d'une zone)
  function bande(d) {
    var b = mer.ligne, a = ecranM(b.xMin - d, b.zMin - d), c = ecranM(b.xMax + d, b.zMax + d), r = d * M.s
    var x0 = a[0], y0 = a[1], x1 = c[0], y1 = c[1]
    g.beginPath()
    g.moveTo(x0 + r, y0); g.lineTo(x1 - r, y0); g.arcTo(x1, y0, x1, y0 + r, r); g.lineTo(x1, y1 - r); g.arcTo(x1, y1, x1 - r, y1, r)
    g.lineTo(x0 + r, y1); g.arcTo(x0, y1, x0, y1 - r, r); g.lineTo(x0, y0 + r); g.arcTo(x0, y0, x0 + r, y0, r); g.closePath()
  }
  // le secteur de la Fosse (ou de son terrain) : pour chaque cap, l'entrée et la sortie le long du rayon (une dichotomie sur la
  // distance à la ligne, qui croît le long du rayon hors de la boîte) ; gardé tant que la forme ne change pas
  var fosseForme = null
  function rayonA(cap, d) {
    var dx = -Math.sin(cap * Math.PI / 180), dz = Math.cos(cap * Math.PI / 180), a = 0, b = mer.rayon
    for (var k = 0; k < 40; k++) { var m = (a + b) / 2; if (distLigne(dx * m, dz * m) < d) a = m; else b = m }
    return [dx * b, dz * b]
  }
  function secteur(de, a, cap, largeur) {
    var pts = [], k, n = 24
    for (k = 0; k <= n; k++) pts.push(rayonA(cap - largeur / 2 + largeur * k / n, Math.min(a, mer.rayon)))
    for (k = n; k >= 0; k--) pts.push(rayonA(cap - largeur / 2 + largeur * k / n, de))
    return pts
  }
  function tracer(pts) {
    g.beginPath()
    for (var k = 0; k < pts.length; k++) { var e = ecranM(pts[k][0], pts[k][1]); if (k) g.lineTo(e[0], e[1]); else g.moveTo(e[0], e[1]) }
    g.closePath()
  }
  // l'écran dans le monde [x0, z0, x1, z1] ; la distance à la ligne la plus courte et la plus longue sur lui (elle est convexe : la
  // plus longue est à un coin) ; de même la distance au centre de la mer
  function ecranMonde() { var a = monde(0, 0), b = monde(L, H); return [a[0], a[1], b[0], b[1]] }
  function bornesLigne(e) {
    var b = mer.ligne, dx = Math.max(0, b.xMin - e[2], e[0] - b.xMax), dz = Math.max(0, b.zMin - e[3], e[1] - b.zMax)
    return [Math.sqrt(dx * dx + dz * dz), Math.max(distLigne(e[0], e[1]), distLigne(e[2], e[1]), distLigne(e[0], e[3]), distLigne(e[2], e[3]))]
  }
  function bornesDisque(e) {
    var dx = Math.max(0, e[0], -e[2]), dz = Math.max(0, e[1], -e[3]), fx = Math.max(Math.abs(e[0]), Math.abs(e[2])), fz = Math.max(Math.abs(e[1]), Math.abs(e[3]))
    return [Math.sqrt(dx * dx + dz * dz), Math.sqrt(fx * fx + fz * fz)]
  }
  function remplirBande(bl, d, couleur) {
    if (bl[0] >= d) return
    g.fillStyle = couleur
    if (bl[1] < d) g.fillRect(0, 0, L, H); else { bande(d); g.fill() }
  }
  function boiteDe(pts) { var b = [1e9, 1e9, -1e9, -1e9]; for (var k = 0; k < pts.length; k++) { b[0] = Math.min(b[0], pts[k][0]); b[1] = Math.min(b[1], pts[k][1]); b[2] = Math.max(b[2], pts[k][0]); b[3] = Math.max(b[3], pts[k][1]) } return b }
  function croise(a, b) { return a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1] }
  function dessinerMer() {
    var o = ecranM(0, 0)
    fondMer(500 * M.s, o[0], o[1])
    if (!mer) { houle(); return }
    var R = mer.rayon * M.s, k, z
    // (2c) de près, une forme immense (un anneau, le disque, la Fosse) coûtait cher à tracer à chaque image : seule celle dont le bord
    // croise l'écran se trace ; l'écran tout entier dedans : un simple rectangle ; tout entier dehors : rien
    var ec = ecranMonde(), bl = bornesLigne(ec), bd = bornesDisque(ec)
    // hors du disque : la brume du bout du monde
    if (bd[1] > mer.rayon) { g.fillStyle = 'rgba(4,10,20,.55)'; g.fillRect(0, 0, L, H) }
    g.save()
    if (bd[1] > mer.rayon) { g.beginPath(); g.arc(o[0], o[1], R, 0, Math.PI * 2); g.clip() }
    // les anneaux, du plus loin au plus proche
    for (k = mer.anneaux.length - 1; k >= 0; k--) { z = mer.anneaux[k]; remplirBande(bl, z.a, ZONES_TEINTES[z.id] || '#134870') }
    remplirBande(bl, mer.rade.a, ZONES_TEINTES.rade)
    eauDePres()
    houle()
    // la Fosse : son secteur rouge, ses récifs plus sombres
    if (!fosseForme) fosseForme = { zone: secteur(mer.fosse.de, mer.fosse.a, mer.fosse.cap, mer.fosse.largeur),
      terrain: mer.fosse.terrain ? secteur(mer.fosse.terrain.de, mer.fosse.terrain.a, mer.fosse.cap, mer.fosse.terrain.largeur) : null }
    // (2c) ses bords battent doucement, comme une alerte qui respire
    var pouls = calme ? 0.5 : 0.5 + Math.sin(t * 2.2) * 0.5
    if (!fosseForme.boite) fosseForme.boite = boiteDe(fosseForme.zone)
    if (croise(fosseForme.boite, ec)) {
    tracer(fosseForme.zone); g.fillStyle = 'rgba(214,64,52,' + (0.2 + pouls * 0.08).toFixed(3) + ')'; g.fill()
    g.strokeStyle = 'rgba(255,120,100,' + (0.55 + pouls * 0.4).toFixed(3) + ')'; g.lineWidth = 2 + pouls; if (g.setLineDash) g.setLineDash([6, 4]); g.stroke(); if (g.setLineDash) g.setLineDash([])
    if (fosseForme.terrain) { tracer(fosseForme.terrain); g.fillStyle = 'rgba(120,30,30,.35)'; g.fill() }
    }
    // les frontières des zones
    g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 1.5
    if (g.setLineDash) g.setLineDash([5, 5])
    for (k = 0; k < mer.anneaux.length; k++) if (bl[0] < mer.anneaux[k].a && bl[1] >= mer.anneaux[k].a) { bande(mer.anneaux[k].a); g.stroke() }
    if (bl[0] < mer.rade.a && bl[1] >= mer.rade.a) { bande(mer.rade.a); g.stroke() }
    if (g.setLineDash) g.setLineDash([])
    g.restore()
    // le bord de la mer
    g.strokeStyle = 'rgba(255,215,94,.55)'; g.lineWidth = 2
    if (bd[0] <= mer.rayon && bd[1] > mer.rayon) { g.beginPath(); g.arc(o[0], o[1], R, 0, Math.PI * 2); g.stroke() }
    // (2c) le décor du jeu, vu du ciel : chaque île, épave, récif, ruine, repaire, phare, et le palais avec son port
    if (decor && decor.pret) dessinerDecor(); else palais()
    // les phares balaient (la nuit, plus fort)
    var l, e
    if (!calme) for (k = 0; k < mer.lieux.length; k++) {
      l = mer.lieux[k]
      if (l.sorte !== 'phare') continue
      e = ecranM(l.x, l.z)
      var an = t * 0.9 + k, lg = 120, ouv = 0.22, gr = g.createRadialGradient(e[0], e[1], 4, e[0], e[1], lg)
      gr.addColorStop(0, amb.nuit ? 'rgba(255,230,150,0.35)' : 'rgba(255,240,190,0.18)'); gr.addColorStop(1, 'rgba(255,230,150,0)')
      g.fillStyle = gr
      g.beginPath(); g.moveTo(e[0], e[1]); g.arc(e[0], e[1], lg, an - ouv, an + ouv); g.closePath(); g.fill()
    }
    lieuxEnMer()
    // les événements, les navires des joueurs (leur nom d'abord), les pirates, puis le port (toujours au-dessus, son nom entier)
    evenementsEnMer()
    naviresEnMer()
    piratesEnMer()
    portEnMer()
    // les noms des zones, discrets, le long de leur anneau (jamais sur un nom ni une icône)
    nomsLeLong()
  }
  // (2c, 30/10 08:2x ; la tête : « le centre est illisible ») LES LIEUX REGROUPÉS : deux icônes qui se toucheraient à l'écran (moins de
  // ECART px) forment une PASTILLE avec leur nombre, à leur milieu ; un toucher sur elle zoome sur ses lieux. Un lieu seul : son
  // icône, et son nom de près. Les places prises (les icônes, les noms, les pastilles, le port) servent aux plaques des zones.
  var ECART = 26, vus = [], prisesLieux = []
  function lieuxEnMer() {
    var pts = [], k, j, e, l, n
    for (k = 0; k < mer.atlas.length; k++) pts.push({ l: mer.atlas[k], genre: mer.atlas[k].genre })
    for (k = 0; k < mer.lieux.length; k++) if (mer.lieux[k].sorte !== 'port') pts.push({ l: mer.lieux[k], genre: mer.lieux[k].sorte })
    var port = mer.port ? ecranM(mer.port.x, mer.port.z) : null, nomPalais = rectNomPalais()
    for (k = 0; k < pts.length; k++) { e = ecranM(pts[k].l.x, pts[k].l.z); pts[k].x = e[0]; pts[k].y = e[1] }
    vus = []; prisesLieux = []
    // (2c) de près, le décor se voit : ni pastille ni icône, le nom seul sous le lieu (le lieu se touche toujours)
    var pres = !!(decor && decor.pret && M.s >= DECOR_PRES)
    // le groupe : chaque lieu prend ses voisins proches (d'abord les phares : ils donnent leur nom au groupe s'ils sont seuls)
    var pris = {}
    for (k = 0; k < pts.length; k++) {
      if (pris[k]) continue
      var g0 = [k]
      pris[k] = 1
      if (!pres) for (j = k + 1; j < pts.length; j++) if (!pris[j] && Math.abs(pts[j].x - pts[k].x) < ECART && Math.abs(pts[j].y - pts[k].y) < ECART) { g0.push(j); pris[j] = 1 }
      var cx = 0, cy = 0
      for (j = 0; j < g0.length; j++) { cx += pts[g0[j]].x; cy += pts[g0[j]].y }
      cx /= g0.length; cy /= g0.length
      // un lieu collé au port : avec le port, jamais dessous (le port garde sa place)
      if (port && Math.abs(cx - port[0]) < ECART && Math.abs(cy - port[1]) < ECART) { cy = port[1] - ECART - 4 }
      if (cx > nomPalais[0] - 13 && cx < nomPalais[2] + 13 && cy > nomPalais[1] - 13 && cy < nomPalais[3] + 13) cy = nomPalais[3] + 15
      vus.push({ membres: g0.map(function (i) { return pts[i] }), x: cx, y: cy })
    }
    g.textAlign = 'center'; g.textBaseline = 'top'
    // (2c, la tête : « un nom ne touche jamais un autre nom ni une icône ») 1. LES MARQUES d'abord (icône, pastille, ou le lieu dessiné
    // de près) : leurs places sont prises avant qu'un seul nom ne se pose ; 2. LES NOMS : un nom qui toucherait un autre nom, une
    // autre marque ou le bord se tait (le survol et le toucher le donnent)
    var noms = M.s >= 0.14, nomsPris = port ? [nomPalais, [port[0] - 13, port[1] - 13, port[0] + 13, port[1] + 13]] : [nomPalais], marques = [], dm = pres ? Math.max(12, LIEU_MIN / 2, 28 * M.s) : 13
    for (k = 0; k < vus.length; k++) {
      var v = vus[k]
      v.vu = !(v.x < -40 || v.x > L + 40 || v.y < -40 || v.y > H + 40)
      if (!v.vu) continue
      v.r = [v.x - 13, v.y - 13, v.x + 13, v.y + 13]
      marques.push(v.r); prisesLieux.push(v.r)
      if (v.membres.length > 1) { pastille(v.x, v.y, v.membres.length, v.membres.some(function (m) { return m.l === choisieMer })); continue }
      l = v.membres[0]
      if (!pres) icone(l.genre, v.x, v.y, choisieMer === l.l)
      else if (choisieMer === l.l) { g.strokeStyle = '#FFD75E'; g.lineWidth = 2; g.beginPath(); g.arc(v.x, v.y, dm, 0, Math.PI * 2); g.stroke() }
    }
    g.font = '600 12px Fredoka, system-ui, sans-serif'
    for (k = 0; k < vus.length; k++) {
      v = vus[k]
      if (!v.vu || v.membres.length > 1) continue
      l = v.membres[0]
      if (!noms && !(l.genre === 'phare' && M.s >= 0.1)) continue
      var w = g.measureText(l.l.nom).width, dy = pres ? dm : 12
      var rn = [v.x - w / 2 - 4, v.y + dy - 1, v.x + w / 2 + 4, v.y + dy + 16]
      if (rn[0] < 4 || rn[2] > L - 4 || rn[3] > H - 4 || chevauche(rn, nomsPris) || chevaucheSauf(rn, marques, v.r)) continue
      nomsPris.push(rn); prisesLieux.push(rn)
      etiquette(l.l.nom, v.x, v.y + dy, 12, l.genre === 'phare' ? '#FFE9A8' : '#F4EAFF')
    }
  }
  function chevaucheSauf(r, l, sauf) { for (var k = 0; k < l.length; k++) if (l[k] !== sauf && r[0] < l[k][2] && r[2] > l[k][0] && r[1] < l[k][3] && r[3] > l[k][1]) return true; return false }
  function pastille(px, py, n, choisi) {
    g.fillStyle = choisi ? 'rgba(255,215,94,.95)' : 'rgba(14,8,24,.82)'
    g.beginPath(); g.arc(px, py, 12, 0, Math.PI * 2); g.fill()
    g.strokeStyle = '#FFD75E'; g.lineWidth = 2; g.stroke()
    g.fillStyle = choisi ? '#3B2508' : '#FFF6DC'
    g.font = '700 13px Fredoka, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.fillText(String(n), px, py + 1)
    g.textBaseline = 'top'
  }
  // la place du nom du palais (sous lui, ou sous le port s'il est plus bas)
  function rectNomPalais() {
    var b = mer.ligne, a = ecranM(b.xMin, b.zMin), c = ecranM(b.xMax, b.zMax), P = mer.port, pt = P ? ecranM(P.x, P.z) : ecranM(196, -3)
    g.font = '700 13px Fredoka, system-ui, sans-serif'
    var y = Math.max(c[1], pt[1] + 12) + 4, x = (a[0] + c[0]) / 2, w = g.measureText('Le palais et son port').width
    return [x - w / 2 - 6, y - 2, x + w / 2 + 6, y + 18]
  }
  // LE PORT : son icône au-dessus de tout, et son nom entier sous le palais (sa place comptée pour les plaques)
  function portEnMer() {
    var b = mer.ligne, a = ecranM(b.xMin, b.zMin), c = ecranM(b.xMax, b.zMax), P = mer.port, pt = P ? ecranM(P.x, P.z) : ecranM(196, -3)
    // (2c) de près, le vrai port se voit : l'icône s'efface
    if (M.s < 1.5 || !(decor && decor.pret)) icone('port', pt[0], pt[1], choisieMer && choisieMer.sorte === 'port')
    g.textAlign = 'center'; g.textBaseline = 'top'
    g.font = '700 13px Fredoka, system-ui, sans-serif'
    var y = Math.max(c[1], pt[1] + 12) + 4, x = (a[0] + c[0]) / 2, t = 'Le palais et son port', w = g.measureText(t).width
    prisesLieux.push([pt[0] - 13, pt[1] - 13, pt[0] + 13, pt[1] + 13], [x - w / 2 - 6, y - 2, x + w / 2 + 6, y + 18])
    // le fond du nom : plus opaque, il passe devant ce qui est dessous
    g.fillStyle = 'rgba(14,8,24,.92)'; g.fillRect(Math.round(x - w / 2 - 6), Math.round(y - 2), Math.round(w + 12), 20)
    g.fillStyle = '#FFD75E'; g.fillText(t, x, y + 1)
  }
  // LE PALAIS DE HAUT : la terre de la boîte, ses murs, la place ; le port et ses quais (de près) ; son nom
  function palais() {
    var b = mer.ligne, a = ecranM(b.xMin, b.zMin), c = ecranM(b.xMax, b.zMax), w = c[0] - a[0], h = c[1] - a[1]
    g.fillStyle = '#5E8F43'; g.fillRect(a[0], a[1], w, h)
    if (w > 18) {
      g.fillStyle = '#D9C38A'; g.fillRect(a[0] + w * .3, a[1] + h * .3, w * .4, h * .4)                 // la place
      g.fillStyle = '#8E7CB8'; g.fillRect(a[0] + w * .42, a[1] + h * .4, w * .16, h * .2)               // le palais
      g.fillStyle = '#C9A55A'; g.fillRect(a[0] + w * .47, a[1] + h * .34, w * .06, h * .08)
    }
    g.strokeStyle = '#E8DDBF'; g.lineWidth = Math.max(1.5, 4 * M.s); g.strokeRect(a[0], a[1], w, h)  // les murs : la ligne
    var P = mer.port
    if (P && M.s >= 0.25) {
      g.fillStyle = '#8C5A2E'
      for (var k = 0; k < (P.quais || []).length; k++) { var q = ecranM(P.quais[k].x - 6, P.quais[k].z - 2); g.fillRect(q[0], q[1], Math.max(3, 12 * M.s), Math.max(2, 4 * M.s)) }
    }
  }
  // (2c, 30/10 ; la tête : « les noms des zones discrets le long des anneaux ») LE NOM DE CHAQUE ZONE ÉCRIT DANS SON ANNEAU, en
  // capitales espacées, blanc à demi transparent : au nord du palais, sinon au sud, à l'ouest, à l'est (le premier côté où il tient
  // à l'écran sans toucher un nom ni une icône) ; une bande trop fine à ce zoom : rien (on zoome pour le lire). La Fosse : le long
  // de son secteur, du palais vers le large, en rouge.
  function placeLibre(r, prises) { return r[0] >= 8 && r[1] >= 8 && r[2] <= L - 8 && r[3] <= H - 8 && !chevauche(r, prises) }
  function chevauche(r, l) { for (var k = 0; k < l.length; k++) if (r[0] < l[k][2] && r[2] > l[k][0] && r[1] < l[k][3] && r[3] > l[k][1]) return true; return false }
  function ecrireLe(txt, px, py, angle, taille, couleur) {
    g.save()
    g.translate(px, py)
    if (angle) g.rotate(angle * Math.PI / 180)
    g.font = '400 ' + taille + 'px "Lilita One", Fredoka, sans-serif'
    if ('letterSpacing' in g) g.letterSpacing = Math.round(taille * 0.16) + 'px'
    g.textAlign = 'center'; g.textBaseline = 'middle'
    g.fillStyle = 'rgba(2,12,28,.35)'; g.fillText(txt, 1, 1.5)
    g.fillStyle = couleur; g.fillText(txt, 0, 0)
    if ('letterSpacing' in g) g.letterSpacing = '0px'
    g.restore()
  }
  function largeurLe(txt, taille) {
    g.font = '400 ' + taille + 'px "Lilita One", Fredoka, sans-serif'
    return g.measureText(txt).width + txt.length * Math.round(taille * 0.16)
  }
  function nomsLeLong() {
    var b = mer.ligne, cx = (b.xMin + b.xMax) / 2, cz = (b.zMin + b.zMax) / 2, prises = prisesLieux.slice(), k
    var blanc = amb.nuit ? 'rgba(220,232,255,.34)' : 'rgba(255,255,255,.42)'
    var l = [mer.rade].concat(mer.anneaux)
    for (k = 0; k < l.length; k++) {
      var z = l[k], de = z.id === 'rade' ? 0 : z.de, a = Math.min(z.a, mer.rayon), hb = (a - de) * M.s
      if (hb < 16) continue
      var dm = de + (a - de) / 2, ta = Math.round(Math.max(11, Math.min(22, hb * 0.22)))
      var nom = z.nom.toUpperCase() + (z.niveau ? '  ·  NIVEAU ' + z.niveau : ''), w = largeurLe(nom, ta)
      var cotes = [[cx, b.zMin - dm, 0], [cx, b.zMax + dm, 0], [b.xMin - dm, cz, -90], [b.xMax + dm, cz, 90]]
      for (var c = 0; c < cotes.length; c++) {
        var p = cotes[c]
        if (p[0] * p[0] + p[1] * p[1] > mer.rayon * mer.rayon * 0.97) continue
        // jamais dans la Fosse (elle a son nom à elle) : le milieu et les deux bouts du nom
        var dw = w / 2 / M.s, bx = p[2] ? 0 : dw, bz = p[2] ? dw : 0
        if (dansFosse(p[0], p[1]) || dansFosse(p[0] - bx, p[1] - bz) || dansFosse(p[0] + bx, p[1] + bz)) continue
        var e = ecranM(p[0], p[1]), r = p[2] ? [e[0] - ta / 2 - 2, e[1] - w / 2, e[0] + ta / 2 + 2, e[1] + w / 2] : [e[0] - w / 2, e[1] - ta / 2 - 2, e[0] + w / 2, e[1] + ta / 2 + 2]
        if (!placeLibre(r, prises)) continue
        ecrireLe(nom, e[0], e[1], p[2], ta, blanc)
        prises.push(r)
        break
      }
    }
    // la Fosse : sur l'axe de son secteur, au milieu, le texte dans le sens de lecture
    var f = mer.fosse, hf = (f.a - f.de) * M.s
    if (hf < 90) return
    var ta2 = Math.round(Math.max(11, Math.min(18, hf * 0.03))), txt = f.nom.toUpperCase() + '  ·  COMBAT ENTRE JOUEURS'
    if (largeurLe(txt, ta2) > hf * 0.85) txt = f.nom.toUpperCase()
    if (largeurLe(txt, ta2) > hf * 0.85) return
    var m = rayonA(f.cap, f.de + (f.a - f.de) * 0.5), em = ecranM(m[0], m[1])
    var ang = Math.atan2(Math.cos(f.cap * Math.PI / 180), -Math.sin(f.cap * Math.PI / 180)) * 180 / Math.PI
    if (ang > 90 || ang < -90) ang += 180
    if (em[0] < -50 || em[0] > L + 50 || em[1] < -50 || em[1] > H + 50) return
    var wf = largeurLe(txt, ta2), ca = Math.abs(Math.cos(ang * Math.PI / 180)), sa = Math.abs(Math.sin(ang * Math.PI / 180))
    var bw = (wf * ca + ta2 * sa) / 2 + 2, bh = (wf * sa + ta2 * ca) / 2 + 2
    if (chevauche([em[0] - bw, em[1] - bh, em[0] + bw, em[1] + bh], prises)) return
    ecrireLe(txt, em[0], em[1], ang, ta2, 'rgba(255,176,158,.8)')
  }
  var FORMES = {
    port: ['..XX..', '..XX..', 'XXXXXX', '..XX..', 'X.XX.X', '.XXXX.'],
    phare: ['..YY..', '.YYYY.', '..XX..', '..RR..', '..XX..', '.XXXX.'],
    ile: ['..GG..', '.GGGG.', 'GGGGGG', 'SSSSSS', '.SSSS.', '......'],
    epave: ['...X..', '..XX..', '.X.X..', 'XXXXXX', '.XXXX.', '......'],
    ruine: ['X.X.X.', 'XXXXX.', 'X...X.', 'X.X.X.', 'XXXXX.', '......'],
    recif: ['R...R.', 'RR.RR.', '.RRR..', '..R...', '.RRR..', '......'],
    repaire: ['.XXXX.', 'X.XX.X', 'XXXXXX', '.X..X.', '.XXXX.', 'X....X']
  }
  var TEINTES = { X: '#F4EAFF', Y: '#FFD75E', R: '#E8604C', G: '#6CC04A', S: '#E3CF8E' }
  function icone(sorte, px, py, choisi) {
    var f = FORMES[sorte] || FORMES.ile, u = 3, a = Math.round(px - 9), b = Math.round(py - 9)
    g.fillStyle = choisi ? 'rgba(255,215,94,.9)' : 'rgba(14,8,24,.6)'
    g.fillRect(a - 2, b - 2, 22, 22)
    for (var y = 0; y < 6; y++) for (var x = 0; x < 6; x++) {
      var c = f[y][x]
      if (c === '.') continue
      g.fillStyle = sorte === 'repaire' && c === 'X' ? '#FFB4A8' : sorte === 'ruine' && c === 'X' ? '#C9C2B4' : TEINTES[c]
      g.fillRect(a + x * u, b + y * u, u, u)
    }
  }
  // ---------- ce qui vit en mer ----------
  function naviresEnMer() {
    var f = Math.min(1, (Date.now() - releveDernier) / Math.max(1000, releveDernier - relevePrec || 10000))
    for (var p in navires) {
      var n = navires[p], x = n.ax + (n.x - n.ax) * f, z = n.az + (n.z - n.az) * f, en = ecranM(x, z)
      if (en[0] < -40 || en[0] > L + 40 || en[1] < -40 || en[1] > H + 40) continue
      // le sillage : une place toutes les 400 ms (les 14 dernières), là où il glisse
      if (!n.trace) n.trace = []
      if (!n.tt || t - n.tt > 0.4) { n.tt = t; n.trace.push([x, z]); if (n.trace.length > 14) n.trace.shift() }
      sillage(n)
      if (!navireVu(en[0], en[1], n.cap, n.coque, n.en_combat, false)) navire(en[0], en[1], n.cap, n.en_combat, n.pseudo, false)
      g.font = '600 12px Fredoka, system-ui, sans-serif'
      var wn = g.measureText(n.pseudo).width, yn = en[1] + Math.max(14, 8 * M.s)
      var rj = [en[0] - wn / 2 - 4, yn - 1, en[0] + wn / 2 + 4, yn + 16]
      if (!chevauche(rj, prisesLieux)) { prisesLieux.push(rj); etiquette(n.pseudo, en[0], yn, 12, '#FFD75E') }
    }
  }
  // les pirates : un navire rouge (le jeu les publiera ; API.md 2.7, la forme proposée : { type, nom, x, z, cap })
  function piratesEnMer() {
    for (var k = 0; k < pirates.length; k++) {
      var n = pirates[k], en = ecranM(n.x, n.z)
      if (en[0] < -40 || en[0] > L + 40 || en[1] < -40 || en[1] > H + 40) continue
      if (!navireVu(en[0], en[1], n.cap || 0, String(n.coque || n.type || ''), true, true)) navire(en[0], en[1], n.cap || 0, true, String(n.nom || n.type || 'pirate'), true)
      // son nom cède la place à celui d'un joueur (un combat : les deux navires sont côte à côte)
      g.font = '600 11px Fredoka, system-ui, sans-serif'
      var np = String(n.nom || 'Pirate'), wp = g.measureText(np).width, yp = en[1] + Math.max(14, 8 * M.s), rp = [en[0] - wp / 2 - 4, yp - 1, en[0] + wp / 2 + 4, yp + 15]
      if (M.s >= 0.09 && !chevauche(rp, prisesLieux)) { prisesLieux.push(rp); etiquette(np, en[0], yp, 11, '#FFB4A8') }
    }
  }
  // les événements en mer (une cargaison, un trésor...) : un cercle qui pulse, son nom ({ sorte, nom, x, z })
  // (2c, la 156) une cargaison à la couleur de sa rareté (les couleurs du jeu : ciMER.cargaisons.couleurs) ; un autre événement : le cyan
  var RARETES = { commune: '158,158,158', peu_commune: '85,200,85', rare: '74,144,226', epique: '166,76,224', legendaire: '242,193,46' }
  function evenementsEnMer() {
    for (var k = 0; k < evenements.length; k++) {
      var v = evenements[k], en = ecranM(v.x, v.z), r = 10 + (calme ? 0 : Math.sin(t * 3 + k) * 3), rgb = RARETES[v.rarete] || '126,232,255'
      if (en[0] < -40 || en[0] > L + 40 || en[1] < -40 || en[1] > H + 40) continue
      g.strokeStyle = 'rgba(' + rgb + ',.95)'; g.lineWidth = 2
      g.beginPath(); g.arc(en[0], en[1], r, 0, Math.PI * 2); g.stroke()
      g.fillStyle = 'rgba(' + rgb + ',.28)'; g.fill()
      // son nom, s'il ne couvre pas celui d'un lieu
      g.font = '600 12px Fredoka, system-ui, sans-serif'
      var nv = String(v.nom || 'Un événement'), wv = g.measureText(nv).width, xv = Math.max(wv / 2 + 6, Math.min(L - wv / 2 - 6, en[0])), rv = [xv - wv / 2 - 4, en[1] + 13, xv + wv / 2 + 4, en[1] + 30]
      if (!chevauche(rv, prisesLieux)) { prisesLieux.push(rv); etiquette(nv, en[0], en[1] + 14, 12, '#BFF5FF') }
    }
  }
  // un navire : sa coque qui tangue un peu, et son SILLAGE
  function navire(px, py, cap, combat, nom, pirate) {
    var r = cap * Math.PI / 180, tangue = calme ? 0 : Math.sin(t * 2 + nom.length) * 0.06
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
    g.fillStyle = pirate ? '#2B1A1A' : (combat ? '#E8604C' : '#FFD75E')
    g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 6); g.lineTo(0, 3); g.lineTo(-6, 6); g.closePath(); g.fill()
    g.strokeStyle = pirate ? '#E8604C' : 'rgba(14,8,24,.8)'; g.lineWidth = 1.5; g.stroke()
    g.restore()
  }
  function chargerMer() {
    if (mer) { sale = true; return }
    ecrire('La mer se charge...')
    V.carte('mer').then(function (r) {
      if (r.statut !== 200) { ecrire('La mer ne répond pas pour l\'instant.'); return }
      lireMer(r.corps)
      fosseForme = null
      chargerDecor()
      legendeMer()
      cadrerMer(); ecrire(''); dire(); sale = true
    })
  }
  // le cadre : le palais au milieu, jusqu'à 900 blocs (la Rade, les Hauts-Fonds, le seuil du Large et de la Fosse : le décor s'y
  // voit déjà, vu du ciel) ; « - » montre le reste de la mer
  function cadrerMer() {
    if (!mer) return
    M.cx = 0; M.cy = 0
    // un écran en hauteur (le téléphone) : la mer remplit la hauteur (ses bords coupés), pas seulement la largeur
    var cote = H > L * 1.3 ? H * 0.82 : Math.min(L, H), vu = Math.min(mer.rayon, 900)
    M.s = Math.max(MER_MIN, Math.min(MER_MAX, cote / (vu * 2 * 1.04)))
  }
  // ---------- la fiche d'un lieu ou d'une zone (un clic) ----------
  var choisieMer = null
  // ce qui est sous le doigt, comme on le voit : le port d'abord (il est au-dessus), puis une pastille (rend { groupe }), puis un lieu
  function lieuSousMer(mx, my) {
    if (mer.port) { var ep = ecranM(mer.port.x, mer.port.z); if (Math.abs(ep[0] - mx) <= 13 && Math.abs(ep[1] - my) <= 13) return { id: 'port', nom: 'Le port', sorte: 'port', x: mer.port.x, z: mer.port.z } }
    for (var k = 0; k < vus.length; k++) {
      var v = vus[k]
      // (2c) de près, le lieu se touche sur toute son image
      var rr = decor && decor.pret && M.s >= DECOR_PRES ? Math.max(14, 28 * M.s) : 14
      if (Math.abs(v.x - mx) > rr || Math.abs(v.y - my) > rr) continue
      return v.membres.length > 1 ? { groupe: v } : v.membres[0].l
    }
    return null
  }
  // une pastille touchée : la carte zoome sur ses lieux (ils s'y séparent), doucement
  function ouvrirGroupe(v) {
    var x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9
    v.membres.forEach(function (m) { x0 = Math.min(x0, m.l.x); x1 = Math.max(x1, m.l.x); z0 = Math.min(z0, m.l.z); z1 = Math.max(z1, m.l.z) })
    M.cx = (x0 + x1) / 2; M.cy = (z0 + z1) / 2
    M.s = Math.max(M.s * 2.2, Math.min(MER_MAX, Math.min((L - 160) / Math.max(60, x1 - x0), (H - 160) / Math.max(60, z1 - z0))))
    sale = true
  }
  function nomZone(id) {
    if (id === 'rade') return mer.rade.nom
    if (id === 'fosse') return mer.fosse.nom
    for (var k = 0; k < mer.anneaux.length; k++) if (mer.anneaux[k].id === id) return mer.anneaux[k].nom
    return ''
  }
  function montrerMer(mx, my) {
    if (!mer) return
    var l = lieuSousMer(mx, my), w = monde(mx, my)
    if (l && l.groupe) { fiche.hidden = true; choisieMer = null; ouvrirGroupe(l.groupe); return }
    choisieMer = l; sale = true
    if (l) {
      var genre = l.sorte === 'port' ? 'port' : (l.sorte === 'phare' ? 'phare' : l.genre)
      ficheCorps.innerHTML = '<h2>' + echapper(l.nom) + '</h2><p class="hote">' + echapper(GENRES[genre] || 'Un lieu') + (l.zone ? ' · ' + echapper(nomZone(l.zone)) : '') + '</p>' +
        (genre === 'port' ? '<p>Le quai du palais : c\'est d\'ici que partent les navires. La Borne du port appelle le tien.</p>'
          : '<p>Un lieu de l\'Atlas : passe tout près en navire pour le découvrir. Le premier du serveur à le trouver voit son nom gravé.</p>')
      fiche.hidden = false
      return
    }
    var z = zoneEn(w[0], w[1])
    if (!z) { fiche.hidden = true; return }
    var n = mer.parZone[z.id] || 0
    ficheCorps.innerHTML = '<h2>' + echapper(z.nom) + '</h2><p class="hote">' + (z.niveau ? 'Niveau conseillé : ' + z.niveau : 'Le port et ses abords') + '</p>' +
      '<p>' + echapper(z.guide || (z.id === 'rade' ? 'Les eaux du port : ni pirate ni butin, on y prend la mer en sécurité.' : '')) + '</p>' +
      (n ? '<p class="hote">' + n + ' lieu' + (n > 1 ? 'x' : '') + ' de l\'Atlas à découvrir ici.</p>' : '')
    fiche.hidden = false
  }
  // (2c, 30/10) la légende de ce qui vit : une entrée n'existe que si la carte en montre au moins un, à l'instant
  function legendeVivante() {
    var n = 0
    for (var p in navires) n++
    var bascule = function (sel, oui) { var e = document.querySelector(sel); if (e) e.hidden = !oui }
    bascule('#legende-mer .si-navires', n > 0)
    bascule('#legende-mer .si-pirates', pirates.length > 0)
    bascule('#legende-mer .si-evenements', evenements.length > 0)
  }
  function legendeMer() {
    var l = document.getElementById('legende-mer-zones')
    if (!l || !mer) return
    l.textContent = ''
    ;[mer.rade].concat(mer.anneaux).concat([mer.fosse]).forEach(function (z) {
      var li = document.createElement('li'), p = document.createElement('span')
      p.className = 'pastille zone-' + z.id
      li.appendChild(p)
      li.appendChild(document.createTextNode(z.nom + (z.niveau ? ' (niveau ' + z.niveau + ')' : '')))
      l.appendChild(li)
    })
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
        navires[n.pseudo] = { pseudo: n.pseudo, x: n.x, z: n.z, ax: ax, az: az, cap: n.cap, coque: String(n.coque || ''), en_combat: n.en_combat, trace: avant ? avant.trace : null, tt: avant ? avant.tt : 0 }
      }
      for (var p in navires) if (!vus[p]) delete navires[p]
      // (2c) ce qui vit en mer, quand le jeu le publie : les pirates et les événements (sinon : rien)
      // (2c) leurs noms tus comme ceux des lieux (un pirate de la fin de partie ne se nomme jamais)
      pirates = Array.isArray(r.corps.pirates) ? r.corps.pirates.filter(function (n) { return isFinite(n.x) && isFinite(n.z) }).map(function (n) { return Object.assign({}, n, { nom: nomPublic(n.nom, 'Un navire pirate') }) }) : []
      evenements = Array.isArray(r.corps.evenements) ? r.corps.evenements.filter(function (n) { return isFinite(n.x) && isFinite(n.z) }).map(function (n) { return Object.assign({}, n, { nom: nomPublic(n.nom, 'Un événement en mer') }) }) : []
      relevePrec = releveDernier || tl - 10000; releveDernier = tl
      legendeVivante()
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
  document.getElementById('fiche-fermer').addEventListener('click', function () { montrer(null); libreChoisie = null; choisieMer = null })

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
        else if (zone === 'mer') montrerMer(p[0], p[1])
        else { var lb = libreSous(p[0], p[1]); if (lb) montrerLibre(lb); else if (zone === 'iles') { montrer(null); libreChoisie = null } }
      }
      depart = null
    } else depart = null
  }
  toile.addEventListener('pointerup', lacher)
  toile.addEventListener('pointercancel', lacher)
  toile.addEventListener('wheel', function (e) { e.preventDefault(); var p = pos(e); zoomer(Math.pow(1.0015, -e.deltaY), p[0], p[1]) }, { passive: false })
  // (2c) LA MER AU SURVOL : le nom du lieu sous la souris (même celui qui s'est tu pour ne rien toucher), ou le nombre d'une pastille
  var survoleMer = null
  function survolerMer(p) {
    var l = mer ? lieuSousMer(p[0], p[1]) : null, cle2 = l ? (l.groupe ? 'g' + l.groupe.x + ',' + l.groupe.y : l.nom) : null
    toile.style.cursor = l ? 'pointer' : 'grab'
    if (cle2 === survoleMer) return
    survoleMer = cle2
    if (!l) { bulle.hidden = true; return }
    bulle.textContent = l.groupe ? l.groupe.membres.length + ' lieux : touche pour zoomer' : l.nom + (GENRES[l.sorte || l.genre] ? ' · ' + GENRES[l.sorte || l.genre] : '')
    bulle.style.left = Math.round(p[0]) + 'px'; bulle.style.top = Math.round(p[1]) + 'px'
    bulle.hidden = false
  }
  function survoler(p) {
    if (zone === 'mer') { survolerMer(p); return }
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
  toile.addEventListener('pointerleave', function () { bulle.hidden = true; survolee = null; survoleMer = null; if (survolLibre) { survolLibre = null; sale = true } })
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
  // (2c) la légende de ce qui vit : legendeVivante, à chaque relecture des navires
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
    var sorte = ['port', 'phare', 'ile', 'epave', 'ruine', 'recif', 'repaire'].filter(function (x) { return el.classList.contains(x) })[0]
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
    // (af, 23:5x) venu d'un lien vers une île (l'accueil, un profil) : la page descend sur la carte (#carte, data-ancre-defaut),
    // posée sous la barre par js/ancres.js (avant : scrollIntoView, la carte sous la barre)
    I.s = 60; I.cx = +m[1]; I.cy = +m[2] + sousLaFiche()
    V.carte('iles', { de: [+m[1], +m[2]], a: [+m[1], +m[2]] }).then(function (r) { if (r.statut === 200 && r.corps.iles && r.corps.iles[0]) montrer(r.corps.iles[0], false) })
  } else if (location.hash === '#mer' && MER_OUVERTE) { intro = { fini: true }; choisirZone('mer') }
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
