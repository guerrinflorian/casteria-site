# Casteria, le site

La vitrine du serveur Minecraft Casteria : l'accueil, le guide « Par où commencer », le classement des joueurs et la
boutique des crédits.

## Le voir tourner (GitHub Codespaces ou ton PC)

```bash
npm run dev
```

Puis ouvre l'adresse affichée (le port 3000 ; dans Codespaces, clique sur « Ouvrir dans le navigateur »).
Les pages n'ont besoin de rien : c'est un site statique (du HTML, du CSS et un peu de JavaScript) ; `serveur.js` est un
tout petit serveur Node qui sert les fichiers tels quels. Seul le classement lit quelque chose ailleurs : la page lit le
fichier `classement.json` d'un gist GitHub, que le serveur du jeu réécrit lui-même au plus toutes les 5 minutes (son
compte et son identifiant : `GIST_COMPTE` et `GIST_ID`, en tête de `js/classement.js`). Tant que `GIST_ID` est vide, ou si
le fichier ne répond pas, la page dit « Le classement ne s'affiche pas pour l'instant. En jeu, tape /top. », et tout le
reste du site marche. (La fonction `api/classement.js`, qui lisait la base du jeu, reste mais la page ne la lit plus : la
base refuse les connexions venues de Vercel.) Depuis la 125 du jeu, un temps de donjon porte aussi `donjon` (`id`, `nom`,
`niveau`) et `tailles` (les classements seul, à deux, à trois) : la page range les niveaux d'un donjon dans UNE carte, avec
le niveau (I, II, III) et les joueurs du groupe (Tous, 1, 2, 3) à choisir, comme la rangée des donjons de `/top` ; un
fichier sans eux s'affiche comme avant, une carte par catégorie.

## Les pages

| Fichier | Ce que c'est |
|---|---|
| `index.html` | l'accueil : le haut en cinéma, le launcher, la carte au trésor (les chiffres du jeu), les six mondes, les deux portes du palais (le casino, les donjons), les objets faits maison, la Gazette du palais (l'île, les caisses, les quêtes, les missions, les soirées, l'Héroïque...), les boss, le combat, la planète, la boutique, le téléchargement |
| `commencer.html` | « Par où commencer » : les dix premières étapes du jeu, les tickets et la roue, les astuces |
| `pirates.html` | la mer : les bateaux, les pirates, les canons (la page qui vise « serveur Minecraft pirate ») |
| `casino.html` | le casino du palais (19/10/2026) : le casino à minerais, la roulette européenne à plusieurs (ses cotes, ses derniers numéros), le blackjack à quatre, les bornes des autres jeux (un carrousel à glisser), les deux familiers du casino, Auguste et la règle de la maison |
| `donjons.html` | les donjons (19/10/2026) : Anselme, le Temple Creux et le Sanctuaire des Sables (leurs trois niveaux), dedans (une pile de cartes), le butin et le classement par taille de groupe ; jamais un boss ni une salle de boss |
| `css/pages.css` | l'habillage du casino, des donjons, et sur l'accueil des deux portes du palais et de la Gazette du palais |
| `classement.html` | le classement : les mêmes catégories que `/top` en jeu, le Score de Casteria d'abord (son podium), puis l'île, les jeux, les boss, la mer et le progrès, les dix premiers de chacune ; lus à l'ouverture par `js/classement.js` dans le fichier `classement.json` du gist que le serveur du jeu publie ; habillage : `css/classement.css` |
| `api/classement.js` | la fonction de Vercel du classement : elle lit la base du jeu (une requête SELECT, en lecture seule) et rend du JSON ; Vercel garde la réponse 5 minutes |
| `boutique.html` | la boutique : à quoi servent les crédits, et tes packs de Tebex, lus en direct (`js/boutique.config.js`, `js/boutique.js`) |
| `discord.html`, `css/discord.css` | `casteria.fr/discord` (19/10/2026) : le logo, le titre, une phrase et le grand bouton « Rejoindre le Discord », sur le décollage flouté ; la page part toute seule vers l'invitation au bout d'une seconde (le refresh de la tête et un petit script, qui ne la garde pas dans l'historique). L'adresse sans « .html » vient de `vercel.json` (`rewrites`, que `serveur.js` suit aussi) ; l'invitation n'est écrite que dans cette page (et dans `outils/verifier.js`, qui la vérifie) : une autre page mène à `/discord`. L'accueil y mène juste après « Jouer gratuitement » (`.bouton-discord`, `css/scene.css`) : la forme et le relief du bouton orange, au bleu de Discord, le logo de la marque en ligne et le mot sur un ordinateur, le logo seul sur un téléphone |
| `merci.html` | la page où Tebex ramène le joueur après son paiement (hors de Google) |
| `404.html` | la page des adresses qui n'existent pas (Vercel l'affiche tout seul, le petit serveur aussi) |
| `css/style.css`, `js/site.js` | l'habillage et ce qui bouge (le site se lit entier sans JavaScript) |
| `robots.txt`, `sitemap.xml`, `favicon.ico` | pour Google : le droit de tout lire, le plan du site, l'icône |
| `vercel.json`, `.vercelignore` | les réglages de la mise en ligne, et ce qui ne part pas en ligne |
| `assets/` | le logo, les polices, les matières (parchemin, cadre, ruban, boutons), les icônes, les vidéos allégées et leurs affiches ; `assets/casino/` (les écrans des bornes du casino, en pixels, agrandis au plus proche) et `assets/donjons/` (le sablier, les lampes et les coffrets du HUD des donjons) |

