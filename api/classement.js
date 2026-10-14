// LE CLASSEMENT DU JEU SUR LE SITE : GET /api/classement, une fonction Node de Vercel.
// Les mêmes classements que /top en jeu, lus dans la base du réseau de Casteria : la table « res_classement_stat », une
// ligne par joueur et par chiffre, que les serveurs du jeu tiennent à jour (« _t » : l'heure du relevé du joueur ; à -1,
// son dossier est retiré du classement). Pour chaque catégorie, dans l'ordre de /top (le Score de Casteria d'abord) :
// son titre, une phrase, ses dix premiers (le rang, le pseudo, la valeur) ; et l'heure de la lecture.
// RIEN DE PRIVÉ : les pseudos et les chiffres que /top montre déjà, jamais un identifiant de joueur ni de la base.
// LA BASE EN LECTURE SEULE : une seule requête SELECT, sur UNE connexion fermée à la fin, avec un délai court. Ses
// identifiants : les cinq variables d'environnement CASTERIA_DB_* (réglées dans Vercel), jamais un fichier du dépôt.
// Vercel garde la réponse 5 minutes (s-maxage) : la base est lue au plus une fois toutes les 5 minutes.
// En panne (la base ne répond pas, une variable manque) : { indisponible: true } et le code 503, sans aucun détail.
'use strict'

const TABLE = 'res_classement_stat'
const DELAI_MS = 4000
const TOP = 10
// la forme d'un pseudo du jeu (la table n'en accepte pas d'autre ; une ligne qui s'en écarterait n'est jamais rendue)
const PSEUDO = /^[A-Za-z0-9_]{1,16}$/
const CACHE_OK = 'public, s-maxage=300, stale-while-revalidate=600'

// ---------- LE SCORE DE CASTERIA ----------
// Il n'est PAS rangé dans la base : chaque serveur du jeu le recalcule sur les autres chiffres de tous les joueurs
// (leaderboard.js, SCORE_ASPECTS et scoreParts). On refait ici le même calcul. Dix aspects de 100 points ; un aspect vaut
// 100 fois la racine de la part du joueur : sur un maximum du jeu quand il y en a un (« sur »), sinon face au meilleur du
// serveur ; un aspect de plusieurs chiffres prend la moyenne de leurs parts ; un chiffre que personne n'a encore ne compte
// pas. LES MAXIMUMS DU JEU sont lus dans son code (la mise en ligne 117) : ils suivent le jeu quand il change.
const NIVEAU_MAX = 60        // SCORE_NIVEAU_MAX : le niveau compte jusqu'à 60
const BOSS_MAX = 15          // SCORE_BOSS_MAX : les quinze boss
const COLLECTIONS_MAX = 42   // tout ce qui se collectionne : 31 familiers (casteria-familiers 1.7.5) et 11 montures
const ETOILES_MAX = 234      // les étoiles des 87 quêtes de progression (quetes_progression.js)
const SCORE_MAX = 1000
const SCORE_ASPECTS = [
  { cle: 'niveau', stats: ['niveau'], sur: NIVEAU_MAX },
  { cle: 'ventes', stats: ['ventes'] },
  { cle: 'territoire', stats: ['ile'] },
  { cle: 'boss', stats: ['g_boss'], sur: BOSS_MAX },
  { cle: 'mer', stats: ['mer_pirates', 'mer_legendaires', 'mer_corsaire', 'mer_lieux'] },
  { cle: 'betes', stats: ['betail'] },
  { cle: 'production', stats: ['generateurs'] },
  { cle: 'collections', stats: ['g_collections'], sur: COLLECTIONS_MAX },
  { cle: 'missions', stats: ['serie_missions', 'quetes_prog'], surStat: { quetes_prog: ETOILES_MAX } },
  { cle: 'beaute', stats: ['beaute'] }
]

