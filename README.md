# Casteria, le site

La vitrine du serveur Minecraft Casteria : l'accueil, le guide « Par où commencer » et la boutique des crédits.

## Le voir tourner (GitHub Codespaces ou ton PC)

```bash
npm run dev
```

Puis ouvre l'adresse affichée (le port 3000 ; dans Codespaces, clique sur « Ouvrir dans le navigateur »).
Il n'y a rien à installer : pas de `npm install`, aucune dépendance. C'est un site statique (du HTML, du CSS et un peu de
JavaScript) ; `serveur.js` est un tout petit serveur Node qui sert les fichiers tels quels. On peut aussi déposer le
dossier chez n'importe quel hébergeur de sites statiques, sans rien construire.

## Les pages

| Fichier | Ce que c'est |
|---|---|
| `index.html` | l'accueil : l'en-tête animé et le bouton de téléchargement, le concept, l'inédit (les boss, les armures, la mer, l'île qui grandit), la rangée de vidéos, les premiers pas, la boutique, le téléchargement |
| `commencer.html` | « Par où commencer » : les dix premières étapes du jeu, les tickets et la roue, les astuces |
| `pirates.html` | la mer : les bateaux, les pirates, les canons (la page qui vise « serveur Minecraft pirate ») |
| `boutique.html` | la boutique : à quoi servent les crédits, et le cadre où Tebex s'affiche (`js/boutique.config.js`) |
| `404.html` | la page des adresses qui n'existent pas (Vercel l'affiche tout seul, le petit serveur aussi) |
| `css/style.css`, `js/site.js` | l'habillage et ce qui bouge (le site se lit entier sans JavaScript) |
| `robots.txt`, `sitemap.xml`, `favicon.ico` | pour Google : le droit de tout lire, le plan du site, l'icône |
| `vercel.json`, `.vercelignore` | les réglages de la mise en ligne, et ce qui ne part pas en ligne |
| `assets/` | le logo, les polices, les matières (parchemin, cadre, ruban, boutons), les icônes, les vidéos allégées et leurs affiches |

## Mettre en ligne sur Vercel (casteria.fr)

Il n'y a rien à construire : Vercel sert les fichiers tels quels. `.vercelignore` garde hors ligne tout ce qui n'est pas
le site (`serveur.js`, `outils/`, ce README, `package.json`).

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

## Le domaine et le référencement

`node outils/domaine.js https://casteria.fr` a écrit le domaine partout où il faut une adresse complète : `sitemap.xml`,
la ligne `Sitemap:` de `robots.txt`, et dans chaque page son adresse (`canonical`, `og:url`), l'image de partage
(`og:image`) et les données pour Google (le bloc JSON-LD). Relance-le si le domaine change, ou après avoir ajouté une page
à sa liste `PAGES` (il refait aussi la date du plan du site).

- L'accueil n'a qu'une adresse, `https://casteria.fr/` : les liens vers l'accueil s'écrivent `./`, jamais `index.html`.
- L'image de partage (`assets/images/casteria-serveur-minecraft-partage.jpg`) fait 1200 x 630, le format des réseaux.
- Le logo affiché dans les pages est la copie légère (`casteria-logo-300.webp`) ; le grand `casteria-logo.png` reste
  l'original.
- Les fichiers de `assets/` restent une semaine dans le navigateur des visiteurs : pour changer une image, donne un autre
  nom au nouveau fichier plutôt que d'écraser l'ancien.

## Ce qu'il reste à régler

**La boutique Tebex.** Tout se règle dans `js/boutique.config.js`, deux lignes :

- `adresse` : l'adresse de ta boutique (`https://....tebex.io`) : le grand bouton « Ouvrir la boutique » apparaît dans le
  cadre de bois de `boutique.html` ;
- `cadre` (facultatif) : une adresse à incruster, si Tebex t'en donne une : la boutique s'affiche dans la page, sous le
  bouton (le bouton reste : il sert si le cadre ne s'affiche pas chez un joueur).

Si Tebex te donne plutôt un code à coller (une balise `script`), un commentaire dans `boutique.html` montre où. Tant que
les deux lignes sont vides, la page ne change pas. Aucune clé ne va dans ce dépôt : seulement des adresses publiques, et
`npm run verifier` refuse autre chose qu'une adresse `https://`.

## Les règles du site

- Les liens de téléchargement sont ceux de la release « installateur » du launcher : ils sont figés, ne les change pas.
- Aucune texture ni police du jeu de base : les matières viennent des écrans de Casteria, les polices (Fredoka, Lilita One)
  sont libres (licence OFL, dans `assets/polices/`).
- Les vidéos sont des copies allégées (540 x 960, sans son). Pour en ajouter une : `bash outils/alleger_videos.sh
  <ffmpeg> <dossier des vidéos> <numéro>`, puis une ligne de plus dans la rangée de `index.html`.
- On ne dévoile pas tout : pas de secret du palais, pas de boss caché.
- Le site parle d'un serveur où l'on joue : jamais « en développement », « bientôt », « pas encore ouvert ».
- Avant de pousser : `npm run verifier` (un seul h1 par page, un texte pour chaque image, aucun lien cassé, aucun tiret long,
  aucun texte sombre sur un fond sombre ni clair sur le parchemin, aucun mot interdit, et le référencement : l'adresse
  complète de chaque page, son image de partage, le plan du site).

## Vérifier, photographier

```bash
npm run verifier                 # les règles ci-dessus, en une seconde
bash outils/capturer.sh 3000     # des photos des pages entières dans captures/ (il faut Chrome ; jamais dans git)
```
