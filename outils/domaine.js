// Le jour où le nom de domaine est choisi : node outils/domaine.js https://ton-domaine.fr
// Écrit sitemap.xml, la ligne « Sitemap: » de robots.txt, et dans chaque page l'adresse complète de la page (canonical,
// og:url), de l'image de partage (og:image) et des données pour Google (le bloc JSON-LD). Se relance sans risque avec un
// autre domaine.
'use strict'
const fs = require('fs'), path = require('path')
const RACINE = path.join(__dirname, '..')
const domaine = (process.argv[2] || '').replace(/\/+$/, '')
if (!/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}$/i.test(domaine)) { console.log('Usage : node outils/domaine.js https://ton-domaine.fr'); process.exit(1) }
const PAGES = [['index.html', '', '1.0'], ['commencer.html', 'commencer.html', '0.8'], ['boutique.html', 'boutique.html', '0.6']]
// l'image de partage : 1200 x 630, le format des réseaux (l'image d'origine, plus large, y perdait ses bords)
const IMAGE = 'assets/images/casteria-serveur-minecraft-partage.jpg'
const jour = new Date().toISOString().slice(0, 10)
fs.writeFileSync(path.join(RACINE, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  PAGES.map(p => '  <url><loc>' + domaine + '/' + p[1] + '</loc><lastmod>' + jour + '</lastmod><priority>' + p[2] + '</priority></url>').join('\n') + '\n</urlset>\n')
fs.writeFileSync(path.join(RACINE, 'robots.txt'), 'User-agent: *\nAllow: /\n\nSitemap: ' + domaine + '/sitemap.xml\n')
for (const p of PAGES) {
  const f = path.join(RACINE, p[0])
  let s = fs.readFileSync(f, 'utf8')
  // le domaine d'avant, s'il y en avait un : ses autres adresses complètes (le bloc JSON-LD) suivent le nouveau
  const ancien = (s.match(/<link rel="canonical" href="(https:\/\/[^/"]+)/) || [])[1]
  if (ancien && ancien !== domaine) s = s.split(ancien + '/').join(domaine + '/')
  s = s.replace(/\n<link rel="canonical"[^>]*>/g, '').replace(/\n<meta property="og:url"[^>]*>/g, '')
  s = s.replace(/<meta property="og:image" content="[^"]*">/, '<meta property="og:url" content="' + domaine + '/' + p[1] + '">\n<link rel="canonical" href="' + domaine + '/' + p[1] + '">\n<meta property="og:image" content="' + domaine + '/' + IMAGE + '">')
  fs.writeFileSync(f, s)
}
console.log('Le domaine ' + domaine + ' est écrit dans sitemap.xml, robots.txt et les trois pages.')