// ---------- LES CATÉGORIES DE /top, dans l'ordre du jeu ----------
// Les familles sont les onglets de /top ; dans chaque famille, les catégories dans l'ordre de leur « vue ». La forme dit
// comment la valeur s'écrit, comme dans le jeu (un nombre entier, une espace des milliers).
const FAMILLES = [
  { cle: 'general', nom: 'Score' }, { cle: 'ile', nom: 'Île' }, { cle: 'jeux', nom: 'Jeux' },
  { cle: 'boss', nom: 'Boss' }, { cle: 'mer', nom: 'Mer' }, { cle: 'progres', nom: 'Progrès' }
]
const CATEGORIES = [
  { id: 'score', famille: 'general', titre: 'Score de Casteria', forme: 'score',
    aide: 'Dix aspects du jeu, 100 points chacun : le niveau, les ventes, le territoire, les boss, la mer, les bêtes, les machines, les collections, les quêtes et la beauté de l\'île.' },
  { id: 'fortune', famille: 'ile', titre: 'Fortune totale', forme: 'jetons', aide: 'Jetons, patrimoine, machines posées et bêtes des enclos : le vrai classement du serveur.' },
  { id: 'jetons', famille: 'ile', titre: 'Jetons', forme: 'jetons', aide: 'Les jetons disponibles tout de suite, sans rien vendre.' },
  { id: 'patrimoine', famille: 'ile', titre: 'Patrimoine', forme: 'jetons', aide: 'Ce que tu possèdes, hors jetons : coffres, incubateurs, sac, coffre de l\'Ender, familiers, montures, auras.' },
  { id: 'production', famille: 'ile', titre: 'Production', forme: 'heure', aide: 'Ce que tes machines et tes enclos produisent en une heure, au prix normal du marché.' },
  { id: 'betail', famille: 'ile', titre: 'Bêtes', forme: 'jetons', aide: 'La valeur des bêtes de tes enclos, au dernier recensement. Un enclos plein : 10 % de plus.' },
  { id: 'generateurs', famille: 'ile', titre: 'Machines', forme: 'valeur', aide: 'La valeur de tes machines posées, au prix du catalogue : 20 au plus par type comptent.' },
  { id: 'ventes', famille: 'ile', titre: 'Chiffre d\'affaires', forme: 'jetons', aide: 'Tout ce que tu as vendu depuis le début. Un compteur, jamais remis à zéro.' },
  { id: 'ile', famille: 'ile', titre: 'Territoire', forme: 'mot', mot: ['bloc', 'blocs'], aide: 'La surface totale de tes îles, en blocs.' },
  { id: 'beaute', famille: 'ile', titre: 'Beauté de l\'île', forme: 'mot', mot: ['point', 'points'], aide: 'Les décorations de ton île : leur rareté, leur variété.' },
  { id: 'coinflip_bilan', famille: 'jeux', titre: 'Pile ou face', forme: 'jetons', aide: 'Ton bilan au pile ou face : tes gains moins tes mises. Seuls les bilans positifs sont classés.' },
  { id: 'coinflip_gain', famille: 'jeux', titre: 'Record au pile ou face', forme: 'jetons', aide: 'Le plus gros gain net remporté en un seul lancer de pile ou face.' },
  { id: 'roue_tours', famille: 'jeux', titre: 'Tours de roue', forme: 'mot', mot: ['tour', 'tours'], aide: 'Le nombre de tours joués à la roue (/roue).' },
  { id: 'roue_gains', famille: 'jeux', titre: 'Gagné à la roue', forme: 'jetons', aide: 'La valeur totale des objets gagnés à la roue, en jetons.' },
  { id: 'roue_gros', famille: 'jeux', titre: 'Record à la roue', forme: 'jetons', aide: 'Le plus gros objet gagné en un seul tour, en jetons.' },
  { id: 'roue_serie', famille: 'jeux', titre: 'Meilleure série à la roue', forme: 'affilee', aide: 'Le plus de tours gagnés d\'affilée.' },
  { id: 'duels_victoires', famille: 'jeux', titre: 'Duels gagnés', forme: 'mot', mot: ['victoire', 'victoires'], aide: 'Tes victoires en duel contre un autre joueur, par KO seulement (/duel).' },
  { id: 'boss_vaincus', famille: 'boss', titre: 'Boss vaincus', forme: 'boss', aide: 'Le plus de boss différents vaincus, puis le temps total le plus court (tes meilleurs temps additionnés).' },
  { id: 'mer_pirates', famille: 'mer', titre: 'Pirates coulés', forme: 'mot', mot: ['pirate', 'pirates'], aide: 'Les pirates coulés en mer, capitaines nommés compris.' },
  { id: 'mer_legendaires', famille: 'mer', titre: 'Cargaisons légendaires', forme: 'mot', mot: ['cargaison', 'cargaisons'], aide: 'Les cargaisons légendaires ouvertes en mer.' },
  { id: 'mer_corsaire', famille: 'mer', titre: 'Victoires dans la Fosse', forme: 'mot', mot: ['victoire', 'victoires'], aide: 'Les navires coulés dans la Fosse aux Corsaires.' },
  { id: 'mer_lieux', famille: 'mer', titre: 'Lieux de l\'Atlas', forme: 'mot', mot: ['lieu', 'lieux'], aide: 'Les lieux de l\'Atlas découverts en mer.' },
  { id: 'mer_sorties', famille: 'mer', titre: 'Sorties en mer', forme: 'mot', mot: ['sortie', 'sorties'], aide: 'Les sorties en mer depuis le port, depuis toujours.' },
  { id: 'mer_cargaisons', famille: 'mer', titre: 'Cargaisons ouvertes', forme: 'mot', mot: ['cargaison', 'cargaisons'], aide: 'Les cargaisons ouvertes en mer, toutes raretés.' },
  { id: 'mer_captures', famille: 'mer', titre: 'Créatures attrapées', forme: 'mot', mot: ['créature', 'créatures'], aide: 'Les créatures de la mer attrapées, sur les îles aux bêtes.' },
  { id: 'niveau', famille: 'progres', titre: 'Niveau', forme: 'niveau', aide: 'Le niveau du joueur, et sa progression vers le suivant.' },
  { id: 'quetes_prog', famille: 'progres', titre: 'Quêtes de progression', forme: 'mot', mot: ['étoile', 'étoiles'], aide: 'Les étoiles de tes quêtes : 1 à 5 par quête faite. Ludovic, au pont du nord, ou /qp.' },
  { id: 'serie_missions', famille: 'progres', titre: 'Série des missions', forme: 'mot', mot: ['jour', 'jours'], aide: 'Tes jours d\'affilée avec la mission facile et la moyenne faites (/missions).' },
  { id: 'g_collections', famille: 'progres', titre: 'Collections', forme: 'sur', sur: COLLECTIONS_MAX, aide: 'Tes familiers et tes montures différents, sur tous ceux qui existent.' },
  { id: 'bestiaire', famille: 'progres', titre: 'Bestiaire', forme: 'mot', mot: ['bête', 'bêtes'], aide: 'Les bêtes découvertes dans ton Bestiaire (/bestiaire).' }
]

