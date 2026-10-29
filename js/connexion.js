// LA CONNEXION (connexion.html ; le prototype du 29/10/2026) : le pseudo EXACT et le mot de passe du jeu, envoyés par
// CasteriaApi.connexion (POST /api/connexion, API.md 1.4). Le mot de passe ne sort que dans le corps de cette demande :
// jamais dans l'adresse, jamais dans un journal ni dans la console, jamais gardé par la page. Les erreurs sont dites
// simplement (pseudo inconnu, la casse, mot de passe faux, trop d'essais, le site qui ne répond pas). Après la connexion :
// la page d'où l'on venait (?retour=, une page du site seulement), sinon le compte.
(function () {
  'use strict'
  var A = window.CasteriaApi
  var form = document.getElementById('connexion'), pseudo = document.getElementById('pseudo'), mdp = document.getElementById('mot-de-passe')
  var voir = document.getElementById('voir-mdp'), erreur = document.getElementById('connexion-erreur'), envoyer = document.getElementById('connexion-envoyer')
  if (!A || !form || !pseudo || !mdp || !erreur || !envoyer) return
  var el = A.el, vider = A.vider
  var retour = A.retourSur(new URLSearchParams(location.search).get('retour'))
  var enCours = false, attenteFin = 0, minuteur = 0
  var PHRASES = {
    requete: 'Écris ton pseudo et ton mot de passe.',
    inconnu: 'Aucun compte à ce pseudo. Inscris-toi d\'abord en jeu avec /register.',
    mot_de_passe: 'Mot de passe incorrect : c\'est celui que tu tapes en jeu après /login.',
    indisponible: 'Le site ne répond pas pour l\'instant. Réessaie dans un instant.',
    origine: 'Le site ne répond pas pour l\'instant. Réessaie dans un instant.'
  }

  // en essai : les comptes d'essai et leur mot de passe, dits sur la page (jamais sur le vrai site)
  if (A.essai) {
    var e = el('div', 'essai-comptes')
    e.appendChild(el('b', '', 'Mode essai'))
    e.appendChild(document.createTextNode(' : connecte-toi avec un pseudo inventé, par exemple '))
    e.appendChild(el('code', '', 'Bricolune'))
    e.appendChild(document.createTextNode(' (une joueuse), ou '))
    e.appendChild(el('code', '', 'Gardien_Oryx'))
    e.appendChild(document.createTextNode(' (un Admin : l\'espace de l\'équipe), ou '))
    e.appendChild(el('code', '', 'Basilic_Vert'))
    e.appendChild(document.createTextNode(' (un joueur banni : son compte avec sa sanction), et le mot de passe '))
    e.appendChild(el('code', '', A.motDePasseEssai))
    e.appendChild(document.createTextNode('.'))
    // au bas du formulaire : rien ne saute dans la page quand il arrive (Lighthouse, 29/10)
    form.appendChild(e)
  }

  function dire(texte, champ) {
    vider(erreur)
    erreur.appendChild(document.createTextNode(texte))
    erreur.hidden = false
    if (champ) { champ.setAttribute('aria-invalid', 'true'); champ.focus() }
  }
  function taire() { erreur.hidden = true; vider(erreur); pseudo.removeAttribute('aria-invalid'); mdp.removeAttribute('aria-invalid') }

  // le mot de passe montré ou caché (le bouton dit ce qu'il fera)
  if (voir) voir.addEventListener('click', function () {
    var montre = mdp.type === 'password'
    mdp.type = montre ? 'text' : 'password'
    voir.textContent = montre ? 'Cacher' : 'Voir'
    voir.setAttribute('aria-pressed', montre ? 'true' : 'false')
    mdp.focus()
  })
  pseudo.addEventListener('input', function () { if (!erreur.hidden) taire() })
  mdp.addEventListener('input', function () { if (!erreur.hidden && !attenteFin) taire() })

  // trop d'essais : le bouton attend, il compte les secondes
  function attendre(secondes) {
    attenteFin = Date.now() + secondes * 1000
    clearInterval(minuteur)
    function pas() {
      var reste = Math.ceil((attenteFin - Date.now()) / 1000)
      if (reste <= 0) { clearInterval(minuteur); attenteFin = 0; envoyer.disabled = false; envoyer.textContent = 'Se connecter'; return }
      envoyer.disabled = true; envoyer.textContent = 'Réessaie dans ' + reste + String.fromCharCode(160) + 's'
    }
    pas(); minuteur = setInterval(pas, 1000)
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault()
    if (enCours || attenteFin) return
    taire()
    var p = pseudo.value.trim(), m = mdp.value
    if (!p || !m) return dire(PHRASES.requete, p ? mdp : pseudo)
    if (!A.PSEUDO.test(p)) return dire(/\s/.test(p) ? 'Aucune espace dans un pseudo.' : 'Un pseudo fait de 3 à 16 caractères : des lettres sans accent, des chiffres et le tiret du bas _.', pseudo)
    enCours = true; envoyer.disabled = true; envoyer.textContent = 'On vérifie...'
    A.connexion(p, m).then(function (r) {
      enCours = false
      if (r.statut === 200 && r.corps.ok) { envoyer.textContent = 'Connecté !'; mdp.value = ''; location.assign(retour); return }
      envoyer.disabled = false; envoyer.textContent = 'Se connecter'
      var code = r.corps && r.corps.erreur
      if (code === 'trop_d_essais') { dire('Trop d\'essais : réessaie dans une minute.'); attendre(Math.max(1, Number(r.corps.reessayer_dans) || 60)); return }
      if (code === 'casse' && A.PSEUDO.test(String(r.corps.pseudo_exact || ''))) {
        var exact = String(r.corps.pseudo_exact)
        dire('Ton pseudo s\'écrit ' + exact + ' : les majuscules comptent.', pseudo)
        var b = el('button', 'bouton bouton-bois petit', 'Écrire ' + exact)
        b.type = 'button'
        b.addEventListener('click', function () { pseudo.value = exact; taire(); mdp.focus() })
        erreur.appendChild(el('br')); erreur.appendChild(b)
        return
      }
      if (code === 'mot_de_passe') { dire(PHRASES.mot_de_passe, mdp); mdp.select(); return }
      if (code === 'inconnu') { dire(PHRASES.inconnu, pseudo); return }
      dire(PHRASES[code] || PHRASES.indisponible)
    })
  })

  // déjà connecté : la page le dit, et propose le compte ou la déconnexion
  A.moi().then(function (r) {
    if (r.statut !== 200 || !r.corps || !r.corps.pseudo) return
    var zone = el('div', 'deja-connecte'), h = el('h2', '', 'Tu es connecté')
    zone.appendChild(h)
    zone.appendChild(el('p', '', 'En tant que ' + String(r.corps.pseudo) + '.'))
    var a = el('a', 'bouton bouton-or grand', 'Mon compte'); a.href = 'compte.html'
    var d = el('button', 'bouton bouton-bois', 'Se déconnecter'); d.type = 'button'
    d.addEventListener('click', function () { A.deconnexion().then(function () { location.reload() }) })
    var gestes = el('p', 'gestes'); gestes.appendChild(a); gestes.appendChild(d)
    zone.appendChild(gestes)
    form.hidden = true
    form.parentNode.insertBefore(zone, form)
  })
})()
