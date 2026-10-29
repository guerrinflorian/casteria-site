// LA TÊTE D'UN JOUEUR, découpée de sa peau (64 x 64, la disposition du jeu) : le visage (8 x 8, en 8,8) et son calque
// (le chapeau, en 40,8) dans un petit canvas de 8 x 8, à poser agrandi sans lissage. Une peau lue une fois par adresse.
//   Tete.image(adresse, quandPrete) : le canvas si la peau est déjà lue, sinon null (quandPrete() à son arrivée)
//   Tete.poser(element, adresse)    : un <canvas class="tete-pixel"> dans element, à la taille que lui donne la feuille de style
;(function () {
  'use strict'
  var lues = {}
  function decouper(img) {
    var c = document.createElement('canvas')
    c.width = 8; c.height = 8
    var g = c.getContext('2d')
    g.imageSmoothingEnabled = false
    g.drawImage(img, 8, 8, 8, 8, 0, 0, 8, 8)
    g.drawImage(img, 40, 8, 8, 8, 0, 0, 8, 8)
    return c
  }
  function image(adresse, quandPrete) {
    var url = window.CasteriaApi ? CasteriaApi.peau(adresse) : adresse
    var l = lues[url]
    if (l && l.tete) return l.tete
    if (!l) {
      l = lues[url] = { tete: null, attente: [] }
      var img = new Image()
      img.decoding = 'async'
      img.onload = function () {
        l.tete = decouper(img)
        var a = l.attente; l.attente = []
        for (var i = 0; i < a.length; i++) a[i](l.tete)
      }
      img.onerror = function () {
        // sans peau lisible : la peau de Casteria
        if (url.indexOf('casteria-defaut') < 0) img.src = 'assets/peaux/casteria-defaut.png'
      }
      img.src = url
    }
    if (quandPrete) l.attente.push(quandPrete)
    return null
  }
  function poser(el, adresse) {
    var c = document.createElement('canvas')
    c.className = 'tete-pixel'
    c.width = 8; c.height = 8
    c.setAttribute('aria-hidden', 'true')
    el.appendChild(c)
    function peindre(t) { c.getContext('2d').drawImage(t, 0, 0) }
    var t = image(adresse, peindre)
    if (t) peindre(t)
    return c
  }
  // LE JOUEUR DE FACE, en entier (16 x 32) : la tête, le corps, les bras (4 pixels de large, 3 pour le modèle « fin »), les
  // jambes, chaque partie avec son calque (le chapeau, la veste, les manches, le pantalon)
  function corps(el, adresse, modele) {
    var c = document.createElement('canvas')
    c.className = 'corps-pixel'
    c.width = 16; c.height = 32
    c.setAttribute('aria-hidden', 'true')
    el.appendChild(c)
    var url = window.CasteriaApi ? CasteriaApi.peau(adresse) : adresse, img = new Image()
    img.onload = function () {
      var g = c.getContext('2d'), b = modele === 'fin' ? 3 : 4, vieille = img.height === 32
      g.imageSmoothingEnabled = false
      function part(sx, sy, w, h, dx, dy) { g.drawImage(img, sx, sy, w, h, dx, dy, w, h) }
      // [source, calque] de chaque partie (une vieille peau 64 x 32 : le bras et la jambe gauches copient les droits)
      part(8, 8, 8, 8, 4, 0); part(40, 8, 8, 8, 4, 0)
      part(20, 20, 8, 12, 4, 8); if (!vieille) part(20, 36, 8, 12, 4, 8)
      part(44, 20, b, 12, 4 - b, 8); if (!vieille) part(44, 36, b, 12, 4 - b, 8)
      if (vieille) part(44, 20, b, 12, 12, 8); else { part(36, 52, b, 12, 12, 8); part(52, 52, b, 12, 12, 8) }
      part(4, 20, 4, 12, 4, 20); if (!vieille) part(4, 36, 4, 12, 4, 20)
      if (vieille) part(4, 20, 4, 12, 8, 20); else { part(20, 52, 4, 12, 8, 20); part(4, 52, 4, 12, 8, 20) }
    }
    img.onerror = function () { if (url.indexOf('casteria-defaut') < 0) img.src = url = 'assets/peaux/casteria-defaut.png' }
    img.src = url
    return c
  }
  window.Tete = { image: image, poser: poser, corps: corps }
})()
