// Genera el blog a partir de content/blog/*.md:
//   blog/index.html                 listado
//   blog/<slug>/index.html          un artículo por archivo
//   src/content/blog-index.json     resumen para la home (enlace «Blog» solo si hay artículos)
//   public/sitemap.xml              home, prensa, blog y artículos
// Los artículos con `draft: true` solo se incluyen con BLOG_DRAFTS=1.
// Se ejecuta antes de `vite` y `vite build` (ver package.json).
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { marked } from 'marked'

const root = new URL('../', import.meta.url)
const SITE = (process.env.VITE_SITE_URL || 'https://alivedigital.agency').replace(/\/$/, '')
const DRAFTS = process.env.BLOG_DRAFTS === '1'
const DEFAULT_AUTHOR = 'Francesco Lulli'

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

// Frontmatter mínimo: líneas «clave: valor» entre dos «---».
function parse(file) {
  const raw = readFileSync(new URL(`content/blog/${file}`, root), 'utf8')
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!m) throw new Error(`${file}: falta el bloque --- de cabecera`)
  const meta = {}
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.*)$/)
    if (kv) meta[kv[1]] = kv[2].replace(/^["']|["']$/g, '').trim()
  }
  for (const key of ['title', 'description', 'date']) {
    if (!meta[key]) throw new Error(`${file}: falta «${key}» en la cabecera`)
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) throw new Error(`${file}: la fecha debe ser AAAA-MM-DD`)
  const slug = file.replace(/\.md$/, '').replace(/^_/, '')
  const words = m[2].split(/\s+/).filter(Boolean).length
  return {
    slug,
    title: meta.title,
    description: meta.description,
    date: meta.date,
    author: meta.author || DEFAULT_AUTHOR,
    cover: meta.cover || '',
    draft: meta.draft === 'true',
    minutes: Math.max(1, Math.round(words / 220)),
    html: marked.parse(m[2]),
  }
}

const dateLabel = (iso) =>
  new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${iso}T00:00:00Z`),
  )

const head = ({ title, description, path, image, extra = '' }) => `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <meta name="theme-color" content="#080F14" />
    <meta name="color-scheme" content="dark" />
    <link rel="canonical" href="${SITE}${path}" />
    <link rel="icon" href="/favicon.ico" sizes="32x32" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta property="og:site_name" content="ALIVE" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:url" content="${SITE}${path}" />
    <meta property="og:image" content="${SITE}${image}" />
    <meta name="twitter:card" content="summary_large_image" />${extra}
    <script type="module" src="/src/blog.ts"></script>
  </head>`

const header = `
    <a class="skip-link" href="#contenido">Saltar al contenido</a>
    <header class="page-header">
      <div class="container page-header__inner">
        <a href="/" class="page-header__logo" aria-label="ALIVE, ir al inicio">
          <img src="/src/assets/brand/alive-wordmark.svg" alt="ALIVE" width="547" height="107" />
        </a>
        <a href="/blog/" class="text-link">Blog</a>
      </div>
    </header>`

const footer = `
    <footer class="page-footer">
      <div class="container page-footer__inner">
        <span>© 2012–${new Date().getFullYear()} ALIVE · Estrategia. Creatividad. Tecnología.</span>
        <nav aria-label="Pie de página">
          <a href="/" class="text-link">Inicio</a>
          <a href="/prensa/" class="text-link">Prensa</a>
          <a href="/privacidad/" class="text-link">Privacidad</a>
        </nav>
      </div>
    </footer>`

function postPage(p) {
  const image = p.cover || '/og-image.jpg?v=20261030'
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: p.title,
    description: p.description,
    datePublished: p.date,
    author: { '@type': 'Person', name: p.author },
    publisher: { '@type': 'Organization', name: 'ALIVE', logo: { '@type': 'ImageObject', url: `${SITE}/icon-512.png` } },
    image: `${SITE}${image}`,
    mainEntityOfPage: `${SITE}/blog/${p.slug}/`,
    inLanguage: 'es',
  }
  const extra = `
    <meta property="og:type" content="article" />
    <meta property="article:published_time" content="${p.date}" />
    <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`
  return `${head({ title: `${p.title} | Blog ALIVE`, description: p.description, path: `/blog/${p.slug}/`, image, extra })}
  <body class="blog">${header}
    <main id="contenido">
      <header class="post__hero">
        <div class="container post__hero-inner">
          <p class="eyebrow post__meta">
            <time datetime="${p.date}">${dateLabel(p.date)}</time> · ${p.minutes} min de lectura
          </p>
          <h1 class="display post__title">${esc(p.title)}</h1>
          <p class="lead post__lead">${esc(p.description)}</p>
          <p class="post__author">Por ${esc(p.author)}</p>
        </div>
      </header>
      ${p.cover ? `<figure class="container post__cover"><img src="${esc(p.cover)}" alt="" /></figure>` : ''}
      <article class="post__body">
        <div class="container">
          <div class="post__prose">
