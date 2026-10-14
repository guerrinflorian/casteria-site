// L'ESSAI DU CLASSEMENT : la fonction api/classement.js jouée sur ce PC, contre la vraie base, sans Vercel.
//   npm install                      (une fois : le pilote de la base, mysql2)
//   node outils/essai_classement.js <fichier des clés de la base> <sortie.json>
// Le fichier des clés (hors du dépôt, JAMAIS dans git) : un JSON { hote, port, base, utilisateur, mot_de_passe }. Ses
// valeurs ne sont jamais affichées ni écrites : elles passent à la fonction par ses cinq variables CASTERIA_DB_*, dans ce
// processus seulement. La réponse est écrite dans <sortie.json>, puis relue : sa forme, et qu'aucun identifiant de la
// base n'y figure. Deux pannes sont jouées aussi (sans variables, une adresse qui n'existe pas) : 503 et leur raison
// (« variables », le code de l'erreur), rien d'autre.
// Code 0 : tout est bon.
'use strict'
const fs = require('fs'), path = require('path')
const [fichierCles, sortie] = process.argv.slice(2)
if (!fichierCles || !sortie) { console.log('Usage : node outils/essai_classement.js <fichier des clés de la base> <sortie.json>'); process.exit(2) }
const gerer = require(path.join(__dirname, '..', 'api', 'classement.js'))

let fautes = 0
const faute = m => { fautes++; console.log('  FAUTE : ' + m) }
const NOMS = ['CASTERIA_DB_HOST', 'CASTERIA_DB_PORT', 'CASTERIA_DB_USER', 'CASTERIA_DB_PASSWORD', 'CASTERIA_DB_NAME']
function poser(o) { for (const n of NOMS) { if (o && o[n] !== undefined) process.env[n] = String(o[n]); else delete process.env[n] } }

// une requête et une réponse à la façon de Node (ce que Vercel donne à la fonction)
function appeler(methode) {
  return new Promise(resolve => {
    const tetes = {}
    const res = { statusCode: 200, setHeader(k, v) { tetes[k.toLowerCase()] = String(v) }, end(corps) { resolve({ code: res.statusCode, tetes, corps: String(corps || '') }) } }
    // une fonction qui lèverait sans répondre : le code 0 (Vercel rendrait une erreur 500)
    Promise.resolve().then(() => gerer({ method: methode, url: '/api/classement', headers: {} }, res)).catch(() => resolve({ code: 0, tetes, corps: '' }))
  })
}

