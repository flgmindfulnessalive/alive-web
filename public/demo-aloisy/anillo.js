// Origen: demo Dra. Aloisy Silva (ALIVE). Dibuja el anillo de 28 días.
// Menú del celular: abre y cierra el panel; se cierra al elegir una opción o con Escape.
(function () {
  var b = document.querySelector('.menu-btn'), m = document.getElementById('menu-movil');
  if (!b || !m) return;
  function poner(abrir) { b.setAttribute('aria-expanded', abrir); b.setAttribute('aria-label', abrir ? 'Cerrar menú' : 'Abrir menú'); m.hidden = !abrir; }
  b.addEventListener('click', function () { poner(m.hidden); });
  m.addEventListener('click', function (e) { if (e.target.closest('a')) poner(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') poner(false); });
})();
// Dibuja el anillo de 28 días: marcas por día, la fase actual resaltada y un punto que recorre el ciclo.
document.querySelectorAll('[data-anillo]').forEach(function (svg) {
  var oscuro = svg.hasAttribute('data-oscuro');
  var ns = 'http://www.w3.org/2000/svg', c = 200, html = '';
  var base = oscuro ? '#5A4C62' : '#1A1420', fuerte = oscuro ? '#FF7FA8' : '#C42D63';
  for (var i = 0; i < 28; i++) {
    var a = (i / 28) * Math.PI * 2 - Math.PI / 2, largo = i % 7 === 0 ? 26 : 16;
    var r1 = 168, r2 = r1 - largo, x1 = c + r1 * Math.cos(a), y1 = c + r1 * Math.sin(a), x2 = c + r2 * Math.cos(a), y2 = c + r2 * Math.sin(a);
    var activo = i >= 12 && i <= 15;
    html += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="' + (activo ? fuerte : base) + '" stroke-width="' + (activo ? 5 : 3) + '" stroke-linecap="round" opacity="' + (activo ? 1 : 0.55) + '"/>';
  }
  html += '<circle cx="200" cy="200" r="112" fill="none" stroke="' + base + '" stroke-opacity=".18" stroke-width="1.5"/>';
  html += '<g class="orbita"><circle cx="200" cy="18" r="11" fill="' + fuerte + '"/></g>';
  if (!svg.hasAttribute('data-sin-texto')) html += '<text x="200" y="196" text-anchor="middle" font-family="Sora, sans-serif" font-weight="700" font-size="74" letter-spacing="-3" fill="' + (oscuro ? '#FFFFFF' : '#1A1420') + '">28</text>';
  if (!svg.hasAttribute('data-sin-texto')) html += '<text x="200" y="230" text-anchor="middle" font-family="Instrument Sans, sans-serif" font-weight="600" font-size="15" letter-spacing="2.5" fill="' + (oscuro ? '#CFC5D2' : '#4F4655') + '">DÍAS · UN CICLO</text>';
  svg.innerHTML = html;
});
