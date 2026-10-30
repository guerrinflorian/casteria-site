// LES MEILLEURS DES ÉVÉNEMENTS (evenements.html #classements ; dc, la 157 ; le propriétaire, 30/10/2026 : « que les gens aient
// envie de battre »). Les classements de /top Événements, tels que le jeu les publie : GET /api/evenements/<jeu> (le top 10 de
// chaque classement du jeu, les têtes, le K/D de chacun pour la neige et le Rayon) et, connecté, GET /api/moi/evenements (ta
// place dans chaque classement). Un onglet par jeu (le Rayon Éclair seulement quand le jeu le dit allumé : sa fiche), un sous-onglet
// par classement quand le jeu en a deux. Le K/D n'est qu'une information : jamais un classement. Sans données : une phrase claire,
// jamais un 0. Les têtes : le dessin de l'accueil (la face et le chapeau découpés de la peau).
;(function () {
  'use strict'
  var A = window.CasteriaApi
  var corps = document.getElementById('evc-corps')
  if (!A || !corps || !window.fetch) return
  var $ = function (id) { return document.getElementById(id) }
  var NBSP = String.fromCharCode(160)
  var JEUX = [
    { id: 'eclair', nom: 'Le Défi Éclair', court: 'Défi Éclair' },
    { id: 'sol', nom: 'Le Sol qui lâche', court: 'Sol qui lâche' },
    { id: 'neige', nom: 'La Bataille de neige', court: 'Bataille de neige' },
    { id: 'rayon', nom: 'Le Rayon Éclair', court: 'Rayon Éclair' }
  ]
  // le mot court d'un classement (son onglet)
  var COURTS = { ev_sol_gagnees: 'Parties gagnées', ev_neige_gagnees: 'Parties gagnées', ev_neige_victimes: 'Victimes', ev_neige_record: 'Record en une partie', ev_eclair_gagnees: 'Parties gagnées',
    ev_eclair_record: 'Record en une partie', ev_rayon_gagnees: 'Parties gagnées', ev_rayon_victimes: 'Victimes' }
  // un chiffre avec son mot, comme le jeu l'écrit : « 4 parties gagnées », « 12 victimes », « 1 840 points »
  function valeurTexte(id, n) {
    n = Math.max(0, Math.floor(Number(n) || 0))
    var s = String(id)
    if (/_gagnees$/.test(s)) return A.nombre(n) + NBSP + (n > 1 ? 'parties gagnées' : 'partie gagnée')
    if (s === 'ev_eclair_record') return A.nombre(n) + NBSP + (n > 1 ? 'points' : 'point')
    return A.nombre(n) + NBSP + (n > 1 ? 'victimes' : 'victime')
  }
  // le mot d'un onglet : le sien ; un record par carte du Rayon (sa liste vient du jeu) : « Record » et le nom de sa carte
  function libelle(x) {
    if (COURTS[x.id]) return COURTS[x.id]
    if (/^ev_rayon_record_/.test(String(x.id))) return 'Record' + (x.court ? ' ' + x.court : '')
    return x.court || x.titre || ''
  }
  var MEDAILLES = ['assets/classement/medaille_1.png', 'assets/classement/medaille_2.png', 'assets/classement/medaille_3.png']
  var donnees = {}, moi = null, jeu = 'eclair', critere = 0

  function el(nom, classe, t) { return A.el(nom, classe, t) }
  function lire(url) {
    return fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json().then(function (j) { return { statut: r.status, corps: j } }, function () { return { statut: r.status, corps: null } }) })
      .catch(function () { return { statut: 0, corps: null } })
  }
  function tete(url, taille) {
    var e = el('span', 'tete-pixel'), u = A.peau(url), k = taille / 8
    e.setAttribute('aria-hidden', 'true')
    e.style.width = taille + 'px'; e.style.height = taille + 'px'
    e.style.backgroundImage = 'url("' + u + '"), url("' + u + '")'
    e.style.backgroundSize = (64 * k) + 'px ' + (64 * k) + 'px'
    e.style.backgroundPosition = (-40 * k) + 'px ' + (-8 * k) + 'px, ' + (-8 * k) + 'px ' + (-8 * k) + 'px'
    return e
  }
  function pseudoDe(l) {
    var ok = /^[A-Za-z0-9_]{3,16}$/.test(String(l.pseudo))
    var p = el(ok ? 'a' : 'span', 'evc-pseudo', String(l.pseudo))
    if (ok) p.href = 'joueur/' + String(l.pseudo)
    return p
  }
  function estMoi(l) { return !!(moi && l && moi.pseudo && String(l.pseudo).toLowerCase() === String(moi.pseudo).toLowerCase()) }
  function rayonAllume() { var d = donnees.rayon; return !!(d && d.fiche && d.fiche.actif === true) }
  function jeuVisible(j) { return j.id !== 'rayon' || rayonAllume() }

  // ---------- LE RAYON ÉCLAIR (#rayon) : montré seulement allumé ; chaque chiffre vient de sa fiche (le jeu, ai_evt_rayon.js) ----------
  function dixiemes(n) { n = Math.max(0, Math.floor(Number(n) || 0)); return String(Math.floor(n / 10)) + (n % 10 ? ',' + (n % 10) : '') + NBSP + 's' }
  function duree(s) {
    s = Math.max(0, Math.floor(Number(s) || 0))
    var m = Math.floor(s / 60), r = s % 60
    if (!r) return m + NBSP + (m > 1 ? 'minutes' : 'minute')
    return (m ? m + NBSP + 'min' + NBSP : '') + r + NBSP + 's'
  }
  function heure(min) { var h = Math.floor(min / 60), m = min % 60; return h + NBSP + 'h' + (m ? NBSP + (m < 10 ? '0' : '') + m : '') }
  function minuteParis() {
    try {
      var t = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date())
      var h = 0, m = 0
      t.forEach(function (x) { if (x.type === 'hour') h = Number(x.value); if (x.type === 'minute') m = Number(x.value) })
      return h * 60 + m
    } catch (e) { return -1 }
  }
  function rayon() {
    var s = $('rayon'), F = donnees.rayon && donnees.rayon.fiche
    if (!s || !rayonAllume()) return
    // (la 157b ; le proprietaire : « virtuellement infini à l'échelle de la carte ») le rayon traverse les joueurs, jamais les murs
    $('rayon-regle').textContent = 'Une houe, un rayon qui traverse les joueurs, jamais les murs, sur toute la carte : un clic droit tire. Chaque adversaire qu\'il traverse est touché : un point chacun (Doublé, Triplé, Quadruplé, Hécatombe ! d\'un seul tir), et il réapparaît ailleurs, protégé ' +
      dixiemes(F.protegeDixiemes) + '. Un tir toutes les ' + dixiemes(F.rechargeDixiemes) + ', ' + duree(F.dureeS) + ' de partie : le plus de points gagne ; à égalité, le moins de morts ; sans un point, ni place ni victoire. Aucun dégât, rien à perdre.'
    var ol = $('rayon-heures'), maintenant = minuteParis(), min = (F.minutes || []).slice().sort(function (a, b) { return a - b }), prochaine = -1
    A.vider(ol)
    if (maintenant >= 0) for (var i = 0; i < min.length; i++) if (min[i] > maintenant) { prochaine = i; break }
    if (maintenant >= 0 && prochaine < 0 && min.length) prochaine = 0
    min.forEach(function (m, i) {
      var li = el('li', i === prochaine ? 'prochaine' : (prochaine > 0 && i < prochaine ? 'passee' : ''), heure(m))
      if (i === prochaine) li.setAttribute('aria-label', heure(m) + ', la prochaine partie')
      ol.appendChild(li)
    })
    var ul = $('rayon-cartes')
    A.vider(ul)
    ;(F.cartes || []).forEach(function (c) {
      var li = el('li', ''), mots = []
      li.appendChild(el('b', '', c.nom))
      if (c.min) mots.push('dès ' + c.min + NBSP + 'joueurs')
      if (c.max && c.salles) mots.push(c.max + ' par salle, jusqu\'à ' + c.salles + ' salles (' + A.nombre(c.max * c.salles) + ' places)')
      else if (c.max) mots.push(c.max + ' joueurs au plus')
      if (mots.length) li.appendChild(document.createTextNode(mots.join(' ; ').replace(/^./, function (x) { return x.toUpperCase() }) + '.'))
      ul.appendChild(li)
    })
    $('rayon-cartes-bloc').hidden = !(F.cartes && F.cartes.length)
    var lo = $('rayon-lots'), parSalle = (F.cartes || []).some(function (c) { return c.salles > 1 })
    A.vider(lo)
    var tous = el('li', '')
    tous.appendChild(el('b', '', 'Pour chacun'))
    // (la 157, f1f403b17) les jetons de participation seulement a qui a tire au moins une fois (le cadre, def.actif) ; l'XP a tous
    tous.appendChild(document.createTextNode('Des jetons si tu tires au moins une fois, et de l\'XP à chaque partie.'))
    lo.appendChild(tous)
    // deux paliers de suite au meme lot (dès 3 et dès 4 : la Clé de Vote au 1er) : le premier seul
    var avant = ''
    ;(F.lots || []).forEach(function (g) {
      var cle = g.lots.map(function (x) { return x.rang + ':' + x.nom }).join('|')
      if (cle === avant) return
      avant = cle
      var li = el('li', '')
      li.appendChild(el('b', '', 'Dès ' + g.de + NBSP + 'joueurs' + (parSalle ? ' dans ta salle' : '')))
      li.appendChild(document.createTextNode(g.lots.map(function (x) { return A.rang(x.rang) + NBSP + ': ' + x.nom }).join(', ') + '.'))
      lo.appendChild(li)
    })
    $('rayon-lots-bloc').hidden = false
    s.hidden = false
  }

  // ---------- les onglets ----------
  function onglets() {
    var o = $('evc-onglets'), c = $('evc-criteres'), d = donnees[jeu]
    A.vider(o); A.vider(c)
    JEUX.forEach(function (j) {
      if (!jeuVisible(j)) return
      var b = el('button', 'evc-onglet' + (j.id === jeu ? ' actif' : ''), j.court)
      b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', j.id === jeu ? 'true' : 'false')
      b.addEventListener('click', function () { jeu = j.id; critere = 0; montrer() })
      o.appendChild(b)
    })
    var cr = d && Array.isArray(d.criteres) ? d.criteres : []
    c.hidden = cr.length < 2
    cr.forEach(function (x, i) {
      var b = el('button', 'evc-critere' + (i === critere ? ' actif' : ''), libelle(x))
      b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', i === critere ? 'true' : 'false')
      b.addEventListener('click', function () { critere = i; montrer() })
      c.appendChild(b)
    })
  }

  // ---------- le podium (2, 1, 3), puis du 4e au 10e ----------
  function marche(top, r) {
    var l = top[r - 1] || null, li = el('li', 'evc-marche evc-p' + r + (estMoi(l) ? ' toi' : ''))
    var j = el('div', 'evc-joueur')
    if (l) {
      if (r === 1) { var cou = document.createElement('img'); cou.className = 'evc-couronne'; cou.src = 'assets/classement/couronne.png'; cou.alt = ''; cou.width = 48; cou.height = 40; j.appendChild(cou) }
      j.appendChild(tete(l.peau, r === 1 ? 64 : 52))
      j.appendChild(pseudoDe(l))
      j.appendChild(el('span', 'evc-valeur', A.texte(l.texte || String(l.valeur))))
      if (l.kd) j.appendChild(el('span', 'evc-kd', l.kd))
      if (estMoi(l)) j.appendChild(el('span', 'evc-marque', 'Toi'))
    } else j.appendChild(el('span', 'evc-libre', 'Place libre'))
    li.appendChild(j)
    var s = el('div', 'evc-socle'), m = document.createElement('img')
    m.className = 'evc-medaille'; m.src = MEDAILLES[r - 1]; m.alt = A.rang(r); m.width = 20; m.height = 28
    s.appendChild(m)
    li.appendChild(s)
    return li
  }
  function ligne(top, r) {
    var l = top[r - 1], li = el('li', 'evc-ligne' + (estMoi(l) ? ' toi' : ''))
    li.appendChild(el('span', 'evc-rang', A.rang(r)))
    li.appendChild(tete(l.peau, 30))
    var q = el('span', 'evc-qui')
    q.appendChild(pseudoDe(l))
    if (l.kd) q.appendChild(el('span', 'evc-kd', l.kd))
    if (estMoi(l)) q.appendChild(el('span', 'evc-marque', 'Toi'))
    li.appendChild(q)
    li.appendChild(el('span', 'evc-valeur', A.texte(l.texte || String(l.valeur))))
    return li
  }
  function phrase(t) { return el('p', 'evc-etat', t) }

  // ---------- ta place ----------
  function taPlace() {
    var p = $('evc-toi'), d = donnees[jeu], c = d && d.criteres ? d.criteres[critere] : null
    A.vider(p); p.hidden = true
    if (!d || d.etat !== 'ok' || !c) return
    if (!moi) {
      p.appendChild(document.createTextNode('Ta place dans ce classement : '))
      var a = el('a', 'evc-lien', 'connecte-toi'); a.href = 'connexion.html'; p.appendChild(a)
      p.hidden = false
      return
    }
    var mj = moi.jeux && moi.jeux[jeu], mc = mj && mj.criteres ? mj.criteres[critere] : null
    if (moi.equipe) { p.textContent = 'L\'équipe n\'est pas classée.'; p.hidden = false; return }
    if (!mc) return
    p.appendChild(el('span', 'evc-marque', 'Toi'))
    if (mc.place === 'classe') {
      p.appendChild(el('b', '', A.rang(mc.rang)))
      p.appendChild(el('span', '', (c.top[mc.rang - 1] && c.top[mc.rang - 1].texte) || valeurTexte(c.id, mc.valeur)))
    } else if (mc.place === 'apres_100') { p.appendChild(el('b', '', 'Après la 100e place')); p.appendChild(el('span', '', valeurTexte(c.id, mc.valeur))) }
    else if (mc.place === 'bientot') p.appendChild(el('span', '', 'Ta place arrive dans quelques minutes.'))
    else p.appendChild(el('span', '', 'Pas encore classé : joue une partie à 4 joueurs au moins.'))
    if (mj && mj.kd) p.appendChild(el('span', 'evc-kd', mj.kd))
    p.hidden = false
  }

  function montrer() {
    onglets()
    A.vider(corps)
    var d = donnees[jeu], c = d && d.criteres ? d.criteres[critere] : null
    if (!d) { corps.appendChild(phrase('Les classements ne se lisent pas pour l\'instant. Réessaie dans une minute.')); taPlace(); return }
    if (d.etat !== 'ok' || !c || c.classes === null) { corps.appendChild(phrase('Pas encore de données : la première partie à 4 joueurs ouvrira ce classement.')); taPlace(); return }
    if (!c.top.length) { corps.appendChild(phrase('Personne encore : la prochaine partie à 4 joueurs ouvre le classement.')); taPlace(); return }
    var gauche = el('div', 'evc-gauche'), podium = el('ol', 'evc-podium')
    podium.setAttribute('aria-label', 'Les trois premiers')
    ;[2, 1, 3].forEach(function (r) { podium.appendChild(marche(c.top, r)) })
    gauche.appendChild(podium)
    corps.appendChild(gauche)
    if (c.top.length > 3) {
      var liste = el('ol', 'evc-liste'); liste.setAttribute('aria-label', 'Du 4e au 10e')
      for (var r = 4; r <= Math.min(10, c.top.length); r++) liste.appendChild(ligne(c.top, r))
      corps.appendChild(liste)
    }
    taPlace()
    ajuster()
  }
  // un pseudo tient sur UNE ligne : sa taille baisse jusqu'à tenir (11 px au plus petit)
  function ajuster() {
    Array.prototype.forEach.call(corps.querySelectorAll('.evc-pseudo'), function (e) {
      e.style.fontSize = ''
      var t = parseFloat(window.getComputedStyle(e).fontSize) || 16
      while (t > 11 && e.scrollWidth > e.clientWidth + 1) { t -= 1; e.style.fontSize = t + 'px' }
    })
  }

  var connecte = /(?:^|;\s*)casteria_connecte=1(?:;|$)/.test(document.cookie || '')
  Promise.all(JEUX.map(function (j) { return lire('/api/evenements/' + j.id) }).concat([connecte ? lire('/api/moi/evenements') : Promise.resolve(null)])).then(function (rs) {
    JEUX.forEach(function (j, i) { donnees[j.id] = rs[i] && rs[i].statut === 200 && rs[i].corps && Array.isArray(rs[i].corps.criteres) ? rs[i].corps : null })
    var m = rs[JEUX.length]
    moi = m && m.statut === 200 && m.corps && m.corps.jeux ? m.corps : null
    rayon()
    montrer()
  })
  var minuteur = null
  window.addEventListener('resize', function () { clearTimeout(minuteur); minuteur = setTimeout(ajuster, 150) })
})()
