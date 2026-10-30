import type { CSSProperties } from 'react'
import { studio } from '../content/site'
import { useReveal } from '../lib/useReveal'
import './StudioServices.css'

export function StudioServices() {
  const headRef = useReveal<HTMLDivElement>()
  const listRef = useReveal<HTMLOListElement>()
  const sinceRef = useReveal<HTMLDivElement>()

  return (
    <section id="estudio" className="section studio theme-ivory" aria-labelledby="studio-title">
      <div className="container">
        <div ref={headRef} className="studio__head reveal">
          <div>
            <p className="eyebrow eyebrow--rule">Nuestro enfoque</p>
            <h2 id="studio-title" className="h2 studio__heading">
              {studio.title}
            </h2>
          </div>
          <p className="studio__text">{studio.text}</p>
        </div>

        <div ref={sinceRef} className="studio__since reveal">
          <p className="studio__since-year" aria-label={`${studio.since.label} ${studio.since.year}`}>
            <span className="studio__since-label" aria-hidden="true">
              {studio.since.label}
            </span>
            <span aria-hidden="true">{studio.since.year}</span>
          </p>
          <div className="studio__since-copy">
            <p className="studio__since-years">{studio.since.years}</p>
            <p className="studio__since-founder">{studio.since.founder}</p>
            <a className="text-link studio__since-press" href={studio.since.press.href}>
              {studio.since.press.label} →
            </a>
            <p className="studio__since-text">{studio.since.text}</p>
          </div>
        </div>

        <div id="servicios" className="studio__services">
          <h3 className="visually-hidden">Servicios</h3>
          <ol ref={listRef} className="studio__list reveal-stagger">
            {studio.services.map((service, i) => (
              <li key={service.number} className="studio__item" style={{ '--i': i } as CSSProperties}>
                <span className="studio__number">{service.number}</span>
                <h4 className="studio__name">{service.name}</h4>
                <p className="studio__desc">{service.text}</p>
                <p className="studio__scope">
                  <span className="studio__scope-label">Alcance</span>
                  {service.scope}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
