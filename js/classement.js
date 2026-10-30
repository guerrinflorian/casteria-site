// LE CLASSEMENT (classement.html ; le prototype du 29/10/2026) : les huit thèmes de /top en onglets, les classements du
// thème, le podium des trois premiers (leur peau en 3D, js/peau.js), la liste jusqu'au 100e (la tête de chaque joueur, sa
// place, sa valeur, une barre), la recherche d'un pseudo, la fiche d'un joueur au survol et au clic, et « Toi » surligné
// quand tu es connecté. Tout est lu par CasteriaApi (js/api.js) : GET /api/classement?theme=&categorie=&taille= (API.md
// 2.2), GET /api/joueur/<pseudo> (2.3), GET /api/moi (3.1) ; jamais un autre serveur. Ce qui vient de l'API s'écrit en
// TEXTE (textContent), jamais comme du code de page. Sans réponse : « Le classement ne s'affiche pas pour l'instant. En jeu,
// tape /top. », et un bouton « Réessayer ».
// Les thèmes et leurs catégories viennent du jeu (leaderboard.js : FAMILLES, les statistiques déclarées), jamais d'une copie
// ici. Une catégorie d'un donjon porte « donjon » et « tailles » (ses niveaux et ses groupes se choisissent sous elle), une
// colonne d'un jeu de hasard porte « hasard » (les cinq colonnes d'un jeu se choisissent sous lui), une ligne du thème Îles
// porte « ile » { nom, amis } (la 154 du jeu ; son texte : « <nom> · <valeur> ») : le nom de l'île en grand, l'hôte et « N amis »
// en petit.
(function () {
  'use strict'
  var A = window.CasteriaApi, P = window.CasteriaPeau
  var themesEl = document.getElementById('themes'), catsEl = document.getElementById('cats'), sousEl = document.getElementById('sous')
  var podium = document.getElementById('podium'), scene = document.getElementById('scene'), listeZone = document.getElementById('liste-zone'), liste = document.getElementById('liste')
  var cherche = document.getElementById('cherche'), moiPlace = document.getElementById('moi-place'), listeVide = document.getElementById('liste-vide'), lu = document.getElementById('classement-lu')
  var titreEl = document.getElementById('cat-titre'), aideEl = document.getElementById('cat-aide'), classesEl = document.getElementById('cat-classes')
  var themeNom = document.getElementById('theme-nom'), themeAide = document.getElementById('theme-aide'), gesteMoi = document.getElementById('geste-moi')
  var encartAide = document.getElementById('encart-aide'), listeTitre = document.getElementById('liste-titre')
  var cadre = document.getElementById('cadre'), chercheEtat = document.getElementById('cherche-etat')
  if (!A || !P || !themesEl || !catsEl || !sousEl || !podium || !liste || !listeZone) return
  var el = A.el, vider = A.vider
  var PANNE = 'Le classement ne s\'affiche pas pour l\'instant. En jeu, tape /top.'
  var HORS_SITE = { boss_vaincus: 1, boss_heroiques: 1 }
  var MEDAILLES = ['assets/classement/medaille_1.png', 'assets/classement/medaille_2.png', 'assets/classement/medaille_3.png']
  var ROMAINS = ['I', 'II', 'III']
  var NOMS_THEMES = { general: 'Le classement général' }
  var calme = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  var survolPossible = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches
  var etat = { theme: 'general', categorie: '', taille: 0, d: null, moi: null, fiches: {}, reponses: {}, poignees: [], colonne: 0, numero: 0 }

  // ---------- l'adresse : #<thème>[/<catégorie>[/<taille>]] (classement.html#mer/mer_pirates) ----------
  function lireAdresse() {
    var h = decodeURIComponent((location.hash || '').slice(1)).split('/')
    if (A.THEMES.indexOf(h[0]) < 0) return
    etat.theme = h[0]; etat.categorie = /^[a-z0-9_]{1,48}$/.test(h[1] || '') ? h[1] : ''; etat.taille = Math.max(0, Math.min(3, Number(h[2]) || 0))
  }
  function ecrireAdresse() {
    if (!window.history || !history.replaceState) return
    history.replaceState(null, '', '#' + etat.theme + (etat.categorie ? '/' + etat.categorie + (etat.taille ? '/' + etat.taille : '') : ''))
  }

  // ---------- la lecture (une réponse gardée par thème, catégorie et taille : un retour en arrière ne relit rien) ----------
  function charger() {
    var cle = etat.theme + '|' + etat.categorie + '|' + etat.taille, n = ++etat.numero
    if (etat.reponses[cle]) return montrer(etat.reponses[cle])
    if (!etat.d) { vider(podium); podium.appendChild(el('p', 'classement-etat', 'On compte les points...')) }
    scene.setAttribute('aria-busy', 'true')
    A.classement(etat.theme, etat.categorie, etat.taille).then(function (r) {
      if (n !== etat.numero) return
      scene.removeAttribute('aria-busy')
      if (r.statut !== 200 || !r.corps || !Array.isArray(r.corps.categories) || !r.corps.categorie) {
        // une catégorie de l'adresse qui n'existe plus : le thème, sans elle
        if (r.statut === 404 && etat.categorie) { etat.categorie = ''; etat.taille = 0; return charger() }
        return panne()
      }
      // (la tête, 29/10) JAMAIS SUR LE SITE : un classement dont le texte dit un nombre de boss (« N boss · 38:12 ») ;
      // l'API les retire déjà (API.md 2.2), la page aussi
      r.corps.categories = r.corps.categories.filter(function (c) { return c && !HORS_SITE[c.id] })
      if (HORS_SITE[r.corps.categorie.id]) { if (!r.corps.categories.length) return panne(); etat.categorie = r.corps.categories[0].id; etat.taille = 0; return charger() }
      etat.reponses[cle] = r.corps
      montrer(r.corps)
    })
  }
  function panne() {
    vider(podium); listeZone.hidden = true; lu.hidden = true
    podium.appendChild(el('p', 'classement-etat', PANNE))
    var b = el('button', 'bouton bouton-bois', 'Réessayer'); b.type = 'button'; b.addEventListener('click', charger); podium.appendChild(b)
  }

  // ---------- les thèmes : des onglets (les flèches du clavier passent de l'un à l'autre) ----------
  function dessinerThemes(themes) {
    if (themesEl.children.length) return marquerTheme()
    themes.forEach(function (t) {
      if (A.THEMES.indexOf(t.cle) < 0) return
      var b = el('button', 'cl-theme', t.nom)
      b.type = 'button'; b.id = 'theme-' + t.cle; b.setAttribute('role', 'tab'); b.setAttribute('aria-controls', 'scene'); b.setAttribute('data-cle', t.cle)
      if (t.aide) b.title = String(t.aide)
      b.addEventListener('click', function () { if (etat.theme === t.cle) return; etat.theme = t.cle; etat.categorie = ''; etat.taille = 0; ecrireAdresse(); charger() })
      themesEl.appendChild(b)
    })
    marquerTheme()
  }
  function marquerTheme() {
    Array.prototype.forEach.call(themesEl.children, function (b) {
      var oui = b.getAttribute('data-cle') === etat.theme
      b.setAttribute('aria-selected', oui ? 'true' : 'false'); b.tabIndex = oui ? 0 : -1
      if (oui && b.scrollIntoView && themesEl.scrollWidth > themesEl.clientWidth) themesEl.scrollLeft = Math.max(0, b.offsetLeft - themesEl.clientWidth / 2 + b.offsetWidth / 2)
    })
    scene.setAttribute('aria-labelledby', 'theme-' + etat.theme)
  }
  themesEl.addEventListener('keydown', function (ev) {
    if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return
    var bs = Array.prototype.slice.call(themesEl.children), i = bs.indexOf(document.activeElement)
    if (i < 0) return
    var j = (i + (ev.key === 'ArrowRight' ? 1 : bs.length - 1)) % bs.length
    bs[j].focus(); bs[j].click(); ev.preventDefault()
  })

  // ---------- les classements du thème, rangés en groupes : un jeu de hasard (ses cinq colonnes), un donjon (ses niveaux
  // et ses groupes), ou une catégorie seule ----------
  function groupes(cats) {
    var l = [], par = Object.create(null)
    cats.forEach(function (c) {
      var cle = c.hasard ? 'h:' + c.hasard.jeu : (c.donjon ? 'd:' + c.donjon.id : 'c:' + c.id)
      if (!par[cle]) { par[cle] = { cle: cle, nom: c.hasard ? String(c.hasard.nom) : (c.donjon ? String(c.donjon.nom) : String(c.court || c.titre)), cats: [], hasard: !!c.hasard, donjon: !!c.donjon }; l.push(par[cle]) }
      par[cle].cats.push(c)
    })
    return l
  }
  function bouton(texte, presse, quand, nom) {
    var b = el('button', '', texte)
    b.type = 'button'; b.setAttribute('aria-pressed', presse ? 'true' : 'false')
    if (nom) { b.setAttribute('aria-label', nom); b.title = nom }
    b.addEventListener('click', quand)
    return b
  }
  function choisirCategorie(id, taille) {
    if (id === etat.categorie && (taille || 0) === etat.taille) return
    etat.categorie = id; etat.taille = taille || 0; ecrireAdresse(); charger()
  }
  function dessinerCats(d) {
    var gs = groupes(d.categories), actuel = d.categorie.id, gActuel = null
    vider(catsEl)
    gs.forEach(function (g) {
      var dedans = g.cats.some(function (c) { return c.id === actuel })
      if (dedans) gActuel = g
      var b = bouton(g.nom, dedans, function () {
        if (dedans) return
        // un jeu de hasard : la même colonne que celle qu'on regardait, s'il l'a ; un donjon : son premier niveau
        var cible = g.cats[0]
        if (g.hasard) g.cats.forEach(function (c) { if (c.hasard.col === etat.colonne) cible = c })
        choisirCategorie(cible.id, 0)
      })
      b.className = 'cl-cat'
      if (g.cats.length === 1 && g.cats[0].aide) b.title = String(g.cats[0].aide)
      catsEl.appendChild(b)
    })
    catsEl.hidden = gs.length < 2
    dessinerSous(d, gActuel)
  }
  // sous un jeu de hasard : ses colonnes ; sous un donjon : le niveau (I, II, III) puis les joueurs du groupe (Tous, 1, 2, 3)
  function dessinerSous(d, g) {
    vider(sousEl)
    sousEl.hidden = true
    if (!g || g.cats.length < 1 || (!g.hasard && !g.donjon)) return
    var c = d.categorie
    if (g.hasard) {
      etat.colonne = c.hasard ? Number(c.hasard.col) : 0
      var r = rangee('Classement', 'Les classements de ce jeu')
      g.cats.forEach(function (x) { r.appendChild(choix(String(x.court || x.titre), x.id === c.id, function () { etat.colonne = x.hasard.col; choisirCategorie(x.id, 0) }, String(x.titre))) })
      sousEl.appendChild(r)
    } else {
      var rn = rangee('Niveau', 'Le niveau du donjon')
      g.cats.forEach(function (x, i) {
        var nv = Number(x.donjon && x.donjon.niveau) || i + 1
        rn.appendChild(choix(ROMAINS[nv - 1] || String(nv), x.id === c.id, function () { choisirCategorie(x.id, etat.taille) }, String(x.titre)))
      })
      if (g.cats.length > 1) sousEl.appendChild(rn)
      var tailles = Array.isArray(c.tailles) ? c.tailles : []
      if (tailles.length) {
        var rt = rangee('Joueurs', 'Les joueurs du groupe au départ de la partie')
        rt.appendChild(choix('Tous', !etat.taille, function () { choisirCategorie(c.id, 0) }, 'Tous les groupes'))
        tailles.forEach(function (t) { var v = Number(t.taille); if (v > 0) rt.appendChild(choix(String(v), etat.taille === v, function () { choisirCategorie(c.id, v) }, String(t.nom))) })
        sousEl.appendChild(rt)
      }
    }
    sousEl.hidden = !sousEl.children.length
  }
  function rangee(mot, nom) { var r = el('div', 'cl-choix-rangee'); r.setAttribute('role', 'group'); r.setAttribute('aria-label', nom); r.appendChild(el('span', 'cl-choix-mot', mot)); return r }
  function choix(texte, presse, quand, nom) { var b = bouton(texte, presse, quand, nom); b.className = 'cl-choix'; return b }

  // ---------- une réponse à l'écran ----------
  function montrer(d) {
    etat.d = d
    etat.categorie = d.categorie.id; etat.taille = Number(d.categorie.taille) || 0
    dessinerThemes(d.themes || [])
    var t = (d.themes || []).filter(function (x) { return x.cle === d.theme })[0]
    if (themeNom) themeNom.textContent = NOMS_THEMES[d.theme] || (t ? String(t.nom) : 'Le classement')
    if (themeAide) themeAide.textContent = t && t.aide ? A.texte(t.aide) + '.' : ''
    dessinerCats(d)
    var c = d.categorie
    titreEl.textContent = A.texte(c.titre) + (c.donjon && etat.taille ? ' : ' + (tailleNom(c, etat.taille) || '').toLowerCase() : '')
    aideEl.textContent = c.aide ? A.texte(c.aide) : ''
    if (encartAide) encartAide.textContent = c.aide ? A.texte(c.aide) : (t && t.aide ? A.texte(t.aide) + '.' : '')
    if (listeTitre) listeTitre.textContent = A.texte(c.titre) + ' : du 4e au 100e'
    classesEl.textContent = c.classes > 0 ? A.nombre(c.classes) + (c.classes > 1 ? ' joueurs classés' : ' joueur classé') : ''
    dessinerPodium(c)
    dessinerListe(c)
    dessinerLu(d.lu)
  }
  function tailleNom(c, t) { var l = Array.isArray(c.tailles) ? c.tailles : []; for (var i = 0; i < l.length; i++) if (Number(l[i].taille) === t) return String(l[i].nom); return '' }
  function dessinerLu(iso) {
    var h = ''
    try { h = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) } catch (e) { h = '' }
    lu.textContent = A.essai ? 'Données d\'essai : ces joueurs et ces chiffres sont inventés pour le prototype.' : (h ? 'Mis à jour à ' + h + ', heure de Paris. ' : '') + 'Le classement se refait toutes les 5 minutes.'
    lu.hidden = false
  }

  // ---------- le podium : le 1er au milieu (sa couronne, ses rayons), le 2e à gauche, le 3e à droite ----------
  function detruirePodium() { etat.poignees.forEach(function (p) { p.detruire() }); etat.poignees = [] }
  function dessinerPodium(c) {
    detruirePodium()
    vider(podium)
    var top = Array.isArray(c.top) ? c.top : []
    if (!top.length) { podium.appendChild(el('p', 'classement-etat', 'Personne ici pour l\'instant.')); return }
    for (var r = 1; r <= 3; r++) podium.appendChild(place(top[r - 1], r, c))
    var ECLATS = [['6%', '30%', 18], ['92%', '24%', 14], ['30%', '8%', 12], ['70%', '12%', 16], ['12%', '62%', 10], ['86%', '58%', 12]]
    ECLATS.forEach(function (e, i) { var s = el('span', 'eclat'); s.setAttribute('aria-hidden', 'true'); s.style.left = e[0]; s.style.top = e[1]; s.style.width = s.style.height = e[2] + 'px'; s.style.animationDelay = (-i * 0.45) + 's'; podium.appendChild(s) })
    ajusterPodium()
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajusterPodium)
  }
  function place(ligne, r, c) {
    var p = el('div', 'cl-place p' + r)
    if (!ligne) { p.appendChild(el('div', 'cl-vide-place', 'Personne encore')); p.appendChild(socle(null, r, c)); return p }
    var statue = el('button', 'cl-statue')
    statue.type = 'button'
    statue.setAttribute('aria-label', String(ligne.pseudo) + ', ' + A.rang(r) + ' : voir sa fiche')
    var face = document.createElement('canvas')
    face.className = 'face'; face.setAttribute('aria-hidden', 'true')
    statue.appendChild(face)
    P.deFace(face, ligne.peau, ligne.modele)
    if (r === 1) { var cr = document.createElement('img'); cr.className = 'cl-couronne'; cr.src = 'assets/classement/couronne.png'; cr.alt = ''; cr.width = 54; cr.height = 45; statue.appendChild(cr) }
    statue.addEventListener('click', function () { ouvrirFiche(String(ligne.pseudo), statue); if (poignee) poignee.saluer() })
    p.appendChild(statue)
    p.appendChild(socle(ligne, r, c))
    // la 3D : quand la bibliothèque est là (js/peau.js), à la taille de la statue ; le 2e et le 3e tournés vers le 1er
    var poignee = P.vue3d(statue, ligne.peau, ligne.modele, { largeur: statue.clientWidth || 160, hauteur: statue.clientHeight || 240, tourne: r === 2 ? 0.35 : (r === 3 ? -0.35 : 0), pose: r === 1 ? 'victoire' : 'repos', zoom: 0.95 })
    poignee.statue = statue
    etat.poignees.push(poignee)
    return p
  }
  function socle(ligne, r, c) {
    var s = el('div', 'cl-socle'), n = el('span', 'cl-n', String(r))
    n.setAttribute('aria-hidden', 'true')
    s.appendChild(n)
    var m = document.createElement('img'); m.className = 'cl-medaille'; m.src = MEDAILLES[r - 1]; m.alt = A.rang(r); m.width = 20; m.height = 28
    s.appendChild(m)
    if (!ligne) { s.appendChild(el('span', 'cl-petit', '')); return s }
    if (ligne.ile) {
      s.appendChild(el('span', 'cl-ile-nom', String(ligne.ile.nom)))
      s.appendChild(el('span', 'cl-petit', String(ligne.pseudo) + (nbAmis(ligne) > 0 ? ' et ' + A.nombre(nbAmis(ligne)) + (nbAmis(ligne) > 1 ? ' amis' : ' ami') : '')))
    } else s.appendChild(el('span', 'cl-pseudo', String(ligne.pseudo)))
    s.appendChild(el('span', 'cl-valeur', valeurDe(ligne)))
    // (67, 29/10) l'aperçu de son île, sous sa valeur
    var ap = apercuDe(ligne)
    if (ap) s.appendChild(ap)
    return s
  }
  // (18/10/2026, gardé) un nom du podium tient sur UNE ligne : sa taille baisse tant qu'il en fait plus d'une, 11 px au plus
  // petit ; refait quand les polices arrivent et quand la fenêtre change de taille
  function ajusterPodium() {
    Array.prototype.forEach.call(podium.querySelectorAll('.cl-socle .cl-pseudo, .cl-socle .cl-ile-nom'), function (sp) {
      sp.style.fontSize = ''
      var t = parseFloat(window.getComputedStyle(sp).fontSize) || 16
      while (sp.getBoundingClientRect().height > t * 1.6 && t > 11) { t--; sp.style.fontSize = t + 'px' }
    })
  }
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', ajusterPodium)
  var minuteurTaille = 0
  window.addEventListener('resize', function () {
    clearTimeout(minuteurTaille)
    minuteurTaille = setTimeout(function () { ajusterPodium(); ajusterCadre(); etat.poignees.forEach(function (p) { if (p.statue) p.taille(p.statue.clientWidth, p.statue.clientHeight) }) }, 150)
  })
  // la scène suit un peu la souris (le podium penche de quelques degrés), sauf pour qui demande moins de mouvement
  if (!calme && survolPossible && scene) {
    scene.addEventListener('pointermove', function (e) {
      var b = scene.getBoundingClientRect(), dx = (e.clientX - b.left) / b.width - 0.5, dy = (e.clientY - b.top) / b.height - 0.5
      podium.style.transform = 'rotateY(' + (dx * 7).toFixed(2) + 'deg) rotateX(' + (-dy * 4).toFixed(2) + 'deg)'
    })
    scene.addEventListener('pointerleave', function () { podium.style.transform = '' })
  }

  // ---------- la liste (du 4e au 100e ; une recherche cherche dans les 100) ----------
  // LA LISTE EN BANDES (le propriétaire : pas cent lignes identiques) : le podium (1 à 3, seulement pendant une recherche), le
  // haut (4 à 10 : de grandes lignes dorées, de grandes têtes), puis une bande par dizaine, chacune ouverte par son palier
  // (« De la 11e à la 20e place », entre deux frises d'étoiles du kit), les lignes de plus en plus serrées vers le bas (à partir
  // du 51e : compactes, de petites têtes)
  function bandeDe(r) { return r <= 3 ? 0 : (r <= 10 ? 1 : Math.floor((r - 1) / 10) + 1) }
  // (Lighthouse, 29/10 : une tâche de 0,5 s au téléphone) LA LISTE SE BÂTIT PAR MORCEAUX : les trente premières lignes tout
  // de suite (ce que l'on voit), puis vingt par vingt, chacune dans sa tâche (le navigateur répond entre deux) ; la recherche,
  // « Toi » et le cadre une fois la liste entière
  var numeroListe = 0
  function dessinerListe(c) {
    var top = Array.isArray(c.top) ? c.top : [], bandes = {}, n = ++numeroListe, i = 0
    vider(liste)
    function morceau(combien) {
      var frag = document.createDocumentFragment()
      for (var fin = Math.min(top.length, i + combien); i < fin; i++) {
        var ligne = top[i], r = Number(ligne.rang) || 0, k = bandeDe(r), b = bandes[k]
        if (!b) {
          b = bandes[k] = el('div', 'cl-bande ' + (k === 0 ? 'cl-bande-podium' : (k === 1 ? 'cl-bande-haut' : (k % 2 ? 'cl-bande-impaire' : 'cl-bande-paire'))))
          b.setAttribute('data-bande', String(k))
          if (k >= 2) { var p = el('p', 'cl-palier', 'De la ' + A.rang((k - 1) * 10 + 1) + ' à la ' + ((k - 1) * 10 + 10) + 'e place'); p.setAttribute('aria-hidden', 'true'); b.appendChild(p) }
          b.appendChild(el('ol', 'cl-rangs-bande'))
          frag.appendChild(b)
        }
        b.lastChild.appendChild(ligneDe(ligne, c))
      }
      liste.appendChild(frag)
    }
    function finir() {
      filtrer()
      dessinerMoi()
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajusterCadre); else ajusterCadre()
    }
    function suite() { if (n !== numeroListe) return; morceau(20); if (i < top.length) setTimeout(suite, 0); else finir() }
    morceau(30)
    listeZone.hidden = !top.length
    if (cadre) cadre.scrollTop = 0
    if (i < top.length) setTimeout(suite, 0); else finir()
  }
  function lignes() { return liste.querySelectorAll('.cl-ligne') }
  function ligneDe(l, c) {
    var r = Number(l.rang) || 0, li = el('li', 'cl-ligne' + (r > 50 ? ' compacte' : '')), etroit = window.innerWidth <= 700, tailleTete = r <= 10 ? (etroit ? 36 : 42) : (r <= 50 ? (etroit ? 30 : 34) : (etroit ? 26 : 28))
    li.setAttribute('data-pseudo', String(l.pseudo)); li.setAttribute('data-rang', String(r))
    li.setAttribute('data-cherche', ((l.ile ? String(l.ile.nom) + ' ' : '') + String(l.pseudo)).toLowerCase())
    var rg = el('span', 'cl-rang')
    if (r >= 1 && r <= 3) { var m = document.createElement('img'); m.src = MEDAILLES[r - 1]; m.alt = A.rang(r); m.width = 15; m.height = 21; rg.appendChild(m) } else rg.textContent = A.rang(r)
    li.appendChild(rg)
    var t = P.tete(el('span', 'cl-tete'), l.peau, tailleTete); t.setAttribute('aria-hidden', 'true'); li.appendChild(t)
    var qui = el('span', 'cl-qui'), nom
    if (l.ile) {
      nom = el('button', 'cl-nom cl-ile-nom', String(l.ile.nom))
      qui.appendChild(nom)
      qui.appendChild(el('span', 'cl-petit', 'Hôte : ' + String(l.pseudo) + (nbAmis(l) > 0 ? ' · ' + A.nombre(nbAmis(l)) + (nbAmis(l) > 1 ? ' amis' : ' ami') : '')))
    } else {
      nom = el('button', 'cl-nom', String(l.pseudo))
      qui.appendChild(nom)
      var details = []
      if (l.grade) details.push(nomGrade(l.grade))
      if (l.equipe) details.push(nomEquipe(l.equipe))
      if (details.length) qui.appendChild(el('span', 'cl-petit', details.join(' · ')))
    }
    nom.type = 'button'
    nom.setAttribute('data-nom', nom.textContent)
    nom.setAttribute('aria-label', (l.ile ? String(l.ile.nom) + ', l\'île de ' + String(l.pseudo) : String(l.pseudo)) + ', ' + A.rang(r) + ' : voir sa fiche')
    if (l.grade && /^(chevalier|comte|marquis|duc|souverain)$/.test(l.grade)) { var e = el('span', 'cl-embleme e-' + l.grade); e.setAttribute('aria-hidden', 'true'); nom.appendChild(e) }
    nom.addEventListener('click', function () { ouvrirFiche(String(l.pseudo), nom) })
    avecApercu(qui, nom, l)
    li.appendChild(qui)
    var barre = el('span', 'cl-barre'), i = el('i')
    barre.setAttribute('aria-hidden', 'true')
    i.style.setProperty('--part', Math.round(Math.max(0, Math.min(1, Number(l.part) || 0)) * 1000) / 10 + '%')
    barre.appendChild(i); li.appendChild(barre)
    li.appendChild(el('span', 'cl-val', valeurDe(l)))
    if (survolPossible) {
      li.addEventListener('pointerenter', function (ev) { survoler(String(l.pseudo), li, ev) })
      li.addEventListener('pointerleave', cacherSurvol)
    }
    return li
  }
  // (67, 29/10 ; le propriétaire : « dans le classement, un petit bouton qui mène à l'aperçu de l'île du joueur, seulement si
  // elle est ouverte ; sinon le bouton est barré ou éteint ») L'APERÇU DE SON ÎLE : l.apercu = { i, j, ouverte } (l'API, lu
  // dans res_site_ile) ; ouverte : une petite île qui mène à /ile/<i>,<j> ; fermée : la même, éteinte et barrée, « Île fermée
  // aux visites » au survol et au toucher ; sans île (null) : rien
  function apercuDe(l) {
    var a = l && l.apercu, qui = String(l && l.pseudo || '')
    if (!a || typeof a !== 'object' || !isFinite(Number(a.i)) || !isFinite(Number(a.j))) return null
    var nomIle = l.ile && l.ile.nom ? String(l.ile.nom) : 'l\'île de ' + qui
    var b
    if (a.ouverte) {
      b = el('a', 'cl-apercu')
      b.href = 'ile/' + Math.floor(Number(a.i)) + ',' + Math.floor(Number(a.j))
      b.setAttribute('aria-label', 'Voir ' + nomIle + ' en 3D')
      b.setAttribute('data-bulle', 'Voir son île en 3D')
    } else {
      b = el('span', 'cl-apercu fermee')
      b.setAttribute('role', 'img'); b.tabIndex = 0
      b.setAttribute('aria-label', 'Île fermée aux visites')
      b.setAttribute('data-bulle', 'Île fermée aux visites')
    }
    b.appendChild(el('span', 'cl-apercu-ile'))
    // le geste reste au bouton : jamais la fiche du joueur derrière lui
    b.addEventListener('click', function (ev) { ev.stopPropagation(); if (!a.ouverte) { ev.preventDefault(); b.focus() } })
    return b
  }
  function avecApercu(conteneur, nom, l) {
    var ap = apercuDe(l)
    if (!ap) return
    var lg = el('span', 'cl-nom-ligne')
    conteneur.insertBefore(lg, nom)
    lg.appendChild(nom)
    lg.appendChild(ap)
  }
  // une ligne d'île : ses amis (une liste de pseudos, ou leur nombre) ; sa valeur sans le nom de l'île devant (le jeu écrit
  // « <nom> · <valeur> », et le nom est déjà écrit en grand)
  function nbAmis(l) { var a = l.ile ? l.ile.amis : 0; return Array.isArray(a) ? a.length : Math.max(0, Number(a) || 0) }
  function valeurDe(l) { var t = String(l.texte || ''), p = l.ile ? String(l.ile.nom) + ' · ' : ''; return A.texte(p && t.indexOf(p) === 0 ? t.slice(p.length) : t) }
  var GRADES = { chevalier: 'Chevalier', comte: 'Comte', marquis: 'Marquis', duc: 'Duc', souverain: 'Souverain' }
  var EQUIPES = { moderateur: 'Modérateur', helper: 'Helper', youtubeur: 'YouTubeur' }
  function nomGrade(g) { return GRADES[g] || '' }
  function nomEquipe(e) { return EQUIPES[e] || '' }

  // LA RECHERCHE : dans les 100, sans la casse ; les lignes trouvées surlignées (le morceau cherché marqué) et le cadre qui
  // défile jusqu'à la première ; Entrée : la suivante ; aucune : la fiche d'un pseudo exact. Le podium (1 à 3) ne revient dans
  // la liste que s'il porte une ligne trouvée.
  var trouves = [], trouveIci = -1
  function filtrer() {
    var q = cherche ? cherche.value.trim().toLowerCase() : '', podiumBande = liste.querySelector('.cl-bande-podium')
    trouves = []; trouveIci = -1
    Array.prototype.forEach.call(lignes(), function (li) {
      var oui = !!q && String(li.getAttribute('data-cherche')).indexOf(q) >= 0
      li.classList.toggle('trouve', oui)
      if (oui) trouves.push(li)
      surligner(li.querySelector('.cl-nom'), q)
    })
    if (podiumBande) podiumBande.hidden = !trouves.some(function (li) { return Number(li.getAttribute('data-rang')) <= 3 })
    vider(listeVide); listeVide.hidden = true
    if (chercheEtat) chercheEtat.textContent = q && trouves.length ? A.nombre(trouves.length) + (trouves.length > 1 ? ' joueurs trouvés : Entrée, le suivant.' : ' joueur trouvé.') : ''
    if (q && !trouves.length) {
      listeVide.appendChild(document.createTextNode('Personne à ce nom dans les 100 premiers ici.'))
      if (A.PSEUDO.test(cherche.value.trim())) {
        var b = el('button', 'bouton bouton-bois petit', 'Voir la fiche de ' + cherche.value.trim())
        b.type = 'button'; b.addEventListener('click', function () { ouvrirFiche(cherche.value.trim(), b) })
        listeVide.appendChild(el('br')); listeVide.appendChild(b)
      }
      listeVide.hidden = false
    } else if (!q && lignes().length <= 3) { listeVide.textContent = 'Les trois premiers sont sur le podium.'; listeVide.hidden = lignes().length === 0 }
    ajusterCadre()
    if (trouves.length) suivante()
  }
  function suivante() { if (!trouves.length) return; trouveIci = (trouveIci + 1) % trouves.length; defilerVers(trouves[trouveIci]) }
  // le cadre défile jusqu'à une ligne (lui seul : la page ne bouge pas)
  function defilerVers(li) {
    if (!cadre || !li) return
    var c = cadre.getBoundingClientRect(), r = li.getBoundingClientRect(), haut = cadre.scrollTop + r.top - c.top - Math.max(8, (c.height - r.height) / 3)
    try { cadre.scrollTo({ top: Math.max(0, haut), behavior: calme ? 'auto' : 'smooth' }) } catch (e) { cadre.scrollTop = Math.max(0, haut) }
  }
  // LA HAUTEUR DU CADRE : seize lignes au bureau, treize au téléphone, sans couper la dernière (mesurée sur les vraies lignes,
  // les paliers compris) ; moins de lignes que cela : le cadre à leur taille
  function ajusterCadre() {
    if (!cadre) return
    var vis = Array.prototype.filter.call(lignes(), function (li) { return !li.closest('.cl-bande').hidden }), n = window.innerWidth <= 700 ? 13 : 16
    cadre.style.maxHeight = ''
    if (vis.length <= n) return
    // seize lignes (treize au téléphone) AU PLUS, et jamais plus haut que l'écran (la barre du haut et le bandeau du bas
    // ôtés) : sur un écran plus bas, moins de lignes, toujours entières (jamais une demi-ligne en bas)
    var barre = document.querySelector('.barre'), ouverture = document.querySelector('.ouverture')
    var haut = barre ? Math.max(0, barre.getBoundingClientRect().bottom) : 80, bas = ouverture && !ouverture.hidden ? ouverture.offsetHeight : 0
    var c = cadre.getBoundingClientRect(), budget = Math.max(320, window.innerHeight - haut - bas - 40), k = n
    var bas = function (i) { return vis[i - 1].getBoundingClientRect().bottom - c.top + cadre.scrollTop + 8 }
    while (k > 7 && bas(k) > budget) k--
    cadre.style.maxHeight = Math.round(bas(k)) + 'px'
  }
  // le nom du bouton : son premier nœud de texte, découpé autour du morceau cherché (des nœuds de texte et un <mark>)
  function surligner(bouton, q) {
    var garde = Array.prototype.filter.call(bouton.childNodes, function (n) { return n.nodeType === 1 && n.tagName !== 'MARK' })
    var nom = String(bouton.getAttribute('data-nom') || '')
    vider(bouton)
    var i = q ? nom.toLowerCase().indexOf(q) : -1
    if (i < 0) bouton.appendChild(document.createTextNode(nom))
    else {
      bouton.appendChild(document.createTextNode(nom.slice(0, i)))
      bouton.appendChild(el('mark', 'cl-trouve', nom.slice(i, i + q.length)))
      bouton.appendChild(document.createTextNode(nom.slice(i + q.length)))
    }
    garde.forEach(function (n) { bouton.appendChild(n) })
  }
  if (cherche) {
    cherche.addEventListener('input', filtrer)
    cherche.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); suivante() } })
  }

  // ---------- « Toi » : ta ligne surlignée, ta place dite (au classement général, même au-delà du 100e) ----------
  // (le propriétaire, 16:47) connecté, TA LIGNE RESTE EN VUE : tant qu'elle est hors du cadre (ou au-delà du 100e), son double
  // reste collé en bas du cadre ; un clic dessus fait défiler jusqu'à elle (ou ouvre ta fiche)
  var colle = null, oeilToi = null
  function coller(m, li, p) {
    if (oeilToi) { oeilToi.disconnect(); oeilToi = null }
    if (colle && colle.parentNode) colle.parentNode.removeChild(colle)
    colle = null
    if (!m || m.hors_classement || (!li && !p) || !cadre) return
    colle = el('button', 'cl-toi-colle')
    colle.type = 'button'
    var t = P.tete(el('span', 'cl-tete'), m.peau, 32); t.setAttribute('aria-hidden', 'true')
    colle.appendChild(t)
    colle.appendChild(el('span', 'cl-marque toi', 'Toi'))
    colle.appendChild(el('b', '', li ? A.rang(Number(li.getAttribute('data-rang'))) : A.rang(p.rang)))
    colle.appendChild(el('span', 'nom', String(m.pseudo)))
    colle.appendChild(el('span', 'val', li ? valeurDe({ texte: li.querySelector('.cl-val').textContent, ile: null }) : A.texte(p.texte)))
    colle.setAttribute('aria-label', li ? 'Aller à ta ligne' : 'Voir ta fiche')
    colle.addEventListener('click', function () { if (li) defilerVers(li); else ouvrirFiche(String(m.pseudo), colle) })
    liste.appendChild(colle)
    if (li && 'IntersectionObserver' in window) {
      oeilToi = new IntersectionObserver(function (es) { es.forEach(function (x) { colle.hidden = x.isIntersecting }) }, { root: cadre, threshold: 0.6 })
      oeilToi.observe(li)
    }
  }
  function dessinerMoi() {
    vider(moiPlace)
    var c = etat.d ? etat.d.categorie : null
    Array.prototype.forEach.call(liste.querySelectorAll('.cl-marque.toi'), function (m) { m.parentNode.removeChild(m) })
    Array.prototype.forEach.call(lignes(), function (li) { li.classList.remove('toi') })
    coller(null)
    if (!c) return
    var m = etat.moi
    if (m === null) return
    var monter = document.getElementById('moi-monter'), moiTitre = document.getElementById('moi-titre')
    if (monter) { vider(monter); monter.hidden = true }
    if (!m) {
      // (le propriétaire, 29/10) LE CLASSEMENT MÈNE AU JEU : un visiteur lit « Ta place t'attend », le launcher à portée
      if (moiTitre) moiTitre.textContent = 'Ta place t\'attend'
      moiPlace.appendChild(document.createTextNode('Une île sur la mer, des boss, des bêtes : chaque partie te fait monter ici.'))
      if (monter) {
        var tel = el('a', 'bouton bouton-or', 'Télécharger le launcher'); tel.href = './#telecharger'
        var dej = el('p', 'note'), a = el('a', '', 'Connecte-toi'); a.href = 'connexion.html?retour=classement.html'
        dej.appendChild(document.createTextNode('Déjà un compte ? ')); dej.appendChild(a); dej.appendChild(document.createTextNode(' : ta place, surlignée.'))
        monter.appendChild(tel); monter.appendChild(dej); monter.hidden = false
      }
      return
    }
    if (moiTitre) moiTitre.textContent = 'Ta place'
    var li = liste.querySelector('.cl-ligne[data-pseudo="' + m.pseudo + '"]'), p = m.prive && m.prive.places ? m.prive.places[c.id] : null
    // (API.md 2.3 et 3.1) une place se sait parmi les 100 premiers ; au classement général, même au-delà (general.rang)
    if (!p && c.id === 'score' && m.general && m.general.rang) p = { rang: m.general.rang, texte: A.nombre(m.general.points) + ' / ' + A.nombre(m.general.sur || 1000) }
    if (li) { li.classList.add('toi'); var t = el('span', 'cl-marque toi', 'Toi'); t.setAttribute('data-garde', '1'); li.querySelector('.cl-nom').appendChild(t) }
    moiPlace.appendChild(document.createTextNode('Toi : '))
    if (m.hors_classement) moiPlace.appendChild(document.createTextNode('l\'équipe est hors des classements.'))
    else if (p && !etat.taille) { moiPlace.appendChild(el('b', '', A.rang(p.rang))); moiPlace.appendChild(document.createTextNode(' · ' + A.texte(p.texte))) }
    else if (li) moiPlace.appendChild(el('b', '', A.rang(Number(li.getAttribute('data-rang')))))
    else moiPlace.appendChild(document.createTextNode('pas dans les 100 premiers ici.'))
    if (monter && !m.hors_classement) dessinerMonter(monter, m, c, li)
    // ta ligne dans le podium (1 à 3) : elle est déjà en grand au-dessus, rien ne se colle
    coller(m, li && Number(li.getAttribute('data-rang')) > 3 ? li : null, li && Number(li.getAttribute('data-rang')) <= 3 ? null : (etat.taille ? null : p))
  }
  // (le propriétaire, 29/10 : « donner envie [...] de monter dans le classement ») CONNECTÉ, LA PAGE LE POUSSE À MONTER :
  // au classement général, les points qui manquent pour la place à viser (general.devant, API.md 3.1) et sa barre, puis
  // l'aspect le plus faible (la règle du jeu : « le plus faible monte le plus vite ») ; ailleurs, qui est juste devant lui ;
  // partout, son meilleur thème. Tout vient des données (jamais un chiffre inventé).
  function dessinerMonter(boite, m, c, li) {
    var g = m.general || {}
    if (c.id === 'score' && g.devant && typeof g.devant.points === 'number' && typeof g.points === 'number' && g.devant.points > g.points) {
      var manque = g.devant.points - g.points
      boite.appendChild(el('p', 'cl-monter-but', 'Encore ' + A.nombre(manque) + ' point' + (manque > 1 ? 's' : '') + ' pour passer ' + A.rang(g.devant.rang)))
      var b = el('span', 'cl-barre'), i = el('i'); i.style.setProperty('--part', Math.round(Math.max(0, Math.min(1, g.points / g.devant.points)) * 1000) / 10 + '%'); b.appendChild(i)
      b.setAttribute('role', 'img'); b.setAttribute('aria-label', A.nombre(g.points) + ' points sur les ' + A.nombre(g.devant.points) + ' de la ' + A.rang(g.devant.rang) + ' place')
      boite.appendChild(b)
    } else if (li && Number(li.getAttribute('data-rang')) > 1) {
      var avant = liste.querySelector('.cl-ligne[data-rang="' + (Number(li.getAttribute('data-rang')) - 1) + '"]')
      if (avant) boite.appendChild(el('p', 'cl-monter-but', 'Juste devant toi : ' + String(avant.getAttribute('data-pseudo')) + ', ' + avant.querySelector('.cl-val').textContent))
    }
    if (c.id === 'score' && Array.isArray(g.aspects) && g.aspects.length) {
      var faible = g.aspects.slice().sort(function (x, y) { return (Number(x.points) || 0) - (Number(y.points) || 0) })[0]
      if (faible && Number(faible.points) < 100) boite.appendChild(el('p', 'cl-monter-conseil', 'Pour monter vite : ' + A.texte(faible.nom) + ' (' + A.nombre(faible.points) + ' sur 100). Ton aspect le plus faible monte le plus vite.'))
    }
    var mieux = null
    ;(Array.isArray(m.themes) ? m.themes : []).forEach(function (t) { if (t && t.rang && (!mieux || t.rang < mieux.rang)) mieux = t })
    if (mieux) {
      var p = el('p', 'cl-monter-theme'), a = el('a', '', A.texte(mieux.nom) + ' : ' + A.rang(mieux.rang) + ' en ' + A.texte(mieux.titre))
      a.href = '#' + mieux.cle + '/' + mieux.categorie
      p.appendChild(document.createTextNode('Ton meilleur thème : ')); p.appendChild(a)
      boite.appendChild(p)
    }
    boite.hidden = !boite.children.length
  }
  // (le propriétaire, 29/10 : « vivant : ce qui bouge vraiment ») LES DERNIERS EXPLOITS (GET /api/exploits, API.md 2.8) : les
  // six derniers, relus chaque minute tant que la page est visible (jamais en boucle sur les mêmes) ; un neuf arrive en
  // glissant ; un clic ouvre la fiche du joueur
  var filExploits = document.getElementById('fil-exploits'), encartExploits = document.getElementById('encart-exploits'), exploitsVus = {}, premierFil = true
  function lireExploits() {
    if (!filExploits || !A.exploits || document.hidden) return
    A.exploits(6).then(function (r) {
      var l = r.statut === 200 && r.corps && Array.isArray(r.corps.exploits) ? r.corps.exploits : []
      if (!l.length) return
      vider(filExploits)
      l.slice(0, 6).forEach(function (x) {
        var li = el('li', !premierFil && !exploitsVus[x.id] ? 'neuf' : ''), b = el('button', 'cl-fil-ligne')
        b.type = 'button'
        b.appendChild(el('span', 'cl-fil-texte', A.texte(x.texte)))
        b.appendChild(el('span', 'cl-fil-quand', A.ilYa(x.quand)))
        if (A.PSEUDO.test(String(x.pseudo || ''))) b.addEventListener('click', function () { ouvrirFiche(String(x.pseudo), b) })
        li.appendChild(b); filExploits.appendChild(li)
        exploitsVus[x.id] = 1
      })
      premierFil = false
      encartExploits.hidden = false
    })
  }
  lireExploits()
  setInterval(lireExploits, 60000)
  // qui est connecté : une fois, à l'ouverture (401 : personne)
  A.moi().then(function (r) {
    etat.moi = r.statut === 200 && r.corps && r.corps.pseudo ? r.corps : false
    if (etat.moi && gesteMoi) { gesteMoi.textContent = 'Mon compte'; gesteMoi.href = 'compte.html' }
    dessinerMoi()
  })

  // ---------- la fiche d'un joueur ----------
  function fiche(pseudo) {
    var cle = pseudo.toLowerCase()
    if (!etat.fiches[cle]) etat.fiches[cle] = A.joueur(pseudo).then(function (r) { if (r.statut !== 200) delete etat.fiches[cle]; return r })
    return etat.fiches[cle]
  }
  // au survol (une souris) : une petite carte, après un court instant
  var survol = null, minuteurSurvol = 0, survolPour = ''
  function carteSurvol() {
    if (survol) return survol
    survol = el('div', 'cl-survol'); survol.hidden = true; survol.setAttribute('aria-hidden', 'true')
    document.body.appendChild(survol)
    return survol
  }
  function survoler(pseudo, li, ev) {
    clearTimeout(minuteurSurvol); survolPour = pseudo
    var x = ev.clientX
    minuteurSurvol = setTimeout(function () {
      fiche(pseudo).then(function (r) {
        if (survolPour !== pseudo || r.statut !== 200) return
        var f = r.corps, s = carteSurvol()
        vider(s)
        var haut = el('div', 'haut'), t = P.tete(el('span', 'cl-tete'), f.peau, 48), qui = el('div')
        haut.appendChild(t)
        qui.appendChild(el('b', '', String(f.pseudo)))
        var ligne1 = []
        if (f.grade && f.grade.nom) ligne1.push(String(f.grade.nom))
        if (f.equipe && f.equipe.nom) ligne1.push(String(f.equipe.nom))
        if (f.niveau) ligne1.push('niveau ' + f.niveau.n)
        qui.appendChild(el('span', 'or', ligne1.join(' · ')))
        haut.appendChild(qui); s.appendChild(haut)
        if (f.general && f.general.rang) s.appendChild(el('p', '', A.rang(f.general.rang) + ' au classement général, ' + A.nombre(f.general.points) + ' points sur ' + A.nombre(f.general.sur)))
        if (f.ile) s.appendChild(el('p', '', 'Son île : ' + String(f.ile.nom) + ' ' + etoiles(f.ile.etoiles)))
        s.appendChild(el('p', '', f.en_ligne ? 'En ligne' + (f.lieu ? ' · ' + String(f.lieu) : '') : 'Vu ' + A.ilYa(f.vu)))
        var b = li.getBoundingClientRect(), gauche = Math.min(window.innerWidth - 290, Math.max(10, x + 24))
        s.style.left = gauche + 'px'
        s.style.top = Math.max(70, Math.min(window.innerHeight - 200, b.top - 10)) + 'px'
        s.hidden = false
        requestAnimationFrame(function () { s.classList.add('vu') })
      })
    }, 260)
  }
  function cacherSurvol() { clearTimeout(minuteurSurvol); survolPour = ''; if (survol) { survol.classList.remove('vu'); survol.hidden = true } }
  function etoiles(n) { var k = Math.max(0, Math.min(5, Math.floor(Number(n) || 0))), s = ''; for (var i = 0; i < 5; i++) s += i < k ? '★' : '☆'; return s }

  // au clic (ou au doigt) : la fenêtre de la fiche, sa peau en 3D qu'on tourne
  var fenetre = null, poigneeFiche = null, retourFocus = null
  function fermerFiche() {
    if (!fenetre || fenetre.hidden) return
    fenetre.hidden = true
    if (poigneeFiche) { poigneeFiche.detruire(); poigneeFiche = null }
    document.documentElement.style.overflow = ''
    if (retourFocus && retourFocus.focus) retourFocus.focus()
  }
  function ouvrirFiche(pseudo, depuis) {
    cacherSurvol()
    retourFocus = depuis || null
    if (!fenetre) {
      fenetre = el('div', 'cl-fiche'); fenetre.hidden = true
      fenetre.setAttribute('role', 'dialog'); fenetre.setAttribute('aria-modal', 'true'); fenetre.setAttribute('aria-labelledby', 'fiche-nom')
      fenetre.addEventListener('click', function (e) { if (e.target === fenetre) fermerFiche() })
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fermerFiche() })
      document.body.appendChild(fenetre)
    }
    vider(fenetre)
    var panneau = el('div', 'panneau'), fermer = el('button', 'fermer', '×')
    fermer.type = 'button'; fermer.setAttribute('aria-label', 'Fermer la fiche'); fermer.addEventListener('click', fermerFiche)
    panneau.appendChild(fermer)
    panneau.appendChild(el('p', 'classement-etat', 'On ouvre la fiche...'))
    fenetre.appendChild(panneau)
    fenetre.hidden = false
    document.documentElement.style.overflow = 'hidden'
    fermer.focus()
    fiche(pseudo).then(function (r) {
      if (fenetre.hidden) return
      vider(panneau); panneau.appendChild(fermer)
      if (r.statut !== 200) { panneau.appendChild(el('p', 'classement-etat', r.statut === 404 ? 'Aucun joueur à ce pseudo.' : 'La fiche ne s\'ouvre pas pour l\'instant.')); fermer.focus(); return }
      remplirFiche(panneau, r.corps)
      fermer.focus()
    })
  }
  function remplirFiche(panneau, f) {
    var statue = el('div', 'fiche-statue'), face = document.createElement('canvas')
    face.className = 'face'; face.setAttribute('aria-hidden', 'true')
    statue.appendChild(face)
    P.deFace(face, f.peau, f.modele)
    if (P.possible3d()) statue.appendChild(el('p', 'astuce', 'Fais-le tourner'))
    panneau.appendChild(statue)
    var infos = el('div', 'fiche-infos'), h = el('h2', '', String(f.pseudo))
    h.id = 'fiche-nom'
    infos.appendChild(h)
    var titres = el('p', 'titres')
    if (f.grade && f.grade.nom) { var g = el('span', 'grade'); if (/^(chevalier|comte|marquis|duc|souverain)$/.test(f.grade.cle)) { var e = el('span', 'cl-embleme e-' + f.grade.cle); e.setAttribute('aria-hidden', 'true'); g.appendChild(e) } g.appendChild(document.createTextNode(String(f.grade.nom))); titres.appendChild(g) }
    if (f.equipe && f.equipe.nom) titres.appendChild(el('span', 'equipe', String(f.equipe.nom)))
    if (f.titre) titres.appendChild(el('span', '', String(f.titre)))
    titres.appendChild(el('span', 'vu' + (f.en_ligne ? ' en-ligne' : ''), f.en_ligne ? 'En ligne' + (f.lieu ? ' · ' + String(f.lieu) : '') : 'Vu ' + A.ilYa(f.vu)))
    infos.appendChild(titres)
    if (f.niveau) {
      var nv = el('div', 'fiche-niveau'), b = el('span', 'cl-barre'), i = el('i')
      nv.appendChild(el('b', '', 'Niveau ' + f.niveau.n))
      i.style.setProperty('--part', (f.niveau.max ? 100 : Math.round((Number(f.niveau.part) || 0) * 100)) + '%'); b.appendChild(i); b.setAttribute('aria-hidden', 'true'); nv.appendChild(b)
      infos.appendChild(nv)
    }
    // (la tête, 29/10 : l'équipe se voit « comme un joueur mais sans nous ») l'équipe : aucun bloc du classement ; un rang 0 : rien non plus
    if (!f.hors_classement && f.general && Number(f.general.rang) >= 1) {
      var gen = el('div')
      gen.appendChild(el('p', '', (f.general.rang ? A.rang(f.general.rang) + ' au classement général, ' : '') + A.nombre(f.general.points) + ' points sur ' + A.nombre(f.general.sur)))
      if (Array.isArray(f.general.aspects) && f.general.aspects.length) {
        var ul = el('ul', 'fiche-aspects')
        f.general.aspects.forEach(function (a) { var li = el('li'), bb = el('span', 'cl-barre'), ii = el('i'); li.appendChild(el('span', '', String(a.nom))); ii.style.setProperty('--part', Math.max(0, Math.min(100, Number(a.points) || 0)) + '%'); bb.appendChild(ii); li.appendChild(bb); li.appendChild(el('b', '', String(Math.round(a.points)))); ul.appendChild(li) })
        gen.appendChild(ul)
      }
      infos.appendChild(bloc('Le classement général', gen))
    }
    if (Array.isArray(f.themes) && f.themes.length) {
      var ult = el('ul', 'fiche-grille')
      f.themes.forEach(function (t) { var li = el('li'); li.appendChild(el('span', '', A.texte(t.nom) + ' : ' + A.texte(t.titre))); li.appendChild(el('b', '', A.rang(t.rang))); ult.appendChild(li) })
      infos.appendChild(bloc('Ses meilleures places', ult))
    }
    if (f.ile) {
      var ile = el('p'), et = el('span', 'fiche-etoiles')
      ile.appendChild(document.createTextNode(String(f.ile.nom) + ' '))
      for (var k = 0; k < 5; k++) et.appendChild(el('span', k < (Number(f.ile.etoiles) || 0) ? '' : 'vide', '★'))
      et.setAttribute('aria-label', (Number(f.ile.etoiles) || 0) + ' étoiles sur 5')
      ile.appendChild(et)
      var dit = []
      if (f.ile.amis > 0) dit.push(A.nombre(f.ile.amis) + (f.ile.amis > 1 ? ' amis' : ' ami'))
      if (f.ile.place) dit.push(A.rang(f.ile.place) + ' aux Îles')
      if (dit.length) ile.appendChild(document.createTextNode(' · ' + dit.join(' · ')))
      infos.appendChild(bloc('Son île', ile))
    }
    var stats = el('ul', 'fiche-grille')
    // (la tête, 29/10) jamais un nombre de boss : ses victoires, ses donjons, ses records du serveur boss par boss
    if (f.boss) {
      ligneStat(stats, 'Victoires contre les boss', A.nombre(f.boss.victoires || 0)); if (f.boss.victoires_heroique) ligneStat(stats, 'En Héroïque', A.nombre(f.boss.victoires_heroique)); ligneStat(stats, 'Donjons gagnés', A.nombre(f.boss.donjons || 0))
      ;(Array.isArray(f.boss.records) ? f.boss.records : []).forEach(function (r) { ligneStat(stats, 'Record : ' + String(r.nom) + (r.mode === 'heroique' ? ' en Héroïque' : ''), String(r.temps)) })
    }
    if (f.mer) { ligneStat(stats, 'Pirates coulés', A.nombre(f.mer.pirates)); ligneStat(stats, 'Sorties en mer', A.nombre(f.mer.sorties)) }
    if (f.collections) { ligneStat(stats, 'Familiers', A.nombre(f.collections.familiers)); ligneStat(stats, 'Montures', A.nombre(f.collections.montures)) }
    if (f.temps_de_jeu_min) ligneStat(stats, 'Temps de jeu', A.nombre(Math.floor(f.temps_de_jeu_min / 60)) + String.fromCharCode(160) + 'h')
    if (stats.children.length) infos.appendChild(bloc('Ses exploits', stats))
    // (5c, l'audit du 30/10 : un pseudo du classement ne menait jamais à sa page) SON PROFIL ENTIER : joueur/<pseudo>
    if (/^[A-Za-z0-9_]{3,16}$/.test(String(f.pseudo))) {
      var profil = el('a', 'bouton bouton-sombre fiche-profil', 'Voir son profil'); profil.href = 'joueur/' + String(f.pseudo)
      var lp = el('p', 'fiche-profil-ligne'); lp.appendChild(profil); infos.appendChild(lp)
    }
    // (le propriétaire, 29/10 : « donner envie [...] d'avoir leur île ») LA FICHE MÈNE AU JEU : un visiteur y lit « Toi aussi,
    // construis ton île » ; un joueur connecté, sa place à lui au classement général, pour se comparer
    var m = etat.moi
    if (m === false) {
      var appel = el('div', 'fiche-appel')
      appel.appendChild(el('p', 'fiche-appel-titre', 'Toi aussi, construis ton île'))
      appel.appendChild(el('p', '', 'Une île sur la mer rien qu\'à toi, des boss, des bêtes, des amis : et ta place ici.'))
      var tel = el('a', 'bouton bouton-or', 'Télécharger le launcher'); tel.href = './#telecharger'
      appel.appendChild(tel)
      infos.appendChild(appel)
    } else if (m && m.pseudo !== f.pseudo && m.general && m.general.rang && !m.hors_classement) {
      infos.appendChild(el('p', 'fiche-toi', 'Toi : ' + A.rang(m.general.rang) + ' au classement général, ' + A.nombre(m.general.points) + ' points.'))
    }
    panneau.appendChild(infos)
    // la 3D, à la taille de la statue (on la tourne au doigt ou à la souris)
    poigneeFiche = P.vue3d(statue, f.peau, f.modele, { largeur: statue.clientWidth || 220, hauteur: statue.clientHeight || 330, glisser: true, pose: 'repos', zoom: 0.8 })
  }
  function bloc(titre, contenu) { var d = el('div', 'fiche-bloc'); d.appendChild(el('h3', '', titre)); d.appendChild(contenu); return d }
  function ligneStat(ul, nom, valeur) { var li = el('li'); li.appendChild(el('span', '', nom)); li.appendChild(el('b', '', valeur)); ul.appendChild(li) }

  // ---------- le départ ----------
  lireAdresse()
  window.addEventListener('hashchange', function () { var t = etat.theme, c = etat.categorie, k = etat.taille; lireAdresse(); if (t !== etat.theme || c !== etat.categorie || k !== etat.taille) charger() })
  charger()
})()
