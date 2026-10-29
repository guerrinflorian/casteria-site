// LES DONNÉES D'ESSAI DE LA CARTE (67, 29/10/2026) : des réponses de /api/carte et /api/navires (API.md 2.6 et 2.7),
// champ pour champ, avec des chiffres INVENTÉS ; chaque fichier porte "essai": true. Les premiers hôtes sont les joueurs
// d'essai de l'agent (donnees-essai/joueur/*.json : leur pseudo, leur île, en ligne ou non) : la carte, le profil et le
// classement parlent des mêmes. Puis des milliers d'îles tirées (à graine fixe), pour mesurer la carte au pire.
//   node outils/essai_vivant.js [nombre d'îles, 10000 par défaut]   ->   donnees-essai/vivant/*.json (jamais en ligne)
'use strict'
const fs = require('fs'), path = require('path')
const ESSAI = path.join(__dirname, '..', 'donnees-essai'), SORTIE = path.join(ESSAI, 'vivant')
fs.mkdirSync(SORTIE, { recursive: true })
const N = Math.max(50, parseInt(process.argv[2], 10) || 10000)
let graine = 20261029
const alea = () => { graine = (Math.imul(graine, 1103515245) + 12345) >>> 0; return (graine >>> 8) / 16777216 }
const choix = (t) => t[Math.floor(alea() * t.length)]
const LU = '2026-10-29T17:00:00.000Z'
const ecrire = (nom, o) => fs.writeFileSync(path.join(SORTIE, nom), JSON.stringify(Object.assign({ essai: true }, o)))

// les joueurs de l'agent, dans l'ordre du classement general
const agent = fs.readdirSync(path.join(ESSAI, 'joueur')).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(ESSAI, 'joueur', f), 'utf8')))
  .sort((a, b) => ((a.general && a.general.rang) || 9999) - ((b.general && b.general.rang) || 9999))
const SYL = ['ba', 'lo', 'mi', 'ra', 'zu', 'ko', 'ti', 'na', 'vel', 'mar', 'pi', 'ro', 'su', 'ga', 'fe', 'li', 'do', 'ny', 'cha', 'qui']
const vus = new Set(agent.map(j => j.pseudo.toLowerCase()))
function pseudoNeuf() {
  for (;;) {
    let p = choix(SYL) + choix(SYL) + (alea() < .6 ? choix(SYL) : '')
    p = p[0].toUpperCase() + p.slice(1) + (alea() < .5 ? (alea() < .5 ? '_' : '') + Math.floor(alea() * 99) : '')
    if (p.length >= 3 && p.length <= 16 && !vus.has(p.toLowerCase())) { vus.add(p.toLowerCase()); return p }
  }
}
// les peaux d'essai de l'agent (outils/peaux_essai.js : dessinées pour le site, aucune texture de Mojang)
const PEAUX_ESSAI = fs.readdirSync(path.join(__dirname, '..', 'assets', 'peaux', 'essai')).filter(f => f.endsWith('.png')).map(f => f.slice(0, -4))
const NOMS_A = ['Port', 'Anse', 'Cap', 'Baie', 'Récif', 'Pointe', 'Crique', 'Rocher', 'Jardin', 'Havre', 'Mont', 'Val']
const NOMS_B = ['Vermeil', 'des Brumes', 'Doré', 'aux Mouettes', 'Azur', 'des Lucioles', 'Sauvage', 'Tranquille', 'des Vents', 'Fleuri', 'du Soleil', 'Corail', 'Nacré', 'des Pins']
// les cases en spirale autour du centre (une place tous les 320 blocs) ; quelques places LIBRES dans la grille (une île
// effacée, une place rendue) : la carte les montre (« Ton île ici ? »)
const iles = []
let i = 0, j = 0, dx = 1, dy = 0, pas = 1, fait = 0, tour = 0, k = 0
while (iles.length < N) {
  const libre = k > 6 && alea() < 0.04
  k++
  if (!libre && !(i === 1 && j === 1)) {
    const a = agent[iles.length]
    const age = iles.length / N
    // les etoiles : une decimale (la beaute de l'ile, sur 5) ; le Classement des iles : sur 400
    const et = a && a.ile ? Math.min(5, Math.max(0, a.ile.etoiles - alea() * 0.9)) : Math.max(0, Math.min(5, (1 - age) * 4.2 * alea() + alea() * 0.8))
    const e1 = Math.round(et * 10) / 10
    const hote = a ? a.pseudo : pseudoNeuf()
    iles.push({ i, j, nom: a && a.ile ? a.ile.nom : choix(NOMS_A) + ' ' + choix(NOMS_B), hote, amis: a && a.ile ? a.ile.amis : (alea() < .55 ? 0 : Math.floor(alea() * 6) + 1),
      etoiles: e1, ouverte: alea() < .35, en_ligne: a ? (a.en_ligne ? 1 + Math.floor(alea() * 2) : 0) : (alea() < .03 ? 1 + Math.floor(alea() * 3) : 0),
      peau: a ? a.peau : 'assets/peaux/essai/' + choix(PEAUX_ESSAI) + '.png', classement: { points: Math.round(400 * Math.min(1, et / 5 * (0.75 + alea() * 0.25))), sur: 400 } })
  }
  i += dx; j += dy
  if (++fait === pas) { fait = 0; [dx, dy] = [-dy, dx]; if (++tour % 2 === 0) pas++ }
}
// le rang au Classement des iles : par points
iles.slice().sort((a, b) => b.classement.points - a.classement.points).forEach((x, r) => { x.classement.rang = r + 1 })
let i0 = 1e9, i1 = -1e9, j0 = 1e9, j1 = -1e9
for (const x of iles) { i0 = Math.min(i0, x.i); i1 = Math.max(i1, x.i); j0 = Math.min(j0, x.j); j1 = Math.max(j1, x.j) }
ecrire('carte-iles.json', { lu: LU, zone: 'iles', espace_blocs: 320, etendue: { de: [i0, j0], a: [i1, j1] }, iles })

