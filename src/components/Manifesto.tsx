import type { CSSProperties } from 'react'
import { brand, manifesto } from '../content/site'
import { useScrollProgress } from '../lib/useScrollProgress'
import './Manifesto.css'

// Se ilumina palabra a palabra mientras el bloque cruza la mitad de la pantalla.
const crossing = (rect: DOMRect, vh: number) => (vh * 0.8 - rect.top) / (rect.height + vh * 0.25)

export function Manifesto() {
  const ref = useScrollProgress<HTMLElement>(crossing)
  const lead = manifesto.lead.split(' ')
  const accent = manifesto.accent.split(' ')
  const total = lead.length + accent.length

  const word = (w: string, i: number, accented: boolean) => (
    <span
      key={`${w}-${i}`}
      className={`manifesto__word${accented ? ' manifesto__word--accent' : ''}`}
      style={{ '--i': i, '--j': i - lead.length, '--k': accent.length } as CSSProperties}
    >
      {w}{' '}
    </span>
  )

  return (
    <section
      ref={ref}
      id="nosotros"
      className="section manifesto"
      aria-label="Posicionamiento"
      style={{ '--n': total } as CSSProperties}
    >
      <div className="container">
        <p className="manifesto__text">
          {lead.map((w, i) => word(w, i, false))}
          {accent.map((w, i) => word(w, lead.length + i, true))}
        </p>
        <p className="manifesto__signature">{brand.signature}</p>
      </div>
    </section>
  )
}
