// Plantilla de la propuesta comercial de ALIVE (A4, 7 páginas). La usan el panel (en el navegador)
// y scripts/render-propuesta.mjs (en Node), para que ambos generen exactamente lo mismo.
// d: datos de la propuesta (ver propuestas/datos/*.json). asset(ruta) devuelve la URL de un archivo
// del repositorio (fuente, imágenes); wordmarkSvg es el SVG del logotipo como texto.

// Archivos que usa la plantilla (para que el panel los resuelva con Vite).
export const PROPOSAL_ASSETS = [
  'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  'src/assets/visual/sculpture-closing.webp',
  'src/assets/brand/alive-symbol.svg',
  'src/assets/visual/project-flow-dispositivos-800.webp',
  'src/assets/visual/project-wewebinars-papeleria-800.webp',
  'src/assets/visual/project-glus-web-800.webp',
  'src/assets/visual/project-activa-landing-800.webp',
]

export function buildProposal(d, { asset, wordmarkSvg }) {
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
  // Ecommerce: precio base + bloques de productos que carga ALIVE + adicionales elegidos.
  const eco = d.servicio.ecommerce ?? null
  const bloques = eco ? (eco.bloquesExtra ?? 0) : 0
  const precioBloque = eco?.precioBloque ?? 100
  // Marca: nivel Esencial o Completa (servicio.marca.nivel). Admite adicionales, por ejemplo un combo con web.
  const marca = d.servicio.marca ?? null
  const completa = marca?.nivel === 'completa'
  // Proyecto a medida: Versión 1 con sus funciones, lo que queda para después y los servicios de terceros.
  const med = d.servicio.medida ?? null
  const funciones = med?.funciones ?? []
  const despues = med?.despues ?? []
  const terceros = med?.terceros ?? []
  const adicionales = (eco ?? marca ?? med)?.adicionales ?? []
  const total =
    d.servicio.precio == null ? null : d.servicio.precio + bloques * precioBloque + adicionales.reduce((a, x) => a + (x.precio ?? 0), 0)
  // Con factura se suma el 18 % de IGV; pagando con Whop no aplica (d.factura).
  const igv = d.factura && total != null ? Math.round(total * 18) / 100 : 0
  const totalFinal = total == null ? null : total + igv
  const parte = (pct) => (totalFinal == null ? null : Math.round(totalFinal * pct) / 100)
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const cliente = esc(d.cliente.nombre)
  const Plazo = d.plazo.charAt(0).toUpperCase() + d.plazo.slice(1)
  const panel = !marca && !med && (d.servicio.panel !== false || Boolean(d.servicio.ecommerce))
  const cosa = d.servicio.ecommerce ? 'tienda' : marca ? 'marca' : med ? 'versión' : 'web'
  const producto = esc(med?.producto || 'tu producto')
  const pausa = { diasSinRespuesta: 10, diasCierre: 30, ...d.pausa }
  const alojamiento = d.alojamiento?.mensual == null ? '<mark>[alojamiento]</mark>' : `${dinero(d.alojamiento.mensual)} / mes`

  const wordmark = wordmarkSvg
    .replace(/<\?xml[^>]*>/, '')
    .replace('<svg', '<svg class="wordmark" aria-label="ALIVE"')
    .replaceAll('#F5F7FA', 'currentColor')

  // ——— Contenido ———
  const incluyeEco = [
    'Dirección visual propia: portada, catálogo y ficha de producto',
    `Carga de ${eco?.productos ?? 40} productos por ALIVE, con variantes (talla, color)`,
    'Fichas de producto escritas con IA y revisadas, listas para Google',
    `Pago desde el celular con ${esc(eco?.pasarela ?? 'Culqi o Whop')} a tu nombre, y pedido por WhatsApp`,
    'Panel de pedidos, stock y productos: cargas todos los que quieras',
    'Envío por zonas, recojo en tienda, cupones y correos con tu marca',
    'Libro de reclamaciones virtual y páginas legales',
    `${d.rondasDeAjustes} rondas de cambios y ${d.acompanamientoDias} días de acompañamiento con tu primer pedido`,
  ]
  const incluyeMarca = [
    ...(completa ? ['Estrategia de marca: propósito, público, posicionamiento, personalidad y tono de voz con ejemplos'] : ['Concepto de marca en una página, para decidir con criterio']),
    '3 rutas creativas distintas para elegir, cada una con logotipo, colores, tipografía y una aplicación real',
    `${d.rondasDeAjustes} rondas de cambios sobre la ruta elegida`,
    'Logotipo principal, horizontal, vertical y símbolo para redes; a color, en negativo y a una tinta',
    'Paleta de colores (HEX, RGB y CMYK) y 2 tipografías de licencia libre',
    ...(completa
      ? [
          'Sistema visual: recursos gráficos, estilo de fotografía e íconos base',
          'Aplicaciones: tarjeta, hoja membretada, firma de correo y 3 plantillas de redes',
          'Manual de marca en PDF y archivos editables (Figma o Illustrator)',
        ]
      : ['Foto de perfil para redes y guía corta de uso en PDF']),
    `Archivos en SVG, PDF y PNG, y ${d.acompanamientoDias} días de acompañamiento`,
  ]
  const incluyeMed = [
    ...funciones.map((f) => `<b>${esc(f)}</b>`),
    'Prototipo navegable de las pantallas clave, que apruebas antes de programar',
    'Una demo por semana en un enlace real, para ver el avance',
    'Prueba con 3 a 5 usuarios reales antes de lanzar, y 2 rondas de ajustes',
    `${med?.plataforma === 'tiendas' ? 'App para iPhone y Android desde una sola base' : med?.plataforma === 'instalable' ? 'Web instalable en el celular, que funciona como una app' : 'Web adaptada a celular, tableta y escritorio'}`,
    'Código, datos y cuentas a tu nombre, con documento de uso y una sesión grabada',
    `${d.acompanamientoDias} días de garantía después del lanzamiento`,
  ]
  const incluye = med ? incluyeMed : marca ? incluyeMarca : eco ? incluyeEco : [
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
  const noIncluye = med ? (despues.length ? despues.map(esc) : ['Lo que no está en la lista de funciones de la Versión 1']) : marca ? [
    'Búsqueda y registro de la marca en INDECOPI, que hace el cliente',
    'Creación del nombre (naming), que se cotiza aparte',
    'Impresión, fotografía y web',
    ...(completa ? [] : ['Manual completo, aplicaciones y archivos editables (incluidos en Identidad Completa)']),
  ] : eco ? [
    'Fotografía de producto y redacción de textos largos',
    'Gestión diaria de la tienda: pedidos, envíos y atención',
    'Campañas de publicidad y gestión de redes sociales',
    'Comisiones de la pasarela de pago, que cobra el proveedor',
    'El dominio y el alojamiento, que se pagan aparte',
  ] : [
    'Redacción de textos largos y sesión de fotos profesional',
    'Tienda online, reservas o pagos dentro de la web',
    'Campañas de publicidad y gestión de redes sociales',
    ...(panel ? [] : ['Panel para editar la web tú mismo (disponible en la versión con panel)']),
    'El dominio y el alojamiento, que se pagan aparte y quedan a tu nombre',
  ]
  const necesitamos = med ? [
    'Un responsable de tu lado que responda y apruebe',
    `Cuentas a tu nombre para los servicios que usa el producto${terceros.length ? `: ${terceros.map(esc).join(', ')}` : ''}`,
    'De 3 a 5 usuarios reales para la prueba antes de lanzar',
    'Contenidos y datos de ejemplo, si el producto los necesita',
  ] : marca ? [
    'El brief de marca completo (te enviamos el enlace)',
    'El nombre exacto, tal como se escribe',
    'Marcas que te gustan y lo que no quieres ver',
    'Si es un rediseño, tu logo actual',
  ] : eco ? [
    'Logotipo, fotos de productos y datos de contacto',
    'La planilla de productos que te enviamos, con precios y stock',
    `Tu cuenta de ${esc(eco.pasarela ?? 'Culqi o Whop')} a tu nombre (te guiamos para abrirla)`,
    'Zonas de envío con su tarifa y tus políticas de cambios',
  ] : [
    'Logotipo en un archivo utilizable',
    'Textos base y fotos de tu negocio, o referencias',
    'Datos de contacto: teléfono, WhatsApp, correo y dirección',
    'Acceso al dominio, o lo registramos contigo',
  ]
  const fases = med ? [
    ['Al confirmar', 'Inicio y prototipo', `Con el adelanto del ${d.pago.adelanto} % y tus cuentas abiertas, diseñamos las pantallas clave en un prototipo navegable. Lo apruebas antes de programar.`],
    ['Cada semana', 'Construcción', 'Construimos la Versión 1 y cada semana te mostramos el avance en un enlace real, para corregir el rumbo a tiempo.'],
    ['Antes de lanzar', 'Prueba con usuarios', `De 3 a 5 usuarios reales la prueban; con lo que encuentren hacemos ${d.rondasDeAjustes} rondas de ajustes.`],
    ['Lanzamiento', 'En línea y en tus manos', `Con la versión aprobada y el ${d.pago.saldo} % restante, la publicamos y te entregamos cuentas, documento de uso y ${d.acompanamientoDias} días de garantía.`],
  ] : marca ? [
    ['Al confirmar', 'Inicio y estrategia', `Con el adelanto del ${d.pago.adelanto} % y tu brief, definimos ${completa ? 'la estrategia de tu marca' : 'el concepto de tu marca'}. La apruebas antes de diseñar.`],
    ['Primeros días', '3 rutas creativas', 'Te presentamos 3 caminos distintos, cada uno con logotipo, colores, tipografía y una aplicación real. Eliges uno.'],
    ['Ajustes', `${d.rondasDeAjustes} rondas de cambios`, 'Sobre la ruta elegida, en cada ronda nos envías todos tus comentarios juntos en una sola lista.'],
    ['Entrega', 'Archivos y guía', `Con la marca aprobada y el ${d.pago.saldo} % restante, te entregamos la carpeta completa${completa ? ', el manual y las aplicaciones' : ' y la guía de uso'}.`],
  ] : eco ? [
    ['Al confirmar', 'Inicio', `Con el adelanto del ${d.pago.adelanto} % recibimos tu material y la planilla de productos, y abres tu cuenta de pagos. El plazo cuenta desde que el material está completo.`],
    ['Primeros días', 'Dirección visual', 'Te mostramos la portada y la ficha de producto diseñadas en un enlace de prueba. Las apruebas antes de construir el resto.'],
    ['Construcción', 'Tienda y catálogo', `Construimos catálogo, carrito, pago, pedidos, envíos y páginas legales, y cargamos tus productos con fichas escritas con IA. Tienes ${d.rondasDeAjustes} rondas de cambios, cada una en una sola lista.`],
    ['Entrega', 'Pruebas y publicación', `Hacemos una compra real con tu cuenta y la reembolsamos. Con la tienda aprobada y el ${d.pago.saldo} % restante, la publicamos y te entregamos accesos y la guía de pedidos.`],
  ] : [
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

  return `<!doctype html>
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
.cover h1.en-linea span:first-child::after { display: none; }
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
.eco .fila { padding: 10px 0; }
.fila { display: flex; justify-content: space-between; align-items: baseline; gap: 20px; padding: 13px 0; border-bottom: 1px solid var(--line-dark); }
.fila:last-child { border-bottom: 0; }
.fila .igv { color: var(--text-muted); font-size: 10pt; }
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
    <h1${d.portada.enLinea ? ' class="en-linea"' : ''}><span>${esc(d.portada.titulo[0])}${d.portada.enLinea ? ' ' : ''}</span><span class="grad">${esc(d.portada.titulo[1])}</span></h1>
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
  ${med ? `<h2>Lanza rápido.<br />Mejora con datos reales.</h2>
  <p class="lead">La mejor forma de construir un producto digital es ponerlo en manos de usuarios reales cuanto antes. Esta propuesta es para lanzar una Versión 1 de ${producto} con lo esencial, medir cómo se usa y decidir las mejoras con datos, no con suposiciones.</p>` : marca ? `<h2>Una marca que se reconoce<br />antes de leer tu nombre.</h2>
  <p class="lead">Tu marca es lo que la gente recuerda de ti. Esta propuesta es para que se vea profesional en todas partes, desde tu perfil de WhatsApp hasta tu fachada, con un sistema claro que puedas usar sin depender de nadie.</p>` : eco ? `<h2>Tu tienda, abierta todo el día.<br />Con tu marca, no con una plantilla.</h2>
  <p class="lead">Quien te compra por internet decide en segundos si confía en ti. Esta propuesta es para que comprarte sea fácil y se sienta tuyo: una tienda con diseño propio, pago seguro desde el celular y un panel donde llevas pedidos, stock y productos sin depender de nadie.</p>` : `<h2>Tu web es lo primero que ven.<br />Tiene que estar a tu altura.</h2>
  <p class="lead">Antes de escribirte, la gente busca tu nombre, entra en tu web y decide en segundos si confía en ti. Esta propuesta es para que esa primera impresión trabaje a tu favor: una web con diseño propio, ${panel ? 'que puedes actualizar tú' : 'pensada para que te escriban'} y que Google entiende desde el primer día.</p>`}
  <div class="grid3" style="margin-top:18px">
    ${med
      ? `<div class="card pilar"><h3 class="grad">Versión 1</h3><p>De 3 a 5 funciones que resuelven el problema principal. Lo demás espera a tener datos de uso.</p></div>`
      : marca
      ? `<div class="card pilar"><h3 class="grad">Con estrategia</h3><p>Antes de dibujar, definimos qué tiene que transmitir ${cliente}. Así eliges con criterio, no solo por gusto.</p></div>`
      : `<div class="card pilar"><h3 class="grad">Diseño propio</h3><p>Una dirección visual pensada para ${cliente}, no una plantilla. La apruebas antes de construir.</p></div>`}
    ${med
      ? '<div class="card pilar"><h3 class="grad">Cada semana</h3><p>Ves el avance en un enlace real, no en una presentación. Corregimos el rumbo a tiempo.</p></div>'
      : marca
      ? '<div class="card pilar"><h3 class="grad">3 rutas</h3><p>Tres caminos de verdad distintos, vistos en aplicaciones reales, para que elijas el tuyo.</p></div>'
      : eco
      ? '<div class="card pilar"><h3 class="grad">Pago fácil</h3><p>Pago pensado para celular, con tu cuenta a tu nombre, y pedido por WhatsApp para quien lo prefiera.</p></div>'
      : panel
      ? '<div class="card pilar"><h3 class="grad">Panel propio</h3><p>Cambias textos, fotos y precios desde el móvil, sin WordPress y sin pedir ayuda.</p></div>'
      : '<div class="card pilar"><h3 class="grad">Contacto directo</h3><p>Formulario y WhatsApp conectados para que quien te visita te escriba en un toque.</p></div>'}
    ${med
      ? '<div class="card pilar"><h3 class="grad">Tuyo de verdad</h3><p>El código, los datos y las cuentas quedan a tu nombre desde el pago completo.</p></div>'
      : marca
      ? '<div class="card pilar"><h3 class="grad">Lista para usar</h3><p>Archivos para redes, web e imprenta, con una guía que dice cuál usar en cada caso.</p></div>'
      : eco
      ? '<div class="card pilar"><h3 class="grad">Fichas con IA</h3><p>Descripciones de producto escritas con IA a partir de tus datos, revisadas por nosotros y listas para Google.</p></div>'
      : '<div class="card pilar"><h3 class="grad">Lista para Google</h3><p>Rápida, adaptada a móvil y con el SEO técnico de base hecho desde el primer día.</p></div>'}
  </div>
  <h3 style="margin-top:22px">Cómo empezamos</h3>
  <p style="margin-top:6px; max-width:160mm">${med ? `Una llamada de 30 minutos y un prototipo navegable que apruebas antes de programar. Después, la construcción con una demo por semana, una prueba con usuarios reales y el lanzamiento, en ${esc(d.plazo)} de trabajo.` : marca ? `Un brief para entender tu negocio y ${completa ? 'una estrategia' : 'un concepto'} que apruebas antes de diseñar. Después, 3 rutas creativas, ${d.rondasDeAjustes} rondas de cambios y todos los archivos listos, en ${esc(d.plazo)} de trabajo.` : `Una reunión para entender tu negocio y, en pocos días, una dirección visual que apruebas antes de construir nada. Después, ${eco ? 'la tienda completa con tus productos y su panel de pedidos' : `la web completa${panel ? ' con su panel' : ''}`}, publicada en tu dominio en ${esc(d.plazo)} desde que tenemos el material.`}</p>
  <p class="nota"><strong>En una frase:</strong> ${med ? `un producto propio, lanzado en ${esc(d.plazo)} de trabajo, que crece con lo que aprendes de tus usuarios.` : marca ? `una marca propia, con ${completa ? 'estrategia, sistema y manual' : 'sus versiones y una guía clara'}, que es tuya desde el pago completo.` : eco ? `una tienda propia, sin licencias mensuales de plataforma, que se publica en ${esc(d.plazo)} de trabajo y que manejas tú.` : `una web propia, que se paga una vez, se publica en ${esc(d.plazo)}${panel ? ' y que actualizas tú' : ' y trabaja para ti desde el primer día'}.`}</p>
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
    <div class="card"><h3 style="margin-bottom:8px">${med ? 'Queda para después' : 'Lo que no incluye'}</h3><ul class="check cross">${li(noIncluye)}</ul></div>
    <div class="card"><h3 style="margin-bottom:8px">Lo que necesitamos de ti</h3><ul class="check">${li(necesitamos)}</ul></div>
  </div>
  <p class="nota">${med ? 'Lo que queda para después no se pierde: lo decidimos con datos de uso, con un plan mensual o como una nueva versión. Los servicios de terceros (base de datos, alojamiento, IA, WhatsApp) los pagas directo al proveedor.' : marca ? 'La marca se diseña para tu nombre: te recomendamos hacer la búsqueda en INDECOPI antes de la ronda final, para no invertir en un diseño que luego no puedas registrar.' : eco ? `Cada bloque de 40 productos más que carguemos cuesta ${dinero(precioBloque)}. Otras funciones (otra pasarela, facturación electrónica, envíos por courier) se cotizan aparte.` : 'Si más adelante necesitas más secciones, varios idiomas o funciones a medida, lo cotizamos aparte, sobre la misma base.'}</p>
  ${pie(3)}
</section>

<!-- 4 · Cómo trabajamos -->
<section class="page">
  <p class="eyebrow">03 · Cómo trabajamos</p>
  <h2>${med ? 'De la idea<br />a tu Versión 1 en línea' : marca ? 'Del brief<br />a tu marca lista' : eco ? 'De la primera reunión<br />a tu tienda publicada' : 'De la primera reunión<br />a tu web publicada'}</h2>
  <p class="lead" style="margin-bottom:16px">${esc(Plazo)} de trabajo, contados desde que tenemos ${med ? 'tus cuentas y accesos' : marca ? 'el brief completo' : 'el material y los accesos'}. No cuentan los días en que esperamos tu respuesta.</p>
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
  <div class="tabla${eco || med || d.factura ? ' eco' : ''}">
    <div class="fila etiqueta">Una vez</div>
    <div class="fila"><div>${esc(d.servicio.nombre)}<small>${med ? `${funciones.length || '3 a 5'} funciones, prototipo, demos semanales y prueba con usuarios` : marca ? (completa ? 'Estrategia, 3 rutas, sistema, aplicaciones, manual y editables' : 'Concepto, 3 rutas, versiones del logotipo y guía de uso') : eco ? `Tienda, panel de pedidos y carga de ${eco.productos ?? 40} productos` : `Diseño, desarrollo${panel ? ', panel' : ''} y puesta en marcha`}</small></div><div class="importe">${dinero(d.servicio.precio)}</div></div>
    ${bloques ? `<div class="fila"><div>Productos adicionales<small>${bloques} ${bloques === 1 ? 'bloque' : 'bloques'} de 40 productos cargados por ALIVE</small></div><div class="importe">${dinero(bloques * precioBloque)}</div></div>` : ''}
    ${adicionales.map((x) => `<div class="fila"><div>${esc(x.nombre)}${x.detalle ? `<small>${esc(x.detalle)}</small>` : ''}</div><div class="importe">${dinero(x.precio)}</div></div>`).join('')}
    ${d.factura
      ? `<div class="fila"><div><b>Total con IGV</b> <span class="igv">(${dinero(total)} + 18 %)</span></div><div class="importe">${dinero(totalFinal)}</div></div>`
      : bloques || adicionales.length
        ? `<div class="fila"><div><b>Total del proyecto</b></div><div class="importe">${dinero(total)}</div></div>`
        : ''}
    ${med ? `<div class="fila"><div>Garantía tras el lanzamiento<small>Corrección de cualquier error de lo construido</small></div><div class="importe">${d.acompanamientoDias} días incluidos</div></div>
    <div class="fila"><div>Plan mensual (opcional)<small>Cuidado ${dinero(120)}: monitoreo, copias, errores y 2 h de ajustes · Evoluciona ${dinero(390)}: además 8 h de mejoras</small></div><div class="importe">desde ${dinero(120)} / mes</div></div>` : marca ? `<div class="fila"><div>Acompañamiento tras la entrega<small>Dudas sobre el uso de los archivos</small></div><div class="importe">${d.acompanamientoDias} días incluidos</div></div>` : eco ? `<div class="fila"><div>Alojamiento mensual<small>Servidor, base de datos de pedidos e imágenes</small></div><div class="importe">${alojamiento}</div></div>` : `<div class="fila"><div>Acompañamiento tras la publicación<small>Dudas y pequeños ajustes</small></div><div class="importe">${d.acompanamientoDias} días incluidos</div></div>
    <div class="fila etiqueta">Mensual · opcional</div>
    <div class="fila"><div>Alojamiento<small>Servidor y certificado de seguridad, o la publicamos en una cuenta tuya</small></div><div class="importe">${alojamiento}</div></div>`}
  </div>
  <div class="total">
    <div class="card destacada"><span>Al confirmar · ${d.pago.adelanto} %</span><b>${dinero(parte(d.pago.adelanto))}</b><small>Adelanto para reservar el inicio${eco && !d.factura ? ', con Whop' : ' del proyecto'}.</small></div>
    <div class="card"><span>Al aprobar la ${cosa} · ${d.pago.saldo} %</span><b>${dinero(parte(d.pago.saldo))}</b><small>${med ? 'Saldo, antes del lanzamiento.' : marca ? 'Saldo, antes de entregarte los archivos.' : 'Saldo, antes de publicarla en tu dominio.'}</small></div>
  </div>
  ${eco || med || d.factura ? '' : '<p class="nota">Pagos seguros con Whop. No vemos ni guardamos los datos de tu tarjeta.</p>'}
  <h3 style="margin-top:20px">Condiciones</h3>
  <div class="condiciones">
    <div><h3>Plazos</h3><p>${esc(Plazo)} de trabajo desde que tenemos ${med ? 'tus cuentas' : 'el material'}. No cuentan los días que esperamos tu respuesta.</p></div>
    <div><h3>Cambios</h3><p>${d.rondasDeAjustes} rondas, cada una con una sola lista. Lo que no está en esta propuesta se cotiza aparte, antes de hacerlo.</p></div>
    <div><h3>Si no hay respuesta</h3><p>A los ${pausa.diasSinRespuesta} días hábiles sin respuesta el proyecto se pausa, y a los ${pausa.diasCierre} días de pausa se cierra. Para retomarlo, se paga el saldo.</p></div>
    ${med ? '<div><h3>Servicios de terceros</h3><p>Base de datos, alojamiento, IA y otros servicios los pagas directo al proveedor, con las cuentas a tu nombre.</p></div>' : marca ? '<div><h3>Registro de la marca</h3><p>La búsqueda y el registro en INDECOPI los hace el cliente. ALIVE no garantiza la disponibilidad registral.</p></div>' : eco ? '<div><h3>Dominio y alojamiento</h3><p>El dominio queda a tu nombre. La tienda se aloja en nuestra cuenta y, si un día te vas, te la transferimos con todos tus datos.</p></div>' : '<div><h3>Dominio y alojamiento</h3><p>Se pagan aparte y quedan a tu nombre. El alojamiento con nosotros es opcional.</p></div>'}
    <div><h3>Propiedad</h3><p>${med ? 'Con el pago completo, el código, los datos y las cuentas son tuyos.' : marca ? 'Con el pago completo, los derechos sobre la marca y sus archivos pasan a ti.' : `Con el pago completo, la ${cosa} y sus contenidos son tuyos.`}</p></div>
    <div><h3>Contratas con</h3><p>Francesco Lulli Guzmán (ALIVE), Lima, Perú. ${d.factura ? 'Con factura e IGV.' : 'Con factura, se suma el 18 % de IGV.'}</p></div>
  </div>
  ${pie(5)}
</section>

<!-- 6 · Quién lo hace -->
<section class="page">
  <p class="eyebrow">05 · Quién lo hace</p>
  <h2>Un estudio con oficio,<br />desde 2012</h2>
  <div class="card firma">
    <div class="sello"><img src="${asset('src/assets/brand/alive-symbol.svg')}" alt="" /></div>
    <div><h3>Francesco Lulli</h3><p>Fundador y director de ALIVE. Lleva tu proyecto de principio a fin, con un solo interlocutor desde la primera reunión hasta la ${marca ? 'entrega' : 'publicación'}.</p></div>
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
        ...(med
          ? [
              ['Prototipo', 'Lo apruebas antes de programar.'],
              ['Versión 1 en línea', `En ${esc(d.plazo)} de trabajo desde que tenemos tus cuentas.`],
            ]
          : marca
          ? [
              ['3 rutas creativas', 'Eliges la que es tuya.'],
              ['Marca entregada', `En ${esc(d.plazo)} de trabajo desde que tenemos el brief.`],
            ]
          : [
              ['Dirección visual', 'La apruebas antes de construir.'],
              [eco ? 'Tienda publicada' : 'Web publicada', `En ${esc(d.plazo)} desde que tenemos el material.`],
            ]),
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
}
