// L'IMAGE DE PARTAGE D'UN PROFIL (partage.html?p=<pseudo>, 1200 x 630) : remplie par /api/joueur/<pseudo>/public, puis
// data-pret="1" sur <html> quand la peau est dessinée (l'API attend ce signe pour faire sa photo).
;(function () {
  'use strict'
  var $ = function (id) { return document.getElementById(id) }
  var q = location.search.match(/[?&]p=([A-Za-z0-9_]{3,16})/), pseudo = q ? q[1] : ''
  function pret() { document.documentElement.setAttribute('data-pret', '1') }
  function nombre(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') }
  function echapper(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] }) }
  function etoiles(n) { var t = ''; for (var k = 0; k < 5; k++) t += '<span class="etoile' + (k < n ? ' pleine' : '') + '">★</span>'; return t }
  function rang(n) { return n === 1 ? '1er' : n + 'e' }
  if (!pseudo || !window.CasteriaVivant) { pret(); return }
  CasteriaVivant.joueurPublic(pseudo).then(function (r) {
    if (r.statut !== 200) throw new Error('profil')
    var j = r.corps
    $('pseudo').textContent = j.pseudo
    $('titre').textContent = j.titre || 'Joueur de Casteria'
    $('adresse').textContent = 'casteria.fr/joueur/' + j.pseudo
    var b = ''
    if (j.equipe) b += '<span class="badge equipe">' + echapper(j.equipe.nom) + '</span>'
    if (j.grade) b += '<span class="badge">' + echapper(j.grade.nom) + '</span>'
    $('badges').innerHTML = b
    if (j.niveau) {
      $('niveau-n').textContent = 'Niveau ' + j.niveau.n
      $('niveau-part').style.width = (j.niveau.max ? 100 : Math.round(Math.max(0, Math.min(1, j.niveau.part)) * 100)) + '%'
    } else $('niveau').hidden = true
    var t = []
    if (j.general) t.push([rang(j.general.rang), 'au classement général'])
    if (j.ile) t.push([{ etoiles: Math.max(0, Math.min(5, j.ile.etoiles)) }, 'l\'île ' + j.ile.nom])
    if (j.boss && j.boss.victoires > 0) t.push([nombre(j.boss.victoires), 'victoire' + (j.boss.victoires > 1 ? 's' : '') + ' contre les boss'])
    // (sans victoire : son temps de jeu, jamais « 0 »)
    else if (j.temps_de_jeu_min) t.push([nombre(Math.max(1, Math.floor(j.temps_de_jeu_min / 60))) + ' h', 'de jeu sur Casteria'])
    $('tuiles').innerHTML = t.slice(0, 3).map(function (x) {
      var haut = typeof x[0] === 'object' ? etoiles(x[0].etoiles) : echapper(x[0])
      return '<li><b>' + haut + '</b><span>' + echapper(x[1]) + '</span></li>'
    }).join('')
    var c = Tete.corps($('personnage'), j.peau, j.modele)
    // la peau est dessinée au chargement de son image : on attend deux images de l'écran, puis le signe
    var essais = 0
    ;(function attendre() {
      var px = c.getContext('2d').getImageData(8, 4, 1, 1).data
      if (px[3] > 0 || ++essais > 60) { requestAnimationFrame(pret); return }
      setTimeout(attendre, 50)
    })()
  }).catch(function () { $('pseudo').textContent = pseudo; pret() })
})()
