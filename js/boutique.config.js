// LA BOUTIQUE DE CASTERIA : le seul réglage de la page boutique.
// Aucune clé secrète ici, jamais : seulement ce que tout joueur voit dans son navigateur.
window.CASTERIA_BOUTIQUE = {
  // Le JETON PUBLIC de la boutique Tebex (Tebex, « API Keys », « Public Token » : quatre caractères, un tiret, puis
  // quarante lettres et chiffres). Il sert à LIRE les packs et à créer un panier : il est fait pour être public.
  // Rempli : la page boutique affiche tes packs en direct (leurs noms, leurs images, leurs prix) et le joueur paie sur
  // la page de Tebex. Vide : la page n'affiche aucun pack.
  // JAMAIS la « Private Key » ni la clé secrète du serveur de jeu : elles n'ont rien à faire dans ce dépôt.
  jeton: '14tff-fc5549d2437006fa9a4703bbde8dba60567fd478',

  // Sans jeton seulement : l'adresse d'une boutique Tebex (par exemple 'https://casteria.tebex.io') pour un simple
  // bouton « Ouvrir la boutique », et une adresse à INCRUSTER dans la page si Tebex en donne une.
  adresse: '',
  cadre: '',

  // La hauteur du cadre incrusté, en pixels (de 400 à 3000).
  hauteurCadre: 900
}
