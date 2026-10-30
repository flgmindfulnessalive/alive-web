import { useEffect, useRef } from 'react'

type Compute = (rect: DOMRect, viewport: number) => number

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

// Progreso del elemento en el viewport (0 → 1) mientras lo atraviesa.
export const throughViewport: Compute = (rect, vh) => (vh - rect.top) / (rect.height + vh)

// Escribe el progreso como variable CSS `--p` en el elemento, sin re-render.
// Con prefers-reduced-motion se fija en 1 (estado final, todo visible).
export function useScrollProgress<T extends HTMLElement>(compute: Compute = throughViewport) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0

    const update = () => {
      frame = 0
      const p = reduce.matches ? 1 : clamp01(compute(el.getBoundingClientRect(), window.innerHeight))
      el.style.setProperty('--p', p.toFixed(4))
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    reduce.addEventListener('change', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      reduce.removeEventListener('change', schedule)
    }
  }, [compute])

  return ref
}
