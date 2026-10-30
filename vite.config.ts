import react from '@vitejs/plugin-react'
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
      if (!url || ctx.path.includes('privacidad')) return html.replace('<!--alive:jsonld-->', '')
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

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [react(), siteUrl(env.VITE_SITE_URL)],
    build: {
      rollupOptions: {
        input: { main: 'index.html', privacidad: 'privacidad/index.html' },
      },
    },
  }
})
