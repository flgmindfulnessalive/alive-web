import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

// Con VITE_SITE_URL (p. ej. https://alive.studio) añade canonical, og:url y
// convierte og:image en URL absoluta. Sin ella, el HTML queda como está.
function siteUrl(url: string | undefined): Plugin {
  return {
    name: 'alive-site-url',
    transformIndexHtml(html) {
      if (!url) return html
      const base = url.replace(/\/$/, '')
      return html
        .replace('content="/og-image.jpg"', `content="${base}/og-image.jpg"`)
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
  }
})
