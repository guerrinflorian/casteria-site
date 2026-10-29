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
  window.IlePixel = { sprite: sprite, COULEURS: COULEURS }
})()
