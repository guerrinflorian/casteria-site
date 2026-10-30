// CE QUI ATTEND DANS UNE MACHINE, CALCULÉ PAR LA PAGE (2c, 30/10/2026 ; le tableau de bord de l'île). Le jeu ne fait jamais
// tourner ses machines : il CALCULE ce qu'elles ont produit au moment de la récolte (generators.js, enAttente et minutesDispo).
// La page refait ce calcul, à l'instant, sur la photo que le jeu publie (« ile:j:<pseudo> ») : la même formule, ligne pour
// ligne (outils/banc_ile_calcul.js la compare à l'extrait de generators.js sur des milliers de cas tirés).
// Une machine de la photo : [t, c, cadence par minute (le nombre entier du jeu, jamais arrondi : un objet en 180 min, c'est
// 0,0055555…), f (la réserve de carburant, en secondes), sd, sf, sk (la
// fenêtre d'une épreuve : début et fin en ms, le facteur en millièmes)] ; son type : { carburant, lot, spl (les secondes d'un
// lot à la vitesse 0) }.
//   IleCalcul.enAttente(m, type, maintenant, plafondMin) : les objets entiers en attente
//   IleCalcul.pleinDans(m, type, maintenant, plafondMin) : les ms avant que la machine soit pleine (0 : pleine ; Infinity :
//     elle ne se remplira plus, faute de carburant)
;(function (racine) {
  'use strict'
  var PLAFOND_BASE = 30
  function lire(m) { return { t: m[0], c: m[1], cad: Number(m[2]) || 0, f: m[3] || 0, sd: m[4] || 0, sf: m[5] || 0, sk: m[6] || 0 } }
  function aCarburant(ty) { return !!(ty && (ty.carburant || ty.lot)) }
  function reserveDe(g, ty) { return aCarburant(ty) ? Math.max(0, Number(g.f) || 0) : Infinity }
  function plafondMinutes(g, plafond) {
    var p = plafond || PLAFOND_BASE
    return g.cad > 0 && 1 / g.cad > p ? 1 / g.cad : p
  }
  function ecouleEffectif(g, maintenant) {
    var e = maintenant - g.c
    if (!(g.sf > g.c)) return e
    var a = g.sd > g.c ? g.sd : g.c, b = g.sf < maintenant ? g.sf : maintenant
    return b > a ? e + (g.sk / 1000 - 1) * (b - a) : e
  }
  function minutesDispo(g, ty, maintenant, plafond) {
    var m = Math.min((g.sf > g.c ? ecouleEffectif(g, maintenant) : maintenant - g.c) / 60000, plafondMinutes(g, plafond))
    if (aCarburant(ty)) m = Math.min(m, ty.lot ? (reserveDe(g, ty) / ty.spl) / g.cad : reserveDe(g, ty) / 60)
    return m > 0 ? m : 0
  }
  function enAttenteG(g, ty, maintenant, plafond) {
    if (g.cad <= 0) return 0
    return Math.floor(minutesDispo(g, ty, maintenant, plafond) * g.cad + 1e-7)
  }
  function enAttente(m, ty, maintenant, plafond) { return enAttenteG(lire(m), ty, maintenant, plafond) }
  // le plafond en objets (ce que la machine garde au plus en attente)
  function plafondObjets(m, plafond) {
    var g = lire(m), p = plafond || PLAFOND_BASE
    if (g.cad > 0 && 1 / g.cad > p) return 1
    return Math.floor(p * g.cad)
  }
  // l'heure où elle sera pleine : cherchée par dichotomie sur le temps (le même calcul, jamais une autre formule)
  function pleinDans(m, ty, maintenant, plafond) {
    var g = lire(m), max = plafondObjets(m, plafond), n = enAttenteG(g, ty, maintenant, plafond)
    if (n >= max) return 0
    var loin = maintenant + 7 * 24 * 3600000
    if (enAttenteG(g, ty, loin, plafond) < max) return Infinity
    var a = maintenant, b = loin
    for (var k = 0; k < 40 && b - a > 500; k++) { var mi = (a + b) / 2; if (enAttenteG(g, ty, mi, plafond) >= max) b = mi; else a = mi }
    return Math.max(0, Math.round(b - maintenant))
  }
  // LE SURPLUS D'UNE GRANGE (enclos.js, regler) : les jetons que ses niveaux ont produits depuis son dernier compte, sans rien
  // lire dans le monde : (niveau - 1) fois la production de l'auge pleine, moitié moins passé l'heure où l'auge se vide, au plus
  // plafondH heures depuis la dernière vente. Un enclos de la photo : { n, pf, fin, ts, acc, h } (les champs de son index).
  //   IleCalcul.surplus(e, maintenant, plafondH) : les jetons du surplus à cet instant (avec des centimes, comme le jeu)
  function surplus(e, maintenant, plafondH) {
    var acc = Number(e.acc) || 0, ts = Number(e.ts) || 0, h = Number(e.h) || 0, fin = Number(e.fin) || 0, pf = Number(e.pf) || 0
    if (ts <= 0 || maintenant <= ts) return acc
    var taux = ((Number(e.n) || 1) - 1) * pf
    if (taux <= 0) return acc
    var dur = Math.min((maintenant - ts) / 3600000, Math.max(0, plafondH - h))
    if (dur <= 0) return acc
    var pleines = fin > 0 ? Math.max(0, Math.min(dur, (fin - ts) / 3600000)) : dur
    return acc + taux * (pleines + 0.5 * (dur - pleines))
  }
  var api = { enAttente: enAttente, plafondObjets: plafondObjets, pleinDans: pleinDans, surplus: surplus, PLAFOND_BASE: PLAFOND_BASE }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else racine.IleCalcul = api
})(this)
