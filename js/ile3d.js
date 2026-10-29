// LA PAGE D'UNE ÎLE EN 3D (ile.html, /ile/<i>,<j> ; 29/10/2026, 67). La VUE est celle de l'agent de la 3D : sa fiche
// /api/ile/<i>,<j>/3d ({ nom, hote, ouverte, peut_voir, pourquoi, vue, carte, rendu, actualisable, prochaine_actualisation })
// et sa carte BlueMap dans une iframe (même origine). Ici, l'HABIT : le nom, l'hôte et ses amis, les étoiles et la place
// au Classement des îles (CasteriaVivant.carte, par l'hôte), trois façons de regarder (la caméra de BlueMap, par le hash
// de l'iframe), « Rafraîchir mon île » pour l'hôte, une île fermée qui ne montre rien, « Ton île ici ? » pour un visiteur.
;(function () {
  'use strict'
  var A = window.CasteriaApi, V = window.CasteriaVivant
  if (!A || !V) return
  var $ = function (id) { return document.getElementById(id) }
  var m = location.pathname.match(/\/ile\/(-?\d{1,4}),(-?\d{1,4})\/?$/) || location.search.match(/[?&]case=(-?\d{1,4}),(-?\d{1,4})/)
  var ESPACE = 320
  // les trois caméras (le hash de BlueMap : carte:x:y:z:distance:rotation:angle:inclinaison:ortho:mode) autour du centre de
  // l'emprise (36 blocs à l'est du centre de la case, comme la démo de l'agent)
  var REGARDS = {
    trois_quarts: function (x, z) { return [x, 63, z + 2, 145, 0.75, 0.92, 0, 0, 'perspective'] },
    // (67, 29/10 ; le proprietaire : « Du ciel » montrait un cadre bleu vide : la vue a plat, orthographique, de BlueMap ne
    // dessine rien ici) d'en haut EN PERSPECTIVE, presque a la verticale : l'ile entiere au centre
    ciel: function (x, z) { return [x, 63, z + 2, 230, 0, 0.01, 0, 0, 'perspective'] },
    promenade: function (x, z) { return [x, 66, z + 20, 56, 0.35, 1.32, 0, 0, 'perspective'] }
  }
  var iframe = null, fiche = null, i = 0, j = 0

  // (une ile : « la 1re », comme sa fiche)
  function rang(r) { return r === 1 ? '1re' : A.nombre(r) + 'e' }
  function etoiles(e) { return String(Math.round(Number(e || 0) * 10) / 10).replace('.', ',') }
  function message(t, avecCadenas) {
    var b = $('message')
    A.vider(b)
    if (avecCadenas) { var c = A.el('span', 'cadenas'); c.setAttribute('aria-hidden', 'true'); b.appendChild(c) }
    b.appendChild(A.el('p', '', A.texte(t)))
    b.hidden = false
    // (67, 29/10) une phrase a la place de la vue : pas de « Glisse pour tourner autour » sous elle
    $('geste').hidden = true
  }
  function hashDe(nom) {
    var x = i * ESPACE + 36, z = j * ESPACE, r = REGARDS[nom](x, z)
    // (67, 29/10) une vue ETROITE (le telephone) : BlueMap garde l'angle vertical, l'ile serait coupee sur les cotes ; la
    // camera recule a la mesure de la largeur (jusqu'a deux fois plus loin)
    var v = $('vue'), l = v ? v.clientWidth : 0, hh = v ? v.clientHeight : 0
    if (l > 0 && hh > 0 && l / hh < 1.4) r[3] = Math.round(r[3] * Math.min(2, 1.4 / (l / hh)))
    return '#' + [fiche.carte || 'iles'].concat(r).join(':')
  }
  function regarder(nom) {
    if (!iframe || !REGARDS[nom]) return
    var h = hashDe(nom)
    try { iframe.contentWindow.location.hash = h } catch (e) { iframe.src = fiche.vue + h }
    ;[].forEach.call(document.querySelectorAll('.regard'), function (b) { b.setAttribute('aria-pressed', b.dataset.regard === nom ? 'true' : 'false') })
  }
  ;[].forEach.call(document.querySelectorAll('.regard'), function (b) { b.addEventListener('click', function () { regarder(b.dataset.regard) }) })

  // (67, 29/10 ; l'audit du site, 12) une ile en pixels, la GRANDE d'af (js/ile.js : chaque pixel plein, a sa taille), sinon
  // la petite de la carte
  function peindre(c, ii, jj, et, o) {
    if (!window.IlePixel) return
    var g = IlePixel.grande ? IlePixel.grande(ii, jj, et, o) : IlePixel.sprite(ii, jj, et, o)
    c.width = g.width; c.height = g.height
    c.getContext('2d').drawImage(g, 0, 0)
  }
  // (67, 29/10) une ile pas encore dessinee : la phrase et sa petite ile en pixels, qui berce
  function seDessine() {
    var b = $('message')
    A.vider(b)
    var c = document.createElement('canvas')
    c.className = 'ile-berce'; c.setAttribute('aria-hidden', 'true')
    peindre(c, i, j, 5, true)
    b.appendChild(c)
    b.appendChild(A.el('p', 'ile-se-dessine', 'Cette île se dessine : reviens dans quelques minutes.'))
    b.appendChild(A.el('p', 'note', 'Chaque île de Casteria passe en 3D l\'une après l\'autre.'))
    b.hidden = false
    $('geste').hidden = true
  }
  // sans île sur cette case : une place libre
  function libre() {
    document.title = 'Une place libre de Casteria'
    $('case').textContent = 'Case ' + i + ', ' + j
    $('nom').textContent = 'Cette place est libre'
    $('hote').textContent = 'Aucune île ici pour l\'instant.'
    message('Pas encore d\'île sur cette case : la prochaine peut être la tienne.', false)
    $('appel').hidden = false
  }
  // (67, 29/10 ; l'audit du site, 20) une case vide DANS l'archipel : une place libre ; au-dela de la grille (une case de
  // plus autour des iles) : elle n'existe pas sur la carte
  function libreOuHors() {
    V.carte('iles').then(function (rc) {
      var e = rc.statut === 200 && rc.corps ? rc.corps.etendue : null
      if (e && e.de && e.a && (i < e.de[0] - 1 || i > e.a[0] + 1 || j < e.de[1] - 1 || j > e.a[1] + 1)) {
        document.title = 'Une case hors de la carte de Casteria'
        $('case').textContent = 'Case ' + i + ', ' + j
        $('nom').textContent = 'Cette case n\'existe pas'
        $('hote').textContent = 'Elle est au-delà de la carte : l\'archipel ne va pas jusque-là.'
        message('Aucune île ici : la carte montre toutes les îles de Casteria.', false)
        var c = A.el('a', 'bouton bouton-or petit', 'Voir la carte'); c.href = 'carte.html'; $('message').appendChild(c)
        $('appel').hidden = false
        return
      }
      libre()
    })
  }
  function haut(f, x) {
    document.title = f.nom + ' : l\'île de ' + f.hote + ' en 3D sur Casteria'
    $('case').textContent = 'Une île de Casteria'
    $('nom').textContent = f.nom
    var h = $('hote')
    A.vider(h)
    var t = A.el('span', 'ile-hote-tete'); h.appendChild(t)
    if (window.Tete) Tete.poser(t, x && x.peau ? x.peau : '/api/peau/' + f.hote)
    // (67, 29/10 ; la tete : sous le titre « Île de _Floskyl_ », la ligne « L'île de _Floskyl_ » repetait le nom) le chef de
    // l'ile seul : sa tete, son pseudo, « Chef de l'île » ; ses amis sont dans « Qui y vit »
    var a = A.el('a', 'ile-chef', f.hote); a.href = 'joueur/' + encodeURIComponent(f.hote); h.appendChild(a)
    h.appendChild(A.el('span', 'ile-chef-role', 'Chef de l\'île'))
    var b = $('badges')
    A.vider(b)
    b.appendChild(A.el('span', 'badge ' + (f.ouverte ? 'ouverte' : 'fermee'), f.ouverte ? 'Ouverte aux visites' : 'Fermée aux visites'))
    if (x && x.en_ligne > 0) b.appendChild(A.el('span', 'badge vivante', x.en_ligne + ' joueur' + (x.en_ligne > 1 ? 's' : '') + ' dessus'))
    if (x) {
      $('chiffres').hidden = false
      var e = $('etoiles'), n = Math.max(0, Math.min(5, Math.floor(Number(x.etoiles) || 0)))
      A.vider(e)
      // (67, 29/10 ; l'audit du site, 11) sans etoile : la phrase, jamais cinq etoiles grises et un « 0 »
      if (!(Number(x.etoiles) >= 0.05)) { e.appendChild(A.el('span', 'etoiles-aucune', 'Pas encore d\'étoile de beauté')); e.removeAttribute('aria-label') }
      else {
        for (var k = 0; k < 5; k++) e.appendChild(A.el('span', 'etoile' + (k < n ? ' pleine' : ''), '★'))
        e.appendChild(A.el('b', 'etoiles-nb', etoiles(x.etoiles)))
        e.setAttribute('aria-label', etoiles(x.etoiles) + ' étoiles sur 5')
      }
      $('place').textContent = x.classement ? rang(x.classement.rang) + ' au Classement des îles · ' + A.nombre(x.classement.points) + ' / ' + A.nombre(x.classement.sur || 400) + ' points' : ''
    }
  }
  function vue(f) {
    var v = $('vue')
    if (!f.peut_voir) {
      message(f.pourquoi === 'non_connecte'
        ? 'Cette île est fermée aux visites. Si c\'est la tienne, ou celle d\'un ami qui t\'a donné le droit Venir, connecte-toi avec ton compte du jeu.'
        : 'Cette île est fermée aux visites : seuls son hôte et ses amis qui ont le droit Venir la voient.', true)
      if (f.pourquoi === 'non_connecte') { var c = A.el('a', 'bouton bouton-or petit', 'Me connecter'); c.href = 'connexion.html'; $('message').appendChild(c) }
      $('geste').hidden = true
      return
    }
    // sans WebGL : la petite île en pixels, et la phrase
    var ok = false
    try { var cv = document.createElement('canvas'); ok = !!(window.WebGLRenderingContext && (cv.getContext('webgl2') || cv.getContext('webgl'))) } catch (e) { ok = false }
    if (!ok) { message('La vue 3D ne s\'ouvre pas sur cet appareil : il lui faut WebGL.', false); return }
    // (67, 29/10 ; l'audit du site, 1) pas encore dessinee (le premier rendu, une ile neuve) : jamais un cadre vide ni une
    // date fausse ; « se dessine », une petite ile qui berce
    if (typeof f.vue !== 'string' || !f.vue || !f.carte) { seDessine(); return }
    $('message').hidden = true
    iframe = document.createElement('iframe')
    iframe.title = f.nom + ' en 3D'
    iframe.setAttribute('allow', 'fullscreen')
    iframe.src = f.vue + hashDe('trois_quarts')
    v.appendChild(iframe)
    $('regards').hidden = false
    $('pied').hidden = false
    var quand = f.rendu ? Date.parse(f.rendu) : NaN
    $('dessinee').textContent = isFinite(quand) && quand > 0 ? 'Dessinée ' + A.date(f.rendu, true) : ''
    if (f.actualisable) {
      var r = $('rafraichir')
      r.hidden = false
      r.addEventListener('click', function () {
        r.disabled = true
        V.ile3dActualiser(i, j).then(function (q) {
          r.hidden = true
          $('rafraichi').textContent = (q.corps && q.corps.message) || (q.statut === 200 ? 'C\'est demandé : ta nouvelle île arrive dans quelques minutes.' : 'Pas maintenant : réessaie un peu plus tard.')
        })
      })
    } else if (f.prochaine_actualisation) {
      var mn = Math.max(1, Math.ceil((Date.parse(f.prochaine_actualisation) - Date.now()) / 60000))
      $('rafraichi').textContent = 'Prochaine mise à jour possible dans ' + mn + ' min'
    }
  }

  if (!m) { $('nom').textContent = 'Quelle île ?'; message('Choisis une île sur la carte.', false); $('appel').hidden = false; return }
  i = Number(m[1]); j = Number(m[2])
  Promise.all([V.ile3d(i, j), A.moi()]).then(function (rs) {
    var r = rs[0]
    if (r.statut === 404) { libreOuHors(); return }
    if (r.statut !== 200) { message('L\'île ne répond pas pour l\'instant. Réessaie dans une minute.', false); return }
    fiche = r.corps
    // un visiteur (pas connecté) : « Ton île ici ? »
    if (rs[1].statut !== 200) $('appel').hidden = false
    V.carte('iles', { hote: fiche.hote }).then(function (c) {
      var x = c.statut === 200 && c.corps.iles ? c.corps.iles[0] : null
      haut(fiche, x)
      vue(fiche)
      // (67, 29/10) ses chiffres, qui y vit, sa place sur la carte, ses betes (js/ile_fiche.js)
      if (window.IleFiche) IleFiche.remplir({ fiche: fiche, x: x, i: i, j: j })
    })
  })
  // l'île de l'appel, en pixels
  var ap = $('appel-ile')
  if (ap) peindre(ap, 1, 2, 5, true)
})()
