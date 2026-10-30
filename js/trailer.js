// LE TRAILER DE L'ACCUEIL (37, le 30/10/2026 ; le propriétaire : « pour hyper les gens »). Rien ne se charge avant le clic
// (la vidéo porte preload="none" et son affiche) ; au clic sur le bouton rond : la source choisie (le WebM si le navigateur
// le lit, sinon le MP4 ; en 720p sur un petit écran ou une connexion économe), la lecture, SON COUPÉ ; le bouton son le met
// ou le coupe ; les commandes du navigateur (avancer, plein écran) apparaissent une fois lancé. Une vidéo qui ne se charge
// pas : l'affiche reste, une phrase le dit, le bouton rond revient.
;(function () {
  'use strict'
  var v = document.getElementById('trailer-video'), lecture = document.getElementById('trailer-lecture')
  var son = document.getElementById('trailer-son'), panne = document.getElementById('trailer-panne'), cadre = document.getElementById('trailer-cadre')
  if (!v || !lecture || !son || !cadre) return

  function source() {
    var c = navigator.connection || {}
    // la 720p quand le lecteur est petit (un telephone : moins de 700 px de large, quelle que soit la densite de l'ecran),
    // ou que la connexion est econome ou lente
    var petit = cadre.clientWidth < 700 || c.saveData === true || /(^|-)2g$|^3g$/.test(String(c.effectiveType || ''))
    if (petit && v.dataset.srcPetit) return v.dataset.srcPetit
    if (v.dataset.srcWebm && v.canPlayType('video/webm; codecs="vp9, opus"')) return v.dataset.srcWebm
    return v.dataset.src
  }
  function dire() {
    var muet = v.muted
    son.setAttribute('aria-pressed', muet ? 'false' : 'true')
    son.classList.toggle('muet', muet)
    son.querySelector('span').textContent = muet ? 'Activer le son' : 'Couper le son'
  }
  function lancer() {
    if (panne) panne.hidden = true
    if (!v.getAttribute('src')) { v.src = source(); v.load() }
    v.muted = true
    var p = v.play()
    if (p && p.catch) p.catch(function () { /* le navigateur refuse : le bouton reste */ })
  }
  lecture.addEventListener('click', lancer)
  v.addEventListener('play', function () {
    cadre.classList.add('joue')
    lecture.hidden = true
    son.hidden = false
    v.controls = true
    dire()
  })
  v.addEventListener('pause', function () { if (!v.ended) return; cadre.classList.remove('joue'); lecture.hidden = false })
  v.addEventListener('ended', function () { cadre.classList.remove('joue'); lecture.hidden = false; v.controls = false })
  v.addEventListener('volumechange', dire)
  v.addEventListener('error', function () {
    cadre.classList.remove('joue')
    lecture.hidden = false
    son.hidden = true
    v.controls = false
    v.removeAttribute('src')
    if (panne) panne.hidden = false
  })
  son.addEventListener('click', function () {
    v.muted = !v.muted
    if (!v.muted && v.volume === 0) v.volume = 1
    dire()
  })
})()
