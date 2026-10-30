import type { CSSProperties } from 'react'
import { process } from '../content/site'
import { useScrollProgress } from '../lib/useScrollProgress'
import './Process.css'

// El raíl se llena mientras la lista pasa por el centro de la pantalla.
const centre = (rect: DOMRect, vh: number) => (vh * 0.6 - rect.top) / rect.height

export function Process() {
  const ref = useScrollProgress<HTMLOListElement>(centre)
  const n = process.steps.length

  return (
    <section className="section process" aria-labelledby="process-title">
      <div className="container process__inner">
        <div className="process__aside">
          <p className="eyebrow eyebrow--rule">Forma de trabajar</p>
          <h2 id="process-title" className="h2 process__heading">
            {process.title}
          </h2>
        </div>

        <ol ref={ref} className="process__steps" style={{ '--n': n } as CSSProperties}>
          {process.steps.map((step, i) => (
            <li key={step.name} className="process__step" style={{ '--i': i } as CSSProperties}>
              <span className="process__index ink-number" data-n={String(i + 1).padStart(2, '0')} aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="process__name">{step.name}</h3>
              <p className="process__text">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
