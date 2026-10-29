'use strict'
// (67, le 29/10/2026) LES NOMS DES BETES pour la page d'une ile : ceux de Casteria lus dans le fichier de langue du jar des
// animaux (entity.casinoanimaux.<id>, en francais), plus les betes du jeu de base qu'une ile peut avoir. Ecrit js/betes_noms.js.
//   node outils/faire_noms_betes.js <fr_fr.json du jar casteria-animaux>
const fs = require('fs'), path = require('path')
const lang = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const noms = {}
for (const k of Object.keys(lang).sort()) {
  const m = /^entity\.casinoanimaux\.([a-z0-9_]+)$/.exec(k)
  if (m) noms['casinoanimaux:' + m[1]] = String(lang[k])
}
const BASE = { cow: 'Vache', pig: 'Cochon', sheep: 'Mouton', chicken: 'Poule', rabbit: 'Lapin', horse: 'Cheval', donkey: 'Âne', mule: 'Mule',
  llama: 'Lama', goat: 'Chèvre', cat: 'Chat', wolf: 'Loup', fox: 'Renard', panda: 'Panda', bee: 'Abeille', turtle: 'Tortue', frog: 'Grenouille',
  axolotl: 'Axolotl', mooshroom: 'Champimeuh', camel: 'Dromadaire', sniffer: 'Renifleur', armadillo: 'Tatou', parrot: 'Perroquet',
  polar_bear: 'Ours polaire', ocelot: 'Ocelot', allay: 'Allay', strider: 'Arpenteur', villager: 'Villageois', iron_golem: 'Golem de fer' }
for (const k of Object.keys(BASE)) noms['minecraft:' + k] = BASE[k]
const sortie = path.join(__dirname, '..', 'js', 'betes_noms.js')
fs.writeFileSync(sortie, '// LES NOMS DES BETES (fait par outils/faire_noms_betes.js, le ' + new Date().toISOString().slice(0, 10) + ' : le fichier de langue du jar\n' +
  '// casteria-animaux, plus les betes du jeu de base). Ne pas retoucher a la main : relancer l\'outil.\n' +
  'window.CasteriaBetesNoms = ' + JSON.stringify(noms, null, 1) + '\n')
console.log(Object.keys(noms).length + ' noms -> ' + sortie)