${p.html}
          </div>
        </div>
      </article>
      <nav class="container post__back" aria-label="Más artículos">
        <a href="/blog/" class="text-link">← Todos los artículos</a>
        <a href="/#contacto" class="btn btn-primary">Hablemos de tu proyecto <span class="arrow" aria-hidden="true">→</span></a>
      </nav>
    </main>${footer}
  </body>
</html>
`
}

function indexPage(posts) {
  const items = posts
    .map(
      (p) => `
          <li class="blog__item">
            <a class="blog__link" href="/blog/${p.slug}/">
              <span class="blog__meta"><time datetime="${p.date}">${dateLabel(p.date)}</time> · ${p.minutes} min</span>
              <span class="blog__title">${esc(p.title)}</span>
              <span class="blog__excerpt">${esc(p.description)}</span>
              <span class="blog__more" aria-hidden="true">Leer →</span>
            </a>
          </li>`,
    )
    .join('')
  return `${head({
    title: 'Blog | ALIVE',
    description: 'Ideas sobre estrategia, diseño, tecnología e inteligencia artificial aplicada, por el equipo de ALIVE.',
    path: '/blog/',
    image: '/og-image.jpg?v=20261030',
  })}
  <body class="blog">${header}
    <main id="contenido" class="container blog__main">
      <div class="blog__head">
        <p class="eyebrow eyebrow--rule">Ideas</p>
        <h1 class="display blog__heading">Blog</h1>
        <p class="lead">Estrategia, diseño, tecnología e IA aplicada, contadas desde la práctica.</p>
      </div>
      <ol class="blog__list">${items}
      </ol>
    </main>${footer}
  </body>
</html>
`
}

// ——— Construcción ———
const dir = new URL('content/blog/', root)
const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md')) : []
const posts = files
  .map(parse)
  .filter((p) => DRAFTS || !p.draft)
  .sort((a, b) => b.date.localeCompare(a.date))

const out = new URL('blog/', root)
rmSync(out, { recursive: true, force: true })
if (posts.length) {
  mkdirSync(out, { recursive: true })
  writeFileSync(new URL('index.html', out), indexPage(posts))
  for (const p of posts) {
    mkdirSync(new URL(`${p.slug}/`, out), { recursive: true })
    writeFileSync(new URL(`${p.slug}/index.html`, out), postPage(p))
  }
}

writeFileSync(
  new URL('src/content/blog-index.json', root),
  JSON.stringify(posts.map(({ slug, title, date }) => ({ slug, title, date })), null, 2) + '\n',
)

const today = new Date().toISOString().slice(0, 10)
const urls = [
  ['/', today],
  ['/prensa/', today],
  ...(posts.length ? [['/blog/', posts[0].date]] : []),
  ...posts.map((p) => [`/blog/${p.slug}/`, p.date]),
]
writeFileSync(
  new URL('public/sitemap.xml', root),
  `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generado por scripts/build-blog.mjs. Añadir /privacidad/ cuando deje de ser borrador. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([loc, mod]) => `  <url>\n    <loc>${SITE}${loc}</loc>\n    <lastmod>${mod}</lastmod>\n  </url>`).join('\n')}
</urlset>
`,
)

console.log(`blog: ${posts.length} artículo(s)${DRAFTS ? ' (incluye borradores)' : ''}`)
