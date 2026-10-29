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
  window.IlePixel = { sprite: sprite, grande: grande, COULEURS: COULEURS }
})()
