// Genera una propuesta comercial de ALIVE en PDF (A4) a partir de un archivo de datos.
//   node scripts/render-propuesta.mjs propuestas/datos/ejemplo-web-esencial.json
// Salida: propuestas/salida/<slug>.pdf (y el .html intermedio, para revisarlo en el navegador).
// Los campos sin definir (precio null, por ejemplo) se marcan en el PDF para que no salga incompleto sin querer.
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dataPath = process.argv[2]
if (!dataPath) {
  console.error('Uso: node scripts/render-propuesta.mjs propuestas/datos/<archivo>.json')
  process.exit(1)
}
const d = JSON.parse(readFileSync(resolve(root, dataPath), 'utf8'))
const asset = (p) => pathToFileURL(resolve(root, p)).href

// ——— Formatos ———
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic']
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const fecha = new Date(`${d.fecha}T12:00:00`)
const vence = new Date(fecha.getTime() + d.validezDias * 86400000)
const corta = (f) => `${f.getDate()} ${MESES[f.getMonth()]} ${f.getFullYear()}`
const larga = (f) => `${f.getDate()} de ${MESES_LARGOS[f.getMonth()]} de ${f.getFullYear()}`
const SIMBOLO = { USD: 'US$', PEN: 'S/', EUR: '€' }
const dinero = (n) => {
  if (n == null) return '<mark>[precio]</mark>'
  const v = n.toLocaleString('es-PE', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })
  return d.moneda === 'EUR' ? `${v} €` : `${SIMBOLO[d.moneda] ?? d.moneda} ${v}`
}
const parte = (pct) => (d.servicio.precio == null ? null : Math.round(d.servicio.precio * pct) / 100)
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const cliente = esc(d.cliente.nombre)
const Plazo = d.plazo.charAt(0).toUpperCase() + d.plazo.slice(1)
const panel = d.servicio.panel !== false
const pausa = { diasSinRespuesta: 10, diasCierre: 30, ...d.pausa }
const alojamiento = d.alojamiento?.mensual == null ? '<mark>[alojamiento]</mark>' : `${dinero(d.alojamiento.mensual)} / mes`

const wordmark = readFileSync(resolve(root, 'src/assets/brand/alive-wordmark.svg'), 'utf8')
  .replace(/<\?xml[^>]*>/, '')
  .replace('<svg', '<svg class="wordmark" aria-label="ALIVE"')
  .replaceAll('#F5F7FA', 'currentColor')