// la mer : le port, les lieux publics (inventes), le phare qui balaie
const lieux = [{ id: 'port', nom: 'Le port', x: 0, z: 0, sorte: 'port' }]
for (const [id, nom, sorte] of [['phare_nord', 'Le phare du Nord', 'phare'], ['ile_mouettes', 'L\'île aux Mouettes', 'ile'], ['epave_brune', 'L\'épave de la Brune', 'epave'],
  ['recif_corail', 'Le récif de corail', 'recif'], ['comptoir_est', 'Le comptoir de l\'Est', 'port'], ['ile_palmiers', 'L\'île aux Palmiers', 'ile'],
  ['epave_sel', 'L\'épave du Sel', 'epave'], ['phare_sud', 'Le phare du Sud', 'phare'], ['recif_dents', 'Les Dents du récif', 'recif'], ['anse_pirates', 'L\'anse des pirates', 'repaire']]) {
  const a = alea() * Math.PI * 2, r = 700 + alea() * 2300
  lieux.push({ id, nom, x: Math.round(Math.cos(a) * r), z: Math.round(Math.sin(a) * r), sorte })
}
ecrire('carte-mer.json', { lu: LU, zone: 'mer', lieux })
const navires = []
for (let n = 0; n < 14; n++) {
  const a = alea() * Math.PI * 2, r = 200 + alea() * 2600
  navires.push({ pseudo: n < agent.length ? agent[(n * 3) % agent.length].pseudo : pseudoNeuf(), x: Math.round(Math.cos(a) * r), z: Math.round(Math.sin(a) * r), cap: Math.floor(alea() * 360),
    coque: choix(['sloop', 'brick', 'fregate', 'galion']), en_combat: alea() < .2 })
}
ecrire('navires.json', { lu: LU, navires })
const libres = (i1 - i0 + 1) * (j1 - j0 + 1) - iles.length
console.log(iles.length + ' îles (dont ' + Math.min(agent.length, iles.length) + ' des joueurs de l\'agent), ' + libres + ' places libres dans l\'étendue, ' + lieux.length + ' lieux, ' + navires.length + ' navires')
