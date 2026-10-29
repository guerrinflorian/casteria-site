// LES GRAPHIQUES DE L'ESPACE ADMIN (admin.html ; le prototype du 29/10/2026) : maison, en SVG et en HTML, sans aucune
// bibliothèque. Les règles (la méthode des graphiques de la session) : des traits fins (2 px), une aire à 10 % de la
// couleur, des barres de 24 px au plus aux bouts carrés (le site n'a aucun arrondi), un fil d'axe d'un pixel ; une seule
// échelle par graphique (jamais deux axes) ; une légende dès deux séries ; les valeurs écrites aux bouts, jamais sur
// chaque point ; au survol et au clavier, un fil vertical et une bulle avec toutes les séries ; et sous chaque graphique,
// « Voir les chiffres » (le tableau). Tout texte s'écrit en texte (textContent), jamais en code de page.
// UNE VALEUR ABSENTE (null) N'EST JAMAIS UN 0 (le propriétaire, 29/10) : la courbe s'interrompt, la colonne manque, le
// tableau dit « pas de donnée » ; un graphique sans aucune valeur dit « pas encore de données ».
// Les couleurs (validées pour la nuit du site, #221432 : le bandeau de luminosité, l'écart pour les daltoniens, le
// contraste) : l'or, la mer, le vert, le violet, dans cet ordre, jamais tournées (au-delà de quatre parts : « Autres », gris).
(function () {
  'use strict'
  var NS = 'http://www.w3.org/2000/svg'
  var COULEURS = { or: '#B9851A', mer: '#3E8FC8', vert: '#3FA34A', violet: '#A35FD0' }
  var ORDRE = ['or', 'mer', 'vert', 'violet'], AUTRES = '#7D6E96'
  var FOND = '#221432', FIL = '#3A2652', TEXTE = '#F4EAFF', TEXTE2 = '#CDB8E6', TEXTE3 = '#A994C4'
  var NBSP = String.fromCharCode(160), SANS = 'pas de donnée', VIDE = 'pas encore de données'
  var mois = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

  function svg(nom, attrs) { var e = document.createElementNS(NS, nom); for (var k in attrs || {}) e.setAttribute(k, attrs[k]); return e }
  function el(nom, classe, t) { var e = document.createElement(nom); if (classe) e.className = classe; if (t !== undefined && t !== null) e.textContent = String(t); return e }
  function vider(e) { while (e.firstChild) e.removeChild(e.firstChild) }
  // un nombre, ou null (jamais un 0 inventé)
  function num(x) { return typeof x === 'number' && isFinite(x) ? x : null }
  // une date « 2026-10-29 » : « 29 oct. »
  function jour(d) { var p = String(d).split('-'); return p.length === 3 ? Number(p[2]) + NBSP + mois[Number(p[1]) - 1] : String(d) }
  // un axe propre : 0, puis des pas ronds (1, 2 ou 5 fois une puissance de 10)
  function pas(max, n) { var brut = max / Math.max(1, n), p = Math.pow(10, Math.floor(Math.log(brut) / Math.LN10)), k = brut / p; return (k <= 1 ? 1 : k <= 2 ? 2 : k <= 5 ? 5 : 10) * p }
  function compact(v) { var a = Math.abs(v); if (a >= 1e6) return (v / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace('.', ',').replace(',0', '') + NBSP + 'M'; if (a >= 1e3) return (v / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace('.', ',').replace(',0', '') + NBSP + 'k'; return String(Math.round(v)) }
  function vide(boite, t) { boite.appendChild(el('p', 'g-vide', t || VIDE)) }

  // ---------- le tableau des chiffres, sous chaque graphique (fermé d'office) ----------
  function tableau(titres, lignes) {
    var d = el('details', 'g-tableau'), s = el('summary', '', 'Voir les chiffres'), t = el('table'), th = el('thead'), tr = el('tr'), tb = el('tbody')
    titres.forEach(function (x) { var c = el('th', '', x); c.setAttribute('scope', 'col'); tr.appendChild(c) })
    th.appendChild(tr); t.appendChild(th)
    lignes.forEach(function (l) { var r = el('tr'); l.forEach(function (x, i) { r.appendChild(el(i ? 'td' : 'th', '', x)) }); tb.appendChild(r) })
    t.appendChild(tb); d.appendChild(s); d.appendChild(t)
    return d
  }
  // la légende (dès deux séries) : la marque de la série (un trait pour une ligne, un carré pour une aire), puis son nom
  function legende(series) {
    var l = el('ul', 'g-legende')
    series.forEach(function (s) { var li = el('li'), m = el('span', 'g-cle' + (s.aire ? ' aire' : '')); m.style.background = COULEURS[s.couleur]; m.setAttribute('aria-hidden', 'true'); li.appendChild(m); li.appendChild(document.createTextNode(s.nom)); l.appendChild(li) })
    return l
  }

  // LA TAILLE VRAIE : un graphique se dessine à la largeur de sa boîte (les textes restent à 11 et 12 px, jamais rétrécis), et se
  // redessine quand la fenêtre change de largeur
  var aRefaire = [], minuteur = 0
  function largeur(boite) { return Math.max(280, Math.round(boite.getBoundingClientRect().width || 720)) }
  function garder(boite, f) {
    aRefaire = aRefaire.filter(function (x) { return x.boite !== boite && x.boite.isConnected })
    aRefaire.push({ boite: boite, f: f, l: largeur(boite) })
    f()
  }
  window.addEventListener('resize', function () {
    clearTimeout(minuteur)
    minuteur = setTimeout(function () { aRefaire = aRefaire.filter(function (x) { return x.boite.isConnected }); aRefaire.forEach(function (x) { var l = largeur(x.boite); if (l !== x.l) { x.l = l; x.f() } }) }, 200)
  })

  // ---------- la courbe : une ou plusieurs séries sur la même échelle, au fil du temps ----------
  // o : { titre (lu), series: [{ nom, couleur ('or'...), aire, points: [{ date, valeur (un nombre, ou null) }] }], format(v)
  // (les valeurs), formatAxe(v) (l'axe ; par défaut, compact), hauteur }
  function courbe(boite, o) { garder(boite, function () { dessinerCourbe(boite, o) }) }
  function dessinerCourbe(boite, o) {
    vider(boite)
    var series = o.series.filter(function (s) { return s.points && s.points.length }), format = o.format || compact, axe = o.formatAxe || compact
    var max = null
    series.forEach(function (s) { s.points.forEach(function (p) { var v = num(p.valeur); if (v !== null) max = max === null ? v : Math.max(max, v) }) })
    if (!series.length || max === null) return vide(boite)
    var n = series[0].points.length, W = largeur(boite), H = o.hauteur || 240, G = 52, D = W < 420 ? 52 : 64, T = 14, B = 30
    var pp = pas(max || 1, 4), haut = Math.max(pp, Math.ceil(max / pp) * pp)
    var x = function (i) { return G + (n < 2 ? (W - G - D) / 2 : i * (W - G - D) / (n - 1)) }, y = function (v) { return T + (H - T - B) * (1 - v / haut) }
    var s0 = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'g-svg', role: 'img', 'aria-label': o.titre || '' })
    // la grille et l'axe : des fils d'un pixel, discrets
    for (var v = 0; v <= haut + 1e-9; v += pp) {
      s0.appendChild(svg('line', { x1: G, x2: W - D, y1: y(v), y2: y(v), stroke: FIL, 'stroke-width': 1 }))
      var tv = svg('text', { x: G - 8, y: y(v) + 4, 'text-anchor': 'end', fill: TEXTE3, 'font-size': 11 }); tv.textContent = axe(v); s0.appendChild(tv)
    }
    var sautX = Math.max(1, Math.ceil(n / Math.max(3, Math.floor((W - G - D) / 80))))
    for (var i = 0; i < n; i += sautX) { var tx = svg('text', { x: x(i), y: H - 9, 'text-anchor': 'middle', fill: TEXTE3, 'font-size': 11 }); tx.textContent = jour(series[0].points[i].date); s0.appendChild(tx) }
    // les séries, par morceaux (une journée sans donnée coupe le trait) : l'aire (10 %), le trait (2 px), le point du bout
    // (8 px, un anneau de la couleur du fond) et sa valeur
    var bouts = []
    series.forEach(function (s, k) {
      var c = COULEURS[s.couleur] || COULEURS[ORDRE[k % 4]], morceaux = [], m = null
      s.points.forEach(function (p, j) { var v = num(p.valeur); if (v === null) { m = null; return } if (!m) { m = []; morceaux.push(m) } m.push([j, v]) })
      morceaux.forEach(function (mc) {
        var d = ''
        mc.forEach(function (q, z) { d += (z ? 'L' : 'M') + x(q[0]).toFixed(1) + ' ' + y(q[1]).toFixed(1) })
        if (s.aire) s0.appendChild(svg('path', { d: d + 'L' + x(mc[mc.length - 1][0]).toFixed(1) + ' ' + y(0) + 'L' + x(mc[0][0]).toFixed(1) + ' ' + y(0) + 'Z', fill: c, 'fill-opacity': 0.1 }))
        s0.appendChild(svg('path', { d: mc.length > 1 ? d : d + 'l0.1 0', fill: 'none', stroke: c, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }))
      })
      var der = morceaux.length ? morceaux[morceaux.length - 1] : null
      if (der) { var q = der[der.length - 1]; bouts.push({ c: c, j: q[0], v: q[1], k: k }) }
    })
    bouts.forEach(function (b, i) {
      var vy = y(b.v)
      s0.appendChild(svg('circle', { cx: x(b.j), cy: vy, r: 4, fill: b.c, stroke: FOND, 'stroke-width': 2 }))
      var tl = svg('text', { x: x(b.j) + 9, y: vy + 4 + (i === 1 && Math.abs(vy - y(bouts[0].v)) < 14 ? 13 : 0), fill: TEXTE, 'font-size': 12, 'font-weight': 700 }); tl.textContent = format(b.v); s0.appendChild(tl)
    })
    // le fil qui suit la souris, la bulle : toutes les séries à cette date (et au clavier : les flèches)
    var fil = svg('line', { x1: 0, x2: 0, y1: T, y2: H - B, stroke: TEXTE2, 'stroke-width': 1, opacity: 0 }), marques = []
    s0.appendChild(fil)
    series.forEach(function (s) { var pt = svg('circle', { r: 5, fill: COULEURS[s.couleur], stroke: FOND, 'stroke-width': 2, opacity: 0 }); marques.push(pt); s0.appendChild(pt) })
    var zone = svg('rect', { x: G, y: T, width: W - G - D, height: H - T - B, fill: 'transparent', tabindex: 0, role: 'group', 'aria-label': (o.titre || 'Le graphique') + ' : les flèches parcourent les jours' })
    s0.appendChild(zone)
    var cadre = el('div', 'g-cadre'), bulle = el('div', 'g-bulle'), courant = -1
    bulle.hidden = true
    function montrer(j) {
      courant = Math.max(0, Math.min(n - 1, j))
      fil.setAttribute('x1', x(courant)); fil.setAttribute('x2', x(courant)); fil.setAttribute('opacity', 1)
      vider(bulle)
      bulle.appendChild(el('span', 'g-date', jour(series[0].points[courant].date)))
      series.forEach(function (s, k) {
        var v = num(s.points[courant].valeur), ligne = el('span', 'g-ligne'), cle = el('i')
        if (v === null) marques[k].setAttribute('opacity', 0); else { marques[k].setAttribute('cx', x(courant)); marques[k].setAttribute('cy', y(v)); marques[k].setAttribute('opacity', 1) }
        cle.style.background = COULEURS[s.couleur]; ligne.appendChild(cle); ligne.appendChild(el('b', '', v === null ? SANS : format(v))); ligne.appendChild(el('span', '', s.nom)); bulle.appendChild(ligne)
      })
      bulle.hidden = false
      var r = s0.getBoundingClientRect(), px = x(courant) / W * r.width
      bulle.style.left = Math.min(r.width - 170, Math.max(0, px + 12)) + 'px'
    }
    function cacher() { fil.setAttribute('opacity', 0); marques.forEach(function (p) { p.setAttribute('opacity', 0) }); bulle.hidden = true; courant = -1 }
    zone.addEventListener('pointermove', function (e) { var r = s0.getBoundingClientRect(), vx = (e.clientX - r.left) / r.width * W; montrer(Math.round((vx - G) / ((W - G - D) / Math.max(1, n - 1)))) })
    zone.addEventListener('pointerleave', cacher)
    zone.addEventListener('focus', function () { montrer(n - 1) })
    zone.addEventListener('blur', cacher)
    zone.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); montrer((courant < 0 ? n - 1 : courant) + (e.key === 'ArrowRight' ? 1 : -1)) } })
    cadre.appendChild(s0); cadre.appendChild(bulle)
    if (series.length > 1) boite.appendChild(legende(series))
    boite.appendChild(cadre)
    boite.appendChild(tableau(['Date'].concat(series.map(function (s) { return s.nom })), series[0].points.map(function (p, j) { return [jour(p.date)].concat(series.map(function (s) { var w = num(s.points[j].valeur); return w === null ? SANS : format(w) })) })))
  }

  // ---------- les colonnes : une série au fil du temps (des barres de 24 px au plus, 2 px d'air entre elles) ----------
  function colonnes(boite, o) { garder(boite, function () { dessinerColonnes(boite, o) }) }
  function dessinerColonnes(boite, o) {
    vider(boite)
    var pts = o.points || [], format = o.format || compact, n = pts.length
    var max = null; pts.forEach(function (p) { var v = num(p.valeur); if (v !== null) max = max === null ? v : Math.max(max, v) })
    if (!n || max === null) return vide(boite)
    var W = largeur(boite), H = o.hauteur || 200, G = 52, D = 24, T = 18, B = 30, c = COULEURS[o.couleur || 'violet']
    var pp = pas(max || 1, 4), haut = Math.max(pp, Math.ceil(max / pp) * pp), bande = (W - G - D) / n, large = Math.min(24, Math.max(2, bande - 2))
    var y = function (v) { return T + (H - T - B) * (1 - v / haut) }
    var s0 = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'g-svg', role: 'img', 'aria-label': o.titre || '' })
    for (var v = 0; v <= haut + 1e-9; v += pp) { s0.appendChild(svg('line', { x1: G, x2: W - D, y1: y(v), y2: y(v), stroke: FIL, 'stroke-width': 1 })); var tv = svg('text', { x: G - 8, y: y(v) + 4, 'text-anchor': 'end', fill: TEXTE3, 'font-size': 11 }); tv.textContent = compact(v); s0.appendChild(tv) }
    var sautX = Math.max(1, Math.ceil(n / Math.max(3, Math.floor((W - G - D) / 80)))), cadre = el('div', 'g-cadre'), bulle = el('div', 'g-bulle'), imax = -1
    bulle.hidden = true
    pts.forEach(function (p, i) { var w = num(p.valeur); if (w !== null && (imax < 0 || w > num(pts[imax].valeur))) imax = i })
    pts.forEach(function (p, i) {
      var w = num(p.valeur), cx = G + i * bande + bande / 2
      if (i % sautX === 0) { var tx = svg('text', { x: cx, y: H - 9, 'text-anchor': 'middle', fill: TEXTE3, 'font-size': 11 }); tx.textContent = jour(p.date); s0.appendChild(tx) }
      if (w === null) return
      var h = Math.max(w > 0 ? 1 : 0, H - B - y(w))
      var r = svg('rect', { x: (cx - large / 2).toFixed(1), y: (H - B - h).toFixed(1), width: large.toFixed(1), height: h.toFixed(1), fill: c, class: 'g-barre', tabindex: 0, role: 'img', 'aria-label': jour(p.date) + ' : ' + format(w) })
      r.addEventListener('pointerenter', function () { info(i, cx) }); r.addEventListener('focus', function () { info(i, cx) })
      r.addEventListener('pointerleave', function () { bulle.hidden = true }); r.addEventListener('blur', function () { bulle.hidden = true })
      s0.appendChild(r)
    })
    // la plus haute porte sa valeur, sur son bout
    var vm = num(pts[imax].valeur)
    if (vm > 0) { var tm = svg('text', { x: G + imax * bande + bande / 2, y: y(vm) - 6, 'text-anchor': 'middle', fill: TEXTE, 'font-size': 12, 'font-weight': 700 }); tm.textContent = format(vm); s0.appendChild(tm) }
    function info(i, cx) {
      vider(bulle); bulle.appendChild(el('span', 'g-date', jour(pts[i].date)))
      var l = el('span', 'g-ligne'), k = el('i'); k.style.background = c; l.appendChild(k); l.appendChild(el('b', '', format(num(pts[i].valeur)))); l.appendChild(el('span', '', o.nom || '')); bulle.appendChild(l)
      bulle.hidden = false
      var r = s0.getBoundingClientRect(); bulle.style.left = Math.min(r.width - 170, Math.max(0, cx / W * r.width + 12)) + 'px'
    }
    cadre.appendChild(s0); cadre.appendChild(bulle); boite.appendChild(cadre)
    boite.appendChild(tableau(['Date', o.nom || 'Valeur'], pts.map(function (p) { var w = num(p.valeur); return [jour(p.date), w === null ? SANS : format(w)] })))
  }

  // ---------- les barres couchées : un classement (le plus grand en haut), la valeur au bout de chaque barre ----------
  // o : { lignes: [{ nom, valeur (un nombre, ou null), texte, sous }], couleur, titres: [colonne du nom, colonne de la valeur] }
  function barres(boite, o) {
    vider(boite)
    var l = o.lignes || [], c = COULEURS[o.couleur || 'or']
    if (!l.length) return vide(boite, 'Rien sur cette période.')
    var max = 0; l.forEach(function (x) { var w = num(x.valeur); if (w !== null && w > max) max = w })
    var ul = el('ul', 'g-barres')
    l.forEach(function (x) {
      var li = el('li'), nom = el('span', 'g-nom', x.nom), piste = el('span', 'g-piste'), b = el('i'), val = el('b', 'g-val', x.texte), w = num(x.valeur)
      li.tabIndex = 0
      li.setAttribute('aria-label', x.nom + ' : ' + x.texte + (x.sous ? ', ' + x.sous : ''))
      b.style.width = (max && w !== null ? Math.max(0.6, w / max * 100) : 0) + '%'; b.style.background = c
      piste.appendChild(b); piste.appendChild(val)
      li.appendChild(nom); li.appendChild(piste)
      if (x.sous) li.appendChild(el('span', 'g-sous', x.sous))
      ul.appendChild(li)
    })
    boite.appendChild(ul)
    boite.appendChild(tableau(o.titres || ['Nom', 'Valeur'], l.map(function (x) { return [x.nom, x.texte + (x.sous ? ' (' + x.sous + ')' : '')] })))
  }

  // ---------- le tunnel : chaque étape, sa largeur (face à la première), son nombre et son taux ----------
  // o : { etapes: [{ nom, n (ou null), taux, taux_total, note }], couleur, format(n) }
  function entonnoir(boite, o) {
    vider(boite)
    var e = o.etapes || [], c = COULEURS[o.couleur || 'or'], format = o.format || compact, premier = null
    e.forEach(function (x) { var v = num(x.n); if (premier === null && v !== null) premier = v })
    if (!e.length || premier === null) return vide(boite)
    var ol = el('ol', 'g-entonnoir')
    e.forEach(function (x, i) {
      var li = el('li'), b = el('span', 'g-etape'), v = num(x.n), w = premier && v !== null ? Math.max(2, Math.min(100, v / premier * 100)) : 0
      b.style.width = w + '%'; b.style.background = c
      li.appendChild(el('span', 'g-nom', x.nom))
      var piste = el('span', 'g-piste'); piste.appendChild(b); piste.appendChild(el('b', 'g-val', v === null ? VIDE : format(v)))
      li.appendChild(piste)
      var tt = i ? [num(x.taux) === null ? '' : pourcent(x.taux) + ' de l\'étape d\'avant', num(x.taux_total) === null ? '' : pourcent(x.taux_total, 2) + ' du départ'].filter(Boolean).join(' · ') : 'le départ'
      if (tt) li.appendChild(el('span', 'g-taux', tt))
      if (x.note) li.appendChild(el('span', 'g-taux a-alerte', x.note))
      ol.appendChild(li)
    })
    boite.appendChild(ol)
    boite.appendChild(tableau(['Étape', 'Nombre', 'Sur l\'étape d\'avant', 'Sur le départ'], e.map(function (x, i) { var v = num(x.n); return [x.nom, v === null ? SANS : format(v), i && num(x.taux) !== null ? pourcent(x.taux) : '', i && num(x.taux_total) !== null ? pourcent(x.taux_total, 2) : ''] })))
  }
  function pourcent(x, k) { var v = (Number(x) || 0) * 100; return v.toFixed(k === undefined ? 1 : k).replace('.', ',') + NBSP + '%' }

  // ---------- la barre empilée à 100 % : les parts (le temps par lieu), 2 px d'air entre elles, la légende avec leur part ----------
  // au-delà de quatre parts, les plus petites se rangent dans « Autres » (gris) : les couleurs ne tournent jamais
  function empile(boite, o) {
    vider(boite)
    var parts = (o.parts || []).filter(function (p) { return num(p.part) !== null }).slice().sort(function (a, b) { return b.part - a.part })
    if (!parts.length) return vide(boite)
    if (parts.length > 4) { var reste = parts.slice(3).reduce(function (s, p) { return s + p.part }, 0); parts = parts.slice(0, 3).concat([{ nom: 'Autres', part: reste, autres: true }]) }
    var barre = el('div', 'g-empile'), leg = el('ul', 'g-legende')
    parts.forEach(function (p, k) {
      var c = p.autres ? AUTRES : COULEURS[ORDRE[k]], s = el('span'); s.style.width = Math.max(0, p.part * 100) + '%'; s.style.background = c; s.tabIndex = 0; s.setAttribute('role', 'img')
      s.setAttribute('aria-label', p.nom + ' : ' + pourcent(p.part, 0)); s.title = p.nom + ' : ' + pourcent(p.part, 0)
      barre.appendChild(s)
      var li = el('li'), m = el('span', 'g-cle aire'); m.style.background = c; m.setAttribute('aria-hidden', 'true'); li.appendChild(m); li.appendChild(document.createTextNode(p.nom + ' : ')); li.appendChild(el('b', '', pourcent(p.part, 0))); leg.appendChild(li)
    })
    boite.appendChild(barre); boite.appendChild(leg)
  }

  window.CasteriaGraphe = { courbe: courbe, colonnes: colonnes, barres: barres, entonnoir: entonnoir, empile: empile, compact: compact, jour: jour }
})()