## Mettre en ligne sur Vercel (casteria.fr)

Il n'y a rien à construire : Vercel sert les fichiers tels quels. `.vercelignore` garde hors ligne tout ce qui n'est pas
le site (`serveur.js`, `outils/`, ce README). `package.json` et `package-lock.json` partent en ligne : Vercel y lit le
pilote de la base (`mysql2`, une version exacte) et l'installe pour la fonction du classement (`api/`).

1. Sur vercel.com : **Add New, Project**, importe le dépôt `casteria-site`. Ne touche à aucun réglage (Framework :
   **Other**, pas de commande de build, pas de dossier de sortie), puis **Deploy**.
2. Dans le projet : **Settings, Domains**, ajoute `casteria.fr` puis `www.casteria.fr`. Le site s'annonce partout sous
   `https://casteria.fr` (sans www) : c'est donc `casteria.fr` qui doit être le domaine principal, et `www.casteria.fr`
   qui redirige vers lui (Vercel propose l'inverse par défaut).
3. Chez le vendeur du domaine (la zone DNS) : à la place des lignes de l'ancien hébergement pour `casteria.fr` et `www`,
   mets celles que Vercel affiche à l'étape 2 (une ligne `A` pour `casteria.fr`, une ligne `CNAME` pour `www`).
4. Une fois le site en ligne : déclare `casteria.fr` dans Google Search Console (propriété « Domaine », une ligne `TXT`
   à ajouter dans la zone DNS), puis envoie-lui `https://casteria.fr/sitemap.xml`.

Ensuite, chaque `git push` sur `main` remet le site en ligne.

## Le classement (la base du jeu)

Chaque page y mène par son en-tête : le mot « Classement » sur ordinateur ; sur tablette et téléphone, sa coupe en
pixels (`assets/icones/classement.png`), à côté de la Boutique et avant « Jouer », une cible de 44 px pour le doigt.

La page `classement.html` montre les mêmes classements que `/top` en jeu. La fonction `api/classement.js` les lit dans
la base du réseau de Casteria (MariaDB, la table `res_classement_stat` : une ligne par joueur et par chiffre, que les
serveurs du jeu tiennent à jour ; un dossier retiré du classement n'y compte plus) :

- **en lecture seule** : une seule requête SELECT, une connexion fermée à la fin, 8 secondes pour se connecter et 9 en
  tout (Vercel en accorde 10 à la fonction : `maxDuration`) ;
- **à Paris** (`vercel.json` : `"regions": ["cdg1"]`, au niveau du projet, la seule fonction du site) : au plus près
  de la base, en France. Depuis Washington (la région de Vercel par défaut), la connexion tombait en `ETIMEDOUT` ;
- **gardée 5 minutes par Vercel** (`Cache-Control: public, s-maxage=300, stale-while-revalidate=600`) : la base est lue
  au plus une fois toutes les 5 minutes, quel que soit le nombre de visiteurs ;
- **rien de privé** : les pseudos et les chiffres que `/top` montre déjà, jamais un identifiant ;
- **en panne** (la base ne répond pas, une variable manque) : `{ "indisponible": true, "raison": ... }` et le code 503,
  jamais gardé ; la page dit « Le classement ne s'affiche pas pour l'instant. En jeu, tape /top. » et propose « Réessayer ». La raison se lit
  sans les journaux de Vercel (ouvrir `https://casteria.fr/api/classement`) : `variables` (une variable `CASTERIA_DB_*`
  manque au déploiement), `calcul`, ou le code de l'erreur de la base tel quel (`ENOTFOUND` : l'hôte mal écrit ;
  `ETIMEDOUT` : la base ne répond pas aux serveurs de Vercel, un pare-feu ; `ECONNREFUSED` : le port ;
  `ER_ACCESS_DENIED_ERROR` : l'utilisateur ou le mot de passe, ou une connexion refusée depuis cette machine ;
  `ER_DBACCESS_DENIED_ERROR`, `ER_BAD_DB_ERROR` : le nom de la base ; `MODULE_NOT_FOUND` : `mysql2` pas installé) ;
  jamais un hôte, un nom ni le texte d'une erreur.

Le Score de Casteria n'est pas rangé dans la base : chaque serveur du jeu le recalcule sur les autres chiffres, et la
fonction fait le même calcul (`leaderboard.js` du jeu), avec les maximums du jeu écrits en tête du fichier : le niveau 60,
les 15 boss, les 42 familiers et montures, les 234 étoiles des quêtes. **Quand le jeu en ajoute, ces chiffres suivent.**

**Les cinq variables à régler dans Vercel** (Settings, Environment Variables, pour « Production ») : `CASTERIA_DB_HOST`,
`CASTERIA_DB_PORT`, `CASTERIA_DB_USER`, `CASTERIA_DB_PASSWORD`, `CASTERIA_DB_NAME`. Leurs valeurs sont dans le fichier
des clés de la base, hors du dépôt : elles ne s'écrivent JAMAIS ici. Une variable changée ne vaut qu'au déploiement
suivant (Deployments, Redeploy).

**L'essai sur ce PC** : `npm install`, puis `node outils/essai_classement.js <fichier des clés de la base> <sortie.json>`.
La fonction est jouée contre la vraie base, sa réponse écrite dans `<sortie.json>` et relue (sa forme, aucun identifiant
dedans), puis deux pannes (sans variables, une adresse qui n'existe pas : 503). Code 0 : tout est bon.

## Le domaine et le référencement

`node outils/domaine.js https://casteria.fr` a écrit le domaine partout où il faut une adresse complète : `sitemap.xml`,
la ligne `Sitemap:` de `robots.txt`, et dans chaque page son adresse (`canonical`, `og:url`), l'image de partage
(`og:image`) et les données pour Google (le bloc JSON-LD). Relance-le si le domaine change, ou après avoir ajouté une page
à sa liste `PAGES` (il refait aussi la date du plan du site).

- L'accueil n'a qu'une adresse, `https://casteria.fr/` : les liens vers l'accueil s'écrivent `./`, jamais `index.html`.
- L'image de partage (`assets/images/casteria-decollage-partage.jpg`, le décollage de l'en-tête et le logo au dragon) fait 1200 x 630, le format des
  réseaux ; `outils/domaine.js` l'écrit dans chaque page. Le casino et les donjons ont la leur (`casteria-casino-partage.jpg`,
  `casteria-donjon-partage.jpg`, le 4e champ de leur ligne dans `PAGES`).
