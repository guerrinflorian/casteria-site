// LE CLASSEMENT (classement.html) : lu à l'ouverture de la page dans le fichier classement.json d'un gist GitHub, que le
// serveur du jeu réécrit lui-même (la 119 : leaderboard.js, puis Site.publier de casteria-moteur, au plus une fois toutes
// les 5 minutes ; la base du jeu refuse les connexions venues de Vercel), puis écrit dans la page : le podium du Score de
// Casteria et sa suite, puis les catégories de /top, une famille à la fois (les onglets). Le format est celui de l'ancien
// /api/classement : { lu, familles: [{ cle, nom }], categories: [{ id, famille, titre, aide, classes, top: [{ rang,
// pseudo, valeur, texte }] }] }. (la 125 du jeu, le 18/10/2026) Un temps de donjon porte aussi « donjon » { id, nom, niveau }
// et « tailles » [{ taille, nom, classes, top }] (seul, à deux, à trois) : les niveaux d'un même donjon vont dans UNE carte,
// avec le niveau (I, II, III) et la taille du groupe au départ à choisir, comme la rangée des donjons de /top ; un fichier
// d'avant, sans eux : une carte par catégorie, comme avant. Tout ce qui vient du fichier s'écrit en TEXTE (textContent),
// jamais comme du code de page. Sans réponse, ou tant que GIST_ID est vide : « Le classement ne s'affiche pas pour
// l'instant. En jeu, tape /top. », et un bouton « Réessayer ».
(function () {
  'use strict'
  // le gist du classement : son compte et son identifiant (la fin de son adresse sur gist.github.com) ; vide : la panne
  var GIST_COMPTE = 'guerrinflorian', GIST_ID = '4337783e1d14963774decfe06f2709da'
  var SOURCE = GIST_ID ? 'https://gist.githubusercontent.com/' + GIST_COMPTE + '/' + GIST_ID + '/raw/classement.json' : ''
  var DELAI = 12000
  var podium = document.getElementById('podium'), suite = document.getElementById('suite'), lu = document.getElementById('classement-lu')
  var onglets = document.getElementById('onglets'), panneau = document.getElementById('panneau')
  if (!podium || !suite || !lu || !onglets || !panneau) return
  var MEDAILLES = ['assets/classement/medaille_1.png', 'assets/classement/medaille_2.png', 'assets/classement/medaille_3.png']
  var PANNE = 'Le classement ne s\'affiche pas pour l\'instant. En jeu, tape /top.'
  var ROMAINS = ['I', 'II', 'III']
  var donnees = null, choisie = ''

  function el(nom, classe, texte) { var e = document.createElement(nom); if (classe) e.className = classe; if (texte !== undefined) e.textContent = texte; return e }
  function image(src, classe, alt, l, h) { var i = document.createElement('img'); i.src = src; i.className = classe; i.alt = alt; i.width = l; i.height = h; return i }
  function vider(e) { while (e.firstChild) e.removeChild(e.firstChild) }
  function rangTexte(r) { return r === 1 ? '1er' : r + 'e' }

  // ---------- l'attente et la panne ----------
  function etat(texte, reessayer) {
    vider(podium)
    podium.appendChild(el('p', 'classement-etat', texte))
    if (reessayer) { var b = el('button', 'bouton bouton-bois', 'Réessayer'); b.type = 'button'; b.addEventListener('click', charger); podium.appendChild(b) }
  }
  function panne() {
    etat(PANNE, true)
    suite.hidden = true; lu.hidden = true; onglets.hidden = true
    vider(panneau); panneau.appendChild(el('p', 'classement-etat', PANNE))
  }

  // ---------- une ligne : la médaille (les trois premiers) ou le rang, le pseudo, la valeur ----------
  function ligne(e) {
    var li = el('li', e.rang <= 3 ? 'cl-r' + e.rang : '')
    var r = el('span', 'cl-rang')
    if (e.rang <= 3) r.appendChild(image(MEDAILLES[e.rang - 1], 'pixel', rangTexte(e.rang), 15, 21))
    else r.textContent = rangTexte(e.rang)
    li.appendChild(r)
    li.appendChild(el('span', 'cl-pseudo', String(e.pseudo)))
    li.appendChild(el('span', 'cl-valeur', String(e.texte)))
    return li
  }

  // ---------- le Score : le podium (le 1er au milieu, sa couronne), puis la suite jusqu'au dixième ----------
  function marche(e, r) {
    var m = el('div', 'cl-marche cl-m' + r)
    if (e) {
      if (r === 1) m.appendChild(image('assets/classement/couronne.png', 'cl-couronne pixel', '', 48, 40))
      m.appendChild(image(MEDAILLES[r - 1], 'cl-medaille pixel', rangTexte(r), 30, 42))
      m.appendChild(el('span', 'cl-pseudo', String(e.pseudo)))
      m.appendChild(el('span', 'cl-valeur', String(e.texte)))
    } else m.appendChild(el('span', 'cl-personne', 'Personne encore'))
    var s = el('div', 'cl-socle', String(r)); s.setAttribute('aria-hidden', 'true'); m.appendChild(s)
    return m
  }
  function dessinerScore(c) {
    var top = c && c.top ? c.top : []
    vider(suite)
    if (!top.length) { etat('Personne ici pour l\'instant.'); suite.hidden = true; return }
    vider(podium)
    for (var r = 1; r <= 3; r++) podium.appendChild(marche(top[r - 1], r))
    for (var i = 3; i < top.length; i++) suite.appendChild(ligne(top[i]))
    suite.hidden = top.length <= 3
    ajusterPodium()
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajusterPodium)
  }
  // (18/10/2026) un pseudo du podium tient sur UNE ligne : dans une colonne étroite (un téléphone de 360 px, un pseudo de 16
  // lettres), sa taille baisse tant qu'il fait plus d'une ligne (sa hauteur, une ligne étant 1,1 fois sa taille), 10 px au
  // plus petit ; au-delà seulement il passe à la ligne (avant : « Chevalier_S » puis « ables »). Refait quand les polices
  // arrivent et quand la fenêtre change de taille.
  function ajusterPodium() {
    Array.prototype.forEach.call(podium.querySelectorAll('.cl-marche .cl-pseudo'), function (sp) {
      sp.style.fontSize = ''
      var t = parseFloat(window.getComputedStyle(sp).fontSize) || 16
      while (sp.getBoundingClientRect().height > t * 1.6 && t > 10) { t--; sp.style.fontSize = t + 'px' }
    })
  }
  // la police du podium arrive souvent APRÈS le dessin (elle ne se charge qu'au premier texte qui l'emploie) : refait à
  // chaque police chargée
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', ajusterPodium)
  var minuteurTaille = 0
  window.addEventListener('resize', function () { clearTimeout(minuteurTaille); minuteurTaille = setTimeout(ajusterPodium, 150) })
  function dessinerLu(iso) {
    var t = ''
    try { t = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) } catch (e) { t = '' }
    // le serveur publie au plus toutes les 5 minutes, et GitHub garde le fichier jusqu'à 5 minutes de plus
    lu.textContent = (t ? 'Lu à ' + t + ', heure de Paris. ' : '') + 'Le classement se met à jour toutes les 5 à 10 minutes.'
    lu.hidden = false
  }

  // ---------- les catégories : une carte par catégorie de la famille choisie ----------
  function remplir(ol, top) {
    vider(ol)
    if (!top.length) ol.appendChild(el('li', 'cl-vide', 'Personne ici pour l\'instant.'))
    for (var i = 0; i < top.length; i++) ol.appendChild(ligne(top[i]))
  }
  function carte(c) {
    var a = el('article', 'carte carte-classement')
    a.appendChild(el('h3', '', String(c.titre)))
    if (c.aide) a.appendChild(el('p', 'cl-aide', String(c.aide)))
    var ol = el('ol', 'cl-rangs')
    remplir(ol, c.top || [])
    a.appendChild(ol)
    return a
  }

  // ---------- un donjon : ses niveaux dans UNE carte (la rangée des donjons de /top) ----------
  // une rangée de choix : son mot, puis ses boutons (bouton : son texte, son nom lu et au survol, ce que fait son clic ; le
  // choisi porte aria-pressed="true" et se dessine en rouge)
  function rangee(mot, nom) {
    var r = el('div', 'cl-choix-rangee')
    r.setAttribute('role', 'group'); r.setAttribute('aria-label', nom)
    r.appendChild(el('span', 'cl-choix-mot', mot))
    return r
  }
  function bouton(r, texte, nom, choisi) {
    var b = el('button', 'cl-choix', texte)
    b.type = 'button'; b.setAttribute('aria-pressed', 'false')
    if (nom) { b.setAttribute('aria-label', nom); b.title = nom }
    b.addEventListener('click', choisi)
    r.appendChild(b)
    return b
  }
  // la taille t d'un niveau : { taille, nom, classes, top } ou rien (0 : tous les groupes, le top du niveau lui-même)
  function tailleDe(c, t) {
    var l = Array.isArray(c.tailles) ? c.tailles : []
    for (var i = 0; i < l.length; i++) if (Number(l[i].taille) === t) return l[i]
    return null
  }
  // la carte : le nom du donjon, le niveau (I, II, III : les niveaux que le fichier porte), les joueurs du groupe au départ
  // (Tous, puis 1, 2, 3 comme les pastilles de /top, leur nom au survol et pour les lecteurs d'écran : « Seul », « À deux »,
  // « À trois » ; un niveau qui n'a pas une taille cache son bouton), l'aide du niveau, ses dix premiers. Les boutons sont
  // faits une fois : un clic change aria-pressed et la liste, le bouton garde la main du clavier.
  function carteDonjon(d) {
    var a = el('article', 'carte carte-classement carte-donjon')
    var choix = { niv: 0, tai: 0 }, bn = [], bt = [], tailles = []
    var rn = rangee('Niveau', 'Le niveau du donjon'), rt = rangee('Joueurs', 'Les joueurs du groupe au départ de la partie')
    var aide = el('p', 'cl-aide'), ol = el('ol', 'cl-rangs')
    a.appendChild(el('h3', '', d.nom))
    a.appendChild(rn); a.appendChild(rt); a.appendChild(aide); a.appendChild(ol)
    d.niveaux.forEach(function (c) {
      (Array.isArray(c.tailles) ? c.tailles : []).forEach(function (t) {
        var v = Number(t.taille)
        if (v > 0 && !tailles.some(function (x) { return x.v === v })) tailles.push({ v: v, nom: String(t.nom) })
      })
    })
    tailles.sort(function (x, y) { return x.v - y.v })
    function montrer() {
      var c = d.niveaux[choix.niv], x = choix.tai ? tailleDe(c, choix.tai) : null
      if (choix.tai && !x) choix.tai = 0
      bn.forEach(function (b) { b.el.setAttribute('aria-pressed', b.v === choix.niv ? 'true' : 'false') })
      bt.forEach(function (b) { b.el.hidden = b.v > 0 && !tailleDe(c, b.v); b.el.setAttribute('aria-pressed', b.v === choix.tai ? 'true' : 'false') })
      aide.textContent = c.aide ? String(c.aide) : ''
      aide.hidden = !c.aide
      remplir(ol, (x ? x.top : c.top) || [])
    }
    d.niveaux.forEach(function (c, i) {
      var r = Number(c.donjon.niveau) || i + 1
      bn.push({ v: i, el: bouton(rn, ROMAINS[r - 1] || String(r), String(c.titre), function () { choix.niv = i; montrer() }) })
    })
    rn.hidden = d.niveaux.length < 2
    if (tailles.length) {
      bt.push({ v: 0, el: bouton(rt, 'Tous', 'Tous les groupes', function () { choix.tai = 0; montrer() }) })
      tailles.forEach(function (t) { bt.push({ v: t.v, el: bouton(rt, String(t.v), t.nom, function () { choix.tai = t.v; montrer() }) }) })
    }
    rt.hidden = !tailles.length
    montrer()
    return a
  }
  // les cartes d'une famille, dans l'ordre du fichier ; les niveaux d'un même donjon se rangent dans la carte de ce donjon,
  // à la place du premier
  function cartes(cle) {
    var blocs = [], par = Object.create(null)
    donnees.categories.forEach(function (c) {
      if (c.famille !== cle) return
      var id = c.donjon && c.donjon.id ? String(c.donjon.id) : ''
      if (!id) { blocs.push({ c: c }); return }
      if (!par[id]) { par[id] = { nom: String(c.donjon.nom || c.titre), niveaux: [] }; blocs.push({ d: par[id] }) }
      par[id].niveaux.push(c)
    })
    return blocs.map(function (b) { return b.c ? carte(b.c) : carteDonjon(b.d) })
  }
  function choisir(cle, parClic) {
    choisie = cle
    Array.prototype.forEach.call(onglets.children, function (b) {
      var oui = b.getAttribute('data-cle') === cle
      b.setAttribute('aria-selected', oui ? 'true' : 'false'); b.tabIndex = oui ? 0 : -1
    })
    panneau.setAttribute('aria-labelledby', 'onglet-' + cle)
    vider(panneau)
    cartes(cle).forEach(function (a) { panneau.appendChild(a) })
    if (parClic && window.history && history.replaceState) history.replaceState(null, '', '#' + cle)
  }
  function dessiner() {
    var cats = donnees.categories, score = null
    for (var i = 0; i < cats.length; i++) if (cats[i].id === 'score') score = cats[i]
    dessinerScore(score)
    dessinerLu(donnees.lu)
    // les onglets : les familles de /top qui ont des catégories, sans celle du Score (elle a sa section)
    var fams = (donnees.familles || []).filter(function (f) {
      return f.cle !== 'general' && cats.some(function (c) { return c.famille === f.cle })
    })
    vider(onglets)
    fams.forEach(function (f) {
      var b = el('button', 'cl-onglet', String(f.nom))
      b.type = 'button'; b.id = 'onglet-' + f.cle; b.setAttribute('role', 'tab'); b.setAttribute('aria-controls', 'panneau'); b.setAttribute('data-cle', f.cle)
      b.addEventListener('click', function () { choisir(f.cle, true) })
      onglets.appendChild(b)
    })
    onglets.hidden = !fams.length
    if (!fams.length) { vider(panneau); return }
    // la famille de l'adresse (classement.html#mer), sinon la première
    var voulue = (location.hash || '').slice(1)
    if (!fams.some(function (f) { return f.cle === choisie })) choisie = fams.some(function (f) { return f.cle === voulue }) ? voulue : fams[0].cle
    choisir(choisie, false)
  }
  // les flèches du clavier passent d'un onglet à l'autre
  onglets.addEventListener('keydown', function (ev) {
    if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return
    var bs = Array.prototype.slice.call(onglets.children), i = bs.indexOf(document.activeElement)
    if (i < 0) return
    var j = (i + (ev.key === 'ArrowRight' ? 1 : bs.length - 1)) % bs.length
    bs[j].focus(); choisir(bs[j].getAttribute('data-cle'), true); ev.preventDefault()
  })

  // ---------- la lecture ----------
  function charger() {
    etat('On compte les points...')
    vider(panneau)
    if (!window.fetch || !SOURCE) { panne(); return }
    var fini = false
    var minuteur = setTimeout(function () { if (!fini) { fini = true; panne() } }, DELAI)
    // une lecture simple (sans en-tête de plus : aucune demande préalable du navigateur), sans cookie ni référent
    fetch(SOURCE, { credentials: 'omit', referrerPolicy: 'no-referrer' })
      .then(function (r) { if (!r.ok) throw new Error('indisponible'); return r.json() })
      .then(function (o) {
        if (fini) return
        fini = true; clearTimeout(minuteur)
        if (!o || o.indisponible || !Array.isArray(o.categories)) { panne(); return }
        donnees = o
        dessiner()
      })
      .catch(function () { if (fini) return; fini = true; clearTimeout(minuteur); panne() })
  }
  charger()
})()