;(async () => {
  let cles
  try { cles = JSON.parse(fs.readFileSync(fichierCles, 'utf8')) } catch (e) { console.log('Le fichier des clés ne se lit pas.'); process.exit(2) }
  const secrets = [cles.hote, cles.utilisateur, cles.mot_de_passe, cles.base].map(x => String(x || '')).filter(x => x.length >= 4)

  // 1. LA VRAIE LECTURE
  poser({ CASTERIA_DB_HOST: cles.hote, CASTERIA_DB_PORT: cles.port, CASTERIA_DB_USER: cles.utilisateur, CASTERIA_DB_PASSWORD: cles.mot_de_passe, CASTERIA_DB_NAME: cles.base })
  const t0 = Date.now()
  const r = await appeler('GET')
  const duree = Date.now() - t0
  poser(null)
  console.log('la vraie lecture : code ' + r.code + ' en ' + duree + ' ms, Cache-Control « ' + (r.tetes['cache-control'] || '') + ' »')
  if (r.code !== 200) faute('la lecture rend le code ' + r.code + ' (attendu : 200)')
  if (r.tetes['cache-control'] !== 'public, s-maxage=300, stale-while-revalidate=600') faute('le Cache-Control n\'est pas « public, s-maxage=300, stale-while-revalidate=600 »')
  if (!/^application\/json/.test(r.tetes['content-type'] || '')) faute('la réponse n\'est pas du JSON')
  for (const s of secrets) if (r.corps.includes(s)) faute('un identifiant de la base est dans la réponse')
  if (/uuid|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-/i.test(r.corps)) faute('un uuid est dans la réponse')
  for (const t of [String.fromCharCode(0x2014), String.fromCharCode(0x2013)]) if (r.corps.includes(t)) faute('un tiret long ou moyen dans la réponse')
  let o = null
  try { o = JSON.parse(r.corps) } catch (e) { faute('la réponse n\'est pas un JSON lisible') }
  if (o) {
    fs.writeFileSync(sortie, JSON.stringify(o, null, 2) + '\n')
    console.log('écrit : ' + sortie)
    if (!o.lu || isNaN(Date.parse(o.lu))) faute('« lu » n\'est pas une heure')
    const cats = Array.isArray(o.categories) ? o.categories : []
    if (cats.length !== 30) faute(cats.length + ' catégories (attendu : 30)')
    if (!cats.length || cats[0].id !== 'score') faute('le Score de Casteria n\'est pas la première catégorie')
    const familles = new Set((o.familles || []).map(f => f.cle))
    for (const c of cats) {
      if (!c.titre || !c.aide || !familles.has(c.famille)) faute(c.id + ' : un titre, une phrase ou une famille manque')
      if (!Array.isArray(c.top) || c.top.length > 10) { faute(c.id + ' : plus de dix lignes'); continue }
      if (c.classes < c.top.length) faute(c.id + ' : « classes » plus petit que la liste')
      c.top.forEach((e, i) => {
        if (e.rang !== i + 1) faute(c.id + ' : le rang ' + e.rang + ' à la place ' + (i + 1))
        if (!/^[A-Za-z0-9_]{1,16}$/.test(e.pseudo)) faute(c.id + ' : un pseudo hors de la forme du jeu')
        if (!Number.isInteger(e.valeur) || e.valeur < 0) faute(c.id + ' : une valeur qui n\'est pas un entier')
        if (!e.texte || /\d{4}/.test(e.texte.replace(/\d+:\d+/g, ''))) faute(c.id + ' : « ' + e.texte + ' » (un nombre sans l\'espace des milliers)')
        if (i > 0 && e.valeur > c.top[i - 1].valeur) faute(c.id + ' : la liste n\'est pas du plus grand au plus petit')
      })
      const tete = c.top.slice(0, 3).map(e => e.pseudo + ' ' + e.texte).join(' ; ')
      console.log('  ' + c.famille.padEnd(8) + ' ' + c.titre.padEnd(27) + ' ' + String(c.classes).padStart(3) + ' classé(s)' + (tete ? '  ' + tete : ''))
    }
  }

  // 2. LES PANNES : sans variables, puis une adresse qui n'existe pas (aucune base n'est jointe) ; chacune dit sa raison,
  // un mot (« variables ») ou le code de l'erreur (ENOTFOUND...), et rien d'autre : ni une valeur des variables ni un texte
  const essai = { CASTERIA_DB_HOST: 'base.invalid', CASTERIA_DB_PORT: '3306', CASTERIA_DB_USER: 'utilisateur_essai', CASTERIA_DB_PASSWORD: 'mot_de_passe_essai', CASTERIA_DB_NAME: 'base_essai' }
  for (const [nom, env, raison] of [['sans variables', null, /^variables$/], ['une adresse qui n\'existe pas', essai, /^[A-Z][A-Z0-9_]{1,40}$/]]) {
    poser(env)
    const t = Date.now(), p = await appeler('GET')
    poser(null)
    console.log('la panne « ' + nom + ' » : code ' + p.code + ' en ' + (Date.now() - t) + ' ms, ' + p.corps)
    let o = null
    try { o = JSON.parse(p.corps) } catch (e) { o = null }
    if (p.code !== 503 || !o || o.indisponible !== true || !raison.test(String(o.raison)) || Object.keys(o).length !== 2) faute('la panne « ' + nom + ' » doit rendre 503 et { indisponible: true, raison }, rien d\'autre')
    if (env) for (const v of Object.values(env)) if (v.length > 4 && p.corps.includes(v)) faute('la panne « ' + nom + ' » dit une valeur des variables')
    if (p.tetes['cache-control'] !== 'no-store') faute('la panne « ' + nom + ' » ne doit jamais être gardée (Cache-Control: no-store)')
  }
  const m = await appeler('POST')
  if (m.code !== 405) faute('un POST doit rendre 405')

  console.log(fautes ? fautes + ' faute(s)' : 'tout est bon')
  process.exit(fautes ? 1 : 0)
})().catch(e => { console.log('L\'essai a échoué (' + String((e && e.code) || (e && e.name) || 'erreur') + ')'); process.exit(1) })
