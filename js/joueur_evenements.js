// SES ÉVÉNEMENTS (joueur.html, #bloc-evenements ; dc, la 157 ; le propriétaire, 30/10/2026 : « le K/D sur sa fiche »). GET
// /api/joueur/<pseudo>/evenements : pour chaque jeu des événements, sa place dans chaque classement de /top Événements (les 100
// premiers ; au-delà, son chiffre seul) et son K/D (la Bataille de neige, le Rayon Éclair : une information, jamais un
// classement). Une carte par jeu où il a une partie comptée ; aucune : le bloc reste caché. L'équipe n'est pas classée : caché.
;(function () {
  'use strict'
  var A = window.CasteriaApi
  var bloc = document.getElementById('bloc-evenements'), ul = document.getElementById('evenements-joueur')
  if (!A || !bloc || !ul || !window.fetch) return
  var m = location.pathname.match(/\/joueur\/([A-Za-z0-9_]{3,16})\/?$/), q = location.search.match(/[?&]p=([A-Za-z0-9_]{3,16})/)
  var pseudo = m ? m[1] : q ? q[1] : ''
  if (!A.PSEUDO.test(pseudo)) return
  var NBSP = String.fromCharCode(160)
  var JEUX = [['eclair', 'Défi Éclair'], ['sol', 'Sol qui lâche'], ['neige', 'Bataille de neige'], ['rayon', 'Rayon Éclair']]
  var MOTS = { ev_sol_gagnees: 'Parties gagnées', ev_neige_gagnees: 'Parties gagnées', ev_neige_victimes: 'Victimes', ev_neige_record: 'Record',
    ev_eclair_gagnees: 'Parties gagnées', ev_eclair_record: 'Record', ev_rayon_gagnees: 'Parties gagnées', ev_rayon_victimes: 'Victimes' }
  function mot(id) { return MOTS[id] || (/^ev_rayon_record_/.test(id) ? 'Record, ' + id.slice(16).replace(/_/g, ' ').replace(/^./, function (x) { return x.toUpperCase() }) : '') }
  function valeur(id, n) {
    n = Math.max(0, Math.floor(Number(n) || 0))
    if (/_gagnees$/.test(id)) return A.nombre(n) + NBSP + (n > 1 ? 'parties gagnées' : 'partie gagnée')
    if (id === 'ev_eclair_record') return A.nombre(n) + NBSP + (n > 1 ? 'points' : 'point')
    return A.nombre(n) + NBSP + (n > 1 ? 'victimes' : 'victime')
  }
  // la ligne d'un classement : son chiffre (« 9 parties gagnées », « 77 victimes ») ; un record dit lequel
  function ligne(c) { return (/_record/.test(c.id) ? mot(c.id) + ' : ' : '') + valeur(c.id, c.valeur) }
  fetch('/api/joueur/' + encodeURIComponent(pseudo) + '/evenements', { headers: { Accept: 'application/json' } })
    .then(function (r) { return r.ok ? r.json() : null }).catch(function () { return null })
    .then(function (j) {
      if (!j || j.equipe || !j.jeux) return
      var n = 0
      JEUX.forEach(function (x) {
        var g = j.jeux[x[0]]
        if (!g || !Array.isArray(g.criteres)) return
        var vus = g.criteres.filter(function (c) { return c && c.valeur > 0 && mot(c.id) })
        if (!vus.length) return
        var meilleur = vus.filter(function (c) { return c.place === 'classe' && c.rang >= 1 }).sort(function (a, b) { return a.rang - b.rang })[0] || null
        var li = A.el('li', 'place ev-place'), a = A.el('a', '')
        a.href = 'evenements.html#classements'
        a.appendChild(A.el('span', 'theme', x[1]))
        a.appendChild(A.el('span', 'rang-place', meilleur ? A.rang(meilleur.rang) : valeur(vus[0].id, vus[0].valeur)))
        if (meilleur) a.appendChild(A.el('span', 'cat', ligne(meilleur)))
        vus.forEach(function (c) {
          if (c === meilleur || (!meilleur && c === vus[0])) return
          a.appendChild(A.el('span', 'cat', ligne(c) + (c.place === 'classe' && c.rang >= 1 ? ', ' + A.rang(c.rang) : '')))
        })
        if (g.kd) a.appendChild(A.el('span', 'val', g.kd))
        li.appendChild(a)
        ul.appendChild(li)
        n++
      })
      if (n) bloc.hidden = false
    })
})()
