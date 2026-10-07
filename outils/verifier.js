// Les règles du site, vérifiées en une seconde : npm run verifier (code 0 : tout est bon)
'use strict'
const fs = require('fs'), path = require('path')
const RACINE = path.join(__dirname, '..'), PAGES = ['index.html', 'commencer.html', 'pirates.html', 'boutique.html', 'merci.html', '404.html']
// les pages qui restent hors de Google et hors du plan du site : la 404, et « Merci » (la page de retour après un achat)
const HORS_GOOGLE = ['404.html', 'merci.html']
// LA BOUTIQUE : js/boutique.config.js ne porte que le jeton PUBLIC de Tebex et des adresses publiques en https (ou rien),
// jamais une clé ; js/boutique.js ne parle qu'à l'API publique de Tebex et n'envoie le joueur que sur sa page de paiement.
// Le jeton public : quelques caractères, un tiret, quarante lettres et chiffres (Tebex, « API Keys », « Public Token »).
const JETON = /^[a-z0-9]{4,6}-[a-f0-9]{40}$/
function verifierBoutique(faute) {
  const f = path.join(RACINE, 'js', 'boutique.config.js')
  if (!fs.existsSync(f)) return faute('js/boutique.config.js manque')
  const bac = {}
  try { new Function('window', fs.readFileSync(f, 'utf8'))(bac) } catch (e) { return faute('js/boutique.config.js ne se lit pas : ' + e.message) }
  const c = bac.CASTERIA_BOUTIQUE
  if (!c || typeof c !== 'object') return faute('js/boutique.config.js ne pose pas CASTERIA_BOUTIQUE')
  for (const k of Object.keys(c)) if (!['jeton', 'adresse', 'cadre', 'hauteurCadre'].includes(k)) faute('js/boutique.config.js : un champ inconnu « ' + k + ' » (une clé n\'a rien à faire ici)')
  const jeton = c.jeton === undefined ? '' : c.jeton
  if (jeton !== '' && (typeof jeton !== 'string' || !JETON.test(jeton))) faute('js/boutique.config.js : « jeton » doit être vide ou le jeton PUBLIC de Tebex (quelques caractères, un tiret, quarante lettres et chiffres) : jamais la « Private Key »')
  for (const k of ['adresse', 'cadre']) if (c[k] !== undefined && c[k] !== '' && !/^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)+(\/[^\s"\'<>]*)?$/i.test(String(c[k]))) faute('js/boutique.config.js : « ' + k + ' » doit être vide ou une adresse https complète')
  // AUCUNE CLÉ dans le dépôt : une longue suite de lettres et de chiffres (32 et plus) ne peut être que la fin du jeton public
  const permis = typeof jeton === 'string' && JETON.test(jeton) ? jeton.split('-')[1] : ''
  const textes = fs.readdirSync(RACINE).filter(n => /\.(html|js|json|md|txt|xml)$/.test(n)).concat(fs.readdirSync(path.join(RACINE, 'js')).map(n => 'js/' + n), fs.readdirSync(path.join(RACINE, 'css')).map(n => 'css/' + n))
  for (const n of textes) {
    if (n === 'package-lock.json') continue
    for (const m of fs.readFileSync(path.join(RACINE, n), 'utf8').match(/[A-Fa-f0-9]{32,}/g) || []) if (m !== permis) faute(n + ' : une suite de ' + m.length + ' lettres et chiffres qui ressemble à une clé (« ' + m.slice(0, 6) + '... ») : aucune clé dans ce dépôt')
  }
  // le script de la boutique : il ne s'adresse qu'à l'API publique de Tebex, n'écrit jamais du texte reçu comme du code de
  // page, et ne quitte le site que pour la page de paiement de Tebex
  const js = fs.readFileSync(path.join(RACINE, 'js', 'boutique.js'), 'utf8')
  for (const u of js.match(/https?:\/\/[^\s'"`)]+/g) || []) if (!u.startsWith('https://headless.tebex.io/')) faute('js/boutique.js : une adresse autre que l\'API de Tebex : ' + u)
  if (/innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(/.test(js)) faute('js/boutique.js : un texte reçu de Tebex ne s\'écrit jamais comme du code de page (textContent seulement)')
  const sorties = js.match(/location\.(assign|replace|href)[^\n]*/g) || []
  if (sorties.length !== 1 || !/location\.assign\(lien\)/.test(sorties[0]) || !js.includes('\\.tebex\\.io\\/')) faute('js/boutique.js : la seule sortie du site doit être la page de paiement de Tebex, vérifiée (« .tebex.io »)')
  if (!/\[A-Za-z0-9_\]\{3,16\}/.test(js)) faute('js/boutique.js : la règle du pseudo du serveur (3 à 16 lettres sans accent, chiffres, tiret du bas) manque')
  if (/Tebex\.checkout/.test(js) && !/if \(incruste\(panier, pseudo\)\) \{[^\n]*return \}[\s\S]{0,300}?window\.location\.assign\(lien\)/.test(js)) faute('js/boutique.js : le paiement par-dessus la page doit garder la redirection vers Tebex en secours, juste après')
  // la page : la mise en garde sur le pseudo, la case qui oblige à relire, le bouton gris au départ
  const page = lire('boutique.html'), merci = lire('merci.html')
  if (c.jeton) {
    for (const [quoi, motif] of [['la mise en garde « Une erreur de pseudo n\'est pas remboursée »', /Une erreur de pseudo n'est pas remboursée/], ['la case « je l\'ai vérifié »', /<input type="checkbox" id="pseudo-sur">/], ['le bouton « Payer » gris au départ', /id="achat-payer" disabled/], ['le champ du pseudo', /<input id="pseudo"/]]) if (!motif.test(page)) faute('boutique.html : ' + quoi + ' manque')
    if (!/Une erreur de pseudo n'est pas remboursée/.test(merci)) faute('merci.html : la phrase sur le remboursement manque')
  }
}
// ---------- deux lecteurs, pour les règles du soir du 05/10 (la hero, les hauteurs, la barre du téléphone) ----------
// Les règles d'une feuille de style : [{ sel, corps, media }]. Les commentaires sont retirés ; @media, @supports et
// @layer sont ouverts (leur intitulé est gardé dans « media ») ; @keyframes et @font-face ne sont pas des règles.
function reglesCss(css) {
  const out = []
  ;(function lireBloc(s, media) {
    let i = 0
    while (i < s.length) {
      const o = s.indexOf('{', i)
      if (o < 0) break
      const tete = s.slice(i, o).trim()
      let p = 1, j = o + 1
      while (j < s.length && p) { if (s[j] === '{') p++; else if (s[j] === '}') p--; j++ }
      const corps = s.slice(o + 1, j - 1)
      if (/^@(media|supports|layer)\b/.test(tete)) lireBloc(corps, (media ? media + ' ' : '') + tete)
      else if (!tete.startsWith('@')) out.push({ sel: tete, corps, media })
      i = j
    }
  })(String(css).replace(/\/\*[\s\S]*?\*\//g, ''), '')
  return out
}
// Ce qu'il y a DANS l'élément <nom> ouvert à l'indice i de la page (jusqu'à sa fermeture, les mêmes balises imbriquées comptées)
function dedans(s, i, nom) {
  const re = new RegExp('<(/?)' + nom + '\\b[^>]*>', 'g')
  re.lastIndex = i
  let p = 0, debut = -1, m
  while ((m = re.exec(s))) {
    if (!m[1]) { if (p === 0) debut = re.lastIndex; p++ } else { p--; if (p <= 0) return debut < 0 ? '' : s.slice(debut, m.index) }
  }
  return debut < 0 ? '' : s.slice(debut)
}
const LIENS_FIGES = 'https://github.com/guerrinflorian/casteria-mc/releases/'
// LE SEUL SCRIPT D'UN AUTRE SERVEUR admis sur tout le site : celui du paiement de Tebex, UNE version figée, sur la page de
// la boutique seulement, chargé sans bloquer la page (defer). Toute autre adresse, toute autre version, toute autre page :
// refusé, comme avant.
const TEBEX_JS = 'https://js.tebex.io/v/1.11.0.js'
// le domaine du site : celui que outils/domaine.js a écrit dans robots.txt ; et le plan du site
const lire = f => { try { return fs.readFileSync(path.join(RACINE, f), 'utf8') } catch (e) { return '' } }
const DOMAINE = (lire('robots.txt').match(/^Sitemap: (https:\/\/[^/\s]+)\/sitemap\.xml$/m) || [])[1] || '', PLAN = lire('sitemap.xml')
let fautes = 0
const faute = (m) => { fautes++; console.log('  FAUTE : ' + m) }
const TIRETS = [String.fromCharCode(0x2014), String.fromCharCode(0x2013)]

for (const page of PAGES) {
  const s = fs.readFileSync(path.join(RACINE, page), 'utf8')
  console.log(page)
  const h1 = (s.match(/<h1[\s>]/g) || []).length
  if (h1 !== 1) faute('il faut un seul h1, il y en a ' + h1)
  if (!/<title>[^<]{20,70}<\/title>/.test(s.replace(/<title>([^<]*)<\/title>/, (m, t) => '<title>' + t.slice(0, 70) + '</title>'))) faute('le titre manque')
  const titre = (s.match(/<title>([^<]*)<\/title>/) || [])[1] || ''
  if (titre.length > 90) faute('le titre fait ' + titre.length + ' caractères (90 au plus)')
  const desc = (s.match(/<meta name="description" content="([^"]*)"/) || [])[1] || ''
  if (desc.length < 80 || desc.length > 260) faute('la description fait ' + desc.length + ' caractères (entre 80 et 260)')
  if (!/<html lang="fr">/.test(s)) faute('la langue de la page manque')
  for (const img of s.match(/<img\b[^>]*>/g) || []) if (!/\balt="/.test(img)) faute('une image sans texte : ' + img.slice(0, 80))
  for (const t of TIRETS) if (s.includes(t)) faute('un tiret long ou moyen')
  // les niveaux de titres : jamais un h3 avant le premier h2
  const titres = (s.match(/<h[1-6][\s>]/g) || []).map(x => +x[2])
  titres.forEach((n, i) => { if (i && n > titres[i - 1] + 1) faute('un titre saute un niveau (h' + titres[i - 1] + ' puis h' + n + ')') })
  // les fichiers du site cités par la page existent
  const cites = new Set()
  for (const m of s.matchAll(/(?:src|href|poster|data-src)="([^"#?]+)[^"]*"/g)) cites.add(m[1])
  for (const c of cites) {
    if (DOMAINE && c.startsWith(DOMAINE + '/')) { if (!fs.existsSync(path.join(RACINE, c.slice(DOMAINE.length)))) faute('une adresse du site qui n\'existe pas : ' + c); continue }
    if (c === TEBEX_JS && page === 'boutique.html') { if (!s.includes('<script defer src="' + TEBEX_JS + '"></script>')) faute('boutique.html : le script de Tebex doit s\'écrire <script defer src="' + TEBEX_JS + '"></script>, tel quel'); continue }
    if (/^(https?:)?\/\//.test(c)) { if (!c.startsWith(LIENS_FIGES)) faute('un lien vers ailleurs que la release du launcher : ' + c); continue }
    if (/^(mailto:|data:)/.test(c)) continue
    if (!fs.existsSync(path.join(RACINE, c))) faute('un fichier cité n\'existe pas : ' + c)
  }
  // aucun mot qui dise que le serveur n'est pas ouvert (le propriétaire, 05/10 : le site parle d'un serveur où l'on joue)
  const visible = s.replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/g, '')
  // (le mot entier : « tu le découvriras » n'est pas « ouvrira »)
  for (const mot of ['en développement', 'bientôt', 'pas encore ouvert', 'ouvrira', "jour de l'ouverture"]) if (new RegExp('(^|[^a-zà-ÿ])' + mot, 'i').test(visible)) faute('un mot interdit : « ' + mot + ' »')
  // LE CONTRASTE : on suit le fond en descendant dans la page. Une section sombre (sombre, mer, heros, page-tete, le pied)
  // demande un texte clair ; le parchemin (clair, et les îlots carte, volet, cadre-bois, tebex, tableau) un texte sombre. Une couleur
  // écrite dans la page doit aller avec le fond où elle tombe.
  {
    const SOMBRES = ['sombre', 'mer', 'heros', 'page-tete', 'chiffres', 'barre'], CLAIRS = ['clair', 'carte', 'volet', 'cadre-bois', 'tebex', 'tableau']
    const ENCRES = ['--encre', '--bois-fonce', '--encre-douce', '--bois)'], LUMIERES = ['#fff', '--or-clair', '--parchemin', '--violet-clair']
    const VIDES = new Set(['img', 'br', 'meta', 'link', 'input', 'source', 'hr', 'path', 'rect', 'circle'])
    const pile = [{ nom: 'html', fond: 'sombre' }]
    for (const m of visible.matchAll(/<(\/?)([a-zA-Z0-9]+)([^>]*)>/g)) {
      const nom = m[2].toLowerCase(), attrs = m[3]
      if (m[1]) { for (let i = pile.length - 1; i > 0; i--) if (pile[i].nom === nom) { pile.length = i; break } continue }
      let fond = pile[pile.length - 1].fond
      const classes = ((attrs.match(/class="([^"]*)"/) || [])[1] || '').split(/\s+/)
      if (nom === 'footer' || classes.some(c => SOMBRES.includes(c))) fond = 'sombre'
      if (classes.some(c => CLAIRS.includes(c))) fond = 'clair'
      const style = (attrs.match(/style="([^"]*)"/) || [])[1] || '', couleur = (style.match(/(?:^|;)\s*color:\s*([^;]+)/) || [])[1] || ''
      if (couleur && fond === 'sombre' && ENCRES.some(e => couleur.includes(e))) faute('un texte sombre sur un fond sombre : <' + nom + ' ' + attrs.trim().slice(0, 60) + '>')
      if (couleur && fond === 'clair' && LUMIERES.some(e => couleur.includes(e))) faute('un texte clair sur le parchemin : <' + nom + ' ' + attrs.trim().slice(0, 60) + '>')
      if (!VIDES.has(nom) && !/\/\s*$/.test(attrs)) pile.push({ nom, fond })
    }
  }
  // une vidéo ne se charge jamais d'office (preload="none", jamais de src : data-src, que js/site.js ouvre quand elle
  // paraît) ; elle est muette, elle joue dans la page sur un téléphone, et elle a son affiche (le visiteur voit une image
  // tout de suite, sans rien télécharger de lourd)
  const nu = s.replace(/<!--[\s\S]*?-->/g, '')
  for (const v of nu.match(/<video\b[^>]*>/g) || []) {
    if (!/preload="none"/.test(v) || /\ssrc="/.test(v)) faute('une vidéo se chargerait sans attendre : ' + v.slice(0, 70))
    for (const [mot, motif] of [['muted', /\smuted(?=[\s>=])/], ['playsinline', /\splaysinline(?=[\s>=])/], ['poster', /\sposter="[^"]+"/]]) if (!motif.test(v)) faute('une vidéo sans « ' + mot + ' » : ' + v.slice(0, 70))
  }
  // AUCUNE IMAGE NI VIDÉO PLUS HAUTE QU'UN ÉCRAN (le propriétaire, 05/10) : la feuille de style porte la règle garde
  // (vérifiée plus bas) ; ici : aucune hauteur écrite en style, dans la page, sur une image ou une vidéo
  for (const b of nu.match(/<(?:img|video|picture)\b[^>]*>/g) || []) {
    const st = (b.match(/\sstyle="([^"]*)"/) || [])[1] || ''
    if (/(^|;|\s)(max-|min-)?height\s*:/.test(st)) faute('une hauteur écrite en style sur une image ou une vidéo (la feuille de style seule en décide) : ' + b.slice(0, 90))
  }
  // LA HERO de chaque page (sauf la 404 et « Merci ») : <section class="heros vitrine-tete ...">, avec son fond (une image,
  // ou une vidéo et son affiche) et sa scène (les choses du jeu en volume : au moins une image). Sur un téléphone aussi :
  // la feuille de style ne les cache jamais (vérifié plus bas).
  if (!HORS_GOOGLE.includes(page)) {
    const h = nu.search(/<section class="heros vitrine-tete(?:\s[^"]*)?"/)
    if (h < 0) faute('la hero manque : <section class="heros vitrine-tete ...">')
    else {
      const sec = dedans(nu, h, 'section'), f = sec.search(/<div class="fond(?:\s[^"]*)?"/), sc = sec.search(/<div class="scene(?:\s[^"]*)?"/)
      const fond = f < 0 ? '' : dedans(sec, f, 'div'), scene = sc < 0 ? '' : dedans(sec, sc, 'div')
      if (!(/<img\b/.test(fond) || /<video\b[^>]*\sposter="[^"]+"/.test(fond))) faute('la hero : <div class="fond"> doit porter une image, ou une vidéo avec son affiche')
      // (07/10, l'accueil refait : « plus de photos adapté au vrai jeu ») la scène peut aussi être de vraies boucles du jeu,
      // chacune avec son affiche
      if (!/<img\b/.test(scene) && !/<video\b[^>]*\sposter="[^"]+"/.test(scene)) faute('la hero : <div class="scene"> doit porter au moins une image ou une vidéo avec son affiche (les choses du jeu)')
    }
  }
  // PLUS DE BARRE AU PIED DE L'ÉCRAN DU TÉLÉPHONE (le propriétaire, 07/10 : « la barre sur mobile en bas c'est
  // affreux ») ; l'ancien bouton du menu n'existe plus non plus
  {
    if (/<nav class="barre-jeu"/.test(nu)) faute('la barre du pied de l\'écran du téléphone (<nav class="barre-jeu">) est revenue')
    if (/<button class="menu"/.test(nu)) faute('l\'ancien bouton du menu (<button class="menu">) est encore là')
  }
  // LES CARROUSELS (css/carrousel.css, js/carrousel.js) : une des trois sortes, au moins deux vues, et la page charge
  // la feuille et le script
  {
    const tous = [...nu.matchAll(/<div\b[^>]*\sdata-carrousel="([^"]*)"[^>]*>/g)]
    for (const m of tous) {
      if (!['defile', 'glisse', 'pile'].includes(m[1])) faute('un carrousel d\'une sorte inconnue : data-carrousel="' + m[1] + '" (defile, glisse ou pile)')
      if ((dedans(nu, m.index, 'div').match(/<figure class="vue[\s"]/g) || []).length < 2) faute('un carrousel « ' + m[1] + ' » de moins de deux <figure class="vue">')
    }
    if (tous.length && (!/<link rel="stylesheet" href="\/?css\/carrousel\.css">/.test(nu) || !/<script src="\/?js\/carrousel\.js" defer><\/script>/.test(nu))) faute('la page a un carrousel sans charger css/carrousel.css et js/carrousel.js (defer)')
  }
  // LE RÉFÉRENCEMENT : chaque page dit son adresse complète (la même que dans sitemap.xml) et son image de partage.
  // La page 404, elle, demande à rester hors de Google, et cite ses fichiers depuis la racine (elle s'affiche à toute adresse).
  if (HORS_GOOGLE.includes(page)) {
    if (!/<meta name="robots" content="noindex">/.test(s)) faute('la page ' + page + ' doit porter noindex')
    if (page === '404.html' && /(?:src|href)="(?![/#]|https?:)/.test(s)) faute('la page 404 cite un fichier sans partir de la racine (« / »)')
    if (PLAN.includes('/' + page + '</loc>')) faute('sitemap.xml ne doit pas citer ' + page)
  } else if (DOMAINE) {
    const adresse = DOMAINE + '/' + (page === 'index.html' ? '' : page)
    if (!s.includes('<link rel="canonical" href="' + adresse + '">')) faute('l\'adresse de la page (canonical) devrait être ' + adresse)
    if (!s.includes('<meta property="og:url" content="' + adresse + '">')) faute('og:url devrait être ' + adresse)
    const image = (s.match(/<meta property="og:image" content="([^"]*)"/) || [])[1] || ''
    if (!image.startsWith(DOMAINE + '/') || !fs.existsSync(path.join(RACINE, image.slice(DOMAINE.length)))) faute('l\'image de partage (og:image) doit être une adresse complète du site, vers un fichier qui existe')
    if (!/<meta name="twitter:card" content="summary_large_image">/.test(s)) faute('la carte de partage (twitter:card) manque')
    if (/<meta name="robots" content="[^"]*noindex/.test(s)) faute('la page demande à rester hors de Google (noindex)')
    if (!PLAN.includes('<loc>' + adresse + '</loc>')) faute('sitemap.xml ne cite pas ' + adresse)
  }
  for (const m of s.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]) } catch (e) { faute('un bloc JSON-LD est mal écrit : ' + e.message) }
    for (const a of m[1].match(/https:\/\/[^"/]+/g) || []) if (a !== DOMAINE && a !== 'https://schema.org') faute('une adresse d\'un autre domaine dans le bloc JSON-LD : ' + a)
  }
}
// le domaine est écrit, et le plan du site cite les pages, rien de plus
console.log('robots.txt, sitemap.xml')
if (!DOMAINE) faute('le domaine manque : node outils/domaine.js https://ton-domaine.fr')
else if ((PLAN.match(/<loc>/g) || []).length !== PAGES.length - HORS_GOOGLE.length) faute('sitemap.xml doit citer ' + (PAGES.length - HORS_GOOGLE.length) + ' pages (relance outils/domaine.js)')
// les îlots de parchemin portent leur propre fond et leur encre (sinon, posés dans une section sombre, ils ne se lisent pas)
{
  const css = fs.readFileSync(path.join(RACINE, 'css', 'style.css'), 'utf8')
  const bloc = sel => { const i = css.indexOf('\n' + sel + ' {'); return i < 0 ? '' : css.slice(i, css.indexOf('}', i)) }
  console.log('css/style.css')
  for (const sel of ['.carte', '.volet']) { const b = bloc(sel); if (!/background:/.test(b) || !/color:/.test(b)) faute(sel + ' doit porter son fond de parchemin et sa couleur d\'encre') }
  if (!/\.cadre-bois > \* \{[^}]*background:/.test(css)) faute('.cadre-bois > * doit porter son fond de parchemin')
  for (const sel of ['.sombre', '.mer']) if (!/color:\s*#[EeFf]/.test(bloc(sel))) faute(sel + ' doit donner une couleur de texte claire')
  // AUCUNE IMAGE NI VIDÉO PLUS HAUTE QU'UN ÉCRAN (le propriétaire, 05/10) : la règle garde, telle quelle, et rien qui la
  // défasse : sur une image ou une vidéo (le sujet du sélecteur), jamais « max-height: none », jamais une hauteur de
  // plus de 900 px ni de plus d'un écran (100vh). Une image agrandie par une animation dans un cadre qui la rogne (le
  // fond d'une hero) n'est pas mesurée ici.
  const GARDE = 'main img, main video { max-height: 100svh; }'
  if (!css.includes(GARDE)) faute('la règle garde manque, telle quelle : ' + GARDE)
  const regles = reglesCss(css).map(r => Object.assign({ f: 'css/style.css' }, r)).concat(reglesCss(lire('css/carrousel.css')).map(r => Object.assign({ f: 'css/carrousel.css' }, r)))
  for (const r of regles) {
    const sels = r.sel.split(',').map(x => x.trim()), ou = r.f + ', « ' + r.sel.slice(0, 70) + ' »' + (r.media ? ' (' + r.media + ')' : '')
    if (sels.some(x => /(^|[\s>+~])(img|video|picture)(?![\w-])[^\s>+~]*$/.test(x))) {
      if (/max-height\s*:\s*none/.test(r.corps)) faute(ou + ' : « max-height: none » sur une image ou une vidéo défait la règle garde')
      for (const m of r.corps.matchAll(/(?:^|;|\s)(?:min-)?height\s*:\s*(\d+(?:\.\d+)?)(px|vh|svh|dvh|lvh)/g)) {
        if (m[2] === 'px' ? +m[1] > 900 : +m[1] > 100) faute(ou + ' : une image ou une vidéo de ' + m[1] + m[2] + ' de haut (900 px, un écran au plus)')
      }
    }
    // LA HERO SUR UN TÉLÉPHONE : son fond et sa scène ne sont jamais cachés, dans aucune requête de largeur
    if (sels.some(x => /\.(fond|scene)(?![\w-])(:[\w-]+(\([^)]*\))?)*$/.test(x)) && /display\s*:\s*none|visibility\s*:\s*hidden/.test(r.corps)) faute(ou + ' : le fond ou la scène d\'une hero est caché')
  }
}
for (const f of ['css/style.css', 'css/carrousel.css', 'js/site.js', 'js/carrousel.js', 'js/boutique.js', 'js/boutique.config.js', 'README.md', 'serveur.js']) {
  const s = fs.readFileSync(path.join(RACINE, f), 'utf8')
  for (const t of TIRETS) if (s.includes(t)) { console.log(f); faute('un tiret long ou moyen') }
}
// le poids : rien de lourd ne part dans le dépôt
let total = 0
;(function peser(d) {
  for (const n of fs.readdirSync(d)) {
    const p = path.join(d, n), st = fs.statSync(p)
    if (st.isDirectory()) { if (!['.git', 'node_modules', 'captures'].includes(n)) peser(p); continue }
    total += st.size
    if (st.size > 5 * 1024 * 1024) faute('un fichier de plus de 5 Mo : ' + path.relative(RACINE, p))
  }
})(RACINE)
console.log('js/boutique.config.js')
verifierBoutique(faute)
console.log('le site pèse ' + (total / 1048576).toFixed(1) + ' Mo')
console.log(fautes ? fautes + ' faute(s)' : 'tout est bon')
process.exit(fautes ? 1 : 0)
