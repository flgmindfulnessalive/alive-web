// Renderiza las dos «Exploraciones visuales» como imágenes (WebP 1200 y 2400 px).
// Cada escena se compone en HTML/CSS (perspectiva, luz, sombras, grano) con la
// marca, la escultura y la tipografía reales, y se captura con Chromium.
// Uso: npm run explorations   (requiere Playwright con Chromium)
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
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
const SYMBOL = paths.match(/SYMBOL_PATH =\s*'([^']+)'/)[1]

const wordmark = (fill, extra = '') =>
  `<svg viewBox="0 0 547 107" ${extra}><path fill="${fill}" fill-rule="evenodd" d="${WORDMARK}"/></svg>`
const symbol = (fill, extra = '') => `<svg viewBox="0 0 614 438" ${extra}><path fill="${fill}" d="${SYMBOL}"/></svg>`

const W = 1600
const H = 1120
const HERO = file('src/assets/visual/sculpture-hero.webp')
const RIBBON = file('src/assets/visual/sculpture-closing.webp')

const base = `
<style>
@font-face { font-family: Inter; src: url(${file('node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')}) format('woff2'); font-weight: 100 900; }
* { box-sizing: border-box; margin: 0; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
body { font-family: Inter, sans-serif; -webkit-font-smoothing: antialiased; position: relative; }
.abs { position: absolute; }
svg { display: block; width: 100%; height: auto; }
.grain::after { content: ''; position: absolute; inset: 0; pointer-events: none; opacity: var(--grain, .18); mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 1 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
</style>`

// ——— Escena 1: experiencia web (escritorio + móvil flotando en un espacio oscuro) ———
function siteDesktop() {
  return `
  <div style="position:absolute;inset:0;background:radial-gradient(120% 90% at 80% 0%,#0f1d33 0%,#080f14 55%);overflow:hidden">
    <img src="${HERO}" style="position:absolute;right:-40px;top:70px;width:600px;-webkit-mask-image:linear-gradient(to right,transparent,#000 30%),linear-gradient(to bottom,transparent,#000 18%,#000 72%,transparent);-webkit-mask-composite:source-in">
    <div style="position:absolute;z-index:1;left:56px;right:56px;top:34px;display:flex;align-items:center;gap:36px;color:#c9ced6;font-size:13px">
      <div style="width:96px">${wordmark('#F5F7FA')}</div>
      <span>Estudio</span><span>Servicios</span><span>Proyectos</span>
      <span style="margin-left:auto;border:1px solid rgba(245,247,250,.45);border-radius:99px;padding:8px 16px;color:#F5F7FA">Hablemos →</span>
    </div>
    <div style="position:absolute;left:56px;top:150px;color:#F5F7FA">
      <div style="font-size:10px;letter-spacing:.18em;color:#a1a1aa">EXPLORACIÓN 01 · EXPERIENCIA DIGITAL</div>
      <div style="width:28px;height:2px;margin:14px 0 26px;background:linear-gradient(90deg,#3B82F6,#8B5CF6)"></div>
      <div style="font-size:66px;line-height:1;letter-spacing:-.035em;font-weight:450;max-width:520px">Experiencias que se sienten vivas.</div>
      <div style="margin-top:22px;font-size:15px;line-height:1.5;color:#a1a1aa;max-width:380px">Estrategia, diseño y tecnología en una misma conversación, de la primera idea al lanzamiento.</div>
      <div style="margin-top:30px;display:flex;gap:22px;align-items:center;font-size:13px">
        <span style="background:#2563EB;border-radius:99px;padding:12px 20px">Empezar un proyecto →</span>
        <span style="border-bottom:1px solid #F5F7FA;padding-bottom:3px">Ver capacidades</span>
      </div>
    </div>
    <div style="position:absolute;left:56px;right:56px;bottom:30px;border-top:1px solid rgba(245,247,250,.22);padding-top:16px;display:flex;gap:18px;font-size:10px;letter-spacing:.16em;color:#F5F7FA">
      <span>ESTRATEGIA</span><span style="color:#a1a1aa">/</span><span>DISEÑO</span><span style="color:#a1a1aa">/</span><span>TECNOLOGÍA</span><span style="color:#a1a1aa">/</span><span>IA</span>
    </div>
  </div>`
}

function siteMobile() {
  return `
  <div style="position:absolute;inset:0;background:#080f14;overflow:hidden;color:#F5F7FA">
    <img src="${HERO}" style="position:absolute;left:-60px;bottom:30px;width:440px;-webkit-mask-image:linear-gradient(to bottom,transparent,#000 30%)">
    <div style="position:absolute;left:22px;right:22px;top:52px;display:flex;align-items:center">
      <div style="width:64px">${wordmark('#F5F7FA')}</div>
      <div style="margin-left:auto;width:18px;height:8px;border-top:1.5px solid #F5F7FA;border-bottom:1.5px solid #F5F7FA"></div>
    </div>
    <div style="position:absolute;z-index:1;left:22px;right:22px;top:118px">
      <div style="font-size:8px;letter-spacing:.18em;color:#a1a1aa">EXPLORACIÓN 01</div>
      <div style="margin-top:14px;font-size:34px;line-height:1.02;letter-spacing:-.035em;font-weight:450">Experiencias que se sienten vivas.</div>
      <div style="margin-top:18px;display:inline-block;background:#2563EB;border-radius:99px;padding:10px 16px;font-size:11px">Empezar un proyecto →</div>
    </div>
  </div>`
}

