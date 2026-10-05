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
| `boutique.html` | la boutique : à quoi servent les crédits, et la place de l'incrustation Tebex |
| `css/style.css`, `js/site.js` | l'habillage et ce qui bouge (le site se lit entier sans JavaScript) |
| `assets/` | le logo, les polices, les matières (parchemin, cadre, ruban, boutons), les icônes, les vidéos allégées et leurs affiches |

## Ce qu'il reste à régler (trois choses, à toi de décider)

1. **Le nom de domaine.** `sitemap.xml`, `robots.txt` et les images de partage (les balises `og:image`) veulent une adresse
   complète. Quand tu l'as : `node outils/domaine.js https://ton-domaine.fr` écrit le plan du site, la ligne `Sitemap:` de
   robots.txt, et les adresses complètes dans les trois pages.
2. **La boutique Tebex.** Dans `boutique.html`, un commentaire « ICI L'INCRUSTATION TEBEX » montre le bloc à remplacer par
   le code d'incrustation que Tebex te donne. Aucune clé ne va dans ce dépôt.
3. **L'ouverture.** Le site dit « le serveur est encore en développement », sans date. Le jour J, deux phrases à changer
   (cherche « développement » et « ouvre bientôt »).

## Les règles du site

- Les liens de téléchargement sont ceux de la release « installateur » du launcher : ils sont figés, ne les change pas.
- Aucune texture ni police du jeu de base : les matières viennent des écrans de Casteria, les polices (Fredoka, Lilita One)
  sont libres (licence OFL, dans `assets/polices/`).
- Les vidéos sont des copies allégées (540 x 960, sans son). Pour en ajouter une : `bash outils/alleger_videos.sh
  <ffmpeg> <dossier des vidéos> <numéro>`, puis une ligne de plus dans la rangée de `index.html`.
- On ne dévoile pas tout : pas de secret du palais, pas de boss caché.
- Avant de pousser : `npm run verifier` (un seul h1 par page, un texte pour chaque image, aucun lien cassé, aucun tiret long).

## Vérifier, photographier

```bash
npm run verifier                 # les règles ci-dessus, en une seconde
bash outils/capturer.sh 3000     # des photos des pages entières dans captures/ (il faut Chrome ; jamais dans git)
```
