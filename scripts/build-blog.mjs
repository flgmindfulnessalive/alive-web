// Genera el blog a partir de content/blog/*.md:
//   blog/index.html                 listado
//   blog/<slug>/index.html          un artículo por archivo
//   src/content/blog-index.json     resumen para la home (enlace «Blog» solo si hay artículos)
//   public/sitemap.xml              home, prensa, privacidad, blog y artículos
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
    // Imagen para compartir (Open Graph). Si falta, se usa la portada o la imagen general.
    image: meta.image || meta.cover || '',
    draft: meta.draft === 'true',
    // Desempata artículos con la misma fecha (menor = antes).
    order: Number(meta.order ?? 99),
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
    <!--alive:header-->`

// Iconos (24×24) para los botones de compartir.
const ICONS = {
  whatsapp:
    '<path d="M12 2.2a9.8 9.8 0 0 0-8.4 14.8L2.3 21.7l4.8-1.3A9.8 9.8 0 1 0 12 2.2Zm0 1.8a8 8 0 1 1-4.1 14.9l-.3-.2-2.8.8.8-2.7-.2-.3A8 8 0 0 1 12 4Zm-3.1 3.9c-.2 0-.5 0-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3 2.4.9 2.9.8 3.4.7.5 0 1.7-.7 1.9-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3l-1.9-.9c-.3-.1-.5-.1-.6.1l-.9 1.1c-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.2-1.4-.8-.7-1.4-1.6-1.5-1.9-.2-.3 0-.4.1-.6l.4-.5.3-.5v-.5l-.8-2c-.2-.5-.4-.5-.6-.5h-.4Z"/>',
  linkedin:
    '<path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13Zm1.78 13.02H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"/>',
  x: '<path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93Zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41Z"/>',
  facebook:
    '<path d="M24 12.04C24 5.41 18.63.04 12 .04S0 5.41 0 12.04c0 5.99 4.39 10.95 10.13 11.85v-8.38H7.08v-3.47h3.05V9.4c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.23 2.69.23v2.96h-1.52c-1.49 0-1.96.93-1.96 1.88v2.25h3.33l-.53 3.47h-2.8v8.38C19.61 22.99 24 18.03 24 12.04Z"/>',
  link: '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M10 14a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5M14 10a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"/>',
  share: '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
}
const icon = (name) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">${ICONS[name]}</svg>`

// Botones de compartir: enlaces directos (sin scripts de terceros) + copiar y compartir nativo.
function share(p, variant) {
  const url = `${SITE}/blog/${p.slug}/`
  const u = encodeURIComponent(url)
  const t = encodeURIComponent(p.title)
  const targets = [
    ['whatsapp', 'WhatsApp', `https://wa.me/?text=${t}%20${u}`],
    ['linkedin', 'LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${u}`],
    ['x', 'X', `https://x.com/intent/post?text=${t}&url=${u}`],
    ['facebook', 'Facebook', `https://www.facebook.com/sharer/sharer.php?u=${u}`],
  ]
  const links = targets
    .map(
      ([id, label, href]) =>
        `<a class="share__btn share__btn--${id}" href="${href}" target="_blank" rel="noopener" aria-label="Compartir en ${label}">${icon(id)}<span>${label}</span></a>`,
    )
    .join('')
  return `
          <div class="share share--${variant}" data-share data-title="${esc(p.title)}" data-url="${url}">
            ${variant === 'end' ? '<p class="share__label">Comparte este artículo</p>' : '<span class="share__label">Compartir</span>'}
            <div class="share__buttons">
              <button type="button" class="share__btn share__btn--native" data-share-native aria-label="Compartir con otras aplicaciones" hidden>${icon('share')}<span>Compartir</span></button>
              ${links}
              <button type="button" class="share__btn" data-share-copy aria-label="Copiar enlace del artículo">${icon('link')}<span>Copiar enlace</span></button>
            </div>
            <p class="share__status" role="status" aria-live="polite"></p>
          </div>`
}

const footer = `
    <footer class="page-footer">
      <div class="container page-footer__inner">
        <span>Estrategia. Creatividad. Tecnología.</span>
        <nav aria-label="Pie de página">
          <a href="/" class="text-link">Inicio</a>
          <a href="/prensa/" class="text-link">Prensa</a>
          <a href="/privacidad/" class="text-link">Privacidad</a>
        </nav>
        <p class="page-footer__copy">© 2012–${new Date().getFullYear()} ALIVE</p>
      </div>
    </footer>`

function postPage(p) {
  const image = p.image || '/og-image.jpg?v=20261030'
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
  return `${head({ title: `${p.title} | ALIVE`, description: p.description, path: `/blog/${p.slug}/`, image, extra })}
  <body class="blog">${header}
    <main id="contenido">
      <header class="post__hero">
        <div class="container post__hero-inner">
          <p class="eyebrow post__meta">
            <time datetime="${p.date}">${dateLabel(p.date)}</time> · ${p.minutes} min de lectura
          </p>
          <h1 class="display post__title">${esc(p.title)}</h1>
          <p class="lead post__lead">${esc(p.description)}</p>
          <p class="post__author">Por ${esc(p.author)}</p>${share(p, 'top')}
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
      <div class="container post__share-end">${share(p, 'end')}
      </div>
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
  .sort((a, b) => b.date.localeCompare(a.date) || a.order - b.order)

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
  ['/privacidad/', today],
  ...(posts.length ? [['/blog/', posts[0].date]] : []),
  ...posts.map((p) => [`/blog/${p.slug}/`, p.date]),
]
writeFileSync(
  new URL('public/sitemap.xml', root),
  `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generado por scripts/build-blog.mjs. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([loc, mod]) => `  <url>\n    <loc>${SITE}${loc}</loc>\n    <lastmod>${mod}</lastmod>\n  </url>`).join('\n')}
</urlset>
`,
)

console.log(`blog: ${posts.length} artículo(s)${DRAFTS ? ' (incluye borradores)' : ''}`)
