// LA BOUTIQUE : les packs de crédits, lus EN DIRECT chez Tebex à chaque visite (l'API publique « Headless »), puis
// l'achat : le pseudo du joueur, relu et confirmé, un panier créé chez Tebex, et le joueur envoyé sur la page de
// paiement de Tebex. AUCUN paiement ni aucune donnée de carte ne passe par ce site.
// Le seul réglage : le jeton PUBLIC de la boutique, dans js/boutique.config.js.
(function () {
  'use strict'
  var c = window.CASTERIA_BOUTIQUE || {}
  var bloc = document.getElementById('tebex'), actions = document.getElementById('tebex-actions'), place = document.getElementById('tebex-cadre')
  if (!bloc || !actions || !place) return
  var API = 'https://headless.tebex.io/api'
  // le pseudo d'un joueur de Casteria : la règle du launcher (3 à 16 lettres sans accent, chiffres, tiret du bas)
  var PSEUDO = /^[A-Za-z0-9_]{3,16}$/
  // seulement une adresse https complète : rien d'autre n'entre dans la page
  function sure(u) { return typeof u === 'string' && /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)+(\/[^\s"'<>]*)?$/i.test(u) ? u : '' }
  var jeton = typeof c.jeton === 'string' && /^[a-z0-9]{4,6}-[a-f0-9]{40}$/.test(c.jeton) ? c.jeton : ''
  var packsEl = document.getElementById('packs'), form = document.getElementById('achat')

  // ---------- sans jeton : l'ancien branchement (un bouton vers une boutique Tebex, un cadre incrusté), ou rien ----------
  if (!jeton || !packsEl || !form) {
    if (packsEl) packsEl.hidden = true
    var adresse = sure(c.adresse), cadre = sure(c.cadre)
    if (!adresse && !cadre) return
    var a = document.createElement('a')
    a.className = 'bouton bouton-or grand'; a.href = adresse || cadre; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Ouvrir la boutique'
    actions.insertBefore(a, actions.firstChild)
    if (cadre) {
      var f = document.createElement('iframe')
      f.src = cadre; f.title = 'La boutique de Casteria'; f.loading = 'lazy'; f.setAttribute('allow', 'payment')
      f.style.height = Math.max(400, Math.min(3000, Number(c.hauteurCadre) || 900)) + 'px'
      place.appendChild(f); place.hidden = false
    }
    return
  }

  function el(nom, classe, texte) { var e = document.createElement(nom); if (classe) e.className = classe; if (texte !== undefined) e.textContent = texte; return e }
  // « 5,99 € », à la française, dans la monnaie que dit Tebex
  function prix(p) {
    try { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: p.currency || 'EUR' }).format(p.total_price) } catch (e) { return String(p.total_price).replace('.', ',') + ' ' + (p.currency || '') }
  }
  var champ = document.getElementById('pseudo'), lettres = document.getElementById('pseudo-lettres'), relire = document.getElementById('relire')
  var sur = document.getElementById('pseudo-sur'), payer = document.getElementById('achat-payer'), retour = document.getElementById('achat-retour')
  var erreurPseudo = document.getElementById('pseudo-erreur'), erreurAchat = document.getElementById('achat-erreur'), titrePack = document.getElementById('achat-pack')
  var choisi = null, enCours = false, dernier = ''

  // ---------- les packs ----------
  function etat(texte, reessayer) {
    packsEl.textContent = ''
    var p = el('p', 'packs-etat', texte); p.id = 'packs-etat'; packsEl.appendChild(p)
    if (reessayer) { var b = el('button', 'bouton bouton-bois', 'Réessayer'); b.type = 'button'; b.addEventListener('click', charger); packsEl.appendChild(b) }
  }
  function panne() { form.hidden = true; etat('La boutique revient dans un instant.', true) }
  // les crédits d'un pack, lus dans son nom (« 400 crédits ») : 0 si son nom n'en dit pas ; et ses crédits par euro
  function credits(p) { var m = /(\d[\d \u00A0\u202F.]*)\s*cr[ée]dits?/i.exec(String(p.name || '')); return m ? parseInt(m[1].replace(/\D/g, ''), 10) || 0 : 0 }
  function taux(p) { return p.total_price > 0 ? credits(p) / p.total_price : 0 }
  // marque : 'meilleur' (le plus de crédits par euro), 'milieu' (le pack du milieu de l'étal) ou '' ; bonus : ses
  // crédits par euro en plus de ceux du plus petit pack, en pour cent (0 : rien à dire)
  function carte(p, marque, bonus) {
    var art = el('article', 'pack' + (marque ? ' ' + marque : ''))
    if (marque) art.appendChild(el('p', 'pack-marque', marque === 'meilleur' ? 'Le meilleur prix' : 'Le juste milieu'))
    // l'image du pack : sa place est réservée (un crédit dessiné dessous), elle se charge tout de suite ; si elle manque
    // ou ne répond pas, le crédit dessiné reste
    var cadre = el('div', 'pack-image'), img = sure(p.image)
    if (img) {
      var i = el('img'); i.alt = 'Le pack ' + p.name; i.width = 160; i.height = 160; i.decoding = 'async'
      i.addEventListener('error', function () { if (i.parentNode) i.parentNode.removeChild(i) })
      i.src = img; cadre.appendChild(i)
    }
    art.appendChild(cadre)
    art.appendChild(el('h4', '', p.name))
    art.appendChild(el('p', 'pack-prix', prix(p)))
    if (p.sales_tax > 0) art.appendChild(el('p', 'pack-taxe', 'TVA comprise'))
    if (bonus > 0) art.appendChild(el('p', 'pack-bonus', bonus + ' % de crédits en plus'))
    // la grande carte : trois vignettes de ce qu'on s'offre (nos rendus, assets/boutique), sans rien chiffrer
    if (marque === 'meilleur') {
      var v = el('p', 'pack-offre')
      ;['phenix', 'wyverne', 'caisse'].forEach(function (n) { var i = el('img'); i.alt = ''; i.width = 86; i.height = 86; i.loading = 'lazy'; i.src = 'assets/boutique/' + n + '.png'; v.appendChild(i) })
      art.appendChild(v)
      art.appendChild(el('p', 'pack-offre-mot', 'Familiers, montures, clés : à toi de choisir'))
    }
    var b = el('button', 'bouton bouton-or', 'Acheter'); b.type = 'button'
    b.setAttribute('aria-label', 'Acheter le pack ' + p.name + ' : ' + prix(p))
    b.addEventListener('click', function () { choisir(p, art) })
    art.appendChild(b)
    return art
  }
  function charger() {
    etat('On ouvre les coffres...')
    var fin = typeof AbortController === 'function' ? new AbortController() : null
    var minuteur = setTimeout(function () { if (fin) fin.abort() }, 12000)
    fetch(API + '/accounts/' + jeton + '/categories?includePackages=1', { headers: { Accept: 'application/json' }, signal: fin ? fin.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error('refus'); return r.json() })
      .then(function (j) {
        clearTimeout(minuteur)
        var vus = {}, packs = []
        ;(j && Array.isArray(j.data) ? j.data : []).forEach(function (cat) {
          (cat && Array.isArray(cat.packages) ? cat.packages : []).forEach(function (p) {
            if (!p || vus[p.id] || typeof p.name !== 'string' || typeof p.total_price !== 'number' || !isFinite(p.total_price)) return
            vus[p.id] = 1; packs.push(p)
          })
        })
        if (!packs.length) return panne()
        // du moins cher au plus cher
        packs.sort(function (x, y) { return x.total_price - y.total_price })
        packsEl.textContent = ''
        // la vitrine : le meilleur prix (le plus de crédits par euro) et le juste milieu, calculés sur les prix lus
        var base = taux(packs[0]), meilleur = null
        packs.forEach(function (p) { if (taux(p) > base && (!meilleur || taux(p) > taux(meilleur))) meilleur = p })
        var milieu = packs.length >= 3 ? packs[Math.floor(packs.length / 2)] : null
        if (milieu === meilleur) milieu = null
        packs.forEach(function (p) {
          packsEl.appendChild(carte(p, p === meilleur ? 'meilleur' : (p === milieu ? 'milieu' : ''), base > 0 && taux(p) > base ? Math.round((taux(p) / base - 1) * 100) : 0))
        })
      })
      .catch(function () { clearTimeout(minuteur); panne() })
  }

  // ---------- le pseudo : écrit, relu lettre par lettre, confirmé ----------
  function choisir(p, art) {
    choisi = p
    Array.prototype.forEach.call(packsEl.querySelectorAll('.pack'), function (x) { x.classList.toggle('choisi', x === art) })
    titrePack.textContent = 'Le pack ' + p.name + ' : ' + prix(p) + (p.sales_tax > 0 ? ', TVA comprise' : '')
    payer.textContent = 'Payer ' + prix(p)
    form.hidden = false
    erreurAchat.hidden = true
    try { if (!champ.value) champ.value = sessionStorage.getItem('casteria_pseudo') || '' } catch (e) {}
    relu()
    try { form.scrollIntoView({ behavior: 'smooth', block: 'center' }) } catch (e) { form.scrollIntoView() }
    try { champ.focus({ preventScroll: true }) } catch (e) { champ.focus() }
  }
  function relu() {
    var v = champ.value, bon = PSEUDO.test(v)
    // le pseudo a changé : la case se décoche, il faut le relire
    if (v !== dernier) { sur.checked = false; dernier = v }
    lettres.textContent = ''
    for (var k = 0; k < v.length; k++) {
      var ch = v.charAt(k), classe = /[A-Z]/.test(ch) ? 'maj' : (/[0-9]/.test(ch) ? 'chiffre' : (/[a-z_]/.test(ch) ? '' : 'faux'))
      lettres.appendChild(el('span', classe, ch === ' ' ? String.fromCharCode(160) : ch))
    }
    relire.hidden = !v
    if (v && !bon) {
      erreurPseudo.textContent = /\s/.test(v) ? 'Aucune espace dans un pseudo, ni avant ni après.' : (v.length < 3 ? 'Un pseudo fait au moins 3 caractères.' : 'Un pseudo fait de 3 à 16 caractères : des lettres sans accent, des chiffres et le tiret du bas _.')
      erreurPseudo.hidden = false
    } else erreurPseudo.hidden = true
    sur.disabled = !bon
    payer.disabled = !(bon && sur.checked && choisi && !enCours)
  }
  champ.addEventListener('input', relu)
  sur.addEventListener('change', relu)
  retour.addEventListener('click', function () {
    form.hidden = true; choisi = null
    Array.prototype.forEach.call(packsEl.querySelectorAll('.pack'), function (x) { x.classList.remove('choisi') })
    try { packsEl.scrollIntoView({ behavior: 'smooth', block: 'center' }) } catch (e) {}
  })

  // ---------- le panier chez Tebex, puis sa page de paiement ----------
  function envoyer(adresse, corps) {
    return fetch(adresse, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(corps) })
      .then(function (r) { return r.json().catch(function () { return null }).then(function (j) { if (!r.ok || !j || !j.data) throw new Error('refus'); return j.data }) })
  }
  function echec(texte) { enCours = false; erreurAchat.textContent = texte; erreurAchat.hidden = false; payer.textContent = 'Payer ' + prix(choisi); relu() }
  form.addEventListener('submit', function (ev) {
    ev.preventDefault()
    var pseudo = champ.value
    if (enCours || !choisi || !PSEUDO.test(pseudo) || !sur.checked) return relu()
    enCours = true; erreurAchat.hidden = true; payer.disabled = true; payer.textContent = 'On prépare ton panier...'
    try { sessionStorage.setItem('casteria_pseudo', pseudo) } catch (e) {}
    // les deux pages de retour : « Merci » après le paiement, la boutique si le joueur renonce
    var canon = document.querySelector('link[rel="canonical"]')
    var origine = location.protocol === 'https:' ? location.origin : (canon ? new URL(canon.href).origin : location.origin)
    envoyer(API + '/accounts/' + jeton + '/baskets', { complete_url: origine + '/merci.html', cancel_url: origine + '/boutique.html#acheter', complete_auto_redirect: true, username: pseudo })
      .then(function (panier) {
        // Tebex doit avoir noté CE pseudo, à la majuscule près : sinon on s'arrête là
        if (panier.username !== pseudo || typeof panier.ident !== 'string') throw new Error('pseudo')
        return envoyer(API + '/baskets/' + encodeURIComponent(panier.ident) + '/packages', { package_id: choisi.id, quantity: 1 })
      })
      .then(function (panier) {
        var lien = panier.links && panier.links.checkout
        // seulement la page de paiement de Tebex
        if (typeof lien !== 'string' || !/^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.tebex\.io\/[^\s"'<>]*$/i.test(lien)) throw new Error('lien')
        window.location.assign(lien)
      })
      .catch(function () { echec('Le panier n\'a pas pu se créer. Vérifie ton pseudo, puis réessaie dans un instant.') })
  })
  // revenu de la page de paiement par « Précédent » : le bouton se réveille
  window.addEventListener('pageshow', function () { if (enCours) { enCours = false; if (choisi) payer.textContent = 'Payer ' + prix(choisi); relu() } })

  charger()
})()
