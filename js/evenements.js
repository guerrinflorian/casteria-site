/* LA PAGE DES ÉVÉNEMENTS QUI VIT (b5, le 29/10/2026 ; le propriétaire : « ça doit vraiment être interactif et donner envie »).
   Le prochain rendez-vous en grand et son compte à rebours (aux heures de Paris, quelle que soit l'heure du visiteur), les
   trois suivants, et la semaine en frise (aujourd'hui et le prochain allumés). CHAQUE HEURE EST LUE DANS LE JEU :
   ev_eclair.js (CI_ECLAIR_HORAIRE), ai_evt_sol.js (18 h 30), ai_evt_neige.js (21 h), ah_evenements.js (EVENEMENTS : l'heure
   dorée de 19 h 30, 30 min ; la chasse au trésor le mercredi à 15 h et le samedi à 16 h), loterie.js (HEURES_TIRAGE),
   ai_mer_table.js (rendezVous.capitaine_large : 19 h, une heure). Une heure change dans le jeu : elle change ici ET dans
   la frise de evenements.html. Sans JavaScript, la page garde son texte (le Défi Éclair, la frise sans lumière). */
(function () {
  'use strict';
  var TOUS = [0, 1, 2, 3, 4, 5, 6], SEMAINE = [1, 2, 3, 4, 5], WEEKEND = [6, 0];
  // duree : les minutes pendant lesquelles il est « en ce moment » (0 : un départ) ; participer : /participer 5 min avant
  var EVTS = [
    { id: 'eclair', nom: 'Le Défi Éclair', ancre: '#defi', creneaux: [{ jours: SEMAINE, min: 20 * 60 + 15 }, { jours: WEEKEND, min: 11 * 60 }, { jours: WEEKEND, min: 14 * 60 + 30 }, { jours: WEEKEND, min: 20 * 60 + 15 }],
      duree: 0, participer: true, phrase: 'Cinq jeux rapides tirés parmi quatorze, environ six minutes. Personne n\'est éliminé.',
      gain: 'La Clé Royale au 1er', plus: 'la Clé de l\'Aventurier au 2e et la Clé de Vote au 3e dès 5 joueurs ; des jetons dès ta première réponse' },
    { id: 'sol', nom: 'Le Sol qui lâche', ancre: '#mini-jeux', creneaux: [{ jours: TOUS, min: 18 * 60 + 30 }],
      duree: 0, participer: true, phrase: 'Chaque bloc où tu restes disparaît : le dernier debout gagne.',
      gain: 'Des clés dès 4 joueurs', plus: 'la Clé Royale au 1er dès 5 joueurs, des jetons et de l\'XP pour tous' },
    { id: 'flotte', nom: 'La flotte de Morvan', ancre: '#programme', creneaux: [{ jours: TOUS, min: 19 * 60 }],
      duree: 60, participer: false, phrase: 'Morvan le Borgne et ses deux Sloops noirs croisent au Large, une heure.',
      gain: 'La Clé du Corsaire', plus: 'garantie sur Morvan, avec la toile renforcée et les plaques de fer de son butin' },
    { id: 'doree', nom: 'L\'heure dorée', ancre: '#programme', creneaux: [{ jours: TOUS, min: 19 * 60 + 30 }],
      duree: 30, participer: false, phrase: 'Un ciel doré sur le palais et le colporteur de passage, jusqu\'à 20 h.',
      gain: 'Tes ventes à +10 %', plus: 'pour tout le monde, et le tirage de 20 h finit en feu d\'artifice' },
    { id: 'neige', nom: 'La Bataille de neige', ancre: '#mini-jeux', creneaux: [{ jours: TOUS, min: 21 * 60 }],
      duree: 0, participer: true, phrase: 'Deux équipes, une boule toutes les 3 secondes, 5 minutes.',
      gain: 'Des clés pour l\'équipe gagnante', plus: 'dès 4 joueurs, et la Clé Royale au meilleur tireur dès 10' },
    { id: 'chasse', nom: 'La chasse au trésor', ancre: '#programme', creneaux: [{ jours: [3], min: 15 * 60 }, { jours: [6], min: 16 * 60 }],
      duree: 0, participer: false, phrase: 'Cinq coffres d\'or au palais, un toutes les 2 minutes : le premier qui clique gagne.',
      gain: 'Des jetons ou une clé', plus: 'et l\'un des cinq est le gros lot : des jetons doublés et une clé' },
    { id: 'loterie', nom: 'Le tirage de la loterie', ancre: '#programme', creneaux: [{ jours: TOUS, min: 0 }, { jours: TOUS, min: 4 * 60 }, { jours: TOUS, min: 8 * 60 }, { jours: TOUS, min: 12 * 60 }, { jours: TOUS, min: 16 * 60 }, { jours: TOUS, min: 20 * 60 }],
      duree: 0, participer: false, petit: true, phrase: 'Le billet coûte 100 jetons : /loterie.', gain: '85 % du pot', plus: 'au gagnant, même s\'il n\'est plus là' }
  ];
  var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

  // l'heure de Paris (jour de la semaine, minute du jour, seconde), quelle que soit celle du visiteur
  var FORMAT = null;
  try { FORMAT = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }); } catch (e) { FORMAT = null; }
  var NOMS_EN = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  function paris(d) {
    if (!FORMAT) return { jour: d.getDay(), min: d.getHours() * 60 + d.getMinutes(), sec: d.getSeconds() };
    var o = {};
    FORMAT.formatToParts(d).forEach(function (p) { o[p.type] = p.value; });
    return { jour: NOMS_EN[o.weekday], min: (Number(o.hour) % 24) * 60 + Number(o.minute), sec: Number(o.second) };
  }
  function heure(min) {
    var h = Math.floor(min / 60), m = min % 60;
    return h + ' h' + (m ? ' ' + (m < 10 ? '0' : '') + m : '');
  }
  // les prochains rendez-vous : { e, jour, min, dans (secondes ; négatif : en ce moment) }, du plus proche au plus loin
  function prochains(maintenant) {
    var p = paris(maintenant), t = p.min * 60 + p.sec, l = [];
    for (var d = 0; d <= 7; d++) {
      var jour = (p.jour + d) % 7;
      EVTS.forEach(function (e) {
        e.creneaux.forEach(function (c) {
          if (c.jours.indexOf(jour) < 0) return;
          var dans = d * 86400 + c.min * 60 - t;
          if (dans > -e.duree * 60) l.push({ e: e, jour: jour, min: c.min, dans: dans, d: d });
        });
      });
    }
    l.sort(function (a, b) { return a.dans - b.dans; });
    return l;
  }
  function quand(x) {
    if (x.d === 0) return 'aujourd\'hui à ' + heure(x.min);
    if (x.d === 1) return 'demain à ' + heure(x.min);
    return JOURS[x.jour] + ' à ' + heure(x.min);
  }
  function deux(n) { return (n < 10 ? '0' : '') + n; }
  // un chiffre change : il bascule (l'animation rejouée en retirant puis remettant la classe)
  function poser(el, v) {
    if (!el || el.textContent === v) return;
    el.textContent = v;
    el.classList.remove('bascule');
    void el.offsetWidth;
    el.classList.add('bascule');
  }
  // « maintenant » dans la colonne d'aujourd'hui : les rendez-vous passés s'éteignent, le trait de l'heure avance entre eux
  var minuteVue = -1;
  function maintenant(frise) {
    var p = paris(new Date());
    if (p.min === minuteVue) return;
    minuteVue = p.min;
    var vieux = frise.querySelector('.maintenant');
    if (vieux) vieux.parentNode.removeChild(vieux);
    frise.querySelectorAll('.puce.passe').forEach(function (n) { n.classList.remove('passe'); });
    var jour = frise.querySelector('[data-jour="' + p.jour + '"] > ol');
    if (!jour) return;
    var avant = null;
    jour.querySelectorAll('.puce').forEach(function (n) {
      var m = Number(n.getAttribute('data-min')), e = null;
      for (var i = 0; i < EVTS.length; i++) if (EVTS[i].id === n.getAttribute('data-evt')) e = EVTS[i];
      if (m + (e ? e.duree : 0) <= p.min) n.classList.add('passe');
      else if (!avant && m > p.min) avant = n;
    });
    var trait = document.createElement('li');
    trait.className = 'maintenant';
    trait.setAttribute('aria-hidden', 'true');
    trait.innerHTML = '<span>maintenant, ' + heure(p.min) + '</span>';
    jour.insertBefore(trait, avant);
  }

  var carte = document.querySelector('[data-prochain]');
  var suite = document.querySelector('[data-ensuite]');
  var frise = document.querySelector('[data-semaine]');
  if (!carte) return;
  var champs = {};
  ['nom', 'quand', 'phrase', 'gain', 'plus', 'etat', 'j', 'h', 'm', 's', 'lien'].forEach(function (k) { champs[k] = carte.querySelector('[data-c="' + k + '"]'); });
  var dernier = '';

  function dessiner() {
    var l = prochains(new Date());
    // le grand : le prochain qui n'est pas un simple tirage de la loterie
    var g = null, i;
    for (i = 0; i < l.length; i++) if (!l[i].e.petit) { g = l[i]; break; }
    if (!g) return;
    var cle = g.e.id + g.jour + '_' + g.min;
    if (cle !== dernier) {
      dernier = cle;
      carte.setAttribute('data-evt', g.e.id);
      champs.nom.textContent = g.e.nom;
      champs.quand.textContent = quand(g);
      champs.phrase.textContent = g.e.phrase;
      champs.gain.textContent = g.e.gain;
      champs.plus.textContent = g.e.plus;
      champs.lien.setAttribute('href', g.e.ancre);
      if (suite) {
        // les trois suivants, chacun une fois (la nuit, trois tirages de la loterie d'affilee ne disaient rien)
        var html = [], n = 0, deja = {};
        deja[g.e.id] = true;
        for (i = 0; i < l.length && n < 3; i++) {
          var x = l[i];
          if (x === g || x.dans <= 0 || deja[x.e.id]) continue;
          deja[x.e.id] = true;
          html.push('<li data-evt="' + x.e.id + '"><time>' + quand(x) + '</time><b>' + x.e.nom + '</b><span>' + x.e.gain + '</span></li>');
          n++;
        }
        suite.innerHTML = html.join('');
      }
      if (frise) {
        var p = paris(new Date());
        frise.querySelectorAll('.aujourdhui, .le-prochain').forEach(function (n2) { n2.classList.remove('aujourdhui', 'le-prochain'); });
        var jourIci = frise.querySelector('[data-jour="' + p.jour + '"]');
        if (jourIci) {
          jourIci.classList.add('aujourdhui');
          // au téléphone (les jours glissent) : aujourd'hui en tête de la rangée, sans bouger la page
          if (frise.scrollWidth > frise.clientWidth + 4) frise.scrollLeft = jourIci.offsetLeft - frise.offsetLeft;
        }
        var puce = frise.querySelector('[data-jour="' + g.jour + '"] [data-evt="' + g.e.id + '"][data-min="' + g.min + '"]');
        if (puce) puce.classList.add('le-prochain');
      }
    }
    // le compte à rebours, chaque seconde : un chiffre qui change bascule (css : .bascule)
    var s = Math.max(0, g.dans);
    poser(champs.j, String(Math.floor(s / 86400)));
    poser(champs.h, deux(Math.floor(s % 86400 / 3600)));
    poser(champs.m, deux(Math.floor(s % 3600 / 60)));
    poser(champs.s, deux(s % 60));
    if (frise) maintenant(frise);
    carte.classList.toggle('sans-jours', s < 86400);
    var etat = '';
    if (g.dans <= 0) etat = 'En ce moment, jusqu\'à ' + heure(g.min + g.e.duree);
    else if (g.e.participer && g.dans <= 300) etat = 'Inscriptions ouvertes : tape /participer en jeu';
    else if (g.e.participer) etat = '/participer s\'ouvre 5 minutes avant';
    champs.etat.textContent = etat;
    carte.classList.toggle('en-cours', g.dans <= 0);
    carte.classList.toggle('inscriptions', g.e.participer && g.dans > 0 && g.dans <= 300);
  }
  dessiner();
  carte.classList.add('vivant');
  setInterval(dessiner, 1000);
})();
