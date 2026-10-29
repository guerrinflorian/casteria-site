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
  // (22/10/2026) « Par où commencer » passe en cinéma (l'image du propriétaire) : la page à scène est le règlement
  ['la hero d une page sans sa scene', 'reglement.html', s => s.replace('<div class="scene', '<div class="decor')],
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

  // ---------- (29/10/2026, le prototype du compte) le classement et les pages du compte : tout passe par js/api.js et l'API du
  // site (la même origine), rien ne s'écrit comme du code de page, l'interrupteur des données d'essai et son bandeau ; la 3D
  // copiée dans le site ; la connexion en POST ; (le 20/10/2026, gardé) la fonction de Vercel ne revient pas ----------
  ['la fonction du classement remise dans vercel.json', 'vercel.json', s => s.replace('"trailingSlash": false,', '"trailingSlash": false,\n  "functions": { "api/classement.js": { "maxDuration": 10 } },')],
  ['un pseudo ecrit comme du code de page', 'js/classement.js', s => s.replace("nom = el('button', 'cl-nom', String(l.pseudo))", "nom = el('button', 'cl-nom'); nom.innerHTML = l.pseudo")],
  ['l API du classement lue sur un autre serveur', 'js/api.js', s => s.replace("demander('/api/classement'", "demander('https://exemple.test/api/classement'")],
  ['la page du classement qui lit le reseau elle-meme', 'js/classement.js', s => s.replace('  function panne() {', "  function panne() {\n    fetch('/api/classement')")],
  ['les demandes de l API avec les cookies d un autre site', 'js/api.js', s => s.replace("credentials: 'same-origin'", "credentials: 'include'")],
  ['l interrupteur des donnees d essai en double', 'js/api.js', s => s.replace(/\n  var ESSAI = (true|false)\n/, (m, v) => '\n  var ESSAI = ' + v + '\n  var ESSAI = ' + (v === 'true' ? 'false' : 'true') + '\n')],
  ['le bandeau des donnees d essai retire', 'js/api.js', s => s.replace('\n  if (ESSAI) bandeauEssai()\n', '\n')],
  ['le bandeau sans « Donnees d essai »', 'js/api.js', s => s.replace("b.textContent = 'Données d\\'essai : pseudos et chiffres inventés'", "b.textContent = 'Prototype'")],
  ['la connexion qui part en GET', 'js/api.js', s => s.replace("demander('/api/connexion', { methode: 'POST'", "demander('/api/connexion', { methode: 'GET'")],
  ['le tchat lu ailleurs que par /api/admin/tchat', 'js/api.js', s => s.replace("new EventSource('/api/admin/tchat')", "new EventSource('/tchat')")],
  ['une peau prise a n importe quelle adresse', 'js/peau.js', s => s.replace('var u = A.peau(url), k = taille / 8', 'var u = String(url), k = taille / 8')],
  ['la regle des peaux retiree de l API', 'js/api.js', s => s.replace('if (/^\\/api\\/peau\\/[A-Za-z0-9_]{3,16}$/.test(s) || ', 'if (true || ')],
  ['la 3D lue sur un CDN', 'js/peau.js', s => s.replace("var BIBLIO = 'assets/vendor/skinview3d/skinview3d.bundle.js'", "var BIBLIO = 'https://unpkg.com/skinview3d@3.4.2/bundles/skinview3d.bundle.js'")],
  ['la licence de la 3D retiree', 'assets/vendor/skinview3d/LICENCES.txt', s => s.split('MIT License').join('Licence')],
  ['la 3D chargee d office par une page', 'classement.html', s => s.replace('<script src="js/peau.js" defer></script>', '<script src="assets/vendor/skinview3d/skinview3d.bundle.js"></script>\n<script src="js/peau.js" defer></script>')],
  ['un texte du tchat ecrit comme du code de page', 'js/admin.js', s => s.replace("li.appendChild(el('span', 'a-texte', String(l.texte)))", "var tx = el('span', 'a-texte'); tx.innerHTML = l.texte; li.appendChild(tx)")],
  ['un graphique qui ecrit en code de page', 'js/graphe.js', s => s.replace("tv.textContent = axe(v)", "tv.innerHTML = axe(v)")],
  ['un graphique qui charge une bibliotheque d un autre serveur', 'js/graphe.js', s => s.replace("var NS = 'http://www.w3.org/2000/svg'", "var NS = 'http://www.w3.org/2000/svg', LIB = 'https://cdn.exemple.test/chart.js'")],
  ['l espace admin qui montre tout a tous', 'js/admin.js', s => s.replace('if (!r.corps.droits || !r.corps.droits.admin) return refus(', 'if (false) return refus(')],
  ['la connexion qui garde le mot de passe', 'js/connexion.js', s => s.replace("    var p = pseudo.value.trim(), m = mdp.value\n", "    var p = pseudo.value.trim(), m = mdp.value\n    sessionStorage.setItem('mdp', m)\n")],
  ['la connexion qui ecrit dans la console', 'js/connexion.js', s => s.replace("    var p = pseudo.value.trim(), m = mdp.value\n", "    var p = pseudo.value.trim(), m = mdp.value\n    console.log(p, m)\n")],
  ['trop d essais sans sa phrase', 'js/connexion.js', s => s.replace("'Trop d\\'essais : réessaie dans une minute.'", "'Erreur 429.'")],
  ['le formulaire de connexion en GET', 'connexion.html', s => s.replace('method="post" action="/api/connexion"', 'method="get" action="/api/connexion"')],
  ['le mot de passe en clair', 'connexion.html', s => s.replace('type="password" autocomplete="current-password"', 'type="text" autocomplete="current-password"')],
  ['l inscription en jeu plus dite', 'connexion.html', s => s.split('<code>/register</code>').join('ton inscription')],
  ['une page du compte visible de Google', 'compte.html', s => s.replace('<meta name="robots" content="noindex">\n', '')],
  ['l espace admin visible de Google', 'admin.html', s => s.replace('<meta name="robots" content="noindex">\n', '')],
  ['un vrai pseudo dans les donnees d essai', 'donnees-essai/joueur/bricolune.json', s => s.split('"pseudo":"Bricolune"').join('"pseudo":"_Floskyl_"')],
  ['un fichier d essai sans sa marque', 'donnees-essai/en-ligne.json', s => s.replace('"essai":true,', '')],
  ['la phrase de la panne du classement retiree', 'js/classement.js', s => s.replace("var PANNE = 'Le classement ne s\\'affiche pas pour l\\'instant. En jeu, tape /top.'", "var PANNE = 'Erreur.'")],
  ['la panne du classement qui redit « bientot »', 'js/classement.js', s => s.replace("var PANNE = 'Le classement ne s\\'affiche pas pour l\\'instant. En jeu, tape /top.'", "var PANNE = 'Le classement ne s\\'affiche pas pour l\\'instant. En jeu, tape /top.', PLUS = 'Il revient bientôt.'")],
  ['les tailles de groupe oubliees', 'js/classement.js', s => s.split('.tailles').join('.groupes')],
  ['les colonnes du hasard oubliees', 'js/classement.js', s => s.split('.hasard.col').join('.hasard.k')],
  ['les lignes d ile sans leur nom', 'js/classement.js', s => s.split('if (l.ile) {').join('if (false) {')],
  ['un choix qui ne dit pas s il est choisi', 'js/classement.js', s => s.split("setAttribute('aria-pressed'").join("setAttribute('data-choisi'")],
  ['les themes qui ne sont plus des onglets', 'js/classement.js', s => s.replace("b.setAttribute('role', 'tab')", "b.setAttribute('role', 'button')")],
  ['le podium qui ne reajuste plus ses pseudos au dessin', 'js/classement.js', s => s.replace('    ajusterPodium()\n    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajusterPodium)\n', '')],
  ['Toi plus surligne', 'js/classement.js', s => s.split("'cl-marque toi'").join("'cl-marque'")],
  ['le lien Classement retire du menu d une page', 'pirates.html', s => s.replace(/\n\s*<a class="classement" href="classement\.html"[^\n]*<\/a>/, '')],
  ['la coupe du classement retiree de l en-tete d une page', 'index.html', s => s.replace('<svg class="ic" aria-hidden="true"><use href="#i-coupe"/></svg>Classement</a>', 'Classement</a>')],
  ['le sprite des icones retire d une page qui s en sert', 'index.html', s => s.replace(/<svg class="icones"[^]*?<\/svg>/, '')],
  ['le classement retire du tiroir du telephone', 'js/site.js', s => s.replace("    ligne('classement.html', 'Classement', 'coupe')\n", '')],
  ['le nom du lien du classement retire (aria-label)', 'commencer.html', s => s.replace(' aria-label="Classement"', '')],
  ['le lien du classement cache sur telephone', 'css/style.css', s => s.replace(':not(.boutique):not(.classement)', ':not(.boutique)')],
  ['la coupe du classement trop petite pour le doigt', 'css/style.css', s => s.replace('min-width: 44px; min-height: 44px;', 'min-width: 30px; min-height: 30px;')],
  // ---------- (29/10/2026) le menu déroulant du téléphone (js/site.js, css/style.css) et le kit des motifs (css/motifs.css) ----------
  ['le menu deroulant jamais pose (le classement cache sans lui)', 'js/site.js', s => s.replace('\n  menuTelephone()\n', '\n')],
  ['le menu deroulant qui ne se ferme plus a Echap', 'js/site.js', s => s.replace("if (e.key === 'Escape' && !tiroir.hidden) { ouvrir(false); bouton.focus() }", "if (e.key === 'Esc' && !tiroir.hidden) { ouvrir(false) }")],
  ['le menu deroulant ecrit comme du code de page', 'js/site.js', s => s.replace('a.appendChild(ic(icone)); a.appendChild(document.createTextNode(mot))', 'a.appendChild(ic(icone)); a.innerHTML += mot')],
  ['le bouton du menu trop petit pour le doigt', 'css/style.css', s => s.replace('gap: 10px; margin-left: auto; min-height: 44px;', 'gap: 10px; margin-left: auto; min-height: 30px;')],
  ['une ligne du menu trop petite pour le doigt', 'css/style.css', s => s.replace('.menu-tiroir a { display: flex; align-items: center; min-height: 48px;', '.menu-tiroir a { display: flex; align-items: center; min-height: 32px;')],
  ['un dessin du kit qui manque', 'css/motifs.css', s => s.replace('url("../assets/motifs/pierres.svg")', 'url("../assets/motifs/pierre.svg")')],
  ['une page du compte sans le kit des motifs', 'compte.html', s => s.replace('<link rel="stylesheet" href="css/motifs.css">\n', '')],
  ['la connexion sur un fond uni', 'connexion.html', s => s.split('fond-carte relief').join('relief').split('fond-bois relief').join('relief').split('fond-mer relief').join('relief')],
  ['l espace admin sans frise', 'admin.html', s => s.split('<div class="frise frise-etoiles" aria-hidden="true"></div>').join('').split('<div class="frise frise-corde" aria-hidden="true"></div>').join('')],
  ['un tiret long dans le kit', 'css/motifs.css', s => s + '\n/* le ciel ' + String.fromCharCode(0x2014) + ' la nuit */\n'],
  // ---------- (29/10/2026) les choix de la tête et les trois demandes du propriétaire pour l'espace de l'équipe ----------
  ['les classements du nombre de boss remis sur le site', 'js/classement.js', s => s.replace('return c && !HORS_SITE[c.id]', 'return c && true')],
  ['un compte de boss lu par le compte', 'js/compte.js', s => s.replace("ligne(ex, 'Donjons gagnés'", "ligne(ex, 'Boss vaincus', A.nombre(m.boss.vaincus)); ligne(ex, 'Donjons gagnés'")],
  ['un compte de boss dans les donnees d essai', 'donnees-essai/joueur/bricolune.json', s => s.replace('"boss":{', '"boss":{"vaincus":11,')],
  ['la case du pseudo cochee par la page', 'js/boutique.js', s => s.replace('      pseudoConnecte = p\n', '      pseudoConnecte = p\n      sur.checked = true\n')],
  ['la boutique sans le pseudo du connecte', 'js/boutique.js', s => s.replace('pseudoConnecte || sessionStorage', 'sessionStorage')],
  ['la boutique qui charge api.js apres elle', 'boutique.html', s => s.replace('<script src="js/api.js" defer></script>\n<script src="js/boutique.js" defer></script>', '<script src="js/boutique.js" defer></script>\n<script src="js/api.js" defer></script>')],
  ['le tchat de nouveau par serveur', 'js/admin.js', s => s.replace("      li.setAttribute('data-cherche',", "      li.setAttribute('data-serveur', String(l.serveur))\n      li.setAttribute('data-cherche',")],
  ['une ligne du tchat d essai qui dit son serveur', 'donnees-essai/admin/tchat.json', s => s.replace('"pseudo":', '"serveur":"iles","pseudo":')],
  ['une liste de lieux ecrite dans la page de l equipe', 'js/admin.js', s => s.replace("  var VIDE = 'pas encore de données'", "  var VIDE = 'pas encore de données'\n  var LIEUX = { spawn: 'Le palais' }")],
  ['une valeur absente dessinee comme un 0', 'js/graphe.js', s => s.replace('var v = num(p.valeur); if (v === null) { m = null; return } if (!m)', 'var v = Number(p.valeur) || 0; if (!m)')],
  ['une valeur absente ecrite 0 par la page de l equipe', 'js/admin.js', s => s.replace("function num(x) { return typeof x === 'number' && isFinite(x) ? x : null }", 'function num(x) { return Number(x) || 0 }')],
  ['la session de l equipe sans fin', 'js/api.js', s => s.replace("    if (depuis && Date.now() - depuis > EQUIPE_MS) return refus(401, 'reconnexion')\n", '')],
  // ---------- (29/10/2026, le propriétaire) chaque page mène au jeu et pousse à monter ----------
  ['le classement qui ne mene plus au jeu', 'js/classement.js', s => s.replace("moiTitre.textContent = 'Ta place t\\'attend'", "moiTitre.textContent = 'Ta place'")],
  ['la fiche sans son appel au jeu', 'js/classement.js', s => s.replace("el('p', 'fiche-appel-titre', 'Toi aussi, construis ton île')", "el('p', 'fiche-appel-titre', 'Casteria')")],
  ['le classement qui ne pousse plus a monter', 'js/classement.js', s => s.replace("'Encore ' + A.nombre(manque) + ' point'", "'Il te manque ' + A.nombre(manque) + ' point'")],
  ['le compte sans session sans /register', 'js/compte.js', s => s.replace("'Pas encore de compte ? Crée-le en jeu : '", "'Bienvenue : '")],
  ['le compte sans son prochain deblocage', 'js/compte.js', s => s.split('m.niveau.prochain.nom').join('m.niveau.inconnu')],
  // ---------- (29/10/2026, la tête) un nombre ne se coupe jamais, ni un mot dans un panneau ----------
  ['un nombre coupe dans le texte d une page', 'classement.html', s => s.replace('<h2 class="lu" id="liste-titre">', '<p>Plus de 1 000 joueurs</p>\n    <h2 class="lu" id="liste-titre">')],
  ['un nombre coupe dans les donnees d essai', 'donnees-essai/classement/general.json', s => s.replace(new RegExp('(\\d)' + String.fromCharCode(160) + '(\\d{3})'), '$1 $2')],
  ['un nombre coupe dans un texte de script', 'js/compte.js', s => s.replace("tuile('', 'Temps de jeu',", "tuile('', 'Temps de jeu (sur 1 000 h)',")],
  ['les milliers du jeu plus rendus insecables', 'js/api.js', s => s.replace("'$1' + NBSP).replace(", "'$1 ').replace(")],
  ['une coupure de mot dans un panneau du kit', 'css/motifs.css', s => s.replace('.panneau-nuit, .panneau-bois, .coins-or { hyphens: manual; -webkit-hyphens: manual; }\n', '')],
  ['la page de l equipe qui ne dit plus l etat de ses sources', 'js/admin.js', s => s.replace("texte(s.nom || cle) + ' ne répond pas : chiffres ' +", "texte(s.nom || cle) + ' : chiffres ' +")],
  ['le lien Classement retire du pied d une page', 'boutique.html', s => s.replace('<a href="classement.html">Classement</a><a href="carte.html">', '<a href="carte.html">')],
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
  // (22/10/2026, la tête) aucun boss de la fin de partie, ni nommé ni montré
  ['un boss de la fin de partie nomme sur l accueil', 'index.html', s => s.replace('</main>', '<p>Au bout, le Dévoreur t\'attend.</p></main>')],
  ['le modele d un boss de la fin de partie montre sur l accueil', 'index.html', s => s.replace('src="assets/volume/fregate.webp" alt="" width="855" height="1027" loading="lazy"></a>', 'src="assets/volume/mecha_titan.webp" alt="" width="569" height="900" loading="lazy"></a>')],
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
  // (19/10/2026) l'accueil mène au Discord, juste après « Jouer gratuitement » : /discord, le logo et le mot
  ['le bouton Discord retire de l accueil', 'index.html', s => s.replace(/<a class="bouton bouton-discord grand"[^\n]*<\/a>\n/, '')],
  ['le bouton Discord de l accueil sans son logo', 'index.html', s => s.replace(/<svg class="logo-discord"[\s\S]*?<\/svg>/, '')],
  ['le bouton Discord de l accueil vers l invitation directe', 'index.html', s => s.replace('<a class="bouton bouton-discord grand" href="/discord"', '<a class="bouton bouton-discord grand" href="https://discord.gg/Xp325uTFe7"')],

  // ---------- (19/10/2026, le propriétaire : « faut pas dire le nombre ! ») aucun nombre de boss, nulle part ----------
  ['un nombre de boss dans la description de l accueil', 'index.html', s => s.replace('tes bêtes, des boss, deux donjons', 'tes bêtes, 15 boss, deux donjons')],
  ['un nombre de boss en lettres dans le haut de l accueil', 'index.html', s => s.replace('bats des boss géants', 'bats quinze boss')],
  ['un nombre de boss dans la carte au tresor', 'index.html', s => s.replace('</main>', '<p>Affronte 15 boss en arène.</p></main>')],
  // (b5, l'assemblage du 29/10) le kit et les polices sur toutes les pages, 44 px au doigt
  ['une page sans le kit des motifs', 'vote.html', s => s.replace('<link rel="stylesheet" href="css/motifs.css">\n', '')],
  ['une page sans sa police prechargee', 'pirates.html', s => s.replace('<link rel="preload" href="assets/polices/fredoka.woff2" as="font" type="font/woff2" crossorigin>\n', '')],
  ['les points du carrousel a 12 px', 'css/carrousel.css', s => s.replace('.carrousel-points button { position: relative; width: 44px; height: 44px;', '.carrousel-points button { position: relative; width: 12px; height: 12px;')],
  ['les apparitions cachees meme sans JavaScript', 'css/style.css', s => s.replace('@media (scripting: enabled) {\n  .apparait { opacity: 0;', '@media (min-width: 0) {\n  .apparait { opacity: 0;')],
  ['le second site de vote sans son drapeau', 'vote.html', s => s.replace(' data-serveursminecraft="eteint"', '')],
  ['le drapeau eteint qui ne cache plus rien', 'css/vote.css', s => s.replace('.sites-vote[data-serveursminecraft="eteint"] .site-sm { display: none; }', '.sites-vote .site-sm { opacity: .9; }')],
  ['serveur-minecraft.com dans la page du vote', 'vote.html', s => s.replace('https://www.serveursminecraft.org/serveur/7794/', 'https://serveur-minecraft.com/7794')],
  ['l accueil sans sa section #telecharger', 'index.html', s => s.replace('<section class="clair telecharge" id="telecharger">', '<section class="clair telecharge" id="installer">')],
  ['la section #telecharger sans le bouton de Windows', 'index.html', s => s.replace('data-track="download-windows"', 'data-track="windows"')],
  ['le logo de la barre sans ses 44 px au telephone', 'css/style.css', s => s.replace('.barre .marque { min-height: 44px;', '.barre .marque { min-height: 36px;')],
  ['un nombre de boss dans le JSON-LD de l accueil', 'index.html', s => s.replace('une économie en jetons, des boss et leurs panoplies', 'une économie en jetons, 15 boss et leurs panoplies')],
  ['un nombre d arenes sur une autre page', 'pirates.html', s => s.replace('</main>', '<p>Seize arènes t\'attendent.</p></main>')],
  ['un nombre de boss dans un script du site', 'js/classement.js', s => s + "\nvar BOSS_TEXTE = 'les 15 boss'\n"],

  // ---------- (22/10/2026) le vote : sa page, ses sites (la seule adresse d'un autre domaine permise, dans leur liste), ses liens ----------
  ['la page du vote retiree du plan du site', 'sitemap.xml', s => s.replace(/<url>(?:(?!<\/url>)[\s\S])*vote\.html[\s\S]*?<\/url>\s*/, '')],
  ['le lien Voter retire du pied d une page', 'casino.html', s => s.replace('<a href="vote.html">Voter</a>', '')],
  ['le lien Voter retire du menu d une page', 'donjons.html', s => s.replace(/\n\s*<a class="voter" href="vote\.html">(<svg class="ic" aria-hidden="true"><use href="#i-eclair"\/><\/svg>)?Voter<\/a>/, '')],
  ['un lien vers un autre site hors de la liste des sites de vote', 'vote.html', s => s.replace('</main>', '<p><a href="https://exemple.test/vote">Vote ici</a></p></main>')],
  // (23/10/2026) la liste porte Serveur Privé : les mutants touchent son lien
  ['un site de vote sans rel="noopener"', 'vote.html', s => s.replace('href="https://serveur-prive.net/minecraft/casteria/vote" target="_blank" rel="noopener"', 'href="https://serveur-prive.net/minecraft/casteria/vote" target="_blank"')],
  ['un site de vote qui ne s ouvre pas a part', 'vote.html', s => s.replace('href="https://serveur-prive.net/minecraft/casteria/vote" target="_blank" rel="noopener"', 'href="https://serveur-prive.net/minecraft/casteria/vote" rel="noopener"')],
  ['un site de vote en http', 'vote.html', s => s.replace('href="https://serveur-prive.net/minecraft/casteria/vote"', 'href="http://serveur-prive.net/minecraft/casteria/vote"')],
  ['la liste des sites de vote avec une espace (vide, elle ne se cache plus)', 'vote.html', s => s.replace('aria-label="Les sites où voter pour Casteria"><li>', 'aria-label="Les sites où voter pour Casteria">\n    <li>')],
  ['la consigne du pseudo retiree au-dessus des sites de vote', 'vote.html', s => s.replace(/<p class="vote-consigne[^\n]*<\/p>\n/, '')],
  ['la consigne sans le mot pseudo', 'vote.html', s => s.replace('écris ton pseudo du jeu, exactement', 'écris ton nom')],
  ['la phrase « tape /vote » retiree de la page du vote', 'vote.html', s => s.replace(/<p class="sites-vides[^\n]*<\/p>\n/, '')],
  ['la liste vide des sites de vote plus cachee', 'css/vote.css', s => s.replace('.sites-vote:empty { display: none; }', '')],
  ['une image trop haute dans la feuille du vote', 'css/vote.css', s => s + '\n.vote-caisse img.photo { height: 1200px; }\n'],
  ['la hero du vote sans sa version pour un ecran etroit', 'vote.html', s => s.replace(/(<div class="fond plein-cadre"[\s\S]*?<picture>)[\s\S]*?(<source type="image\/webp")/, '$1\n        $2')],
  // (22/10/2026) le « retour arrière » invisible qui avait cassé la page ?photo (js/site.js, depuis le 05/10)
  ['un caractere de controle dans un script du site', 'js/site.js', s => s.replace('/[?&]photo\\b/', '/[?&]photo' + String.fromCharCode(8) + '/')],
  // ---------- (23/10/2026) le bandeau de la fermeture (OUVERT) et les joueurs en ligne (js/site.js) ----------
  ['le bandeau pose sans son interrupteur', 'js/site.js', s => s.replace('\n  if (!OUVERT) bandeauOuverture()\n', '\n  bandeauOuverture()\n')],
  ['un mot de la fermeture hors du bandeau', 'js/site.js', s => s.replace('\n  var OUVERT = false\n', '\n  var OUVERT = false\n  document.title += \' (bientôt)\'\n')],
  ['deux interrupteurs OUVERT', 'js/site.js', s => s.replace('\n  var OUVERT = false\n', '\n  var OUVERT = false\n  var OUVERT = true\n')],
  ['le bandeau ecrit comme du code de page', 'js/site.js', s => s.replace("    t.appendChild(document.createTextNode('Casteria ouvre", "    t.innerHTML = '';\n    t.appendChild(document.createTextNode('Casteria ouvre")],
  ['le bandeau qui ne dit plus bientot', 'js/site.js', s => s.replace('Casteria ouvre bientôt : ', 'Casteria : ')],
  // (27/10/2026) fermé, le badge du haut dit l'ouverture et ne lit jamais le nombre de joueurs
  ['le badge qui ne dit plus l\'ouverture', 'js/site.js', s => s.replace("e.textContent = 'Ouverture bientôt'", "e.textContent = 'Serveur'")],
  ['le badge qui lit les joueurs ferme', 'js/site.js', s => s.replace('  if (OUVERT && enLigne.length && SOURCE_EN_LIGNE && window.fetch) {', '  if (enLigne.length && SOURCE_EN_LIGNE && window.fetch) {')],
  ['le bandeau qui n\'est plus fixe', 'css/style.css', s => s.replace('.ouverture { position: fixed;', '.ouverture { position: static;')],
  ['la page qui ne garde pas la place du bandeau', 'css/style.css', s => s.replace('html.avec-ouverture body { padding-bottom: 64px; }', '')],
  ['les joueurs en ligne ecrits comme du code de page', 'js/site.js', s => s.replace("      e.textContent = ''\n", "      e.innerHTML = ''\n")],
  ['les joueurs en ligne sans limite de temps', 'js/site.js', s => s.replace('var EN_LIGNE_VIEUX_MS = 15 * 60000', 'var EN_LIGNE_VIEUX_MS = 1500 * 60000')],
  ['les joueurs en ligne qui lisent le classement', 'js/site.js', s => s.replace('var n = d ? d.en_ligne : null', 'var n = d ? (d.en_ligne || d.categories.length) : null')],
  ['les joueurs en ligne lus avec les cookies', 'js/site.js', s => s.replace("fetch(SOURCE_EN_LIGNE, { credentials: 'omit'", "fetch(SOURCE_EN_LIGNE, { credentials: 'include'")],
  // ---------- (25/10/2026) le badge du haut : « N joueurs en ligne », « Serveur en ligne » à 0, rien si vieux ou absent ----------
  ['zero joueur ecrit « 0 joueurs en ligne »', 'js/site.js', s => s.replace("if (n === 0) e.appendChild(document.createTextNode('Serveur en ligne'))", "if (n === -99) e.appendChild(document.createTextNode('Serveur en ligne'))")],
  ['zero joueur cache le badge', 'js/site.js', s => s.replace('&& n >= 0 &&', '&& n >= 1 &&')],
  ['un nombre negatif montre', 'js/site.js', s => s.replace('&& n >= 0 &&', '&& n >= -5 &&')],
  ['une lecture vieille de 50 minutes montree', 'js/site.js', s => s.replace('Date.now() - lu <= EN_LIGNE_VIEUX_MS', 'Date.now() - lu <= EN_LIGNE_VIEUX_MS * 4')],
  ['une lecture vieille ne cache plus un badge deja montre', 'js/site.js', s => s.replace('if (!bon) { e.hidden = true; return }', 'if (!bon) { return }')],
  ['un nombre a virgule montre', 'js/site.js', s => s.replace('n === Math.floor(n) && ', '')],
  ['un nombre en texte montre', 'js/site.js', s => s.replace("typeof n === 'number' && n === Math.floor(n)", 'Number(n) === Math.floor(n)')],
  ['une donnee sans heure montree', 'js/site.js', s => s.replace("String(d.en_ligne_lu || d.lu || '')", 'String(d.en_ligne_lu || d.lu || new Date().toISOString())')],
  ['le singulier oublie', 'js/site.js', s => s.replace("n === 1 ? ' joueur en ligne'", "n === 1 ? ' joueurs en ligne'")],
  ['l\'ancien texte garde a la relecture', 'js/site.js', s => s.replace("      e.textContent = ''\n", '')],
  ['le nombre ecrit comme du code de page', 'js/site.js', s => s.replace("b.textContent = n.toLocaleString('fr-FR')", "b.innerHTML = n.toLocaleString('fr-FR')")],
  ['l\'espace fine que la police ne dessine pas', 'js/site.js', s => s.replace(".split('\\u202f').join('\\u00a0')", '')],
  ['le badge jamais relu', 'js/site.js', s => s.replace('    setInterval(lireEnLigne, EN_LIGNE_RELIRE_MS)\n', '')],
  ['le badge hors de la section du haut', 'index.html', s => s.replace('    <p class="en-ligne" data-en-ligne hidden></p>\n    <p class="cinema-accroche">', '    <p class="cinema-accroche">').replace('    <p class="preuves">Gratuit', '    <p class="en-ligne" data-en-ligne hidden></p>\n    <p class="preuves">Gratuit')],
  ['la plaque vide visible au depart', 'css/style.css', s => s.replace('.en-ligne[hidden] { display: none; }\n', '')],
  ['le pouls qui ne se calme pas', 'css/style.css', s => s.replace('@media (prefers-reduced-motion: reduce) { .en-ligne::before { animation: none; } }', '')],
  ['la place des joueurs en ligne visible au depart', 'index.html', s => s.replace('<p class="en-ligne" data-en-ligne hidden></p>', '<p class="en-ligne" data-en-ligne></p>')],
  ['l\'identifiant du gist dans un autre script', 'js/carrousel.js', s => s + '\n// 4337783e1d14963774decfe06f2709da\n']
]

// MUTANTS_SEULS=<un morceau du nom> : seulement ceux-là (pour rejouer un mutant récrit)
const CHOISIS = process.env.MUTANTS_SEULS ? MUTANTS.filter(m => m[0].includes(process.env.MUTANTS_SEULS)) : MUTANTS
let rates = 0, code = 0
try {
  const sain = lancer()
  console.log('le site sain (sa copie) : code ' + sain.status)
  if (sain.status !== 0) { console.log(sain.stdout.split('\n').filter(l => /FAUTE/.test(l)).slice(0, 8).join('\n')); console.log('LE SITE N\'EST PAS SAIN : corrige-le d\'abord (npm run verifier), les mutants ne prouvent rien sur un site rouge'); code = 2 }
  else {
    for (const [nom, f, muter] of CHOISIS) {
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
    console.log(rates ? rates + ' mutant(s) non attrape(s) sur ' + CHOISIS.length : CHOISIS.length + ' mutants, tous refuses')
    code = rates || fin.status ? 1 : 0
  }
} finally {
  try { fs.rmSync(COPIE, { recursive: true, force: true }) } catch (e) { console.log('(la copie ' + COPIE + ' n\'a pas pu etre effacee)') }
}
process.exit(code)
