// LE VÉRIFICATEUR MORD-IL ? Chaque mutant abîme UN fichier du site, et outils/verifier.js doit le refuser (code 1).
//   node outils/mutants.js          (code 0 : tous les mutants sont refusés)
// LES MUTANTS NE TOUCHENT JAMAIS AU SITE LUI-MÊME : ils jouent sur une COPIE faite dans le dossier temporaire de la machine
// (les images et les vidéos y sont des liens, pas des copies), effacée à la fin. On peut donc le lancer pendant que
// quelqu'un écrit une page : rien n'est réécrit dans le dépôt.
'use strict'
const fs = require('fs'), path = require('path'), os = require('os'), { spawnSync } = require('child_process')
const SITE = path.join(__dirname, '..')
const COPIE = fs.mkdtempSync(path.join(os.tmpdir(), 'casteria_site_mutants_'))
;(function copier(de, vers) {
  fs.mkdirSync(vers, { recursive: true })
  for (const n of fs.readdirSync(de)) {
    if (['.git', 'node_modules', 'captures'].includes(n)) continue
    const a = path.join(de, n), b = path.join(vers, n), st = fs.statSync(a)
    if (st.isDirectory()) { copier(a, b); continue }
    // un fichier lourd qu'aucun mutant ne change (une image, une vidéo, une police) : un lien suffit
    if (!/\.(html|css|js|json|xml|txt|md)$/.test(n)) { try { fs.linkSync(a, b); continue } catch (e) { /* un autre disque : une vraie copie */ } }
    fs.copyFileSync(a, b)
  }
})(SITE, COPIE)
const lancer = () => spawnSync(process.execPath, [path.join(COPIE, 'outils', 'verifier.js')], { encoding: 'utf8' })

