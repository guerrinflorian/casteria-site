// L'APPEL DE LA CARTE (carte.html, « Ton île ici ? ») : une île de cinq étoiles dessinée comme sur la carte (js/ile.js),
// agrandie au pixel près, qui berce doucement (immobile pour qui demande moins de mouvement)
;(function () {
  'use strict'
  var c = document.getElementById('appel-dessin')
  if (!c || !window.IlePixel) return
  c.getContext('2d').drawImage(IlePixel.sprite(2, 1, 5, true), 0, 0)
})()