// les chiffres à lire : ceux des catégories et ceux du Score (le Score lui-même n'est pas dans la base)
const STATS = (function () {
  const t = new Set()
  for (const c of CATEGORIES) if (c.id !== 'score') t.add(c.id)
  for (const a of SCORE_ASPECTS) for (const s of a.stats) t.add(s)
  return Array.from(t)
})()
// UNE requête : les chiffres positifs de ces stats, pour les seuls dossiers vivants (« _t » à 0 ou plus)
const SQL = 'SELECT s.pseudo, s.stat, s.v FROM `' + TABLE + '` t JOIN `' + TABLE + '` s ON s.pseudo = t.pseudo' +
  ' WHERE t.stat = \'_t\' AND t.v >= 0 AND s.v > 0 AND s.stat IN (?)'

// ---------- les nombres, comme ciNombre et ciPluriel du jeu ----------
// « 1 234 567 » : l'entier (vers le bas), une espace des milliers
function nombre(n) {
  const x = Number(n) || 0, s = String(Math.floor(Math.abs(x)))
  let out = ''
  for (let i = 0; i < s.length; i++) { if (i > 0 && (s.length - i) % 3 === 0) out += ' '; out += s[i] }
  return (x < 0 ? '-' : '') + out
}
// « 0 jeton », « 1 jeton », « 2 jetons » : en français, 0 et 1 sont au singulier
function pluriel(n, mot, motPluriel) { return nombre(n) + ' ' + (Math.floor(Math.abs(Number(n) || 0)) <= 1 ? mot : (motPluriel || mot + 's')) }

