// TES VOTES ET TON TEMPS DE JEU (compte.html ; a8, 30/10/2026 ; la tête : « ses votes disponibles site par site : prêt ou dans
// combien de temps, le bouton de vote » et « son temps de jeu : total, cette semaine, aujourd'hui »). Tout vient de GET
// /api/moi/jeu (la vitrine des votes du jeu, le relevé minute par minute de l'API) ; sans session, la section reste cachée.
// Un site prêt : son bouton Voter (un nouvel onglet) ; pas prêt : dans combien de temps, sans bouton (jamais un bouton qui
// refuse) ; le compte à rebours avance seul, la section se relit toutes les minutes. Une durée ne s'arrondit jamais vers le haut.
;(function () {
  'use strict'
  var A = window.CasteriaApi
  if (!A || !window.fetch) return
  var $ = function (id) { return document.getElementById(id) }
  if (!$('compte-jeu') || !/(?:^|;\s*)casteria_connecte=1(?:;|$)/.test(document.cookie || '')) return
  var donnees = null, pseudo = '', reponseA = 0, relu = null

  // une durée en mots, arrondie vers le bas : « 45 min », « 2 h 46 », « 3 h », « 120 h »
  function duree(min) {
    min = Math.max(0, Math.floor(Number(min) || 0))
    if (min < 60) return A.nombre(min) + ' min'
    var h = Math.floor(min / 60), m = min % 60
    if (h >= 100 || m === 0) return A.nombre(h) + ' h'
    return h + ' h ' + (m < 10 ? '0' : '') + m
  }
  function el(tag, cls, texte) { var e = document.createElement(tag); if (cls) e.className = cls; if (texte !== undefined) e.textContent = texte; return e }

  function sites() {
    var ul = $('votes-sites'), v = donnees.votes, maintenant = Date.now() + (donnees.decalage || 0)
    A.vider(ul)
    if (!v.sites.length) { ul.appendChild(el('li', 'vote-vide', 'Les sites de vote arrivent bientôt : chaque vote te donnera une Clé de Vote.')); return }
    v.sites.forEach(function (s) {
      var li = el('li', 'vote-site'), reste = s.pret_a ? Date.parse(s.pret_a) - maintenant : 0, pret = !(reste > 0)
      li.classList.add(pret ? 'est-pret' : 'attend')
      var tete = el('div', 'vote-tete')
      tete.appendChild(el('span', 'vote-nom', s.nom))
      var etat = el('span', 'vote-etat', pret ? 'Prêt' : (reste < 60000 ? 'Dans moins d\'une minute' : 'Dans ' + duree(reste / 60000)))
      tete.appendChild(etat)
      li.appendChild(tete)
      if (pret) {
        var a = el('a', 'bouton bouton-or petit', 'Voter')
        a.href = s.url; a.target = '_blank'; a.rel = 'noopener noreferrer'
        a.addEventListener('click', function () { setTimeout(relire, 60000) })
        li.appendChild(a)
      }
      // les gestes propres à deux sites (vote.js : SITE_MOTEUR, SM_SITE)
      if (s.id === 'serveurprive' && pseudo) {
        var p = el('p', 'vote-astuce', 'Écris ton pseudo exact sur sa page : ')
        p.appendChild(el('b', '', pseudo))
        li.appendChild(p)
      } else if (s.id === 'serveursminecraft') {
        var q = el('p', 'vote-astuce', 'Puis, en jeu et depuis la même connexion, tape ')
        q.appendChild(el('code', '', '/vote jaivote'))
        q.appendChild(document.createTextNode(' pour ta clé.'))
        li.appendChild(q)
      }
      ul.appendChild(li)
    })
    var c = v.cles_jour >= v.cles_max
      ? 'Tes ' + v.cles_max + ' clés du jour sont prises : tes votes comptent encore pour le mois, les clés reviennent demain.'
      : 'Clés de vote aujourd\'hui : ' + v.cles_jour + ' sur ' + v.cles_max
    $('votes-compte').textContent = c + ' · Votes ce mois : ' + A.nombre(v.votes_mois)
  }

  function temps() {
    var t = donnees.temps, ul = $('temps-tuiles')
    A.vider(ul)
    ;[['Aujourd\'hui', t.jour_min], ['Cette semaine', t.semaine_min], ['En tout', t.total_min]].forEach(function (x) {
      if (x[1] === null || x[1] === undefined) return
      var li = el('li', 'temps-tuile')
      li.appendChild(el('b', '', duree(x[1])))
      li.appendChild(el('span', '', x[0]))
      ul.appendChild(li)
    })
    // le site compte depuis son premier relevé : avant lui, aujourd'hui et la semaine ne savent rien
    var n = $('temps-note'), d = t.depuis ? Date.parse(t.depuis) : NaN
    if (isFinite(d) && Date.now() - d < 8 * 86400000) {
      n.textContent = 'Le site compte ton temps de jeu depuis le ' + new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Europe/Paris' }) + ' ; le total vient du jeu.'
      n.hidden = false
    } else n.hidden = true
  }

  function montrer() {
    sites()
    temps()
    $('compte-jeu').hidden = false
    $('compte-jeu-frise').hidden = false
  }
  function relire() {
    return fetch('/api/moi/jeu', { credentials: 'same-origin', headers: { Accept: 'application/json' } }).then(function (r) {
      if (!r.ok) return null
      var h = Date.parse(r.headers.get('Date') || '')
      return r.json().then(function (o) { reponseA = Date.now(); if (o) o.decalage = isFinite(h) ? h - reponseA : 0; return o })
    }).then(function (o) {
      if (!o || !o.votes || !o.temps) return
      donnees = o
      montrer()
    }).catch(function () { /* la section reste comme elle est */ })
  }

  var moi = A.moi ? A.moi().then(function (r) { if (r && r.statut === 200 && r.corps) pseudo = String(r.corps.pseudo || '') }, function () {}) : Promise.resolve()
  Promise.resolve(moi).then(relire)
  // le compte à rebours avance seul (toutes les 30 s), la section se relit toutes les minutes ; rien quand l'onglet est caché
  setInterval(function () { if (donnees && !document.hidden) sites() }, 30000)
  relu = setInterval(function () { if (!document.hidden) relire() }, 60000)
})()
