// LE CLASSEMENT (classement.html) : lu à l'ouverture de la page dans /api/classement (la base du jeu, que Vercel garde
// 5 minutes), puis écrit dans la page : le podium du Score de Casteria et sa suite, puis les catégories de /top, une
// famille à la fois (les onglets). Tout ce qui vient de la réponse s'écrit en TEXTE (textContent), jamais comme du code
// de page. Sans réponse : « Le classement arrive très bientôt sur le site. En jeu, tape /top. », et un bouton « Réessayer ».
(function () {
  'use strict'
  var API = '/api/classement', DELAI = 12000
  var podium = document.getElementById('podium'), suite = document.getElementById('suite'), lu = document.getElementById('classement-lu')
  var onglets = document.getElementById('onglets'), panneau = document.getElementById('panneau')
  if (!podium || !suite || !lu || !onglets || !panneau) return
  var MEDAILLES = ['assets/classement/medaille_1.png', 'assets/classement/medaille_2.png', 'assets/classement/medaille_3.png']
  var PANNE = 'Le classement arrive très bientôt sur le site. En jeu, tape /top.'
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
  }
  function dessinerLu(iso) {
    var t = ''
    try { t = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) } catch (e) { t = '' }
    lu.textContent = (t ? 'Lu à ' + t + ', heure de Paris. ' : '') + 'Le classement se met à jour toutes les 5 minutes.'
    lu.hidden = false
  }

  // ---------- les catégories : une carte par catégorie de la famille choisie ----------
  function carte(c) {
    var a = el('article', 'carte carte-classement')
    a.appendChild(el('h3', '', String(c.titre)))
    if (c.aide) a.appendChild(el('p', 'cl-aide', String(c.aide)))
    var ol = el('ol', 'cl-rangs')
    var top = c.top || []
    if (!top.length) ol.appendChild(el('li', 'cl-vide', 'Personne ici pour l\'instant.'))
    for (var i = 0; i < top.length; i++) ol.appendChild(ligne(top[i]))
    a.appendChild(ol)
    return a
  }
  function choisir(cle, parClic) {
    choisie = cle
    Array.prototype.forEach.call(onglets.children, function (b) {
      var oui = b.getAttribute('data-cle') === cle
      b.setAttribute('aria-selected', oui ? 'true' : 'false'); b.tabIndex = oui ? 0 : -1
    })
    panneau.setAttribute('aria-labelledby', 'onglet-' + cle)
    vider(panneau)
    donnees.categories.forEach(function (c) { if (c.famille === cle) panneau.appendChild(carte(c)) })
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
    if (!window.fetch) { panne(); return }
    var fini = false
    var minuteur = setTimeout(function () { if (!fini) { fini = true; panne() } }, DELAI)
    fetch(API, { headers: { Accept: 'application/json' } })
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