// ---------- les boss : leur valeur rangée (boss.js du jeu, « boss_vaincus ») ----------
// (N x 1 000 000 - temps total en secondes) x 3e8 + (3e8 - 1 - la date de la dernière première victoire) : le plus de
// boss, puis le plus rapide, puis le premier à avoir fini. Une valeur sous 3e8 est l'ancienne forme, sans date.
const BOSS_PAS = 1000000, BOSS_DATES = 3e8
function quotient(v, pas) {
  let q = Math.floor(v / pas)
  while (q > 0 && q * pas > v) q--
  while ((q + 1) * pas <= v) q++
  return q
}
function decoderBoss(v) {
  const x = Math.round(Number(v) || 0)
  if (x <= 0) return { n: 0, s: 0 }
  const score = x < BOSS_DATES ? x : quotient(x, BOSS_DATES)
  const n = Math.ceil(score / BOSS_PAS)
  return { n: n, s: n * BOSS_PAS - score }
}
// « 45 s », « 38 min 12 s », « 1 h 04 min » (temps et tempsCumule de boss.js)
function temps(s) {
  const x = Math.max(0, Math.round(Number(s) || 0))
  if (x < 60) return x + ' s'
  const m = Math.floor(x / 60), r = x % 60
  return m + ' min' + (r ? ' ' + r + ' s' : '')
}
function tempsCumule(s) {
  if (s < 3600) return temps(s)
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  return h + ' h ' + (m < 10 ? '0' : '') + m + ' min'
}

// la valeur d'une ligne : le nombre montré (un entier) et son texte, comme dans /top
function ecrire(c, v) {
  switch (c.forme) {
    case 'score': return { valeur: Math.floor(v), texte: nombre(v) + ' / ' + nombre(SCORE_MAX) }
    case 'jetons': return { valeur: Math.floor(v), texte: pluriel(v, 'jeton') }
    case 'mot': return { valeur: Math.floor(v), texte: pluriel(v, c.mot[0], c.mot[1]) }
    case 'valeur': return { valeur: Math.floor(v), texte: 'valeur ' + nombre(v) }
    case 'heure': return { valeur: Math.floor(v), texte: 'valeur ' + nombre(v) + '/h' }
    case 'affilee': return { valeur: Math.floor(v), texte: nombre(v) + ' d\'affilée' }
    case 'niveau': return { valeur: Math.floor(v), texte: 'niveau ' + nombre(v) }
    case 'sur': return { valeur: Math.floor(v), texte: nombre(v) + ' sur ' + nombre(c.sur) }
    case 'boss': { const d = decoderBoss(v); return { valeur: d.n, texte: d.n + ' boss · ' + tempsCumule(d.s) } }
    default: return { valeur: Math.floor(v), texte: nombre(v) }
  }
}

// ---------- le calcul ----------
// les points d'un joueur (vals : stat -> chiffre), face aux meilleurs chiffres du serveur (meilleurs : stat -> chiffre)
function scoreDe(vals, meilleurs) {
  let total = 0
  for (const asp of SCORE_ASPECTS) {
    let somme = 0, compte = 0
    for (const st of asp.stats) {
      let v = Math.max(0, Number(vals[st]) || 0)
      let sur = asp.sur || 0
      if (asp.surStat && asp.surStat[st] !== undefined) { sur = asp.surStat[st]; if (!(sur > 0)) continue }
      if (sur > 0) v = Math.min(v, sur)
      const m = sur > 0 ? sur : Math.max(Number(meilleurs[st]) || 0, v)
      if (m <= 0) continue
      somme += Math.sqrt(v / m)
      compte++
    }
    total += compte ? Math.round(100 * somme / compte) : 0
  }
  return total
}
function avant(a, b) { return b.v - a.v || (a.pseudo.toLowerCase() < b.pseudo.toLowerCase() ? -1 : a.pseudo.toLowerCase() > b.pseudo.toLowerCase() ? 1 : 0) }

