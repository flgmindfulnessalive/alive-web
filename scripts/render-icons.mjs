// Genera el sistema de iconos a partir de la A del logotipo (src/assets/brand/paths.ts):
//   public/favicon.svg            A sola, fondo transparente, se adapta a pestañas claras/oscuras
//   public/favicon.ico            16/32/48 px, A blanca sobre placa oscura (Safari y navegadores antiguos)
//   public/apple-touch-icon.png   180 px, sin esquinas (iOS aplica su máscara)
//   public/icon-192.png, icon-512.png       PWA / Android ("any")
//   public/icon-maskable-512.png            Android adaptativo ("maskable", A dentro de la zona segura)
// Uso: npm run icons   (requiere Playwright con Chromium, y Python 3 + Pillow para el .ico)
import { createRequire } from 'node:module'
import { execFileSync, execSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
let chromium
try {
  ;({ chromium } = require('playwright'))
} catch {
  ;({ chromium } = createRequire(execSync('npm root -g').toString().trim() + '/')('playwright'))
}

const root = new URL('../', import.meta.url)
const paths = readFileSync(new URL('src/assets/brand/paths.ts', root), 'utf8')
const SYMBOL = paths.match(/SYMBOL_PATH =\s*'([^']+)'/)[1]

// Caja real del trazado de la A dentro de su viewBox 614×438.
const BOX = { x: 1.5, y: 2.5, w: 611, h: 433 }
const INK = '#F5F7FA'
const DARK = '#080F14'

// Transform que centra la A ocupando `fill` del ancho de un lienzo de `size`.
function place(size, fill, nudgeY = 0) {
  const s = (size * fill) / BOX.w
  const tx = (size - BOX.w * s) / 2 - BOX.x * s
  const ty = (size - BOX.h * s) / 2 - BOX.y * s + size * nudgeY
  return `translate(${tx.toFixed(3)} ${ty.toFixed(3)}) scale(${s.toFixed(5)})`
}

// Placa oscura con la A blanca. `radius` en fracción del lado (0 = cuadrado).
function tile(size, fill, radius) {
  const r = (size * radius).toFixed(2)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="${DARK}"/>
  <path fill="${INK}" transform="${place(size, fill, 0.01)}" d="${SYMBOL}"/>
</svg>`
}

// Favicon adaptable: la A casi a sangre, oscura en temas claros y blanca en oscuros.
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <style>path{fill:${DARK}}@media (prefers-color-scheme:dark){path{fill:${INK}}}</style>
  <path transform="${place(64, 0.96, 0.01)}" d="${SYMBOL}"/>
</svg>
`
writeFileSync(new URL('public/favicon.svg', root), faviconSvg)
console.log('public/favicon.svg')

const pngs = [
  // Tamaños del .ico: la A crece en proporción cuanto más pequeño es el icono.
  { name: 'ico-16', size: 16, fill: 0.84, radius: 0.2 },
  { name: 'ico-32', size: 32, fill: 0.8, radius: 0.22 },
  { name: 'ico-48', size: 48, fill: 0.78, radius: 0.22 },
  { name: 'public/apple-touch-icon.png', size: 180, fill: 0.62, radius: 0 },
  { name: 'public/icon-192.png', size: 192, fill: 0.66, radius: 0.22 },
  { name: 'public/icon-512.png', size: 512, fill: 0.66, radius: 0.22 },
  // Zona segura maskable: círculo del 80 % del lado; la A cabe holgada al 52 %.
  { name: 'public/icon-maskable-512.png', size: 512, fill: 0.52, radius: 0 },
]

const tmp = mkdtempSync(join(tmpdir(), 'alive-icons-'))
const browser = await chromium.launch()
const icoParts = []
for (const { name, size, fill, radius } of pngs) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(`<style>*{margin:0}svg{display:block}</style>${tile(size, fill, radius)}`)
  const png = await page.screenshot({ type: 'png', omitBackground: true })
  await page.close()
  if (name.startsWith('ico-')) {
    const p = join(tmp, `${name}.png`)
    writeFileSync(p, png)
    icoParts.push(p)
  } else {
    writeFileSync(new URL(name, root), png)
    console.log(name, Math.round(png.length / 1024) + ' KB')
  }
}
await browser.close()

// Empaqueta los tres PNG renderizados a su tamaño exacto en un único .ico.
execFileSync('python3', [
  '-I',
  '-c',
  `import sys
from PIL import Image
imgs=[Image.open(p).convert('RGBA') for p in sys.argv[2:]]
imgs[-1].save(sys.argv[1], format='ICO', sizes=[i.size for i in imgs], append_images=imgs[:-1])`,
  new URL('public/favicon.ico', root).pathname,
  ...icoParts,
])
console.log('public/favicon.ico (16, 32, 48)')
