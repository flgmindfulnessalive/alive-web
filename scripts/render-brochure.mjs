// Genera el brochure corporativo de ALIVE en PDF panorámico (16:9, 1600 × 900 px por página).
//   node scripts/render-brochure.mjs
// Salida: brochure/salida/ALIVE-brochure.pdf (y el .html intermedio, para revisarlo en el navegador).
// Todos los textos salen de src/content/site.ts: si cambia la web, se vuelve a generar y queda al día.
// Contacto: solo nombre, WhatsApp y web (sin correo), por decisión de Francesco.
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createServer } from 'vite'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const asset = (p) => pathToFileURL(resolve(root, p)).href
const img = (name) => asset(`src/assets/visual/${name}.webp`)

// Contenido de la web (TypeScript + JSON) cargado con Vite, sin servidor HTTP.
const vite = await createServer({ root, logLevel: 'error', server: { middlewareMode: true, hmr: false }, appType: 'custom' })
const site = await vite.ssrLoadModule('/src/content/site.ts')
const { WHATSAPP, WHATSAPP_ICON } = await vite.ssrLoadModule('/src/content/whatsapp.ts')
await vite.close()
const { brand, hero, capabilities, manifesto, studio, process: steps, work, contact } = site

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const svg = (p) => readFileSync(resolve(root, p), 'utf8').replace(/#F5F7FA/gi, 'currentColor')
const wordmark = svg('src/assets/brand/alive-wordmark.svg')
const WEB = 'alivedigital.agency'

// Resalta una palabra con el degradado de marca (se rasteriza al exportar).
const accent = (text, word) => esc(text).replace(word, `<span class="grad">${word}</span>`)
const cases = ['flow-talent-hub', 'wewebinars', 'glus', 'suzuki-vitara-vive', 'activa-tu-vida-x39']
const byId = Object.fromEntries(work.projects.map((p) => [p.id, p]))
for (const id of cases) if (!byId[id]) console.warn(`Aviso: no encuentro el proyecto «${id}» en site.ts (ids: ${Object.keys(byId).join(', ')})`)
const explorations = work.projects.filter((p) => p.kind === 'exploration')

const pages = []
const TOTAL = () => pages.length
const page = (cls, section, body) => pages.push({ cls, section, body })
const pad = (n) => String(n).padStart(2, '0')

// 1 · Portada
page(
  'dark cover',
  null,
  `
  <img class="cover__art" src="${img('sculpture-hero')}" alt="">
  <div class="cover__fade"></div>
  <div class="cover__brand">${wordmark}</div>
  <div class="cover__text">
    <p class="eyebrow">${esc(hero.eyebrow)}</p>
    <h1 class="display">${esc(hero.titleLines[0])}<br>${accent(hero.titleLines[1], hero.titleAccent + '.')}</h1>
    <p class="lead">${esc(hero.description)}</p>
  </div>
  <div class="cover__foot"><span>${esc(brand.signature)}</span><span>${WEB}</span></div>`,
)

// 2 · Manifiesto
page(
  'dark manifesto',
  'Nosotros',
  `
  <img class="manifesto__art" src="${img('sculpture-closing')}" alt="">
  <div class="manifesto__fade"></div>
  <h2 class="manifesto__text">${esc(manifesto.lead)}<br><span class="grad">${esc(manifesto.accent)}</span></h2>`,
)

// 3 · Estudio
page(
  'light studio',
  'Nosotros',
  `
  <div class="studio__top">
    <h2 class="h-xl">${esc(studio.title)}</h2>
    <div class="studio__copy">
      <p>${esc(studio.since.text)}</p>
      <p>${esc(studio.text)}</p>
    </div>
  </div>
  <div class="studio__since">
    <div class="since__year"><span class="since__label">${esc(studio.since.label)}</span><span class="since__num">${studio.since.year}</span></div>
    <div class="since__meta">
      <div class="rule-grad"></div>
      <p class="since__years">${esc(studio.since.years)}</p>
      <p class="since__founder">${esc(studio.since.founder)}</p>
    </div>
  </div>`,
)

// 4 · Expertise
page(
  'dark expertise',
  hero.capabilitiesLabel,
  `
  <p class="eyebrow">${esc(hero.capabilitiesLabel)}</p>
  <p class="statement">${esc(hero.description)}</p>
  <ol class="caps">
    ${capabilities.map((c, i) => `<li><span class="caps__n">${pad(i + 1)}</span><span class="caps__name">${esc(c)}</span></li>`).join('')}
  </ol>`,
)

// 5 · Servicios
page(
  'light services',
  'Servicios',
  `
  <p class="eyebrow eyebrow--dark">Servicios</p>
  <h2 class="h-xl">${esc(brand.signature)}</h2>
  <div class="services__grid">
    ${studio.services
      .map(
        (s) => `<article class="service">
      <span class="service__n grad">${esc(s.number)}</span>
      <h3>${esc(s.name)}</h3>
      <p class="service__text">${esc(s.text)}</p>
      <div class="service__scope"><span>Alcance</span><p>${esc(s.scope)}</p></div>
    </article>`,
      )
      .join('')}
  </div>`,
)

// 6 · Proceso
page(
  'dark process',
  'Proceso',
  `
  <p class="eyebrow">Proceso</p>
  <h2 class="h-xl">${esc(steps.title)}</h2>
  <ol class="steps">
    ${steps.steps
      .map(
        (s, i) => `<li class="step">
      <span class="step__n">${pad(i + 1)}</span>
      <span class="step__dot"></span>
      <h3>${esc(s.name)}</h3>
      <p>${esc(s.text)}</p>
    </li>`,
      )
      .join('')}
  </ol>`,
)

// 7 · Índice de proyectos (los números de página se completan al final)
const index = [...cases.filter((id) => byId[id]), ...explorations.map((p) => p.id)]
page(
  'dark work',
  'Proyectos',
  `
  <div class="work__head">
    <p class="eyebrow">Proyectos</p>
    <h2 class="display display--md">${esc(work.title)}</h2>
    <p class="lead">${esc(work.description)}</p>
  </div>
  <ol class="work__list">
    ${index
      .map(
        (id, i) => `<li><span class="work__n">${pad(i + 1)}</span><span class="work__t">${esc(byId[id].title)}</span><span class="work__d">${esc(
          byId[id].discipline,
        )}</span><span class="work__p" data-page="${id}"></span></li>`,
      )
      .join('')}
  </ol>`,
)

const caseHead = (p, n) => `
  <p class="case__n">${pad(n)}</p>
  <h2 class="case__title">${esc(p.title)}</h2>
  <p class="case__disc">${esc(p.discipline)}</p>`
const figure = (name, p, cls = '') => `<figure class="shot ${cls}"><img src="${img(name)}" alt="${esc(p.alt)}"></figure>`
const n = (id) => index.indexOf(id) + 1

// 8–9 · FLOW: portada del caso + detalle
{
  const p = byId['flow-talent-hub']
  page(
    'dark feature',
    'Proyectos',
    `<div class="feature__text" data-case="${p.id}">${caseHead(p, n(p.id))}<p class="case__sum">${esc(p.summary)}</p></div>
    <img class="feature__art" src="${img('project-flow-1497')}" alt="${esc(p.alt)}">`,
  )
  page(
    'dark pair',
    'Proyectos',
    `<div class="pair__cap"><span>${esc(p.title)}</span><span>${esc(p.discipline)}</span></div>
    <div class="pair__grid">${figure('project-flow-dispositivos-1536', p)}${figure('project-flow-papeleria-1000', p)}</div>`,
  )
}

// 10–11 · WeWebinars
{
  const p = byId.wewebinars
  page(
    'dark feature',
    'Proyectos',
    `<div class="feature__text" data-case="${p.id}">${caseHead(p, n(p.id))}<p class="case__sum">${esc(p.summary)}</p></div>
    <img class="feature__art" src="${img('project-wewebinars-papeleria-1499')}" alt="${esc(p.alt)}">`,
  )
  page(
    'dark pair',
    'Proyectos',
    `<div class="pair__cap"><span>${esc(p.title)}</span><span>${esc(p.discipline)}</span></div>
    <div class="pair__grid">${figure('project-wewebinars-web-1000', p)}${figure('project-wewebinars-campana-1000', p)}</div>`,
  )
}

// 12 · GLUS, 13 · Vitara, 14 · Activa: texto arriba, imágenes abajo
const rowCase = (id, shots, cls = '') => {
  const p = byId[id]
  if (!p) return
  page(
    `dark row ${cls}`,
    'Proyectos',
    `<div class="row__head" data-case="${p.id}">
      <div>${caseHead(p, n(p.id))}</div>
      <p class="case__sum">${esc(p.summary)}</p>
    </div>
    <div class="row__shots">${shots.map((s) => figure(s, p)).join('')}</div>`,
  )
}
rowCase('glus', ['project-glus-web-1536', 'project-glus-campana-1536'])
rowCase(
  'suzuki-vitara-vive',
  ['project-vitara-inicio-850', 'project-vitara-personaliza-850', 'project-vitara-galeria-850', 'project-vitara-tableta-850'],
  'row--four',
)
rowCase('activa-tu-vida-x39', ['project-activa-landing-1536', 'project-activa-simulador-1536'])

// 15 · Exploraciones del estudio
page(
  'light explore',
  'Proyectos',
  `<div class="explore__grid">
    ${explorations
      .map(
        (p) => `<article data-case="${p.id}">
      <figure class="shot"><img src="${img(p.visual === 'web' ? 'concept-web-2400' : 'concept-identity-2400')}" alt="${esc(p.alt)}"></figure>
      <div class="explore__text">
        <p class="case__n">${pad(n(p.id))} · Exploración del estudio</p>
        <h3>${esc(p.title)}</h3>
        <p class="case__disc">${esc(p.discipline)}</p>
        <p class="case__sum">${esc(p.summary)}</p>
      </div>
    </article>`,
      )
      .join('')}
  </div>`,
)

// 16 · Cierre y contacto (sin correo: nombre, WhatsApp y web)
page(
  'dark closing',
  'Contacto',
  `
  <img class="closing__art" src="${img('sculpture-closing')}" alt="">
  <div class="closing__fade"></div>
  <div class="closing__text">
    <p class="eyebrow">Contacto</p>
    <h2 class="display display--md">${accent(contact.title, 'vida')}</h2>
    <p class="lead">${esc(contact.text)}</p>
  </div>
  <div class="closing__contact">
    <div><span class="k">Fundador</span><span class="v">${esc(brand.founder)}</span></div>
    <a href="https://wa.me/${WHATSAPP.number}"><span class="k"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${WHATSAPP_ICON}"/></svg>WhatsApp</span><span class="v">${esc(WHATSAPP.display)}</span></a>
    <a href="https://${WEB}"><span class="k">Web</span><span class="v">${WEB}</span></a>
  </div>
  <div class="closing__mark">${wordmark}</div>`,
)

// Número de página de cada caso para el índice.
const caseAt = {}
pages.forEach((pg, i) => {
  for (const m of pg.body.matchAll(/data-case="([^"]+)"/g)) caseAt[m[1]] ??= i + 1
})

const body = pages
  .map((pg, i) => {
    const chrome =
      pg.section === null
        ? ''
        : `<header class="chrome"><span class="chrome__mark">${wordmark}</span><span class="chrome__sec">${esc(pg.section)}<i></i>${pad(i + 1)} / ${pad(TOTAL())}</span></header>`
    const html = pg.body.replace(/<span class="work__p" data-page="([^"]+)"><\/span>/g, (_, id) => `<span class="work__p">${pad(caseAt[id] ?? 0)}</span>`)
    return `<section class="s ${pg.cls}">${chrome}${html}</section>`
  })
  .join('\n')

