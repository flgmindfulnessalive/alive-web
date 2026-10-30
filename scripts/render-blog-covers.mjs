// Genera la imagen para compartir de cada artículo: public/blog/<slug>.jpg (1200×630).
// Usa el título del artículo, la marca y la escultura reales.
// Uso: npm run blog-covers   (requiere Playwright con Chromium)
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
import { readFileSync, readdirSync, writeFileSync, mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
let chromium
try {
  ;({ chromium } = require('playwright'))
} catch {
  ;({ chromium } = createRequire(execSync('npm root -g').toString().trim() + '/')('playwright'))
}

const root = new URL('../', import.meta.url)
const file = (p) => new URL(p, root).href
const paths = readFileSync(new URL('src/assets/brand/paths.ts', root), 'utf8')
const WORDMARK = paths.match(/WORDMARK_PATH =\s*'([^']+)'/)[1]
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

const posts = readdirSync(new URL('content/blog/', root))
  .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
  .map((f) => {
    const raw = readFileSync(new URL(`content/blog/${f}`, root), 'utf8')
    const title = raw.match(/^title:\s*(.+)$/m)[1].trim()
    return { slug: f.replace(/\.md$/, ''), title }
  })

const page = (title) => `<!doctype html><meta charset="utf-8"><style>
@font-face { font-family: Inter; src: url(${file('node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')}) format('woff2'); font-weight: 100 900; }
* { box-sizing: border-box; margin: 0; }
html, body { width: 1200px; height: 630px; overflow: hidden; }
body { position: relative; background: #04070b; color: #F5F7FA; font-family: Inter, sans-serif; -webkit-font-smoothing: antialiased; }
.abs { position: absolute; }
svg { display: block; width: 100%; height: auto; }
</style>
<div class="abs" style="inset:0;background:radial-gradient(55% 70% at 85% 30%, rgba(59,130,246,.28), transparent 70%),radial-gradient(35% 45% at 95% 95%, rgba(20,217,208,.14), transparent 70%)"></div>
<img class="abs" src="${file('src/assets/visual/sculpture-hero.webp')}" style="right:-120px;top:-40px;width:720px;mix-blend-mode:screen;opacity:.9;-webkit-mask-image:linear-gradient(to right,transparent,#000 38%),linear-gradient(to bottom,#000 70%,transparent 96%);-webkit-mask-composite:source-in">
<div class="abs" style="left:72px;top:64px;width:150px">${`<svg viewBox="0 0 547 107"><path fill="#F5F7FA" fill-rule="evenodd" d="${WORDMARK}"/></svg>`}</div>
<div class="abs" style="left:72px;top:150px;display:flex;align-items:center;gap:16px;font-size:16px;font-weight:500;letter-spacing:.22em;color:#C9CED6">
  BLOG <span style="width:40px;height:2px;background:linear-gradient(90deg,#3B82F6,#8B5CF6)"></span>
</div>
<div class="abs" style="left:72px;top:196px;width:720px;font-size:60px;font-weight:500;letter-spacing:-.035em;line-height:1.04;text-wrap:balance;text-shadow:0 8px 40px rgba(4,7,11,.7)">${esc(title)}</div>
<div class="abs" style="left:72px;bottom:64px;display:flex;align-items:center;gap:14px;font-size:20px;color:#D6D9DF">
  Por Francesco Lulli <span style="color:#6b7280">·</span> alivedigital.agency
</div>`

mkdirSync(new URL('public/blog/', root), { recursive: true })
const dir = mkdtempSync(join(tmpdir(), 'alive-covers-'))
const browser = await chromium.launch()
for (const p of posts) {
  const htmlPath = join(dir, `${p.slug}.html`)
  writeFileSync(htmlPath, page(p.title))
  const tab = await browser.newPage({ viewport: { width: 1200, height: 630 } })
  await tab.goto(pathToFileURL(htmlPath).href)
  await tab.evaluate(() => document.fonts.ready)
  await tab.waitForTimeout(200)
  const jpg = await tab.screenshot({ type: 'jpeg', quality: 86 })
  writeFileSync(new URL(`public/blog/${p.slug}.jpg`, root), jpg)
  console.log(`public/blog/${p.slug}.jpg`, Math.round(jpg.length / 1024) + ' KB')
  await tab.close()
}
await browser.close()
