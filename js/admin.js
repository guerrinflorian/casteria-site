// L'ESPACE DE L'ÉQUIPE (admin.html ; le prototype du 29/10/2026) : réservé à l'Admin, au Responsable et au Fondateur. La
// page lit /api/moi (droits.admin) pour savoir quoi montrer ; c'est l'API qui refuse les adresses /api/admin/... à tout
// autre (403), et à une session de plus de 12 heures (401 « reconnexion », API.md 1.3) : la page ne fait que le dire. Sept
// vues (l'adresse : admin.html#ventes) : le tableau de bord, les ventes, les tunnels, ce que les joueurs regardent, ce
// qu'ils font en jeu, la fiche complète d'un joueur (tout son casier), le tchat en direct (UN seul tchat pour tout le
// réseau, un flux SSE : CasteriaApi.tchat).
// LES RÈGLES DU TABLEAU (le propriétaire, 29/10 : « doit être correct [...] ou casser, ou pas être vrai ») : aucune liste
// écrite ici (les packs, les articles, les activités, les lieux, les étapes arrivent avec leur nom) ; une valeur absente
// (null) se dit « pas encore de données », JAMAIS 0 ; chaque tuile et chaque carte disent l'heure de leur donnée et l'état
// de leur source (« Tebex ne répond pas : chiffres de 14:05 ») ; un champ inconnu de l'API est ignoré. Le banc :
// outils/banc_admin.js refait chaque tuile et chaque courbe à la main et compare à ce que la page affiche.
(function () {
  'use strict'
  var A = window.CasteriaApi, G = window.CasteriaGraphe, P = window.CasteriaPeau
  var $ = function (id) { return document.getElementById(id) }
  var menu = $('admin-menu'), nav = $('admin-nav'), qui = $('admin-qui'), titre = $('admin-titre'), sous = $('admin-sous'), filtres = $('admin-filtres'), vue = $('admin-vue')
  if (!A || !G || !menu || !nav || !vue || !titre || !sous || !filtres) return
  var el = A.el, vider = A.vider, NBSP = String.fromCharCode(160)
  var VUES = {
    tableau: ['Le tableau de bord', 'Les chiffres de la période, face à la période d\'avant.'],
    // (dc, 30/10 ; le propriétaire : « exploitable et complet en données ») gérer le serveur, maintenant
    maintenant: ['En ce moment', 'Qui est en ligne et où, les comptes créés aujourd\'hui, les dernières ventes.'],
    moderation: ['La modération', 'Les sanctions qui courent encore et leur fin, les signalements à traiter.'],
    economie: ['L\'économie', 'Les plus riches, et les jetons qui montent le plus vite sur 7 jours.'],
    ventes: ['Les ventes', 'La boutique du site (Tebex) et les crédits dépensés dans la boutique du jeu.'],
    tunnels: ['Les tunnels', 'D\'une visite du site à un premier achat, et de la boutique vue au paiement.'],
    consultations: ['Ce qu\'ils regardent', 'Les pages du site, les packs, les articles de la boutique du jeu.'],
    jeu: ['Ce qu\'ils font en jeu', 'Les joueurs actifs, les nouveaux, le monde en ligne, les activités, le temps passé.'],
    joueurs: ['Un joueur', 'Sa fiche complète : son compte, son argent, ses achats, tout son casier, son île.'],
    tchat: ['Le tchat en direct', 'Le tchat de tout le réseau, une seule liste, ligne par ligne dès qu\'elle est écrite.'],
    // (ag, 30/10 ; le propriétaire : « l'état de tout ») les serveurs, le VPS, la base, la 3D des îles, et leurs alertes
    infra: ['L\'infra', 'Chaque serveur de jeu, le VPS du site, la base et la 3D des îles : leur état, sa source et son heure.']
  }
  var VIDE = 'pas encore de données'
  // (dc, 30/10) les vues de l'instant : sans le choix de la période
  var SANS_PERIODE = { maintenant: 1, moderation: 1, economie: 1, infra: 1 }
  var etat = { vue: 'tableau', jours: 30, pas: 'jour', numero: 0, tchat: null }

  // ---------- qui est là ----------
  function refus(texte, lien, mot) {
    titre.textContent = 'L\'espace de l\'équipe'
    sous.textContent = texte
    vider(vue)
    if (lien) { var a = el('a', 'bouton bouton-or grand', mot); a.href = lien; vue.appendChild(a) }
  }
  function reconnexion() {
    menu.hidden = true; filtres.hidden = true
    refus('Pour l\'espace de l\'équipe, reconnecte-toi : la session de l\'équipe dure 12 heures.', 'connexion.html?retour=admin.html', 'Se reconnecter')
  }
  A.moi().then(function (r) {
    if (r.statut === 401) return refus('Connecte-toi d\'abord : cette page est réservée à l\'équipe.', 'connexion.html?retour=admin.html', 'Se connecter')
    if (r.statut !== 200) return refus('La page ne s\'ouvre pas pour l\'instant. Réessaie dans un instant.')
    if (!r.corps.droits || !r.corps.droits.admin) return refus('Cette page est réservée à l\'équipe : l\'Admin, le Responsable et le Fondateur.', 'compte.html', 'Mon compte')
    menu.hidden = false
    qui.textContent = 'Connecté : ' + String(r.corps.pseudo) + (r.corps.equipe && r.corps.equipe.nom ? ' (' + String(r.corps.equipe.nom) + ')' : '')
    lireAdresse()
    montrer()
  })

  // ---------- l'adresse, le menu, les filtres ----------
  function lireAdresse() { var h = (location.hash || '').slice(1); if (VUES[h]) etat.vue = h }
  window.addEventListener('hashchange', function () { var v = etat.vue; lireAdresse(); if (v !== etat.vue && !menu.hidden) montrer() })
  Array.prototype.forEach.call(filtres.querySelectorAll('button'), function (b) {
    b.addEventListener('click', function () {
      if (b.dataset.jours) etat.jours = Number(b.dataset.jours)
      if (b.dataset.pas) etat.pas = b.dataset.pas
      marquerFiltres(); montrer()
    })
  })
  function marquerFiltres() {
    Array.prototype.forEach.call(filtres.querySelectorAll('button'), function (b) {
      var oui = b.dataset.jours ? Number(b.dataset.jours) === etat.jours : b.dataset.pas === etat.pas
      b.setAttribute('aria-pressed', oui ? 'true' : 'false')
    })
  }
  function montrer() {
    if (etat.tchat) { etat.tchat.fermer(); etat.tchat = null }
    if (etat.minuteur) { clearTimeout(etat.minuteur); etat.minuteur = null }
    var n = ++etat.numero, v = VUES[etat.vue]
    titre.textContent = v[0]; sous.textContent = v[1]
    Array.prototype.forEach.call(nav.querySelectorAll('a'), function (a) { if (a.dataset.vue === etat.vue) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current') })
    filtres.hidden = etat.vue === 'joueurs' || etat.vue === 'tchat' || SANS_PERIODE[etat.vue]
    $('filtre-pas').hidden = etat.vue !== 'ventes' && etat.vue !== 'jeu'
    vue.classList.add('charge')
    var fin = function () { if (n === etat.numero) vue.classList.remove('charge') }
    if (etat.vue === 'joueurs') { vider(vue); vueJoueurs(); fin(); return }
    if (etat.vue === 'tchat') { vider(vue); vueTchat(); fin(); return }
    var quoi = { infra: 'infra', maintenant: 'maintenant', moderation: 'moderation', economie: 'economie', tableau: 'tableau', ventes: 'ventes', tunnels: 'entonnoir', consultations: 'consultations', jeu: 'activites' }[etat.vue]
    A.admin(quoi, { jours: etat.jours, pas: etat.pas }).then(function (r) {
      if (n !== etat.numero) return
      fin()
      if (r.statut === 401 && r.corps && r.corps.erreur === 'reconnexion') return reconnexion()
      if (r.statut !== 200 || !r.corps || typeof r.corps !== 'object') { vider(vue); vue.appendChild(el('p', 'a-panne', r.statut === 403 ? 'L\'API refuse : cette page est réservée à l\'équipe.' : 'Les chiffres ne se lisent pas pour l\'instant. Réessaie dans un instant.')); return }
      vider(vue)
      ;({ infra: vueInfra, maintenant: vueMaintenant, moderation: vueModeration, economie: vueEconomie, tableau: vueTableau, ventes: vueVentes, tunnels: vueTunnels, consultations: vueConsultations, jeu: vueJeu })[etat.vue](r.corps)
    })
  }

  // ---------- les valeurs : un nombre, ou rien (null : « pas encore de données », jamais 0) ----------
  function num(x) { return typeof x === 'number' && isFinite(x) ? x : null }
  function chiffre(o) { return o && typeof o === 'object' ? o : { valeur: num(o) } }
  function liste(x) { return Array.isArray(x) ? x : [] }
  // (dc, 30/10 ; la tête : « aucune clé brute ne doit jamais s'afficher ») une ligne sans son nom en mots du joueur ne
  // s'affiche pas (jamais « _t » ni une clé du jeu à la place)
  function nomme(x) { return !!(x && typeof x.nom === 'string' && x.nom.trim() && x.nom.charAt(0) !== '_') }
  // un texte des données : ses nombres et ses mots composés ne se coupent jamais (CasteriaApi.texte)
  function texte(x) { return x === undefined || x === null ? '' : A.texte(x) }
  var euros = function (c) { return num(c) === null ? VIDE : A.euros(c) }
  var nb = function (n) { return num(n) === null ? VIDE : A.nombre(n) }
  var eurosCourt = function (c) { return G.compact(Math.round(c / 100)) + NBSP + '€' }
  function pluriel(n, mot, mots) { return A.nombre(n) + ' ' + (n > 1 ? (mots || mot + 's') : mot) }
  // l'heure d'une donnée, à l'heure de Paris : « 14:05 », ou « le 28 oct. à 23:10 » si ce n'est pas aujourd'hui
  function quand(iso) {
    var t = Date.parse(iso)
    if (!(t > 0)) return ''
    try {
      var jour = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'short' })
      var h = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }).format(new Date(t))
      return jour.format(new Date(t)) === jour.format(new Date()) ? h : 'du ' + jour.format(new Date(t)) + ' à ' + h
    } catch (e) { return '' }
  }
  // l'état d'une source (API.md 4.0) : « données de 14:05 », « Tebex ne répond pas : chiffres de 14:05 », « pas encore de données »
  function source(d, cle, lu) {
    var s = d && d.sources && d.sources[cle] && typeof d.sources[cle] === 'object' ? d.sources[cle] : null
    var t = quand(lu || (s && s.lu)), de = t ? (t.indexOf('du ') === 0 ? t : 'de ' + t) : ''
    if (s && s.etat === 'absente') return { texte: VIDE, alerte: false, absente: true }
    if (s && (s.etat === 'muette' || s.etat === 'en_retard')) return { texte: texte(s.nom || cle) + ' ne répond pas : chiffres ' + (de || 'anciens'), alerte: true }
    return { texte: de ? 'données ' + de : '', alerte: false }
  }
  function ligneSource(d, cle, lu) {
    var s = source(d, cle, lu)
    return s.texte ? el('span', 'a-source' + (s.alerte ? ' a-alerte' : ''), s.texte) : null
  }

  // ---------- les pièces ----------
  function carte(titreCarte, aide, d, cle, large, parent) {
    var c = el('div', 'a-carte' + (large ? ' large coins-or' : ''))
    c.appendChild(el('h2', '', titreCarte))
    if (aide) c.appendChild(el('p', 'a-aide', aide))
    var s = cle ? ligneSource(d, cle) : null
    if (s) c.appendChild(s)
    var g = el('div', 'a-graphe'); c.appendChild(g)
    ;(parent || vue).appendChild(c)
    return g
  }
  function grille() { var g = el('div', 'a-grille'); vue.appendChild(g); return g }
  // une tuile : son nom, sa valeur (ou « pas encore de données »), l'écart avec la période d'avant, l'heure de sa donnée
  function tuiles(d, l) {
    var ul = el('ul', 'a-tuiles')
    l.forEach(function (t) {
      var c = chiffre(t.chiffre), v = num(c.valeur), av = num(c.avant), s = source(d, c.source || t.source, c.lu), li = el('li')
      li.setAttribute('data-tuile', t.cle)
      li.appendChild(el('span', 'a-tuile-nom', t.nom))
      li.appendChild(el('b', v === null ? 'vide' : '', v === null || s.absente ? VIDE : t.format(v)))
      if (v !== null && av !== null && !s.absente) {
        if (av > 0) {
          var e = (v - av) / av, monte = e >= 0, bon = t.bon === false ? !monte : monte
          var dl = el('span', 'a-delta ' + (Math.abs(e) < 0.005 ? 'egal' : (bon ? 'bien' : 'mal')))
          dl.appendChild(el('i', '', Math.abs(e) < 0.005 ? '=' : (monte ? '▲' : '▼')))
          dl.appendChild(document.createTextNode(' ' + (monte ? '+' : '-') + A.pourcent(Math.abs(e)) + ' sur les ' + etat.jours + ' jours d\'avant'))
          li.appendChild(dl)
        } else li.appendChild(el('span', 'a-delta egal', '0 sur les ' + etat.jours + ' jours d\'avant'))
      } else if (t.sous && v !== null) li.appendChild(el('span', 'a-delta egal', t.sous))
      if (s.texte && !s.absente) li.appendChild(el('span', 'a-source' + (s.alerte ? ' a-alerte' : ''), s.texte))
      ul.appendChild(li)
    })
    vue.appendChild(ul)
  }
  // une courbe de l'API : { source, points: [{ date, valeur }] } (ou l'ancienne forme, une liste)
  function points(c, cle) {
    var p = c && typeof c === 'object' && !Array.isArray(c) ? c.points : c
    return liste(p).map(function (x) { return { date: texte(x.date), valeur: num(cle ? x[cle] : x.valeur) } })
  }

  // ---------- le tableau de bord ----------
  function vueTableau(d) {
    var c = d.chiffres || {}, k = function (x) { return c[x] }
    var pic = chiffre(k('pic_du_jour'))
    tuiles(d, [
      { cle: 'revenu', nom: 'Revenu (brut, TTC)', chiffre: k('revenu_centimes'), format: euros },
      { cle: 'commandes', nom: 'Commandes', chiffre: k('commandes'), format: nb },
      { cle: 'panier', nom: 'Panier moyen', chiffre: k('panier_moyen_centimes'), format: euros },
      { cle: 'acheteurs', nom: 'Acheteurs', chiffre: k('acheteurs'), format: nb },
      { cle: 'premiers_achats', nom: 'Premiers achats', chiffre: k('premiers_achats'), format: nb },
      { cle: 'nouveaux', nom: 'Nouveaux joueurs', chiffre: k('nouveaux_joueurs'), format: nb },
      { cle: 'actifs', nom: 'Joueurs actifs par jour', chiffre: k('joueurs_actifs_jour'), format: nb },
      { cle: 'en_ligne', nom: 'En ligne maintenant', chiffre: k('en_ligne'), format: nb, sous: num(pic.valeur) === null ? '' : 'pic du jour : ' + A.nombre(pic.valeur) }
    ])
    var g = grille(), cr = d.courbes || {}
    G.courbe(carte('Le revenu, jour par jour', 'Tebex : les paiements terminés, bruts, TVA comprise.', d, (cr.revenu || {}).source || 'tebex', false, g), { titre: 'Le revenu par jour', series: [{ nom: 'Revenu', couleur: 'or', aire: true, points: points(cr.revenu) }], format: euros, formatAxe: eurosCourt })
    G.courbe(carte('Les joueurs actifs, jour par jour', 'Les joueurs différents venus dans la journée (à l\'heure de Paris).', d, (cr.actifs || {}).source || 'jeu', false, g), { titre: 'Les joueurs actifs par jour', series: [{ nom: 'Joueurs actifs', couleur: 'mer', aire: true, points: points(cr.actifs) }], format: nb })
  }

  // ---------- les ventes ----------
  function vueVentes(d) {
    var t = d.total || {}, mot = etat.pas === 'semaine' ? 'semaine par semaine' : 'jour par jour'
    var ach = chiffre(t.acheteurs), lit = chiffre(t.litiges)
    tuiles(d, [
      { cle: 'revenu', nom: 'Revenu (brut, TTC)', chiffre: t.revenu_centimes, format: euros },
      { cle: 'commandes', nom: 'Commandes', chiffre: t.commandes, format: nb, sous: num(ach.valeur) === null ? '' : pluriel(ach.valeur, 'acheteur') },
      { cle: 'panier', nom: 'Panier moyen', chiffre: t.panier_moyen_centimes, format: euros, sous: 'par commande' },
      { cle: 'rembourse', nom: 'Remboursé', chiffre: t.rembourse_centimes, format: euros, sous: num(lit.valeur) === null ? '' : pluriel(lit.valeur, 'litige') }
    ])
    var cs = (d.courbe && d.courbe.source) || 'tebex'
    G.courbe(carte('Le revenu, ' + mot, 'Tebex : les paiements terminés de la période, bruts, TVA comprise.', d, cs, true), { titre: 'Le revenu ' + mot, series: [{ nom: 'Revenu', couleur: 'or', aire: true, points: points(d.courbe, 'revenu_centimes') }], format: euros, formatAxe: eurosCourt })
    G.colonnes(carte('Les commandes, ' + mot, 'Une commande : un paiement terminé (un panier peut porter plusieurs packs).', d, cs, true), { titre: 'Les commandes ' + mot, nom: 'Commandes', couleur: 'violet', points: points(d.courbe, 'commandes'), format: nb })
    var g = grille()
    G.barres(carte('Les packs, du plus vendu au moins vendu', 'Tous les packs de la boutique Tebex, par revenu ; leur part du revenu, et leurs ventes sur leurs vues (le site).', d, 'tebex', false, g), { couleur: 'or', titres: ['Pack', 'Revenu'], lignes: liste(d.produits).map(function (p) {
      var bouts = [pluriel(num(p.ventes) || 0, 'vente')]
      if (num(p.part) !== null) bouts.push(A.pourcent(p.part, 0) + ' du revenu')
      if (num(p.taux) !== null) bouts.push(A.pourcent(p.taux) + ' des vues')
      return { nom: texte(p.nom), valeur: num(p.revenu_centimes), texte: euros(p.revenu_centimes), sous: bouts.join(' · ') }
    }) })
    G.barres(carte('La boutique du jeu : ce qui se paie le plus', 'Les crédits dépensés, article par article (le journal des crédits du jeu).', d, 'jeu', false, g), { couleur: 'violet', titres: ['Article', 'Crédits'], lignes: liste(d.credits_en_jeu).map(function (x) { return { nom: texte(x.article), valeur: num(x.credits), texte: num(x.credits) === null ? VIDE : A.nombre(x.credits) + NBSP + 'crédits', sous: num(x.achats) === null ? '' : pluriel(x.achats, 'achat') } }) })
    var c3 = el('div', 'a-carte large'), ul = el('ul', 'a-liste')
    c3.appendChild(el('h2', '', 'Les dernières ventes')); var s3 = ligneSource(d, 'tebex'); if (s3) c3.appendChild(s3)
    liste(d.recentes).forEach(function (x) { var li = el('li'); li.appendChild(el('span', 'quand', A.date(x.quand, true))); li.appendChild(el('b', '', texte(x.pseudo))); li.appendChild(el('span', '', texte(x.produit))); li.appendChild(el('span', 'prix', euros(x.prix_centimes))); ul.appendChild(li) })
    if (!ul.children.length) ul.appendChild(el('li', 'rien', 'Aucune vente sur la période.'))
    c3.appendChild(ul); vue.appendChild(c3)
  }

  // ---------- les tunnels ----------
  function etapes(d, l) {
    return liste(l).map(function (x) { var s = source(d, x.source); return { nom: texte(x.nom), n: s.absente ? null : num(x.n), taux: num(x.taux), taux_total: num(x.taux_total), note: s.alerte ? s.texte : '' } })
  }
  function vueTunnels(d) {
    var g = grille()
    G.entonnoir(carte('L\'arrivée : du site au premier achat', 'Les visiteurs du site, les téléchargements du launcher (GitHub), les comptes créés en jeu, les premiers achats (Tebex).', d, '', false, g), { couleur: 'mer', etapes: etapes(d, d.arrivee), format: nb })
    G.entonnoir(carte('L\'achat : de la boutique au paiement', 'La boutique du site vue, un pack choisi, le panier créé chez Tebex, sa page de paiement ouverte, puis payé.', d, '', false, g), { couleur: 'or', etapes: etapes(d, d.achat), format: nb })
    var c3 = el('div', 'a-carte large'); c3.appendChild(el('h2', '', 'Le tunnel d\'achat, pack par pack'))
    c3.appendChild(el('p', 'a-aide', 'De « pack choisi » à « payé » : où chaque pack perd ses acheteurs.'))
    var t = el('table', 'a-table'), th = el('thead'), tr = el('tr')
    ;['Pack', 'Choisi', 'Panier', 'Paiement', 'Payé', 'Du choix au paiement'].forEach(function (x) { var c = el('th', '', x); c.setAttribute('scope', 'col'); tr.appendChild(c) })
    th.appendChild(tr); t.appendChild(th)
    var tb = el('tbody')
    liste(d.par_produit).forEach(function (p) {
      var r = el('tr'); r.appendChild(el('th', '', texte(p.nom)))
      ;[p.pack_choisi, p.panier, p.paiement, p.paye].forEach(function (x) { r.appendChild(el('td', '', nb(x))) })
      r.appendChild(el('td', 'taux', num(p.pack_choisi) && num(p.paye) !== null ? A.pourcent(p.paye / p.pack_choisi) : '')); tb.appendChild(r)
    })
    // (dc, 30/10) aucun pack choisi : une phrase, jamais un tableau vide qui a l'air d'une vraie donnée
    if (tb.children.length) { t.appendChild(tb); c3.appendChild(t) }
    else if (source(d, 'site').absente) c3.appendChild(el('p', 'g-vide', VIDE))
    else { var s3 = ligneSource(d, 'site'); if (s3) c3.appendChild(s3); c3.appendChild(el('p', 'g-vide', 'Aucun pack choisi sur la période.')) }
    vue.appendChild(c3)
    G.courbe(carte('Les comptes créés en jeu, jour par jour', 'Les comptes neufs (/register), vus par spawn.', d, (d.courbe && d.courbe.source) || 'jeu', true), { titre: 'Les comptes créés par jour', series: [{ nom: 'Comptes créés', couleur: 'vert', aire: true, points: points(d.courbe) }], format: nb })
  }

  // ---------- ce qu'ils regardent ----------
  function vueConsultations(d) {
    var g = grille()
    G.barres(carte('Les pages du site les plus vues', '', d, 'site', false, g), { couleur: 'mer', titres: ['Page', 'Vues'], lignes: liste(d.pages_site).map(function (p) { return { nom: texte(p.nom || p.chemin), valeur: num(p.vues), texte: nb(p.vues), sous: texte(p.chemin) } }) })
    G.barres(carte('Les packs les plus vus sur le site', '', d, 'site', false, g), { couleur: 'or', titres: ['Pack', 'Vues'], lignes: liste(d.packs_site).map(function (p) { return { nom: texte(p.nom), valeur: num(p.vues), texte: nb(p.vues), sous: num(p.choisis) === null ? '' : A.nombre(p.choisis) + ' fois choisi' } }) })
    G.barres(carte('La boutique du jeu : les articles les plus vus', 'Les fiches ouvertes dans /boutique en jeu, les joueurs qui les ont vues, et les achats.', d, 'jeu', true), { couleur: 'violet', titres: ['Article', 'Vues'], lignes: liste(d.boutique_jeu).map(function (p) {
      var v = num(p.vues), a = num(p.achats), bouts = []
      if (num(p.joueurs) !== null) bouts.push(pluriel(p.joueurs, 'joueur'))
      if (a !== null) bouts.push(pluriel(a, 'achat'))
      if (a !== null && v) bouts.push(A.pourcent(a / v) + ' des vues')
      return { nom: texte(p.nom || p.produit), valeur: v, texte: v === null ? VIDE : pluriel(v, 'vue'), sous: bouts.join(' · ') }
    }) })
    liste(d.ecrans_jeu).forEach(function (e) { if (num(e.ouvertures) !== null) vue.appendChild(el('p', 'a-note', texte(e.nom) + ' : ' + pluriel(e.ouvertures, 'fois', 'fois') + (num(e.joueurs) !== null ? ', par ' + pluriel(e.joueurs, 'joueur') : '') + '.')) })
  }

  // ---------- ce qu'ils font en jeu ----------
  function vueJeu(d) {
    var c = d.courbes || {}, mot = etat.pas === 'semaine' ? 'semaine par semaine' : 'jour par jour', sc = function (x, def) { return (c[x] && c[x].source) || def }
    var g = grille()
    G.courbe(carte('Les joueurs actifs, ' + mot, etat.pas === 'semaine' ? 'Les joueurs différents venus dans la semaine.' : 'Les joueurs différents venus dans la journée.', d, sc('actifs', 'jeu'), false, g), { titre: 'Les joueurs actifs ' + mot, series: [{ nom: 'Joueurs actifs', couleur: 'mer', aire: true, points: points(c.actifs) }], format: nb })
    G.colonnes(carte('Les nouveaux joueurs, ' + mot, 'Les comptes créés en jeu (/register).', d, sc('nouveaux', 'jeu'), false, g), { titre: 'Les nouveaux joueurs ' + mot, nom: 'Nouveaux joueurs', couleur: 'vert', points: points(c.nouveaux), format: nb })
    G.courbe(carte('Le monde en ligne : la moyenne et le pic', 'Relevé chaque minute sur tout le réseau.', d, sc('en_ligne_pic', 'jeu'), true), { titre: 'Les joueurs en ligne', series: [{ nom: 'Le pic', couleur: 'or', points: points(c.en_ligne_pic) }, { nom: 'La moyenne', couleur: 'mer', points: points(c.en_ligne_moyen) }], format: nb })
    var g2 = grille()
    G.barres(carte('Ce qu\'ils font le plus', 'Les joueurs qui ont avancé dans chaque activité sur la période, et de combien en tout.', d, 'jeu', false, g2), { couleur: 'vert', titres: ['Activité', 'Joueurs'], lignes: liste(d.activites).filter(nomme).map(function (a) { return { nom: texte(a.nom), valeur: num(a.joueurs), texte: num(a.joueurs) === null ? VIDE : pluriel(a.joueurs, 'joueur'), sous: num(a.volume) === null ? '' : A.nombre(a.volume) + (a.unite ? ' ' + texte(a.unite) : '') } }) })
    var tp = d.temps || {}, moyen = num(tp.moyen_par_joueur_min)
    var b4 = carte('Le temps passé', moyen === null ? VIDE : 'Chaque joueur actif passe en moyenne ' + A.nombre(moyen) + NBSP + 'min par jour en jeu. Où :', d, tp.source || 'jeu', false, g2)
    G.empile(b4, { parts: liste(tp.par_lieu).filter(nomme).map(function (p) { return { nom: texte(p.nom), part: num(p.part) } }) })
  }

  // ---------- (ag, 30/10 ; le propriétaire : « l'état de tout ») L'INFRA : chaque serveur de jeu, le VPS, la base, la 3D des
  // îles. Les seuils et les alertes viennent de l'API (GET /api/admin/infra, src/infra.js) : la page ne fait que les montrer ;
  // chaque chiffre dit sa source et son heure ; une valeur absente : « pas encore de données », jamais 0. Relue toutes les
  // 30 s tant que la vue est ouverte et l'onglet visible (sans le voile du chargement : la page ne clignote pas). ----------
  var ETATS_SERVEUR = { en_ligne: ['En ligne', 'vert'], pouls_perdu: ['Sans pouls', 'orange'], arrete: ['Arrêté', 'rouge'], en_defaut: ['En défaut', 'rouge'], ne_repond_pas: ['Ne répond pas', 'rouge'], inconnu: [VIDE, 'gris'] }
  var ETATS_CONTENEUR = { running: ['En marche', 'vert'], restarting: ['Redémarre', 'orange'], paused: ['En pause', 'orange'], exited: ['Arrêté', 'rouge'], dead: ['Arrêté', 'rouge'], created: ['Jamais lancé', 'rouge'], absent: ['Absent', 'rouge'] }
  var INFRA_RELIRE_MS = 30000
  function dec(x, n) { return num(x) === null ? VIDE : String(Math.round(x * Math.pow(10, n)) / Math.pow(10, n)).replace('.', ',') }
  function go(o) { if (num(o) === null) return VIDE; var g = o / 1073741824; return (g >= 10 ? A.nombre(Math.round(g)) : dec(g, 1)) + NBSP + 'Go' }
  function mo(m) { return num(m) === null ? VIDE : (m >= 1024 ? dec(m / 1024, 1) + NBSP + 'Go' : A.nombre(m) + NBSP + 'Mo') }
  function deux(n) { return (n < 10 ? '0' : '') + n }
  function dureeInfra(s) {
    if (num(s) === null) return VIDE
    var m = Math.floor(s / 60), h = Math.floor(m / 60), j = Math.floor(h / 24)
    if (s < 60) return s + NBSP + 's'
    if (m < 60) return m + NBSP + 'min'
    if (h < 24) return h + NBSP + 'h' + NBSP + deux(m % 60)
    return j + NBSP + (j > 1 ? 'jours' : 'jour') + ' ' + (h % 24) + NBSP + 'h'
  }
  // la couleur d'un pourcentage : rouge au-dessus du seuil, orange au-dessus de l'alerte, vert sinon ; gris : inconnu
  function teinte(p, rouge, orange) { return num(p) === null ? 'gris' : p > rouge ? 'rouge' : p > orange ? 'orange' : 'vert' }
  function pastille(mot, couleur) { var s = el('span', 'i-pastille i-' + couleur); s.appendChild(el('i')); s.appendChild(document.createTextNode(mot)); return s }
  function ligne(boite, nom, valeur, sous) {
    var d = el('div', 'i-ligne'), v = typeof valeur === 'string' ? el('b', valeur === VIDE ? 'vide' : '', valeur) : valeur
    d.appendChild(el('span', 'i-nom', nom)); d.appendChild(v)
    if (sous) d.appendChild(el('span', 'i-sous', sous))
    boite.appendChild(d)
    return d
  }
  function de(lu) { var t = quand(lu); return t ? (t.indexOf('du ') === 0 ? t : 'de ' + t) : '' }
  function pied(boite, src, lu, vieux) { var t = de(lu); boite.appendChild(el('p', 'i-source' + (vieux ? ' a-alerte' : ''), texte(src || '') + (t ? ' · donnée ' + t : '') + (vieux ? ' (ancienne)' : ''))) }
  // un élément SVG : celui de js/graphe.js (l'espace de noms n'est écrit que là)
  function svg(nom, attrs) { var o = {}; for (var k in attrs) o[k] = String(attrs[k]); return G.svg(nom, o) }
  // un point du demi-cercle (0 : à gauche, 1 : à droite, par le haut), au rayon r
  function point(a, r) { return [(60 - r * Math.cos(Math.PI * a)).toFixed(2), (60 - r * Math.sin(Math.PI * a)).toFixed(2)] }
  function arc(a0, a1) { var x = point(a0, 48), y = point(a1, 48); return 'M ' + x[0] + ' ' + x[1] + ' A 48 48 0 0 1 ' + y[0] + ' ' + y[1] }
  // LA JAUGE DESSINÉE (disque, mémoire, charge) : un demi-cercle, la part pleine à la couleur de son état, le cran du seuil,
  // le pourcentage au milieu ; dessous son nom et ce qu'elle mesure
  function jauge(nom, pct, rouge, orange, sous) {
    var f = el('figure', 'i-jauge'), p = num(pct), c = teinte(p, rouge, orange)
    var s = svg('svg', { viewBox: [0, 0, 120, 72].join(' '), role: 'img', 'aria-label': nom + ' : ' + (p === null ? VIDE : dec(p, 1) + ' %') })
    s.appendChild(svg('path', { d: arc(0, 1), 'class': 'i-piste' }))
    if (p !== null && p > 0) s.appendChild(svg('path', { d: arc(0, Math.min(1, p / 100)), 'class': 'i-plein i-' + c }))
    var a = Math.min(1, rouge / 100), x = point(a, 38), y = point(a, 58)
    s.appendChild(svg('line', { x1: x[0], y1: x[1], x2: y[0], y2: y[1], 'class': 'i-cran' }))
    var t = svg('text', { x: 60, y: 58, 'text-anchor': 'middle', 'class': 'i-pct' + (p === null ? ' vide' : '') })
    t.textContent = p === null ? '?' : dec(p, 0) + ' %'
    s.appendChild(t); f.appendChild(s)
    var fc = el('figcaption'); fc.appendChild(el('b', '', nom)); fc.appendChild(el('span', p === null ? 'vide' : '', p === null ? VIDE : sous)); f.appendChild(fc)
    return f
  }
  // le tas d'un serveur de jeu : une barre arrondie, le plus bas de la minute plein, jusqu'au plus haut plus clair
  function barreTas(m, seuil) {
    var d = el('div', 'i-tas'), haut = el('i', 'i-tas-haut'), bas = el('i', 'i-tas-bas i-' + (m.bas_pct >= seuil ? 'orange' : 'vert'))
    haut.style.width = Math.max(0, Math.min(100, num(m.haut_pct) === null ? m.bas_pct : m.haut_pct)) + '%'
    bas.style.width = Math.max(0, Math.min(100, m.bas_pct)) + '%'
    d.appendChild(haut); d.appendChild(bas)
    return d
  }
  function carteServeur(sv, S) {
    var c = el('article', 'i-serveur'), e = ETATS_SERVEUR[sv.etat] || [texte(sv.etat), 'gris'], t = el('div', 'i-tete')
    // sans pouls depuis plus que le seuil : rouge, comme son alerte
    if (sv.etat === 'pouls_perdu' && num(sv.pouls_age_s) !== null && sv.pouls_age_s > S.absent_s) e = [e[0], 'rouge']
    t.appendChild(el('h3', '', texte(sv.nom))); t.appendChild(pastille(e[0], e[1])); c.appendChild(t)
    if (sv.cle === 'proxy') {
      var j = sv.joueurs
      if (sv.etat === 'ne_repond_pas') ligne(c, 'Ne répond plus', num(sv.ko_s) === null ? VIDE : 'depuis ' + dureeInfra(sv.ko_s), sv.dernier_ok ? 'dernière réponse ' + de(sv.dernier_ok) : '')
      ligne(c, 'Joueurs', j && num(j.n) !== null ? A.nombre(j.n) + (num(j.max) !== null ? ' sur ' + A.nombre(j.max) : '') : VIDE)
      ligne(c, 'Temps de réponse', num(sv.latence_ms) === null ? VIDE : A.nombre(sv.latence_ms) + NBSP + 'ms')
      // (dc) un texte long : sous son nom, sur toute la largeur (à côté, le nom se tassait un mot par ligne)
      if (sv.motd) ligne(c, 'Ce que lit le joueur', texte(sv.motd)).classList.add('i-long')
      ligne(c, 'Processeur, mémoire', VIDE, 'le proxy ne les publie pas')
      pied(c, sv.source, sv.lu)
      return c
    }
    var tp = sv.tps, hors = sv.etat !== 'en_ligne'
    if (hors) c.classList.add('hors')
    if (tp) {
      var bt = el('b', 'i-tps i-' + (tp.vieux || hors ? 'gris' : tp.minute < S.tps_min ? 'rouge' : 'vert'), dec(tp.minute, 1))
      ligne(c, 'TPS, la dernière minute', bt, num(tp.moyenne_15_min) === null ? '' : 'moyenne sur ' + tp.minutes_comptees + NBSP + 'min : ' + dec(tp.moyenne_15_min, 1))
      ligne(c, 'Un tick', num(tp.tick_ms) === null ? VIDE : dec(tp.tick_ms, 1) + NBSP + 'ms', num(tp.pire_tick_ms) === null ? '' : 'au pire ' + dec(tp.pire_tick_ms, 1) + NBSP + 'ms')
    } else ligne(c, 'TPS', VIDE)
    var m = sv.memoire
    if (m) {
      var mt = num(m.max_mo) === null ? dec(m.bas_pct, 0) + NBSP + '%' + (num(m.haut_pct) !== null ? ' à ' + dec(m.haut_pct, 0) + NBSP + '%' : '') : mo(m.bas_mo) + (num(m.haut_mo) !== null ? ' à ' + mo(m.haut_mo) : '') + ' sur ' + mo(m.max_mo)
      ligne(c, 'Mémoire', mt, 'le tas de Java, au plus bas puis au plus haut de la minute').appendChild(barreTas(m, S.memoire_jeu_pct))
    } else ligne(c, 'Mémoire', VIDE)
    ligne(c, 'Joueurs', sv.joueurs && num(sv.joueurs.n) !== null ? A.nombre(sv.joueurs.n) : VIDE)
    var pc = sv.processeur
    ligne(c, 'Processeur', pc && num(pc.pct) !== null ? pc.pct + NBSP + '%' : VIDE, pc ? 'la charge du processus Java, moyenne de la minute' : 'le jeu ne le publie pas encore')
    if (!hors) ligne(c, 'En marche depuis', dureeInfra(sv.depuis_s))
    else ligne(c, 'Dernier pouls', sv.pouls_lu ? quand(sv.pouls_lu) : VIDE, num(sv.pouls_age_s) === null ? '' : 'il y a ' + dureeInfra(sv.pouls_age_s))
    pied(c, 'Le pouls : res_serveur, toutes les 5' + NBSP + 's', sv.pouls_lu)
    if (tp) pied(c, 'Les mesures : tps:' + texte(sv.cle) + ', chaque minute', tp.lu, tp.vieux)
    return c
  }
  function vueInfra(d) {
    var S = d.seuils || {}, al = liste(d.alertes)
    vider(vue)
    // L'ÉTAT D'ENSEMBLE : tout va bien, ou les alertes (les rouges d'abord : l'API les range)
    var b = el('div', 'i-bandeau i-' + (!al.length ? 'vert' : al.some(function (a) { return a.niveau === 'rouge' }) ? 'rouge' : 'orange')), bt = el('div', 'i-bandeau-tete')
    bt.appendChild(el('h2', '', !al.length ? 'Tout va bien' : pluriel(al.length, 'alerte')))
    // (dc, en vrai : « 7 min » dans l'alerte, « 6 min » sur la carte) UNE heure : celle du calcul de l'API (maintenant) ; chaque âge
    // de la vue vient de la même réponse, dit comme l'API le dit (dureeInfra = dureeTexte de src/infra.js, jamais arrondi vers le haut)
    bt.appendChild(el('span', 'i-releve', 'Relevé ' + de(d.maintenant || d.lu) + ' · relu toutes les 30' + NBSP + 's'))
    b.appendChild(bt)
    if (!al.length) b.appendChild(el('p', 'i-aide', 'Aucun seuil franchi. Les seuils : un disque à plus de ' + S.disque_pct + NBSP + '%, moins de ' + S.tps_min + ' TPS, un serveur absent plus de ' + Math.round(S.absent_s / 60) + NBSP + 'min, un certificat à moins de ' + S.certificat_jours + ' jours.'))
    else {
      var ul = el('ul', 'i-alertes')
      al.forEach(function (a) {
        var li = el('li', 'i-alerte i-' + (a.niveau === 'rouge' ? 'rouge' : 'orange'))
        li.appendChild(el('i')); li.appendChild(el('span', 'i-texte', texte(a.texte)))
        if (a.source) li.appendChild(el('span', 'i-sous', texte(a.source)))
        ul.appendChild(li)
      })
      b.appendChild(ul)
    }
    vue.appendChild(b)
    // LES SERVEURS DE JEU
    var gs = el('div', 'i-section'), gg = el('div', 'i-serveurs')
    gs.appendChild(el('h2', '', 'Les serveurs de jeu'))
    liste(d.serveurs).forEach(function (sv) { gg.appendChild(carteServeur(sv, S)) })
    gs.appendChild(gg); vue.appendChild(gs)
    // (37, la 157) LES ÎLES
    vue.appendChild(sectionIles(d.iles))
    // LE VPS
    var V = d.vps || {}, vs = el('div', 'i-section'), vc = el('article', 'i-panneau')
    vs.appendChild(el('h2', '', 'Le VPS du site'))
    if (V.etat !== 'ok' && V.etat !== 'vieux') {
      vc.appendChild(el('p', 'g-vide', V.etat === 'illisible' ? 'Le relevé du VPS ne se lit pas.' : VIDE))
      vc.appendChild(el('p', 'i-aide', 'Le relevé du VPS (infra_releve.sh) s\'écrit chaque minute ; tant qu\'il n\'arrive pas, rien ne s\'affiche ici.'))
    } else {
      var vieux = V.etat === 'vieux'
      if (vieux) vc.appendChild(el('p', 'i-vieux', 'Le relevé date de ' + dureeInfra(V.age_s) + ' : ces chiffres sont anciens.'))
      var js = el('div', 'i-jauges')
      liste(V.disques).forEach(function (x) {
        var tout = num(x.utilise_o) !== null && num(x.libre_o) !== null ? x.utilise_o + x.libre_o : null
        js.appendChild(jauge('Disque ' + texte(x.point), x.pct, S.disque_pct, S.disque_pct - 15, go(x.utilise_o) + ' sur ' + go(tout) + (x.monte_sur && x.monte_sur !== x.point ? ' (le disque de ' + texte(x.monte_sur) + ')' : '')))
      })
      var vm = V.memoire, ch = V.charge
      js.appendChild(jauge('Mémoire', vm ? vm.pct : null, S.memoire_vps_pct, S.memoire_vps_pct - 15, vm ? go(vm.utilise_o) + ' sur ' + go(vm.total_o) : ''))
      js.appendChild(jauge('Processeur', ch ? ch.pct : null, 100, 75, ch ? 'charge ' + dec(ch.m1, 2) + ' sur ' + (num(ch.coeurs) === null ? '?' : ch.coeurs) + ' cœurs' : ''))
      vc.appendChild(js)
      var li2 = el('div', 'i-lignes'), ce = V.certificat, si = V.site
      ligne(li2, 'En marche depuis', dureeInfra(V.uptime_s))
      ligne(li2, 'Certificat HTTPS', ce ? pastille('jusqu\'au ' + A.date(ce.fin) + ', ' + pluriel(ce.jours, 'jour'), ce.jours < S.certificat_jours ? 'rouge' : ce.jours < S.certificat_jours * 2 ? 'orange' : 'vert') : VIDE, ce && ce.lu ? 'lu ' + de(ce.lu) : V.certificat_raison ? 'la lecture a échoué : ' + texte(V.certificat_raison) : '')
      ligne(li2, 'Dernière mise à jour du site', si && si.heure ? quand(si.heure) : VIDE, si && si.commit ? 'commit ' + texte(si.commit) : '')
      vc.appendChild(li2)
      vc.appendChild(el('h3', '', 'Les conteneurs'))
      if (V.conteneurs) {
        var uc = el('ul', 'i-conteneurs')
        liste(V.conteneurs).forEach(function (x) {
          var ec = ETATS_CONTENEUR[x.etat] || [texte(x.etat || VIDE), 'orange'], l = el('li'), bouts = []
          l.appendChild(el('b', '', texte(x.nom))); l.appendChild(pastille(ec[0], x.etat === 'running' && x.sante && x.sante !== 'healthy' ? 'orange' : ec[1]))
          if (x.etat === 'running' && x.depuis) bouts.push('depuis le ' + A.date(x.depuis, true))
          if (x.sante) bouts.push(x.sante === 'healthy' ? 'en bonne santé' : 'santé : ' + texte(x.sante))
          if (num(x.redemarrages)) bouts.push(pluriel(x.redemarrages, 'redémarrage'))
          if (bouts.length) l.appendChild(el('span', 'i-sous', bouts.join(' · ')))
          uc.appendChild(l)
        })
        vc.appendChild(uc)
      } else vc.appendChild(el('p', 'g-vide', 'Docker ne répond pas au relevé.'))
      pied(vc, V.source, V.lu, vieux)
    }
    vs.appendChild(vc); vue.appendChild(vs)
    // LA BASE ET LA 3D DES ÎLES
    var bs = el('div', 'i-deux'), B = d.base || {}, I = d.iles3d || {}, cb = el('article', 'i-panneau'), t1 = el('div', 'i-tete'), ci = el('article', 'i-panneau'), sg = B.sauvegarde
    t1.appendChild(el('h2', '', 'La base du jeu')); t1.appendChild(pastille(B.etat === 'repond' ? 'Répond' : 'Ne répond pas', B.etat === 'repond' ? 'vert' : 'rouge')); cb.appendChild(t1)
    if (B.etat === 'repond') ligne(cb, 'Temps de réponse', num(B.latence_ms) === null ? VIDE : B.latence_ms < 1 ? 'moins de 1' + NBSP + 'ms' : A.nombre(B.latence_ms) + NBSP + 'ms')
    ligne(cb, 'La copie de la nuit', sg ? quand(sg.quand) : VIDE, sg ? [num(sg.lignes) === null ? '' : A.nombre(sg.lignes) + ' lignes', num(sg.octets) === null ? '' : go(sg.octets) + ' compressés'].filter(Boolean).join(' · ') : 'le jeu ne la publie pas encore')
    ligne(cb, 'Sa taille', VIDE, 'le jeu ne la publie pas encore')
    pied(cb, B.source, B.lu)
    ci.appendChild(el('h2', '', 'La 3D des îles'))
    ligne(ci, 'Le dernier rendu du copieur', I.rendu ? quand(I.rendu) : VIDE)
    ligne(ci, 'Le fichier le plus récent', I.dernier_fichier ? quand(I.dernier_fichier) : VIDE)
    pied(ci, I.source)
    bs.appendChild(cb); bs.appendChild(ci); vue.appendChild(bs)
    relireInfra(etat.numero)
  }
  // (37, la 157 ; le propriétaire : « les chiffres des îles, justes ») LES ÎLES : ce que le serveur des îles publie (la vitrine
  // « iles:etat », iles_etat_site.js), tel que l'API le rend (d.iles) ; null : « pas encore de données »
  // LA JAUGE DE LA RÉSERVE : les îles d'avance prêtes sur l'objectif de l'ouverture ; rouge sous l'alerte, orange sous le minimum
  // (les seuils d'ab_iles_reserve_table.js, rendus par l'API), un cran à chacun
  function jaugeReserve(I) {
    var R = I.seuils || {}, n = num(I.pretes), haut = Math.max(1, num(R.ouverture) || 0, n || 0)
    var c = n === null ? 'gris' : num(R.alerte) !== null && n < R.alerte ? 'rouge' : num(R.minimum) !== null && n < R.minimum ? 'orange' : 'vert'
    var f = el('figure', 'i-jauge i-reserve')
    var s = svg('svg', { viewBox: [0, 0, 120, 72].join(' '), role: 'img', 'aria-label': 'Îles d\'avance : ' + (n === null ? VIDE : A.nombre(n) + ' prêtes') })
    s.appendChild(svg('path', { d: arc(0, 1), 'class': 'i-piste' }))
    if (n !== null && n > 0) s.appendChild(svg('path', { d: arc(0, Math.min(1, n / haut)), 'class': 'i-plein i-' + c }))
    ;[R.alerte, R.minimum].forEach(function (v) {
      if (num(v) === null || v <= 0) return
      var a = Math.min(1, v / haut), x = point(a, 38), y = point(a, 58)
      s.appendChild(svg('line', { x1: x[0], y1: x[1], x2: y[0], y2: y[1], 'class': 'i-cran' }))
    })
    var t = svg('text', { x: 60, y: 58, 'text-anchor': 'middle', 'class': 'i-pct' + (n === null ? ' vide' : '') })
    t.textContent = n === null ? '?' : A.nombre(n)
    s.appendChild(t); f.appendChild(s)
    var fc = el('figcaption'); fc.appendChild(el('b', '', 'Îles d\'avance prêtes'))
    fc.appendChild(el('span', '', I.coupe ? 'la réserve est coupée' : 'minimum ' + (num(R.minimum) === null ? '?' : A.nombre(R.minimum)) + ' · alerte sous ' + (num(R.alerte) === null ? '?' : A.nombre(R.alerte)) + ' · ouverture ' + (num(R.ouverture) === null ? '?' : A.nombre(R.ouverture))))
    f.appendChild(fc)
    return f
  }
  // une liste de cases : « 3 » et dessous les premières (« 2,2 · 4,0 »)
  function places(boite, nom, x, vide, aide, couleur) {
    if (!x) { ligne(boite, nom, VIDE); return }
    var v = x.n === 0 ? el('b', '', vide) : couleur ? pastille(A.nombre(x.n), couleur) : el('b', '', A.nombre(x.n))
    var sous = x.n > 0 ? liste(x.cases).join(' · ') + (x.n > liste(x.cases).length ? ' · …' : '') + (aide ? ' (' + aide + ')' : '') : ''
    ligne(boite, nom, v, sous)
  }
  function sectionIles(I) {
    var sc = el('div', 'i-section'), p = el('article', 'i-panneau')
    sc.appendChild(el('h2', '', 'Les îles et leur réserve'))
    if (!I) {
      p.appendChild(el('p', 'g-vide', VIDE))
      p.appendChild(el('p', 'i-aide', 'Le serveur des îles publie son état chaque minute (iles_etat_site.js) ; tant qu\'il n\'arrive pas, rien ne s\'affiche ici.'))
      sc.appendChild(p)
      return sc
    }
    if (I.vieux) p.appendChild(el('p', 'i-vieux', 'L\'état des îles date de ' + dureeInfra(I.age_s) + ' : ces chiffres sont anciens.'))
    var g = el('div', 'i-iles'), js = el('div', 'i-jauges'), li = el('div', 'i-lignes'), dp = I.derniere
    js.appendChild(jaugeReserve(I))
    g.appendChild(js)
    ligne(li, 'Îles prises', num(I.prises) === null ? VIDE : A.nombre(I.prises), 'une île par joueur, chacune avec son hôte')
    ligne(li, 'En pose', I.en_pose ? 'la case ' + I.en_pose : 'aucune', I.en_pose ? 'une île d\'avance se pose en ce moment' : '')
    ligne(li, 'La demande de la console', num(I.demande) === null ? VIDE : I.demande > 0 ? 'jusqu\'à ' + A.nombre(I.demande) : 'aucune', 'ilesreserve remplir')
    ligne(li, 'La prochaine île donnée', I.prochaine ? 'la case ' + I.prochaine : VIDE, I.prochaine ? 'au prochain joueur neuf' : '')
    ligne(li, 'La dernière pose', dp ? quand(dp.quand) : 'aucune depuis le démarrage', dp && num(dp.duree_s) !== null ? 'en ' + dec(dp.duree_s, 1) + NBSP + 's' : '')
    ligne(li, 'Joueurs qui attendent leur île', num(I.file) === null ? VIDE : A.nombre(I.file))
    places(li, 'Places libres', I.libres, 'aucune', 'redonnées d\'abord')
    places(li, 'Effacées, pas encore rendues', I.effacees, 'aucune', 'console : ileslibres rendre')
    places(li, 'Places orphelines', I.orphelines, 'aucune', 'console : ileslibres', 'orange')
    g.appendChild(li)
    p.appendChild(g)
    pied(p, I.source, I.lu, I.vieux)
    sc.appendChild(p)
    return sc
  }
  // la relecture : dans 30 s, si la vue est toujours celle-ci ; l'onglet caché, elle attend son retour (aucune demande pour rien)
  function relireInfra(n) {
    etat.minuteur = setTimeout(function () {
      if (n !== etat.numero || etat.vue !== 'infra') return
      if (document.hidden) { relireInfra(n); return }
      A.admin('infra').then(function (r) {
        if (n !== etat.numero || etat.vue !== 'infra') return
        if (r.statut === 200 && r.corps && typeof r.corps === 'object') vueInfra(r.corps)
        else relireInfra(n)
      })
    }, INFRA_RELIRE_MS)
  }

  // ---------- un joueur : la recherche, puis sa fiche complète ----------
  // ---------- (dc, 30/10) gérer le serveur, maintenant : chaque bloc avec sa source et son heure ; une donnée absente : « pas
  // encore de données », jamais 0 ni une liste vide qui aurait l'air vraie ----------
  // un pseudo cliquable : sa fiche dans « Un joueur »
  function lienJoueur(p) {
    var b = el('button', 'a-lien-joueur', texte(p)); b.type = 'button'
    b.addEventListener('click', function () { etat.ouvrir = String(p); if (location.hash === '#joueurs') montrer(); else location.hash = '#joueurs' })
    return b
  }
  // une liste de lignes : [quand, qui, quoi, combien] ; vide : sa phrase
  function lignesListe(boite, l, rien) {
    // vide : rien de plus (la phrase sous le titre le dit déjà)
    if (!l.length) { void rien; return }
    // une ligne : le pseudo et son chiffre en haut, le détail dessous, l'heure en petit (lisible à 390 comme à 1280)
    var ul = el('ul', 'a-liste a-liste-k')
    l.forEach(function (x) {
      var li = el('li'), noms = ['k-quand', 'k-qui', 'k-quoi', 'k-combien']
      x.forEach(function (c, i) { var e = typeof c === 'string' ? el('span', '', c) : c; e.classList.add(noms[i]); if (typeof c !== 'string' || c) li.appendChild(e) })
      ul.appendChild(li)
    })
    boite.appendChild(ul)
  }
  function valeurDe(b) { return b && typeof b === 'object' ? b.valeur : null }
  function vueMaintenant(d) {
    var g = grille()
    var en = valeurDe(d.en_ligne), b1 = carte('Qui est en ligne', en ? (en.total ? pluriel(en.total, 'joueur') + ' en ce moment.' : 'Personne en ce moment.') : VIDE, d, 'jeu', false, g)
    if (en) {
      if (en.par_lieu && en.par_lieu.length) b1.appendChild(el('p', 'a-aide', liste(en.par_lieu).map(function (x) { return texte(x.nom) + ' : ' + A.nombre(x.n) }).join(' · ')))
      lignesListe(b1, liste(en.joueurs).map(function (j) { return [el('span', 'quand', j.depuis ? 'vu ' + quand(j.depuis) : ''), lienJoueur(j.pseudo), texte(j.lieu || 'ailleurs'), ''] }), 'Personne sur le réseau.')
    }
    var nv = valeurDe(d.nouveaux_aujourdhui), b2 = carte('Les comptes créés aujourd\'hui', nv ? (nv.valeur ? pluriel(nv.valeur, 'compte neuf', 'comptes neufs') + ' (/register).' : 'Aucun compte neuf aujourd\'hui.') : VIDE, d, 'jeu', false, g)
    if (nv) lignesListe(b2, liste(nv.joueurs).map(function (j) { return [el('span', 'quand', quand(j.quand)), lienJoueur(j.pseudo), '', ''] }), 'Personne encore aujourd\'hui.')
    var vt = valeurDe(d.dernieres_ventes), b3 = carte('Les dernières ventes (Tebex)', vt ? (vt.length ? '' : 'Aucune vente pour l\'instant.') : (source(d, 'tebex').absente ? '' : VIDE), d, 'tebex', true)
    if (vt) lignesListe(b3, vt.map(function (v) { return [el('span', 'quand', A.date(v.quand)), v.pseudo ? lienJoueur(v.pseudo) : '', texte(v.produit || 'un pack') + (v.etat === 'rembourse' ? ' (remboursé)' : (v.etat === 'litige' ? ' (litige)' : '')), num(v.prix_centimes) === null ? '' : euros(v.prix_centimes)] }), 'Aucune vente pour l\'instant.')
  }
  function vueModeration(d) {
    var g = grille()
    var sc = valeurDe(d.sanctions_en_cours), b1 = carte('Les sanctions en cours', sc ? (sc.length ? pluriel(sc.length, 'sanction') + ' en cours.' : 'Aucune sanction en cours.') : VIDE, d, 'jeu', false, g)
    if (sc) lignesListe(b1, sc.map(function (s) { return [el('span', 'quand', A.date(s.debut)), lienJoueur(s.pseudo), texte(s.type_nom || s.type) + (s.raison ? ' : ' + texte(s.raison) : '') + (s.par ? ' (par ' + texte(s.par) + ')' : ''), s.definitive ? 'définitif' : 'fin ' + quand(s.fin)] }), 'Personne n\'est sanctionné en ce moment.')
    var sg = valeurDe(d.signalements_ouverts), b2 = carte('Les signalements à traiter', sg ? (sg.length ? pluriel(sg.length, 'signalement ouvert', 'signalements ouverts') + '.' : 'Aucun signalement ouvert.') : VIDE, d, 'jeu', false, g)
    if (sg) lignesListe(b2, sg.map(function (s) { return [el('span', 'quand', quand(s.dernier)), lienJoueur(s.contre), texte(s.motif || '') + (s.message ? ' : « ' + texte(s.message) + ' »' : ''), num(s.signaleurs) === null ? '' : pluriel(s.signaleurs, 'signaleur')] }), 'Rien à traiter.')
  }
  function vueEconomie(d) {
    var g = grille()
    // (dc, 30/10 ; la tête : « un vrai tableau ») les plus riches : rang, tête et pseudo, fortune, jetons, le dernier passage
    var pr = valeurDe(d.plus_riches), b1 = carte('Les plus riches', pr && !pr.length ? 'Personne encore.' : pr ? 'La fortune (ce qu\'ils possèdent, au prix du jeu) et les jetons, à leur dernier passage.' : VIDE, d, 'jeu', false, g)
    if (pr && pr.length) {
      var t = el('table', 'a-riches'), th = el('thead'), tr = el('tr'), tb = el('tbody')
      ;[['', 'rg'], ['Joueur', ''], ['Fortune', 'n'], ['Jetons', 'n']].forEach(function (x) { var c = el('th', x[1], x[0]); c.setAttribute('scope', 'col'); tr.appendChild(c) })
      th.appendChild(tr); t.appendChild(th)
      pr.forEach(function (x, i) {
        var r = el('tr'), q = el('td', 'qui-td'), qui = el('div', 'qui'), tete = el('span', 'tete-pixel'), nom = el('div')
        if (P && P.tete) P.tete(tete, '/api/peau/' + x.pseudo, 24)
        nom.appendChild(lienJoueur(x.pseudo)); if (x.lu) nom.appendChild(el('span', 'vu', 'vu ' + quand(x.lu)))
        qui.appendChild(tete); qui.appendChild(nom); q.appendChild(qui)
        r.appendChild(el('td', 'rg', String(i + 1))); r.appendChild(q)
        r.appendChild(el('td', 'n fortune', A.nombre(x.fortune)))
        r.appendChild(el('td', 'n jetons', num(x.jetons) === null ? '' : A.nombre(x.jetons) + NBSP + 'jetons'))
        tb.appendChild(r)
      })
      t.appendChild(tb); b1.appendChild(t)
    }
    // les hausses : relevées chaque nuit par l'API ; avant le premier relevé, QUAND elles arrivent (jamais un cadre vide)
    var h = d.hausses_jetons_7_jours || {}, hv = h.valeur, aide
    if (hv) aide = 'Les hausses de jetons des 7 derniers jours, relevées chaque nuit (une baisse n\'est pas relevée) ; une hausse énorme d\'un coup mérite un regard.' + (!hv.length ? ' Aucune hausse sur ces 7 jours.' : '')
    else if (h.depuis) aide = 'Le premier relevé est fait (' + quand(h.depuis) + ') ; les hausses arrivent après le prochain, la nuit suivante à 3 h 30.'
    else aide = 'Le premier relevé se fait cette nuit, à 3 h 30 ; les hausses arrivent après le suivant, la nuit d\'après, puis sur 7 jours glissants.'
    var b2 = carte('Les jetons qui montent le plus vite', aide, d, 'jeu', false, g)
    if (hv) lignesListe(b2, hv.map(function (x) { return ['', lienJoueur(x.pseudo), '', '+' + A.nombre(x.jetons) + NBSP + 'jetons'] }), '')
    // (dc, 30/10, la 156) le journal des jetons du jeu : créés, détruits, par source, sur 7 jours ; les transferts entre joueurs
    // à part (ni créés ni détruits : leur écart, ce que les taxes ont détruit)
    var jc = valeurDe(d.jetons_crees_detruits)
    var b3 = carte('Les jetons créés et détruits', jc ? 'Sur 7 jours, du ' + A.date(jc.du) + ' au ' + A.date(jc.au) + ', tout le réseau : ce qui entre dans les soldes et ce qui en sort.' : 'Le jeu publie ce journal depuis sa mise à jour de la 156 : les premiers chiffres arrivent dans la minute qui suit un jeton gagné ou dépensé.', d, 'jeu', true)
    if (jc) {
      var ecart = num(jc.solde) || 0
      b3.appendChild(el('p', 'a-eco-bilan', A.nombre(jc.crees) + NBSP + 'jetons créés · ' + A.nombre(jc.detruits) + NBSP + 'détruits · ' + (ecart >= 0 ? '+' : '-') + A.nombre(Math.abs(ecart)) + NBSP + (ecart >= 0 ? 'de plus en circulation' : 'de moins en circulation')))
      if (num(jc.transferts)) b3.appendChild(el('p', 'a-aide', 'Entre joueurs (/pay, /echange, l\'hôtel des ventes, les paris, la loterie) : ' + A.nombre(jc.transferts) + NBSP + 'jetons ont changé de main ; leurs taxes en ont détruit ' + A.nombre(jc.detruits_par_transferts) + '.'))
      var deux = el('div', 'a-eco-deux')
      var cs = el('div'), cp = el('div')
      cs.appendChild(el('h3', '', 'D\'où ils viennent')); cp.appendChild(el('h3', '', 'Où ils partent'))
      lignesListe(cs, liste(jc.sources).map(function (x) { return ['', el('span', '', texte(x.nom)), '', '+' + A.nombre(x.jetons)] }), '')
      lignesListe(cp, liste(jc.puits).map(function (x) { return ['', el('span', '', texte(x.nom)), '', '-' + A.nombre(x.jetons)] }), '')
      if (!liste(jc.sources).length) cs.appendChild(el('p', 'a-aide', 'Aucun jeton créé sur ces 7 jours.'))
      if (!liste(jc.puits).length) cp.appendChild(el('p', 'a-aide', 'Aucun jeton détruit sur ces 7 jours.'))
      deux.appendChild(cs); deux.appendChild(cp); b3.appendChild(deux)
    }
  }

  function vueJoueurs() {
    var boite = el('div', 'a-cherche'), lab = el('label', 'lu', 'Chercher un joueur'), champ = el('input'), suggestions = el('ul', 'a-suggestions'), fiche = el('div', 'a-fiche')
    champ.type = 'search'; champ.id = 'admin-cherche'; champ.placeholder = 'Le début d\'un pseudo'; champ.autocomplete = 'off'; champ.spellcheck = false; champ.maxLength = 16
    lab.htmlFor = 'admin-cherche'
    boite.appendChild(lab); boite.appendChild(champ); boite.appendChild(suggestions)
    vue.appendChild(boite); vue.appendChild(fiche)
    var minuteur = 0, trouves = []
    champ.addEventListener('input', function () {
      clearTimeout(minuteur)
      var q = champ.value.trim()
      minuteur = setTimeout(function () {
        if (q.length < 2) { vider(suggestions); trouves = []; return }
        A.adminRecherche(q).then(function (r) {
          if (r.statut === 401 && r.corps && r.corps.erreur === 'reconnexion') return reconnexion()
          vider(suggestions); trouves = r.statut === 200 ? liste(r.corps.joueurs) : []
          trouves.forEach(function (j) { var li = el('li'), b = el('button', '', texte(j.pseudo)); b.type = 'button'; if (j.en_ligne) b.appendChild(el('span', 'en-ligne', 'en ligne')); b.addEventListener('click', function () { ouvrir(texte(j.pseudo)) }); li.appendChild(b); suggestions.appendChild(li) })
          if (!trouves.length) suggestions.appendChild(el('li', 'rien', 'Aucun pseudo ne commence ainsi.'))
        })
      }, 180)
    })
    champ.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); var q = champ.value.trim(); if (trouves.length) ouvrir(texte(trouves[0].pseudo)); else if (A.PSEUDO.test(q)) ouvrir(q) } })
    function ouvrir(pseudo) {
      vider(suggestions); champ.value = pseudo; vider(fiche); fiche.appendChild(el('p', 'a-note', 'On ouvre la fiche...'))
      A.adminJoueur(pseudo).then(function (r) {
        if (r.statut === 401 && r.corps && r.corps.erreur === 'reconnexion') return reconnexion()
        vider(fiche)
        if (r.statut !== 200) { fiche.appendChild(el('p', 'a-panne', r.statut === 404 ? 'Aucun joueur à ce pseudo.' : (r.statut === 403 ? 'L\'API refuse : réservé à l\'équipe.' : 'La fiche ne s\'ouvre pas pour l\'instant.'))); return }
        ficheAdmin(fiche, r.corps)
      })
    }
    // (dc, 30/10) venu d'un pseudo cliqué ailleurs dans l'espace : sa fiche, tout de suite
    if (etat.ouvrir) { var p = etat.ouvrir; etat.ouvrir = null; ouvrir(p); return }
    champ.focus()
  }
  // une durée : « 30 min », « 2 h », « 2 h 30 », « 14 jours »
  function duree(ms) {
    var m = Math.round((num(ms) || 0) / 60000)
    if (m < 60) return m + NBSP + 'min'
    var h = Math.floor(m / 60), r = m % 60
    if (h < 48) return h + NBSP + 'h' + (r ? NBSP + (r < 10 ? '0' : '') + r : '')
    return Math.round(h / 24) + NBSP + 'jours'
  }
  function reste(iso) { var ms = Date.parse(iso) - Date.now(); return ms > 0 ? 'encore ' + duree(ms) : '' }
  function ficheAdmin(boite, f) {
    var tete = el('div', 'a-fiche-tete'), t = P.tete(el('span', 'cl-tete'), f.peau, 64), nomBloc = el('div')
    t.setAttribute('aria-hidden', 'true'); tete.appendChild(t)
    nomBloc.appendChild(el('h2', '', texte(f.pseudo)))
    var l = []
    if (f.grade && f.grade.nom) l.push(texte(f.grade.nom))
    if (f.equipe && f.equipe.nom) l.push(texte(f.equipe.nom))
    if (f.niveau && num(f.niveau.n) !== null) l.push('niveau ' + f.niveau.n)
    l.push(f.en_ligne ? 'en ligne' + (f.lieu ? ' · ' + texte(f.lieu) : '') : 'vu ' + A.ilYa(f.vu))
    nomBloc.appendChild(el('p', 'a-aide', l.join(' · ')))
    tete.appendChild(nomBloc); boite.appendChild(tete)
    var ad = f.admin || {}, pv = f.prive || {}, cas = ad.casier || {}, sanctions = liste(cas.sanctions)
    // CE QUI EST EN COURS, EN HAUT, bien visible
    var enCours = sanctions.filter(function (s) { return s.en_cours })
    if (enCours.length) {
      var ec = el('div', 'a-en-cours')
      ec.appendChild(el('h3', '', enCours.length > 1 ? 'En cours : ' + enCours.length + ' sanctions' : 'En cours'))
      var ulE = el('ul')
      enCours.forEach(function (s) { ulE.appendChild(el('li', '', texte(s.nom || s.type) + (s.fin ? ' jusqu\'au ' + A.date(s.fin, true) + (reste(s.fin) ? ' (' + reste(s.fin) + ')' : '') : ', définitif') + ' · motif : ' + texte(s.motif) + ' · par ' + texte(s.par) + (s.par_rang_nom ? ' (' + texte(s.par_rang_nom) + ')' : ''))) })
      ec.appendChild(ulE); boite.appendChild(ec)
    }
    var g = el('div', 'a-grille trois')
    function bloc(titreBloc, large) { var c = el('div', 'a-carte' + (large ? ' large' : '')); c.appendChild(el('h3', '', titreBloc)); return c }
    function lignes(c, paires) { var ul = el('ul', 'fiche-grille'); paires.forEach(function (p) { var li = el('li'); li.appendChild(el('span', '', p[0])); li.appendChild(el('b', '', p[1])); ul.appendChild(li) }); c.appendChild(ul) }
    var b1 = bloc('Le compte'); g.appendChild(b1)
    // (dc, 30/10) sa place au classement général : celle de son dernier passage (general), sinon celle du classement publié
    // (le thème « general » de sa fiche, comme sa page publique) : jamais « pas classé » pour un joueur qui y est
    var tg = liste(f.themes).filter(function (t) { return t && t.cle === 'general' && num(t.rang) }) [0] || null
    lignes(b1, [['Identifiant (uuid)', texte(ad.uuid)], ['Inscrit', ad.inscrit ? A.date(ad.inscrit) : (ad.inscrit_avant ? 'avant le ' + A.date(ad.inscrit_avant) : 'inconnu')], ['Où', ad.lieu ? texte(ad.lieu) : 'hors ligne'], ['Temps de jeu', num(f.temps_de_jeu_min) === null ? VIDE : A.nombre(Math.floor(f.temps_de_jeu_min / 60)) + NBSP + 'h']])
    var b2 = bloc('L\'argent'), ag = ad.argent || {}; g.appendChild(b2)
    // (5c, 30/10) la fortune et le patrimoine (le classement du jeu), puis les hausses de jetons par jour (relevées chaque nuit)
    lignes(b2, [['Jetons', nb(pv.jetons)], ['Fortune', nb(ag.fortune)], ['Patrimoine', nb(ag.patrimoine)], ['Crédits', nb(pv.credits)],
      ['Classement général', f.general && f.general.rang ? A.rang(f.general.rang) + ' (' + A.nombre(f.general.points) + ' points)' : (tg ? A.rang(tg.rang) + ' (' + texte(tg.texte) + ')' : (f.hors_classement ? 'hors classement' : 'pas classé'))]])
    hausses(b2, ag)
    var ile = bloc('L\'île'), ilef = f.ile || {}, ilea = ad.ile || {}; g.appendChild(ile)
    lignes(ile, [['Nom', texte(ilef.nom)], ['Case', num(ilea.i) !== null ? ilea.i + ', ' + ilea.j : (num(ilef.i) !== null ? ilef.i + ', ' + ilef.j : 'pas encore de données')], ['Beauté', nb(ilef.beaute) + ' points · ' + (num(ilef.etoiles) === null ? 'pas encore d\'étoile' : String(Math.round(num(ilef.etoiles) * 10) / 10).replace('.', ',') + NBSP + (num(ilef.etoiles) >= 2 ? 'étoiles' : 'étoile'))]])
    if (liste(ilea.membres).length) ile.appendChild(el('p', 'a-aide', 'Ses membres : ' + liste(ilea.membres).map(function (m) { return texte(m.pseudo) }).join(', ')))
    var achats = bloc('Les achats (Tebex)'), ula = el('ul', 'a-liste'); g.appendChild(achats)
    liste(pv.achats).forEach(function (x) { var li = el('li'); li.appendChild(el('span', 'quand', A.date(x.quand))); li.appendChild(el('span', '', texte(x.produit))); li.appendChild(el('span', 'prix', x.etat === 'rembourse' ? 'remboursé' : euros(x.prix_centimes))); ula.appendChild(li) })
    if (!ula.children.length) ula.appendChild(el('li', 'rien', 'Aucun achat.'))
    achats.appendChild(ula)
    var dep = bloc('Les dépenses en crédits'), uld = el('ul', 'a-liste'); g.appendChild(dep)
    liste(pv.depenses_credits).slice(0, 10).forEach(function (x) { var li = el('li'); li.appendChild(el('span', 'quand', A.date(x.quand))); li.appendChild(el('span', '', (x.par_equipe ? 'Retiré par l\'équipe : ' : '') + texte(x.article))); li.appendChild(el('span', 'prix', nb(x.credits) + NBSP + 'crédits')); uld.appendChild(li) })
    if (!uld.children.length) uld.appendChild(el('li', 'rien', 'Aucune dépense.'))
    dep.appendChild(uld)
    boite.appendChild(g)
    // (5c, 30/10) SES CONNEXIONS : la grille des 30 jours par heure, ses sessions
    if (ad.connexions) boite.appendChild(blocConnexions(ad.connexions, f))
    // LE CASIER ENTIER : le résumé, chaque sanction (du plus récent au plus ancien), les notes, les signalements contre lui
    // et ceux qu'il a faits, avec leur suite
    var cb = bloc('Le casier', true); cb.classList.add('coins-or', 'a-casier')
    var r = cas.resume || {}, mots = []
    ;[['bannissements', 'bannissement'], ['mutes', 'mute'], ['gels', 'gel'], ['avertissements', 'avertissement'], ['expulsions', 'expulsion']].forEach(function (x) { if (num(r[x[0]])) mots.push(pluriel(r[x[0]], x[1])) })
    cb.appendChild(el('p', 'a-aide', (mots.length ? mots.join(', ') : 'Aucune sanction') + (num(r.sur_30_jours) ? ' (' + A.nombre(r.sur_30_jours) + ' sur les 30 derniers jours)' : '') + ' · ' + pluriel(num(r.signalements_recus) || 0, 'signalement reçu', 'signalements reçus') + ' · ' + pluriel(num(r.signalements_faits) || 0, 'signalement fait', 'signalements faits') + '.'))
    var parId = {}
    sanctions.forEach(function (s) { parId[s.id] = s })
    cb.appendChild(el('h4', '', 'Les sanctions'))
    var uls = el('ul', 'a-histoire')
    sanctions.forEach(function (s) {
      var li = el('li', s.en_cours ? 'en-cours' : ''), haut = el('p', 'a-histoire-haut')
      haut.appendChild(el('span', 'quand', A.date(s.debut, true)))
      haut.appendChild(el('b', 'a-sorte s-' + texte(s.type).toLowerCase(), texte(s.nom || s.type)))
      haut.appendChild(el('span', 'a-motif', texte(s.motif) || 'sans motif'))
      li.appendChild(haut)
      var d = []
      if (['BAN', 'MUET', 'GEL'].indexOf(s.type) >= 0) d.push(s.fin ? 'durée ' + duree(s.duree_ms || (Date.parse(s.fin) - Date.parse(s.debut))) + ', jusqu\'au ' + A.date(s.fin, true) : 'définitif')
      d.push('par ' + texte(s.par) + (s.par_rang_nom ? ' (' + texte(s.par_rang_nom) + ')' : '') + (s.depuis_discord ? ', depuis le Discord' : ''))
      if (s.leve) d.push('levé le ' + A.date(s.leve, true) + (s.leve_par ? ' par ' + texte(s.leve_par) : '') + (s.leve_par_erreur ? ' (une erreur)' : ''))
      else if (s.en_cours) d.push('EN COURS' + (s.fin && reste(s.fin) ? ', ' + reste(s.fin) : ''))
      else if (s.fin) d.push('fini')
      if (s.palier && num(s.palier.palier) !== null) d.push('palier ' + s.palier.palier + ', calculé ' + (s.palier.calcule_ms ? duree(s.palier.calcule_ms) : 'définitif') + (s.palier.pose_ms !== s.palier.calcule_ms ? ', posé ' + (s.palier.pose_ms ? duree(s.palier.pose_ms) : 'définitif') : ''))
      li.appendChild(el('p', 'a-histoire-bas', d.join(' · ')))
      uls.appendChild(li)
    })
    if (!uls.children.length) uls.appendChild(el('li', 'rien', 'Aucune sanction.'))
    cb.appendChild(uls)
    cb.appendChild(el('h4', '', 'Les notes de l\'équipe'))
    var uln = el('ul', 'a-liste')
    liste(cas.notes).forEach(function (n) { var li = el('li'); li.appendChild(el('span', 'quand', A.date(n.quand))); li.appendChild(el('span', '', texte(n.texte))); li.appendChild(el('span', 'prix', texte(n.par))); uln.appendChild(li) })
    if (!uln.children.length) uln.appendChild(el('li', 'rien', 'Aucune note.'))
    cb.appendChild(uln)
    function signalements(titreS, l, faits) {
      cb.appendChild(el('h4', '', titreS))
      var ul = el('ul', 'a-histoire')
      liste(l).forEach(function (s) {
        var li = el('li'), haut = el('p', 'a-histoire-haut'), bas = []
        haut.appendChild(el('span', 'quand', A.date(s.quand, true)))
        if (faits && s.contre) haut.appendChild(el('b', '', 'contre ' + texte(s.contre)))
        haut.appendChild(el('span', 'a-motif', s.source === 'casier' ? texte(s.texte) : texte(s.motif) + (s.message ? ' : « ' + texte(s.message) + ' »' + (s.prive ? ' (un message privé)' : '') : '')))
        li.appendChild(haut)
        if (s.source === 'casier') bas.push(faits ? 'au casier' : 'signalé par ' + texte(s.par))
        else {
          if (!faits && liste(s.signaleurs).length) bas.push('signalé par ' + liste(s.signaleurs).map(texte).join(', '))
          bas.push(texte(s.etat_nom || s.etat))
          if (s.clos) bas.push('clos le ' + A.date(s.clos, true) + (s.clos_par ? ' par ' + texte(s.clos_par) : '') + (s.clos_depuis === 'DISCORD' ? ', depuis le Discord' : ''))
          if (s.sanction_id && parId[s.sanction_id]) bas.push('sanction : ' + texte(parId[s.sanction_id].nom) + ' du ' + A.date(parId[s.sanction_id].debut))
        }
        li.appendChild(el('p', 'a-histoire-bas', bas.join(' · ')))
        ul.appendChild(li)
      })
      if (!ul.children.length) ul.appendChild(el('li', 'rien', faits ? 'Aucun signalement fait.' : 'Aucun signalement.'))
      cb.appendChild(ul)
    }
    signalements('Les signalements contre lui', cas.signalements_recus, false)
    signalements('Les signalements qu\'il a faits', cas.signalements_faits, true)
    boite.appendChild(cb)
  }

  // ---------- (5c, 30/10) SES CONNEXIONS ET SES HAUSSES ----------
  // la couleur d'un serveur (les variables du kit) ; un serveur inconnu : le bleu de la mer
  var COULEURS_SERVEURS = { iles: 'var(--vert-k)', spawn: 'var(--or-k)', boss: 'var(--rose)', planete: 'var(--violet-k)' }
  function couleurServeur(k) { return COULEURS_SERVEURS[k] || '#8FE3FF' }
  var JOURS_COURTS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']
  function jourCourt(d) { var p = String(d).split('-'), t = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); return JOURS_COURTS[t.getUTCDay()] + NBSP + p[2] + '/' + p[1] }
  function heureMin(iso) { var t = new Date(iso); return isNaN(t) ? '' : t.toLocaleString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(' ', ' à ') }
  function heuresMinutes(m) { m = num(m) || 0; var h = Math.floor(m / 60), r = m % 60; return h ? h + NBSP + 'h' + (r ? NBSP + (r < 10 ? '0' : '') + r : '') : r + NBSP + 'min' }
  function blocConnexions(c, f) {
    var b = el('div', 'a-carte large a-connexions')
    b.appendChild(el('h3', '', 'Ses connexions'))
    var d = c.derniere
    var haut = el('p', 'a-aide')
    haut.textContent = (d ? (d.en_cours ? 'En jeu en ce moment (' + texte(d.nom) + ')' : 'Dernière connexion : ' + heureMin(d.quand) + ' (' + texte(d.nom) + ', ' + A.ilYa(d.quand) + ')') : 'Aucune connexion relevée') +
      (c.depuis ? ' · relevé chaque minute par l\'API depuis le ' + heureMin(c.depuis) : ' · pas encore de relevé')
    b.appendChild(haut)
    // la légende : ses serveurs, la couleur de chacun, ses heures sur 30 jours
    var leg = el('ul', 'a-legende')
    liste(c.par_serveur).forEach(function (x) { var li = el('li'), pt = el('span', 'a-pastille'); pt.style.background = couleurServeur(x.cle); li.appendChild(pt); li.appendChild(el('span', '', texte(x.nom) + ' · ' + heuresMinutes(x.minutes))); leg.appendChild(li) })
    var lp = el('li', 'pas-releve'), pp = el('span', 'a-pastille vide'); lp.appendChild(pp); lp.appendChild(el('span', '', 'pas encore relevé')); leg.appendChild(lp)
    b.appendChild(leg)
    // LA GRILLE : une ligne par jour (le plus récent en haut), 24 heures ; une case pleine à la mesure de ses minutes
    var gr = el('div', 'a-grille-heures'), jours = liste(c.jours).slice().reverse(), joues = 0
    gr.setAttribute('role', 'img')
    var tete = el('div', 'a-gh-ligne a-gh-tete'); tete.appendChild(el('span', 'a-gh-jour', ''))
    for (var h = 0; h < 24; h++) tete.appendChild(el('span', 'a-gh-h', h % 3 === 0 ? String(h) : ''))
    tete.appendChild(el('span', 'a-gh-total', 'total'))
    gr.appendChild(tete)
    jours.forEach(function (j) {
      var ligne = el('div', 'a-gh-ligne')
      ligne.appendChild(el('span', 'a-gh-jour', jourCourt(j.date)))
      liste(j.heures).forEach(function (x, hh) {
        var cse = el('span', 'a-gh-case')
        if (x === null) { cse.classList.add('vide'); cse.title = jourCourt(j.date) + ', ' + hh + NBSP + 'h : pas encore relevé' }
        else if (num(x.minutes) > 0) {
          cse.style.background = couleurServeur(x.serveur)
          cse.style.opacity = String(0.35 + 0.65 * Math.min(1, x.minutes / 60))
          cse.title = jourCourt(j.date) + ', ' + hh + NBSP + 'h : ' + x.minutes + NBSP + 'min' + (c.serveurs && c.serveurs[x.serveur] ? ' (' + texte(c.serveurs[x.serveur]) + ')' : '')
        } else cse.title = jourCourt(j.date) + ', ' + hh + NBSP + 'h : pas en jeu'
        ligne.appendChild(cse)
      })
      if (num(j.minutes) > 0) joues++
      ligne.appendChild(el('span', 'a-gh-total', j.minutes === null ? '' : (num(j.minutes) ? heuresMinutes(j.minutes) : '-')))
      gr.appendChild(ligne)
    })
    gr.setAttribute('aria-label', 'Ses connexions, heure par heure, sur 30 jours : ' + pluriel(joues, 'jour joué', 'jours joués') + '.')
    b.appendChild(gr)
    // SES SESSIONS RÉCENTES
    b.appendChild(el('h4', '', 'Ses dernières sessions'))
    var ul = el('ul', 'a-liste a-sessions')
    liste(c.sessions).forEach(function (x) {
      var li = el('li' , x.en_cours ? 'en-cours' : '')
      li.appendChild(el('span', 'quand', heureMin(x.debut)))
      li.appendChild(el('span', '', (x.en_cours ? 'en cours' : 'jusqu\'à ' + heureMin(x.fin).replace(/^.* à /, '')) + ' · ' + liste(x.serveurs).map(texte).join(', ')))
      li.appendChild(el('span', 'prix', heuresMinutes(x.minutes)))
      ul.appendChild(li)
    })
    if (!ul.children.length) ul.appendChild(el('li', 'rien', 'Aucune session relevée.'))
    b.appendChild(ul)
    return b
  }
  // ses hausses de jetons par jour (30 jours) : des barres ; l'API ne relève que ce qui monte, la note le dit
  function hausses(b2, ag) {
    var l = liste(ag.hausses).filter(function (x) { return num(x.jetons) > 0 })
    if (!l.length) { if (ag.hausses_depuis) b2.appendChild(el('p', 'a-aide', 'Aucune hausse de jetons relevée depuis le ' + A.date(ag.hausses_depuis) + '.')); return }
    var max = Math.max.apply(null, l.map(function (x) { return num(x.jetons) }))
    var bar = el('div', 'a-hausses')
    bar.setAttribute('role', 'img')
    bar.setAttribute('aria-label', 'Ses hausses de jetons par jour, sur ' + pluriel(l.length, 'jour') + '.')
    l.forEach(function (x) { var c = el('span', 'a-hausse'); c.style.height = Math.max(6, Math.round(100 * num(x.jetons) / max)) + '%'; c.title = jourCourt(x.jour) + ' : +' + A.nombre(x.jetons) + NBSP + 'jetons'; bar.appendChild(c) })
    b2.appendChild(el('h4', '', 'Ses hausses de jetons'))
    b2.appendChild(bar)
    b2.appendChild(el('p', 'a-aide', 'Relevées chaque nuit depuis le ' + (ag.hausses_depuis ? A.date(ag.hausses_depuis) : '?') + ' ; une baisse n\'est pas relevée. La plus forte : +' + A.nombre(max) + NBSP + 'jetons.'))
  }

  // ---------- le tchat en direct : UN tchat pour tout le réseau ----------
  function vueTchat() {
    var outils = el('div', 'a-tchat-outils'), champ = el('input'), pause = el('button', 'a-pause', 'Pause'), etatEl = el('span', 'a-etat', 'On se branche...'), compte = el('span', 'a-compte', '')
    var filtre = { mot: '' }, lignesVues = 0, ids = {}
    champ.type = 'search'; champ.placeholder = 'Filtrer : un mot, un pseudo'; champ.setAttribute('aria-label', 'Filtrer le tchat par un mot ou un pseudo')
    champ.addEventListener('input', function () { filtre.mot = champ.value.trim().toLowerCase(); appliquer() })
    pause.type = 'button'; pause.setAttribute('aria-pressed', 'false')
    pause.addEventListener('click', function () { var p = pause.getAttribute('aria-pressed') !== 'true'; pause.setAttribute('aria-pressed', p ? 'true' : 'false'); pause.textContent = p ? 'Reprendre' : 'Pause'; if (!p) enBas() })
    outils.appendChild(champ); outils.appendChild(pause); outils.appendChild(compte); outils.appendChild(etatEl)
    var cadre = el('div', 'a-tchat'), ol = el('ol', 'a-lignes'), neuves = el('button', 'a-neuves', 'Nouvelles lignes, en bas')
    ol.setAttribute('aria-label', 'Les lignes du tchat'); ol.setAttribute('aria-live', 'off')
    neuves.type = 'button'; neuves.hidden = true; neuves.addEventListener('click', enBas)
    // (dc, 30/10) aucun message encore : une phrase, jamais un cadre vide ; elle part avec la première ligne
    var attente = el('p', 'a-tchat-attente', 'Aucun message public pour l\'instant : chaque message écrit en jeu, sur tout le réseau, arrive ici dès qu\'il est tapé.')
    cadre.appendChild(attente); cadre.appendChild(ol); cadre.appendChild(neuves)
    vue.appendChild(outils); vue.appendChild(cadre)
    var MAX = 400
    function visible(li) { return !filtre.mot || li.getAttribute('data-cherche').indexOf(filtre.mot) >= 0 }
    function appliquer() { Array.prototype.forEach.call(ol.children, function (li) { li.hidden = !visible(li) }); enBas() }
    function auFond() { return ol.scrollHeight - ol.scrollTop - ol.clientHeight < 40 }
    function enBas() { ol.scrollTop = ol.scrollHeight; neuves.hidden = true }
    ol.addEventListener('scroll', function () { if (auFond()) neuves.hidden = true })
    etat.tchat = A.tchat(function (l) {
      // chaque ligne une fois (une reprise après une coupure peut redonner une ligne déjà là)
      if (!l || ids[l.id]) return
      ids[l.id] = 1
      if (attente.parentNode) attente.parentNode.removeChild(attente)
      var etaitAuFond = auFond(), li = el('li', l.filtre ? 'filtree' : '')
      li.setAttribute('data-cherche', (texte(l.pseudo) + ' ' + texte(l.texte) + (l.filtre ? ' ' + texte(l.original) : '')).toLowerCase())
      var t = el('time', '', A.heure(l.quand)); t.setAttribute('datetime', texte(l.quand))
      li.appendChild(t); li.appendChild(el('b', '', texte(l.pseudo)))
      li.appendChild(el('span', 'a-texte', String(l.texte)))
      if (l.filtre && l.original) li.appendChild(el('span', 'a-original', 'tapé : ' + texte(l.original)))
      li.hidden = !visible(li)
      ol.appendChild(li); lignesVues++
      while (ol.children.length > MAX) { var vieille = ol.firstChild; ol.removeChild(vieille) }
      compte.textContent = pluriel(lignesVues, 'ligne') + ' depuis l\'ouverture'
      if (pause.getAttribute('aria-pressed') === 'true') return
      if (etaitAuFond) enBas(); else neuves.hidden = false
    }, function (e) {
      if (e && typeof e.en_ligne === 'number') etatEl.textContent = 'En direct · ' + A.nombre(e.en_ligne) + ' en ligne'
    }, function (coupe) {
      etatEl.textContent = coupe ? 'Coupé : on se rebranche...' : 'En direct'
      etatEl.classList.toggle('coupe', !!coupe)
      // le flux fermé pour de bon : la raison se lit sur une adresse de l'équipe (une session de plus de 12 heures ?)
      if (coupe === 'ferme') A.admin('tableau', { jours: 7 }).then(function (r) { if (r.statut === 401 && r.corps && r.corps.erreur === 'reconnexion') reconnexion() })
    })
  }
})()