const css = readFileSync(resolve(root, 'scripts/brochure.css'), 'utf8').replace(
  '__FONT__',
  asset('node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'),
)
const doc = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>ALIVE · ${esc(brand.signature)}</title>
<style>${css}</style></head><body>${body}</body></html>`

const outDir = resolve(root, 'brochure/salida')
mkdirSync(outDir, { recursive: true })
const htmlPath = resolve(outDir, 'ALIVE-brochure.html')
writeFileSync(htmlPath, doc)

const require = createRequire(`${execSync('npm root -g').toString().trim()}/`)
const { chromium } = require('playwright')
const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] })
const pw = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 3 })
await pw.goto(pathToFileURL(htmlPath).href)
await pw.evaluate(() => document.fonts.ready)
await pw.waitForFunction(() => [...document.images].every((i) => i.complete))

// Texto con degradado: se captura tal como se ve (fondo transparente, 3×) y se sustituye por la imagen.
await pw.addStyleTag({
  content: `html:has(.captura), .captura { background: transparent !important; }
    .captura .s, .captura .s * { background-color: transparent !important; }
    .captura .s { background-image: none !important; }
    .captura img, .captura .cover__fade, .captura .manifesto__fade, .captura .closing__fade { visibility: hidden !important; }`,
})
await pw.evaluate(() => document.body.classList.add('captura'))
const grads = pw.locator('.grad')
const shots = []
for (let i = 0; i < (await grads.count()); i++) shots.push((await grads.nth(i).screenshot({ omitBackground: true })).toString('base64'))
await pw.evaluate((shots) => {
  document.querySelectorAll('.grad').forEach((el, i) => {
    const r = el.getBoundingClientRect()
    const im = new Image()
    im.src = `data:image/png;base64,${shots[i]}`
    im.alt = el.textContent
    im.style.cssText = `display:inline-block;vertical-align:top;width:${r.width}px;height:${r.height}px`
    el.replaceChildren(im)
    el.style.background = 'none'
  })
  document.body.classList.remove('captura')
}, shots)
await pw.waitForFunction(() => [...document.images].every((i) => i.complete))

// Las fotos se incrustan como JPEG (calidad 0,86, máx. 2400 px): el PDF pesa varias veces menos sin pérdida visible.
await pw.evaluate(async () => {
  for (const im of [...document.images].filter((i) => !i.src.startsWith('data:'))) {
    const k = Math.min(1, 2400 / im.naturalWidth)
    const c = Object.assign(document.createElement('canvas'), { width: Math.round(im.naturalWidth * k), height: Math.round(im.naturalHeight * k) })
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height)
    im.src = c.toDataURL('image/jpeg', 0.86)
    await im.decode()
  }
})

// Control de desbordes: nada de texto fuera de su página.
const overflow = await pw.evaluate(() =>
  [...document.querySelectorAll('.s')].flatMap((s, i) => {
    const box = s.getBoundingClientRect()
    const bad = [...s.querySelectorAll('h1, h2, h3, p, li, figure')].some((el) => {
      const r = el.getBoundingClientRect()
      return r.bottom > box.bottom - 24 || r.right > box.right - 24 + (el.closest('.shot, .feature__art') ? 24 : 0)
    })
    return bad ? [i + 1] : []
  }),
)
if (overflow.length) console.warn(`Aviso: contenido desbordado en la página ${overflow.join(', ')}`)

const pdfPath = resolve(outDir, 'ALIVE-brochure.pdf')
await pw.pdf({ path: pdfPath, printBackground: true, preferCSSPageSize: true })
// Vista previa por página (para revisar sin abrir el PDF).
if (process.argv.includes('--png')) {
  const sections = pw.locator('.s')
  for (let i = 0; i < (await sections.count()); i++) {
    await sections.nth(i).screenshot({ path: resolve(outDir, `pagina-${String(i + 1).padStart(2, '0')}.png`), scale: 'css' })
  }
}
await browser.close()
console.log(`PDF: ${pdfPath} (${pages.length} páginas)`)
