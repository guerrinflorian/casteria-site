// L'APPEL DE LA CARTE (carte.html, « Ton île ici ? ») : une île de cinq étoiles dessinée comme sur la carte (js/ile.js),
// agrandie au pixel près, qui berce doucement (immobile pour qui demande moins de mouvement)
;(function () {
  'use strict'
  var c = document.getElementById('appel-dessin')
  if (!c || !window.IlePixel) return
  // (67, 29/10 ; l'audit du site, 12) la grande ile d'af (js/ile.js), chaque pixel plein, a sa taille : jamais le petit sprite agrandi
  // (af, 23:3x) l'île UNIQUE (IlePixel.unique, comme sur la carte) d'une belle île rêvée : cinq étoiles, ouverte, deux amis ; une
  // illustration, aucun joueur ; son écume bat doucement (deux images, immobile pour qui demande moins de mouvement)
  var u = IlePixel.unique ? IlePixel.unique({ i: 4, j: 1, hote: 'Essai4', etoiles: 5, amis: 2, ouverte: true }) : null
  var g = u ? u.f[0] : (IlePixel.grande ? IlePixel.grande(2, 1, 5, true) : IlePixel.sprite(2, 1, 5, true))
  c.width = g.width; c.height = g.height
  var k = c.getContext('2d')
  k.drawImage(g, 0, 0)
  if (!u || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return
  var n = 0
  setInterval(function () { if (document.hidden) return; n = 1 - n; k.clearRect(0, 0, c.width, c.height); k.drawImage(u.f[n], 0, 0) }, 870)
})()
