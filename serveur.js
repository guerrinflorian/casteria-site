// Le petit serveur du site : `npm run dev`, puis http://localhost:3000
// Il sert les fichiers du dossier tels quels, et sait envoyer un morceau de vidéo (les navigateurs le demandent).
'use strict'
const http = require('http'), fs = require('fs'), path = require('path')
const RACINE = __dirname, PORT = Number(process.env.PORT) || 3000
const REECRITURES = new Map()
try { for (const r of JSON.parse(fs.readFileSync(path.join(RACINE, 'vercel.json'), 'utf8')).rewrites || []) REECRITURES.set(r.source, r.destination) } catch (e) { /* sans vercel.json lisible : aucune */ }
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8' }

// (29/10/2026, 67) EN DEVELOPPEMENT SEULEMENT : /api/ile/... (la vue 3D d'une ile, API de l'agent de la 3D) et /demo/... sont
// relayes vers son serveur de demonstration (ILE3D_DEMO, 127.0.0.1:8800 par defaut), pour garder une seule origine comme en
// ligne (ou le VPS les sert lui-meme). Rien d'autre ne part ailleurs.
const ILE3D = new URL(process.env.ILE3D_DEMO || 'http://127.0.0.1:8800')
function relayer(req, res) {
  const r = http.request({ host: ILE3D.hostname, port: ILE3D.port, path: req.url, method: req.method, headers: Object.assign({}, req.headers, { host: ILE3D.host }) }, (rr) => { res.writeHead(rr.statusCode, rr.headers); rr.pipe(res) })
  r.on('error', () => { if (!res.headersSent) res.writeHead(503, { 'Content-Type': 'application/json' }); res.end('{"erreur":"indisponible"}') })
  req.pipe(r)
}
http.createServer((req, res) => {
  if (/^\/(api\/ile\/|demo\/)/.test(req.url)) return relayer(req, res)
  let chemin
  try { chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname) } catch (e) { res.writeHead(400); return res.end() }
  // les réécritures de vercel.json, comme en ligne (/discord : discord.html)
  if (REECRITURES.has(chemin)) chemin = REECRITURES.get(chemin)
  // (29/10/2026, 67) le profil d'un joueur, /joueur/<pseudo> : la page joueur.html (en ligne, le VPS la remplit de ses balises de partage)
  else if (/^\/joueur\/[A-Za-z0-9_]{3,16}$/.test(chemin)) chemin = '/joueur.html'
  // (29/10/2026, 67) la page d'une ile en 3D, /ile/<i>,<j> : ile.html
  else if (/^\/ile\/-?\d{1,4},-?\d{1,4}$/.test(chemin)) chemin = '/ile.html'
  if (chemin.endsWith('/')) chemin += 'index.html'
  const fichier = path.join(RACINE, chemin)
  // jamais hors du dossier du site, jamais un fichier caché
  if (!fichier.startsWith(RACINE + path.sep) || chemin.split('/').some(p => p.startsWith('.'))) { res.writeHead(403); return res.end('Interdit') }
  fs.stat(fichier, (err, st) => {
    // une adresse inconnue : la page 404.html, comme en ligne
    if (err || !st.isFile()) return fs.readFile(path.join(RACINE, '404.html'), (e, page) => { res.writeHead(404, { 'Content-Type': 'text/' + (e ? 'plain' : 'html') + '; charset=utf-8' }); res.end(e ? 'Page introuvable' : page) })
    const tete = { 'Content-Type': TYPES[path.extname(fichier).toLowerCase()] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' }
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '')
    if (m && (m[1] || m[2])) {
      const debut = m[1] ? Number(m[1]) : Math.max(0, st.size - Number(m[2]))
      const fin = m[1] && m[2] ? Math.min(Number(m[2]), st.size - 1) : st.size - 1
      if (debut > fin || debut >= st.size) { res.writeHead(416, { 'Content-Range': 'bytes */' + st.size }); return res.end() }
      res.writeHead(206, Object.assign(tete, { 'Content-Range': 'bytes ' + debut + '-' + fin + '/' + st.size, 'Content-Length': fin - debut + 1 }))
      return req.method === 'HEAD' ? res.end() : fs.createReadStream(fichier, { start: debut, end: fin }).pipe(res)
    }
    res.writeHead(200, Object.assign(tete, { 'Content-Length': st.size }))
    req.method === 'HEAD' ? res.end() : fs.createReadStream(fichier).pipe(res)
  })
}).listen(PORT, () => console.log('Casteria, le site : http://localhost:' + PORT))
