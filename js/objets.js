// « Tout est fait pour Casteria » sur telephone (le proprietaire, 07/10 : « sur mobile il faut faire deplier, ca prend trop
// de place ») : chaque famille est un <details>. Sur un telephone (620 px et moins), toutes se replient en un bandeau qu'on touche pour l'ouvrir ; sur un ecran plus large, toutes restent ouvertes et ne se
// replient pas (rien ne change sur PC).
(function () {
  'use strict';
  var familles = Array.prototype.slice.call(document.querySelectorAll('.objets details.famille'));
  if (!familles.length || !window.matchMedia) return;
  var telephone = window.matchMedia('(max-width: 620px)');
  function regler() {
    familles.forEach(function (f, i) {
      if (telephone.matches) f.open = false;
      else f.open = true;
    });
  }
  familles.forEach(function (f) {
    var s = f.querySelector('summary');
    if (s) s.addEventListener('click', function (e) { if (!telephone.matches) e.preventDefault(); });
  });
  regler();
  if (telephone.addEventListener) telephone.addEventListener('change', regler);
  else if (telephone.addListener) telephone.addListener(regler);
})();