// lignes : [{ pseudo, stat, v }] lues dans la base ; rend le corps de la réponse
function classement(lignes, maintenant) {
  const dossiers = new Map()
  for (const l of lignes || []) {
    const p = String(l.pseudo), st = String(l.stat), v = Number(l.v)
    if (!PSEUDO.test(p) || !(v > 0) || !isFinite(v)) continue
    let d = dossiers.get(p)
    if (!d) { d = {}; dossiers.set(p, d) }
    d[st] = v
  }
  const meilleurs = {}
  for (const d of dossiers.values()) for (const st in d) if (d[st] > (meilleurs[st] || 0)) meilleurs[st] = d[st]
  const scores = new Map()
  for (const [p, d] of dossiers) scores.set(p, scoreDe(d, meilleurs))
  const categories = CATEGORIES.map(function (c) {
    const liste = []
    for (const [p, d] of dossiers) {
      const v = c.id === 'score' ? scores.get(p) : d[c.id]
      if (v > 0) liste.push({ pseudo: p, v: v })
    }
    liste.sort(avant)
    const top = liste.slice(0, TOP).map(function (e, i) { const w = ecrire(c, e.v); return { rang: i + 1, pseudo: e.pseudo, valeur: w.valeur, texte: w.texte } })
    return { id: c.id, famille: c.famille, titre: c.titre, aide: c.aide, classes: liste.length, top: top }
  })
  return { lu: new Date(maintenant || Date.now()).toISOString(), familles: FAMILLES, categories: categories }
}

// ---------- la base ----------
function reglages(env) {
  const e = env || {}
  const host = String(e.CASTERIA_DB_HOST || ''), user = String(e.CASTERIA_DB_USER || ''), password = String(e.CASTERIA_DB_PASSWORD || '')
  const database = String(e.CASTERIA_DB_NAME || ''), port = Number(e.CASTERIA_DB_PORT || 3306)
  if (!host || !user || !password || !database || !(port > 0 && port < 65536)) return null
  return { host: host, port: port, user: user, password: password, database: database }
}
async function lireBase(r) {
  const mysql = require('mysql2/promise')
  const cx = await mysql.createConnection({ host: r.host, port: r.port, user: r.user, password: r.password, database: r.database, connectTimeout: DELAI_MS, charset: 'utf8mb4' })
  let fini = false
  try {
    const [lignes] = await cx.query({ sql: SQL, timeout: DELAI_MS, values: [STATS] })
    fini = true
    return lignes
  } finally {
    if (fini) { try { await cx.end() } catch (e) { cx.destroy() } } else cx.destroy()
  }
}

function repondre(res, code, corps, cache) {
  res.statusCode = code
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', cache)
  res.end(JSON.stringify(corps))
}

async function gerer(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.setHeader('Allow', 'GET, HEAD'); return repondre(res, 405, { indisponible: true }, 'no-store') }
  const r = reglages(process.env)
  if (!r) { console.error('classement : une variable CASTERIA_DB_* manque'); return repondre(res, 503, { indisponible: true }, 'no-store') }
  let lignes
  try { lignes = await lireBase(r) } catch (e) {
    // au journal de Vercel : le code de l'erreur seul (jamais l'adresse ni un identifiant de la base)
    console.error('classement : la base ne répond pas (' + String((e && e.code) || 'erreur') + ')')
    return repondre(res, 503, { indisponible: true }, 'no-store')
  }
  let corps
  try { corps = classement(lignes, Date.now()) } catch (e2) {
    console.error('classement : le calcul a échoué')
    return repondre(res, 503, { indisponible: true }, 'no-store')
  }
  return repondre(res, 200, corps, CACHE_OK)
}

module.exports = gerer
// pour les essais (outils/essai_classement.js) : le calcul seul, sans la base
module.exports.classement = classement
module.exports.reglages = reglages
