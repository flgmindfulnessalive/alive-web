// Genera una propuesta comercial de ALIVE en PDF (A4) a partir de un archivo de datos.
//   node scripts/render-propuesta.mjs propuestas/datos/ejemplo-web-esencial.json
// Salida: propuestas/salida/<slug>.pdf (y el .html intermedio, para revisarlo en el navegador).
// Los campos sin definir (precio null, por ejemplo) se marcan en el PDF para que no salga incompleto sin querer.
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { buildProposal } from '../src/proposal/template.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dataPath = process.argv[2]
if (!dataPath) {
  console.error('Uso: node scripts/render-propuesta.mjs propuestas/datos/<archivo>.json')
  process.exit(1)
}
const d = JSON.parse(readFileSync(resolve(root, dataPath), 'utf8'))
const asset = (p) => pathToFileURL(resolve(root, p)).href

const html = buildProposal(d, { asset, wordmarkSvg: readFileSync(resolve(root, 'src/assets/brand/alive-wordmark.svg'), 'utf8') })

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
    // En una línea con otro texto (portada.enLinea), la imagen va en línea; si no, en bloque.
    const inline = el.closest('h1.en-linea')
    img.style.cssText = `display:${inline ? 'inline-block;vertical-align:bottom' : 'block'};width:${r.width}px;height:${r.height}px`
    el.replaceChildren(img)
    el.style.background = 'none' // sin texto, el degradado del contenedor se pintaría como un rectángulo
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
