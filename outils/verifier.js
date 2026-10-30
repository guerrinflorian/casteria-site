// Les règles du site, vérifiées en une seconde : npm run verifier (code 0 : tout est bon)
'use strict'
const fs = require('fs'), path = require('path')
const RACINE = path.join(__dirname, '..'), PAGES = ['index.html', 'commencer.html', 'pirates.html', 'casino.html', 'donjons.html', 'evenements.html', 'classement.html', 'boutique.html', 'reglement.html', 'vote.html', 'discord.html', 'rejoindre.html', 'mentions-legales.html', 'confidentialite.html', 'conditions.html', 'merci.html', '404.html', 'serveur-minecraft-ile.html', 'serveur-minecraft-modde.html', 'launcher-minecraft-modde.html', 'serveur-minecraft-rpg.html', 'serveur-minecraft-boss.html', 'connexion.html', 'compte.html', 'admin.html',
  // (29/10/2026, 67) la carte vivante, le fil des exploits, le profil public et son image de partage
  'carte.html', 'exploits.html', 'joueur.html', 'partage.html', 'ile.html',
  // (37, le 30/10/2026) les nouveautés de chaque mise en ligne (b5_assembleur/nouveautes.js)
  'nouveautes.html']
// LES FICHIERS LOURDS PERMIS (aucun depuis le 13/10/2026 : la bande-annonce de l'accueil a été retirée sur la demande du
// propriétaire) : un fichier de plus de 5 Mo n'entre ici qu'avec son plafond en Mo, et la vidéo qui le cite porte
// « data-clic » (chargée au clic du visiteur), jamais « data-auto »
// (27/10/2026) le trailer en 1080p : cite par AUCUNE page (le lien du Discord et de la publicite), 32 Mo au plus
const LOURDS_PERMIS = { 'assets/videos/casteria-trailer.mp4': 32 }
// (37, le 30/10/2026) LES FICHIERS DU VPS : le trailer de l'accueil (1080p et 720p en MP4, 1080p en WebM), posés par la tête
// dans /media/ du VPS, jamais dans ce dépôt ; cités par la seule vidéo du trailer (index.html, #trailer-video)
const SUR_LE_VPS = ['/media/trailer_1080.mp4', '/media/trailer_720.mp4', '/media/trailer_1080.webm']
// les pages qui restent hors de Google et hors du plan du site : la 404, et « Merci » (la page de retour après un achat)
// (29/10/2026, le prototype du compte) la connexion, le compte du joueur et l'espace de l'équipe : hors de Google aussi
// (29/10/2026, 67) le profil (joueur.html, le modele que le VPS remplit pour chaque joueur) et le patron de son image de partage
const HORS_GOOGLE = ['404.html', 'merci.html', 'rejoindre.html', 'connexion.html', 'compte.html', 'admin.html', 'joueur.html', 'partage.html', 'ile.html']
// les mots qui diraient que le serveur n'est pas ouvert (le propriétaire, 05/10) : les pages, et les phrases du classement
const MOTS_INTERDITS = ['en développement', 'bientôt', 'pas encore ouvert', 'ouvrira', "jour de l'ouverture"]
// (19/10/2026, les pages du casino et des donjons) AUCUN SPOILER (le propriétaire) : jamais l'Abyssarque, jamais le dernier
// boss, jamais la salle du trône ; les donjons se montrent sans leurs boss (ni leur nom)
const SPOILERS = ['Abyssarque', 'Dragon Ancien', 'salle du trône', 'Cœur Creux', 'Coeur Creux', "Sphinx d'Or", 'Sphinx d’Or',
  // (22/10/2026, la tête) AUCUN BOSS DE LA FIN DE PARTIE, ni nommé ni montré (seuls le Yéti, le Kraken et l'Oni se montrent ;
  // le Roi Champignon, le premier, reste dans les premiers pas) : leurs noms, et les fichiers de leurs modèles
  'Dévoreur', 'devoreur', 'Mécha Titan', 'Mecha Titan', 'mecha_titan', 'IA Néon', 'Archimage', 'Chevalier Noir', 'Capitaine Fantôme',
  'Minotaure', 'Djinn des Sables', 'djinn_sables', 'Colosse des Profondeurs', 'Dernier Amiral', 'Gaspard-des-Brumes', 'La Damnation']
