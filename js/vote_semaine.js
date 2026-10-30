// LES VOTEURS DE LA SEMAINE (vote.html #semaine ; ag, 30/10/2026, la 156 ; le propriétaire : « un beau classement comme les
// autres, un podium avec les têtes des 3 premiers, du 4e au 10e en dessous, les lots de chaque place, le compte à rebours jusqu'au
// lundi »). Tout vient de CasteriaApi (js/api.js) : votesSemaine (GET /api/votes/semaine : le top 10, les lots tels que le jeu les
// écrit, la fin de la semaine) et moiVoteSemaine (GET /api/moi/vote-semaine : ta place, avec l'indice de connexion seulement).
// Les têtes : le dessin de l'accueil (la face et le chapeau découpés de la peau, au pixel près). Sans données : une phrase claire,
// jamais un 0. Un pseudo tient sur une ligne (sa taille baisse jusqu'à tenir). Le compte à rebours ne s'arrondit jamais vers le haut.
;(function () {
  'use strict'
  var A = window.CasteriaApi
  var corps = document.getElementById('vs-corps')
  if (!A || !corps || !A.votesSemaine) return
  var $ = function (id) { return document.getElementById(id) }
  var NBSP = String.fromCharCode(160)
  var CLES = { legendaire: 'cle-legendaire', tres_rare: 'cle-tres-rare', rare: 'cle-rare', vote: 'cle-vote' }
  var MEDAILLES = ['assets/classement/medaille_1.png', 'assets/classement/medaille_2.png', 'assets/classement/medaille_3.png']
  var donnees = null, moi = null, finMs = 0, minuteur = null

  function el(nom, classe, t) { return A.el(nom, classe, t) }
  // la tête d'un joueur : la face (8 x 8) et le chapeau, découpés de sa peau (le dessin de js/accueil.js)
  function tete(url, taille) {
    var e = el('span', 'tete-pixel'), u = A.peau(url), k = taille / 8
    e.setAttribute('aria-hidden', 'true')
    e.style.backgroundImage = 'url("' + u + '"), url("' + u + '")'
    e.style.backgroundSize = (64 * k) + 'px ' + (64 * k) + 'px'
    e.style.backgroundPosition = (-40 * k) + 'px ' + (-8 * k) + 'px, ' + (-8 * k) + 'px ' + (-8 * k) + 'px'
    return e
  }
  function votes(n) { n = Math.max(0, Math.floor(Number(n) || 0)); return A.nombre(n) + NBSP + (n > 1 ? 'votes' : 'vote') }
  function lotDe(r) { var l = donnees && donnees.lots || []; for (var i = 0; i < l.length; i++) if (Number(l[i].rang) === r) return l[i]; return null }
  // un lot : une ligne par gain (les crédits, puis chaque clé), l'image du jeu, le nombre et le nom
  function lot(l) {
    var ul = el('ul', 'vs-lot')
    if (!l) return ul
    var gains = []
    if (Number(l.credits) > 0) gains.push({ img: 'assets/icones/credit.png', n: l.credits, mot: Number(l.credits) > 1 ? 'crédits' : 'crédit' })
    ;(l.cles || []).forEach(function (c) { gains.push({ img: 'assets/icones/' + (CLES[c.type] || 'cle-vote') + '.png', n: c.n, mot: String(c.nom) }) })
    ul.setAttribute('aria-label', 'Le lot : ' + (l.texte ? String(l.texte) : ''))
    gains.forEach(function (g) {
      var li = el('li', '')
      var im = document.createElement('img'); im.src = g.img; im.alt = ''; im.width = 16; im.height = 16
      li.appendChild(im)
      li.appendChild(el('span', 'vs-n', A.nombre(g.n)))
      li.appendChild(el('span', 'vs-mot', g.mot))
      ul.appendChild(li)
    })
    return ul
  }
  function pseudoDe(l) {
    var ok = /^[A-Za-z0-9_]{3,16}$/.test(String(l.pseudo))
    var p = el(ok ? 'a' : 'span', 'vs-pseudo', String(l.pseudo))
    if (ok) p.href = 'joueur/' + String(l.pseudo)
    return p
  }
  function estMoi(l) { return !!(moi && l && moi.pseudo && String(l.pseudo).toLowerCase() === String(moi.pseudo).toLowerCase()) }

  // ---------- le podium : 2, 1, 3 ----------
  function marche(r) {
    var l = donnees.top[r - 1] || null, li = el('li', 'vs-marche vs-p' + r + (estMoi(l) ? ' toi' : ''))
    var j = el('div', 'vs-joueur')
    if (l) {
      if (r === 1) { var c = document.createElement('img'); c.className = 'vs-couronne'; c.src = 'assets/classement/couronne.png'; c.alt = ''; c.width = 54; c.height = 45; j.appendChild(c) }
      j.appendChild(tete(l.peau, r === 1 ? 70 : 56))
      j.appendChild(pseudoDe(l))
      j.appendChild(el('span', 'vs-votes', votes(l.votes)))
      if (estMoi(l)) j.appendChild(el('span', 'vs-marque', 'Toi'))
    } else {
      var v = el('span', 'vs-vide'); v.setAttribute('aria-hidden', 'true'); j.appendChild(v)
      j.appendChild(el('span', 'vs-libre', 'Place libre'))
    }
    li.appendChild(j)
    var s = el('div', 'vs-socle'), m = document.createElement('img')
    m.className = 'vs-medaille'; m.src = MEDAILLES[r - 1]; m.alt = A.rang(r); m.width = 20; m.height = 28
    s.appendChild(m)
    s.appendChild(lot(lotDe(r)))
    li.appendChild(s)
    return li
  }
  // ---------- du 4e au 10e ----------
  function ligne(r) {
    var l = donnees.top[r - 1] || null, li = el('li', 'vs-ligne' + (l ? '' : ' libre') + (estMoi(l) ? ' toi' : ''))
    li.appendChild(el('span', 'vs-rang', A.rang(r)))
    if (l) li.appendChild(tete(l.peau, 32)); else { var v = el('span', 'vs-vide'); v.setAttribute('aria-hidden', 'true'); li.appendChild(v) }
    var q = el('span', 'vs-qui')
    if (l) {
      q.appendChild(pseudoDe(l))
      q.appendChild(el('span', 'vs-votes', votes(l.votes)))
      if (estMoi(l)) q.appendChild(el('span', 'vs-marque', 'Toi'))
    } else q.appendChild(el('span', 'vs-libre', 'Place libre'))
    li.appendChild(q)
    li.appendChild(lot(lotDe(r)))
    return li
  }

  // un pseudo tient sur UNE ligne : sa taille baisse jusqu'à tenir (11 px au plus petit)
  function ajuster() {
    Array.prototype.forEach.call(corps.querySelectorAll('.vs-pseudo'), function (e) {
      e.style.fontSize = ''
      var t = parseFloat(window.getComputedStyle(e).fontSize) || 16
      while (t > 11 && e.scrollWidth > e.clientWidth + 1) { t -= 1; e.style.fontSize = t + 'px' }
    })
  }

  function phrase(t, code, apres) {
    var p = el('p', 'vs-etat', t)
    if (code) { p.appendChild(el('code', '', code)); if (apres) p.appendChild(document.createTextNode(apres)) }
    return p
  }

  // ---------- ta place, la semaine d'avant ----------
  function pied() {
    var toi = $('vs-toi'), avant = $('vs-avant'), pi = $('vs-pied')
    A.vider(toi); A.vider(avant)
    toi.hidden = true; avant.hidden = true
    var d = donnees
    if (d && d.etat !== 'absente') {
      if (moi && moi.equipe) { toi.textContent = 'L\'équipe n\'est pas classée.'; toi.hidden = false }
      else if (moi && !(moi.place === 'classe' && moi.rang >= 1 && moi.rang <= 10)) {
        toi.appendChild(el('span', 'vs-marque', 'Toi'))
        if (moi.place === 'classe') {
          toi.appendChild(el('b', '', A.rang(moi.rang)))
          toi.appendChild(el('span', 'vs-un', votes(moi.votes)))
          var dixieme = d.top[9]
          var manque = dixieme ? Number(dixieme.votes) - Number(moi.votes) + 1 : 0
          if (manque > 0) toi.appendChild(el('span', 'vs-un', 'encore ' + votes(manque) + ' pour entrer dans les dix'))
        } else if (moi.place === 'apres_100') {
          toi.appendChild(el('b', '', 'Après la 100e place'))
          toi.appendChild(el('span', 'vs-un', votes(moi.votes)))
        } else if (moi.place === 'bientot') {
          toi.appendChild(el('span', 'vs-un', votes(moi.votes) + ' cette semaine'))
          toi.appendChild(el('span', 'vs-un', 'ta place arrive dans une minute'))
        } else {
          toi.appendChild(el('span', 'vs-un', 'Aucun vote cette semaine'))
          var b = el('a', 'bouton bouton-orange petit', 'Voter'); b.href = '#voter'
          toi.appendChild(b)
        }
        toi.hidden = false
      } else if (!moi) {
        if (!d.top.length) toi.appendChild(el('span', '', 'Personne n\'a encore voté cette semaine : le premier vote prend la tête.'))
        else {
          toi.appendChild(el('span', '', 'Ta place dans le classement : '))
          var a = el('a', 'vs-lien', 'connecte-toi'); a.href = 'connexion.html'
          toi.appendChild(a)
        }
        toi.hidden = false
      }
    }
    var av = d && d.avant && Array.isArray(d.avant.top) ? d.avant.top.slice(0, 3) : []
    if (av.length) {
      avant.appendChild(document.createTextNode('La semaine dernière : '))
      av.forEach(function (x, i) {
        if (i) avant.appendChild(document.createTextNode(' · '))
        // une place ne se coupe jamais entre son rang et son pseudo
        var place = el('span', 'vs-un', A.rang(i + 1) + NBSP)
        place.appendChild(el('b', '', String(x.pseudo)))
        avant.appendChild(place)
      })
      avant.hidden = false
    }
    pi.hidden = toi.hidden && avant.hidden
  }

  function montrer(r) {
    A.vider(corps)
    if (!r || r.statut !== 200 || !r.corps || !Array.isArray(r.corps.top)) {
      donnees = null
      corps.appendChild(phrase('Le classement de la semaine ne se lit pas pour l\'instant. Réessaie dans une minute.'))
      var b = el('button', 'bouton bouton-sombre petit', 'Réessayer'); b.type = 'button'; b.addEventListener('click', lire)
      corps.firstChild.appendChild(el('br', ''))
      corps.firstChild.appendChild(b)
      $('vs-chrono').hidden = true
      pied()
      return
    }
    donnees = r.corps
    finMs = Date.parse(donnees.fin || '') || 0
    chrono()
    if (donnees.etat === 'absente') {
      corps.appendChild(phrase('Le classement de la semaine se lit en jeu pour l\'instant : tape ', '/vote semaine', '.'))
      pied()
      return
    }
    var podium = el('ol', 'vs-podium')
    podium.setAttribute('aria-label', 'Les trois premiers de la semaine')
    ;[2, 1, 3].forEach(function (k) { podium.appendChild(marche(k)) })
    var gauche = el('div', 'vs-gauche')
    gauche.appendChild(podium)
    // au téléphone, les lots du podium en entier (la feuille ne les montre que là)
    var lp = el('ul', 'vs-lots-podium')
    ;[1, 2, 3].forEach(function (k) { var x = lotDe(k); if (x && x.texte) { var li = el('li', ''); li.appendChild(el('b', '', A.rang(k) + ' : ')); li.appendChild(document.createTextNode(A.texte(x.texte))); lp.appendChild(li) } })
    if (lp.children.length) gauche.appendChild(lp)
    corps.appendChild(gauche)
    var liste = el('ol', 'vs-liste')
    liste.setAttribute('aria-label', 'Du 4e au 10e')
    for (var k = 4; k <= 10; k++) if (donnees.top[k - 1] || lotDe(k)) liste.appendChild(ligne(k))
    corps.appendChild(liste)
    pied()
    ajuster()
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajuster)
  }

  // ---------- le compte à rebours jusqu'au lundi, à 0 h (heure de Paris) ; arrondi vers le bas ----------
  function deux(n) { return (n < 10 ? '0' : '') + n }
  function chrono() {
    var c = $('vs-chrono'), t = $('vs-chrono-temps')
    if (!finMs) { c.hidden = true; return }
    var reste = Math.floor((finMs - Date.now()) / 1000)
    var mot = c.querySelector('.vs-chrono-mot')
    if (reste <= 0) { mot.textContent = 'La semaine est finie'; t.textContent = 'Les lots à 0' + NBSP + 'h' + NBSP + '05'; c.hidden = false; return }
    var j = Math.floor(reste / 86400), h = Math.floor(reste % 86400 / 3600), m = Math.floor(reste % 3600 / 60), s = reste % 60, txt
    if (j > 0) txt = j + NBSP + (j > 1 ? 'jours' : 'jour') + ' ' + h + NBSP + 'h ' + deux(m) + NBSP + 'min'
    else if (h > 0) txt = h + NBSP + 'h ' + deux(m) + NBSP + 'min'
    else txt = m + NBSP + 'min ' + deux(s) + NBSP + 's'
    mot.textContent = 'Fin de la semaine dans'
    if (t.textContent !== txt) t.textContent = txt
    c.hidden = false
  }

  function lire() {
    return Promise.all([A.votesSemaine(), A.moiVoteSemaine ? A.moiVoteSemaine() : Promise.resolve(null)]).then(function (rs) {
      var m = rs[1]
      moi = m && m.statut === 200 && m.corps && typeof m.corps === 'object' && m.corps.pseudo ? m.corps : null
      montrer(rs[0])
    }, function () { montrer(null) })
  }

  lire()
  // le compte à rebours avance chaque seconde ; le classement se relit toutes les minutes ; rien quand l'onglet est caché
  minuteur = setInterval(function () { if (!document.hidden && donnees) chrono() }, 1000)
  setInterval(function () { if (!document.hidden) lire() }, 60000)
  var attente = null
  window.addEventListener('resize', function () { clearTimeout(attente); attente = setTimeout(ajuster, 150) })
})()
