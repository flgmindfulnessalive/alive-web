import { useCallback, useEffect, useRef, useState } from 'react'
import { nav } from '../content/site'
import { Wordmark } from './Wordmark'
import './Header.css'

const MOBILE_QUERY = '(max-width: 899px)'

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const close = useCallback((returnFocus = true) => {
    setOpen(false)
    if (returnFocus) toggleRef.current?.focus()
  }, [])

  // Con el menú abierto, el resto de la página queda inerte y sin scroll.
  useEffect(() => {
    const outside = document.querySelectorAll<HTMLElement>('[data-page-content]')
    outside.forEach((el) => (el.inert = open))
    document.documentElement.classList.toggle('menu-open', open)
    if (open) panelRef.current?.querySelector<HTMLElement>('a')?.focus()

    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    const mq = window.matchMedia(MOBILE_QUERY)
    const onChange = () => !mq.matches && close(false)
    document.addEventListener('keydown', onKey)
    mq.addEventListener('change', onChange)
    return () => {
      document.removeEventListener('keydown', onKey)
      mq.removeEventListener('change', onChange)
      outside.forEach((el) => (el.inert = false))
    }
  }, [open, close])

  return (
    <header className={`site-header${scrolled || open ? ' is-solid' : ''}`}>
      <div className="container site-header__inner">
        <a className="site-header__logo" href="#inicio" onClick={() => open && close(false)}>
          <Wordmark title="ALIVE, ir al inicio" />
        </a>

        <nav className="site-header__nav" aria-label="Principal">
          <ul>
            {nav.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <a className="btn btn-ghost btn-sm site-header__cta" href="#contacto">
          Hablemos
          <span className="arrow" aria-hidden="true">→</span>
        </a>

        <button
          ref={toggleRef}
          type="button"
          className="site-header__toggle"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setOpen((v) => !v)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      </div>

      <div
        ref={panelRef}
        id="mobile-menu"
        className="mobile-menu"
        hidden={!open}
      >
        <nav aria-label="Principal móvil" className="container">
          <ul>
            {nav.map((item) => (
              <li key={item.href}>
                <a href={item.href} onClick={() => close(false)}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <a className="btn btn-primary mobile-menu__cta" href="#contacto" onClick={() => close(false)}>
            Hablemos de tu proyecto
          </a>
        </nav>
      </div>
    </header>
  )
}
