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
  ['un texte de Tebex ecrit comme du code de page', 'js/boutique.js', s => s.replace("art.appendChild(el('h3', 'pack-nom', nom(p)))", "art.innerHTML += '<h3>' + p.name + '</h3>'")],
  ['le joueur envoye ailleurs que chez Tebex', 'js/boutique.js', s => s.replace('window.location.assign(lien)', 'window.location.href = lien')],
  ['un appel a un autre serveur', 'js/boutique.js', s => s.replace("var API = 'https://headless.tebex.io/api'", "var API = 'https://headless.tebex.io/api', AUTRE = 'https://exemple.test/api'")],
  ['la mise en garde du pseudo retiree', 'boutique.html', s => s.replace("Une erreur de pseudo n'est pas remboursée.", 'Relis bien.')],
  ['la case a cocher retiree', 'boutique.html', s => s.replace('<input type="checkbox" id="pseudo-sur">', '')],
  ['le bouton Payer actif des le depart', 'boutique.html', s => s.replace('id="achat-payer" disabled', 'id="achat-payer"')],
  ['la phrase du remboursement retiree de Merci', 'merci.html', s => s.replace("Une erreur de pseudo n'est pas remboursée.", '')],
  ['la page Merci visible de Google', 'merci.html', s => s.replace('<meta name="robots" content="noindex">\n', '')],
  ['un script d un autre serveur sur la boutique', 'boutique.html', s => s.replace('<script src="js/site.js" defer></script>', '<script defer src="https://exemple.test/x.js"></script>\n<script src="js/site.js" defer></script>')],
  ['le script de Tebex sur une autre page', 'index.html', s => s.replace('</body>', '<script defer src="https://js.tebex.io/v/1.11.0.js"></script>\n</body>')],
  // (20/10/2026) la boutique redessinée dans la nuit et l'or du site : sa feuille, sans pastille arrondie, sans parchemin ni vert
  ['la feuille de la boutique plus chargee', 'boutique.html', s => s.replace('<link rel="stylesheet" href="css/boutique.css">\n', '')],
  ['le tableau de parchemin revenu dans la boutique', 'boutique.html', s => s.replace('<div class="etal" id="tebex">', '<div class="etal cadre-bois" id="tebex">')],
  ['le bouton vert revenu dans la boutique', 'boutique.html', s => s.replace('<p class="tebex-actions" id="tebex-actions"></p>', '<p class="tebex-actions" id="tebex-actions"><a class="bouton bouton-vert" href="./#telecharger">Télécharge le launcher</a></p>')],
  ['une pastille arrondie dans la boutique', 'css/boutique.css', s => s + '\n.pack .bouton { border-radius: 999px; }\n'],
  ['une image trop haute dans la feuille de la boutique', 'css/boutique.css', s => s + '\n.offre-scene img { height: 1200px; }\n'],
  ['un tiret long dans la feuille de la boutique', 'css/boutique.css', s => s + '\n/* les packs ' + String.fromCharCode(0x2014) + ' du plus petit au plus gros */\n'],
  ['le paiement par-dessus la page sans la redirection en secours', 'js/boutique.js', s => s.replace(/\n        \/\/ la page de paiement de Tebex en français[^\n]*\n[^\n]*\n        window\.location\.assign\(lien\)/, '')],

  // ---------- aucune image ni vidéo plus haute qu'un écran (le propriétaire, 05/10 au soir) ----------
  ['la regle garde des hauteurs retiree', 'css/style.css', s => s.replace('main img, main video { max-height: 100svh; }', '')],
  ['la regle garde defaite par « max-height: none » sur une image', 'css/style.css', s => s + '\n.vitrine-tete .scene img { max-height: none; }\n'],
  ['une image de 1 200 px de haut dans la feuille de style', 'css/style.css', s => s + '\n.concept figure img { height: 1200px; }\n'],
  ['une video plus haute qu un ecran (140vh), dans une requete de largeur', 'css/style.css', s => s + '\n@media (max-width: 600px) { .telephone video { min-height: 140vh; } }\n'],
  ['une hauteur ecrite en style sur une image, dans une page', 'index.html', s => s.replace(/<main[\s\S]*?<img /, m => m + 'style="height: 1400px" ')],
  ['une image trop haute dans la feuille du carrousel', 'css/carrousel.css', s => s + '\n[data-carrousel] > .vue img { height: 1300px; }\n'],

  // ---------- la hero de chaque page : son fond et sa scène, sur un téléphone aussi ----------
  // (07/10) l'image du fond peut être dans une couche (<div class="pointeur">, la couche qui avance du haut en cinéma depuis
  // le 14/10, et son <picture>) : le mutant la retire où qu'elle soit
  ['la hero de l accueil sans son fond', 'index.html', s => s.replace(/(<div class="fond(?:\s[^"]*)?"[^>]*>(?:\s*<(?:div|picture|source)\b[^>]*>)*)\s*(?:<img\b[^>]*>|<video\b[^>]*>(?:<\/video>)?)/, '$1')],
  // (14/10/2026) le haut en cinéma : sa version pour un écran étroit, son image jamais en différé, aucune scène par-dessus,
  // chaque taille d'une image (srcset) existe
  ['la hero de l accueil sans sa version pour un ecran etroit', 'index.html', s => s.replace(/(<div class="fond plein-cadre"[\s\S]*?<picture>)[\s\S]*?(<source type="image\/webp")/, '$1\n        $2')],
  ['l image de la hero de l accueil chargee en differe', 'index.html', s => s.replace(/(<div class="fond plein-cadre"[\s\S]*?<img\b)/, '$1 loading="lazy"')],
  ['une scene revenue par-dessus le haut en cinema des pirates', 'pirates.html', s => s.replace('<div class="cinema-texte">', '<div class="scene" aria-hidden="true"><img src="assets/volume/kraken.png" alt="" width="520" height="520"></div>\n  <div class="cinema-texte">')],
  ['la banniere du classement sans son image de repli', 'classement.html', s => s.replace(/(<div class="fond plein-cadre"[\s\S]*?)<img\b[^>]*>/, '$1')],
  ['une taille d image (srcset) qui n existe pas', 'index.html', s => s.replace('casteria-decollage-2560.webp 2560w" sizes', 'casteria-decollage-3840.webp 3840w" sizes')],
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
  // (la 119) la page lit le fichier brut du gist que le serveur du jeu publie, et rien d'autre
  ['la page du classement qui lit un autre serveur', 'js/classement.js', s => s.replace("'https://gist.githubusercontent.com/'", "'https://exemple.test/'")],
  ['la page du classement qui relit /api/classement', 'js/classement.js', s => s.replace('fetch(SOURCE, {', "fetch('/api/classement', {")],
  ['un autre fichier du gist que classement.json', 'js/classement.js', s => s.replace("'/raw/classement.json'", "'/raw/autre.json'")],
  ['sans gist, la page lit quand meme', 'js/classement.js', s => s.replace('if (!window.fetch || !SOURCE) { panne(); return }', 'if (!window.fetch) { panne(); return }')],
  ['la lecture du gist avec les cookies', 'js/classement.js', s => s.replace("credentials: 'omit'", "credentials: 'include'")],
  ['un identifiant de gist qui n est pas hexadecimal', 'js/classement.js', s => s.replace(/GIST_ID = '[^']*'/, "GIST_ID = '../../autre'")],
  ['une cle de 32 caracteres hors de la ligne du gist', 'js/classement.js', s => s.replace("var DELAI = 12000", "var DELAI = 12000 // 0123456789abcdef0123456789abcdef")],
  ['la phrase de la panne du classement retiree', 'js/classement.js', s => s.replace("var PANNE = 'Le classement ne s\\'affiche pas pour l\\'instant. En jeu, tape /top.'", "var PANNE = 'Erreur.'")],
  // (18/10/2026, la 125 du jeu) la panne sans mot interdit ; les donjons dans une carte, ses choix dits, jamais arrondis
  ['la panne du classement qui redit « bientot »', 'js/classement.js', s => s.replace("var PANNE = 'Le classement ne s\\'affiche pas pour l\\'instant. En jeu, tape /top.'", "var PANNE = 'Le classement ne s\\'affiche pas pour l\\'instant. En jeu, tape /top.', PLUS = 'Il revient bientôt.'")],
  ['les niveaux d un donjon en cartes separees', 'js/classement.js', s => s.replace('return blocs.map(function (b) { return b.c ? carte(b.c) : carteDonjon(b.d) })', 'return blocs.map(function (b) { return b.c ? carte(b.c) : carte(b.d.niveaux[0]) })')],
  ['les tailles de groupe oubliees', 'js/classement.js', s => s.split('.tailles').join('.groupes')],
  ['un choix de donjon qui ne dit pas s il est choisi', 'js/classement.js', s => s.split("setAttribute('aria-pressed'").join("setAttribute('data-choisi'")],
  ['un nom de donjon ecrit comme du code de page', 'js/classement.js', s => s.replace("a.appendChild(el('h3', '', d.nom))", "var h3 = el('h3'); h3.innerHTML = d.nom; a.appendChild(h3)")],
  ['le podium qui ne reajuste plus ses pseudos au dessin', 'js/classement.js', s => s.replace('    suite.hidden = top.length <= 3\n    ajusterPodium()\n', '    suite.hidden = top.length <= 3\n')],
  ['une pastille arrondie dans le classement', 'css/classement.css', s => s.replace('border-radius: 0; box-shadow: 0 3px 0 var(--bois-clair)', 'border-radius: 999px; box-shadow: 0 3px 0 var(--bois-clair)')],
  ['le lien Classement retire du menu d une page', 'pirates.html', s => s.replace(/\n\s*<a class="classement" href="classement\.html"[^\n]*<\/a>/, '')],
  ['la coupe du classement retiree de l en-tete d une page', 'index.html', s => s.replace('<img class="pixel" src="assets/icones/classement.png" alt="" width="20" height="20">', '')],
  ['le nom du lien du classement retire (aria-label)', 'commencer.html', s => s.replace(' aria-label="Classement"', '')],
  ['le lien du classement cache sur telephone', 'css/style.css', s => s.replace(':not(.boutique):not(.classement)', ':not(.boutique)')],
  ['la coupe du classement trop petite pour le doigt', 'css/style.css', s => s.replace('min-width: 44px; min-height: 44px;', 'min-width: 30px; min-height: 30px;')],
  ['le lien Classement retire du pied d une page', 'boutique.html', s => s.replace('<a href="classement.html">Classement</a><a href="boutique.html">', '<a href="boutique.html">')],
  ['la page du classement retiree du plan du site', 'sitemap.xml', s => s.replace(/<url>(?:(?!<\/url>)[\s\S])*classement\.html[\s\S]*?<\/url>\s*/, '')],
  ['une image trop haute dans la feuille du classement', 'css/classement.css', s => s + '\n.cl-rangs .cl-rang img { height: 1200px; }\n'],

  // ---------- (19/10/2026) le casino et les donjons : leurs pages suivent les mêmes règles, et aucun spoiler ----------
  ['la page du casino retiree du plan du site', 'sitemap.xml', s => s.replace(/<url>(?:(?!<\/url>)[\s\S])*casino\.html[\s\S]*?<\/url>\s*/, '')],
  ['la hero des donjons sans sa version pour un ecran etroit', 'donjons.html', s => s.replace(/(<div class="fond plein-cadre"[\s\S]*?<picture>)[\s\S]*?(<source type="image\/webp")/, '$1\n        $2')],
  ['l image de la hero du casino chargee en differe', 'casino.html', s => s.replace(/(<div class="fond plein-cadre"[\s\S]*?<img\b)/, '$1 loading="lazy"')],
  ['l image de partage du casino qui n existe pas', 'casino.html', s => s.replace('/assets/images/casteria-casino-salle-partage.jpg', '/assets/images/casteria-casino-absente.jpg')],
  ['l adresse de la page des donjons (canonical) fausse', 'donjons.html', s => s.replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="https://casteria.fr/donjon.html">')],
  ['un mot interdit sur la page du casino', 'casino.html', s => s.replace('</main>', '<p>Le casino ouvrira bientôt.</p></main>')],
  ['le carrousel des donjons sans son script', 'donjons.html', s => s.replace('<script src="js/carrousel.js" defer></script>', '')],
  ['le boss d un donjon nomme sur la page des donjons', 'donjons.html', s => s.replace('</main>', "<p>Au fond t'attend le Sphinx d'Or.</p></main>")],
  ['le boss d un donjon nomme dans un texte d image', 'donjons.html', s => s.replace('alt="L\'écran du sceau', 'alt="Le sceau du Cœur Creux')],
  ['le dernier boss nomme sur l accueil', 'index.html', s => s.replace('</main>', '<p>Le Dragon Ancien t\'attend.</p></main>')],
  ['l Abyssarque nommee sur la page de la mer', 'pirates.html', s => s.replace('</main>', '<p>Et l\'Abyssarque, sur sa tortue.</p></main>')],
  ['un nombre coupable en deux lignes (une espace ordinaire)', 'casino.html', s => s.replace('de 800&#160;000 jetons', 'de 800 000 jetons')],

  // ---------- (19/10/2026) le Discord : casteria.fr/discord, son bouton, son départ tout seul, l'invitation écrite là seulement ----------
  ['le bouton du Discord vers une autre invitation', 'discord.html', s => s.replace('<a class="bouton bouton-or grand" href="https://discord.gg/Xp325uTFe7">', '<a class="bouton bouton-or grand" href="https://discord.gg/autre">')],
  ['la page du Discord sans son refresh', 'discord.html', s => s.replace('<meta http-equiv="refresh" content="1; url=https://discord.gg/Xp325uTFe7">\n', '')],
  ['la page du Discord sans le depart par le script', 'discord.html', s => s.replace(/<script>setTimeout[^\n]*<\/script>\n/, '')],
  ['l adresse de la page du Discord (canonical) en .html', 'discord.html', s => s.replace('<link rel="canonical" href="https://casteria.fr/discord">', '<link rel="canonical" href="https://casteria.fr/discord.html">')],
  ['/discord ne mene plus a la page (vercel.json)', 'vercel.json', s => s.replace(/\n  "rewrites": \[[\s\S]*?\n  \],/, '')],
  ['l invitation du Discord ecrite sur une autre page', 'index.html', s => s.replace('</main>', '<p><a href="https://discord.gg/Xp325uTFe7">Le Discord</a></p></main>')],
  ['une invitation Discord dans un script du site', 'js/site.js', s => s + "\nvar DISCORD = 'https://discord.gg/autre'\n"],
  ['la page du Discord retiree du plan du site', 'sitemap.xml', s => s.replace(/\s*<url><loc>https:\/\/casteria\.fr\/discord<\/loc>[^\n]*/, '')],
  ['une pastille arrondie sur la page du Discord', 'css/discord.css', s => s + '\n.vitrine-tete.discord .bouton.grand { border-radius: 999px; }\n'],
  // (19/10/2026) l'accueil mène au Discord, juste après « Jouer gratuitement » : /discord, le logo et le mot
  ['le bouton Discord retire de l accueil', 'index.html', s => s.replace(/<a class="bouton bouton-discord grand"[^\n]*<\/a>\n/, '')],
  ['le bouton Discord de l accueil sans son logo', 'index.html', s => s.replace(/<svg class="logo-discord"[\s\S]*?<\/svg>/, '')],
  ['le bouton Discord de l accueil vers l invitation directe', 'index.html', s => s.replace('<a class="bouton bouton-discord grand" href="/discord"', '<a class="bouton bouton-discord grand" href="https://discord.gg/Xp325uTFe7"')],

  // ---------- (19/10/2026, le propriétaire : « faut pas dire le nombre ! ») aucun nombre de boss, nulle part ----------
  ['un nombre de boss dans la description de l accueil', 'index.html', s => s.replace('tes bêtes, des boss, deux donjons', 'tes bêtes, 15 boss, deux donjons')],
  ['un nombre de boss en lettres dans le haut de l accueil', 'index.html', s => s.replace('bats des boss géants', 'bats quinze boss')],
  ['un nombre de boss dans la carte au tresor', 'index.html', s => s.replace('<b class="mot">Boss</b><span>en arène</span>', '<b data-n="15">15</b><span>boss en arène</span>')],
  ['un nombre de boss dans le JSON-LD de l accueil', 'index.html', s => s.replace('une économie en jetons, des boss et leurs panoplies', 'une économie en jetons, 15 boss et leurs panoplies')],
  ['un nombre d arenes sur une autre page', 'pirates.html', s => s.replace('</main>', '<p>Seize arènes t\'attendent.</p></main>')],
  ['un nombre de boss dans un script du site', 'js/classement.js', s => s + "\nvar BOSS_TEXTE = 'les 15 boss'\n"]
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
