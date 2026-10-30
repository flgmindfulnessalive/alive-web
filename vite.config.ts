import react from '@vitejs/plugin-react'
import { existsSync, readdirSync } from 'node:fs'
import { defineConfig, loadEnv, type Plugin } from 'vite'

// Con VITE_SITE_URL (p. ej. https://alivedigital.agency) la home recibe
// canonical, og:url, imágenes con URL absoluta y datos estructurados JSON-LD.
// Sin ella, el HTML queda como está.
function jsonLd(base: string) {
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${base}/#organization`,
        name: 'ALIVE',
        url: `${base}/`,
        logo: `${base}/icon-512.png`,
        image: `${base}/og-image.jpg`,
        slogan: 'Estrategia. Creatividad. Tecnología.',
        foundingDate: '2012',
        founder: { '@type': 'Person', name: 'Francesco Lulli' },
        description:
          'Estudio boutique de inteligencia creativa que combina estrategia, diseño y tecnología para crear marcas, sitios web y experiencias digitales.',
        knowsAbout: [
          'Estrategia digital',
          'Posicionamiento de marca',
          'Branding',
          'Dirección de arte',
          'Diseño UX/UI',
          'Desarrollo web',
          'Aplicaciones',
          'Integraciones',
          'Automatización',
          'Inteligencia artificial aplicada',
        ],
      },
      {
        '@type': 'WebSite',
        '@id': `${base}/#website`,
        url: `${base}/`,
        name: 'ALIVE',
        inLanguage: 'es',
        publisher: { '@id': `${base}/#organization` },
      },
    ],
  }
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`
}

function siteUrl(url: string | undefined): Plugin {
  return {
    name: 'alive-site-url',
    transformIndexHtml(html, ctx) {
      // Solo la home recibe canonical, og:url y JSON-LD.
      if (!url || ctx.path !== '/index.html') return html.replace('<!--alive:jsonld-->', '')
      const base = url.replace(/\/$/, '')
      return html
        .replaceAll('content="/og-image.jpg', `content="${base}/og-image.jpg`)
        .replace('<!--alive:jsonld-->', jsonLd(base))
        .replace(
          '</title>',
          `</title>\n    <link rel="canonical" href="${base}/" />\n    <meta property="og:url" content="${base}/" />`,
        )
    },
  }
}

// Cabecera de las páginas secundarias (blog, prensa, privacidad): misma
// navegación que la home, con menú hamburguesa en móvil (src/secondary.ts).
function secondaryHeader(): Plugin {
  return {
    name: 'alive-secondary-header',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        if (!html.includes('<!--alive:header-->')) return html
        const items = [
          { label: 'Nosotros', href: '/#nosotros' },
          { label: 'Servicios', href: '/#servicios' },
          { label: 'Proyectos', href: '/#proyectos' },
          ...(existsSync('blog/index.html') ? [{ label: 'Blog', href: '/blog/' }] : []),
        ]
        const current = (href: string) =>
          href === '/blog/' && ctx.path.startsWith('/blog/') ? ' aria-current="page"' : ''
        const links = items.map((i) => `<li><a href="${i.href}"${current(i.href)}>${i.label}</a></li>`).join('')
        const header = `<header class="site-header is-solid" data-secondary-header>
      <div class="container site-header__inner">
        <a class="site-header__logo" href="/" aria-label="ALIVE, ir al inicio">
          <img src="/src/assets/brand/alive-wordmark.svg" alt="ALIVE" width="547" height="107" />
        </a>
        <nav class="site-header__nav" aria-label="Principal"><ul>${links}</ul></nav>
        <a class="btn btn-ghost btn-sm site-header__cta" href="/#contacto">Hablemos <span class="arrow" aria-hidden="true">→</span></a>
        <button type="button" class="site-header__toggle" aria-expanded="false" aria-controls="mobile-menu" aria-label="Abrir menú">
          <span aria-hidden="true"></span><span aria-hidden="true"></span>
        </button>
      </div>
      <div id="mobile-menu" class="mobile-menu" hidden>
        <nav aria-label="Principal móvil" class="container">
          <ul>${links}</ul>
          <a class="btn btn-primary mobile-menu__cta" href="/#contacto">Hablemos de tu proyecto</a>
        </nav>
      </div>
    </header>`
        return html.replace('<!--alive:header-->', header)
      },
    },
  }
}

// Páginas generadas por scripts/build-blog.mjs (blog/ y blog/<slug>/).
function blogPages() {
  if (!existsSync('blog/index.html')) return {}
  const pages: Record<string, string> = { blog: 'blog/index.html' }
  for (const slug of readdirSync('blog', { withFileTypes: true })) {
    if (slug.isDirectory()) pages[`blog-${slug.name}`] = `blog/${slug.name}/index.html`
  }
  return pages
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [react(), secondaryHeader(), siteUrl(env.VITE_SITE_URL)],
    build: {
      rollupOptions: {
        input: {
          main: 'index.html',
          privacidad: 'privacidad/index.html',
          prensa: 'prensa/index.html',
          brief: 'brief-form/index.html',
          panel: 'panel/index.html',
          ...blogPages(),
        },
      },
    },
  }
})
