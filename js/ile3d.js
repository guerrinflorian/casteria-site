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
    trois_quarts: function (x, z) { return [x, 64, z, 210, 0.75, 0.95, 0, 0, 'perspective'] },
    ciel: function (x, z) { return [x, 64, z, 260, 0, 0, 0, 1, 'flat'] },
    promenade: function (x, z) { return [x, 66, z + 20, 56, 0.35, 1.32, 0, 0, 'perspective'] }
  }
  var iframe = null, fiche = null, i = 0, j = 0

  function rang(r) { return r === 1 ? '1er' : A.nombre(r) + 'e' }
  function etoiles(e) { return String(Math.round(Number(e || 0) * 10) / 10).replace('.', ',') }
  function message(t, avecCadenas) {
    var b = $('message')
    A.vider(b)
    if (avecCadenas) { var c = A.el('span', 'cadenas'); c.setAttribute('aria-hidden', 'true'); b.appendChild(c) }
    b.appendChild(A.el('p', '', A.texte(t)))
    b.hidden = false
  }
  function hashDe(nom) {
    var x = i * ESPACE + 36, z = j * ESPACE
    return '#' + [fiche.carte || 'iles'].concat(REGARDS[nom](x, z)).join(':')
  }
  function regarder(nom) {
    if (!iframe || !REGARDS[nom]) return
    var h = hashDe(nom)
    try { iframe.contentWindow.location.hash = h } catch (e) { iframe.src = fiche.vue + h }
    ;[].forEach.call(document.querySelectorAll('.regard'), function (b) { b.setAttribute('aria-pressed', b.dataset.regard === nom ? 'true' : 'false') })
  }
  ;[].forEach.call(document.querySelectorAll('.regard'), function (b) { b.addEventListener('click', function () { regarder(b.dataset.regard) }) })

  // sans île sur cette case : une place libre
  function libre() {
    document.title = 'Une place libre de Casteria'
    $('case').textContent = 'Case ' + i + ', ' + j
    $('nom').textContent = 'Cette place est libre'
    $('hote').textContent = 'Aucune île ici pour l\'instant.'
    message('Pas encore d\'île sur cette case : la prochaine peut être la tienne.', false)
    $('appel').hidden = false
  }
  function haut(f, x) {
    document.title = f.nom + ' : l\'île de ' + f.hote + ' en 3D sur Casteria'
    $('case').textContent = 'Une île de Casteria'
    $('nom').textContent = f.nom
    var h = $('hote')
    A.vider(h)
    var t = A.el('span', 'ile-hote-tete'); h.appendChild(t)
    if (window.Tete) Tete.poser(t, x && x.peau ? x.peau : '/api/peau/' + f.hote)
    h.appendChild(document.createTextNode('L\'île de '))
    var a = A.el('a', '', f.hote); a.href = 'joueur/' + encodeURIComponent(f.hote); h.appendChild(a)
    if (x && x.amis) h.appendChild(document.createTextNode(', avec ' + x.amis + ' ami' + (x.amis > 1 ? 's' : '')))
    var b = $('badges')
    A.vider(b)
    b.appendChild(A.el('span', 'badge ' + (f.ouverte ? 'ouverte' : 'fermee'), f.ouverte ? 'Ouverte aux visites' : 'Fermée aux visites'))
    if (x && x.en_ligne > 0) b.appendChild(A.el('span', 'badge vivante', x.en_ligne + ' joueur' + (x.en_ligne > 1 ? 's' : '') + ' dessus'))
    if (x) {
      $('chiffres').hidden = false
      var e = $('etoiles'), n = Math.max(0, Math.min(5, Math.floor(Number(x.etoiles) || 0)))
      A.vider(e)
      for (var k = 0; k < 5; k++) e.appendChild(A.el('span', 'etoile' + (k < n ? ' pleine' : ''), '★'))
      e.appendChild(A.el('b', 'etoiles-nb', etoiles(x.etoiles)))
      e.setAttribute('aria-label', etoiles(x.etoiles) + ' étoiles sur 5')
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
    $('message').hidden = true
    iframe = document.createElement('iframe')
    iframe.title = f.nom + ' en 3D'
    iframe.setAttribute('allow', 'fullscreen')
    iframe.src = f.vue + hashDe('trois_quarts')
    v.appendChild(iframe)
    $('regards').hidden = false
    $('pied').hidden = false
    $('dessinee').textContent = 'Dessinée ' + A.date(f.rendu, true)
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
    if (r.statut === 404) { libre(); return }
    if (r.statut !== 200) { message('L\'île ne répond pas pour l\'instant. Réessaie dans une minute.', false); return }
    fiche = r.corps
    // un visiteur (pas connecté) : « Ton île ici ? »
    if (rs[1].statut !== 200) $('appel').hidden = false
    V.carte('iles', { hote: fiche.hote }).then(function (c) {
      var x = c.statut === 200 && c.corps.iles ? c.corps.iles[0] : null
      haut(fiche, x)
      vue(fiche)
    })
  })
  // l'île de l'appel, en pixels
  var ap = $('appel-ile')
  if (ap && window.IlePixel) ap.getContext('2d').drawImage(IlePixel.sprite(1, 2, 5, true), 0, 0)
})()
