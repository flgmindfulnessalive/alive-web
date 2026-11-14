/* Logo: la M se dibuja, se llena como agua que sube y el texto emerge. En escritorio, el logo se inclina con el mouse y un brillo lo sigue. */
(function () {
  var root = document.documentElement, $ = function (id) { return document.getElementById(id); };
  var stroke = $('lm-stroke'), wave = $('lm-wave'), r1 = $('lm-r1'), r2 = $('lm-r2'), glow = $('lm-glow'), sheen = $('lm-sheen'), logo = document.querySelector('.logo');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function waveD(level, phase, amp) {
    var d = 'M-600 2300 L-600 ' + level, x;
    for (x = -600; x <= 3100; x += 60) d += ' L' + x + ' ' + (level + Math.sin(x / 260 + phase) * amp + Math.sin(x / 110 - phase * 1.7) * amp * 0.35).toFixed(1);
    return d + ' L3100 2300 Z';
  }
  function finish() {
    stroke.setAttribute('stroke-dashoffset', '0'); stroke.style.opacity = '0';
    wave.setAttribute('d', waveD(-300, 0, 0));
    r1.setAttribute('y', '1500'); r1.setAttribute('height', '370');
    r2.setAttribute('y', '1910'); r2.setAttribute('height', '175');
    root.classList.add('ready');
  }
  if (reduce) { finish(); return; }
  var ease = function (t) { return t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 3); };
  var inOut = function (t) { t = Math.max(0, Math.min(1, t)); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var t0 = null, done = false, readyAt = 2.1;
  function frame(now) {
    if (t0 === null) t0 = now;
    var t = (now - t0) / 1000;
    // 1 · trazo de la M (0 – 1.3 s)
    stroke.setAttribute('stroke-dashoffset', (1 - inOut(t / 1.3)).toFixed(4));
    stroke.style.opacity = String(1 - ease((t - 1.6) / .5));
    // 2 · el agua sube y llena la M (0.5 – 2.0 s)
    var k = inOut((t - .5) / 1.5), level = 1480 - k * 1800, amp = 46 * (1 - ease((t - 1.6) / .6));
    wave.setAttribute('d', waveD(level, t * 3.2, amp));
    // 3 · MASSIVE CO y SURF SHOP emergen (1.3 – 2.2 s)
    var a = ease((t - 1.3) / .7), b = ease((t - 1.6) / .6);
    r1.setAttribute('y', (1870 - 370 * a).toFixed(1)); r1.setAttribute('height', (370 * a).toFixed(1));
    r2.setAttribute('y', (2085 - 175 * b).toFixed(1)); r2.setAttribute('height', (175 * b).toFixed(1));
    if (t > readyAt && !root.classList.contains('ready')) root.classList.add('ready');
    if (t < 2.4) requestAnimationFrame(frame); else { finish(); done = true; }
  }
  requestAnimationFrame(frame);

  // Interacción (solo con mouse): inclinación 3D suave y brillo que sigue el cursor.
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  var tx = 0, ty = 0, cx = 0, cy = 0, gx = 1240, gy = 500, go = 0, tgo = 0, running = false;
  window.addEventListener('pointermove', function (e) {
    var r = logo.getBoundingClientRect(), mx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth, my = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
    tx = Math.max(-1, Math.min(1, mx * 2)); ty = Math.max(-1, Math.min(1, my * 2));
    gx = 8 + (e.clientX - r.left) / r.width * 2483; gy = 7 + (e.clientY - r.top) / r.height * 2052;
    tgo = done ? 1 : 0; if (!running) { running = true; requestAnimationFrame(loop); }
  });
  document.addEventListener('pointerleave', function () { tx = ty = 0; tgo = 0; });
  function loop() {
    cx += (tx - cx) * .08; cy += (ty - cy) * .08; go += (tgo - go) * .08;
    logo.style.transform = 'rotateY(' + (cx * 9).toFixed(2) + 'deg) rotateX(' + (-cy * 7).toFixed(2) + 'deg) translateZ(0)';
    sheen.setAttribute('cx', gx.toFixed(0)); sheen.setAttribute('cy', gy.toFixed(0)); glow.setAttribute('opacity', go.toFixed(3));
    if (Math.abs(tx - cx) + Math.abs(ty - cy) + Math.abs(tgo - go) > .002) requestAnimationFrame(loop); else running = false;
  }
})();
