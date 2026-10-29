// L'API DU SITE (le prototype du 29/10/2026 ; le contrat, champ pour champ : API.md, à côté du site) : les pages du compte,
// du classement et de l'espace admin passent TOUTES par ici, jamais par fetch elles-mêmes. Une seule origine : /api/...
// (le VPS de casteria.fr) ; aucun autre serveur, jamais l'adresse du serveur de jeu. Ce qui revient s'écrit en TEXTE dans
// les pages (textContent) ; une peau n'entre dans la page que par une adresse vérifiée (peau()).
// LE COMMUTATEUR DES DONNÉES D'ESSAI : ESSAI vrai, les pages lisent donnees-essai/ (des pseudos et des chiffres INVENTÉS,
// jamais ceux de vrais joueurs ; chaque fichier porte « essai: true ») au lieu de l'API, et un bandeau le dit sur la page.
// Le jour où l'API répond : ESSAI = false (cette ligne seule), et donnees-essai/ ne part pas en ligne.
(function () {
  'use strict'
  var ESSAI = false
  var DELAI = 12000
  var PSEUDO = /^[A-Za-z0-9_]{3,16}$/
  // les huit thèmes de /top (la 154 du jeu : le Commerce fondu dans la Fortune, le thème Îles ; leaderboard.js, FAMILLES)
  var THEMES = ['general', 'ile', 'iles', 'casino', 'boss', 'mer', 'quetes', 'jeux']
  var ADMIN = { tableau: 1, ventes: 1, entonnoir: 1, consultations: 1, activites: 1 }
  var NBSP = String.fromCharCode(160), TIRET_INSECABLE = String.fromCharCode(0x2011)

  // ---------- une demande : { statut, corps } ; jamais une exception vers la page ----------
  // statut 0 : le réseau ou le délai (la page dit « indisponible »)
  function demander(adresse, options) {
    var o = options || {}
    if (!window.fetch) return Promise.resolve({ statut: 0, corps: { erreur: 'indisponible' } })
    var fin = typeof AbortController === 'function' ? new AbortController() : null
    var minuteur = setTimeout(function () { if (fin) fin.abort() }, DELAI)
    var init = { method: o.methode || 'GET', credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' }, signal: fin ? fin.signal : undefined }
    if (o.corps !== undefined) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(o.corps) }
    return fetch(adresse, init).then(function (r) {
      clearTimeout(minuteur)
      if (r.status === 204) return { statut: 204, corps: {} }
      return r.json().catch(function () { return {} }).then(function (j) { return { statut: r.status, corps: j && typeof j === 'object' ? j : {} } })
    }).catch(function () { clearTimeout(minuteur); return { statut: 0, corps: { erreur: 'indisponible' } } })
  }
  function refus(statut, erreur, plus) { var c = { erreur: erreur }; for (var k in plus || {}) c[k] = plus[k]; return Promise.resolve({ statut: statut, corps: c }) }
  function bas(p) { return String(p).toLowerCase() }
  function requete(params) {
    var l = []
    for (var k in params) if (params[k] !== undefined && params[k] !== null && params[k] !== '') l.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(params[k])))
    return l.length ? '?' + l.join('&') : ''
  }

  // ---------- LA VRAIE API (API.md) ----------
  var vraie = {
    enLigne: function () { return demander('/api/en-ligne') },
    classement: function (theme, categorie, taille) { return demander('/api/classement' + requete({ theme: theme, categorie: categorie, taille: taille || '' })) },
    joueur: function (pseudo) { return PSEUDO.test(pseudo) ? demander('/api/joueur/' + pseudo) : refus(400, 'requete') },
    moi: function () { return demander('/api/moi') },
    exploits: function (n) { return demander('/api/exploits' + requete({ n: Math.max(1, Math.min(50, Number(n) || 10)) })) },
    // (af, 29/10 : l'accueil) la carte vivante des iles (API.md 2.6)
    carte: function (zone) { return demander('/api/carte' + requete({ zone: zone === 'mer' ? 'mer' : 'iles' })) },
    connexion: function (pseudo, mdp) { return demander('/api/connexion', { methode: 'POST', corps: { pseudo: pseudo, mot_de_passe: mdp } }) },
    deconnexion: function () { return demander('/api/deconnexion', { methode: 'POST', corps: {} }) },
    admin: function (quoi, params) { return ADMIN[quoi] ? demander('/api/admin/' + quoi + requete(params)) : refus(404, 'inconnu') },
    adminJoueur: function (pseudo) { return PSEUDO.test(pseudo) ? demander('/api/admin/joueur/' + pseudo) : refus(400, 'requete') },
    adminRecherche: function (q) { return demander('/api/admin/recherche' + requete({ q: q })) },
    // le tchat en direct (Server-Sent Events, API.md 4.8) : surLigne(ligne), surEtat(etat), surPanne(vrai : coupé, faux : revenu)
    tchat: function (surLigne, surEtat, surPanne) {
      if (!window.EventSource) { surPanne(true); return { fermer: function () {} } }
      var es = new EventSource('/api/admin/tchat')
      es.addEventListener('ligne', function (e) { try { surLigne(JSON.parse(e.data)) } catch (x) {} })
      es.addEventListener('etat', function (e) { try { surEtat(JSON.parse(e.data)) } catch (x) {} })
      // fermé pour de bon (readyState 2 : un refus, une session de l'équipe de plus de 12 heures) : « ferme »
      es.addEventListener('error', function () { surPanne(es.readyState === 2 ? 'ferme' : true) })
      es.addEventListener('open', function () { surPanne(false) })
      return { fermer: function () { es.close() } }
    }
  }

  // ---------- LES DONNÉES D'ESSAI : les mêmes réponses, lues dans donnees-essai/ ----------
  // La session d'essai vit dans sessionStorage (l'onglet) : le vrai site a un cookie httpOnly que la page ne voit jamais.
  // Le mot de passe de tous les comptes d'essai : MDP_ESSAI (dit sur la page de connexion, en mode essai seulement).
  var MDP_ESSAI = 'essai123', CLE_SESSION = 'casteria_essai_session', CLE_ESSAIS = 'casteria_essai_essais', CLE_DEPUIS = 'casteria_essai_depuis'
  // la session de l'équipe dure 12 heures (API.md 1.3) : l'essai la compte depuis la connexion
  var EQUIPE_MS = 12 * 3600000
  function lireStock(cle) { try { return sessionStorage.getItem(cle) } catch (e) { return null } }
  function ecrireStock(cle, v) { try { if (v === null) sessionStorage.removeItem(cle); else sessionStorage.setItem(cle, v) } catch (e) {} }
  function fichier(rel) { return demander('donnees-essai/' + rel) }
  function sessionEssai() { var s = lireStock(CLE_SESSION); return s && PSEUDO.test(s) ? s : '' }
  function essaisRates(cle) { var t = []; try { t = JSON.parse(lireStock(CLE_ESSAIS) || '{}')[cle] || [] } catch (e) { t = [] } var a = Date.now() - 60000; return t.filter(function (x) { return x > a }) }
  function noterRate(cle) { var o = {}; try { o = JSON.parse(lireStock(CLE_ESSAIS) || '{}') } catch (e) { o = {} } o[cle] = essaisRates(cle).concat([Date.now()]); ecrireStock(CLE_ESSAIS, JSON.stringify(o)) }
  function oublierRates(cle) { var o = {}; try { o = JSON.parse(lireStock(CLE_ESSAIS) || '{}') } catch (e) { o = {} } delete o[cle]; ecrireStock(CLE_ESSAIS, JSON.stringify(o)) }
  // l'espace admin d'essai : la session ET le grade (droits.admin de la fiche d'essai)
  function adminEssai() {
    var s = sessionEssai()
    if (!s) return refus(401, 'non_connecte')
    var depuis = Number(lireStock(CLE_DEPUIS)) || 0
    if (depuis && Date.now() - depuis > EQUIPE_MS) return refus(401, 'reconnexion')
    return fichier('moi/' + s + '.json').then(function (r) { return r.statut === 200 && r.corps.droits && r.corps.droits.admin ? null : { statut: r.statut === 200 ? 403 : 401, corps: { erreur: r.statut === 200 ? 'reserve_equipe' : 'non_connecte' } } })
  }
  function jours(p) { var j = Number(p && p.jours); return j === 7 || j === 90 ? j : 30 }
  function pas(p) { return p && p.pas === 'semaine' ? 'semaine' : 'jour' }
  var essai = {
    enLigne: function () { return fichier('en-ligne.json') },
    exploits: function () { return fichier('exploits.json') },
    carte: function (zone) { return fichier('carte-' + (zone === 'mer' ? 'mer' : 'iles') + '.json') },
    classement: function (theme, categorie, taille) {
      if (THEMES.indexOf(theme) < 0) return refus(400, 'theme_inconnu')
      if (categorie && !/^[a-z0-9_]{1,48}$/.test(categorie)) return refus(404, 'categorie_inconnue')
      var t = Number(taille) || 0
      return fichier('classement/' + theme + (categorie ? '/' + categorie + (t >= 1 && t <= 3 ? '-t' + t : '') : '') + '.json').then(function (r) { return r.statut === 404 ? { statut: 404, corps: { erreur: 'categorie_inconnue' } } : r })
    },
    joueur: function (pseudo) {
      if (!PSEUDO.test(pseudo)) return refus(400, 'requete')
      return fichier('joueur/' + bas(pseudo) + '.json').then(function (r) { return r.statut === 404 ? { statut: 404, corps: { erreur: 'inconnu' } } : r })
    },
    moi: function () {
      var s = sessionEssai()
      if (!s) return refus(401, 'non_connecte')
      return fichier('moi/' + s + '.json').then(function (r) { if (r.statut !== 200) { ecrireStock(CLE_SESSION, null); return { statut: 401, corps: { erreur: 'non_connecte' } } } return r })
    },
    connexion: function (pseudo, mdp) {
      if (!PSEUDO.test(pseudo || '') || !mdp) return refus(400, 'requete')
      var cle = bas(pseudo), rates = essaisRates(cle)
      // la règle de l'API : 5 essais ratés par minute (ici par pseudo seulement)
      if (rates.length >= 5) return refus(429, 'trop_d_essais', { reessayer_dans: Math.max(1, Math.ceil((rates[0] + 60000 - Date.now()) / 1000)) })
      return fichier('moi/' + cle + '.json').then(function (r) {
        if (r.statut === 0) return r
        if (r.statut !== 200) { noterRate(cle); return { statut: 404, corps: { erreur: 'inconnu' } } }
        if (r.corps.pseudo !== pseudo) { noterRate(cle); return { statut: 401, corps: { erreur: 'casse', pseudo_exact: r.corps.pseudo } } }
        if (mdp !== MDP_ESSAI) { noterRate(cle); return { statut: 401, corps: { erreur: 'mot_de_passe' } } }
        oublierRates(cle)
        ecrireStock(CLE_SESSION, cle)
        ecrireStock(CLE_DEPUIS, String(Date.now()))
        return { statut: 200, corps: { ok: true, pseudo: r.corps.pseudo } }
      })
    },
    deconnexion: function () { ecrireStock(CLE_SESSION, null); ecrireStock(CLE_DEPUIS, null); return Promise.resolve({ statut: 204, corps: {} }) },
    admin: function (quoi, params) {
      if (!ADMIN[quoi]) return refus(404, 'inconnu')
      return adminEssai().then(function (non) {
        if (non) return non
        var nom = quoi + '-' + jours(params) + (quoi === 'ventes' || quoi === 'activites' ? '-' + pas(params) : '')
        return fichier('admin/' + nom + '.json')
      })
    },
    adminJoueur: function (pseudo) {
      if (!PSEUDO.test(pseudo)) return refus(400, 'requete')
      return adminEssai().then(function (non) { return non || fichier('admin/joueur/' + bas(pseudo) + '.json').then(function (r) { return r.statut === 404 ? { statut: 404, corps: { erreur: 'inconnu' } } : r }) })
    },
    adminRecherche: function (q) {
      return adminEssai().then(function (non) {
        if (non) return non
        var d = bas(q || '')
        if (d.length < 2) return { statut: 200, corps: { joueurs: [] } }
        return fichier('admin/recherche.json').then(function (r) {
          if (r.statut !== 200) return r
          return { statut: 200, corps: { essai: true, joueurs: (r.corps.joueurs || []).filter(function (j) { return bas(j.pseudo).indexOf(d) === 0 }).slice(0, 10) } }
        })
      })
    },
    // le tchat d'essai : les lignes du fichier, la dernière « à l'instant », puis une ligne neuve toutes les 1,5 à 4 s
    tchat: function (surLigne, surEtat, surPanne) {
      var fini = false, minuteurs = []
      Promise.all([adminEssai(), fichier('admin/tchat.json'), fichier('en-ligne.json')]).then(function (rs) {
        if (fini) return
        if (rs[0] || rs[1].statut !== 200) { surPanne(rs[0] ? 'ferme' : true); return }
        var l = rs[1].corps.lignes || [], dernier = l.length ? Date.parse(l[l.length - 1].quand) : Date.now(), decal = Date.now() - dernier, id = 0
        l.forEach(function (x) { var c = {}; for (var k in x) c[k] = x[k]; c.quand = new Date(Date.parse(x.quand) + decal).toISOString(); id = Math.max(id, x.id); surLigne(c) })
        surPanne(false)
        if (rs[2].statut === 200) surEtat({ en_ligne: rs[2].corps.en_ligne, lu: new Date().toISOString() })
        ;(function suivante() {
          if (fini || !l.length) return
          minuteurs.push(setTimeout(function () {
            if (fini) return
            var x = l[Math.floor(Math.random() * l.length)], c = {}
            for (var k in x) c[k] = x[k]
            c.id = ++id; c.quand = new Date().toISOString()
            surLigne(c); suivante()
          }, 1500 + Math.random() * 2500))
        })()
      })
      return { fermer: function () { fini = true; minuteurs.forEach(clearTimeout) } }
    }
  }

  // ---------- le bandeau des données d'essai : une bande fine tout en haut (la barre descend sous elle), sur chaque page qui lit l'API ----------
  function bandeauEssai() {
    function poser() {
      if (document.querySelector('.essai-bandeau')) return
      var b = document.createElement('p')
      b.className = 'essai-bandeau'
      b.setAttribute('role', 'note')
      b.textContent = 'Données d\'essai : pseudos et chiffres inventés'
      document.body.appendChild(b)
      document.documentElement.classList.add('essai')
    }
    if (document.body) poser(); else document.addEventListener('DOMContentLoaded', poser)
  }
  if (ESSAI) bandeauEssai()

  // ---------- ce que les pages partagent ----------
  // un nombre à la française, les milliers séparés par une espace insécable (jamais coupé en deux lignes)
  function nombre(n) { var s = String(Math.floor(Math.abs(Number(n) || 0))), o = ''; for (var i = 0; i < s.length; i++) { if (i > 0 && (s.length - i) % 3 === 0) o += NBSP; o += s.charAt(i) } return (Number(n) < 0 ? '-' : '') + o }
  // un texte écrit par le jeu (« 1 254 300 jetons » : ciNombre met une espace ordinaire) : ses milliers deviennent insécables
  // (la tête, 29/10) UN NOMBRE NE SE COUPE JAMAIS, ni un mot composé (« mini-jeux ») : le trait d'union devient insécable
  function texte(t) { return String(t === undefined || t === null ? '' : t).replace(/(\d)[ \u202f](?=\d{3}(?!\d))/g, '$1' + NBSP).replace(/([A-Za-zÀ-ÿ])-(?=[A-Za-zÀ-ÿ])/g, '$1' + TIRET_INSECABLE).replace(/ ([%:;!?\u00bb])/g, NBSP + '$1').replace(/(\u00ab) /g, '$1' + NBSP) }
  // des centimes en euros : « 129,90 € »
  function euros(c) { var n = Math.round(Number(c) || 0), e = Math.floor(Math.abs(n) / 100), r = Math.abs(n) % 100; return (n < 0 ? '-' : '') + nombre(e) + ',' + (r < 10 ? '0' : '') + r + NBSP + '€' }
  function pourcent(x, chiffres) { var v = (Number(x) || 0) * 100, k = chiffres === undefined ? 1 : chiffres; return v.toFixed(k).replace('.', ',').replace(/,0+$/, '') + NBSP + '%' }
  function rang(r) { return r === 1 ? '1er' : r + 'e' }
  // il y a combien de temps (« à l'instant », « il y a 5 min », « il y a 3 h », « il y a 2 jours »)
  function ilYa(iso) {
    var m = Math.floor((Date.now() - Date.parse(iso)) / 60000)
    if (!(m >= 0)) return ''
    if (m < 1) return 'à l\'instant'
    if (m < 60) return 'il y a ' + m + NBSP + 'min'
    var h = Math.floor(m / 60)
    if (h < 24) return 'il y a ' + h + NBSP + 'h'
    var j = Math.floor(h / 24)
    return 'il y a ' + j + NBSP + (j > 1 ? 'jours' : 'jour')
  }
  function date(iso, avecHeure) {
    try { return new Intl.DateTimeFormat('fr-FR', avecHeure ? { timeZone: 'Europe/Paris', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' } : { timeZone: 'Europe/Paris', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso)) } catch (e) { return '' }
  }
  function heure(iso) { try { return new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(iso)) } catch (e) { return '' } }
  // LA PEAU : seulement une adresse de l'API (/api/peau/<pseudo>) ou une peau du site (assets/peaux/...) ; sinon celle de
  // Casteria par défaut. Rien d'autre n'entre dans une image ou un fond de la page.
  var PEAU_DEFAUT = 'assets/peaux/casteria-defaut.png'
  function peau(u) {
    var s = String(u || '')
    if (/^\/api\/peau\/[A-Za-z0-9_]{3,16}$/.test(s) || /^assets\/peaux\/(?:essai\/)?[a-z0-9-]{1,32}\.png$/.test(s)) return s
    return PEAU_DEFAUT
  }
  // un élément : son nom, sa classe, son texte (toujours en texte)
  function el(nom, classe, t) { var e = document.createElement(nom); if (classe) e.className = classe; if (t !== undefined && t !== null) e.textContent = String(t); return e }
  function vider(e) { while (e && e.firstChild) e.removeChild(e.firstChild) }
  // un retour après la connexion : seulement une page du site (jamais une autre adresse)
  var RETOURS = ['compte.html', 'classement.html', 'boutique.html', 'admin.html']
  function retourSur(r) { var s = String(r || '').replace(/^\//, '').split('#')[0]; return RETOURS.indexOf(s) >= 0 ? s : 'compte.html' }

  var api = ESSAI ? essai : vraie
  window.CasteriaApi = {
    essai: ESSAI, motDePasseEssai: ESSAI ? MDP_ESSAI : '',
    enLigne: api.enLigne, carte: api.carte, classement: api.classement, joueur: api.joueur, moi: api.moi, exploits: api.exploits, connexion: api.connexion, deconnexion: api.deconnexion,
    admin: api.admin, adminJoueur: api.adminJoueur, adminRecherche: api.adminRecherche, tchat: api.tchat,
    PSEUDO: PSEUDO, THEMES: THEMES, nombre: nombre, texte: texte, euros: euros, pourcent: pourcent, rang: rang, ilYa: ilYa, date: date, heure: heure,
    peau: peau, el: el, vider: vider, retourSur: retourSur
  }
})()
