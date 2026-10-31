// Escribe la portada prerenderizada en dist/index.html y precarga la tipografía.
// Se ejecuta tras «vite build» y «vite build --ssr src/entry-server.tsx --outDir dist-ssr».
import { readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const { render } = await import(pathToFileURL(resolve(root, 'dist-ssr/entry-server.js')).href)
const file = resolve(root, 'dist/index.html')
let html = readFileSync(file, 'utf8')
if (!html.includes('<div id="root"></div>')) throw new Error('dist/index.html no tiene <div id="root"></div>')
html = html.replace('<div id="root"></div>', `<div id="root">${render()}</div>`)

// Precarga de Inter (subconjunto latino): el texto ya está en el HTML y así no espera a la fuente.
const font = readdirSync(resolve(root, 'dist/assets')).find((f) => /^inter-latin-wght-normal-.*\.woff2$/.test(f))
if (font) html = html.replace('</title>', `</title>\n    <link rel="preload" href="/assets/${font}" as="font" type="font/woff2" crossorigin />`)

writeFileSync(file, html)
rmSync(resolve(root, 'dist-ssr'), { recursive: true, force: true })
console.log(`Portada prerenderizada (${Math.round(html.length / 1024)} KB de HTML)${font ? ', fuente precargada' : ''}.`)
