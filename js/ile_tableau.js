// LE TABLEAU DE BORD DE L'ÎLE (compte.html, la section #mon-ile ; 2c, 30/10/2026 ; le propriétaire : un joueur connecté voit
// ce qui l'attend sur SON île). L'API (GET /api/moi/ile) rend la PHOTO que le jeu publie (ses machines, ses enclos) pour lui,
// son hôte et ses membres ; la page CALCULE ce qui attend, à la seconde, avec la formule du jeu (js/ile_calcul.js). Chaque
// chiffre vieux dit son heure (« lue à 06:12 ») ; une photo absente : « bientôt », jamais un 0 inventé. Relue toutes les
// 2 minutes et au retour sur l'onglet ; le compte monte une fois par seconde, seulement quand la section est à l'écran.
// L'heure : celle du serveur (« lu » de la réponse), jamais celle de l'ordinateur du joueur (son écart corrigé).
;(function () {
  'use strict'
  var A = window.CasteriaApi, K = window.IleCalcul
  var racine = document.getElementById('mon-ile')
  if (!racine || !A || !K) return
  // (2c, 30/10 ; la tournée de dc) SANS SESSION, rien : ni appel, ni message (le témoin de connexion de js/api.js, comme A.moi)
  if (!/(?:^|;\s*)casteria_connecte=1(?:;|$)/.test(document.cookie || '')) return
  var NBSP = String.fromCharCode(160), RELIRE_MS = 120000
  var corps = racine.querySelector('[data-ile-corps]'), onglets = racine.querySelector('[data-ile-onglets]')
  var etat = { donnees: null, ecart: 0, choix: 'moi', vivants: [], minuteur: 0, relu: 0, visible: true }
  function el(n, c, t) { return A.el(n, c, t) }
  var VOYELLES = 'aeiouyàâäéèêëîïôöùûüAEIOUYÀÂÄÉÈÊËÎÏÔÖÙÛÜ'
  function deNom(nom) {
    var n = String(nom || ''), c = n.charAt(0), s2 = n.charAt(1)
    if (c === 'y' || c === 'Y') return (s2 !== '' && VOYELLES.indexOf(s2) !== -1 ? 'de ' : 'd\'') + n
    return (n && VOYELLES.indexOf(c) !== -1 ? 'd\'' : 'de ') + n
  }
  // les mots d'une photo : la sienne (moi) ou celle d'un autre
  function motsDe(moi) {
    return moi ? { produit: 'Ce que tes machines ont produit depuis ta dernière récolte, à la seconde. Ton Entrepôt garde ', photo: ' Photo de ton île prise à ',
      machines: 'Tes machines', enclos: 'Tes enclos', betes: 'Tes bêtes : ', plusTard: 'Tes bêtes et la réserve de la grange se liront à ta prochaine visite de l\'enclos en jeu.' }
      : { produit: 'Ce que ses machines ont produit depuis sa dernière récolte, à la seconde. Son Entrepôt garde ', photo: ' Photo prise à ',
        machines: 'Ses machines', enclos: 'Ses enclos', betes: 'Ses bêtes : ', plusTard: 'Ses bêtes et la réserve de la grange se liront à sa prochaine visite de l\'enclos en jeu.' }
  }
  function maintenant() { return Date.now() + etat.ecart }
  function heureCourte(ms) { try { return new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }).format(new Date(ms)) } catch (e) { return '' } }
  // une durée en mots du joueur, jamais arrondie vers le haut (« 1 h 05 », « 12 min », « moins d'une minute »)
  function duree(ms) {
    var m = Math.floor(ms / 60000)
    if (m < 1) return 'moins d\'une minute'
    if (m < 60) return m + NBSP + 'min'
    var h = Math.floor(m / 60), r = m % 60
    if (h >= 48) return Math.floor(h / 24) + NBSP + 'jours'
    return h + NBSP + 'h' + (r ? NBSP + (r < 10 ? '0' : '') + r : '')
  }

  function lire() {
    if (!window.fetch || etat.fini) return
    etat.relu = Date.now()
    fetch('/api/moi/ile', { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } }).then(function (r) {
      // une session finie (le témoin est resté) : la section se cache, et plus aucun appel
      if (r.status === 401) { racine.hidden = true; etat.fini = true; return null }
      return r.ok ? r.json() : null
    }).then(function (j) {
      if (etat.fini) return
      if (!j) { if (!etat.donnees) dire('Ton île ne se lit pas pour l\'instant. Réessaie dans une minute.'); return }
      var t = Date.parse(j.lu)
      if (isFinite(t)) etat.ecart = t - Date.now()
      etat.donnees = j
      racine.hidden = false
      dessiner()
    }).catch(function () { if (!etat.donnees) dire('Ton île ne se lit pas pour l\'instant. Réessaie dans une minute.') })
  }
  function dire(t) { A.vider(corps); corps.appendChild(el('p', 'ile-vide', t)); racine.hidden = false }

  // ---------- les îles : la sienne, celle de son hôte, celles de ses membres (des onglets s'il y en a plusieurs) ----------
  function iles() {
    var d = etat.donnees, l = [{ cle: 'moi', titre: 'Mes machines', photo: d.moi }]
    ;(d.hotes || []).forEach(function (h) { l.push({ cle: 'h:' + h.pseudo, titre: 'Chez ' + h.pseudo, photo: h.photo }) })
    ;(d.membres || []).forEach(function (m) { l.push({ cle: 'm:' + m.pseudo, titre: 'Machines ' + deNom(m.pseudo), photo: m.photo }) })
    return l
  }
  function dessiner() {
    var l = iles(), choisie = null
    A.vider(onglets)
    onglets.hidden = l.length < 2
    l.forEach(function (x) {
      if (x.cle === etat.choix) choisie = x
      var b = el('button', 'ile-onglet', x.titre)
      b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', x.cle === etat.choix ? 'true' : 'false')
      b.addEventListener('click', function () { etat.choix = x.cle; dessiner() })
      onglets.appendChild(b)
    })
    if (!choisie) { choisie = l[0]; etat.choix = 'moi' }
    montrer(choisie)
  }

  // ---------- une photo : ses machines groupées par type, ses enclos ----------
  function montrer(x) {
    A.vider(corps)
    etat.vivants = []
    var p = x.photo
    if (!p) {
      corps.appendChild(el('p', 'ile-vide', x.cle === 'moi'
        ? 'Bientôt : tes machines et tes enclos apparaîtront ici dès que tu en poses ou en récoltes un en jeu.'
        : 'Bientôt : cette île apparaîtra ici dès que son hôte y pose ou récolte une machine ou un enclos.'))
      return
    }
    var lu = Date.parse(p.lu), M = motsDe(x.cle === 'moi')
    var tete = el('p', 'ile-photo')
    tete.appendChild(document.createTextNode(M.produit + duree((Number(p.plafondMin) || 30) * 60000) + ' de production.'))
    if (isFinite(lu)) tete.appendChild(el('span', 'ile-lue', M.photo + heureCourte(lu) + '.'))
    corps.appendChild(tete)
    machines(p, M)
    enclos(p, M)
    corps.appendChild(el('p', 'ile-conseil', 'Récolte en jeu : machine par machine, ou toutes d\'un clic au Noyau de ton île avec la Récolte globale.'))
    vivre()
  }
  function machines(p, M) {
    var ms = p.machines || [], types = p.types || {}
    if (!ms.length) return
    var par = {}, ordre = []
    ms.forEach(function (m) { var t = String(m[0]); if (!par[t]) { par[t] = []; ordre.push(t) } par[t].push(m) })
    ordre.sort(function (a, b) { return Number(a) - Number(b) })
    var bloc = el('div', 'ile-bloc'), h = el('h3', 'ile-titre', M.machines), l = el('ul', 'ile-machines')
    bloc.appendChild(h); bloc.appendChild(l)
    ordre.forEach(function (t) {
      var ty = types[t] || {}, li = el('li', 'ile-machine'), haut = el('div', 'im-haut'), nom = el('span', 'im-nom', (ty.nom || 'Machine') + (par[t].length > 1 ? ' ×' + NBSP + par[t].length : ''))
      var val = el('b', 'im-attente'), barre = el('span', 'im-barre'), fond = el('i', ''), etatL = el('span', 'im-etat')
      barre.appendChild(fond); barre.setAttribute('aria-hidden', 'true')
      haut.appendChild(nom); haut.appendChild(val)
      li.appendChild(haut); li.appendChild(barre); li.appendChild(etatL)
      l.appendChild(li)
      etat.vivants.push(function (t0) { majMachine(par[t], ty, p, t0, val, fond, etatL, li) })
    })
    corps.appendChild(bloc)
  }
  // le produit accordé, comme le jeu le dit à la récolte (generators.js, produitAccorde et MATIERES_NON_COMPTEES) : « 31 pierres »,
  // « 12 bûches de chêne », mais « 40 charbon », « 9 fer brut »
  var MATIERES_NON_COMPTEES = { charbon: true, cuivre: true, fer: true, or: true, 'castérium': true }
  function produitAccorde(n, nom) {
    var s = String(nom || ''), i = s.indexOf(' '), premier = i < 0 ? s : s.substring(0, i)
    if (Math.floor(Number(n) || 0) <= 1 || MATIERES_NON_COMPTEES[premier] || /[sxz]$/.test(premier)) return s
    return premier + 's' + (i < 0 ? '' : s.substring(i))
  }
  function majMachine(ms, ty, p, t0, val, fond, etatL, li) {
    var plafond = Number(p.plafondMin) || 30, tot = 0, max = 0, pleines = 0, aSec = 0, prochaine = Infinity
    var tyc = { carburant: !!ty.carburant, lot: !!ty.lot, spl: Number(ty.spl) || 0 }
    for (var i = 0; i < ms.length; i++) {
      var n = K.enAttente(ms[i], tyc, t0, plafond), mx = K.plafondObjets(ms[i], plafond)
      tot += n; max += mx
      if (n >= mx) pleines++
      else { var d = K.pleinDans(ms[i], tyc, t0, plafond); if (d === Infinity) aSec++; else if (d < prochaine) prochaine = d }
    }
    val.textContent = A.nombre(tot) + NBSP + produitAccorde(tot, ty.nomFr)
    fond.style.width = (max > 0 ? Math.min(100, tot / max * 100) : 0).toFixed(1) + '%'
    var mots = []
    if (pleines) mots.push(pleines === ms.length ? (ms.length > 1 ? 'Toutes pleines : elles ne produisent plus, récolte-les' : 'Pleine : elle ne produit plus, récolte-la') : pleines + ' pleine' + (pleines > 1 ? 's' : '') + ' sur ' + ms.length)
    if (aSec) mots.push(aSec + NBSP + 'à nourrir' + (ty.carburant ? ' (' + ty.carburant + ')' : ''))
    if (prochaine < Infinity && pleines < ms.length) mots.push((ms.length > 1 ? 'la prochaine pleine dans ' : 'pleine dans ') + duree(prochaine))
    etatL.textContent = mots.length ? mots.join(' · ') : ''
    li.classList.toggle('pleine', pleines > 0)
    li.classList.toggle('a-nourrir', aSec > 0)
  }
  function enclos(p, M) {
    var es = p.enclos || []
    if (!es.length) return
    var bloc = el('div', 'ile-bloc'), l = el('ul', 'ile-enclos')
    bloc.appendChild(el('h3', 'ile-titre', M.enclos))
    bloc.appendChild(l)
    es.forEach(function (e) {
      var li = el('li', 'ile-enclo'), nom = el('p', 'ie-nom', (e.nom || 'Enclos') + (e.especeNom ? ' · ' + e.especeNom + (e.especes > 1 ? ' et ' + (e.especes - 1) + ' autre' + (e.especes > 2 ? 's espèces' : ' espèce') : '') : ''))
      var lignes = el('ul', 'ie-lignes')
      li.appendChild(nom); li.appendChild(lignes)
      if (Number(e.n) > 1) lignes.appendChild(el('li', '', 'Grange au niveau ' + e.n))
      var auge = el('li', 'ie-auge'), surplus = el('li', 'ie-surplus')
      lignes.appendChild(auge); lignes.appendChild(surplus)
      var vu = e.vu
      if (vu && isFinite(Number(vu.lu))) {
        lignes.appendChild(el('li', 'ie-vu', M.betes + A.nombre(vu.adultes) + ' adulte' + (vu.adultes > 1 ? 's' : '') + (vu.petits ? ' et ' + A.nombre(vu.petits) + ' petit' + (vu.petits > 1 ? 's' : '') : '') +
          (vu.stalles ? ' sur ' + vu.stalles + ' places' : '') + ' ; la réserve de la grange : ' + A.nombre(vu.reserve) + ' objet' + (vu.reserve > 1 ? 's' : '') + (vu.pleine ? ', pleine' : '') +
          ' (vu en jeu à ' + heureCourte(Number(vu.lu)) + ')'))
      } else lignes.appendChild(el('li', 'ie-vu', M.plusTard))
      l.appendChild(li)
      etat.vivants.push(function (t0) { majEnclos(e, p, t0, auge, surplus) })
    })
    corps.appendChild(bloc)
  }
  function majEnclos(e, p, t0, auge, surplus) {
    var fin = Number(e.fin) || 0
    auge.textContent = fin <= 0 ? '' : (fin > t0 ? 'Auge pleine encore ' + duree(fin - t0) + ' (jusqu\'à ' + heureCourte(fin) + ')' : 'Auge vide depuis ' + duree(t0 - fin) + ' : tes bêtes sont à jeun, la grange produit moitié moins')
    auge.classList.toggle('a-jeun', fin > 0 && fin <= t0)
    var s = Number(e.n) > 1 ? K.surplus(e, t0, Number(p.plafondH) || 0.5) : 0
    surplus.textContent = Number(e.n) > 1 ? 'Surplus des niveaux : ' + A.nombre(Math.floor(s)) + NBSP + 'jetons au prix de base, à récupérer au /betail (payé au cours du jour)' : ''
  }

  // ---------- la vie : une fois par seconde, seulement à l'écran et l'onglet visible ----------
  function vivre() {
    var t0 = maintenant()
    for (var i = 0; i < etat.vivants.length; i++) etat.vivants[i](t0)
  }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { etat.visible = es[0].isIntersecting }).observe(racine)
  setInterval(function () { if (etat.visible && !document.hidden && etat.vivants.length) vivre() }, 1000)
  setInterval(function () { if (!document.hidden) lire() }, RELIRE_MS)
  document.addEventListener('visibilitychange', function () { if (!document.hidden && Date.now() - etat.relu > 30000) lire() })
  lire()
})()
