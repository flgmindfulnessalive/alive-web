// Entrada de las páginas de servicio (servicios/*): estilos, cabecera común y efectos.
// Todos los efectos se desactivan con «reducir movimiento» y la página se ve completa sin JavaScript.
import '@fontsource-variable/inter/wght.css'
import './styles/tokens.css'
import './styles/global.css'
import './secondary'
import './styles/page.css'
import './styles/service.css'

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const root = document.documentElement

if (!reduce && 'IntersectionObserver' in window) {
  root.classList.add('svc-motion')

  // Aparición al entrar en pantalla (bloques sueltos y listas escalonadas).
  const targets = document.querySelectorAll<HTMLElement>('.svc-reveal, .svc-stagger')
  document.querySelectorAll<HTMLElement>('.svc-stagger').forEach((list) =>
    [...list.children].forEach((el, i) => (el as HTMLElement).style.setProperty('--i', String(i))),
  )
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in')
          io.unobserve(e.target)
        }
      }),
    { rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
  )
  targets.forEach((t) => io.observe(t))

  // Línea del proceso que se llena con el scroll.
  const steps = document.querySelector<HTMLElement>('[data-progress]')
  // Escultura de la portada con un leve desplazamiento.
  const art = document.querySelector<HTMLElement>('[data-parallax]')
  let ticking = false
  const onScroll = () => {
    if (ticking) return
    ticking = true
    requestAnimationFrame(() => {
      if (steps) {
        const r = steps.getBoundingClientRect()
        const vh = window.innerHeight
        const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)))
        steps.style.setProperty('--progress', p.toFixed(3))
      }
      if (art) art.style.setProperty('--shift', `${Math.min(window.scrollY, 800) * 0.12}px`)
      ticking = false
    })
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()

  // Brillo que sigue al cursor en las tarjetas.
  if (window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll<HTMLElement>('[data-spot]').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect()
        card.style.setProperty('--mx', `${e.clientX - r.left}px`)
        card.style.setProperty('--my', `${e.clientY - r.top}px`)
      })
    })
  }
}
