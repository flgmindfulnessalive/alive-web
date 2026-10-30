import { useState, type CSSProperties, type ReactNode } from 'react'
import { hero } from '../content/site'
import { useScrollProgress } from '../lib/useScrollProgress'
import { HeroMark } from './HeroMark'
import { Sculpture } from './Sculpture'
import './Hero.css'

// Progreso 0 → 1 mientras el hero sale de pantalla por arriba.
const leaving = (rect: DOMRect) => -rect.top / rect.height

// «vida» lleva un barrido de color de marca; el punto final pasa a HeroMark.
function renderLine(line: string, run: number): ReactNode {
  const at = line.lastIndexOf(hero.titleAccent)
  if (at < 0 || !line.endsWith('.')) return line
  const word = line.slice(at, at + hero.titleAccent.length)
  return (
    <>
      {line.slice(0, at)}
      <span key={`w${run}`} className="hero-alive">
        {word}
      </span>
      {line.slice(at + word.length, -1)}
      <HeroMark key={`m${run}`} />
    </>
  )
}

export function Hero() {
  const ref = useScrollProgress<HTMLElement>(leaving)
  // Se reproduce una vez al cargar; al pasar el cursor por el titular, otra vez.
  const [play, setPlay] = useState({ n: 0, busy: true })
  const replay = () => {
    if (play.busy) return
    setPlay({ n: play.n + 1, busy: true })
  }

  return (
    <section ref={ref} id="inicio" className="hero" aria-labelledby="hero-title">
      <div className="container hero__inner">
        <div className="hero__copy">
          <p className="eyebrow eyebrow--below hero__eyebrow hero-enter" style={{ '--d': 0 } as CSSProperties}>
            {hero.eyebrow}
          </p>
          <h1
            id="hero-title"
            className={`display hero__title${play.n ? ' is-replay' : ''}`}
            aria-label={hero.title}
            onPointerEnter={(e) => e.pointerType === 'mouse' && replay()}
            onAnimationEnd={(e) => {
              if ((e.target as Element).classList.contains('hero-mark__dot')) setPlay((p) => ({ ...p, busy: false }))
            }}
          >
            {hero.titleLines.map((line, i) => (
              <span key={line} className="hero__line" aria-hidden="true">
                <span className="hero__line-inner" style={{ '--d': i + 1 } as CSSProperties}>
                  {renderLine(line, play.n)}
                </span>{' '}
              </span>
            ))}
          </h1>
          <p className="lead hero__lead hero-enter" style={{ '--d': 3 } as CSSProperties}>
            {hero.description}
          </p>
          <div className="hero__actions hero-enter" style={{ '--d': 4 } as CSSProperties}>
            <a className="btn btn-primary" href={hero.primaryCta.href}>
              {hero.primaryCta.label}
              <span className="arrow" aria-hidden="true">→</span>
            </a>
            <a className="text-link" href={hero.secondaryCta.href}>
              {hero.secondaryCta.label}
            </a>
          </div>
        </div>
      </div>

      <div className="hero__visual">
        <Sculpture className="hero__sculpture" priority />
      </div>

      <div className="container">
        <p className="hero__signature hero-enter" style={{ '--d': 5 } as CSSProperties}>
          {hero.capabilitiesLabel}
        </p>
      </div>
    </section>
  )
}
