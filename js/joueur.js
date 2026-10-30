// LE PROFIL PUBLIC (joueur.html, casteria.fr/joueur/<pseudo> ; l'API : /api/joueur/<pseudo>/public, API.md 2.3 et 2.4,
// par js/vivant_api.js). Le pseudo vient de l'adresse (/joueur/Bricolune, ou joueur.html?p=Bricolune). Le jeu écrit chaque
// texte (« 12 400 000 jetons », « niveau 42 ») : la page les montre tels quels (CasteriaApi.texte : les milliers insécables).
// Jamais le nombre de boss du jeu : des totaux ; un nom de boss seulement dans ses records (l'API ne garde que ceux que le site
// nomme). Le propriétaire (29/10) : « donner envie » : un visiteur lit « Toi aussi, construis ton île » ; connecté
// (CasteriaApi.moi), « toi face à lui » : vos places et vos niveaux. (5c, 29/10 ; le propriétaire : « les profils et tout
// complet ») son rang et son prochain déblocage, l'écart avec la place d'au-dessus, SES BOSS (trois trophées, ses records),
// SES BÊTES ET COMPAGNONS, ses aventures avec ses machines et son temps de jeu ; jamais une ligne vide ni un « 0 ».
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
  // (5c, le kit) une icône au trait du sprite que porte la barre (svg.ic, <use href="#i-…">)
  function ic(id, plein) {
    var NS = 'http://www.w3.org/2000/svg', sv = document.createElementNS(NS, 'svg'), u = document.createElementNS(NS, 'use')
    sv.setAttribute('class', 'ic' + (plein ? ' plein' : '')); sv.setAttribute('aria-hidden', 'true'); u.setAttribute('href', '#i-' + id)
    sv.appendChild(u)
    return sv
  }
  // (5c) le portrait des boss que le site nomme (les illustrations de nos modèles, tete_48/illustrations_site, réduites à 128 px)
  var PORTRAITS = { roi_champignon: 1, kraken_abysses: 1, yeti_glaces: 1 }
  // (5c, 30/10) les bêtes illustrées (le nom de l'espèce dans le jeu, en minuscules, et son image de 256 px)
  var ILLUS_BETES = { 'kitsune céleste': 'bete_kitsune_celeste', 'capybara': 'bete_capybara', 'mouton cerisier': 'bete_mouton_cerisier' }
  function pluriel(n, mot, mots) { return nombre(n) + ' ' + (n > 1 ? (mots || mot + 's') : mot) }
  // (5c, l'audit du site : « 0e » sur la fiche du propriétaire) un rang de 0 ou moins ne s'écrit jamais
  function rang(r) { return !(r >= 1) ? '-' : r === 1 ? '1er' : A.nombre(r) + 'e' }
  // classé : ni hors du classement (l'équipe), ni sans rang (0 : pas encore classé, ou un instantané d'avant la 155)
  function classe(x) { return !!(x && !x.hors_classement && x.general && x.general.rang >= 1) }
  // la page est lue : la hauteur réservée pendant la lecture part (l'audit : le pied sautait, CLS 0,43)
  function lue() { var c = $('contenu'); if (c) c.classList.remove('en-lecture') }
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
    lue()
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
    lue()
    document.title = (j.partage && j.partage.titre) || p + ' sur Casteria'
    $('pseudo').textContent = p
    $('titre').textContent = j.titre || 'Joueur de Casteria'
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
    else if (j.vu) pr.textContent = 'Vu ' + A.ilYa(j.vu)
    // le niveau
    if (j.niveau) {
      $('niveau').hidden = false
      $('niveau-n').textContent = 'Niveau ' + j.niveau.n + (j.niveau.rang ? ' · ' + j.niveau.rang : '') + (j.niveau.max ? ' (le plus haut)' : '')
      var pc = j.niveau.prochain
      if (!j.niveau.max && pc && pc.nom && pc.niveau > j.niveau.n) { $('prochain').textContent = 'Prochain déblocage : ' + pc.nom + ', au niveau ' + pc.niveau; $('prochain').hidden = false }
      var part = j.niveau.max ? 100 : Math.round(Math.max(0, Math.min(1, j.niveau.part)) * 100)
      $('niveau-part').style.width = part + '%'
      $('niveau-barre').setAttribute('aria-valuenow', part)
      $('niveau-barre').setAttribute('aria-label', j.niveau.max ? 'Niveau le plus haut' : part + ' % du niveau suivant')
    }
    $('gestes').hidden = false
    if (j.ile && j.ile.i != null) { $('vers-ile').href = 'carte.html#ile=' + j.ile.i + ',' + j.ile.j; $('vers-ile').hidden = false }
    faceAFace(j, moi)

    // LE CLASSEMENT GÉNÉRAL : sa place, ses points sur 1 000, ses dix aspects
    // (5c ; la règle du propriétaire : l'équipe se voit « comme un joueur mais sans nous ») hors classement ou pas classé : AUCUN
    // bloc du classement, ni « hors du classement » ni place ; son rôle se lit dans son badge, à côté de son pseudo
    if (classe(j)) {
      montrerBloc('general')
      $('general-rang').textContent = rang(j.general.rang)
      $('general-points').textContent = nombre(j.general.points) + ' / ' + nombre(j.general.sur) + ' points'
      if (j.general.devant > 0 && j.general.suivant > 0) { $('general-devant').textContent = 'Encore ' + pluriel(j.general.devant, 'point') + ' pour passer ' + rang(j.general.suivant); $('general-devant').hidden = false }
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
        if (!(t.rang >= 1)) return
        var li = el('li', 'place' + (t.rang <= 3 ? ' podium p' + t.rang : '')), a = el('a')
        a.href = 'classement.html#' + encodeURIComponent(t.cle || 'general') + '/' + encodeURIComponent(t.categorie)
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
      // (dc, 30/10, la tournée) sans étoile : la phrase, jamais cinq étoiles grises et un « 0 » (comme la page d'une île)
      if (!(Number(ile.etoiles) >= 0.05)) e.appendChild(el('span', 'etoiles-aucune', 'Pas encore d\'étoile de beauté'))
      else {
        for (var k = 0; k < 5; k++) e.appendChild(el('span', 'etoile' + (k < et ? ' pleine' : ''), '★'))
        e.appendChild(el('b', 'etoiles-nb', etoiles(ile.etoiles)))
        e.setAttribute('aria-label', etoiles(ile.etoiles) + ' étoiles sur 5')
      }
      tx.appendChild(e)
      var faits = el('ul', 'ile-faits')
      if (!j.hors_classement && ile.classement && ile.classement.rang >= 1) faits.appendChild(el('li', '', rang(ile.classement.rang) + ' au Classement des îles · ' + nombre(ile.classement.points) + ' / ' + nombre(ile.classement.sur || 400) + ' points'))
      if (ile.beaute) faits.appendChild(el('li', '', nombre(ile.beaute) + ' points de beauté'))
      faits.appendChild(el('li', '', ile.amis ? 'Avec ' + pluriel(ile.amis, 'ami') + ' sur l\'île' : p + ' y vit seul'))
      tx.appendChild(faits)
      if (ile.i != null) {
        var gs = el('p', 'ile-gestes')
        var b3 = el('a', 'bouton bouton-or', 'La voir en 3D'); b3.href = 'ile/' + ile.i + ',' + ile.j; b3.insertBefore(ic('jeu'), b3.firstChild); gs.appendChild(b3)
        var bt = el('a', 'bouton bouton-sombre', 'Sur la carte'); bt.href = 'carte.html#ile=' + ile.i + ',' + ile.j; bt.insertBefore(ic('carte'), bt.firstChild); gs.appendChild(bt)
        tx.appendChild(gs)
      }
      if (window.IlePixel) {
        // (67, 29/10 ; l'audit du site, 12) la grande ile d'af, chaque pixel plein, a sa taille
        var g = IlePixel.grande ? IlePixel.grande(ile.i || 0, ile.j || 0, et, !!ile.ouverte) : IlePixel.sprite(ile.i || 0, ile.j || 0, et, false)
        var c = document.createElement('canvas'); c.width = g.width; c.height = g.height
        c.getContext('2d').drawImage(g, 0, 0)
        $('ile-dessin').appendChild(c)
      }
    }
    montrerBoss(j)
    montrerBetes(j)
    // SES AVENTURES : la mer, ses machines, son temps de jeu ; des totaux
    var f = []
    if (j.mer) {
      if (j.mer.pirates) f.push(['⚓', pluriel(j.mer.pirates, 'pirate'), 'coulé' + (j.mer.pirates > 1 ? 's' : '')])
      if (j.mer.legendaires) f.push(['☠', pluriel(j.mer.legendaires, 'pirate légendaire', 'pirates légendaires'), 'coulé' + (j.mer.legendaires > 1 ? 's' : '')])
      if (j.mer.sorties) f.push(['🧭', pluriel(j.mer.sorties, 'sortie'), 'en mer'])
      if (j.mer.lieux) f.push(['🗺', pluriel(j.mer.lieux, 'lieu', 'lieux'), 'découvert' + (j.mer.lieux > 1 ? 's' : '') + ' en mer'])
    }
    if (j.machines && j.machines.poses) f.push(['⚙', pluriel(j.machines.poses, 'machine'), 'sur son île'])
    var h = Math.floor((Number(j.temps_de_jeu_min) || 0) / 60)
    if (h >= 1) f.push(['⏳', pluriel(h, 'heure'), 'de jeu'])
    if (f.length) {
      montrerBloc('faits')
      var fu = $('faits')
      f.forEach(function (x) { var li = el('li', 'fait panneau-nuit'); li.appendChild(el('span', 'ico', x[0])); li.appendChild(el('b', '', x[1])); if (x[2]) li.appendChild(document.createTextNode(' ' + x[2])); fu.appendChild(li) })
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
    if (!moi) {
      $('appel-titre').textContent = 'Rejoins ' + p + ' sur Casteria'
      // (5c) l'équipe n'a pas de place au classement : « à côté de la sienne » serait faux
      if (!classe(j)) $('appel-texte').textContent = 'Ton île au milieu de la mer, tes machines, tes bêtes, des boss à vaincre : et ta place au classement.'
      montrerBloc('appel')
    }

    partage(j, moi)
  }

  // (a8, 30/10 ; le propriétaire : « refais un peu plus beau la partie de partage du profil ») LE PARTAGE : la carte que
  // Discord montre (l'image de l'API : /api/joueur/<pseudo>/image.png), le lien à copier, Partager (le téléphone, s'il sait),
  // Télécharger l'image ; « Partager ce profil » du haut y mène
  function partage(j, moi) {
    var p = j.pseudo, url = location.origin + '/joueur/' + encodeURIComponent(p), image = 'api/joueur/' + encodeURIComponent(p) + '/image.png'
    var lui = moi && String(moi.pseudo).toLowerCase() === String(p).toLowerCase()
    var titre = (j.partage && j.partage.titre) || p + ' sur Casteria'
    $('partage-titre').textContent = lui ? 'Partage ton profil' : 'Partage le profil de ' + p
    $('partage-phrase').textContent = lui
      ? 'Colle ton lien sur Discord ou ailleurs : ta carte s\'affiche toute seule, avec ton niveau, ton île et tes victoires.'
      : 'Colle le lien sur Discord ou ailleurs : sa carte s\'affiche toute seule, avec son niveau, son île et ses victoires.'
    var img = $('partage-image')
    img.alt = 'La carte de ' + p + ' sur Casteria'
    img.src = image
    $('partage-adresse').value = url.replace(/^https?:\/\//, '')
    var t = $('partage-telecharger')
    t.href = image
    t.setAttribute('download', 'casteria-' + p + '.png')
    var dit = function (texte) { var d = $('partage-dit'); d.textContent = texte; d.hidden = false }
    $('partage-copier').addEventListener('click', function () {
      var champ = $('partage-adresse')
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { dit('Lien copié : colle-le sur Discord, ta carte suivra.') }, function () { champ.select(); dit('Sélectionne le lien et copie-le.') })
      else { champ.select(); dit('Sélectionne le lien et copie-le.') }
    })
    $('partage-adresse').addEventListener('focus', function () { this.select() })
    if (navigator.share) {
      var n = $('partage-natif')
      n.hidden = false
      n.addEventListener('click', function () { navigator.share({ title: titre, text: j.partage ? j.partage.description : '', url: url }).catch(function () {}) })
    }
    montrerBloc('partage')
    $('partager').addEventListener('click', function () {
      var b = $('bloc-partage')
      b.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' })
      setTimeout(function () { $('partage-copier').focus({ preventScroll: true }) }, 450)
    })
  }

  // SES BOSS : trois trophées (ses victoires, en Héroïque, ses donjons), puis ses records ; rien à zéro, la section cachée sans rien
  function montrerBoss(j) {
    var b = j.boss, el = A.el
    if (!b) return
    var t = [['assets/discord/boss_vaincu.png', b.victoires, 'victoire', 'contre les boss'],
      ['assets/discord/boss_heroique.png', b.victoires_heroique || b.heroiques, 'victoire', 'en Héroïque'],
      ['assets/donjons/coffret.webp', b.donjons, 'donjon', 'gagné']].filter(function (x) { return Number(x[1]) > 0 })
    var recs = (b.records || []).filter(function (r) { return r && r.nom && r.temps })
    if (!t.length && !recs.length) return
    montrerBloc('boss')
    var ul = $('trophees')
    t.forEach(function (x) {
      var li = el('li', 'trophee panneau-nuit'), im = el('img')
      im.src = x[0]; im.alt = ''; im.width = 64; im.height = 64; im.className = 'pixel'; im.loading = 'lazy'
      li.appendChild(im)
      var n = Number(x[1])
      li.appendChild(el('b', '', nombre(n)))
      li.appendChild(el('span', '', (n > 1 ? x[2] + 's' : x[2]) + ' ' + (x[3] === 'gagné' ? (n > 1 ? 'gagnés' : 'gagné') : x[3])))
      ul.appendChild(li)
    })
    if (recs.length) {
      $('records').hidden = false
      var ol = $('records-liste')
      recs.forEach(function (r) {
        var li = el('li', 'record' + (r.mode === 'heroique' ? ' heroique' : ''))
        if (PORTRAITS[r.boss]) {
          var pt = el('img', 'record-portrait'); pt.src = 'assets/illustrations/boss_' + r.boss + '_128.png'; pt.alt = ''; pt.width = 56; pt.height = 56; pt.loading = 'lazy'
          li.appendChild(pt)
        } else li.appendChild(el('span', 'record-portrait vide', '⚔'))
        li.appendChild(el('span', 'record-boss', r.nom))
        li.appendChild(el('span', 'record-mode', r.mode === 'heroique' ? 'Héroïque' : 'Normal'))
        var tm = el('b', 'record-temps', r.temps); tm.setAttribute('aria-label', r.temps.replace(':', ' min ') + ' s')
        li.appendChild(tm)
        ol.appendChild(li)
      })
    }
  }
  // SES BÊTES ET COMPAGNONS : sa plus belle bête (au Sanctuaire ou celle qui vaut le plus), ses enclos, ses familiers, ses montures
  function montrerBetes(j) {
    var el = A.el, be = j.betes || {}, co = j.collections || {}, belle = be.plus_belle
    var l = []
    if (be.enclos > 0) l.push(['🐄', pluriel(be.enclos, 'enclos', 'enclos'), 'sur son île'])
    if (co.familiers > 0) l.push(['🐾', pluriel(co.familiers, 'familier'), 'à ses côtés'])
    if (co.montures > 0) l.push(['🐎', pluriel(co.montures, 'monture'), 'à monter'])
    if (!l.length && !(belle && belle.nom)) return
    montrerBloc('betes')
    if (belle && belle.nom) {
      var bx = $('belle')
      bx.appendChild(el('p', 'sur-ligne', 'Sa plus belle bête'))
      bx.appendChild(el('h3', '', belle.nom))
      bx.appendChild(el('p', 'belle-ou', belle.sanctuaire ? 'Au Sanctuaire, le plus haut enclos' : 'Dans ses enclos'))
      // (5c, 30/10) son portrait quand c'est une de nos bêtes illustrées (le nom exact de l'espèce : jamais une variante, qui a son
      // propre dessin)
      var ill = ILLUS_BETES[String(belle.nom).toLowerCase()]
      if (ill) {
        var im = el('img', 'belle-image'); im.src = 'assets/illustrations/' + ill + '_256.png'; im.alt = belle.nom; im.width = 160; im.height = 160; im.loading = 'lazy'
        bx.classList.add('avec-image')
        bx.appendChild(im)
      }
      bx.hidden = false
    }
    var ul = $('compagnons')
    l.forEach(function (x) {
      var li = el('li', 'compagnon panneau-nuit')
      li.appendChild(el('span', 'ico', x[0]))
      var tx = el('span', 'compagnon-texte')
      tx.appendChild(el('b', '', x[1]))
      tx.appendChild(el('span', '', x[2]))
      li.appendChild(tx)
      ul.appendChild(li)
    })
  }

  // TOI FACE À LUI (connecté) ; sinon l'envie (visiteur)
  function faceAFace(j, moi) {
    var box = $('face-a-face'), el = A.el
    A.vider(box)
    box.className = 'face-a-face panneau-nuit'
    if (moi && String(moi.pseudo).toLowerCase() === String(j.pseudo).toLowerCase()) {
      box.appendChild(el('h2', '', 'C\'est ton profil'))
      box.appendChild(el('p', '', 'C\'est ce que les autres voient de toi. Partage-le : ton lien montre ton île' + (classe(j) ? ' et ta place.' : '.')))
      var c = el('a', 'bouton bouton-sombre', 'Mon compte'); c.href = 'compte.html'; c.insertBefore(ic('moi'), c.firstChild); box.appendChild(c)
    } else if (moi) {
      box.appendChild(el('h2', '', 'Toi face à ' + j.pseudo))
      var t = el('table', 'duel')
      // (5c) un joueur pas classé (l'équipe, ou rang 0) : « - », jamais une place ni un écart
      var gm = classe(moi) ? moi.general : null, gj = classe(j) ? j.general : null
      // (5c) les lignes du classement seulement si les DEUX sont classés (l'équipe : jamais une ligne de rang)
      var lignes = (gm && gj ? [['Classement général', rang(gm.rang), rang(gj.rang), gm.rang - gj.rang], ['Points', nombre(gm.points), nombre(gj.points), gj.points - gm.points]] : [])
        .concat([['Niveau', moi.niveau ? String(moi.niveau.n) : '-', j.niveau ? String(j.niveau.n) : '-', moi.niveau && j.niveau ? j.niveau.n - moi.niveau.n : 0]])
      var th = el('tr'); th.appendChild(el('th', '', '')); th.appendChild(el('th', '', 'Toi')); th.appendChild(el('th', '', j.pseudo)); t.appendChild(th)
      lignes.forEach(function (l) {
        var tr = el('tr')
        tr.appendChild(el('th', '', l[0]))
        tr.appendChild(el('td', l[3] < 0 ? 'devant' : '', l[1]))
        tr.appendChild(el('td', l[3] > 0 ? 'devant' : '', l[2]))
        t.appendChild(tr)
      })
      box.appendChild(t)
      var ecart = gm && gj ? gm.rang - gj.rang : 0
      if (gm && gj) box.appendChild(el('p', 'duel-mot', ecart > 0 ? 'Il te reste ' + pluriel(ecart, 'place') + ' pour le rattraper.' : (ecart < 0 ? 'Tu es devant : garde ta place.' : 'Vous êtes au coude à coude.')))
    } else {
      // (5c, le kit) la fenêtre crème : sa tête (l'icône, le titre), son corps, son pied
      box.className = 'face-a-face fenetre-creme'
      var tete = el('div', 'f-tete'), ico = el('span', 'f-icone')
      ico.appendChild(ic('maison'))
      tete.appendChild(ico)
      tete.appendChild(el('h2', '', 'Toi aussi, construis ton île'))
      box.appendChild(tete)
      var corps = el('div', 'f-corps')
      corps.appendChild(el('p', '', 'Une île rien qu\'à toi au milieu de la mer, des boss, des bêtes, des machines : et ta place au classement' + (classe(j) ? ', à côté de la sienne.' : '.')))
      var a = el('a', 'bouton bouton-orange', 'Jouer gratuitement'); a.href = './#telecharger'; a.insertBefore(ic('jouer', true), a.firstChild); corps.appendChild(a)
      box.appendChild(corps)
      var pied = el('div', 'f-pied'), cx = el('a', '', 'Déjà joueur ? Connecte-toi'); cx.href = 'connexion.html'
      pied.appendChild(cx)
      box.appendChild(pied)
    }
    box.hidden = false
  }
})()
