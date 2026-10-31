// Renderiza las imágenes para compartir:
//   public/og-image.jpg            1200×630  (Open Graph: WhatsApp, LinkedIn, X, Facebook)
//   docs/social/alive-post-1080.jpg 1080×1080 (publicación cuadrada para Instagram / estados)
// La cinta real atraviesa el titular: una copia va detrás del texto y otra,
// recortada en diagonal, pasa por delante.
// Uso: npm run social   (requiere Playwright con Chromium)
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync } from 'node:fs'
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
const DOMAIN = 'alivedigital.agency'
const RIBBON = file('src/assets/visual/sculpture-closing.webp')
// Punto (en coordenadas de la imagen de la cinta) donde la cinta pasa por delante del titular.
const FRONT_OG = process.env.FRONT_OG ?? '330px 420px'
const FRONT_SQ = process.env.FRONT_SQ ?? '900px 700px'

const wordmark = readFileSync(new URL('src/assets/brand/alive-wordmark.svg', root), 'utf8')

const css = (W, H) => `
@font-face { font-family: Inter; src: url(${file('node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')}) format('woff2'); font-weight: 100 900; }
* { box-sizing: border-box; margin: 0; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
body { position: relative; background: #04070b; font-family: Inter, sans-serif; color: #F5F7FA; -webkit-font-smoothing: antialiased; }
.abs { position: absolute; }
svg { display: block; width: 100%; height: auto; }
.glow { inset: 0; background:
  radial-gradient(55% 60% at 78% 40%, rgba(59,130,246,.30), transparent 70%),
  radial-gradient(35% 40% at 92% 85%, rgba(20,217,208,.16), transparent 70%),
  radial-gradient(40% 50% at 10% 100%, rgba(139,92,246,.14), transparent 70%); }
.ribbon { mix-blend-mode: screen; }
.title { font-weight: 500; letter-spacing: -.045em; line-height: .92; }
.eyebrow { font-size: 15px; font-weight: 500; letter-spacing: .22em; color: #A1A1AA; }
.rule { height: 2px; background: linear-gradient(90deg,#3B82F6,#8B5CF6,#14D9D0); }
.pill { display: inline-flex; align-items: center; gap: 12px; padding: 14px 22px; border-radius: 99px;
  background: rgba(8,15,20,.6); border: 1px solid rgba(245,247,250,.35); backdrop-filter: blur(8px); font-size: 20px; font-weight: 500; }
.grain::after { content: ''; position: absolute; inset: 0; opacity: .14; mix-blend-mode: overlay; pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 1 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
`

// ——— 1200×630 ———
const og = `<style>${css(1200, 630)}</style>
<body class="grain">
  <div class="abs glow"></div>
  <!-- Cinta detrás del titular -->
  <img class="abs ribbon" src="${RIBBON}" style="left:200px;top:-50px;width:1400px;filter:saturate(1.15);
       -webkit-mask-image:linear-gradient(to bottom,#000 70%,transparent 96%),linear-gradient(to right,transparent,#000 22%);-webkit-mask-composite:source-in">
  <div class="abs" style="left:72px;top:64px;width:170px">${wordmark}</div>
  <div class="abs eyebrow" style="right:72px;top:72px;color:#E4E7EC;text-shadow:0 2px 12px rgba(4,7,11,.8)">ESTUDIO DE INTELIGENCIA CREATIVA</div>

  <div class="abs title" style="left:66px;top:178px;font-size:132px;text-shadow:0 10px 60px rgba(4,7,11,.65)">Ideas que<br>cobran vida.</div>

  <!-- La misma cinta pasa por delante de «cobran» -->
  <img class="abs" src="${RIBBON}" style="left:200px;top:-50px;width:1400px;filter:saturate(1.15);
       -webkit-mask-image:radial-gradient(ellipse 120px 150px at ${FRONT_OG}, #000 35%, transparent 100%)">

  <div class="abs" style="left:72px;bottom:66px;display:flex;align-items:center;gap:18px">
    <div class="rule" style="width:46px"></div>
    <div style="font-size:21px;letter-spacing:.06em;color:#D6D9DF">Estrategia. Creatividad. Tecnología.</div>
  </div>
  <div class="abs pill" style="right:72px;bottom:52px">${DOMAIN} <span style="color:#7cb2ff">→</span></div>
</body>`

// ——— 1080×1080 ———
const square = `<style>${css(1080, 1080)}</style>
<body class="grain">
  <div class="abs glow" style="background:
    radial-gradient(60% 50% at 70% 35%, rgba(59,130,246,.32), transparent 70%),
    radial-gradient(40% 40% at 90% 95%, rgba(20,217,208,.18), transparent 70%),
    radial-gradient(45% 45% at 5% 80%, rgba(139,92,246,.18), transparent 70%)"></div>
  <img class="abs ribbon" src="${RIBBON}" style="left:-520px;top:40px;width:2000px;filter:saturate(1.15);
       -webkit-mask-image:linear-gradient(to bottom,transparent 4%,#000 22%,#000 78%,transparent 97%)">
  <div class="abs" style="left:80px;top:84px;width:200px">${wordmark}</div>
  <div class="abs eyebrow" style="right:80px;top:96px">ESTRATEGIA · DISEÑO · TECNOLOGÍA · IA</div>

  <div class="abs title" style="left:74px;top:560px;font-size:150px;text-shadow:0 10px 60px rgba(4,7,11,.7)">Ideas que<br>cobran vida.</div>
  <img class="abs" src="${RIBBON}" style="left:-520px;top:40px;width:2000px;filter:saturate(1.15);
       -webkit-mask-image:radial-gradient(ellipse 150px 170px at ${FRONT_SQ}, #000 35%, transparent 100%)">

  <div class="abs" style="left:80px;bottom:84px;display:flex;align-items:center;gap:18px">
    <div class="rule" style="width:52px"></div>
    <div style="font-size:24px;letter-spacing:.06em;color:#D6D9DF">Estudio de inteligencia creativa</div>
  </div>
  <div class="abs pill" style="right:80px;bottom:68px;font-size:22px">${DOMAIN} <span style="color:#7cb2ff">→</span></div>
</body>`

const dir = mkdtempSync(join(tmpdir(), 'alive-social-'))
mkdirSync(new URL('docs/social/', root), { recursive: true })
const browser = await chromium.launch()
for (const [name, html, W, H, out] of [
  ['og', og, 1200, 630, 'public/og-image.jpg'],
  ['square', square, 1080, 1080, 'docs/social/alive-post-1080.jpg'],
]) {
  const htmlPath = join(dir, `${name}.html`)
  writeFileSync(htmlPath, `<!doctype html><meta charset="utf-8">${html}`)
  const page = await browser.newPage({ viewport: { width: W, height: H } })
  await page.goto(pathToFileURL(htmlPath).href)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)
  const jpg = await page.screenshot({ type: 'jpeg', quality: 88 })
  writeFileSync(new URL(out, root), jpg)
  console.log(out, Math.round(jpg.length / 1024) + ' KB')
  await page.close()
}
await browser.close()
