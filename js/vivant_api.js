// LES PAGES VIVANTES (la carte, le profil public, les exploits ; 29/10/2026, 67) : ce qu'elles lisent EN PLUS de
// CasteriaApi (js/api.js, à charger avant), toujours par une seule origine (/api/...), jamais l'adresse du serveur de jeu.
// Les mêmes réponses { statut, corps } que CasteriaApi ; ESSAI suit CasteriaApi.essai : les fichiers de donnees-essai/
// (les mêmes pseudos que les pages du compte et du classement ; des chiffres inventés).
//   CasteriaVivant.carte('iles', { de: [i, j], a: [i, j] } | { hote: pseudo }) ; carte('mer') ; navires()
//   CasteriaVivant.joueurPublic(pseudo) : la fiche de 2.3, plus partage et exploits (API.md 2.4)
//   CasteriaVivant.exploits({ depuis: id, n: 1 à 50 })
(function () {
  'use strict'
  var A = window.CasteriaApi
  if (!A) return
  var PSEUDO = A.PSEUDO

  function demander(adresse) {
    if (!window.fetch) return Promise.resolve({ statut: 0, corps: { erreur: 'indisponible' } })
    return fetch(adresse, { credentials: 'same-origin', headers: { Accept: 'application/json' } }).then(function (r) {
      return r.json().catch(function () { return {} }).then(function (j) { return { statut: r.status, corps: j && typeof j === 'object' ? j : {} } })
    }).catch(function () { return { statut: 0, corps: { erreur: 'indisponible' } } })
  }
  function q(p) {
    var l = []
    for (var k in p) if (p[k] !== undefined && p[k] !== null && p[k] !== '') l.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(p[k])))
    return l.length ? '?' + l.join('&') : ''
  }
  function paire(t) { return t && t.length === 2 ? Math.floor(t[0]) + ',' + Math.floor(t[1]) : '' }

  // la fiche de la vue 3D d'une ile (l'API de l'agent de la 3D) : la meme adresse en essai et en vrai (en essai, le petit
  // serveur du site la relaie vers le serveur de demonstration de l'agent : serveur.js, ILE3D_DEMO)
  function ile3d(i, j) { return demander('/api/ile/' + Math.floor(i) + ',' + Math.floor(j) + '/3d') }
  function ile3dActualiser(i, j) {
    if (!window.fetch) return Promise.resolve({ statut: 0, corps: {} })
    return fetch('/api/ile/' + Math.floor(i) + ',' + Math.floor(j) + '/3d/actualiser', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      .then(function (r) { return r.json().catch(function () { return {} }).then(function (j2) { return { statut: r.status, corps: j2 || {} } }) })
      .catch(function () { return { statut: 0, corps: {} } })
  }

  // ---------- la vraie API ----------
  var vraie = {
    ile3d: ile3d, ile3dActualiser: ile3dActualiser,
    carte: function (zone, o) { o = o || {}; return demander('/api/carte' + q({ zone: zone === 'mer' ? 'mer' : 'iles', de: paire(o.de), a: paire(o.a), hote: o.hote })) },
    navires: function () { return demander('/api/navires') },
    joueurPublic: function (p) { return PSEUDO.test(p) ? demander('/api/joueur/' + p + '/public') : Promise.resolve({ statut: 400, corps: { erreur: 'requete' } }) },
    exploits: function (o) { o = o || {}; return demander('/api/exploits' + q({ depuis: o.depuis, n: Math.max(1, Math.min(50, Number(o.n) || 20)) })) }
  }

  // ---------- les données d'essai ----------
  var lus = {}
  function fichier(rel) {
    if (!lus[rel]) lus[rel] = demander('donnees-essai/' + rel).then(function (r) { if (r.statut !== 200) delete lus[rel]; return r })
    return lus[rel]
  }
  var depart = Date.now(), neufs = 0
  var essai = {
    ile3d: ile3d, ile3dActualiser: ile3dActualiser,
    carte: function (zone, o) {
      o = o || {}
      if (zone === 'mer') return fichier('vivant/carte-mer.json')
      return fichier('vivant/carte-iles.json').then(function (r) {
        if (r.statut !== 200) return r
        var l = r.corps.iles
        if (o.hote) { var h = String(o.hote).toLowerCase(); l = l.filter(function (x) { return x.hote.toLowerCase() === h }) }
        if (o.de && o.a) l = l.filter(function (x) { return x.i >= o.de[0] && x.i <= o.a[0] && x.j >= o.de[1] && x.j <= o.a[1] })
        return { statut: 200, corps: { essai: true, lu: r.corps.lu, zone: 'iles', espace_blocs: r.corps.espace_blocs, total: r.corps.iles.length, etendue: r.corps.etendue, iles: l } }
      })
    },
    // les navires avancent le long de leur cap (8 blocs par seconde ; 2 au combat)
    navires: function () {
      return fichier('vivant/navires.json').then(function (r) {
        if (r.statut !== 200) return r
        var t = (Date.now() - depart) / 1000
        return { statut: 200, corps: { essai: true, lu: new Date().toISOString(), navires: r.corps.navires.map(function (n) {
          var a = n.cap * Math.PI / 180, v = n.en_combat ? 2 : 8
          return { pseudo: n.pseudo, coque: n.coque, en_combat: n.en_combat, cap: n.cap, x: Math.round(n.x + Math.sin(a) * v * t), z: Math.round(n.z - Math.cos(a) * v * t) }
        }) } }
      })
    },
    // la fiche de 2.3 (le fichier de l'agent), plus ce que 2.4 ajoute : le partage, ses 10 derniers exploits, la case de son ile
    joueurPublic: function (p) {
      if (!PSEUDO.test(p)) return Promise.resolve({ statut: 400, corps: { erreur: 'requete' } })
      return Promise.all([A.joueur(p), fichier('exploits.json'), fichier('vivant/carte-iles.json')]).then(function (rs) {
        var r = rs[0]
        if (r.statut !== 200) return r
        var j = JSON.parse(JSON.stringify(r.corps)), b = j.pseudo.toLowerCase()
        var ex = rs[1].statut === 200 ? rs[1].corps.exploits || [] : []
        j.exploits = ex.filter(function (x) { return String(x.pseudo).toLowerCase() === b }).slice(0, 10).map(function (x) {
          var t = String(x.texte), d = t.indexOf(x.pseudo) === 0 ? t.substring(x.pseudo.length + 1) : t
          return { id: x.id, quand: x.quand, sorte: x.sorte, texte: d.charAt(0).toUpperCase() + d.substring(1) }
        })
        var iles = rs[2].statut === 200 ? rs[2].corps.iles || [] : []
        for (var k = 0; k < iles.length; k++) if (iles[k].hote.toLowerCase() === b) { if (j.ile) { j.ile.i = iles[k].i; j.ile.j = iles[k].j; j.ile.etoiles = iles[k].etoiles; j.ile.classement = iles[k].classement } break }
        var m = ['Niveau ' + (j.niveau ? j.niveau.n : 1)]
        if (j.general) m.push(A.rang(j.general.rang) + ' au classement général')
        if (j.ile) m.push('l\'île ' + j.ile.nom)
        j.partage = { titre: j.pseudo + ' sur Casteria', description: m.join(', ') + '.', image: '/api/joueur/' + j.pseudo + '/image.png' }
        return { statut: 200, corps: j }
      })
    },
    // le fil : les 50 derniers ; « depuis » : un exploit neuf a chaque relecture (pour voir le fil vivre)
    exploits: function (o) {
      o = o || {}
      return fichier('exploits.json').then(function (r) {
        if (r.statut !== 200) return r
        var l = r.corps.exploits.slice(), n = Math.max(1, Math.min(50, Number(o.n) || 20))
        if (o.depuis) {
          var src = l[(neufs++) % l.length]
          l = [{ id: l[0].id + neufs, quand: new Date().toISOString(), sorte: src.sorte, pseudo: src.pseudo, texte: src.texte, boss: src.boss, valeur: src.valeur }].filter(function (x) { return x.id > Number(o.depuis) })
        }
        return { statut: 200, corps: { essai: true, exploits: l.slice(0, n) } }
      })
    }
  }
  window.CasteriaVivant = A.essai ? essai : vraie
})()