const webScene = `${base}
<body class="grain" style="--grain:.12;background:#05080c">
  <div class="abs" style="inset:0;background:
     radial-gradient(60% 55% at 62% 38%, rgba(59,130,246,.22), transparent 70%),
     radial-gradient(40% 40% at 85% 70%, rgba(20,217,208,.12), transparent 70%),
     linear-gradient(#070b11 0 64%, #0b121c 64% 100%)"></div>
  <img src="${RIBBON}" class="abs" style="left:180px;top:120px;width:1500px;filter:blur(70px) saturate(1.4);opacity:.55">
  <div class="abs" style="left:0;right:0;top:64%;height:1px;background:linear-gradient(90deg,transparent,rgba(245,247,250,.12),transparent)"></div>

  <div class="abs" style="left:0;top:0;width:${W}px;height:${H}px;perspective:2200px;perspective-origin:50% 40%">
    <!-- Monitor -->
    <div class="abs" style="left:150px;top:150px;width:1060px;height:663px;transform:rotateY(16deg) rotateX(3deg);transform-origin:50% 50%;transform-style:preserve-3d">
      <div class="abs" style="inset:-14px;border-radius:22px;background:linear-gradient(145deg,#2a2f36,#0c0e11 40%,#05070a);box-shadow:0 60px 120px rgba(0,0,0,.65),0 0 0 1px rgba(255,255,255,.06) inset"></div>
      <div class="abs" style="inset:0;border-radius:10px;overflow:hidden">${siteDesktop()}
        <div class="abs" style="inset:0;background:linear-gradient(115deg,rgba(255,255,255,.10) 0%,rgba(255,255,255,0) 32%,rgba(255,255,255,0) 70%,rgba(255,255,255,.04) 100%)"></div>
      </div>
    </div>
    <!-- Reflejo del monitor en el suelo -->
    <div class="abs" style="left:150px;top:840px;width:1060px;height:663px;transform:rotateY(16deg) rotateX(3deg) scaleY(-1);transform-origin:50% 0;opacity:.14;filter:blur(3px);-webkit-mask-image:linear-gradient(to bottom,#000,transparent 35%);border-radius:10px;overflow:hidden">${siteDesktop()}</div>

    <!-- Teléfono -->
    <div class="abs" style="left:1130px;top:330px;width:300px;height:620px;transform:rotateY(-22deg) rotateX(4deg) rotateZ(1deg);transform-style:preserve-3d">
      <div class="abs" style="inset:-10px;border-radius:52px;background:linear-gradient(150deg,#3a4049,#14171b 35%,#07090c);box-shadow:-30px 50px 90px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.08) inset"></div>
      <div class="abs" style="inset:0;border-radius:44px;overflow:hidden">${siteMobile()}
        <div class="abs" style="left:50%;top:14px;width:96px;height:28px;margin-left:-48px;border-radius:20px;background:#000"></div>
        <div class="abs" style="inset:0;background:linear-gradient(120deg,rgba(255,255,255,.14),rgba(255,255,255,0) 38%)"></div>
      </div>
    </div>
    <div class="abs" style="left:1110px;top:950px;width:360px;height:40px;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.7),transparent);filter:blur(6px)"></div>
  </div>
  <div class="abs" style="inset:0;background:radial-gradient(120% 100% at 50% 40%,transparent 55%,rgba(0,0,0,.55))"></div>
</body>`

// ——— Escena 2: identidad (papelería sobre superficie marfil con luz de ventana) ———
const shadow = (d = 1) =>
  `box-shadow:0 ${1 * d}px ${2 * d}px rgba(30,24,16,.28),0 ${10 * d}px ${24 * d}px rgba(30,24,16,.18),0 ${36 * d}px ${70 * d}px rgba(30,24,16,.16)`