- Le logo affiché dans les pages est la copie légère (`casteria-logo-300.webp`) ; le grand `casteria-logo.png` reste
  l'original.
- Les fichiers de `assets/` restent une semaine dans le navigateur des visiteurs : pour changer une image, donne un autre
  nom au nouveau fichier plutôt que d'écraser l'ancien.

## Ce qu'il reste à régler

**La boutique Tebex.** Les packs s'affichent tout seuls sur `boutique.html` : ils sont lus EN DIRECT chez Tebex à
chaque visite (leurs noms, leurs images, leurs prix, du moins cher au plus cher). Change un prix ou ajoute un pack dans
Tebex : le site suit, sans rien toucher ici. Le seul réglage est dans `js/boutique.config.js` :

- `jeton` : le jeton PUBLIC de ta boutique (Tebex, « API Keys », « Public Token »). Il sert à lire les packs et à créer
  un panier : il est fait pour être vu de tous. JAMAIS la « Private Key » ni la clé secrète du serveur de jeu ici.

Ce que fait la page : le joueur choisit un pack, écrit son pseudo (la règle du launcher : 3 à 16 lettres sans accent,
chiffres et tiret du bas), le RELIT lettre par lettre et coche « C'est bien mon pseudo, je l'ai vérifié » (sans cette
case le bouton « Payer » reste gris), puis il est envoyé sur la page de paiement de Tebex. Aucun paiement ni aucune
carte ne passe par ce site. Après le paiement, Tebex le ramène sur `merci.html`.

