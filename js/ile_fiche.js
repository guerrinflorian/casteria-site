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

  window.IleFiche = {
    remplir: function (o) {
      var a = mesures(o.fiche), b = habitants(o.fiche, o.x)
      $('fiche').hidden = !(a || b)
      minicarte(o.i, o.j, o.x)
      betes(o.fiche)
    }
  }
})()