const identityScene = `${base}
<body class="grain" style="--grain:.22;background:#e9e5dc">
  <div class="abs" style="inset:0;background:radial-gradient(90% 80% at 40% 30%,#f3f0ea,#e2ddd2 70%,#d6d0c3)"></div>

  <!-- Cuaderno negro con la A en relieve -->
  <div class="abs" style="left:150px;top:60px;width:500px;height:660px;transform:rotate(-12deg);border-radius:6px 10px 10px 6px;background:
      repeating-linear-gradient(45deg,rgba(255,255,255,.018) 0 2px,transparent 2px 4px),linear-gradient(160deg,#1a1d22,#0d0f12);${shadow(1.4)}">
    <div class="abs" style="left:0;top:0;bottom:0;width:22px;border-radius:6px 0 0 6px;background:linear-gradient(90deg,#08090b,#16191d)"></div>
    <div class="abs" style="left:205px;top:300px;width:110px;filter:drop-shadow(0 1px 0 rgba(255,255,255,.10)) drop-shadow(0 -1px 0 rgba(0,0,0,.6))">${symbol('#101215')}</div>
  </div>

  <!-- Sobre oscuro con la escultura impresa -->
  <div class="abs" style="left:860px;top:600px;width:640px;height:410px;transform:rotate(-7deg);border-radius:4px;background:#111419;overflow:hidden;${shadow(1.2)}">
    <img src="${RIBBON}" style="position:absolute;left:-120px;top:-60px;width:900px">
    <div class="abs" style="inset:0;background:linear-gradient(200deg,rgba(255,255,255,.08),transparent 40%)"></div>
    <svg viewBox="0 0 640 410" class="abs" style="inset:0;width:100%;height:100%"><path d="M0 0 320 230 640 0" fill="none" stroke="rgba(0,0,0,.45)" stroke-width="2"/><path d="M0 2 320 232 640 2" fill="none" stroke="rgba(255,255,255,.06)"/></svg>
    <div class="abs" style="left:40px;bottom:36px;width:120px">${wordmark('#F5F7FA')}</div>
  </div>

  <!-- Tarjetas: anverso oscuro con wordmark -->
  <div class="abs" style="left:560px;top:420px;width:420px;height:252px;transform:rotate(-17deg);border-radius:3px;background:linear-gradient(160deg,#16191e,#0b0d10);${shadow(1)}">
    <div class="abs" style="left:110px;top:92px;width:200px">${wordmark('#F5F7FA')}</div>
    <div class="abs" style="left:0;right:0;top:156px;text-align:center;font-size:11px;letter-spacing:.32em;color:#b9bdc4">ESTRATEGIA. CREATIVIDAD. TECNOLOGÍA.</div>
  </div>
  <!-- Tarjeta: reverso con la escultura -->
  <div class="abs" style="left:640px;top:150px;width:420px;height:252px;transform:rotate(9deg);border-radius:3px;background:#0b0e12;overflow:hidden;${shadow(1)}">
    <img src="${RIBBON}" style="position:absolute;left:-170px;top:-40px;width:760px">
  </div>
  <!-- Tarjetas marfil con el símbolo -->
  <div class="abs" style="left:1120px;top:90px;width:400px;height:240px;transform:rotate(14deg);border-radius:3px;background:linear-gradient(160deg,#fbfaf7,#f1eee8);${shadow(1)}">
    <div class="abs" style="left:170px;top:94px;width:60px">${symbol('#0b1218')}</div>
  </div>
  <div class="abs" style="left:230px;top:800px;width:400px;height:240px;transform:rotate(6deg);border-radius:3px;background:linear-gradient(160deg,#fbfaf7,#efebe4);${shadow(1)}">
    <div class="abs" style="left:36px;top:36px;width:100px">${wordmark('#0b1218')}</div>
    <div class="abs" style="left:36px;bottom:36px;font-size:11px;line-height:1.7;color:#4a4f57;letter-spacing:.02em">Estrategia. Creatividad. Tecnología.</div>
    <div class="abs" style="right:36px;bottom:40px;width:34px">${symbol('#0b1218')}</div>
  </div>

  <!-- Luz de ventana: franjas de luz y sombra suaves en diagonal -->
  <div class="abs" style="inset:-200px;transform:rotate(-28deg);background:repeating-linear-gradient(90deg,rgba(255,250,240,0) 0 220px,rgba(255,250,240,.16) 220px 380px,rgba(255,250,240,0) 380px 470px);filter:blur(28px);mix-blend-mode:soft-light"></div>
  <div class="abs" style="inset:0;background:linear-gradient(135deg,rgba(40,32,20,.18),transparent 35%,transparent 65%,rgba(40,32,20,.22))"></div>
</body>`

const dir = mkdtempSync(join(tmpdir(), 'alive-explorations-'))
const browser = await chromium.launch()
for (const [name, html] of [
  ['concept-web', webScene],
  ['concept-identity', identityScene],
]) {
  const htmlPath = join(dir, `${name}.html`)
  writeFileSync(htmlPath, `<!doctype html><meta charset="utf-8">${html}`)
  for (const scale of [0.75, 1.5]) {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: scale })
    await page.goto(pathToFileURL(htmlPath).href)
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(300)
    const png = await page.screenshot({ type: 'png' })
    const out = new URL(`src/assets/visual/${name}-${Math.round(W * scale)}.webp`, root)
    const webp = await page.evaluate(async (b64) => {
      const img = new Image()
      img.src = 'data:image/png;base64,' + b64
      await img.decode()
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      c.getContext('2d').drawImage(img, 0, 0)
      return c.toDataURL('image/webp', 0.84).split(',')[1]
    }, png.toString('base64'))
    writeFileSync(out, Buffer.from(webp, 'base64'))
    console.log(out.pathname.split('/').pop(), Math.round(Buffer.from(webp, 'base64').length / 1024) + ' KB')
    await page.close()
  }
}
await browser.close()
