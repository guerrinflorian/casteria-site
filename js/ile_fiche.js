// LA FICHE D'UNE ÎLE, autour de sa vue 3D (ile.html ; 29/10/2026, 67 ; le propriétaire : « les profils île bâclés, pas
// complets »). Tout ce que le jeu publie d'une île, rien d'inventé, rien de vide :
//  - SES CHIFFRES : sa beauté, sa taille, ses machines, ses bêtes (les classements du thème « Îles », la fiche /3d : chiffres),
//    et sa place au Classement des îles ; un chiffre que l'API ne donne pas se tait (jamais « 0 » ni « - ») ;
//  - QUI Y VIT : son chef, ses amis (leurs noms quand le jeu les dit, sinon leur nombre), qui y joue en ce moment ;
//  - SA PLACE SUR LA CARTE : l'archipel en petit (CasteriaVivant.carte), l'île en or, le lien vers la carte ;
//  - SES BÊTES : celles des granges et les libres (la vue : betes.json, au droit de l'île), par espèce et par rareté.
// ile3d.js l'appelle quand la fiche et la ligne de la carte sont lues : IleFiche.remplir({ fiche, x, i, j }).
;(function () {
  'use strict'
  var A = window.CasteriaApi, V = window.CasteriaVivant
  if (!A || !V) return
  var $ = function (id) { return document.getElementById(id) }
  var NOMS = window.CasteriaBetesNoms || {}
  var RARETES = { rare: 'Rare', epique: 'Épique', legendaire: 'Légendaire', mythique: 'Mythique' }
  var ORDRE_RARETE = { mythique: 0, legendaire: 1, epique: 2, rare: 3, '': 4 }

  function rang(r) { return r === 1 ? '1re' : A.nombre(r) + 'e' }
  function pluriel(n, un, plusieurs) { return A.nombre(n) + ' ' + (n > 1 ? plusieurs : un) }

  // ---- SES CHIFFRES
  var MESURES = [
    { cle: 'beaute', nom: 'Beauté', icone: 'etoile', aide: 'Les blocs choisis, les fleurs, les décors' },
    { cle: 'taille', nom: 'Taille', icone: 'territoire', aide: 'Le territoire agrandi, mur par mur' },
    { cle: 'machines', nom: 'Machines', icone: 'assets/objets/objet_fonderie.webp', aide: 'Les machines posées et leurs niveaux' },
    { cle: 'betes', nom: 'Bêtes', icone: 'assets/objets/objet_enclos.webp', aide: 'Les bêtes des enclos et des granges' }
  ]
  function mesures(f) {
    var c = f && f.chiffres && typeof f.chiffres === 'object' ? f.chiffres : null, ul = $('mesures-liste'), n = 0
    if (!c || !ul) return false
    A.vider(ul)
    for (var k = 0; k < MESURES.length; k++) {
      var m = MESURES[k], v = c[m.cle]
      if (!v || (!v.texte && !v.rang)) continue
      var li = A.el('li', 'mesure')
      var dessin = m.icone === 'etoile' ? ' etoile-pixel' : (m.icone === 'territoire' ? ' territoire-pixel' : '')
      var ic = A.el('span', 'mesure-icone' + dessin)
      ic.setAttribute('aria-hidden', 'true')
      if (!dessin) { var im = A.el('img', 'pixel'); im.src = m.icone; im.alt = ''; im.width = 32; im.height = 32; im.loading = 'lazy'; ic.appendChild(im) }
      li.appendChild(ic)
      var t = A.el('span', 'mesure-texte')
      t.appendChild(A.el('b', 'mesure-nom', m.nom))
      if (v.texte) t.appendChild(A.el('span', 'mesure-valeur', A.texte(v.texte)))
      t.appendChild(A.el('span', 'mesure-aide', m.aide))
      li.appendChild(t)
      if (v.rang) li.appendChild(A.el('span', 'mesure-rang', rang(Number(v.rang))))
      ul.appendChild(li)
      n++
    }
    var g = c.general
    $('mesures-general').textContent = g && g.rang ? rang(Number(g.rang)) + ' au Classement des îles' + (g.points !== null && g.points !== undefined ? ' · ' + A.nombre(g.points) + ' / ' + A.nombre(g.sur || 400) + ' points' : '') : ''
    $('mesures').hidden = n === 0 && !$('mesures-general').textContent
    return !$('mesures').hidden
  }

  // ---- QUI Y VIT
  function personne(nom, role) {
    var li = A.el('li', 'habitant')
    var t = A.el('span', 'habitant-tete')
    t.setAttribute('aria-hidden', 'true')
    if (window.Tete) Tete.poser(t, '/api/peau/' + encodeURIComponent(nom))
    li.appendChild(t)
    var a = A.el('a', 'habitant-nom', nom)
    a.href = 'joueur/' + encodeURIComponent(nom)
    li.appendChild(a)
    if (role) li.appendChild(A.el('span', 'habitant-role', role))
    return li
  }
  function habitants(f, x) {
    var ul = $('habitants-liste')
    if (!ul || !f || !f.hote) return false
    A.vider(ul)
    ul.appendChild(personne(String(f.hote), 'Chef de l\'île'))
    var noms = Array.isArray(f.amis_noms) ? f.amis_noms.filter(function (n) { return A.PSEUDO.test(String(n)) && String(n).toLowerCase() !== String(f.hote).toLowerCase() }) : []
    for (var k = 0; k < noms.length && k < 12; k++) ul.appendChild(personne(String(noms[k]), 'Ami'))
    // le nombre d'amis : la fiche (membres), sinon la ligne de la carte ; leurs noms seulement si le jeu les dit (amis_noms)
    var nAmis = f.membres >= 0 ? Number(f.membres) : (x && x.amis >= 0 ? Number(x.amis) : noms.length)
    var reste = Math.max(0, nAmis - Math.min(noms.length, 12))
    $('habitants-amis').textContent = !noms.length && nAmis > 0 ? 'Avec ' + pluriel(nAmis, 'ami', 'amis') + ' qui y construisent.' : (reste > 0 ? 'Et ' + pluriel(reste, 'autre ami', 'autres amis') + '.' : (nAmis === 0 ? 'Son chef y bâtit seul pour l\'instant.' : ''))
    var en = f.en_ligne > 0 ? Number(f.en_ligne) : (x && x.en_ligne > 0 ? Number(x.en_ligne) : 0)
    var p = $('presents')
    p.textContent = en > 0 ? 'En ce moment : ' + pluriel(en, 'joueur', 'joueurs') + ' sur l\'île.' : 'Personne sur l\'île en ce moment.'
    p.className = 'ile-presents' + (en > 0 ? ' vivante' : '')
    return true
  }

  // ---- SA PLACE SUR LA CARTE : l'archipel en petit (une case par île), l'île en or
  function minicarte(i, j, x) {
    var cv = $('minicarte')
    if (!cv) return
    V.carte('iles').then(function (r) {
      var l = r.statut === 200 && r.corps && Array.isArray(r.corps.iles) ? r.corps.iles : []
      var ctx = cv.getContext('2d'), W = cv.width, H = cv.height
      // l'etendue : toutes les iles, et la notre, avec une case de mer autour
      var i0 = i, i1 = i, j0 = j, j1 = j
      for (var k = 0; k < l.length; k++) { i0 = Math.min(i0, l[k].i); i1 = Math.max(i1, l[k].i); j0 = Math.min(j0, l[k].j); j1 = Math.max(j1, l[k].j) }
      i0--; j0--; i1++; j1++
      var n = Math.max(i1 - i0 + 1, j1 - j0 + 1), c = Math.max(4, Math.floor(Math.min(W, H) / n))
      var ox = Math.floor((W - c * (i1 - i0 + 1)) / 2), oz = Math.floor((H - c * (j1 - j0 + 1)) / 2)
      ctx.fillStyle = '#0E3B57'; ctx.fillRect(0, 0, W, H)
      // la houle : une ligne claire toutes les deux cases
      ctx.fillStyle = 'rgba(143, 227, 255, .07)'
      for (var y = oz; y < H; y += c * 2) ctx.fillRect(0, y, W, Math.max(1, Math.floor(c / 6)))
      var s = Math.max(2, c - Math.max(1, Math.floor(c / 4)))
      for (k = 0; k < l.length; k++) {
        var e = l[k]
        if (e.i === i && e.j === j) continue
        ctx.fillStyle = e.ouverte ? '#6FBF4A' : '#C9A27A'
        ctx.fillRect(ox + (e.i - i0) * c + Math.floor((c - s) / 2), oz + (e.j - j0) * c + Math.floor((c - s) / 2), s, s)
      }
      // la notre : en or, son liseré
      var X = ox + (i - i0) * c, Z = oz + (j - j0) * c
      ctx.fillStyle = '#3F2612'; ctx.fillRect(X - 2, Z - 2, c + 4, c + 4)
      ctx.fillStyle = '#FFD75E'; ctx.fillRect(X, Z, c, c)
      var total = r.statut === 200 && r.corps ? Number(r.corps.total) || l.length : l.length
      $('carte-texte').textContent = 'Case ' + i + ', ' + j + ' de l\'archipel' + (total > 1 ? ', parmi ' + pluriel(total, 'île', 'îles') + '.' : '.') + ' En vert, les îles ouvertes aux visites ; en beige, les fermées.'
      $('carte-lien').href = 'carte.html#ile=' + i + ',' + j
      $('place-carte').hidden = false
    })
  }

  // ---- SES BÊTES (la vue : granges et libres, au droit de l'île)
  function nomBete(id) {
    if (NOMS[id]) return NOMS[id]
    var p = String(id).split(':').pop().replace(/_/g, ' ')
    return p.charAt(0).toUpperCase() + p.slice(1)
  }
  function betes(f) {
    if (!f || !f.peut_voir || !f.vue || !window.fetch) return
    fetch(f.vue + 'betes.json', { credentials: 'same-origin', headers: { Accept: 'application/json' } }).then(function (r) { return r.ok ? r.json() : null }).then(function (o) {
      var l = o && Array.isArray(o.betes) ? o.betes : []
      if (!l.length) return
      var g = {}, cles = []
      for (var k = 0; k < l.length; k++) {
        var b = l[k] || {}, c = String(b.espece || '') + '|' + String(b.rarete || '')
        if (!b.espece) continue
        if (!g[c]) { g[c] = { espece: String(b.espece), rarete: String(b.rarete || ''), n: 0, petits: 0 }; cles.push(c) }
        g[c].n++
        if (b.petit) g[c].petits++
      }
      cles.sort(function (a, b) { return (ORDRE_RARETE[g[a].rarete] || 4) - (ORDRE_RARETE[g[b].rarete] || 4) || g[b].n - g[a].n || (nomBete(g[a].espece) < nomBete(g[b].espece) ? -1 : 1) })
      var ul = $('betes-liste')
      A.vider(ul)
      var total = 0
      for (k = 0; k < cles.length; k++) {
        var e = g[cles[k]], li = A.el('li', 'bete' + (e.rarete ? ' rarete-' + e.rarete : ''))
        li.appendChild(A.el('b', 'bete-n', A.nombre(e.n)))
        li.appendChild(A.el('span', 'bete-nom', nomBete(e.espece)))
        if (RARETES[e.rarete]) li.appendChild(A.el('span', 'bete-rarete', RARETES[e.rarete]))
        if (e.petits) li.appendChild(A.el('span', 'bete-petits', 'dont ' + pluriel(e.petits, 'petit', 'petits')))
        ul.appendChild(li)
        total += e.n
      }
      $('betes-note').textContent = pluriel(total, 'bête', 'bêtes') + ' sur l\'île, dans ses enclos, ses granges et en liberté.'
      $('betes').hidden = false
    }).catch(function () { /* sans liste : la partie reste cachee */ })
  }

  // ---- SON ÉCURIE (37, le 30/10 ; la vue : ecurie.json, au droit de l'île) : ses montures et les familiers de son jardin, par
  // leur nom du jeu (casinomontures Chiffres, casinocompagnons Catalogue) et leur stade (2 et 3 : une bête évoluée). Un familier
  // gagné contre un boss que le site ne nomme jamais reste un « Familier secret » (son id n'est pas dans la table)
  var MONTURES = { scarabee_or: 'Scarabée d\'or', loup_orage: 'Loup d\'orage', raie_nuages: 'Raie des nuages', hippocampe_royal: 'Hippocampe royal',
    destrier_casterium: 'Destrier de castérium', wyverne_royale: 'Wyverne royale', griffon_or: 'Griffon d\'or', cerf_celeste: 'Cerf céleste',
    renard_roux: 'Renard roux', cauchemar: 'Cauchemar', griffon_glaces: 'Griffon des glaces', lion_souverain: 'Lion ailé de castérium' }
  var FAMILIERS = { dragon: 'Bébé dragon', chat: 'Chat ailé', mouton: 'Mouton nuage', luciole: 'Luciole', corbeau: 'Corbeau caïd', de: 'Dé porte-bonheur',
    jeton: 'Jeton parrain', crane: 'Crâne à casquette', panda: 'Petit panda', licorne: 'Licorne rose', lionceau: 'Lionceau royal', robot: 'Petit robot',
    dragon_casterium: 'Dragon de castérium', chouette: 'Chouette flocon', phenix: 'Phénix d\'or', baleine: 'Baleine des étoiles', renard: 'Renard aux trois queues',
    poussin: 'Poussin des nuages', meduse: 'Méduse de lune', cochon_volant: 'Cochon volant', petit_yeti: 'Bébé Yéti', petit_pagure: 'Bébé Pagure',
    canari_mine: 'Canari de mine', golem_geode: 'Golem de géode', perroquet_corsaire: 'Perroquet corsaire', petit_veilleur: 'Petit Veilleur',
    souris_moissons: 'Souris des moissons', petit_epouvantail: 'Petit épouvantail', chat_chanceux: 'Chat porte-bonheur', carpe_or: 'Carpe d\'or' }
  // une liste de l'écurie : les bêtes les plus évoluées d'abord, puis par nom ; rend leur nombre
  function listeEcurie(ul, l, noms, secret) {
    A.vider(ul)
    var e = []
    for (var k = 0; k < l.length; k++) {
      var b = l[k] || {}
      if (!/^[a-z0-9_]{1,40}$/.test(String(b.id))) continue
      e.push({ nom: noms[b.id] || secret, stade: b.stade === 2 || b.stade === 3 ? b.stade : 1 })
    }
    e.sort(function (a, b) { return b.stade - a.stade || (a.nom < b.nom ? -1 : a.nom > b.nom ? 1 : 0) })
    for (k = 0; k < e.length; k++) {
      var li = A.el('li', 'bete' + (e[k].stade > 1 ? ' stade-' + e[k].stade : ''))
      li.appendChild(A.el('span', 'bete-nom', e[k].nom))
      if (e[k].stade > 1) li.appendChild(A.el('span', 'bete-stade', 'Stade ' + e[k].stade))
      ul.appendChild(li)
      if (e[k].stade > 1) evoluees++
    }
    return e.length
  }
  var evoluees = 0
  function ecurie(f) {
    if (!f || !f.peut_voir || !f.vue || !window.fetch) return
    fetch(f.vue + 'ecurie.json', { credentials: 'same-origin', headers: { Accept: 'application/json' } }).then(function (r) { return r.ok ? r.json() : null }).then(function (o) {
      var m = o && o.montures && Array.isArray(o.montures.betes) ? o.montures.betes : []
      var fa = o && o.familiers && Array.isArray(o.familiers.betes) ? o.familiers.betes : []
      var nM = listeEcurie($('ecurie-montures'), m, MONTURES, 'Monture'), nF = listeEcurie($('ecurie-familiers'), fa, FAMILIERS, 'Familier secret')
      if (!nM && !nF) return
      $('ecurie-montures-titre').hidden = !nM
      $('ecurie-familiers-titre').hidden = !nF
      var t = []
      if (nM) t.push(pluriel(nM, 'monture', 'montures') + ' dans son écurie')
      if (nF) t.push(pluriel(nF, 'familier', 'familiers') + ' dans son jardin')
      $('ecurie-note').textContent = t.join(' et ') + ' : ' + (nM + nF > 1 ? 'tous se promènent' : 'il se promène') + ' dans la vue, comme en jeu.' + (evoluees ? ' Au-dessus d\'une bête évoluée, ses étoiles : deux au stade 2, trois au stade 3.' : '')
      $('ecurie').hidden = false
    }).catch(function () { /* sans liste : la partie reste cachee */ })
  }

  // ---- SES NAVIRES AU PONTON (37, le 30/10 ; la vue : navires.json, au droit de l'île) : chaque navire amarré par le nom du
  // jeu de sa coque (ai_mer_table.js, les navires du joueur), dans l'ordre de ses postes, et ses couleurs (la coque, les voiles :
  // celles que la vue lui donne)
  var COQUES = { chaloupe: 'Chaloupe', sloop: 'Sloop', fregate: 'Frégate', corsaire: 'Corsaire', vaisseau_amiral: 'Vaisseau amiral' }
  function couleur(n) { return Number.isInteger(n) && n >= 0 && n <= 0xFFFFFF ? '#' + ('00000' + n.toString(16)).slice(-6) : null }
  function navires(f) {
    if (!f || !f.peut_voir || !f.vue || !window.fetch) return
    fetch(f.vue + 'navires.json', { credentials: 'same-origin', headers: { Accept: 'application/json' } }).then(function (r) { return r.ok ? r.json() : null }).then(function (o) {
      var l = o && Array.isArray(o.navires) ? o.navires.filter(function (n) { return n && COQUES[n.coque] }) : []
      if (!l.length) return
      l.sort(function (a, b) { return (Number(a.poste) || 0) - (Number(b.poste) || 0) })
      var ul = $('navires-liste')
      A.vider(ul)
      for (var k = 0; k < l.length; k++) {
        var li = A.el('li', 'bete navire')
        var c = l[k].couleurs || {}, sw = A.el('span', 'navire-couleurs')
        sw.setAttribute('aria-hidden', 'true')
        var cq = couleur(c.coque), cv = couleur(c.voiles)
        if (cq) { var a = A.el('span', 'navire-coque'); a.style.background = cq; sw.appendChild(a) }
        if (cv) { var v = A.el('span', 'navire-voiles'); v.style.background = cv; sw.appendChild(v) }
        if (sw.childNodes.length) li.appendChild(sw)
        li.appendChild(A.el('span', 'bete-nom', COQUES[l[k].coque]))
        ul.appendChild(li)
      }
      $('navires-note').textContent = (l.length > 1 ? pluriel(l.length, 'navire', 'navires') + ' amarrés à son ponton : ils sont dans la vue, à leur poste, à leurs couleurs.' : 'Un navire amarré à son ponton : il est dans la vue, à son poste, à ses couleurs.')
      $('navires').hidden = false
    }).catch(function () { /* sans liste : la partie reste cachee */ })
  }

  window.IleFiche = {
    remplir: function (o) {
      var a = mesures(o.fiche), b = habitants(o.fiche, o.x)
      $('fiche').hidden = !(a || b)
      minicarte(o.i, o.j, o.x)
      betes(o.fiche)
      ecurie(o.fiche)
      navires(o.fiche)
    }
  }
})()
