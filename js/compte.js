// LE COMPTE DU JOUEUR (compte.html ; le prototype du 29/10/2026) : sa peau en 3D (js/peau.js), son grade, ses jetons et
// ses crédits, son niveau, sa place au classement général et dans chaque thème, son île, ses boss, ses achats ; « La
// boutique » ouvre la boutique du site, où l'on achète connecté, pour le compte de la session (js/boutique.js, le 30/10 :
// plus aucun pseudo à taper ni case à cocher). Tout vient de CasteriaApi.moi (GET /api/moi,
// API.md 3.1), écrit en texte. Sans session : la connexion, puis le retour ici.
(function () {
  'use strict'
  var A = window.CasteriaApi, P = window.CasteriaPeau
  var $ = function (id) { return document.getElementById(id) }
  var statue = $('compte-statue'), nom = $('compte-nom'), titres = $('compte-titres'), niveau = $('compte-niveau'), general = $('compte-general'), gestes = $('compte-gestes')
  var tuiles = $('compte-tuiles'), parties = document.querySelectorAll('.compte-section')
  if (!A || !P || !statue || !nom || !general || !gestes || !tuiles) return
  var el = A.el, vider = A.vider, NBSP = String.fromCharCode(160)
  var THEMES_NOMS = { general: 'Général', ile: 'Fortune', iles: 'Îles', casino: 'Hasard', boss: 'Boss', mer: 'Mer', quetes: 'Progrès', jeux: 'Défis' }
  var poignee = null

  // (Lighthouse, 29/10) la place du compte est gardée tant que la réponse n'est pas là : rien ne saute à son arrivée
  function pret() { var z = document.getElementById('compte'); if (z) z.classList.remove('en-attente') }
  function sansSession() {
    pret()
    nom.textContent = 'Ton compte'
    vider(general)
    general.appendChild(document.createTextNode('Connecte-toi avec ton pseudo et le mot de passe du jeu pour voir ton compte.'))
    var a = el('a', 'bouton bouton-or grand', 'Se connecter'); a.href = 'connexion.html?retour=compte.html'
    vider(gestes); gestes.appendChild(a)
    // (le propriétaire, 29/10) sans compte : il se crée en jeu, le launcher à portée
    var tel = el('a', 'bouton bouton-bois', 'Télécharger le launcher'); tel.href = './#telecharger'; gestes.appendChild(tel)
    var p = el('p', 'note')
    p.appendChild(document.createTextNode('Pas encore de compte ? Crée-le en jeu : ')); p.appendChild(el('code', '', '/register'))
    p.appendChild(document.createTextNode(' et un mot de passe, puis reviens ici avec le même pseudo.'))
    gestes.appendChild(p)
    statue.classList.add('vide')
  }
  function panne() {
    pret()
    vider(general); general.appendChild(document.createTextNode('Ton compte ne s\'ouvre pas pour l\'instant. Réessaie dans un instant.'))
    var b = el('button', 'bouton bouton-bois', 'Réessayer'); b.type = 'button'; b.addEventListener('click', function () { location.reload() })
    vider(gestes); gestes.appendChild(b)
  }

  A.moi().then(function (r) {
    if (r.statut === 401) return sansSession()
    if (r.statut !== 200 || !r.corps || !r.corps.pseudo) return panne()
    montrer(r.corps)
  })

  function montrer(m) {
    pret()
    document.title = 'Mon compte : ' + m.pseudo + ' sur Casteria'
    nom.textContent = String(m.pseudo)
    // la peau : de face tout de suite, puis en 3D (on la tourne ; trois poses)
    vider(statue)
    var face = document.createElement('canvas'); face.className = 'face'; face.setAttribute('aria-hidden', 'true')
    statue.appendChild(face)
    P.deFace(face, m.peau, m.modele)
    poignee = P.vue3d(statue, m.peau, m.modele, { glisser: true, pose: 'repos', zoom: 0.82 })
    if (P.possible3d()) {
      var poses = el('div', 'compte-poses'), POSES = [['repos', 'Repos'], ['marche', 'Marche'], ['victoire', 'Victoire']]
      poses.setAttribute('role', 'group'); poses.setAttribute('aria-label', 'La pose de ta peau')
      POSES.forEach(function (x, i) {
        var b = el('button', 'cl-choix', x[1]); b.type = 'button'; b.setAttribute('aria-pressed', i ? 'false' : 'true')
        b.addEventListener('click', function () { Array.prototype.forEach.call(poses.children, function (c) { c.setAttribute('aria-pressed', c === b ? 'true' : 'false') }); poignee.poser(x[0]) })
        poses.appendChild(b)
      })
      statue.appendChild(poses)
    }
    // le grade, l'équipe, le titre, en ligne
    vider(titres)
    if (m.grade && m.grade.nom) { var g = el('span', 'grade'); if (/^(chevalier|comte|marquis|duc|souverain)$/.test(m.grade.cle)) { var e = el('span', 'cl-embleme e-' + m.grade.cle); e.setAttribute('aria-hidden', 'true'); g.appendChild(e) } g.appendChild(document.createTextNode(String(m.grade.nom))); titres.appendChild(g) }
    if (m.equipe && m.equipe.nom) titres.appendChild(el('span', 'equipe', String(m.equipe.nom)))
    if (m.titre) titres.appendChild(el('span', '', String(m.titre)))
    titres.appendChild(el('span', 'vu' + (m.en_ligne ? ' en-ligne' : ''), m.en_ligne ? 'En ligne' + (m.lieu ? ' · ' + String(m.lieu) : '') : 'Vu ' + A.ilYa(m.vu)))
    // (la tête, 29/10) UN BANNI VOIT SON COMPTE : une ligne sur sa sanction (le motif, la fin ou « définitif »), rien d'autre
    var sanc = $('compte-sanction')
    if (sanc) {
      vider(sanc); sanc.hidden = !m.sanction
      if (m.sanction) sanc.appendChild(document.createTextNode('Ton compte est banni du serveur ' + (m.sanction.fin ? 'jusqu\'au ' + A.date(m.sanction.fin, true) : 'définitivement') + '. Motif : ' + String(m.sanction.motif || 'sans motif') + '.'))
    }
    // le niveau
    vider(niveau)
    if (m.niveau) {
      var b = el('span', 'cl-barre'), i = el('i')
      niveau.appendChild(el('b', '', 'Niveau ' + m.niveau.n))
      i.style.setProperty('--part', (m.niveau.max ? 100 : Math.round((Number(m.niveau.part) || 0) * 100)) + '%'); b.appendChild(i); b.setAttribute('aria-hidden', 'true')
      niveau.appendChild(b)
      niveau.appendChild(el('span', 'suivant', m.niveau.max ? 'le plus haut' : Math.round((Number(m.niveau.part) || 0) * 100) + NBSP + '% vers le ' + (m.niveau.n + 1)))
      // (le propriétaire, 29/10) son prochain déblocage (API.md 3.1 : niveau.prochain, le jeu le donne)
      if (m.niveau.prochain && m.niveau.prochain.nom) niveau.appendChild(el('span', 'prochain', 'Au niveau ' + m.niveau.prochain.n + ' : ' + A.texte(m.niveau.prochain.nom)))
    }
    vider(general)
    if (m.hors_classement) general.appendChild(document.createTextNode('L\'équipe du serveur est hors des classements.'))
    else if (m.general) {
      if (m.general.rang) { general.appendChild(el('b', '', A.rang(m.general.rang))); general.appendChild(document.createTextNode(' au classement général · ')) }
      general.appendChild(document.createTextNode(A.nombre(m.general.points) + ' points sur ' + A.nombre(m.general.sur)))
    }
    // les gestes : la boutique avec son pseudo, l'espace de l'équipe, la déconnexion
    vider(gestes)
    var bout = el('a', 'bouton bouton-or grand', 'La boutique'); bout.href = 'boutique.html#acheter'
    bout.addEventListener('click', function () { try { sessionStorage.setItem('casteria_pseudo', String(m.pseudo)) } catch (x) {} })
    gestes.appendChild(bout)
    // (b5, 22:4x) son profil public : ce que tout le monde voit de lui, et son image à partager
    if (/^[A-Za-z0-9_]{3,16}$/.test(String(m.pseudo))) { var pub = el('a', 'bouton bouton-bois', 'Mon profil public'); pub.href = '/joueur/' + String(m.pseudo); gestes.appendChild(pub) }
    if (m.droits && m.droits.admin) { var ad = el('a', 'bouton bouton-bois', 'L\'espace de l\'équipe'); ad.href = 'admin.html'; gestes.appendChild(ad) }
    var dec = el('button', 'bouton bouton-bois', 'Se déconnecter'); dec.type = 'button'
    dec.addEventListener('click', function () { dec.disabled = true; A.deconnexion().then(function () { location.assign('connexion.html') }) })
    gestes.appendChild(dec)
    gestes.appendChild(el('p', 'note', 'Dans la boutique, tes achats vont sur ce compte : rien à taper.'))

    // les tuiles : les jetons, les crédits, le temps de jeu, les boss
    vider(tuiles)
    var pv = m.prive || {}
    // (b5, 22:4x) un solde que le jeu n'a pas encore dit (null) ne s'écrit jamais « 0 »
    var connu = function (n) { return n !== null && n !== undefined && isFinite(Number(n)) }
    tuile('assets/icones/jeton.png', 'Jetons', connu(pv.jetons) ? A.nombre(pv.jetons) : 'Pas encore lu', connu(pv.jetons) ? 'jetons' : 'dit à ta prochaine venue en jeu')
    tuile('assets/icones/credit.png', 'Crédits', connu(pv.credits) ? A.nombre(pv.credits) : 'Pas encore lu', connu(pv.credits) ? 'crédits' : 'dit à ta prochaine venue en jeu')
    tuile('', 'Temps de jeu', A.nombre(Math.floor((m.temps_de_jeu_min || 0) / 60)) + NBSP + 'h', 'en tout')
    // (la tête, 29/10) jamais un nombre de boss : ses VICTOIRES seulement
    if (m.boss) tuile('', 'Victoires contre les boss', A.nombre(m.boss.victoires || 0), m.boss.victoires_heroique ? 'dont ' + A.nombre(m.boss.victoires_heroique) + ' en Héroïque' : 'en arène')

    // le classement général : les dix aspects
    var asp = $('compte-aspects'); vider(asp)
    if (m.general && Array.isArray(m.general.aspects)) m.general.aspects.forEach(function (a) { var li = el('li'), bb = el('span', 'cl-barre'), ii = el('i'); li.appendChild(el('span', '', String(a.nom))); ii.style.setProperty('--part', Math.max(0, Math.min(100, Number(a.points) || 0)) + '%'); bb.appendChild(ii); li.appendChild(bb); li.appendChild(el('b', '', String(Math.round(a.points)))); asp.appendChild(li) })
    else asp.appendChild(el('li', 'rien', m.hors_classement ? 'L\'équipe est hors des classements.' : 'Pas encore classé.'))
    // (le propriétaire, 29/10 : « donner envie [...] de monter ») POUR MONTER : les points qui manquent pour la place à viser
    // (general.devant) et sa barre, puis l'aspect le plus faible (la règle du jeu : il monte le plus vite)
    var mt = $('compte-monter')
    if (mt) {
      vider(mt)
      var g = m.general || {}
      if (g.devant && typeof g.devant.points === 'number' && typeof g.points === 'number' && g.devant.points > g.points) {
        var manque = g.devant.points - g.points, bb2 = el('span', 'cl-barre'), ii2 = el('i')
        mt.appendChild(el('p', 'but', 'Encore ' + A.nombre(manque) + ' point' + (manque > 1 ? 's' : '') + ' pour passer ' + A.rang(g.devant.rang)))
        ii2.style.setProperty('--part', Math.round(Math.max(0, Math.min(1, g.points / g.devant.points)) * 1000) / 10 + '%'); bb2.appendChild(ii2)
        bb2.setAttribute('role', 'img'); bb2.setAttribute('aria-label', A.nombre(g.points) + ' points sur les ' + A.nombre(g.devant.points) + ' de la ' + A.rang(g.devant.rang) + ' place')
        mt.appendChild(bb2)
      }
      if (Array.isArray(g.aspects) && g.aspects.length) {
        var faible = g.aspects.slice().sort(function (x, y) { return (Number(x.points) || 0) - (Number(y.points) || 0) })[0]
        if (faible && Number(faible.points) < 100) mt.appendChild(el('p', 'conseil', 'Pour monter vite : ' + A.texte(faible.nom) + ' (' + A.nombre(faible.points) + ' sur 100). Ton aspect le plus faible monte le plus vite.'))
      }
      mt.hidden = !mt.children.length
    }
    // chaque thème : la meilleure place (un lien vers ce classement)
    var th = $('compte-themes'); vider(th)
    var par = {}
    ;(m.themes || []).forEach(function (t) { par[t.cle] = t })
    A.THEMES.forEach(function (cle) {
      var t = par[cle], li = el('li', t ? '' : 'rien'), a = el('a')
      a.href = 'classement.html#' + cle + (t ? '/' + t.categorie : '')
      a.appendChild(el('span', 'theme', THEMES_NOMS[cle]))
      if (t) { a.appendChild(el('b', '', A.rang(t.rang))); a.appendChild(el('span', 'cat', A.texte(t.titre) + ' · ' + A.texte(t.texte))) } else a.appendChild(el('span', 'cat', 'Pas encore classé'))
      li.appendChild(a); th.appendChild(li)
    })
    // l'île
    var ile = $('compte-ile'); vider(ile)
    if (m.ile) {
      ile.appendChild(el('p', 'ile-nom', String(m.ile.nom)))
      var et = el('p', 'fiche-etoiles')
      for (var k = 0; k < 5; k++) et.appendChild(el('span', k < (Number(m.ile.etoiles) || 0) ? '' : 'vide', '★'))
      // (b5, 22:4x) la note elle-même à côté des étoiles (3,8 : quatre étoiles pleines ne disaient pas laquelle)
      if (isFinite(Number(m.ile.etoiles))) et.appendChild(el('span', 'note-etoiles', ' ' + String(Math.round(Number(m.ile.etoiles) * 10) / 10).replace('.', ',') + ' sur 5'))
      et.setAttribute('aria-label', (Number(m.ile.etoiles) || 0) + ' étoiles de Beauté sur 5')
      ile.appendChild(et)
      var ul = el('ul', 'fiche-grille')
      // une donnée absente se tait (jamais « 0 points » pour une beauté que le jeu n'a pas encore dite)
      if (m.ile.beaute !== null && m.ile.beaute !== undefined && isFinite(Number(m.ile.beaute))) ligne(ul, 'Beauté', A.nombre(m.ile.beaute) + ' points')
      if (m.ile.classement && m.ile.classement.rang) ligne(ul, 'Classement des îles', A.rang(m.ile.classement.rang))
      else if (m.ile.place) ligne(ul, 'Place aux Îles', A.rang(m.ile.place))
      ligne(ul, 'Tes amis sur l\'île', A.nombre(m.ile.amis))
      ile.appendChild(ul)
      // son île en 3D (ile.html, /ile/<i>,<j>) et sa place sur la carte (carte.js lit #ile=i,j)
      if (isFinite(Number(m.ile.i)) && isFinite(Number(m.ile.j))) {
        var vers = el('p', 'compte-ile-liens'), c3 = el('a', 'fiche-lien', 'Voir mon île en 3D ›'), ca = el('a', 'fiche-lien', 'Sur la carte ›')
        c3.href = '/ile/' + Number(m.ile.i) + ',' + Number(m.ile.j); ca.href = 'carte.html#ile=' + Number(m.ile.i) + ',' + Number(m.ile.j)
        vers.appendChild(c3); vers.appendChild(ca); ile.appendChild(vers)
      }
    } else ile.appendChild(el('p', 'rien', 'Ton île t\'attend : tape /ile en jeu.'))
    // les boss et les exploits
    var ex = $('compte-exploits'); vider(ex)
    if (m.boss) {
      ligne(ex, 'Victoires contre les boss', A.nombre(m.boss.victoires || 0)); ligne(ex, 'Victoires en Héroïque', A.nombre(m.boss.victoires_heroique || 0)); ligne(ex, 'Donjons gagnés', A.nombre(m.boss.donjons || 0))
      // ses records du serveur, boss par boss (les boss que le site nomme : API.md 2.3)
      ;(Array.isArray(m.boss.records) ? m.boss.records : []).forEach(function (r) { ligne(ex, 'Record : ' + String(r.nom) + (r.mode === 'heroique' ? ' en Héroïque' : ''), String(r.temps)) })
    }
    if (m.mer) { ligne(ex, 'Pirates coulés', A.nombre(m.mer.pirates)); ligne(ex, 'Cargaisons légendaires', A.nombre(m.mer.legendaires)); ligne(ex, 'Sorties en mer', A.nombre(m.mer.sorties)); ligne(ex, 'Lieux de l\'Atlas', A.nombre(m.mer.lieux)) }
    if (m.collections) { ligne(ex, 'Familiers', A.nombre(m.collections.familiers)); ligne(ex, 'Montures', A.nombre(m.collections.montures)) }
    // les achats : Tebex (le site), puis les crédits dépensés en jeu
    var at = $('compte-achats-tebex'); vider(at)
    ;(pv.achats || []).forEach(function (x) {
      var li = el('li'); li.appendChild(el('span', 'quand', A.date(x.quand))); li.appendChild(el('span', 'quoi', String(x.produit)))
      li.appendChild(el('b', '', x.etat === 'rembourse' ? 'remboursé' : A.euros(x.prix_centimes))); at.appendChild(li)
    })
    if (!at.children.length) at.appendChild(el('li', 'rien', 'Aucun achat pour l\'instant.'))
    var ac = $('compte-achats-credits'); vider(ac)
    ;(pv.depenses_credits || []).slice(0, 12).forEach(function (x) {
      // (dc, 30/10) une correction de l'équipe n'est pas un achat : elle le dit
      var li = el('li'); li.appendChild(el('span', 'quand', A.date(x.quand))); li.appendChild(el('span', 'quoi', (x.par_equipe ? 'Retiré par l\'équipe : ' : '') + String(x.article)))
      li.appendChild(el('b', '', A.nombre(x.credits) + NBSP + 'crédits')); ac.appendChild(li)
    })
    if (!ac.children.length) ac.appendChild(el('li', 'rien', 'Aucune dépense en crédits pour l\'instant.'))
    // les parties du compte et leurs frises, d'un coup (cachées tant qu'il n'y a rien à montrer)
    Array.prototype.forEach.call(parties, function (x) { x.hidden = false })
    // (2c, 30/10 ; la tournée de dc) L'ÉQUIPE HORS CLASSEMENT (le Fondateur, l'Admin, le Responsable : dans AUCUN classement, sans
    // ligne « Toi ») : sa partie des classements (sa place au général, sa place par thème) ne se montre pas, ni sa frise d'avant
    var cl = $('compte-themes') ? $('compte-themes').closest('section') : null
    if (cl && m.hors_classement) {
      cl.hidden = true
      if (cl.previousElementSibling && cl.previousElementSibling.classList.contains('frise')) cl.previousElementSibling.hidden = true
    }
  }
  function tuile(icone, titre, valeur, sous) {
    var li = el('li', icone ? '' : 'sans-icone')
    if (icone) { var i = document.createElement('img'); i.src = icone; i.alt = ''; i.width = 32; i.height = 32; i.className = 'pixel'; li.appendChild(i) }
    li.appendChild(el('span', 'titre', titre)); li.appendChild(el('b', '', valeur)); li.appendChild(el('span', 'sous', sous))
    tuiles.appendChild(li)
  }
  function ligne(ul, n, v) { var li = el('li'); li.appendChild(el('span', '', n)); li.appendChild(el('b', '', v)); ul.appendChild(li) }
})()