Le prix affiché est celui que le joueur paiera, TVA de son pays comprise (Tebex la calcule) : la page de Tebex montre
d'abord le prix hors taxe, puis le même total que le site dès que le joueur écrit son code postal.

Si Tebex ne répond pas, la page reste entière et dit « La boutique revient dans un instant. », avec un bouton
« Réessayer ».

À régler CHEZ TEBEX, pas ici : couper les paiements d'essai avant d'envoyer des joueurs payer (tant qu'ils sont actifs,
la page de paiement porte un bandeau « TEST PAYMENTS ACTIVE »), et choisir la langue de la page de paiement.

`npm run verifier` refuse : un jeton qui n'a pas la forme d'un jeton public, tout champ inconnu dans la config, toute
longue suite de lettres et de chiffres qui ressemblerait à une clé n'importe où dans le dépôt, un script de boutique
qui parlerait à un autre serveur que Tebex ou qui enverrait le joueur ailleurs que sur sa page de paiement, et la mise
en garde du pseudo si elle disparaissait.

## Les règles du site

- Les liens de téléchargement sont ceux de la release « installateur » du launcher : ils sont figés, ne les change pas.
- Aucune texture ni police du jeu de base : les matières viennent des écrans de Casteria, les polices (Fredoka, Lilita One)
  sont libres (licence OFL, dans `assets/polices/`).
- Les vidéos sont des copies allégées (540 x 960, sans son). Pour en ajouter une : `bash outils/alleger_videos.sh
  <ffmpeg> <dossier des vidéos> <numéro>`, puis une ligne de plus dans la rangée de `index.html`.
- La bande-annonce de l'accueil (`assets/videos/bande_annonce_casteria.mp4`, 1280 x 720, sans son) est le SEUL fichier qui
  peut dépasser 5 Mo (16 Mo au plus) : elle ne se charge qu'au clic du visiteur (`outils/verifier.js`, `LOURDS_PERMIS`).
  Les autres vidéos (12/10/2026) : 1280 x 720 pour l'accueil, 720 x 1280 pour la page des pirates, 5 Mo au plus chacune.
- On ne dévoile pas tout : pas de secret du palais, pas de boss caché. Jamais l'Abyssarque, jamais le dernier boss, jamais la
  salle du trône ; les donjons se montrent sans leurs boss ni leurs secrets (`outils/verifier.js` refuse leurs noms, aussi
  dans le texte d'une image).
- Un nombre ne se coupe jamais en deux lignes : les milliers se séparent par une espace insécable (`50&#160;000 jetons`) ;
  le vérificateur refuse une espace ordinaire entre les milliers dans le texte d'une page.
- Le site parle d'un serveur où l'on joue : jamais « en développement », « bientôt », « pas encore ouvert ».
- Avant de pousser : `npm run verifier` (un seul h1 par page, un texte pour chaque image, aucun lien cassé, aucun tiret long,
  aucun texte sombre sur un fond sombre ni clair sur le parchemin, aucun mot interdit, et le référencement : l'adresse
  complète de chaque page, son image de partage, le plan du site ; le classement : chaque menu y mène, sa fonction ne
  prend ses identifiants que dans l'environnement et ne fait que lire, sa page n'écrit qu'en texte ; le Discord : son
  bouton, son départ tout seul, l'adresse `/discord`, et l'invitation écrite dans sa page seulement).

## Vérifier, photographier

```bash
npm run verifier                 # les règles ci-dessus, en une seconde
bash outils/capturer.sh 3000     # des photos des pages entières dans captures/ (il faut Chrome ; jamais dans git)
```