// ——— Contenido ———
const incluye = [
  'Dirección visual propia: color, tipografía, composición y tono',
  'Hasta 5 secciones a medida de tu negocio',
  ...(panel ? ['Panel propio para editar textos, imágenes, precios y bloques ya diseñados desde el móvil, sin WordPress ni plugins'] : []),
  'Diseño adaptado a móvil, tableta y escritorio',
  'Formulario de contacto funcionando y WhatsApp conectado',
  'SEO técnico de base: títulos, descripciones, datos estructurados y sitemap',
  'Imágenes optimizadas para que la web cargue rápido',
  'Seguridad con HTTPS y aviso de privacidad adaptado',
  `${d.rondasDeAjustes} rondas de cambios y ${d.acompanamientoDias} días de acompañamiento después de publicar`,
]
const noIncluye = [
  'Redacción de textos largos y sesión de fotos profesional',
  'Tienda online, reservas o pagos dentro de la web',
  'Campañas de publicidad y gestión de redes sociales',
  ...(panel ? [] : ['Panel para editar la web tú mismo (disponible en la versión con panel)']),
  'El dominio y el alojamiento, que se pagan aparte y quedan a tu nombre',
]
const necesitamos = [
  'Logotipo en un archivo utilizable',
  'Textos base y fotos de tu negocio, o referencias',
  'Datos de contacto: teléfono, WhatsApp, correo y dirección',
  'Acceso al dominio, o lo registramos contigo',
]
const fases = [
  ['Al confirmar', 'Inicio', `Con el adelanto del ${d.pago.adelanto} % revisamos tu brief y el material de la página anterior. El plazo empieza a contar cuando el material está completo.`],
  ['Primeros días', 'Dirección visual', 'Te mostramos la portada diseñada en un enlace de prueba: color, tipografía y tono. La apruebas antes de construir el resto.'],
  ['Construcción', 'Web completa', `Construimos las secciones, el formulario, WhatsApp${panel ? ', el panel' : ''} y el SEO de base. Tienes ${d.rondasDeAjustes} rondas de cambios: en cada una nos envías todos tus comentarios juntos en una sola lista.`],
  ['Entrega', 'Publicación', `Con la web aprobada y el ${d.pago.saldo} % restante, la publicamos en tu dominio, revisamos que todo funcione y te entregamos los accesos${panel ? ' y una guía corta del panel' : ''}.`],
]
const trabajos = [
  ['src/assets/visual/project-flow-dispositivos-800.webp', 'Producto digital y marca', 'FLOW Talent HUB'],
  ['src/assets/visual/project-wewebinars-papeleria-800.webp', 'Marca, web y campaña', 'WeWebinars'],
  ['src/assets/visual/project-glus-web-800.webp', 'Web y campaña', 'GLUS Asociados Comerciales'],
  ['src/assets/visual/project-activa-landing-800.webp', 'Landing y simulador', 'Activa tu Vida X39'],
]

