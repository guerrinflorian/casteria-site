// La boutique : branche ce que dit js/boutique.config.js. Rien n'est rempli : la page ne change pas.
(function () {
  var c = window.CASTERIA_BOUTIQUE || {}
  var bloc = document.getElementById('tebex'), actions = document.getElementById('tebex-actions'), place = document.getElementById('tebex-cadre')
  if (!bloc || !actions || !place) return
  // seulement une adresse https complète : rien d'autre n'entre dans la page
  function sure(u) { return typeof u === 'string' && /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)+(\/[^\s"'<>]*)?$/i.test(u) ? u : '' }
  var adresse = sure(c.adresse), cadre = sure(c.cadre)
  if (!adresse && !cadre) return
  bloc.classList.add('ouverte')
  var a = document.createElement('a')
  a.className = 'bouton bouton-or grand'
  a.href = adresse || cadre
  a.target = '_blank'
  a.rel = 'noopener'
  a.textContent = 'Ouvrir la boutique'
  actions.insertBefore(a, actions.firstChild)
  if (cadre) {
    var f = document.createElement('iframe')
    f.src = cadre
    f.title = 'La boutique de Casteria'
    f.loading = 'lazy'
    f.setAttribute('allow', 'payment')
    f.style.height = Math.max(400, Math.min(3000, Number(c.hauteurCadre) || 900)) + 'px'
    place.appendChild(f)
    place.hidden = false
  }
})()
