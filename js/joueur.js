// LE PROFIL PUBLIC (joueur.html, casteria.fr/joueur/<pseudo> ; l'API : /api/joueur/<pseudo>/public, API.md 2.3 et 2.4,
// par js/vivant_api.js). Le pseudo vient de l'adresse (/joueur/Bricolune, ou joueur.html?p=Bricolune). Le jeu écrit chaque
// texte (« 12 400 000 jetons », « niveau 42 ») : la page les montre tels quels (CasteriaApi.texte : les milliers insécables).
// Jamais un nom de boss ni le nombre de boss du jeu : des totaux. Le propriétaire (29/10) : « donner envie » : un visiteur
// lit « Toi aussi, construis ton île » ; connecté (CasteriaApi.moi), « toi face à lui » : vos places et vos niveaux.
;(function () {
  'use strict'
  var A = window.CasteriaApi, V = window.CasteriaVivant, P = window.CasteriaPeau
  if (!A || !V) return
  var $ = function (id) { return document.getElementById(id) }
  var m = location.pathname.match(/\/joueur\/([A-Za-z0-9_]{3,16})\/?$/), q = location.search.match(/[?&]p=([A-Za-z0-9_]{3,16})/)
  var pseudo = m ? m[1] : q ? q[1] : ''
  var SORTES = { boss_premiere: ['⚔', 'Boss'], boss_record: ['⏱', 'Record'], boss_heroique: ['🔥', 'Héroïque'], boss_heroique_record: ['🔥', 'Record Héroïque'],
    oeuf_mythique: ['🥚', 'Œuf mythique'], casino_gros_gain: ['🎰', 'Casino'], minijeu_victoire: ['🏆', 'Mini-jeu'] }

  function nombre(n) { return A.nombre(n) }
  function pluriel(n, mot, mots) { return nombre(n) + ' ' + (n > 1 ? (mots || mot + 's') : mot) }
  function rang(r) { return r === 1 ? '1er' : A.nombre(r) + 'e' }
  function etoiles(e) { return String(Math.round(Number(e || 0) * 10) / 10).replace('.', ',') }
  function montrerBloc(id) {
    $('bloc-' + id).hidden = false
    var f = document.querySelector('.frise[data-bloc="' + id + '"]')
    if (f) f.hidden = false
  }
  function statue(url, modele) {
    var s = $('statue')
    A.vider(s)
    if (!P) return
    var face = document.createElement('canvas'); face.className = 'face'; face.setAttribute('aria-hidden', 'true')
    s.appendChild(face)
    P.deFace(face, url, modele)
    P.vue3d(s, url, modele, { glisser: true, pose: 'repos', zoom: 0.82 })
  }

  function absent(titre, texte) {
    document.title = titre + ' : Casteria'
    $('pseudo').textContent = pseudo || 'Un joueur'
    $('titre').textContent = 'Profil introuvable'
    $('absent-titre').textContent = titre
    $('absent-texte').textContent = texte
    $('bloc-absent').hidden = false
    statue('assets/peaux/casteria-defaut.png', 'classique')
  }
  $('chercher').addEventListener('submit', function (e) {
    e.preventDefault()
    var p = String($('chercher-pseudo').value || '').trim()
    if (A.PSEUDO.test(p)) location.href = 'joueur/' + encodeURIComponent(p)
  })

  if (!A.PSEUDO.test(pseudo)) { absent('Quel joueur ?', 'Tape le pseudo d\'un joueur de Casteria pour voir son profil.'); return }
  Promise.all([V.joueurPublic(pseudo), A.moi()]).then(function (rs) {
    var r = rs[0]
    if (r.statut === 404) { absent('Ce joueur n\'existe pas', 'Aucun joueur de Casteria ne porte le pseudo « ' + pseudo + ' ». Vérifie son orthographe : les majuscules ne comptent pas.'); return }
    if (r.statut !== 200) { absent('Le profil ne répond pas', 'Le profil ne s\'affiche pas pour l\'instant. Réessaie dans une minute ; en jeu, tape /profil.'); return }
    montrer(r.corps, rs[1].statut === 200 ? rs[1].corps : null)
  })

  function montrer(j, moi) {
    var p = j.pseudo, el = A.el
    document.title = (j.partage && j.partage.titre) || p + ' sur Casteria'
    $('pseudo').textContent = p
    $('titre').textContent = j.titre || (j.niveau && j.niveau.n >= 50 ? 'Légende de Casteria' : 'Joueur de Casteria')
    statue(j.peau, j.modele)
    // le grade, l'équipe
    var b = $('badges')
    A.vider(b)
    if (j.equipe) b.appendChild(el('span', 'badge equipe', j.equipe.nom))
    if (j.grade) b.appendChild(el('span', 'badge grade grade-' + String(j.grade.cle).replace(/[^a-z]/g, ''), j.grade.nom))
    // la presence
    var pr = $('presence')
    A.vider(pr)
    if (j.en_ligne) pr.appendChild(el('span', 'en-ligne', 'En jeu en ce moment' + (j.lieu ? ' : ' + j.lieu : '')))
    else pr.textContent = (j.vu ? 'Vu ' + A.ilYa(j.vu) : 'Joueur de Casteria') + (j.temps_de_jeu_min ? ' · ' + pluriel(Math.floor(j.temps_de_jeu_min / 60), 'heure') + ' de jeu' : '')
    // le niveau
    if (j.niveau) {
      $('niveau').hidden = false
      $('niveau-n').textContent = 'Niveau ' + j.niveau.n + (j.niveau.max ? ' (le plus haut)' : '')
      var part = j.niveau.max ? 100 : Math.round(Math.max(0, Math.min(1, j.niveau.part)) * 100)
      $('niveau-part').style.width = part + '%'
      $('niveau-barre').setAttribute('aria-valuenow', part)
      $('niveau-barre').setAttribute('aria-label', j.niveau.max ? 'Niveau le plus haut' : part + ' % du niveau suivant')
    }
    $('gestes').hidden = false
    if (j.ile && j.ile.i != null) { $('vers-ile').href = 'carte.html#ile=' + j.ile.i + ',' + j.ile.j; $('vers-ile').hidden = false }
    faceAFace(j, moi)

    // LE CLASSEMENT GÉNÉRAL : sa place, ses points sur 1 000, ses dix aspects
    if (j.hors_classement) {
      montrerBloc('general')
      $('general-rang').textContent = 'Hors du classement'
      $('general-points').textContent = 'Membre de l\'équipe de Casteria'
      document.querySelector('.general-aspects').hidden = true
    } else if (j.general) {
      montrerBloc('general')
      $('general-rang').textContent = rang(j.general.rang)
      $('general-points').textContent = nombre(j.general.points) + ' / ' + nombre(j.general.sur) + ' points'
      var ul = $('aspects')
      ;(j.general.aspects || []).forEach(function (a) {
        var v = Math.max(0, Math.min(100, a.points)), li = el('li')
        li.appendChild(el('span', 'nom', a.nom))
        var barre = el('span', 'barre-aspect'), dedans = el('span')
        dedans.style.width = v + '%'
        barre.appendChild(dedans)
        li.appendChild(barre)
        li.appendChild(el('span', 'points', v))
        ul.appendChild(li)
      })
    }
    // SES MEILLEURES PLACES : une carte par thème (les huit de /top), penchées et décalées
    if (j.themes && j.themes.length) {
      montrerBloc('themes')
      var pl = $('places')
      j.themes.forEach(function (t) {
        var li = el('li', 'place' + (t.rang <= 3 ? ' podium p' + t.rang : '')), a = el('a')
        a.href = 'classement.html#' + encodeURIComponent(t.categorie)
        a.appendChild(el('span', 'theme', t.nom))
        a.appendChild(el('span', 'rang-place', rang(t.rang)))
        a.appendChild(el('span', 'cat', t.titre))
        a.appendChild(el('span', 'val', A.texte(t.texte)))
        li.appendChild(a)
        pl.appendChild(li)
      })
    }
    // SON ÎLE : son dessin (celui de la carte), ses étoiles, sa place au Classement des îles
    if (j.ile) {
      var ile = j.ile, tx = $('ile-texte')
      montrerBloc('ile')
      tx.appendChild(el('p', 'sur-ligne', 'Son île'))
      tx.appendChild(el('h2', '', ile.nom))
      var e = el('p', 'ile-etoiles'), et = Math.max(0, Math.min(5, Math.floor(Number(ile.etoiles) || 0)))
      for (var k = 0; k < 5; k++) e.appendChild(el('span', 'etoile' + (k < et ? ' pleine' : ''), '★'))
      e.appendChild(el('b', 'etoiles-nb', etoiles(ile.etoiles)))
      e.setAttribute('aria-label', etoiles(ile.etoiles) + ' étoiles sur 5')
      tx.appendChild(e)
      var faits = el('ul', 'ile-faits')
      if (ile.classement) faits.appendChild(el('li', '', rang(ile.classement.rang) + ' au Classement des îles · ' + nombre(ile.classement.points) + ' / ' + nombre(ile.classement.sur || 400) + ' points'))
      if (ile.beaute) faits.appendChild(el('li', '', nombre(ile.beaute) + ' points de beauté'))
      faits.appendChild(el('li', '', ile.amis ? 'Avec ' + pluriel(ile.amis, 'ami') + ' sur l\'île' : 'Son hôte y vit seul'))
      tx.appendChild(faits)
      if (ile.i != null) {
        var gs = el('p', 'ile-gestes')
        var b3 = el('a', 'bouton bouton-or', 'La voir en 3D'); b3.href = 'ile/' + ile.i + ',' + ile.j; gs.appendChild(b3)
        var bt = el('a', 'bouton bouton-bois', 'Sur la carte'); bt.href = 'carte.html#ile=' + ile.i + ',' + ile.j; gs.appendChild(bt)
        tx.appendChild(gs)
      }
      if (window.IlePixel) {
        var c = document.createElement('canvas'); c.width = 12; c.height = 12
        c.getContext('2d').drawImage(IlePixel.sprite(ile.i || 0, ile.j || 0, et, false), 0, 0)
        $('ile-dessin').appendChild(c)
      }
    }
    // SES AVENTURES : des totaux, jamais un nom de boss
    var f = []
    if (j.boss) {
      var vb = j.boss.victoires || 0, vh = j.boss.victoires_heroique || j.boss.heroiques || 0
      if (vb) f.push(['⚔', pluriel(vb, 'victoire'), 'contre les boss'])
      if (vh) f.push(['🔥', pluriel(vh, 'victoire'), 'en Héroïque'])
      if (j.boss.donjons) f.push(['🏛', pluriel(j.boss.donjons, 'donjon'), 'gagné' + (j.boss.donjons > 1 ? 's' : '')])
    }
    if (j.mer) {
      if (j.mer.pirates) f.push(['⚓', pluriel(j.mer.pirates, 'pirate'), 'coulé' + (j.mer.pirates > 1 ? 's' : '')])
      if (j.mer.sorties) f.push(['🧭', pluriel(j.mer.sorties, 'sortie'), 'en mer'])
      if (j.mer.lieux) f.push(['🗺', pluriel(j.mer.lieux, 'lieu', 'lieux'), 'découvert' + (j.mer.lieux > 1 ? 's' : '')])
    }
    if (j.collections) {
      if (j.collections.familiers) f.push(['🐾', pluriel(j.collections.familiers, 'familier'), ''])
      if (j.collections.montures) f.push(['🐎', pluriel(j.collections.montures, 'monture'), ''])
    }
    if (f.length) {
      montrerBloc('faits')
      var fu = $('faits')
      f.forEach(function (x) { var li = el('li', 'panneau-bois'); li.appendChild(el('span', 'ico', x[0])); li.appendChild(el('b', '', x[1])); if (x[2]) li.appendChild(document.createTextNode(' ' + x[2])); fu.appendChild(li) })
    }
    // SES DERNIERS EXPLOITS
    if (j.exploits && j.exploits.length) {
      montrerBloc('exploits')
      var fl = $('fil')
      j.exploits.forEach(function (x) {
        var s = SORTES[x.sorte] || ['★', 'Exploit'], li = el('li', 'exploit s-' + String(x.sorte).replace(/[^a-z_]/g, ''))
        li.appendChild(el('span', 'ico', s[0]))
        li.appendChild(el('span', 'texte', A.texte(x.texte)))
        var tm = el('time', '', A.ilYa(x.quand)); tm.setAttribute('datetime', x.quand)
        li.appendChild(tm)
        fl.appendChild(li)
      })
    }
    // L'APPEL, pour un visiteur (pas connecté, ou ce n'est pas lui)
    if (!moi) { $('appel-titre').textContent = 'Rejoins ' + p + ' sur Casteria'; montrerBloc('appel') }

    // partager : le partage du téléphone, sinon le lien copié
    $('partager').addEventListener('click', function () {
      var url = location.origin + '/joueur/' + encodeURIComponent(p), titre = (j.partage && j.partage.titre) || p + ' sur Casteria'
      var fait = function (t) { $('copie').textContent = t; $('copie').hidden = false }
      if (navigator.share) { navigator.share({ title: titre, text: j.partage ? j.partage.description : '', url: url }).catch(function () {}); return }
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { fait('Lien copié : colle-le où tu veux.') }, function () { fait(url) })
      else fait(url)
    })
  }

  // TOI FACE À LUI (connecté) ; sinon l'envie (visiteur)
  function faceAFace(j, moi) {
    var box = $('face-a-face'), el = A.el
    A.vider(box)
    if (moi && String(moi.pseudo).toLowerCase() === String(j.pseudo).toLowerCase()) {
      box.appendChild(el('h2', '', 'C\'est ton profil'))
      box.appendChild(el('p', '', 'C\'est ce que les autres voient de toi. Partage-le : ton lien montre ton île et ta place.'))
      var c = el('a', 'bouton bouton-bois', 'Mon compte'); c.href = 'compte.html'; box.appendChild(c)
    } else if (moi) {
      box.appendChild(el('h2', '', 'Toi face à ' + j.pseudo))
      var t = el('table', 'duel')
      var lignes = [['Classement général', moi.general ? rang(moi.general.rang) : '-', j.general ? rang(j.general.rang) : '-', moi.general && j.general ? moi.general.rang - j.general.rang : 0],
        ['Points', moi.general ? nombre(moi.general.points) : '-', j.general ? nombre(j.general.points) : '-', moi.general && j.general ? j.general.points - moi.general.points : 0],
        ['Niveau', moi.niveau ? String(moi.niveau.n) : '-', j.niveau ? String(j.niveau.n) : '-', moi.niveau && j.niveau ? j.niveau.n - moi.niveau.n : 0]]
      var th = el('tr'); th.appendChild(el('th', '', '')); th.appendChild(el('th', '', 'Toi')); th.appendChild(el('th', '', j.pseudo)); t.appendChild(th)
      lignes.forEach(function (l) {
        var tr = el('tr')
        tr.appendChild(el('th', '', l[0]))
        tr.appendChild(el('td', l[3] < 0 ? 'devant' : '', l[1]))
        tr.appendChild(el('td', l[3] > 0 ? 'devant' : '', l[2]))
        t.appendChild(tr)
      })
      box.appendChild(t)
      var ecart = moi.general && j.general ? moi.general.rang - j.general.rang : 0
      box.appendChild(el('p', 'duel-mot', ecart > 0 ? 'Il te reste ' + pluriel(ecart, 'place') + ' pour le rattraper.' : (ecart < 0 ? 'Tu es devant : garde ta place.' : 'Vous êtes au coude à coude.')))
    } else {
      box.appendChild(el('h2', '', 'Toi aussi, construis ton île'))
      box.appendChild(el('p', '', 'Une île rien qu\'à toi au milieu de la mer, des boss, des bêtes, des machines : et ta place au classement, à côté de la sienne.'))
      var a = el('a', 'bouton bouton-or', 'Jouer gratuitement'); a.href = './#telecharger'; box.appendChild(a)
      var cx = el('a', 'lien-or', 'Déjà joueur ? Connecte-toi'); cx.href = 'connexion.html'; box.appendChild(cx)
    }
    box.hidden = false
  }
})()