const MUTANTS = [
  // ---------- la boutique et Tebex (les seize de f8, 05/10) ----------
  ['une cle secrete dans la config', 'js/boutique.config.js', s => s.replace("adresse: '',", "adresse: '',\n  cle: 'a3f09c1b77e24d5f8a6b0c9d1e2f3a4b5c6d7e8f',")],
  ['une cle de 40 caracteres cachee dans un autre script', 'js/site.js', s => s + '\n// 9f8e7d6c5b4a39281706f5e4d3c2b1a098765432\n'],
  ['le jeton remplace par une cle sans prefixe', 'js/boutique.config.js', s => s.replace(/jeton: '[^']*'/, "jeton: 'fc5549d2437006fa9a4703bbde8dba60567fd478'")],
  ['un texte de Tebex ecrit comme du code de page', 'js/boutique.js', s => s.replace("art.appendChild(el('h4', '', p.name))", "art.innerHTML += '<h4>' + p.name + '</h4>'")],
  ['le joueur envoye ailleurs que chez Tebex', 'js/boutique.js', s => s.replace('window.location.assign(lien)', 'window.location.href = lien')],
  ['un appel a un autre serveur', 'js/boutique.js', s => s.replace("var API = 'https://headless.tebex.io/api'", "var API = 'https://headless.tebex.io/api', AUTRE = 'https://exemple.test/api'")],
  ['la mise en garde du pseudo retiree', 'boutique.html', s => s.replace("Une erreur de pseudo n'est pas remboursée.", 'Relis bien.')],
  ['la case a cocher retiree', 'boutique.html', s => s.replace('<input type="checkbox" id="pseudo-sur">', '')],
  ['le bouton Payer actif des le depart', 'boutique.html', s => s.replace('id="achat-payer" disabled', 'id="achat-payer"')],
  ['la phrase du remboursement retiree de Merci', 'merci.html', s => s.replace("Une erreur de pseudo n'est pas remboursée.", '')],
  ['la page Merci visible de Google', 'merci.html', s => s.replace('<meta name="robots" content="noindex">\n', '')],
  ['un script d un autre serveur sur la boutique', 'boutique.html', s => s.replace('<script src="js/site.js" defer></script>', '<script defer src="https://exemple.test/x.js"></script>\n<script src="js/site.js" defer></script>')],
  ['le script de Tebex sans version figee', 'boutique.html', s => s.replace('https://js.tebex.io/v/1.11.0.js', 'https://js.tebex.io/v/1.js')],
  ['le script de Tebex sur une autre page', 'index.html', s => s.replace('</body>', '<script defer src="https://js.tebex.io/v/1.11.0.js"></script>\n</body>')],
  ['le script de Tebex qui bloque la page (sans defer)', 'boutique.html', s => s.replace('<script defer src="https://js.tebex.io/v/1.11.0.js">', '<script src="https://js.tebex.io/v/1.11.0.js">')],
  ['le paiement par-dessus la page sans la redirection en secours', 'js/boutique.js', s => s.replace(/\n        \/\/ la page de paiement de Tebex en français[^\n]*\n[^\n]*\n        window\.location\.assign\(lien\)/, '')],

  // ---------- aucune image ni vidéo plus haute qu'un écran (le propriétaire, 05/10 au soir) ----------
  ['la regle garde des hauteurs retiree', 'css/style.css', s => s.replace('main img, main video { max-height: 100svh; }', '')],
  ['la regle garde defaite par « max-height: none » sur une image', 'css/style.css', s => s + '\n.vitrine-tete .scene img { max-height: none; }\n'],
  ['une image de 1 200 px de haut dans la feuille de style', 'css/style.css', s => s + '\n.concept figure img { height: 1200px; }\n'],
  ['une video plus haute qu un ecran (140vh), dans une requete de largeur', 'css/style.css', s => s + '\n@media (max-width: 600px) { .telephone video { min-height: 140vh; } }\n'],
  ['une hauteur ecrite en style sur une image, dans une page', 'index.html', s => s.replace(/<main[\s\S]*?<img /, m => m + 'style="height: 1400px" ')],
  ['une image trop haute dans la feuille du carrousel', 'css/carrousel.css', s => s + '\n[data-carrousel] > .vue img { height: 1300px; }\n'],

  // ---------- la hero de chaque page : son fond et sa scène, sur un téléphone aussi ----------
  // (07/10) l'image du fond peut être dans une couche (<div class="pointeur">, ou un panneau depuis le 13/10) : le mutant
  // la retire où qu'elle soit
  ['la hero de l accueil sans son fond', 'index.html', s => s.replace(/(<div class="fond(?:\s[^"]*)?"[^>]*>(?:\s*<div\b[^>]*>)*)\s*(?:<img\b[^>]*>|<video\b[^>]*>(?:<\/video>)?)/, '$1')],
  ['la hero de l accueil avec trois panneaux au lieu de quatre', 'index.html', s => s.replace(/\s*<div class="panneau p4">[^\n]*<\/div>/, '')],
  ['une scene revenue par-dessus les panneaux de l accueil', 'index.html', s => s.replace('<div class="poussieres"', '<div class="scene sprites"><img src="assets/volume/yeti.png" alt="" width="520" height="520"></div><div class="poussieres"')],
  ['la hero d une page sans sa scene', 'commencer.html', s => s.replace('<div class="scene', '<div class="decor')],
  ['la hero d une page devenue une simple tete de page', 'commencer.html', s => s.replace('<section class="heros vitrine-tete', '<section class="page-tete')],
  ['la scene de la hero cachee sur un telephone', 'css/style.css', s => s + '\n@media (max-width: 600px) { .vitrine-tete .scene { display: none; } }\n'],
  ['le fond de la hero cache sous 960', 'css/style.css', s => s + '\n@media (max-width: 960px) { .heros .fond { display: none; } }\n'],
  ['le fond de la hero rendu invisible', 'css/style.css', s => s + '\n.vitrine-tete.accueil .fond { visibility: hidden; }\n'],

  // ---------- les vidéos ----------
  ['une video qui n est plus muette', 'index.html', s => s.replace(/(<video\b[^>]*?)\smuted/, '$1')],
  ['une video sans playsinline', 'index.html', s => s.replace(/(<video\b[^>]*?)\splaysinline/, '$1')],
  ['une video sans son affiche', 'index.html', s => s.replace(/(<video\b[^>]*?)\sposter="[^"]*"/, '$1')],
  ['une video chargee d office (src)', 'index.html', s => s.replace(/(<video\b[^>]*?)\sdata-src="/, '$1 src="')],
  ['une video sans preload="none"', 'index.html', s => s.replace(/(<video\b[^>]*?)\spreload="none"/, '$1')],

  // ---------- plus de barre au pied de l'écran du téléphone (le propriétaire, 07/10) ----------
  ['un lien vers une section de l accueil disparue', 'pirates.html', s => s.replace('href="./#boss"', 'href="./#videos"')],
  ['la barre du pied de l ecran revenue', 'commencer.html', s => s.replace('</footer>', '</footer>\n<nav class="barre-jeu" aria-label="Le menu du téléphone"><a href="./">Accueil</a></nav>')],
  ['l ancien bouton du menu revenu', 'index.html', s => s.replace('</header>', '<button class="menu" aria-expanded="false">Menu</button></header>')],

  // ---------- les carrousels ----------
  ['un carrousel d une sorte inconnue', 'index.html', s => s.replace(/data-carrousel="(defile|glisse|pile)"/, 'data-carrousel="tourne"')],
  ['une page a carrousel sans son script', 'index.html', s => s.replace('<script src="js/carrousel.js" defer></script>', '')],
  ['une page a carrousel sans sa feuille de style', 'index.html', s => s.replace('<link rel="stylesheet" href="css/carrousel.css">', '')],
  ['un tiret long dans le script du carrousel', 'js/carrousel.js', s => s + '\n// une note ' + String.fromCharCode(0x2014) + ' de trop\n'],

  // ---------- le référencement, comme avant ----------
  ['deux h1 sur l accueil', 'index.html', s => s.replace('</main>', '<h1>Un second titre</h1></main>')],
  ['la description de la page trop courte', 'commencer.html', s => s.replace(/<meta name="description" content="[^"]*"/, '<meta name="description" content="Casteria."')],
  ['l adresse de la page (canonical) fausse', 'pirates.html', s => s.replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="https://exemple.test/pirates.html">')],
  ['une image sans texte de remplacement', 'index.html', s => s.replace(/(<img\b[^>]*?)\salt="[^"]*"/, '$1')],
  ['un mot interdit (le serveur « en développement »)', 'index.html', s => s.replace('</main>', '<p>Le serveur est en développement.</p></main>')],
  ['une page retiree du plan du site', 'sitemap.xml', s => s.replace(/<url>(?:(?!<\/url>)[\s\S])*pirates\.html[\s\S]*?<\/url>\s*/, '')],
  ['un fichier cite qui n existe pas', 'index.html', s => s.replace(/src="assets\/images\/([^"]+)"/, 'src="assets/images/absente-$1"')],
  ['un bloc JSON-LD mal ecrit', 'index.html', s => s.replace(/(<script type="application\/ld\+json">\s*\{)/, '$1,')],

  // ---------- le classement (14/10/2026) : la fonction lit la base en lecture seule, ses identifiants viennent de
  // l'environnement ; la page n'écrit qu'en texte et ne lit que /api/classement ; chaque menu y mène ----------
  ['un mot de passe ecrit en clair dans la fonction du classement', 'api/classement.js', s => s.replace('password: r.password', "password: 'motdepasse'")],
  ['un ordre qui ecrit dans la base', 'api/classement.js', s => s.replace("const SQL = 'SELECT s.pseudo", "const SQL = 'DELETE FROM x; SELECT s.pseudo")],
  ['plusieurs ordres par requete permis', 'api/classement.js', s => s.replace("charset: 'utf8mb4' }", "charset: 'utf8mb4', multipleStatements: true }")],
  ['le classement garde 30 s au lieu de 5 minutes', 'api/classement.js', s => s.replace('s-maxage=300', 's-maxage=30')],
  ['une panne du classement gardee par Vercel', 'api/classement.js', s => s.split("}, 'no-store')").join("}, 'public, s-maxage=300')")],
  ['le texte brut de l erreur dans la reponse', 'api/classement.js', s => s.replace('raison: raison }', 'raison: raison, detail: e.message }')],
  ['une raison de panne non filtree', 'api/classement.js', s => s.replace("return /^[A-Z][A-Z0-9_]{1,40}$/.test(c) ? c : 'erreur'", 'return c')],
  ['la fonction du classement revenue a Washington', 'vercel.json', s => s.replace('"regions": ["cdg1"],', '"regions": ["iad1"],')],
  ['un delai plus long que la limite de Vercel', 'api/classement.js', s => s.replace('const DELAI_TOTAL_MS = 9000', 'const DELAI_TOTAL_MS = 12000')],
  ['un pseudo ecrit comme du code de page', 'js/classement.js', s => s.replace("li.appendChild(el('span', 'cl-pseudo', String(e.pseudo)))", "var sp = el('span', 'cl-pseudo'); sp.innerHTML = e.pseudo; li.appendChild(sp)")],
  ['la page du classement qui lit un autre serveur', 'js/classement.js', s => s.replace("var API = '/api/classement'", "var API = 'https://exemple.test/api/classement'")],
  ['la phrase de la panne du classement retiree', 'js/classement.js', s => s.replace("var PANNE = 'Le classement arrive très bientôt sur le site. En jeu, tape /top.'", "var PANNE = 'Erreur.'")],
  ['le lien Classement retire du menu d une page', 'pirates.html', s => s.replace(/\n\s*<a class="classement" href="classement\.html"[^\n]*<\/a>/, '')],
  ['la coupe du classement retiree de l en-tete d une page', 'index.html', s => s.replace('<img class="pixel" src="assets/icones/classement.png" alt="" width="20" height="20">', '')],
  ['le nom du lien du classement retire (aria-label)', 'commencer.html', s => s.replace(' aria-label="Classement"', '')],
  ['le lien du classement cache sur telephone', 'css/style.css', s => s.replace(':not(.boutique):not(.classement)', ':not(.boutique)')],
  ['la coupe du classement trop petite pour le doigt', 'css/style.css', s => s.replace('min-width: 44px; min-height: 44px;', 'min-width: 30px; min-height: 30px;')],
  ['le lien Classement retire du pied d une page', 'boutique.html', s => s.replace('<a href="classement.html">Classement</a><a href="boutique.html">', '<a href="boutique.html">')],
  ['la page du classement retiree du plan du site', 'sitemap.xml', s => s.replace(/<url>(?:(?!<\/url>)[\s\S])*classement\.html[\s\S]*?<\/url>\s*/, '')],
  ['une image trop haute dans la feuille du classement', 'css/classement.css', s => s + '\n.cl-rangs .cl-rang img { height: 1200px; }\n']
]

let rates = 0, code = 0
try {
  const sain = lancer()
  console.log('le site sain (sa copie) : code ' + sain.status)
  if (sain.status !== 0) { console.log(sain.stdout.split('\n').filter(l => /FAUTE/.test(l)).slice(0, 8).join('\n')); console.log('LE SITE N\'EST PAS SAIN : corrige-le d\'abord (npm run verifier), les mutants ne prouvent rien sur un site rouge'); code = 2 }
  else {
    for (const [nom, f, muter] of MUTANTS) {
      const p = path.join(COPIE, f), avant = fs.readFileSync(p, 'utf8'), apres = muter(avant)
      if (apres === avant) { console.log('  MUTANT SANS EFFET : ' + nom + ' (' + f + ' a changé : le mutant est à récrire)'); rates++; continue }
      let r
      try { fs.writeFileSync(p, apres); r = lancer() } finally { fs.writeFileSync(p, avant) }
      const dit = (r.stdout.match(/FAUTE : [^\n]*/) || [''])[0].slice(0, 120)
      console.log('  ' + (r.status === 1 ? 'refuse' : 'PASSE (code ' + r.status + ')') + ' : ' + nom + (dit ? '  ->  ' + dit : ''))
      if (r.status !== 1) rates++
    }
    const fin = lancer()
    console.log('la copie remise en etat : code ' + fin.status)
    console.log(rates ? rates + ' mutant(s) non attrape(s) sur ' + MUTANTS.length : MUTANTS.length + ' mutants, tous refuses')
    code = rates || fin.status ? 1 : 0
  }
} finally {
  try { fs.rmSync(COPIE, { recursive: true, force: true }) } catch (e) { console.log('(la copie ' + COPIE + ' n\'a pas pu etre effacee)') }
}
process.exit(code)
