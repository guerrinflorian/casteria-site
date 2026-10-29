// L'APPEL DE LA CARTE (carte.html, « Ton île ici ? ») : une île de cinq étoiles dessinée comme sur la carte (js/ile.js),
// agrandie au pixel près, qui berce doucement (immobile pour qui demande moins de mouvement)
;(function () {
  'use strict'
  var c = document.getElementById('appel-dessin')
  if (!c || !window.IlePixel) return
  // (67, 29/10 ; l'audit du site, 12) la grande ile d'af (js/ile.js), chaque pixel plein, a sa taille : jamais le petit sprite agrandi
  var g = IlePixel.grande ? IlePixel.grande(2, 1, 5, true) : IlePixel.sprite(2, 1, 5, true)
  c.width = g.width; c.height = g.height
  c.getContext('2d').drawImage(g, 0, 0)
})()