// (19/10/2026, le propriétaire : « ya pas que 15 boss y'en a plus, faut pas dire le nombre ! ») AUCUN NOMBRE DE BOSS, ni
// d'arènes, en chiffres ou en lettres (« 15 boss », « quinze arènes », « 15</b><span>boss ») : dans le texte, les titres,
// les descriptions, les textes des images, le JSON-LD et les scripts du site ; un rang (« le quatrième boss ») reste permis
const NOMBRE_DE_BOSS = /(?:^|[^a-zà-ÿ0-9])(?:\d+|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|dix-sept|dix-huit|dix-neuf|vingt|trente|quarante|cinquante)(?:\s|&#160;|&nbsp;|<[^>]*>)+(?:[a-zà-ÿ]+(?:\s|&#160;|&nbsp;)+)?(?:boss|ar[eè]nes?)(?![a-zà-ÿ])/i
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
  // (la 119) l'identifiant PUBLIC du gist du classement (32 caractères hexadécimaux, dans l'adresse du fichier) : permis
  // seulement à sa place, la ligne GIST_ID de js/classement.js (ce n'est pas une clé : le jeton qui écrit le gist reste sur le
  // serveur du jeu)
  const gistId = ((fs.existsSync(path.join(RACINE, 'js', 'classement.js')) ? fs.readFileSync(path.join(RACINE, 'js', 'classement.js'), 'utf8') : '').match(/\n  var GIST_COMPTE = '[A-Za-z0-9-]{1,39}', GIST_ID = '([0-9a-f]{32})'\n/) || [])[1] || ''
  // (23/10/2026) le même gist, lu par js/site.js pour les joueurs en ligne : permis à SA ligne GIST_ID de js/site.js
  const gistIdSite = ((fs.existsSync(path.join(RACINE, 'js', 'site.js')) ? fs.readFileSync(path.join(RACINE, 'js', 'site.js'), 'utf8') : '').match(/\n  var GIST_COMPTE = '[A-Za-z0-9-]{1,39}', GIST_ID = '([0-9a-f]{32})'\n/) || [])[1] || ''
  const textes = fs.readdirSync(RACINE).filter(n => /\.(html|js|json|md|txt|xml)$/.test(n)).concat(fs.readdirSync(path.join(RACINE, 'js')).map(n => 'js/' + n), fs.readdirSync(path.join(RACINE, 'css')).map(n => 'css/' + n),
    fs.existsSync(path.join(RACINE, 'api')) ? fs.readdirSync(path.join(RACINE, 'api')).map(n => 'api/' + n) : [])
  for (const n of textes) {
    if (n === 'package-lock.json') continue
    for (const m of fs.readFileSync(path.join(RACINE, n), 'utf8').match(/[A-Fa-f0-9]{32,}/g) || []) if (m !== permis && !(n === 'js/classement.js' && m === gistId) && !(n === 'js/site.js' && m === gistIdSite)) faute(n + ' : une suite de ' + m.length + ' lettres et chiffres qui ressemble à une clé (« ' + m.slice(0, 6) + '... ») : aucune clé dans ce dépôt')
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
  // la page (30/10/2026, le propriétaire : « il faut juste être connecté pour payer ») : ON ACHÈTE CONNECTÉ ; pour qui on
  // achète, « Connecte-toi pour acheter » et son bouton vers la connexion (qui ramène à la boutique), le bouton gris au
  // départ ; plus aucun champ de pseudo ni case à cocher
  const page = lire('boutique.html'), merci = lire('merci.html')
  if (c.jeton) {
    for (const [quoi, motif] of [['« Tu achètes pour » et le pseudo de la session', /Tu achètes pour <b id="achat-pseudo"><\/b>/], ['« Connecte-toi pour acheter »', /<p class="achat-connexion-titre">Connecte-toi pour acheter<\/p>/], ['le bouton vers la connexion, qui ramène à la boutique', /<a class="bouton bouton-or grand" href="connexion\.html\?retour=boutique\.html" id="achat-connecter">/], ['le bouton « Payer » gris au départ', /id="achat-payer" disabled/]]) if (!motif.test(page)) faute('boutique.html : ' + quoi + ' manque')
    if (/<input id="pseudo"|id="pseudo-sur"/.test(page)) faute('boutique.html : un champ de pseudo ou la case « C\'est bien mon pseudo » est revenu (on achète connecté)')
    if (!/Les crédits partent sur le compte qui était connecté au moment de payer\./.test(merci)) faute('merci.html : la phrase sur le compte crédité manque')
  }
  // (20/10/2026, le propriétaire : « je trouve la boutique affreuse [...] avec les couleurs et tout ») la boutique redessinée
  // dans la nuit et l'or du site : sa feuille css/boutique.css, chargée par la page ; plus de tableau de parchemin
  // (cadre-bois) ni de bouton vert au milieu de la nuit ; et dans sa feuille, jamais une pastille arrondie (le propriétaire)
  if (!page.includes('<link rel="stylesheet" href="css/boutique.css">')) faute('boutique.html : sa feuille css/boutique.css n\'est pas chargée')
  if (/class="[^"]*\b(?:cadre-bois|bouton-vert)\b/.test(page)) faute('boutique.html : le tableau de parchemin (cadre-bois) ou le bouton vert est revenu (la boutique est dans la nuit et l\'or du site)')
  // (29/10/2026, le style neuf validé par le propriétaire : tout arrondi) la règle « aucun arrondi » est retirée : css/boutique.css
}
// LE CLASSEMENT ET LES PAGES DU COMPTE (le prototype du 29/10/2026 ; le contrat : API.md, à côté du site). Le classement ne lit
// plus le gist : TOUT passe par l'API du site (le VPS de casteria.fr, la même origine : /api/...), par UN seul script,
// js/api.js (CasteriaApi), et son interrupteur des données d'essai (ESSAI : donnees-essai/, des pseudos et des chiffres
// inventés, et un bandeau qui le dit). Les autres scripts du compte ne parlent jamais au réseau eux-mêmes. Rien de reçu ne
// s'écrit comme du code de page. (le 20/10/2026, gardé) La fonction api/classement.js de Vercel ne revient pas : l'API vit
// sur le VPS et ne recompte rien (« le jeu calcule, l'API lit »).
const SCRIPTS_COMPTE = ['js/api.js', 'js/classement.js', 'js/peau.js', 'js/connexion.js', 'js/compte.js', 'js/admin.js', 'js/graphe.js']
const SANS_RESEAU = ['js/classement.js', 'js/peau.js', 'js/connexion.js', 'js/compte.js', 'js/admin.js', 'js/graphe.js']
// la seule adresse complète permise dans ces scripts : l'espace de noms du SVG (js/graphe.js), qui n'est pas une adresse lue
const ADRESSES_PERMISES = { 'js/graphe.js': ['http://www.w3.org/2000/svg'] }
// (29/10/2026) les vrais pseudos connus (l'équipe, les vidéastes) : jamais dans les données d'essai
const VRAIS_PSEUDOS = ['_Floskyl_', 'LRVG57', 'Elcoo1', 'Bloubi_', 'kidnamed', 'Aviteur']
const LA_3D = 'assets/vendor/skinview3d/skinview3d.bundle.js'
function codeDe(js) { return js.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n') }
function verifierClassement(faute) {
  const js = lire('js/classement.js')
  if (!js) return faute('js/classement.js manque')
  if (lire('api/classement.js')) faute('api/classement.js est revenu : le classement vient de l\'API du site sur le VPS (API.md), jamais d\'une fonction de Vercel (retirée le 20/10/2026)')
  let vj = null
  try { vj = JSON.parse(lire('vercel.json')) } catch (e) { vj = null }
  if (!vj) faute('vercel.json illisible')
  else if (vj.functions && Object.keys(vj.functions).length) faute('vercel.json : une fonction est revenue (« functions ») : le site n\'en a pas (l\'API vit sur le VPS)')
  for (const f of SCRIPTS_COMPTE) {
    const s = lire(f)
    if (!s) { faute(f + ' manque'); continue }
    const code = codeDe(s)
    if (/innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function\(/.test(code)) faute(f + ' : un texte reçu ne s\'écrit jamais comme du code de page (textContent seulement)')
    for (const u of code.match(/https?:\/\/[^\s'"`)]+/g) || []) if (!(ADRESSES_PERMISES[f] || []).includes(u)) faute(f + ' : une adresse d\'un autre serveur : ' + u + ' (une seule origine : /api/... du site)')
    for (const mot of MOTS_INTERDITS) if (new RegExp('(^|[^a-zà-ÿ])' + mot, 'i').test(code)) faute(f + ' : un mot interdit : « ' + mot + ' »')
    if (SANS_RESEAU.includes(f) && /\bfetch\(|XMLHttpRequest|EventSource|sendBeacon/.test(code)) faute(f + ' : il parle au réseau lui-même : tout passe par CasteriaApi (js/api.js)')
    if (/console\.(log|info|debug|warn|error)\(/.test(code)) faute(f + ' : rien dans la console (une donnée du joueur, un mot de passe n\'y vont jamais)')
  }
  // js/api.js : l'interrupteur des données d'essai, déclaré une fois ; le bandeau sous lui ; la même origine seulement
  const api = codeDe(lire('js/api.js') || '')
  const decl = api.match(/\n  var ESSAI = (true|false)(?=\n)/g) || [], aff = (api.match(/\bESSAI\s*=(?!=)/g) || []).length
  if (decl.length !== 1 || aff !== 1) faute('js/api.js : l\'interrupteur « var ESSAI = true|false » doit être déclaré une fois (' + decl.length + ')')
  if (!api.includes('\n  if (ESSAI) bandeauEssai()\n') || (api.match(/(?<!function )bandeauEssai\(\)/g) || []).length !== 1) faute('js/api.js : le bandeau des données d\'essai se pose sous l\'interrupteur (« if (ESSAI) bandeauEssai() »), et nulle part ailleurs')
  if (!/function bandeauEssai\(\) \{[\s\S]*?Données d\\'essai/.test(api)) faute('js/api.js : le bandeau dit « Données d\'essai » (les pseudos et les chiffres sont inventés)')
  if (!/credentials: 'same-origin'/.test(api) || /credentials: '(include|omit)'/.test(api)) faute('js/api.js : les demandes partent vers la même origine, le cookie de session avec (credentials: \'same-origin\'), jamais vers un autre site')
  for (const m of api.match(/demander\('[^']*'/g) || []) if (!/^demander\('(\/api\/|donnees-essai\/)/.test(m)) faute('js/api.js : une demande hors de /api/ (ou des données d\'essai) : ' + m)
  if (!/new EventSource\('\/api\/admin\/tchat'\)/.test(api)) faute('js/api.js : le tchat en direct arrive par /api/admin/tchat (un flux SSE, API.md 4.8)')
  if (!/demander\('\/api\/connexion', \{ methode: 'POST'/.test(api)) faute('js/api.js : la connexion part en POST vers /api/connexion (jamais le mot de passe dans l\'adresse)')
  // la peau : seulement une adresse de l'API ou du site
  if (!/function peau\(u\) \{[\s\S]*?\\\/api\\\/peau\\\/\[A-Za-z0-9_\]\{3,16\}\$/.test(api)) faute('js/api.js : une peau ne vient que de /api/peau/<pseudo> (ou des peaux du site) : la règle de peau() manque')
  const peau = codeDe(lire('js/peau.js') || '')
  if ((peau.match(/A\.peau\(url\)/g) || []).length < 3) faute('js/peau.js : chaque peau passe par CasteriaApi.peau() (la tête, le joueur de face, la 3D)')
  // la 3D : skinview3d copiée dans le site (jamais un CDN), sa licence à côté, chargée par js/peau.js seulement (après la page)
  if (!peau.includes("var BIBLIO = '" + LA_3D + "'")) faute('js/peau.js : la 3D se charge depuis la copie du site (' + LA_3D + '), jamais d\'ailleurs')
  if (!fs.existsSync(path.join(RACINE, LA_3D))) faute(LA_3D + ' manque (skinview3d, copiée dans le site)')
  const lic = lire('assets/vendor/skinview3d/LICENCES.txt')
  if (!/MIT License/.test(lic) || !/skinview3d/.test(lic) || !/three\.js/.test(lic)) faute('assets/vendor/skinview3d/LICENCES.txt : les licences MIT de skinview3d et de three.js, à côté de la bibliothèque')
  for (const p of PAGES) if (lire(p).includes('skinview3d')) faute(p + ' : la 3D ne se charge jamais par la page (js/peau.js la charge après, au repos ou au premier geste)')
  // le classement : la panne ; les donjons (niveaux, tailles), le hasard (ses colonnes), les îles ; les choix disent lesquels sont choisis
  const code = codeDe(js)
  if (!code.includes("'Le classement ne s\\'affiche pas pour l\\'instant. En jeu, tape /top.'")) faute('js/classement.js : la phrase de la panne manque (« Le classement ne s\'affiche pas pour l\'instant. En jeu, tape /top. »)')
  if (!code.includes('c.donjon') || !code.includes('.tailles')) faute('js/classement.js : la page lit le donjon et les tailles de groupe d\'un temps de donjon (« donjon », « tailles »)')
  if (!code.includes('c.hasard') || !code.includes('.hasard.col')) faute('js/classement.js : les cinq colonnes d\'un jeu de hasard se choisissent sous lui (« hasard », sa colonne)')
  if (!code.includes('if (l.ile) {') || !code.includes('function nbAmis(')) faute('js/classement.js : une ligne d\'île (le thème Îles) écrit le nom de l\'île en grand, l\'hôte et ses amis en petit')
  if (!code.includes("setAttribute('aria-pressed'")) faute('js/classement.js : un choix (classement, niveau, joueurs, colonne) dit s\'il est choisi (aria-pressed)')
  if (!code.includes("setAttribute('role', 'tab')") || !code.includes("'aria-selected'")) faute('js/classement.js : les thèmes sont des onglets (role tab, aria-selected)')
  // (18/10/2026, gardé) un pseudo du podium tient sur une ligne : ajusterPodium, au dessin, quand les polices arrivent, quand la fenêtre change
  if (!/function ajusterPodium\(/.test(code) || code.split('ajusterPodium').length < 6 || !code.includes("'loadingdone'")) faute('js/classement.js : un pseudo du podium tient sur une ligne (ajusterPodium : au dessin, quand les polices arrivent, quand la fenêtre change de taille)')
  if (!code.includes('A.moi()') || !code.includes("'cl-marque toi'")) faute('js/classement.js : « Toi » se surligne quand le joueur est connecté (CasteriaApi.moi)')
  // jamais une pastille arrondie (le propriétaire) : aucun arrondi dans les feuilles du classement, du compte et de l'espace admin
  // (29/10/2026, le style neuf validé par le propriétaire : tout arrondi) la règle « aucun arrondi » est retirée : classement, compte, admin, motifs
  // (29/10/2026 ; le propriétaire : « pas faire tout moche fond violet simple ») LE KIT DES MOTIFS (css/motifs.css, le
  // KIT_MOTIFS.md du kit) : chaque dessin appelé par une feuille existe (sinon le fond redevient uni sans rien dire) ; les
  // pages du compte chargent le kit après style.css, posent un fond dessiné et une frise entre deux sections
  for (const f of ['css/style.css', 'css/motifs.css', 'css/classement.css', 'css/compte.css', 'css/admin.css']) for (const m of (lire(f) || '').matchAll(/url\(\s*["']?(\.\.\/assets\/[^"')]+)["']?\s*\)/g)) if (!fs.existsSync(path.join(RACINE, 'css', m[1]))) faute(f + ' : le dessin ' + m[1] + ' manque (le fond serait uni)')
  for (const p of ['classement.html', 'connexion.html', 'compte.html', 'admin.html']) {
    const h = lire(p) || '', i = h.indexOf('<link rel="stylesheet" href="css/style.css">'), j = h.indexOf('<link rel="stylesheet" href="css/motifs.css">')
    if (i < 0 || j < i) faute(p + ' : le kit des motifs (css/motifs.css) se charge, après css/style.css')
    if (!/class="[^"]*\bfond-(ciel|pierres|carte|bois|mer)\b/.test(h)) faute(p + ' : aucun fond dessiné (fond-ciel, fond-pierres, fond-carte, fond-bois, fond-mer) : jamais un fond uni')
    if (!/class="frise frise-(vague|corde|creneaux|etoiles|parchemin)\b/.test(h)) faute(p + ' : aucune frise entre deux sections (frise-vague, frise-corde, frise-creneaux, frise-etoiles, frise-parchemin)')
  }
  // (b5, l'assemblage du 29/10 ; la tete : « le kit sur toutes les pages, meme celles que personne n'a touchees ») chaque page qui
  // charge css/style.css charge aussi le kit, juste apres, et ses deux polices prechargees (woff2, le ttf en secours)
  for (const p of fs.readdirSync(RACINE).filter(n => n.endsWith('.html'))) {
    const h = lire(p) || '', m = /<link rel="stylesheet" href="(\/?)css\/style\.css">/.exec(h)
    if (!m) continue
    if (h.indexOf('<link rel="stylesheet" href="' + m[1] + 'css/motifs.css">') < m.index) faute(p + ' : le kit des motifs (css/motifs.css) se charge, après css/style.css')
    for (const pol of ['fredoka', 'lilita_one']) if (!h.includes('<link rel="preload" href="' + m[1] + 'assets/polices/' + pol + '.woff2" as="font" type="font/woff2" crossorigin>')) faute(p + ' : la police ' + pol + '.woff2 n\'est pas prechargee')
  }
  for (const pol of ['fredoka', 'lilita_one']) if (!fs.existsSync(path.join(RACINE, 'assets/polices', pol + '.woff2')) || !new RegExp('url\\("\\.\\./assets/polices/' + pol + '\\.woff2"\\) format\\("woff2"\\), url\\("\\.\\./assets/polices/' + pol + '\\.ttf"\\)').test(lire('css/style.css'))) faute('css/style.css : la police ' + pol + ' en woff2 d\'abord, le ttf en secours')
  // (la tete, 29/10) https://casteria.fr/#telecharger est donnee aux sites de listes de serveurs : l'accueil garde UNE section
  // id="telecharger", et dedans les boutons du launcher (l'installateur de Windows au moins, et le Mac)
  {
    const h = lire('index.html') || '', ids = h.match(/\sid="telecharger"/g) || [], i = h.search(/<section\b[^>]*\sid="telecharger"/)
    const sec = i < 0 ? '' : h.slice(i, h.indexOf('</section>', i))
    if (ids.length !== 1 || i < 0) faute('index.html : une seule section id="telecharger" (l\'adresse casteria.fr/#telecharger des sites de listes) : ' + ids.length + ' id, ' + (i < 0 ? 'aucune section' : 'une section'))
    else if (!/href="https:\/\/github\.com\/guerrinflorian\/casteria-mc\/releases\/download\/installateur\/Casteria-Installation\.exe"/.test(sec) || !/data-track="download-windows"/.test(sec) || !/data-track="download-mac"/.test(sec)) faute('index.html : la section #telecharger porte les boutons du launcher (Windows, Mac)')
  }
  // (la tete, 29/10) UNE PAGE LUE SANS JAVASCRIPT MONTRE SON TEXTE : l'etat cache d'avant l'apparition (.apparait, opacite 0)
  // n'existe que sous @media (scripting: enabled) ; jamais une regle « .apparait { opacity: 0 » hors de ce bloc
  {
    const st = lire('css/style.css') || '', i = st.indexOf('.apparait { opacity: 0'), b = st.lastIndexOf('@media (scripting: enabled) {', i)
    if (i < 0 || b < 0 || i - b > 400 || st.indexOf('.apparait { opacity: 0', i + 1) >= 0) faute('css/style.css : « .apparait » cache seulement sous @media (scripting: enabled) (une page lue sans JavaScript montre tout)')
  }
  // 44 PX AU DOIGT (la tete, 29/10) : chaque point d'un carrousel est une zone de 44 x 44 (le losange dessine au milieu), et une
  // rangee qui ne tient pas s'efface (js : placePoints) ; au telephone, le logo de la barre garde une zone de 44 de haut
  {
    const pt = (reglesCss(lire('css/carrousel.css')).find(r => r.sel.trim() === '.carrousel-points button') || {}).corps || ''
    if (!/width:\s*44px/.test(pt) || !/height:\s*44px/.test(pt)) faute('css/carrousel.css : un point du carrousel fait 44 x 44 au doigt (.carrousel-points button)')
    if (!/function placePoints\(\) \{ points\.hidden = n \* 44 > /.test(lire('js/carrousel.js'))) faute('js/carrousel.js : une rangee de points qui ne tient pas a 44 px s\'efface (placePoints)')
    if (!/\.barre \.marque \{ min-height: 44px;/.test(lire('css/style.css'))) faute('css/style.css : au telephone, le logo de la barre garde 44 px de haut au doigt (.barre .marque { min-height: 44px })')
  }
  // (la tête, 29/10) UN NOMBRE NE SE COUPE JAMAIS, nulle part : ni dans le texte affiché des pages (hors des balises, des
  // scripts et des styles), ni dans les textes des scripts ; CasteriaApi.texte rend insécables les milliers et le trait
  // d'union des textes du jeu ; jamais une coupure de mot dans un panneau du kit (hyphens: manual)
  for (const p of PAGES) {
    const vu = (lire(p) || '').replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]*>/g, ' ')
    const m = vu.match(/\d[ \u202f]\d{3}(?![\d])/)
    if (m) faute(p + ' : « ' + m[0] + ' » : l\'espace des milliers est insécable (&nbsp;), jamais une espace ordinaire (un nombre ne se coupe jamais)')
  }
  for (const f of SCRIPTS_COMPTE.concat(['js/site.js', 'js/boutique.js'])) for (const m of codeDe(lire(f) || '').match(/'(?:[^'\\\n]|\\.)*'/g) || []) if (/\d[ \u202f]\d{3}(?!\d)/.test(m)) faute(f + ' : un texte du script coupe un nombre (« ' + m.slice(0, 40) + ' ») : l\'espace des milliers est insécable')
  if (!api.includes("function texte(t) { return String(t === undefined || t === null ? '' : t).replace(/(\\d)[ \\u202f](?=\\d{3}(?!\\d))/g, '$1' + NBSP)") || !api.includes("'$1' + TIRET_INSECABLE)")) faute('js/api.js : CasteriaApi.texte rend insécables les milliers d\'un texte du jeu (et le trait d\'union d\'un mot composé)')
  if (!reglesCss(lire('css/motifs.css')).some(r => /\.panneau-nuit/.test(r.sel) && /hyphens\s*:\s*manual/.test(r.corps))) faute('css/motifs.css : jamais une coupure de mot dans un panneau (hyphens: manual)')
  // (le propriétaire, 29/10 vers 18:10 : « donner envie aux joueurs de faire partie du serveur ») CHAQUE PAGE MÈNE AU JEU,
  // à sa place : au classement « Ta place t'attend » (le launcher), à la fiche « Toi aussi, construis ton île », au compte
  // sans session « Crée-le en jeu : /register » ; connecté, la page le pousse à monter (la place à viser, l'aspect le plus faible)
  {
    const cp = codeDe(lire('js/compte.js') || '')
    if (!code.includes("'Ta place t\\'attend'") || !code.includes("'Toi aussi, construis ton île'") || (code.match(/\.href = '\.\/#telecharger'/g) || []).length < 2) faute('js/classement.js : le classement mène au jeu : « Ta place t\'attend » et « Toi aussi, construis ton île », avec le launcher (./#telecharger)')
    if (!code.includes('function dessinerMonter(') || !code.includes("'Encore ' + A.nombre(manque)") || !code.includes('Ton aspect le plus faible monte le plus vite.')) faute('js/classement.js : connecté, la page pousse à monter (les points qui manquent pour la place à viser, l\'aspect le plus faible)')
    if (!cp.includes("'Pas encore de compte ? Crée-le en jeu : '") || !cp.includes("tel.href = './#telecharger'")) faute('js/compte.js : sans session, « Pas encore de compte ? Crée-le en jeu : /register », et le launcher')
    if (!cp.includes("m.niveau.prochain.nom")) faute('js/compte.js : le compte dit son prochain déblocage de niveau (niveau.prochain)')
  }
  // (la tête, 29/10, les neuf choix ; le propriétaire, 29/10 vers 17:05, l'espace de l'équipe)
  // - jamais un nombre de boss : le classement retire boss_vaincus et boss_heroiques (même si l'API les envoyait), et aucune
  //   page ne lit un compte de boss d'un joueur (« vaincus », « heroiques ») : ses victoires seulement
  if (!code.includes('var HORS_SITE = { boss_vaincus: 1, boss_heroiques: 1 }') || !code.includes('!HORS_SITE[c.id]')) faute('js/classement.js : les classements dont le texte dit un nombre de boss (boss_vaincus, boss_heroiques) ne se montrent jamais (HORS_SITE)')
  for (const f of ['js/classement.js', 'js/compte.js', 'js/admin.js']) if (/\.boss\.(vaincus|heroiques)\b/.test(codeDe(lire(f) || ''))) faute(f + ' : un compte de boss d\'un joueur (boss.vaincus, boss.heroiques) : jamais un nombre de boss, ses victoires seulement')
  // - (30/10/2026) la boutique achète pour le pseudo de la SESSION (/api/moi, par CasteriaApi) et pour lui seul : le
  //   panier de Tebex reçoit pseudoConnecte, jamais un texte écrit dans la page ; pas connecté, pas de paiement
  {
    const b = codeDe(lire('js/boutique.js') || ''), h = lire('boutique.html') || ''
    if (!b.includes('window.CasteriaApi.moi().then(')) faute('js/boutique.js : le pseudo vient de la session du site (CasteriaApi.moi)')
    if (!b.includes('var pseudo = pseudoConnecte') || !b.includes("compte !== 'connecte'")) faute('js/boutique.js : le panier part pour le pseudo de la session seulement, et jamais sans session')
    if (/getElementById\('pseudo'\)|\.checked\s*=/.test(b)) faute('js/boutique.js : un champ de pseudo ou une case à cocher est revenu (on achète connecté)')
    const ia = h.indexOf('<script src="js/api.js" defer></script>'), ib = h.indexOf('<script src="js/boutique.js" defer></script>')
    if (ia < 0 || ib < 0 || ia > ib) faute('boutique.html : js/api.js se charge avant js/boutique.js (le pseudo de qui est connecté)')
  }
  // - l'espace de l'équipe : UN tchat (aucun serveur), aucune liste écrite dans la page (les lieux, les packs, les activités
  //   viennent des données), une valeur absente jamais dessinée comme un 0, la session de l'équipe de 12 heures
  {
    const ad = codeDe(lire('js/admin.js') || ''), gr = codeDe(lire('js/graphe.js') || ''), ap = codeDe(lire('js/api.js') || '')
    if (/data-serveur|l\.serveur|l\.lieu\b/.test(ad)) faute('js/admin.js : le tchat est UN tchat pour tout le réseau : aucune ligne ne se range par serveur')
    if (/'Le palais'|'Les îles'|'Les arènes'|'La planète'|var LIEUX\b/.test(ad)) faute('js/admin.js : une liste écrite dans la page (les lieux) : elle vient des données, avec ses noms')
    if (!ad.includes("var VIDE = 'pas encore de données'") || !/function num\(x\) \{ return typeof x === 'number' && isFinite\(x\) \? x : null \}/.test(ad)) faute('js/admin.js : une valeur absente se dit « pas encore de données », jamais 0 (num, VIDE)')
    if (/valeur\)\s*\|\|\s*0/.test(gr)) faute('js/graphe.js : une valeur absente (null) se dessine comme un 0 : jamais (num)')
    if (!ad.includes("r.corps.erreur === 'reconnexion'") || !ap.includes('var EQUIPE_MS = 12 * 3600000') || !ap.includes("refus(401, 'reconnexion')")) faute('js/admin.js, js/api.js : la session de l\'équipe dure 12 heures (401 « reconnexion », API.md 1.3)')
    if (!ad.includes('function source(d, cle, lu)') || !ad.includes(' ne répond pas : chiffres ')) faute('js/admin.js : chaque tuile dit l\'heure de sa donnée et l\'état de sa source (« Tebex ne répond pas : chiffres de 14:05 »)')
  }
  verifierPagesCompte(faute)
  verifierDonneesEssai(faute)
}
// LES PAGES DU COMPTE : la connexion (le pseudo exact et le mot de passe du jeu ; un POST, jamais le mot de passe dans
// l'adresse ; l'inscription en jeu dite), le compte, l'espace admin (réservé : la page le dit, l'API le refuse)
function verifierPagesCompte(faute) {
  const c = lire('connexion.html'), nu = c.replace(/<!--[\s\S]*?-->/g, '')
  if (!c) return faute('connexion.html manque')
  const form = (nu.match(/<form\b[^>]*id="connexion"[^>]*>/) || [''])[0]
  if (!/\smethod="post"/.test(form) || /\smethod="get"/i.test(nu)) faute('connexion.html : le formulaire part en POST (method="post") : jamais le mot de passe dans l\'adresse')
  if (!/<input id="mot-de-passe" name="mot_de_passe" type="password" autocomplete="current-password"/.test(nu)) faute('connexion.html : le mot de passe dans un champ caché (type="password", autocomplete="current-password")')
  if (!/<input id="pseudo" name="pseudo" type="text" autocomplete="username"/.test(nu)) faute('connexion.html : le pseudo dans son champ (autocomplete="username")')
  if (!/<code>\/register<\/code>/.test(nu) || !/pseudo exact/.test(nu)) faute('connexion.html : la page dit de s\'inscrire d\'abord en jeu (/register) et de taper son pseudo exact')
  const cj = codeDe(lire('js/connexion.js') || '')
  if (/localStorage|sessionStorage/.test(cj)) faute('js/connexion.js : rien n\'est gardé par la page de connexion (ni le pseudo ni le mot de passe)')
  if (!cj.includes("'Trop d\\'essais : réessaie dans une minute.'")) faute('js/connexion.js : trop d\'essais se dit « Trop d\'essais : réessaie dans une minute. »')
  for (const [page, scripts] of [['connexion.html', ['js/api.js', 'js/connexion.js']], ['compte.html', ['js/api.js', 'js/peau.js', 'js/compte.js']], ['admin.html', ['js/api.js', 'js/graphe.js', 'js/admin.js']], ['classement.html', ['js/api.js', 'js/peau.js', 'js/classement.js']]]) {
    const s = lire(page)
    for (const sc of scripts) if (!s.includes('<script src="' + sc + '" defer></script>')) faute(page + ' : le script ' + sc + ' n\'est pas chargé (defer)')
  }
  const ad = codeDe(lire('js/admin.js') || '')
  if (!/!r\.corps\.droits \|\| !r\.corps\.droits\.admin/.test(ad) || !ad.includes('réservée à l\\\'équipe')) faute('js/admin.js : la page ne montre rien à qui n\'a pas le grade (Admin, Responsable, Fondateur) et le dit')
}
// LES DONNÉES D'ESSAI (donnees-essai/) : chaque fichier porte « essai: true », et aucun vrai pseudo connu
function verifierDonneesEssai(faute) {
  const d = path.join(RACINE, 'donnees-essai')
  if (!fs.existsSync(d)) return
  let n = 0
  ;(function lireDossier(x) {
    for (const f of fs.readdirSync(x)) {
      const p = path.join(x, f)
      if (fs.statSync(p).isDirectory()) { lireDossier(p); continue }
      if (!f.endsWith('.json')) continue
      n++
      const s = fs.readFileSync(p, 'utf8'), rel = path.relative(RACINE, p).split(path.sep).join('/')
      let o = null
      try { o = JSON.parse(s) } catch (e) { faute(rel + ' : illisible (' + e.message + ')'); continue }
      if (!o || o.essai !== true) faute(rel + ' : un fichier d\'essai porte « essai: true » (sinon on le prendrait pour une vraie donnée)')
      for (const v of VRAIS_PSEUDOS) if (s.toLowerCase().includes(v.toLowerCase())) faute(rel + ' : un vrai pseudo (« ' + v + ' ») dans les données d\'essai : des pseudos inventés seulement')
      for (const t of TIRETS) if (s.includes(t)) faute(rel + ' : un tiret long ou moyen')
      // (la tête, 29/10) UN NOMBRE NE SE COUPE JAMAIS : aucune espace ordinaire entre les milliers d'un texte d'essai
      { const m = s.match(/\d[ \u202f]\d{3}(?!\d)/); if (m) faute(rel + ' : « ' + m[0] + ' » : l\'espace des milliers est insécable (U+00A0), jamais une espace ordinaire (un nombre ne se coupe jamais)') }
      // (la tête, 29/10) jamais un nombre de boss : ni les classements dont le texte le dit, ni un compte de boss d'un joueur
      if (/"(boss_vaincus|boss_heroiques)"|"vaincus":|"heroiques":/.test(s)) faute(rel + ' : un nombre de boss (boss_vaincus, boss_heroiques, « vaincus », « heroiques ») : seulement des victoires')
      // (le propriétaire, 29/10) le tchat est UN tchat : aucune ligne ne dit son serveur
      if (/admin\/tchat\.json$/.test(rel) && /"serveur":|"lieu":/.test(s)) faute(rel + ' : une ligne du tchat dit son serveur : le tchat est un seul tchat pour tout le réseau')
    }
  })(d)
  if (!n) faute('donnees-essai/ est vide')
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
// LE DISCORD (19/10/2026, le propriétaire : « un casteria.fr/discord qui affiche et redirige vers https://discord.gg/JKyWQ55Nx,
// simple beau efficace la page et direct le bouton pas de chichi ») : l'invitation n'est écrite que dans discord.html, à ses
// trois places (le grand bouton, le refresh d'une seconde, le script qui part sans laisser la page dans l'historique) ; la
// page répond à /discord (vercel.json, « rewrites »), son adresse sans « .html » (ADRESSES). Changer d'invitation : ici ET
// les trois places de discord.html.
// (20/10/2026, la tête) l'invitation PERMANENTE (elle n'expire jamais ; le salon « jouer ») remplace celle de 30 jours citée
// plus haut, qui expirait le 04/11
const DISCORD = 'https://discord.gg/Xp325uTFe7', ADRESSES = { 'discord.html': 'discord', 'rejoindre.html': 'rejoindre' }
// (27/10/2026) LA PAGE DE LA PUBLICITE TIKTOK (le trailer ; le proprietaire : « le but est de hype des gens qui rejoignent le
// Discord ») : rejoindre.html, a /rejoindre, SON invitation a elle (permanente, sur « general ») pour que le Discord compte a part
// les arrivees venues de la publicite ; SANS depart tout seul (une publicite mene a une vraie page) ; hors de Google (noindex).
const PUB = 'https://discord.gg/Xq9w5kYKvj'
// LE VOTE (22/10/2026) : vote.html, sa page. LES SITES DE VOTE sont la seule adresse d'un autre domaine permise sur le site, et
// seulement dans leur liste (<ul class="sites-vote">, la seule de la page : celle du jeu, « votesites » à la console du palais) :
// chacun en https, ouvert à part (target="_blank") avec rel="noopener" ; la liste vide se cache (css/vote.css), la phrase
// « tape /vote » la remplace. Chaque menu et chaque pied de page y mènent ; sa feuille css/vote.css n'a aucun arrondi.
// Les liens de la liste (les commentaires de la page mis à part : le modèle d'un site y est écrit) :
function sitesDeVote() {
  const s = lire('vote.html').replace(/<!--[\s\S]*?-->/g, m => ' '.repeat(m.length)), i = s.indexOf('<ul class="sites-vote"')
  if (i < 0) return { liste: null, liens: [] }
  const liste = dedans(s, i, 'ul')
  return { liste, liens: [...liste.matchAll(/<a\b[^>]*>/g)].map(m => m[0]) }
}
// (23/10/2026 ; le propriétaire : « oui bientôt, mais faudra aussi mettre le nombre de joueurs sur le serveur sur le site »)
// LE BANDEAU DE LA FERMETURE : les mots interdits (MOTS_INTERDITS) ne sont permis QUE dans la fonction bandeauOuverture de
// js/site.js, appelée seulement sous l'interrupteur (« if (!OUVERT) bandeauOuverture() », OUVERT déclaré une fois, vrai ou
// faux) ; partout ailleurs dans le script (le code seul), ils restent interdits ; le texte s'écrit en texte, jamais en code
// de page. LES JOUEURS EN LIGNE : site.js lit le fichier brut classement.json du gist (sans cookie), n'en écrit qu'un nombre
// en texte, se tait au-delà de 15 minutes, et seulement sur une page qui a sa place (data-en-ligne, cachée au départ).
function verifierOuvertureEtEnLigne(faute) {
  const brut = lire('js/site.js')
  if (!brut) return faute('js/site.js manque')
  const code = brut.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n')
  const decl = code.match(/\n  var OUVERT = (true|false)(?=\n)/g) || [], affectations = (code.match(/\bOUVERT\s*=(?!=)/g) || []).length
  if (decl.length !== 1 || affectations !== 1) faute('js/site.js : l\'interrupteur « var OUVERT = true|false » doit être déclaré une fois (' + decl.length + ')')
  const appels = (code.match(/(?<!function )bandeauOuverture\(\)/g) || []).length
  if (!code.includes('\n  if (!OUVERT) bandeauOuverture()\n') || appels !== 1) faute('js/site.js : le bandeau ne se pose que sous l\'interrupteur (« if (!OUVERT) bandeauOuverture() », et nulle part ailleurs)')
  const debut = code.indexOf('\n  function bandeauOuverture() {\n'), fin = debut < 0 ? -1 : code.indexOf('\n  }\n', debut + 1)
  if (debut < 0 || fin < 0) return faute('js/site.js : la fonction bandeauOuverture manque')
  const corps = code.slice(debut, fin), dehors = code.slice(0, debut) + code.slice(fin)
  if (/innerHTML|insertAdjacentHTML|document\.write/.test(corps)) faute('js/site.js : le bandeau s\'écrit en texte (createTextNode, textContent), jamais comme du code de page')
  for (const mot of MOTS_INTERDITS) if (new RegExp('(^|[^a-zà-ÿ])' + mot, 'i').test(dehors)) faute('js/site.js : un mot interdit hors du bandeau : « ' + mot + ' »')
  if (!/Casteria ouvre bientôt/.test(corps)) faute('js/site.js : le bandeau dit « Casteria ouvre bientôt » (le même message que le Discord)')
  // (27/10/2026 ; le propriétaire : « ça devrait mettre ouverture bientôt partout ») fermé, le badge du haut dit l'ouverture
  // (écrit par bandeauOuverture) et le nombre de joueurs ne se lit jamais : la lecture ne part que si OUVERT
  if (!/querySelectorAll\('\[data-en-ligne\]'\)[\s\S]*?e\.textContent = 'Ouverture bientôt'/.test(corps)) faute('js/site.js : fermé, le badge du haut dit « Ouverture bientôt » (bandeauOuverture)')
  if (!code.includes('\n  if (OUVERT && enLigne.length && SOURCE_EN_LIGNE && window.fetch) {')) faute('js/site.js : fermé, le nombre de joueurs ne se lit pas (« if (OUVERT && enLigne.length ... ») : jamais « en ligne » avant l\'ouverture')
  const css = lire('css/style.css')
  if (!/\.ouverture\s*\{[^}]*position:\s*fixed/.test(css)) faute('css/style.css : le bandeau (.ouverture) est fixe en bas de l\'écran')
  if (!/\nhtml\.avec-ouverture body \{ padding-bottom: \d+px; \}/.test(css)) faute('css/style.css : la page garde la place du bandeau (html.avec-ouverture body, padding-bottom)')
  // les joueurs en ligne
  // (b5, la bascule du 29/10) plus le gist : l'API du site, la meme origine
  if (!code.includes("\n  var SOURCE_EN_LIGNE = '/api/en-ligne'\n") || /gist\.githubusercontent\.com/.test(code)) faute('js/site.js : les joueurs en ligne se lisent par l\'API du site (/api/en-ligne), plus jamais dans le gist')
  if (!/fetch\(SOURCE_EN_LIGNE, \{ credentials: 'omit'/.test(code)) faute('js/site.js : la lecture des joueurs en ligne part sans cookie (credentials: \'omit\')')
  if (!code.includes('var EN_LIGNE_VIEUX_MS = 15 * 60000')) faute('js/site.js : un nombre de joueurs de plus de 15 minutes ne s\'affiche pas (EN_LIGNE_VIEUX_MS)')
  const fEn = code.indexOf('\n  function montrerEnLigne('), fEnFin = fEn < 0 ? -1 : code.indexOf('\n  }\n', fEn + 1)
  const corpsEn = fEn < 0 || fEnFin < 0 ? '' : code.slice(fEn, fEnFin)
  if (!corpsEn) faute('js/site.js : la fonction montrerEnLigne manque')
  else {
    if (/innerHTML|insertAdjacentHTML/.test(corpsEn)) faute('js/site.js : le nombre de joueurs s\'écrit en texte (textContent), jamais comme du code de page')
    if (!/d\.en_ligne\b/.test(corpsEn) || /d\.(categories|familles)\b/.test(corpsEn)) faute('js/site.js : les joueurs en ligne ne lisent que « en_ligne » et son heure, jamais le classement')
    jouerEnLigne(corpsEn, faute)
  }
  if (!/setInterval\(lireEnLigne, EN_LIGNE_RELIRE_MS\)/.test(code) || !code.includes('var EN_LIGNE_VIEUX_MS = 15 * 60000, EN_LIGNE_RELIRE_MS = 5 * 60000')) faute('js/site.js : le badge se relit toutes les 5 minutes (setInterval(lireEnLigne, EN_LIGNE_RELIRE_MS))')
  const index = lire('index.html') || ''
  if (!/<p class="en-ligne" data-en-ligne hidden><\/p>/.test(index)) faute('index.html : la place des joueurs en ligne (<p class="en-ligne" data-en-ligne hidden>), cachée au départ')
  // (25/10/2026) le badge vit DANS la section du haut, juste au-dessus de l'accroche (là où l'oeil arrive après le titre)
  const debutTete = index.indexOf('<section class="heros'), tete = debutTete < 0 ? '' : index.slice(debutTete, index.indexOf('</section>', debutTete))
  if (!/<div class="cinema-geste">[\s\S]*?<p class="en-ligne" data-en-ligne hidden><\/p>\s*<p class="cinema-accroche">/.test(tete)) faute('index.html : le badge des joueurs en ligne est dans la section du haut, juste au-dessus de l\'accroche')
  const style = lire('css/style.css') || ''
  if (!/\n\.en-ligne\[hidden\] \{ display: none; \}/.test(style)) faute('css/style.css : « .en-ligne[hidden] { display: none; } » (sans lui, la plaque vide se voit au départ)')
  const regle = (style.match(/\n\.en-ligne \{[^}]*\}/) || [''])[0]
  // (29/10/2026, le style neuf validé par le propriétaire : tout arrondi) la règle « aucun arrondi » est retirée : le badge des joueurs en ligne (sa règle doit exister, ligne suivante)
  if (!regle) faute('css/style.css : la règle du badge des joueurs en ligne (.en-ligne) manque')
  if (!/\.en-ligne::before \{[^}]*animation: en-ligne-pouls/.test(style) || !/prefers-reduced-motion: reduce\) \{ \.en-ligne::before \{ animation: none; \}/.test(style)) faute('css/style.css : le carré vert du badge bat (en-ligne-pouls) et se calme sous prefers-reduced-motion')
}
// (25/10/2026) LE BADGE JOUÉ, pas seulement lu : montrerEnLigne tourne sur de faux éléments ; chaque cas doit dire ce qu'il
// dit (ou rester caché), qu'il parte d'un badge caché ou d'un badge déjà montré (la relecture des 5 minutes).
function jouerEnLigne(corpsEn, faute) {
  const faux = () => ({
    hidden: true, enfants: [],
    set textContent(t) { this.enfants = t ? [{ textContent: String(t) }] : [] },
    get textContent() { return this.enfants.map(c => c.textContent).join('') },
    appendChild(c) { this.enfants.push(c); return c }
  })
  const doc = { createElement: () => ({ className: '', textContent: '' }), createTextNode: t => ({ textContent: String(t) }) }
  let f
  try { f = new Function('enLigne', 'EN_LIGNE_VIEUX_MS', 'document', corpsEn + '\n  }\nreturn montrerEnLigne') } catch (e) { return faute('js/site.js : montrerEnLigne ne se lit pas (' + e.message + ')') }
  const maintenant = Date.now(), il = min => new Date(maintenant - min * 60000).toISOString()
  const cas = [
    ['3 joueurs', { en_ligne: 3, lu: il(2) }, '3 joueurs en ligne'],
    ['1 joueur', { en_ligne: 1, lu: il(2) }, '1 joueur en ligne'],
    ['1 200 joueurs', { en_ligne: 1200, lu: il(2) }, '1 200 joueurs en ligne'],
    ['0 joueur', { en_ligne: 0, lu: il(2) }, 'Serveur en ligne'],
    ['l\'heure propre au compteur', { en_ligne: 4, en_ligne_lu: il(1), lu: il(60) }, '4 joueurs en ligne'],
    ['une lecture de 14 minutes', { en_ligne: 2, lu: il(14) }, '2 joueurs en ligne'],
    ['une lecture de 16 minutes', { en_ligne: 2, lu: il(16) }, null],
    ['0 joueur et vieux', { en_ligne: 0, lu: il(30) }, null],
    ['sans heure', { en_ligne: 5 }, null],
    ['sans nombre', { lu: il(1) }, null],
    ['un nombre en texte', { en_ligne: '3', lu: il(1) }, null],
    ['un nombre à virgule', { en_ligne: 2.5, lu: il(1) }, null],
    ['un nombre négatif', { en_ligne: -1, lu: il(1) }, null],
    ['aucune donnée', null, null]
  ]
  for (const [nom, d, attendu] of cas) {
    for (const cache of [true, false]) {
      const e = faux()
      if (!cache) { e.textContent = '7 joueurs en ligne'; e.hidden = false }
      try { f([e], 15 * 60000, doc)(d) } catch (er) { faute('js/site.js : montrerEnLigne lève sur « ' + nom + ' » (' + er.message + ')'); continue }
      if (e.textContent.indexOf('\u202f') >= 0) faute('js/site.js : le badge écrit l\'espace fine (U+202F) que la police du site ne dessine pas (« 1200 » collé) : l\'espace insécable')
      const lu = e.textContent.replace(/[\s\u00a0\u202f]+/g, ' ').trim()
      if (attendu === null && !e.hidden) faute('js/site.js : le badge se montre sur « ' + nom + ' » (« ' + lu + ' ») : il doit rester caché')
      if (attendu !== null && (e.hidden || lu !== attendu)) faute('js/site.js : sur « ' + nom + ' », le badge dit « ' + (e.hidden ? '(caché)' : lu) + ' » au lieu de « ' + attendu + ' »')
      if (!e.hidden && /(^|\s)0 joueur/.test(lu)) faute('js/site.js : le badge écrit un « 0 » (« ' + lu + ' ») : à 0 joueur, « Serveur en ligne »')
    }
  }
}
function verifierVote(faute) {
  const s = lire('vote.html')
  if (!s) return faute('vote.html manque (la page du vote)')
  const nu = s.replace(/<!--[\s\S]*?-->/g, '')
  if ((nu.match(/<ul class="sites-vote"/g) || []).length !== 1) faute('vote.html : la liste des sites de vote (<ul class="sites-vote">) doit y être, une seule fois')
  else if (!/<ul class="sites-vote"[^>]*>(?:<li(?: class="[a-z-]+")?>(?:(?!<\/li>)[\s\S])*<\/li>)*<\/ul>/.test(nu)) faute('vote.html : la liste des sites de vote ne porte que des <li> collés (aucune espace entre les balises : vide, elle se cache toute seule)')
  if (!/<p class="sites-vides[^"]*">(?:(?!<\/p>)[\s\S])*\/vote/.test(nu)) faute('vote.html : la phrase qui remplace une liste vide (<p class="sites-vides">, « tape /vote ») manque')
  // (23/10/2026, le propriétaire : « j'ai mis sur Serveur Privé que ça demande le pseudo ») un site dans la liste : la
  // consigne juste au-dessus dit d'écrire son pseudo du jeu (<p class="vote-consigne">, collée à la liste)
  // (37, le 30/10/2026 ; le proprietaire : les deux cartes jumelles) la consigne est DANS la carte de Serveur Privé (son geste,
  // « Écris ton pseudo exact »), plus jamais repetee au-dessus
  if (sitesDeVote().liens.length && !/<li class="site-sp"><a class="site-vote" href="https:\/\/serveur-prive\.net\/[^"]*"[^>]*>(?:(?!<\/li>)[\s\S])*<span class="site-geste">[^<]*pseudo[^<]*<\/span>/.test(nu)) faute('vote.html : la carte de Serveur Privé (<li class="site-sp">) dit son geste, « écris ton pseudo exact » (<span class="site-geste">)')
  if (/class="vote-consigne/.test(nu)) faute('vote.html : la consigne au-dessus des sites répète la carte de Serveur Privé (le propriétaire : rien en double)')
  for (const a of sitesDeVote().liens) {
    const href = (a.match(/\shref="([^"]*)"/) || [])[1] || ''
    if (!/^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)+(\/[^\s"<>]*)?$/i.test(href)) faute('vote.html : un site de vote sans adresse https complète : ' + a.slice(0, 80))
    if (!/\srel="noopener"/.test(a)) faute('vote.html : un site de vote sans rel="noopener" : ' + a.slice(0, 80))
    if (!/\starget="_blank"/.test(a)) faute('vote.html : un site de vote qui ne s\'ouvre pas à part (target="_blank") : ' + a.slice(0, 80))
  }
  // (b5, le 29/10/2026 ; la tete) LE SECOND SITE, serveursminecraft.org : sa carte dans la liste, a sa vraie page de vote,
  // derriere le drapeau de la liste (data-serveursminecraft « eteint » ou « allume » ; eteint, css/vote.css la cache) ; sa
  // phrase dit la meme connexion que le jeu, /vote et « J'ai voté » ; JAMAIS serveur-minecraft.com (le proprietaire), nulle part
  {
    const drapeau = (nu.match(/<ul class="sites-vote"[^>]*\sdata-serveursminecraft="([^"]*)"/) || [])[1]
    if (drapeau !== 'eteint' && drapeau !== 'allume') faute('vote.html : le drapeau du second site de vote (data-serveursminecraft="eteint" ou "allume") sur la liste')
    const sm = sitesDeVote().liste || ''
    if (!/<li class="site-sm"><a class="site-vote" href="https:\/\/www\.serveursminecraft\.org\/serveur\/7794\/" target="_blank" rel="noopener">/.test(sm)) faute('vote.html : la carte de serveursminecraft.org (<li class="site-sm">, https://www.serveursminecraft.org/serveur/7794/) dans la liste des sites')
    else if (!/<li class="site-sm">(?:(?!<\/li>)[\s\S])*<span class="site-rythme">Un vote toutes les 24 heures<\/span><span class="site-geste">[^<]*\/vote[^<]*J'ai voté[^<]*<\/span>/.test(sm)) faute('vote.html : la carte de serveursminecraft.org dit un vote toutes les 24 heures (un vrai vote : 86 380 s), puis /vote en jeu et « J\'ai voté »')
    // (37, le 30/10) la meme connexion que le jeu : la note juste sous la liste (elle ne tient pas sur la ligne du geste)
    else if (!/<p class="vote-note[^"]*">[^<]*ServeursMinecraft[^<]*même connexion que le jeu[^<]*<\/p>/.test(nu)) faute('vote.html : la note sous les sites dit de voter sur ServeursMinecraft.org depuis la même connexion que le jeu (<p class="vote-note">)')
    for (const p of fs.readdirSync(RACINE).filter(n => /\.(html|js|json)$/.test(n)).concat(fs.readdirSync(path.join(RACINE, 'js')).map(n => 'js/' + n))) if (/serveur-minecraft\.com/i.test(lire(p) || '')) faute(p + ' : serveur-minecraft.com (le propriétaire n\'en veut pas)')
  }
  const css = lire('css/vote.css')
  if (!css) return faute('css/vote.css manque')
  if (!/\.sites-vote\[data-serveursminecraft="eteint"\] \.site-sm \{ display: none; \}/.test(css)) faute('css/vote.css : le drapeau « eteint » cache la carte de serveursminecraft.org')
  if (!s.includes('<link rel="stylesheet" href="css/vote.css">')) faute('vote.html : sa feuille css/vote.css n\'est pas chargée')
  if (!/\.sites-vote:empty\s*\{[^}]*display:\s*none/.test(css) || !/\.sites-vote:not\(:empty\)\s*\+\s*\.sites-vides\s*\{[^}]*display:\s*none/.test(css)) faute('css/vote.css : la liste vide des sites se cache, et la phrase « tape /vote » ne se montre que pour une liste vide')
  // (29/10/2026, le style neuf validé par le propriétaire : tout arrondi) la règle « aucun arrondi » est retirée : css/vote.css
}
function verifierDiscord(faute) {
  const s = lire('discord.html')
  if (!s) return faute('discord.html manque (casteria.fr/discord)')
  // (30/10/2026, le style neuf : le bouton du Discord prend son bleu, bouton-discord ; l'or reste permis)
  if (!['or', 'discord'].some(c => s.includes('<a class="bouton bouton-' + c + ' grand" href="' + DISCORD + '">Rejoindre le Discord</a>'))) faute('discord.html : le grand bouton « Rejoindre le Discord » vers ' + DISCORD + ' manque')
  if (!s.includes('<meta http-equiv="refresh" content="1; url=' + DISCORD + '">')) faute('discord.html : le départ tout seul au bout d\'une seconde manque (<meta http-equiv="refresh" content="1; url=' + DISCORD + '">)')
  if (!s.includes("<script>setTimeout(function () { window.location.replace('" + DISCORD + "') }, 1000)</script>")) faute('discord.html : le départ par le script manque (location.replace, au bout d\'une seconde)')
  // aucune autre invitation, sur aucune page ni dans aucun script : les autres pages mènent à /discord
  const ailleurs = fs.readdirSync(RACINE).filter(n => /\.html$/.test(n)).concat(fs.readdirSync(path.join(RACINE, 'js')).map(n => 'js/' + n))
  for (const n of ailleurs) for (const m of lire(n).match(/(?:https?:)?\/\/(?:[a-z0-9-]+\.)?discord(?:app)?\.(?:gg|com)\/[A-Za-z0-9_/-]*/gi) || []) if (!((n === 'discord.html' && m === DISCORD) || (n === 'rejoindre.html' && m === PUB))) faute(n + ' : une adresse de Discord (' + m + ') : l\'invitation n\'est écrite que dans discord.html, les autres pages mènent à /discord')
  // (19/10/2026, le propriétaire : « mets-le dans la page d'accueil aussi, à côté / en dessous du Jouer gratuitement ») l'accueil
  // y mène juste après « Jouer gratuitement » : /discord, le logo de la marque (en ligne) et le mot
  if (!/Jouer gratuitement<\/a>\s*(?:<!--[\s\S]*?-->\s*)?<a class="bouton bouton-discord grand" href="\/discord" aria-label="[^"]*Discord[^"]*"(?: data-track="discord")?><svg class="logo-discord"[^>]*>[\s\S]*?<\/svg><span class="mot">Discord<\/span><\/a>/.test(lire('index.html'))) faute('index.html : le bouton du Discord (vers /discord, son logo et le mot « Discord ») doit suivre « Jouer gratuitement »')
  let vj = null
  try { vj = JSON.parse(lire('vercel.json')) } catch (e) { vj = null }
  if (!vj || !Array.isArray(vj.rewrites) || !vj.rewrites.some(r => r && r.source === '/discord' && r.destination === '/discord.html')) faute('vercel.json : /discord doit mener à discord.html (« rewrites » : { "source": "/discord", "destination": "/discord.html" })')
  // (27/10/2026) la page de la publicite : le grand bouton vers PUB, AUCUN depart tout seul, et /rejoindre dans vercel.json
  const pub = lire('rejoindre.html')
  if (!pub) faute('rejoindre.html manque (casteria.fr/rejoindre, la page de la publicite)')
  else {
    if (!['or', 'discord'].some(c => pub.includes('<a class="bouton bouton-' + c + ' grand" href="' + PUB + '">Rejoindre le Discord</a>'))) faute('rejoindre.html : le grand bouton « Rejoindre le Discord » vers ' + PUB + ' manque')
    if (/http-equiv="refresh"|location.(?:replace|assign|href)/.test(pub)) faute('rejoindre.html : la page de la publicite ne part jamais toute seule (ni refresh ni script)')
  }
  if (!vj || !vj.rewrites.some(r => r && r.source === '/rejoindre' && r.destination === '/rejoindre.html')) faute('vercel.json : /rejoindre doit mener a rejoindre.html')
  // jamais une pastille arrondie (le propriétaire) : aucun arrondi dans sa feuille
  // (29/10/2026, le style neuf validé par le propriétaire : tout arrondi) la règle « aucun arrondi » est retirée : css/discord.css
}
// le domaine du site : celui que outils/domaine.js a écrit dans robots.txt ; et le plan du site
const lire = f => { try { return fs.readFileSync(path.join(RACINE, f), 'utf8') } catch (e) { return '' } }
const DOMAINE = (lire('robots.txt').match(/^Sitemap: (https:\/\/[^/\s]+)\/sitemap\.xml$/m) || [])[1] || '', PLAN = lire('sitemap.xml')
// les adresses des sites de vote (leur liste de vote.html), comme la boucle des pages les lit (sans « ? » ni « # »)
const SITES_VOTE = new Set(sitesDeVote().liens.map(a => ((a.match(/\shref="([^"]*)"/) || [])[1] || '').split(/[?#]/)[0]).filter(Boolean))
let fautes = 0
const faute = (m) => { fautes++; console.log('  FAUTE : ' + m) }
const TIRETS = [String.fromCharCode(0x2014), String.fromCharCode(0x2013)]

for (const page of PAGES) {
  const s = fs.readFileSync(path.join(RACINE, page), 'utf8')
  console.log(page)
  // (07/10) un lien vers une section de l'accueil (./#x, /#x, ou #x sur l'accueil) mène à un id qui y existe : la refonte
  // avait laissé #videos, #concept et #inedit sur les autres pages
  {
    const ids = new Set((lire('index.html').match(/\sid="([^"]+)"/g) || []).map(m => m.slice(5, -1)))
    const motif = page === 'index.html' ? /href="(?:\.?\/)?#([^"]+)"/g : /href="\.?\/#([^"]+)"/g
    for (const m of s.matchAll(motif)) if (!ids.has(m[1])) faute('un lien vers une section de l\'accueil qui n\'existe plus : #' + m[1])
  }
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
  // (14/10/2026) les tailles d'une image (srcset d'une <source> ou d'une <img>, imagesrcset d'un préchargement) : chacune
  for (const m of s.matchAll(/\s(?:srcset|imagesrcset)="([^"]*)"/g)) for (const t of m[1].split(',')) { const u = t.trim().split(/\s+/)[0]; if (u) cites.add(u.split(/[?#]/)[0]) }
  // (19/10/2026) une adresse sans « .html » (ADRESSES : /discord) mène à son fichier
  const existe = c => { const a = c.replace(/^\.?\//, ''); return fs.existsSync(path.join(RACINE, Object.keys(ADRESSES).find(f => ADRESSES[f] === a) || a)) }
  for (const c of cites) {
    if (DOMAINE && c.startsWith(DOMAINE + '/')) { if (!existe(c.slice(DOMAINE.length))) faute('une adresse du site qui n\'existe pas : ' + c); continue }
    if (c === TEBEX_JS && page === 'boutique.html') { if (!s.includes('<script defer src="' + TEBEX_JS + '"></script>')) faute('boutique.html : le script de Tebex doit s\'écrire <script defer src="' + TEBEX_JS + '"></script>, tel quel'); continue }
    if (c === DISCORD && page === 'discord.html') continue
    if (c === PUB && page === 'rejoindre.html') continue
    // (22/10/2026) un site de vote, dans sa liste de vote.html (verifierVote le juge)
    if (page === 'vote.html' && SITES_VOTE.has(c)) continue
    if (/^(https?:)?\/\//.test(c)) { if (!c.startsWith(LIENS_FIGES)) faute('un lien vers ailleurs que la release du launcher : ' + c); continue }
    if (/^(mailto:|data:)/.test(c)) continue
    // (37, le 30/10/2026) le trailer de l'accueil : ses fichiers sont posés sur le VPS (/media/, trop lourds pour ce dépôt),
    // cités SEULEMENT par la vidéo du trailer de l'accueil, et seulement ceux-là
    if (page === 'index.html' && SUR_LE_VPS.includes(c)) continue
    if (!existe(c)) faute('un fichier cité n\'existe pas : ' + c)
  }
  // aucun mot qui dise que le serveur n'est pas ouvert (le propriétaire, 05/10 : le site parle d'un serveur où l'on joue)
  const visible = s.replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/g, '')
  // (le mot entier : « tu le découvriras » n'est pas « ouvrira »)
  for (const mot of MOTS_INTERDITS) if (new RegExp('(^|[^a-zà-ÿ])' + mot, 'i').test(visible)) faute('un mot interdit : « ' + mot + ' »')
  // (19/10/2026) aucun spoiler, dans le texte comme dans les textes des images (alt) : le nom d'un boss caché
  for (const nom of SPOILERS) if (visible.toLowerCase().includes(nom.toLowerCase())) faute('un spoiler : « ' + nom + ' » (jamais l\'Abyssarque, le dernier boss, la salle du trône, ni les boss des donjons)')
  // (19/10/2026) aucun nombre de boss : la page entière (ses métadonnées et son JSON-LD compris), sans ses commentaires
  { const m = s.replace(/<!--[\s\S]*?-->/g, '').match(NOMBRE_DE_BOSS); if (m) faute('un nombre de boss : « ' + m[0].trim() + ' » (le propriétaire : « faut pas dire le nombre ! » : « des boss »)') }
  // (19/10/2026, « 300 » puis « 000 jetons » sur deux lignes) un nombre ne se coupe jamais en deux : les milliers séparés
  // par une espace insécable (&#160;), jamais une espace ordinaire, dans le texte de la page (les dessins svg mis à part)
  for (const m of visible.replace(/<svg[\s\S]*?<\/svg>/g, '').matchAll(/>([^<]+)</g)) {
    const x = m[1].match(/\d \d{3}(?!\d)/)
    if (x) faute('un nombre qui peut se couper en deux lignes (une espace ordinaire entre les milliers : &#160;) : « ' + m[1].trim().slice(0, 60) + ' »')
  }
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
    const lourde = (v.match(/\sdata-src="([^"]+)"/) || [])[1]
    if (lourde && LOURDS_PERMIS[lourde] && (!/\sdata-clic(?=[\s>=])/.test(v) || /\sdata-auto(?=[\s>=])/.test(v))) faute('une vidéo lourde se jouerait d\'office (elle doit porter data-clic, jamais data-auto) : ' + lourde)
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
      // (14/10/2026, le propriétaire : « une hero section [...] faut que le texte, logo et tout aille PARFAITEMENT avec
      // l'image [...] qu'elle fasse pas IA avec la disposition du texte, le centrage [...] que ça fasse WAW » ; il remplace
      // les quatre panneaux du 13/10) UN FOND EN CINÉMA (<div class="fond plein-cadre">, l'accueil, les pirates, le classement)
      // remplace la scène : UNE image dans un <picture>, avec sa version pour un écran étroit (une <source media srcset>),
      // jamais chargée en différé (c'est le haut de la page), et plus aucune scène par-dessus ; le texte est celui de la page
      if (/<div class="fond plein-cadre(?:\s[^"]*)?"/.test(sec)) {
        const image = (fond.match(/<picture\b[^>]*>([\s\S]*?)<\/picture>/) || [])[1]
        if (image === undefined) faute('la hero en cinéma : <div class="fond plein-cadre"> doit porter son image dans un <picture>')
        else {
          if (!/<source\b(?=[^>]*\smedia="[^"]+")(?=[^>]*\ssrcset="[^"]+")[^>]*>/.test(image)) faute('la hero en cinéma : son <picture> doit porter la version pour un écran étroit (<source media="..." srcset="...">)')
          if (!/<img\b[^>]*\ssrc="[^"]+"/.test(image)) faute('la hero en cinéma : son <picture> finit par son image de repli (<img src="...">)')
          if (/\sloading="lazy"/.test(image)) faute('la hero en cinéma : l\'image du haut de la page ne se charge jamais en différé (loading="lazy")')
        }
        if (sc >= 0) faute('la hero en cinéma ne porte pas de scène par-dessus (<div class="scene">)')
      }
      // (07/10, l'accueil refait : « plus de photos adapté au vrai jeu ») la scène peut aussi être de vraies boucles du jeu,
      // chacune avec son affiche
      else if (!/<img\b/.test(scene) && !/<video\b[^>]*\sposter="[^"]+"/.test(scene)) faute('la hero : <div class="scene"> doit porter au moins une image ou une vidéo avec son affiche (les choses du jeu)')
    }
  }
  // PLUS DE BARRE AU PIED DE L'ÉCRAN DU TÉLÉPHONE (le propriétaire, 07/10 : « la barre sur mobile en bas c'est
  // affreux ») ; l'ancien bouton du menu n'existe plus non plus
  {
    if (/<nav class="barre-jeu"/.test(nu)) faute('la barre du pied de l\'écran du téléphone (<nav class="barre-jeu">) est revenue')
    if (/<button class="menu"/.test(nu)) faute('l\'ancien bouton du menu (<button class="menu">) est encore là')
  }
  // LE CLASSEMENT DANS LE MENU (14/10/2026) : le menu du haut de chaque page y mène, avec sa coupe en pixels (sur tablette et
  // téléphone, la coupe seule, à côté de la Boutique et avant « Jouer ») et son nom lu (aria-label) ; le pied aussi
  {
    const m = nu.indexOf('<nav aria-label="Le menu">'), p = nu.indexOf('<nav aria-label="Le pied de page">')
    // (29/10/2026, le style neuf validé par le propriétaire) la coupe peut être l'icône au trait du kit (le sprite de la barre, #i-coupe)
    const LIEN = /<a class="classement" href="\/?classement\.html"( aria-current="page")? aria-label="Classement">(<img class="pixel" src="\/?assets\/icones\/classement\.png" alt="" width="20" height="20">|<svg class="ic" aria-hidden="true"><use href="#i-coupe"\/><\/svg>)Classement<\/a>/
    if (m >= 0 && !LIEN.test(dedans(nu, m, 'nav'))) faute('le menu du haut ne mène pas au classement avec sa coupe et son nom (<a class="classement" ... aria-label="Classement"><img ... assets/icones/classement.png ...> ou <svg class="ic" ...#i-coupe...>Classement</a>)')
    if (m >= 0 && /#i-/.test(dedans(nu, m, 'nav')) && !/<svg class="icones"[^>]*>[^]*?<symbol id="i-coupe"/.test(nu)) faute('la barre se sert des icônes du kit (#i-...) sans leur sprite (<svg class="icones">, b5_assembleur/barre.js)')
    if (p >= 0 && !/<a href="\/?classement\.html">Classement<\/a>/.test(dedans(nu, p, 'nav'))) faute('le pied de page ne mène pas au classement (classement.html)')
    // (22/10/2026) LE VOTE : le menu du haut et le pied de chaque page y mènent aussi
    if (m >= 0 && !/<a class="voter" href="\/?vote\.html"( aria-current="page")?>(<svg class="ic" aria-hidden="true"><use href="#i-eclair"\/><\/svg>)?Voter<\/a>/.test(dedans(nu, m, 'nav'))) faute('le menu du haut ne mène pas à la page du vote (<a class="voter" href="vote.html">Voter</a>)')
    if (p >= 0 && !/<a href="\/?vote\.html">Voter<\/a>/.test(dedans(nu, p, 'nav'))) faute('le pied de page ne mène pas à la page du vote (vote.html)')
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
    const adresse = DOMAINE + '/' + (page === 'index.html' ? '' : ADRESSES[page] || page)
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
// (19/10/2026) aucun nombre de boss non plus dans les scripts du site (ce qu'ils écrivent se lit sur les pages)
for (const f of fs.readdirSync(path.join(RACINE, 'js')).filter(n => n.endsWith('.js'))) {
  const m = lire('js/' + f).match(NOMBRE_DE_BOSS)
  if (m) { console.log('js/' + f); faute('un nombre de boss : « ' + m[0].trim() + ' » (le propriétaire : « faut pas dire le nombre ! » : « des boss »)') }
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
  const regles = reglesCss(css).map(r => Object.assign({ f: 'css/style.css' }, r)).concat(reglesCss(lire('css/carrousel.css')).map(r => Object.assign({ f: 'css/carrousel.css' }, r)),
    reglesCss(lire('css/classement.css')).map(r => Object.assign({ f: 'css/classement.css' }, r)), reglesCss(lire('css/discord.css')).map(r => Object.assign({ f: 'css/discord.css' }, r)),
    reglesCss(lire('css/boutique.css')).map(r => Object.assign({ f: 'css/boutique.css' }, r)), reglesCss(lire('css/vote.css')).map(r => Object.assign({ f: 'css/vote.css' }, r)),
    reglesCss(lire('css/compte.css')).map(r => Object.assign({ f: 'css/compte.css' }, r)), reglesCss(lire('css/admin.css')).map(r => Object.assign({ f: 'css/admin.css' }, r)),
    reglesCss(lire('css/motifs.css')).map(r => Object.assign({ f: 'css/motifs.css' }, r)))
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
  // LE CLASSEMENT DANS L'EN-TÊTE D'UN ÉCRAN ÉTROIT (14/10/2026) : la règle qui y cache les liens du menu épargne
  // .classement, rien ne cache son lien, et sur téléphone sa coupe est une cible de 44 px au moins pour le doigt
  {
    const cacheLiens = regles.filter(r => r.f === 'css/style.css' && /\.barre nav a:not\(/.test(r.sel) && /display\s*:\s*none/.test(r.corps))
    if (!cacheLiens.length || cacheLiens.some(r => !r.sel.includes(':not(.classement)'))) faute('css/style.css : sur tablette et téléphone, la règle qui cache les liens du menu doit épargner le classement (:not(.classement))')
    // (29/10/2026 ; le propriétaire : « sur mobile faire un petit menu déroulant plutôt que les icônes ») LE MENU DÉROULANT DU
    // TÉLÉPHONE : à 960 px et moins, la barre garde le logo, le bouton « Menu » et « Jouer », et le Classement passe dans la
    // liste, en mots. La règle du 14/10 (sa coupe dans la barre) cède : son lien ne se cache dans la barre QUE si le menu
    // déroulant existe (js/site.js, menuTelephone, qui reprend chaque lien du menu) ; le bouton et chaque ligne : 44 px au moins ;
    // la liste se ferme à Échap
    // (29/10/2026, le style neuf) le tiroir peut aussi poser ses cartes une à une : il doit alors porter le Classement
    const site = lire('js/site.js'), menuOk = /\n  function menuTelephone\(\) \{/.test(site) && /\n  menuTelephone\(\)\n/.test(site) && (/nav\.querySelectorAll\('a'\)/.test(site) || /ligne\('classement\.html', 'Classement'/.test(site))
    if (!menuOk && regles.some(r => r.media && r.sel.split(',').some(x => /a\.classement\s*$/.test(x)) && /display\s*:\s*none/.test(r.corps))) faute('css/style.css : le lien du classement est caché sur un écran étroit, sans le menu déroulant qui le reprend (js/site.js, menuTelephone)')
    if (menuOk) {
      const haut = (sel) => { const r = regles.find(x => x.f === 'css/style.css' && /max-width:\s*960px/.test(x.media || '') && x.sel.trim() === sel), m = r ? r.corps.match(/(?:^|;|\s)min-height\s*:\s*(\d+)px/) : null; return m ? +m[1] : 0 }
      if (haut('.menu-bouton') < 44) faute('css/style.css : le bouton du menu déroulant (.menu-bouton) fait 44 px de haut au moins')
      if (haut('.menu-tiroir a') < 44) faute('css/style.css : chaque ligne du menu déroulant (.menu-tiroir a) fait 44 px de haut au moins')
      if (!/if \(e\.key === 'Escape' && !tiroir\.hidden\) \{ ouvrir\(false\); bouton\.focus\(\) \}/.test(site)) faute('js/site.js : le menu déroulant se ferme à la touche Échap et rend la main à son bouton')
      if (/innerHTML|insertAdjacentHTML/.test(site.slice(site.indexOf('\n  function menuTelephone() {'), site.indexOf('\n  menuTelephone()\n')))) faute('js/site.js : le menu déroulant s\'écrit en texte, jamais comme du code de page')
    }
    const cible = regles.find(r => /max-width:\s*600px/.test(r.media || '') && /a\.classement\s*$/.test(r.sel))
    const px = p => { const x = cible ? (cible.corps.match(new RegExp('(?:^|;|\\s)' + p + '\\s*:\\s*(\\d+)px')) || [])[1] : 0; return x ? +x : 0 }
    if (!cible || px('min-width') < 44 || px('min-height') < 44) faute('css/style.css : sur téléphone, la coupe du classement doit être une cible de 44 px au moins (min-width et min-height)')
  }
}
for (const f of ['css/vivant.css', 'css/carte.css', 'css/joueur.css', 'css/exploits.css', 'css/partage.css', 'js/vivant_api.js', 'js/tete.js', 'js/ile.js', 'js/carte.js', 'js/carte_appel.js', 'js/joueur.js', 'js/exploits.js', 'js/partage.js', 'css/ile3d.css', 'js/ile3d.js',
  'css/style.css', 'css/carrousel.css', 'css/classement.css', 'css/compte.css', 'css/admin.css', 'css/motifs.css', 'css/discord.css', 'css/boutique.css', 'css/vote.css', 'css/voyage.css', 'css/scene.css', 'js/site.js', 'js/carrousel.js', 'js/boutique.js', 'js/boutique.config.js', 'js/classement.js', 'js/api.js', 'js/peau.js', 'js/connexion.js', 'js/compte.js', 'js/admin.js', 'js/graphe.js', 'README.md', 'serveur.js']) {
  const s = fs.readFileSync(path.join(RACINE, f), 'utf8')
  for (const t of TIRETS) if (s.includes(t)) { console.log(f); faute('un tiret long ou moyen') }
  // (22/10/2026) aucun caractère de contrôle (un « retour arrière » U+0008 avait remplacé le \b de /[?&]photo\b/ dans
  // js/site.js dès le 05/10 : la page ?photo des captures n'avait jamais marché)
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(s)) { console.log(f); faute('un caractère de contrôle invisible (un \\b écrit à travers un shell ?)') }
}
// le poids : rien de lourd ne part dans le dépôt
let total = 0
;(function peser(d) {
  for (const n of fs.readdirSync(d)) {
    const p = path.join(d, n), st = fs.statSync(p)
    if (st.isDirectory()) { if (!['.git', 'node_modules', 'captures'].includes(n)) peser(p); continue }
    total += st.size
    const rel = path.relative(RACINE, p).split(path.sep).join('/'), plafond = LOURDS_PERMIS[rel] || 5
    if (st.size > plafond * 1024 * 1024) faute('un fichier de plus de ' + plafond + ' Mo : ' + rel)
  }
})(RACINE)
console.log('js/boutique.config.js')
verifierBoutique(faute)
console.log('js/classement.js, js/api.js, les pages du compte, donnees-essai/ (api/classement.js retiré)')
verifierClassement(faute)
console.log('discord.html, vercel.json')
verifierDiscord(faute)
console.log('vote.html, css/vote.css (les sites de vote)')
verifierVote(faute)
console.log('js/site.js (le bandeau de la fermeture, les joueurs en ligne)')
verifierOuvertureEtEnLigne(faute)
// (2c, 30/10/2026 ; la tête : « Le Sillage de la Damnation » était sur la carte en ligne, un nom venu des DONNÉES, que la règle des
// SPOILERS ne voyait pas) LES NOMS QUE L'API REND : la carte (js/carte.js) dit par un nom neutre tout nom de l'Atlas, des lieux, des
// zones, des pirates et des événements qui nomme ce qu'on ne nomme jamais. Ici : sa liste NOMS_TUS est SPOILERS mot pour mot, et son
// nomPublic, joué sur chaque nom de SPOILERS (dans une phrase, en capitales), le tait. « --en-ligne » : en plus, les noms que l'API
// rend EN CE MOMENT (/api/carte?zone=mer et /api/navires de casteria.fr) passés au même filtre.
console.log('js/carte.js (les noms venus des données : jamais un nom de SPOILERS)')
verifierNomsDesDonnees(faute)
function verifierNomsDesDonnees(faute) {
  const c = fs.readFileSync(path.join(RACINE, 'js', 'carte.js'), 'utf8')
  const ml = /var NOMS_TUS = \[([\s\S]*?)\]\n/.exec(c), mf = /function nomPublic\(nom, neutre\) \{[\s\S]*?\n {2}\}\n/.exec(c)
  if (!ml || !mf) { faute('js/carte.js : la liste NOMS_TUS ou la fonction nomPublic absente (les noms des données ne sont plus filtrés)'); return }
  let tus = null, nomPublic = null
  try { tus = Function('return [' + ml[1] + ']')(); nomPublic = Function('NOMS_TUS', mf[0] + '\nreturn nomPublic')(tus) } catch (e) { faute('js/carte.js : NOMS_TUS ou nomPublic illisible : ' + e.message); return }
  for (const s of SPOILERS) if (!tus.includes(s)) faute('js/carte.js : NOMS_TUS n\'a pas « ' + s + ' » (elle doit être SPOILERS mot pour mot)')
  // chaque nom venu des données passe par le filtre : les zones, les lieux, l'Atlas, les pirates, les événements
  const appels = [['les zones', '(c.zones || []).map(zonePublique)'], ['les lieux', '(c.lieux || []).map(lieuPublic)'], ['l\'Atlas', 'isFinite(a.z) }).map(lieuPublic)'],
    ['les pirates', "nom: nomPublic(n.nom, 'Un navire pirate')"], ['les événements', "nom: nomPublic(n.nom, 'Un événement en mer')"]]
  for (const [quoi, a] of appels) if (!c.includes(a)) faute('js/carte.js : le filtre des noms tus n\'est plus appelé pour ' + quoi + ' (« ' + a + ' » absent)')
  const tu = (n) => SPOILERS.some(s => String(n).toLowerCase().includes(s.toLowerCase()))
  const noms = []
  for (const s of SPOILERS) noms.push('Le Sillage de ' + s, s.toUpperCase() + ' en mer')
  if (process.argv.includes('--en-ligne')) {
    const lu = require('child_process').spawnSync(process.execPath, ['-e', "Promise.all(['https://casteria.fr/api/carte?zone=mer', 'https://casteria.fr/api/navires'].map(u => fetch(u).then(r => r.json()))).then(([m, n]) => { const l = []; for (const a of (m.atlas || []).concat(m.lieux || [])) l.push(a.nom); for (const z of m.zones || []) l.push(z.nom, z.guide); for (const p of (n.pirates || []).concat(n.evenements || [])) l.push(p.nom); console.log(JSON.stringify(l.filter(x => x))) }).catch(e => { console.log('[]'); console.error(e.message) })"], { encoding: 'utf8', timeout: 20000 })
    let enLigne = []
    try { enLigne = JSON.parse(lu.stdout || '[]') } catch (e) { enLigne = [] }
    if (!enLigne.length) faute('--en-ligne : l\'API n\'a rendu aucun nom (injoignable ?)')
    console.log('  ' + enLigne.length + ' noms lus sur l\'API en ligne, dont ' + enLigne.filter(tu).length + ' à taire')
    noms.push(...enLigne)
  }
  for (const n of noms) { const r = nomPublic(n, 'NEUTRE'); if (tu(r)) faute('js/carte.js : nomPublic laisse passer « ' + n + ' »') }
}
console.log('le site pèse ' + (total / 1048576).toFixed(1) + ' Mo')
console.log(fautes ? fautes + ' faute(s)' : 'tout est bon')
process.exit(fautes ? 1 : 0)
