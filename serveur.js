// Le petit serveur du site (aucune dépendance) : `npm run dev`, puis http://localhost:3000
// Il sert les fichiers du dossier tels quels, et sait envoyer un morceau de vidéo (les navigateurs le demandent).
'use strict'
const http = require('http'), fs = require('fs'), path = require('path')
const RACINE = __dirname, PORT = Number(process.env.PORT) || 3000
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8' }

http.createServer((req, res) => {
  let chemin
  try { chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname) } catch (e) { res.writeHead(400); return res.end() }
  if (chemin.endsWith('/')) chemin += 'index.html'
  const fichier = path.join(RACINE, chemin)
  // jamais hors du dossier du site, jamais un fichier caché
  if (!fichier.startsWith(RACINE + path.sep) || chemin.split('/').some(p => p.startsWith('.'))) { res.writeHead(403); return res.end('Interdit') }
  fs.stat(fichier, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Page introuvable') }
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
