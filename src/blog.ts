// Entrada de las páginas del blog: estilos y botones de compartir.
import '@fontsource-variable/inter/wght.css'
import './styles/tokens.css'
import './styles/global.css'
import './styles/page.css'
import './styles/blog.css'

for (const block of document.querySelectorAll<HTMLElement>('[data-share]')) {
  const url = block.dataset.url ?? location.href
  const title = block.dataset.title ?? document.title
  const status = block.querySelector<HTMLElement>('.share__status')
  const say = (text: string) => {
    if (!status) return
    status.textContent = text
    window.setTimeout(() => (status.textContent = ''), 2500)
  }

  // Menú nativo del sistema: solo en pantallas táctiles y si el navegador lo ofrece.
  const native = block.querySelector<HTMLButtonElement>('[data-share-native]')
  const touch = window.matchMedia('(pointer: coarse)').matches
  if (native && touch && typeof navigator.share === 'function') {
    native.hidden = false
    native.addEventListener('click', () => {
      navigator.share({ title, url }).catch(() => {})
    })
  }

  block.querySelector('[data-share-copy]')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(url)
      say('Enlace copiado')
    } catch {
      window.prompt('Copia el enlace:', url)
    }
  })
}
