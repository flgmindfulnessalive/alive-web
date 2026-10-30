// Cabecera de las páginas secundarias: menú móvil accesible, igual que la home.
import './components/Header.css'

const header = document.querySelector<HTMLElement>('[data-secondary-header]')
const toggle = header?.querySelector<HTMLButtonElement>('.site-header__toggle')
const panel = header?.querySelector<HTMLElement>('#mobile-menu')

if (header && toggle && panel) {
  const outside = () =>
    [...document.body.children].filter((el): el is HTMLElement => el instanceof HTMLElement && el !== header)

  const setOpen = (open: boolean, returnFocus = false) => {
    toggle.setAttribute('aria-expanded', String(open))
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú')
    panel.hidden = !open
    document.documentElement.classList.toggle('menu-open', open)
    for (const el of outside()) el.inert = open
    if (open) panel.querySelector<HTMLElement>('a')?.focus()
    else if (returnFocus) toggle.focus()
  }

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'))
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) setOpen(false, true)
  })
  panel.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) setOpen(false)
  })
  window.matchMedia('(min-width: 900px)').addEventListener('change', (e) => e.matches && setOpen(false))
}