const li = (items) => items.map((t) => `<li>${t}</li>`).join('')
const pie = (n) => `
  <footer class="pie">
    <span>${wordmark}<span>Propuesta para ${cliente}</span></span>
    <span>${String(n).padStart(2, '0')}</span>
  </footer>`

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Propuesta ${cliente} · ALIVE</title>
<style>
@font-face { font-family: Inter; src: url('${asset('node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')}') format('woff2'); font-weight: 100 900; }
@page { size: A4; margin: 0; }
:root {
  --bg: #080f14; --ink: #0b1218; --muted: #4a4f57; --ivory: #f5f3ee; --paper: #fbfaf7;
  --text: #f5f7fa; --text-muted: #a1a1aa; --line: rgb(11 18 24 / 0.12); --line-dark: rgb(245 247 250 / 0.14);
  --violet: #7c3aed; --blue: #2f6bff; --turq: #00e0d0;
  --grad: linear-gradient(90deg, var(--violet), var(--blue) 52%, var(--turq));
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: Inter, sans-serif; font-feature-settings: 'ss01', 'cv11'; color: var(--ink); font-size: 12pt; line-height: 1.55; }
.page { position: relative; width: 210mm; height: 297mm; overflow: hidden; page-break-after: always; background: var(--ivory); padding: 18mm 18mm 22mm; }
.page:last-child { page-break-after: auto; }
.dark { background: var(--bg); color: var(--text); }
.wordmark { height: 12px; width: auto; fill: currentColor; vertical-align: middle; }
mark { background: #ffe58f; color: var(--ink); padding: 0 3px; border-radius: 2px; }
.grad { display: inline; background: var(--grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
.eyebrow { font-size: 9pt; font-weight: 500; letter-spacing: 0.22em; text-transform: uppercase; color: var(--muted); display: flex; align-items: center; gap: 10px; }
.eyebrow::after { content: ''; width: 34px; height: 1.5px; background: var(--grad); }
.dark .eyebrow { color: var(--text-muted); }
h2 { font-size: 27.5pt; font-weight: 450; letter-spacing: -0.025em; line-height: 1.12; margin: 10px 0 14px; }
h3 { font-size: 14.5pt; font-weight: 550; letter-spacing: -0.01em; }
p + p { margin-top: 8px; }
.lead { font-size: 14pt; line-height: 1.55; color: var(--muted); max-width: 150mm; }
.pie { position: absolute; left: 18mm; right: 18mm; bottom: 10mm; display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid var(--line); font-size: 9pt; color: var(--muted); }
.pie > span:first-child { display: flex; align-items: center; gap: 10px; }
.pie .wordmark { height: 9px; color: var(--ink); }
.card { background: var(--paper); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; }
.grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.grid2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.check { list-style: none; display: grid; gap: 5px; }
.check li { position: relative; padding-left: 16px; }
.check li::before { content: ''; position: absolute; left: 0; top: 0.55em; width: 7px; height: 7px; border-radius: 50%; background: var(--grad); }
.cross li::before { background: none; border: 1.2px solid var(--muted); width: 6px; height: 6px; }
.nota { margin-top: 14px; padding: 11px 14px; border-left: 2px solid var(--blue); background: rgb(47 107 255 / 0.06); border-radius: 0 8px 8px 0; font-size: 11pt; }

/* Portada y cierre */
.cover { padding: 16mm 18mm; display: flex; flex-direction: column; }
.cover .top { display: flex; justify-content: space-between; align-items: center; }
.cover .top .wordmark { height: 16px; }
.cover .tag { position: relative; z-index: 1; background: var(--bg); font-size: 8.5pt; letter-spacing: 0.22em; text-transform: uppercase; color: var(--text-muted); border: 1px solid var(--line-dark); padding: 4px 9px; border-radius: 99px; }
.sculpture { position: absolute; right: -60mm; top: 30mm; width: 240mm; opacity: 0.95; -webkit-mask-image: linear-gradient(to bottom, transparent, #000 26%, #000 70%, transparent), linear-gradient(to right, transparent, #000 28%); -webkit-mask-composite: source-in; mask-composite: intersect; }
.cover .body { margin-top: auto; position: relative; z-index: 1; }
.cover h1 { font-size: 35pt; font-weight: 450; letter-spacing: -0.035em; line-height: 1.08; margin: 14px 0 16px; }
.cover h1 span:first-child::after { content: ''; display: block; }
.cover .bajada { font-size: 14pt; color: var(--text-muted); max-width: 120mm; }
.meta { display: grid; grid-template-columns: repeat(4, auto); justify-content: start; gap: 26px; margin-top: 26px; padding-top: 14px; border-top: 1px solid var(--line-dark); }
.meta dt { font-size: 8.5pt; letter-spacing: 0.2em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 4px; }
.meta dd { font-size: 11pt; font-weight: 550; }
.meta dd small { display: block; font-weight: 400; color: var(--text-muted); font-size: 10pt; }

/* Resumen */
.pilar h3 { font-size: 15pt; font-weight: 500; margin-bottom: 6px; }
.pilar p { color: var(--muted); font-size: 11pt; }

/* Qué incluye */
.servicio { display: grid; grid-template-columns: 1fr auto; gap: 4px 20px; align-items: start; }
.servicio .num { width: 22px; height: 22px; border-radius: 50%; background: var(--ink); color: var(--ivory); display: inline-grid; place-items: center; font-size: 10pt; margin-right: 10px; vertical-align: middle; }
.servicio .tipo { color: var(--muted); font-size: 10pt; margin: 2px 0 12px 32px; }
.servicio .precio { font-size: 20pt; font-weight: 550; letter-spacing: -0.02em; }
.servicio .check { grid-column: 1 / -1; grid-template-columns: 1fr 1fr; gap: 6px 22px; }

/* Fases */
.fase { display: grid; grid-template-columns: 34mm 1fr; gap: 16px; padding: 14px 0; border-top: 1px solid var(--line); }
.fase:last-of-type { border-bottom: 1px solid var(--line); }
.fase .cuando { font-size: 9pt; letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted); }
.fase .n { font-size: 32.5pt; font-weight: 300; line-height: 1; letter-spacing: -0.03em; margin-bottom: 4px; }
.fase h3 { margin-bottom: 4px; }
.fase p { color: var(--muted); }

/* Inversión */
.tabla { background: var(--bg); color: var(--text); border-radius: 12px; padding: 6px 18px; }
.fila { display: flex; justify-content: space-between; align-items: baseline; gap: 20px; padding: 13px 0; border-bottom: 1px solid var(--line-dark); }
.fila:last-child { border-bottom: 0; }
.fila small { display: block; color: var(--text-muted); font-size: 10pt; margin-top: 2px; }
.fila .importe { font-size: 15pt; font-weight: 550; white-space: nowrap; }
.fila .etiqueta { font-size: 8.5pt; letter-spacing: 0.2em; text-transform: uppercase; color: var(--turq); padding-top: 12px; border: 0; }
.total { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
.total .card b { display: block; font-size: 27.5pt; font-weight: 550; letter-spacing: -0.02em; margin: 4px 0 2px; }
.total .card span { font-size: 8.5pt; letter-spacing: 0.2em; text-transform: uppercase; color: var(--muted); }
.total .card small { color: var(--muted); font-size: 10pt; }
.total .card.destacada { border: 1.5px solid transparent; background: linear-gradient(var(--paper), var(--paper)) padding-box, var(--grad) border-box; }
.condiciones { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 26px; margin-top: 12px; }
.condiciones h3 { font-size: 11pt; margin-bottom: 2px; }
.condiciones p { color: var(--muted); font-size: 10.5pt; }

/* Quién lo hace */
.firma { display: flex; gap: 14px; align-items: center; }
.firma .sello { width: 46px; height: 46px; border-radius: 12px; background: var(--bg); display: grid; place-items: center; flex: none; }
.firma .sello img { width: 22px; }
.firma p { color: var(--muted); }
.trabajos { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
.trabajo img { width: 100%; aspect-ratio: 3 / 2; object-fit: cover; border-radius: 8px; display: block; }
.trabajo span { display: block; font-size: 8.5pt; letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted); margin-top: 7px; }
.trabajo b { font-weight: 550; font-size: 12.5pt; }

/* Próximos pasos */
.paso { display: grid; grid-template-columns: 30px 1fr; gap: 12px; padding: 12px 0; border-top: 1px solid var(--line); }
.paso .n { width: 26px; height: 26px; border-radius: 50%; background: var(--ink); color: var(--ivory); display: grid; place-items: center; font-size: 11pt; }
.paso p { color: var(--muted); }
.cierre h2 { font-size: 42.5pt; letter-spacing: -0.035em; line-height: 1.06; }
.cierre .contacto { display: grid; grid-template-columns: repeat(3, auto); justify-content: start; gap: 30px; margin-top: 26px; padding-top: 14px; border-top: 1px solid var(--line-dark); }
</style>
</head>
<body>

<!-- 1 · Portada -->
<section class="page dark cover">
  <img class="sculpture" src="${asset('src/assets/visual/sculpture-closing.webp')}" alt="" />
  <div class="top">${wordmark}<span class="tag">Confidencial</span></div>
  <div class="body">
    <p class="eyebrow">Propuesta de servicios</p>
    <h1><span>${esc(d.portada.titulo[0])}</span><span class="grad">${esc(d.portada.titulo[1])}</span></h1>
    <p class="bajada">${esc(d.portada.bajada)}</p>
    <dl class="meta">
      <div><dt>Preparada para</dt><dd>${cliente}<small>${esc(d.cliente.detalle)}</small></dd></div>
      <div><dt>Preparada por</dt><dd>Francesco Lulli<small>ALIVE</small></dd></div>
      <div><dt>Fecha</dt><dd>${corta(fecha)}</dd></div>
      <div><dt>Válida hasta</dt><dd>${corta(vence)}</dd></div>
    </dl>
  </div>
</section>

<!-- 2 · Resumen -->
<section class="page">
  <p class="eyebrow">01 · Resumen</p>
  <h2>Tu web es lo primero que ven.<br />Tiene que estar a tu altura.</h2>
  <p class="lead">Antes de escribirte, la gente busca tu nombre, entra en tu web y decide en segundos si confía en ti. Esta propuesta es para que esa primera impresión trabaje a tu favor: una web con diseño propio, ${panel ? 'que puedes actualizar tú' : 'pensada para que te escriban'} y que Google entiende desde el primer día.</p>
  <div class="grid3" style="margin-top:18px">
    <div class="card pilar"><h3 class="grad">Diseño propio</h3><p>Una dirección visual pensada para ${cliente}, no una plantilla. La apruebas antes de construir.</p></div>
    ${panel
      ? '<div class="card pilar"><h3 class="grad">Panel propio</h3><p>Cambias textos, fotos y precios desde el móvil, sin WordPress y sin pedir ayuda.</p></div>'
      : '<div class="card pilar"><h3 class="grad">Contacto directo</h3><p>Formulario y WhatsApp conectados para que quien te visita te escriba en un toque.</p></div>'}
    <div class="card pilar"><h3 class="grad">Lista para Google</h3><p>Rápida, adaptada a móvil y con el SEO técnico de base hecho desde el primer día.</p></div>
  </div>
  <h3 style="margin-top:22px">Cómo empezamos</h3>
  <p style="margin-top:6px; max-width:160mm">Una reunión para entender tu negocio y, en pocos días, una dirección visual que apruebas antes de construir nada. Después, la web completa${panel ? ' con su panel' : ''}, publicada en tu dominio en ${esc(d.plazo)} desde que tenemos el material.</p>
  <p class="nota"><strong>En una frase:</strong> una web propia, que se paga una vez, se publica en ${esc(d.plazo)}${panel ? ' y que actualizas tú' : ' y trabaja para ti desde el primer día'}.</p>
  ${pie(2)}
</section>

<!-- 3 · Qué incluye -->
<section class="page">
  <p class="eyebrow">02 · Qué incluye</p>
  <h2>${esc(d.servicio.nombre)}</h2>
  <div class="card servicio">
    <div><h3><span class="num">1</span>${esc(d.servicio.nombre)}</h3><p class="tipo">${esc(d.servicio.tipo)}</p></div>
    <div class="precio">${dinero(d.servicio.precio)}</div>
    <ul class="check">${li(incluye)}</ul>
  </div>
  <div class="grid2" style="margin-top:12px">
    <div class="card"><h3 style="margin-bottom:8px">Lo que no incluye</h3><ul class="check cross">${li(noIncluye)}</ul></div>
    <div class="card"><h3 style="margin-bottom:8px">Lo que necesitamos de ti</h3><ul class="check">${li(necesitamos)}</ul></div>
  </div>
  <p class="nota">Si más adelante necesitas más secciones, varios idiomas o funciones a medida, lo cotizamos aparte, sobre la misma base.</p>
  ${pie(3)}
</section>

<!-- 4 · Cómo trabajamos -->
<section class="page">
  <p class="eyebrow">03 · Cómo trabajamos</p>
  <h2>De la primera reunión<br />a tu web publicada</h2>
  <p class="lead" style="margin-bottom:16px">${esc(Plazo)} de trabajo, contados desde que tenemos el material y los accesos. No cuentan los días en que esperamos tu respuesta.</p>
  ${fases.map(([cuando, titulo, texto], i) => `
  <div class="fase">
    <div><div class="n">0${i + 1}</div><div class="cuando">${cuando}</div></div>
    <div><h3>${titulo}</h3><p>${texto}</p></div>
  </div>`).join('')}
  <p class="nota">Trabajamos con apoyo de inteligencia artificial para ir más rápido en lo repetitivo. Las decisiones de diseño y todo lo que se publica lo revisa una persona.</p>
  ${pie(4)}
</section>

<!-- 5 · Inversión -->
<section class="page">
  <p class="eyebrow">04 · Inversión</p>
  <h2>Lo que cuesta, sin letra pequeña</h2>
  <div class="tabla">
    <div class="fila etiqueta">Una vez</div>
    <div class="fila"><div>${esc(d.servicio.nombre)}<small>Diseño, desarrollo${panel ? ', panel' : ''} y puesta en marcha</small></div><div class="importe">${dinero(d.servicio.precio)}</div></div>
    <div class="fila"><div>Acompañamiento tras la publicación<small>Dudas y pequeños ajustes</small></div><div class="importe">${d.acompanamientoDias} días incluidos</div></div>
    <div class="fila etiqueta">Mensual · opcional</div>
    <div class="fila"><div>Alojamiento<small>Servidor y certificado de seguridad, o la publicamos en una cuenta tuya</small></div><div class="importe">${alojamiento}</div></div>
  </div>
  <div class="total">
    <div class="card destacada"><span>Al confirmar · ${d.pago.adelanto} %</span><b>${dinero(parte(d.pago.adelanto))}</b><small>Adelanto para reservar el inicio del proyecto.</small></div>
    <div class="card"><span>Al aprobar la web · ${d.pago.saldo} %</span><b>${dinero(parte(d.pago.saldo))}</b><small>Saldo, antes de publicarla en tu dominio.</small></div>
  </div>
  <p class="nota">Pagos seguros con Whop. No vemos ni guardamos los datos de tu tarjeta.</p>
  <h3 style="margin-top:20px">Condiciones</h3>
  <div class="condiciones">
    <div><h3>Plazos</h3><p>${esc(Plazo)} de trabajo desde que tenemos el material. No cuentan los días que esperamos tu respuesta.</p></div>
    <div><h3>Cambios</h3><p>${d.rondasDeAjustes} rondas, cada una con una sola lista. Lo que no está en esta propuesta se cotiza aparte, antes de hacerlo.</p></div>
    <div><h3>Si no hay respuesta</h3><p>A los ${pausa.diasSinRespuesta} días hábiles sin respuesta el proyecto se pausa, y a los ${pausa.diasCierre} días de pausa se cierra. Para retomarlo, se paga el saldo.</p></div>
    <div><h3>Dominio y alojamiento</h3><p>Se pagan aparte y quedan a tu nombre. El alojamiento con nosotros es opcional.</p></div>
    <div><h3>Propiedad</h3><p>Con el pago completo, la web y sus contenidos son tuyos.</p></div>
    <div><h3>Contratas con</h3><p>Francesco Lulli Guzmán (ALIVE), Lima, Perú.</p></div>
  </div>
  ${pie(5)}
</section>

<!-- 6 · Quién lo hace -->
<section class="page">
  <p class="eyebrow">05 · Quién lo hace</p>
  <h2>Un estudio con oficio,<br />desde 2012</h2>
  <div class="card firma">
    <div class="sello"><img src="${asset('src/assets/brand/alive-symbol.svg')}" alt="" /></div>
    <div><h3>Francesco Lulli</h3><p>Fundador y director de ALIVE. Lleva tu proyecto de principio a fin, con un solo interlocutor desde la primera reunión hasta la publicación.</p></div>
  </div>
  <h3 style="margin-top:20px">Algunos trabajos</h3>
  <div class="trabajos">
    ${trabajos.map(([img, tipo, nombre]) => `<div class="trabajo"><img src="${asset(img)}" alt="" /><span>${tipo}</span><b>${nombre}</b></div>`).join('')}
  </div>
  <p class="nota">Más proyectos en <strong>alivedigital.agency</strong>.</p>
  ${pie(6)}
</section>

<!-- 7 · Próximos pasos -->
<section class="page dark cover cierre">
  <img class="sculpture" src="${asset('src/assets/visual/sculpture-closing.webp')}" alt="" />
  <div class="top">${wordmark}<span class="tag">Próximos pasos</span></div>
  <div class="body">
    <p class="eyebrow">06 · Empezamos</p>
    <h2>Demos vida<br /><span class="grad">a tu próximo proyecto.</span></h2>
    <div style="margin-top:18px; max-width:125mm">
      ${[
        ['Confirmas la propuesta', `Antes del ${larga(vence)}.`],
        ['Adelanto y reunión de arranque', `${d.pago.adelanto} % con Whop y te pedimos el material.`],
        ['Dirección visual', 'La apruebas antes de construir.'],
        ['Web publicada', `En ${esc(d.plazo)} desde que tenemos el material.`],
      ].map(([t, p], i) => `<div class="paso" style="border-color:var(--line-dark)"><div class="n" style="background:var(--text);color:var(--bg)">${i + 1}</div><div><h3>${t}</h3><p style="color:var(--text-muted)">${p}</p></div></div>`).join('')}
    </div>
    <div class="contacto meta" style="grid-template-columns:repeat(2,auto)">
      <div><dt>Web</dt><dd>alivedigital.agency</dd></div>
      <div><dt>Propuesta válida hasta</dt><dd>${corta(vence)}</dd></div>
    </div>
  </div>
</section>

</body>
</html>`

const outDir = resolve(root, 'propuestas/salida')
mkdirSync(outDir, { recursive: true })
const htmlPath = resolve(outDir, `${d.slug}.html`)
writeFileSync(htmlPath, html)

const require = createRequire(`${execSync('npm root -g').toString().trim()}/`)
const { chromium } = require('playwright')
const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 4 })
await page.goto(pathToFileURL(htmlPath).href)
await page.evaluate(() => document.fonts.ready)
// El texto con degradado (background-clip: text) se ve bien en pantalla pero no al exportar a PDF
// (filetes o rectángulos según el visor). Cada .grad se captura tal como se ve, con fondo
// transparente y a 4×, y su contenido se sustituye por esa imagen (el texto queda como alternativo).
await page.addStyleTag({
  content: `.captura, .captura * { background-color: transparent !important; }
    .captura .page { background-image: none !important; }
    .captura img, .captura .sculpture { visibility: hidden !important; }`,
})
await page.evaluate(() => document.body.classList.add('captura'))
const grads = page.locator('.grad')
const capturas = []
for (let n = 0; n < (await grads.count()); n++) {
  capturas.push((await grads.nth(n).screenshot({ omitBackground: true })).toString('base64'))
}
await page.evaluate((capturas) => {
  document.querySelectorAll('.grad').forEach((el, n) => {
    const r = el.getBoundingClientRect()
    const img = new Image()
    img.src = `data:image/png;base64,${capturas[n]}`
    img.alt = el.textContent
    img.style.cssText = `display:block;width:${r.width}px;height:${r.height}px`
    el.replaceChildren(img)
  })
  document.body.classList.remove('captura')
}, capturas)
await page.waitForFunction(() => [...document.images].every((i) => i.complete))
const desbordes = await page.evaluate(() =>
  [...document.querySelectorAll('.page')].flatMap((pg, i) => {
    const pie = pg.querySelector('.pie')
    const limite = (pie ? pie.getBoundingClientRect().top : pg.getBoundingClientRect().bottom) - 4
    const fuera = [...pg.querySelectorAll('h2, h3, p, li, .card, .fila, .fase, .paso, .trabajo, dl')].some((el) => el.getBoundingClientRect().bottom > limite)
    return fuera ? [i + 1] : []
  }),
)
if (desbordes.length) console.warn(`Aviso: contenido desbordado en la página ${desbordes.join(', ')}`)
const pdfPath = resolve(outDir, `${d.slug}.pdf`)
await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, preferCSSPageSize: true })
await browser.close()
console.log(`PDF: ${pdfPath}`)
