// UNE ÎLE VUE DE HAUT, en pixels (12 x 12), pour la carte et le profil : quatre formes (choisies par sa case, toujours la
// même), l'écume, le sable, l'herbe, un arbre, et son fanion de la couleur de ses étoiles ; ouverte aux visites, un ponton.
// Dessinée une fois par sorte (4 formes x 6 couleurs x ouverte ou non), puis seulement recopiée agrandie.
//   IlePixel.sprite(i, j, etoiles, ouverte) : un canvas de 12 x 12 ;   IlePixel.COULEURS[etoiles] : la couleur des étoiles
;(function () {
  'use strict'
  var COULEURS = ['#7D8A96', '#9CC77D', '#6CC04A', '#E8C55A', '#FFD75E', '#FFF1B8']
  var FORMES = [
    ['............', '....eeee....', '..eessssee..', '.essggggsse.', '.esgggTgggse', 'esggTTTgggse', 'esgggTggggse', 'essgggggggse', '.essgggggsse', '..eessssse..', '....eeeee...', '............'],
    ['............', '...eeeeee...', '..essssssee.', '.esggggggsse', '.esgTggggse.', '.esTTTgggse.', '.esgTggggsse', '.essgggggsse', '..esssgggse.', '...eessssee.', '.....eeee...', '............'],
    ['............', '..eee.eeee..', '.essesssse..', '.esgssggsse.', 'esgggggTgse.', 'esggggTTTgse', '.esgggggTgse', '.essggggggse', '..esgggsssse', '..essssee...', '...eeee.....', '............'],
    ['............', '.....eeee...', '...eessssee.', '..esgggggse.', '.esggTggggse', '.esgTTTggsse', 'esgggTgggse.', 'esggggggsse.', '.essgggsse..', '..eesssse...', '....eeee....', '............']]
  var TEINTES = { e: 'rgba(220,240,255,.28)', s: '#E3CF8E', g: '#5FA23E', T: '#2F6B22' }
  var faits = {}
  function sprite(i, j, et, o) {
    var f = (((i * 7 + j * 13) % 4) + 4) % 4, cle = f + '_' + et + (o ? 'o' : '')
    if (faits[cle]) return faits[cle]
    var c = document.createElement('canvas')
    c.width = 12; c.height = 12
    var x = c.getContext('2d'), m = FORMES[f]
    for (var y = 0; y < 12; y++) for (var k = 0; k < 12; k++) {
      var t = m[y][k]
      if (t === '.') continue
      x.fillStyle = TEINTES[t]
      x.fillRect(k, y, 1, 1)
    }
    // le fanion : son mât et sa couleur (les étoiles)
    x.fillStyle = '#3F2612'; x.fillRect(8, 2, 1, 4)
    x.fillStyle = COULEURS[et] || COULEURS[0]; x.fillRect(9, 2, 2, 2)
    // ouverte aux visites : un ponton de bois vers le large
    if (o) { x.fillStyle = '#8C5A2E'; x.fillRect(5, 9, 2, 3); x.fillStyle = '#6B4423'; x.fillRect(5, 11, 2, 1) }
    faits[cle] = c
    return c
  }
  // (af, 29/10 22:4x ; la tête : « la carte plus belle encore ») UNE ÎLE PLUS GRANDE, 20 x 20 : sa forme (six, tirées de sa case,
  // toujours la même), les hauts-fonds turquoise et l'écume autour, la plage, l'herbe en deux tons, ses arbres, la maison de
  // l'hôte, des FLEURS d'autant plus nombreuses et vives qu'elle a d'étoiles, le fanion de ses étoiles, le ponton si elle est
  // ouverte. Dessinée une fois par sorte (6 formes x 6 étoiles x ouverte ou non), puis recopiée agrandie au pixel près.
  //   IlePixel.grande(i, j, etoiles, ouverte) : un canvas de 20 x 20
  var G = 20, faitesG = {}
  function hasard(n) { var s = n * 9301 + 49297; return function () { s = (s * 9301 + 49297) % 233280; return s / 233280 } }
  // son dessin est-il déjà fait ? (la carte n'en fabrique que pendant les 4 premières ms d'une image)
  function grandeDeja(i, j, et, o) { return !!faitesG[((((i * 7 + j * 13) % 6) + 6) % 6) + '_' + et + (o ? 'o' : '')] }
  function grande(i, j, et, o) {
    var f = (((i * 7 + j * 13) % 6) + 6) % 6, cle = f + '_' + et + (o ? 'o' : '')
    if (faitesG[cle]) return faitesG[cle]
    var r = hasard(f + 1), a1 = 0.1 + r() * 0.12, a2 = 0.06 + r() * 0.1, p1 = r() * 6.28, p2 = r() * 6.28, R = 6.4 + r() * 0.8
    var terre = [], y, k
    for (y = 0; y < G; y++) { terre.push([]); for (k = 0; k < G; k++) {
      var dx = k + 0.5 - G / 2, dy = (y + 0.5 - G / 2) * 1.08, an = Math.atan2(dy, dx)
      terre[y].push(Math.sqrt(dx * dx + dy * dy) < R * (1 + a1 * Math.sin(2 * an + p1) + a2 * Math.sin(3 * an + p2)))
    } }
    function t(yy, kk) { return yy >= 0 && yy < G && kk >= 0 && kk < G && terre[yy][kk] }
    function bord(yy, kk) { return !t(yy - 1, kk) || !t(yy + 1, kk) || !t(yy, kk - 1) || !t(yy, kk + 1) }
    function pres(yy, kk, d) { for (var a = -d; a <= d; a++) for (var b = -d; b <= d; b++) if (Math.abs(a) + Math.abs(b) <= d && t(yy + a, kk + b)) return true; return false }
    var c = document.createElement('canvas')
    c.width = G; c.height = G
    var x = c.getContext('2d')
    function px(kk, yy, coul) { x.fillStyle = coul; x.fillRect(kk, yy, 1, 1) }
    var r2 = hasard(f * 31 + 7)
    for (y = 0; y < G; y++) for (k = 0; k < G; k++) {
      if (!t(y, k)) {
        // l'eau autour : l'écume collée à la plage, puis les hauts-fonds
        if (pres(y, k, 1)) px(k, y, 'rgba(235,250,255,.55)')
        else if (pres(y, k, 2)) px(k, y, 'rgba(110,215,220,.32)')
        continue
      }
      if (bord(y, k)) px(k, y, r2() < 0.25 ? '#D6BE78' : '#E8D394')
      else if (!t(y - 2, k) || !t(y + 2, k) || !t(y, k - 2) || !t(y, k + 2)) px(k, y, r2() < 0.2 ? '#E3CF8E' : '#7DB64F')
      else px(k, y, r2() < 0.3 ? '#4E9433' : (r2() < 0.15 ? '#76B84C' : '#5FA23E'))
    }
    // le milieu de l'île (pour poser la maison et les arbres sur l'herbe)
    function herbe(yy, kk) { return t(yy, kk) && !bord(yy, kk) && t(yy - 2, kk) && t(yy + 2, kk) && t(yy, kk - 2) && t(yy, kk + 2) }
    var places = []
    for (y = 2; y < G - 2; y++) for (k = 2; k < G - 2; k++) if (herbe(y, k)) places.push([k, y])
    var r3 = hasard(f * 17 + 3), pris = {}
    function libre(kk, yy, l, h) { for (var a = -1; a <= h; a++) for (var b = -1; b <= l; b++) if (pris[(kk + b) + ',' + (yy + a)] || !herbe(yy + Math.min(a, h - 1), kk + Math.min(b, l - 1))) return false; return true }
    function prendre(kk, yy, l, h) { for (var a = 0; a < h; a++) for (var b = 0; b < l; b++) pris[(kk + b) + ',' + (yy + a)] = 1 }
    // la maison de l'hôte : un toit rouge, un mur clair, sa porte
    for (var essai = 0; essai < 60; essai++) {
      var pm = places[Math.floor(r3() * places.length)]
      if (!pm || !libre(pm[0], pm[1], 4, 4)) continue
      px(pm[0] + 1, pm[1], '#9C3A26'); px(pm[0] + 2, pm[1], '#9C3A26')
      x.fillStyle = '#C24E33'; x.fillRect(pm[0], pm[1] + 1, 4, 1)
      x.fillStyle = '#EADBB6'; x.fillRect(pm[0], pm[1] + 2, 4, 2)
      px(pm[0] + 1, pm[1] + 3, '#6B4423'); px(pm[0] + 3, pm[1] + 2, '#7FB8D8')
      x.fillStyle = 'rgba(20,40,10,.35)'; x.fillRect(pm[0] + 4, pm[1] + 1, 1, 3)
      prendre(pm[0], pm[1], 5, 4)
      break
    }
    // les arbres : une couronne ronde, sa lumière, son ombre
    var arbres = 0
    for (essai = 0; essai < 80 && arbres < 3; essai++) {
      var pa = places[Math.floor(r3() * places.length)]
      if (!pa || !libre(pa[0], pa[1], 3, 3)) continue
      x.fillStyle = 'rgba(20,40,10,.35)'; x.fillRect(pa[0] + 1, pa[1] + 2, 3, 2)
      x.fillStyle = '#2F6B22'; x.fillRect(pa[0], pa[1] + 1, 3, 1); x.fillRect(pa[0] + 1, pa[1], 1, 3)
      px(pa[0], pa[1], '#3E8A2C'); px(pa[0] + 2, pa[1], '#3E8A2C'); px(pa[0] + 1, pa[1], '#4FA238')
      px(pa[0] + 1, pa[1] + 2, '#5A3A1C')
      prendre(pa[0], pa[1], 3, 3); arbres++
    }
    // les fleurs : la beauté se voit (0 étoile : aucune ; 5 : un jardin)
    var FLEURS = ['#FFE36E', '#FF8FB1', '#FFFFFF', '#B58CFF', '#FF7A5C']
    for (essai = 0; essai < et * 5; essai++) {
      var pf = places[Math.floor(r3() * places.length)]
      if (!pf || pris[pf[0] + ',' + pf[1]]) continue
      px(pf[0], pf[1], FLEURS[Math.floor(r3() * Math.min(FLEURS.length, 1 + et))])
      pris[pf[0] + ',' + pf[1]] = 1
    }
    // le fanion de ses étoiles, au bord de l'île, en haut à droite
    var fy = 0, fk = 0
    for (y = 2; y < G && !fy; y++) for (k = G - 3; k > 2; k--) if (t(y, k) && t(y + 3, k) && !pris[k + ',' + y]) { fy = y; fk = k; break }
    if (fy) { x.fillStyle = '#3F2612'; x.fillRect(fk, fy - 2, 1, 5); x.fillStyle = COULEURS[et] || COULEURS[0]; x.fillRect(fk + 1, fy - 2, 3, 2); px(fk + 1, fy, COULEURS[et] || COULEURS[0]) }
    // ouverte aux visites : un ponton de planches vers le large, au sud
    if (o) {
      var bas = 0, mk = Math.floor(G / 2)
      for (y = G - 1; y > 0; y--) if (t(y, mk)) { bas = y; break }
      x.fillStyle = '#8C5A2E'; x.fillRect(mk - 1, bas, 2, Math.min(4, G - bas))
      x.fillStyle = '#6B4423'; for (y = bas + 1; y < Math.min(G, bas + 4); y += 2) x.fillRect(mk - 1, y, 2, 1)
      px(mk - 2, Math.min(G - 1, bas + 3), '#5A3A1C'); px(mk + 1, Math.min(G - 1, bas + 3), '#5A3A1C')
    }
    faitesG[cle] = c
    return c
  }
  // (af, 29/10 23:0x ; le propriétaire : « même les dessins d'îles et les animations doivent être incroyables » ; la tête : « chaque
  // île à elle, jamais deux pareilles ») UNE ÎLE UNIQUE, 28 x 28 : sa forme tirée de sa case ET de son hôte (trois ondes, son
  // allongement, parfois un lagon), sa taille (son palier de murs si l'API le dit, sinon ses étoiles et ses amis), l'herbe d'une de
  // trois teintes, une maison par habitant (l'hôte et ses amis, jusqu'à trois ; des toits de couleurs), des arbres de quatre sortes
  // (les cerisiers dès 4 étoiles), des fleurs selon ses étoiles, le chemin de la maison au ponton ou à la plage ; SES BÊTES et SES
  // MACHINES seulement si l'API les compte (jamais inventées) ; le fanion de ses couleurs (sinon celle de ses étoiles) ; ouverte :
  // le ponton et une barque. DEUX IMAGES : l'écume collée à la plage, puis retirée d'un pixel (la vague qui bat ; la carte les
  // alterne). Rendu : { f: [image 0, image 1], haut: sa première rangée de terre, fenetre: [x, y], cheminee: [x, y] }.
  //   IlePixel.unique({ i, j, hote, etoiles, amis, ouverte, taille?, machines?, betes?, couleurs? })
  var U = 28, uniques = {}, nbUniques = 0
  function graine(t) { var h = 2166136261; for (var k = 0; k < t.length; k++) { h ^= t.charCodeAt(k); h = Math.imul(h, 16777619) } return h >>> 0 }
  function tirage(s) { return function () { s = (s + 0x6D2B79F5) | 0; var t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
  var HERBES = [['#5FA23E', '#4E9433', '#76B84C'], ['#6DAA3A', '#5A9530', '#8DC255'], ['#4F9A48', '#3F8540', '#68B35E']]
  var TOITS = ['#C24E33', '#3E6FB0', '#5E9C3A', '#8E4FB5', '#C98A2E', '#B8404F']
  function couleursDe(x) { return Array.isArray(x.couleurs) ? x.couleurs.filter(function (c) { return /^#[0-9a-fA-F]{6}$/.test(String(c)) }).slice(0, 2) : [] }
  function cleUnique(x) {
    return x.i + ',' + x.j + '|' + x.hote + '|' + Math.floor(Number(x.etoiles) || 0) + '|' + Math.floor(Number(x.amis) || 0) + '|' + (x.ouverte ? 1 : 0) + '|' +
      Math.floor(Number(x.machines) || 0) + '|' + Math.floor(Number(x.betes) || 0) + '|' + (Number(x.taille) || 0) + '|' + couleursDe(x).join('')
  }
  // son dessin est-il déjà en mémoire ? (la carte n'en fabrique que quelques-uns par image : rien ne saccade)
  function uniqueDeja(x) { return !!uniques[cleUnique(x)] }
  function unique(x) {
    var et = Math.max(0, Math.min(5, Math.floor(Number(x.etoiles) || 0))), amis = Math.max(0, Math.min(9, Math.floor(Number(x.amis) || 0)))
    var nm = Math.max(0, Math.floor(Number(x.machines) || 0)), nb = Math.max(0, Math.floor(Number(x.betes) || 0)), ta = Number(x.taille) || 0
    var cou = couleursDe(x), cle = cleUnique(x)
    if (uniques[cle]) return uniques[cle]
    var r = tirage(graine(x.i + ',' + x.j + ',' + String(x.hote || '').toLowerCase()))
    var R = 6.3 + Math.min(2.8, (ta > 0 ? Math.min(1, ta) * 2.2 : et * 0.3) + Math.min(3, amis) * 0.25) + (r() - 0.5) * 0.9
    var a1 = 0.07 + r() * 0.12, a2 = 0.04 + r() * 0.09, a3 = 0.02 + r() * 0.06, p1 = r() * 6.28, p2 = r() * 6.28, p3 = r() * 6.28
    var ex = 0.88 + r() * 0.3, ey = 2.06 - ex, cx = U / 2 + (r() - 0.5), cy = U / 2 + (r() - 0.5)
    var lagon = R > 7.4 && r() < 0.3, lx = cx + (r() - 0.5) * 3, ly = cy + (r() - 0.5) * 3
    var herbe = HERBES[Math.floor(r() * HERBES.length)], y, k
    var terre = []
    for (y = 0; y < U; y++) { terre.push([]); for (k = 0; k < U; k++) {
      var dx = (k + 0.5 - cx) / ex, dy = (y + 0.5 - cy) / ey, an = Math.atan2(dy, dx), d = Math.sqrt(dx * dx + dy * dy)
      var dedans = d < R * (1 + a1 * Math.sin(2 * an + p1) + a2 * Math.sin(3 * an + p2) + a3 * Math.sin(5 * an + p3))
      if (dedans && lagon && Math.sqrt((k + 0.5 - lx) * (k + 0.5 - lx) + (y + 0.5 - ly) * (y + 0.5 - ly)) < 1.9) dedans = false
      terre[y].push(dedans)
    } }
    function t(yy, kk) { return yy >= 0 && yy < U && kk >= 0 && kk < U && terre[yy][kk] }
    function bord(yy, kk) { return !t(yy - 1, kk) || !t(yy + 1, kk) || !t(yy, kk - 1) || !t(yy, kk + 1) }
    function pres(yy, kk, dd) { for (var a = -dd; a <= dd; a++) for (var b = -dd; b <= dd; b++) if (Math.abs(a) + Math.abs(b) <= dd && t(yy + a, kk + b)) return true; return false }
    function herbeIci(yy, kk) { return t(yy, kk) && t(yy - 2, kk) && t(yy + 2, kk) && t(yy, kk - 2) && t(yy, kk + 2) && t(yy - 1, kk - 1) && t(yy + 1, kk + 1) }
    // le fond (le sable, l'herbe), commun aux deux images
    var fond = document.createElement('canvas'); fond.width = U; fond.height = U
    var x0 = fond.getContext('2d'), haut = U
    function px(cv, kk, yy, c) { cv.fillStyle = c; cv.fillRect(kk, yy, 1, 1) }
    for (y = 0; y < U; y++) for (k = 0; k < U; k++) {
      if (!t(y, k)) continue
      if (y < haut) haut = y
      if (bord(y, k)) px(x0, k, y, r() < 0.22 ? '#D6BE78' : '#E8D394')
      else if (!herbeIci(y, k) && (!t(y - 2, k) || !t(y + 2, k) || !t(y, k - 2) || !t(y, k + 2))) px(x0, k, y, r() < 0.25 ? '#E3CF8E' : herbe[2])
      else px(x0, k, y, r() < 0.28 ? herbe[1] : (r() < 0.14 ? herbe[2] : herbe[0]))
    }
    // le lagon : son eau claire au milieu de l'herbe, son sable autour
    if (lagon) for (y = 0; y < U; y++) for (k = 0; k < U; k++) {
      var dl = Math.sqrt((k + 0.5 - lx) * (k + 0.5 - lx) + (y + 0.5 - ly) * (y + 0.5 - ly))
      if (dl < 1.9 && !t(y, k) && pres(y, k, 3)) px(x0, k, y, dl < 1.1 ? '#3FA9C9' : '#6CCFDD')
    }
    var places = []
    for (y = 3; y < U - 3; y++) for (k = 3; k < U - 3; k++) if (herbeIci(y, k)) places.push([k, y])
    var pris = {}
    function libre(kk, yy, l, h) { for (var a = -1; a <= h; a++) for (var b = -1; b <= l; b++) if (pris[(kk + b) + ',' + (yy + a)] || !herbeIci(yy + Math.min(Math.max(a, 0), h - 1), kk + Math.min(Math.max(b, 0), l - 1))) return false; return true }
    function prendre(kk, yy, l, h) { for (var a = 0; a < h; a++) for (var b = 0; b < l; b++) pris[(kk + b) + ',' + (yy + a)] = 1 }
    function auHasard() { return places[Math.floor(r() * places.length)] }
    // les maisons : l'hôte et ses amis (jusqu'à trois toits), la première a sa cheminée et la fenêtre qui s'allume la nuit
    var nMaisons = 1 + Math.min(2, amis), maisons = [], fenetre = null, cheminee = null, essai
    for (essai = 0; essai < 120 && maisons.length < nMaisons; essai++) {
      var pm = auHasard()
      if (!pm || !libre(pm[0], pm[1], 4, 4)) continue
      var toit = TOITS[(graine(String(x.hote || '') + maisons.length) >>> 3) % TOITS.length], sombre = 'rgba(0,0,0,.25)'
      px(x0, pm[0] + 1, pm[1], toit); px(x0, pm[0] + 2, pm[1], toit)
      x0.fillStyle = toit; x0.fillRect(pm[0], pm[1] + 1, 4, 1)
      x0.fillStyle = sombre; x0.fillRect(pm[0] + 1, pm[1], 2, 1)
      x0.fillStyle = '#EADBB6'; x0.fillRect(pm[0], pm[1] + 2, 4, 2)
      px(x0, pm[0] + 1, pm[1] + 3, '#6B4423'); px(x0, pm[0] + 3, pm[1] + 2, '#7FB8D8')
      x0.fillStyle = 'rgba(20,40,10,.32)'; x0.fillRect(pm[0] + 4, pm[1] + 1, 1, 3)
      if (!maisons.length) { px(x0, pm[0] + 3, pm[1] - 1, '#7A7A7A'); fenetre = [pm[0] + 3, pm[1] + 2]; cheminee = [pm[0] + 3, pm[1] - 1] }
      prendre(pm[0], pm[1], 5, 4); maisons.push(pm)
    }
    // le chemin de terre : de la porte de la maison vers le sud, jusqu'à la plage (ou le ponton)
    var ponX = Math.round(cx), ponY = 0
    for (y = U - 1; y > 0; y--) if (t(y, ponX)) { ponY = y; break }
    if (maisons.length) {
      var ky = maisons[0][1] + 4, kx = maisons[0][0] + 1
      for (var pas = 0; pas < 40 && t(ky, kx) && !bord(ky, kx); pas++) {
        if (!pris[kx + ',' + ky]) px(x0, kx, ky, r() < 0.3 ? '#8A6848' : '#9B7653')
        if (x.ouverte && kx !== ponX && r() < 0.5) kx += kx < ponX ? 1 : -1; else ky++
      }
    }
    // les arbres : chênes ronds, sapins, bouleaux, et des cerisiers sur les belles îles
    var nArbres = 2 + Math.max(0, Math.floor(R - 6.2)) + Math.floor(r() * 3)
    for (essai = 0; essai < 160 && nArbres > 0; essai++) {
      var pa = auHasard()
      if (!pa || !libre(pa[0], pa[1], 3, 3)) continue
      var sorte = et >= 4 && r() < 0.35 ? 3 : Math.floor(r() * 3)
      x0.fillStyle = 'rgba(20,40,10,.32)'; x0.fillRect(pa[0] + 1, pa[1] + 2, 3, 2)
      if (sorte === 1) {       // le sapin
        px(x0, pa[0] + 1, pa[1], '#2D5A3A'); x0.fillStyle = '#244A2F'; x0.fillRect(pa[0], pa[1] + 1, 3, 1); px(x0, pa[0] + 1, pa[1] + 2, '#4A3220')
      } else if (sorte === 2) { // le bouleau
        x0.fillStyle = '#8BC34A'; x0.fillRect(pa[0], pa[1], 3, 2); px(x0, pa[0] + 2, pa[1], '#A8D86A'); px(x0, pa[0] + 1, pa[1] + 2, '#E8E8E0')
      } else {                  // le chêne, ou le cerisier
        var c1 = sorte === 3 ? '#E98DB5' : '#2F6B22', c2 = sorte === 3 ? '#F7B8D2' : '#4FA238'
        x0.fillStyle = c1; x0.fillRect(pa[0], pa[1] + 1, 3, 1); x0.fillRect(pa[0] + 1, pa[1], 1, 3)
        px(x0, pa[0], pa[1], c1); px(x0, pa[0] + 2, pa[1], c1); px(x0, pa[0] + 1, pa[1], c2); px(x0, pa[0] + 1, pa[1] + 2, '#5A3A1C')
      }
      prendre(pa[0], pa[1], 3, 3); nArbres--
    }
    // ses machines (l'API les compte) : de petits blocs de fer à la lueur d'or
    for (var nmach = Math.min(4, Math.ceil(nm / 3)), em = 0; em < 120 && nmach > 0; em++) {
      var pq = auHasard()
      if (!pq || !libre(pq[0], pq[1], 2, 2)) continue
      x0.fillStyle = '#7E838C'; x0.fillRect(pq[0], pq[1], 2, 2); px(x0, pq[0], pq[1], '#A5AAB3'); px(x0, pq[0] + 1, pq[1] + 1, '#FFD75E')
      prendre(pq[0], pq[1], 2, 2); nmach--
    }
    // ses bêtes (l'API les compte) : moutons, vaches, cochons, poules, en points sur l'herbe
    var BETES = [['#F2F2F2', '#5C5C5C'], ['#4A3326', '#F0F0F0'], ['#F4A6A6', '#E58C8C'], ['#FFFFFF', '#E8604C']]
    for (var nbe = Math.min(6, nb), eb = 0; eb < 120 && nbe > 0; eb++) {
      var pb = auHasard()
      if (!pb || pris[pb[0] + ',' + pb[1]] || pris[(pb[0] + 1) + ',' + pb[1]]) continue
      var be = BETES[Math.floor(r() * BETES.length)]
      px(x0, pb[0], pb[1], be[0]); px(x0, pb[0] + 1, pb[1], be[1])
      pris[pb[0] + ',' + pb[1]] = 1; pris[(pb[0] + 1) + ',' + pb[1]] = 1; nbe--
    }
    // les fleurs : la beauté se voit
    var FLEURS = ['#FFE36E', '#FF8FB1', '#FFFFFF', '#B58CFF', '#FF7A5C']
    for (var ef = 0; ef < et * 7; ef++) {
      var pf = auHasard()
      if (!pf || pris[pf[0] + ',' + pf[1]]) continue
      px(x0, pf[0], pf[1], FLEURS[Math.floor(r() * Math.min(FLEURS.length, 1 + et))]); pris[pf[0] + ',' + pf[1]] = 1
    }
    // le fanion : ses couleurs (le jeu) ou celle de ses étoiles, au bord nord-est
    var fy = 0, fk = 0
    for (y = 3; y < U && !fy; y++) for (k = U - 4; k > 3; k--) if (t(y, k) && t(y + 3, k) && !pris[k + ',' + y]) { fy = y; fk = k; break }
    if (fy) {
      var fa = cou[0] || COULEURS[et] || COULEURS[0], fb = cou[1] || fa
      x0.fillStyle = '#3F2612'; x0.fillRect(fk, fy - 3, 1, 6)
      x0.fillStyle = fa; x0.fillRect(fk + 1, fy - 3, 3, 1); x0.fillStyle = fb; x0.fillRect(fk + 1, fy - 2, 3, 1); px(x0, fk + 1, fy - 1, fa)
      if (fy - 3 < haut) haut = fy - 3
    }
    // ouverte aux visites : le ponton de planches au sud, et une barque amarrée
    if (x.ouverte && ponY) {
      x0.fillStyle = '#8C5A2E'; x0.fillRect(ponX - 1, ponY, 2, Math.min(5, U - ponY))
      x0.fillStyle = '#6B4423'; for (y = ponY + 1; y < Math.min(U, ponY + 5); y += 2) x0.fillRect(ponX - 1, y, 2, 1)
      var bx = ponX + 2, by = Math.min(U - 3, ponY + 3)
      x0.fillStyle = '#7A4A26'; x0.fillRect(bx, by, 3, 2); px(x0, bx + 1, by, '#C58B52'); px(x0, bx + 1, by - 1, '#F4EAFF')
    }
    // les deux images : l'eau autour (hauts-fonds, écume), puis le fond
    var dist = new Uint8Array(U * U)
    for (y = 0; y < U; y++) for (k = 0; k < U; k++) if (!t(y, k)) dist[y * U + k] = pres(y, k, 1) ? 1 : (pres(y, k, 2) ? 2 : (pres(y, k, 3) ? 3 : 0))
    var f = [], im
    for (im = 0; im < 2; im++) {
      var c = document.createElement('canvas'); c.width = U; c.height = U
      var g2 = c.getContext('2d')
      for (y = 0; y < U; y++) for (k = 0; k < U; k++) {
        if (t(y, k)) continue
        var dd = dist[y * U + k], p1 = dd === 1, p2 = dd === 2, p3 = dd === 3
        if (im === 0) { if (p1) px(g2, k, y, 'rgba(240,252,255,.7)'); else if (p2) px(g2, k, y, 'rgba(120,220,228,.36)'); else if (p3) px(g2, k, y, 'rgba(110,210,220,.16)') }
        else { if (p1) px(g2, k, y, 'rgba(120,220,228,.42)'); else if (p2) px(g2, k, y, 'rgba(236,250,255,.42)'); else if (p3) px(g2, k, y, 'rgba(110,210,220,.16)') }
      }
      g2.drawImage(fond, 0, 0)
      f.push(c)
    }
    var rendu = { f: f, haut: haut, fenetre: fenetre, cheminee: cheminee, U: U }
    if (nbUniques > 1500) { uniques = {}; nbUniques = 0 }
    uniques[cle] = rendu; nbUniques++
    return rendu
  }
  // (af, 23:2x) CE QUE L'API DIT DE L'ÎLE (b5 : chaque île de /api/carte porte dessin: { taille, machines, betes } | null, des
  // valeurs brutes de ses classements : la surface, la valeur des machines, celle des bêtes ; null hors des cent premiers) : chacune
  // rapportée à la plus grande de la carte. La taille grandit l'île ; les machines : 1 à 4 blocs ; les bêtes : 1 à 6 ; une valeur
  // absente ne dessine rien (jamais inventée). noterDessins(liste) à chaque lecture de l'API ; pourDessin(x) avant unique().
  var maxD = { taille: 0, machines: 0, betes: 0 }, versionD = 0
  function noterDessins(liste) {
    for (var k = 0; k < (liste || []).length; k++) {
      var d = liste[k] && liste[k].dessin
      if (!d) continue
      for (var c in maxD) if (Number(d[c]) > maxD[c]) { maxD[c] = Number(d[c]); versionD++ }
    }
  }
  function part(v, m) { return Number(v) > 0 && m > 0 ? Math.min(1, Number(v) / m) : 0 }
  function pourDessin(x) {
    if (x._d && x._dv === versionD) return x._d
    var d = x.dessin || {}, pm = part(d.machines, maxD.machines), pb = part(d.betes, maxD.betes)
    x._d = { i: x.i, j: x.j, hote: x.hote, etoiles: x.etoiles, amis: x.amis, ouverte: x.ouverte, couleurs: x.couleurs,
      taille: Math.round(part(d.taille, maxD.taille) * 4) / 4, machines: pm > 0 ? 3 * Math.min(4, 1 + Math.floor(pm * 3.99)) : 0, betes: pb > 0 ? Math.min(6, 1 + Math.floor(pb * 5.99)) : 0 }
    x._dv = versionD
    return x._d
  }
  window.IlePixel = { sprite: sprite, grande: grande, grandeDeja: grandeDeja, unique: unique, uniqueDeja: uniqueDeja, noterDessins: noterDessins, pourDessin: pourDessin, COULEURS: COULEURS }
})()
