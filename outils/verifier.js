// Les règles du site, vérifiées en une seconde : npm run verifier (code 0 : tout est bon)
'use strict'
const fs = require('fs'), path = require('path')
const RACINE = path.join(__dirname, '..'), PAGES = ['index.html', 'commencer.html', 'boutique.html', '404.html']
const LIENS_FIGES = 'https://github.com/guerrinflorian/casteria-mc/releases/'
// le domaine du site : celui que outils/domaine.js a écrit dans robots.txt ; et le plan du site
const lire = f => { try { return fs.readFileSync(path.join(RACINE, f), 'utf8') } catch (e) { return '' } }
const DOMAINE = (lire('robots.txt').match(/^Sitemap: (https:\/\/[^/\s]+)\/sitemap\.xml$/m) || [])[1] || '', PLAN = lire('sitemap.xml')
let fautes = 0
const faute = (m) => { fautes++; console.log('  FAUTE : ' + m) }
const TIRETS = [String.fromCharCode(0x2014), String.fromCharCode(0x2013)]

for (const page of PAGES) {
  const s = fs.readFileSync(path.join(RACINE, page), 'utf8')
  console.log(page)
  const h1 = (s.match(/<h1[\s>]/g) || []).length
  if (h1 !== 1) faute('il faut un seul h1, il y en a ' + h1)
  if (!/<title>[^<]{20,70}<\/title>/.test(s.replace(/<title>([^<]*)<\/title>/, (m, t) => '<title>' + t.slice(0, 70) + '</title>'))) faute('le titre manque')
  const titre = (s.match(/<title>([^<]*)<\/title>/) || [])[1] || ''
  if (titre.length > 90) faute('le titre fait ' + titre.length + ' caractères (90 au plus)')
  const desc = (s.match(/<meta name="description" content="([^"]*)"/) || [])[1] || ''
  if (desc.length < 80 || desc.length > 260) faute('la description fait ' + desc.length + ' caractères (entre 80 et 260)')
  if (!/<html lang="fr">/.test(s)) faute('la langue de la page manque')
  for (const img of s.match(/<img\b[^>]*>/g) || []) if (!/\balt="/.test(img)) faute('une image sans texte : ' + img.slice(0, 80))
  for (const t of TIRETS) if (s.includes(t)) faute('un tiret long ou moyen')
  // les niveaux de titres : jamais un h3 avant le premier h2
  const titres = (s.match(/<h[1-6][\s>]/g) || []).map(x => +x[2])
  titres.forEach((n, i) => { if (i && n > titres[i - 1] + 1) faute('un titre saute un niveau (h' + titres[i - 1] + ' puis h' + n + ')') })
  // les fichiers du site cités par la page existent
  const cites = new Set()
  for (const m of s.matchAll(/(?:src|href|poster|data-src)="([^"#?]+)[^"]*"/g)) cites.add(m[1])
  for (const c of cites) {
    if (DOMAINE && c.startsWith(DOMAINE + '/')) { if (!fs.existsSync(path.join(RACINE, c.slice(DOMAINE.length)))) faute('une adresse du site qui n\'existe pas : ' + c); continue }
    if (/^https?:/.test(c)) { if (!c.startsWith(LIENS_FIGES)) faute('un lien vers ailleurs que la release du launcher : ' + c); continue }
    if (/^(mailto:|data:)/.test(c)) continue
    if (!fs.existsSync(path.join(RACINE, c))) faute('un fichier cité n\'existe pas : ' + c)
  }
  // aucun mot qui dise que le serveur n'est pas ouvert (le propriétaire, 05/10 : le site parle d'un serveur où l'on joue)
  const visible = s.replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/g, '')
  // (le mot entier : « tu le découvriras » n'est pas « ouvrira »)
  for (const mot of ['en développement', 'bientôt', 'pas encore ouvert', 'ouvrira', "jour de l'ouverture"]) if (new RegExp('(^|[^a-zà-ÿ])' + mot, 'i').test(visible)) faute('un mot interdit : « ' + mot + ' »')
  // LE CONTRASTE : on suit le fond en descendant dans la page. Une section sombre (sombre, mer, heros, page-tete, le pied)
  // demande un texte clair ; le parchemin (clair, et les îlots carte, volet, cadre-bois, tebex) un texte sombre. Une couleur
  // écrite dans la page doit aller avec le fond où elle tombe.
  {
    const SOMBRES = ['sombre', 'mer', 'heros', 'page-tete', 'chiffres', 'barre'], CLAIRS = ['clair', 'carte', 'volet', 'cadre-bois', 'tebex']
    const ENCRES = ['--encre', '--bois-fonce', '--encre-douce', '--bois)'], LUMIERES = ['#fff', '--or-clair', '--parchemin', '--violet-clair']
    const VIDES = new Set(['img', 'br', 'meta', 'link', 'input', 'source', 'hr', 'path', 'rect', 'circle'])
    const pile = [{ nom: 'html', fond: 'sombre' }]
    for (const m of visible.matchAll(/<(\/?)([a-zA-Z0-9]+)([^>]*)>/g)) {
      const nom = m[2].toLowerCase(), attrs = m[3]
      if (m[1]) { for (let i = pile.length - 1; i > 0; i--) if (pile[i].nom === nom) { pile.length = i; break } continue }
      let fond = pile[pile.length - 1].fond
      const classes = ((attrs.match(/class="([^"]*)"/) || [])[1] || '').split(/\s+/)
      if (nom === 'footer' || classes.some(c => SOMBRES.includes(c))) fond = 'sombre'
      if (classes.some(c => CLAIRS.includes(c))) fond = 'clair'
      const style = (attrs.match(/style="([^"]*)"/) || [])[1] || '', couleur = (style.match(/(?:^|;)\s*color:\s*([^;]+)/) || [])[1] || ''
      if (couleur && fond === 'sombre' && ENCRES.some(e => couleur.includes(e))) faute('un texte sombre sur un fond sombre : <' + nom + ' ' + attrs.trim().slice(0, 60) + '>')
      if (couleur && fond === 'clair' && LUMIERES.some(e => couleur.includes(e))) faute('un texte clair sur le parchemin : <' + nom + ' ' + attrs.trim().slice(0, 60) + '>')
      if (!VIDES.has(nom) && !/\/\s*$/.test(attrs)) pile.push({ nom, fond })
    }
  }
  // une vidéo ne se charge jamais d'office
  for (const v of s.match(/<video\b[^>]*>/g) || []) if (!/preload="none"/.test(v) || /\ssrc="/.test(v)) faute('une vidéo se chargerait sans attendre : ' + v.slice(0, 70))
  // LE RÉFÉRENCEMENT : chaque page dit son adresse complète (la même que dans sitemap.xml) et son image de partage.
  // La page 404, elle, demande à rester hors de Google, et cite ses fichiers depuis la racine (elle s'affiche à toute adresse).
  if (page === '404.html') {
    if (!/<meta name="robots" content="noindex">/.test(s)) faute('la page 404 doit porter noindex')
    if (/(?:src|href)="(?![/#]|https?:)/.test(s)) faute('la page 404 cite un fichier sans partir de la racine (« / »)')
  } else if (DOMAINE) {
    const adresse = DOMAINE + '/' + (page === 'index.html' ? '' : page)
    if (!s.includes('<link rel="canonical" href="' + adresse + '">')) faute('l\'adresse de la page (canonical) devrait être ' + adresse)
    if (!s.includes('<meta property="og:url" content="' + adresse + '">')) faute('og:url devrait être ' + adresse)
    const image = (s.match(/<meta property="og:image" content="([^"]*)"/) || [])[1] || ''
    if (!image.startsWith(DOMAINE + '/') || !fs.existsSync(path.join(RACINE, image.slice(DOMAINE.length)))) faute('l\'image de partage (og:image) doit être une adresse complète du site, vers un fichier qui existe')
    if (!/<meta name="twitter:card" content="summary_large_image">/.test(s)) faute('la carte de partage (twitter:card) manque')
    if (/<meta name="robots" content="[^"]*noindex/.test(s)) faute('la page demande à rester hors de Google (noindex)')
    if (!PLAN.includes('<loc>' + adresse + '</loc>')) faute('sitemap.xml ne cite pas ' + adresse)
  }
  for (const m of s.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]) } catch (e) { faute('un bloc JSON-LD est mal écrit : ' + e.message) }
    for (const a of m[1].match(/https:\/\/[^"/]+/g) || []) if (a !== DOMAINE && a !== 'https://schema.org') faute('une adresse d\'un autre domaine dans le bloc JSON-LD : ' + a)
  }
}
// le domaine est écrit, et le plan du site cite les pages, rien de plus
console.log('robots.txt, sitemap.xml')
if (!DOMAINE) faute('le domaine manque : node outils/domaine.js https://ton-domaine.fr')
else if ((PLAN.match(/<loc>/g) || []).length !== PAGES.length - 1) faute('sitemap.xml doit citer ' + (PAGES.length - 1) + ' pages (relance outils/domaine.js)')
// les îlots de parchemin portent leur propre fond et leur encre (sinon, posés dans une section sombre, ils ne se lisent pas)
{
  const css = fs.readFileSync(path.join(RACINE, 'css', 'style.css'), 'utf8')
  const bloc = sel => { const i = css.indexOf('\n' + sel + ' {'); return i < 0 ? '' : css.slice(i, css.indexOf('}', i)) }
  console.log('css/style.css')
  for (const sel of ['.carte', '.volet']) { const b = bloc(sel); if (!/background:/.test(b) || !/color:/.test(b)) faute(sel + ' doit porter son fond de parchemin et sa couleur d\'encre') }
  if (!/\.cadre-bois > \* \{[^}]*background:/.test(css)) faute('.cadre-bois > * doit porter son fond de parchemin')
  for (const sel of ['.sombre', '.mer']) if (!/color:\s*#[EeFf]/.test(bloc(sel))) faute(sel + ' doit donner une couleur de texte claire')
}
for (const f of ['css/style.css', 'js/site.js', 'README.md', 'serveur.js']) {
  const s = fs.readFileSync(path.join(RACINE, f), 'utf8')
  for (const t of TIRETS) if (s.includes(t)) { console.log(f); faute('un tiret long ou moyen') }
}
// le poids : rien de lourd ne part dans le dépôt
let total = 0
;(function peser(d) {
  for (const n of fs.readdirSync(d)) {
    const p = path.join(d, n), st = fs.statSync(p)
    if (st.isDirectory()) { if (!['.git', 'node_modules', 'captures'].includes(n)) peser(p); continue }
    total += st.size
    if (st.size > 5 * 1024 * 1024) faute('un fichier de plus de 5 Mo : ' + path.relative(RACINE, p))
  }
})(RACINE)
console.log('le site pèse ' + (total / 1048576).toFixed(1) + ' Mo')
console.log(fautes ? fautes + ' faute(s)' : 'tout est bon')
process.exit(fautes ? 1 : 0)
