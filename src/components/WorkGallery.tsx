import { useRef, useState, type CSSProperties } from 'react'
import { work, type Project } from '../content/site'
import { useReveal } from '../lib/useReveal'
import { explorationImages } from './explorations'
import { ProjectModal } from './ProjectModal'
import './WorkGallery.css'

// Composición según el número de piezas adicionales.
const LAYOUTS = { 1: 'pair', 2: 'trio', 3: 'quad' } as const
type Layout = (typeof LAYOUTS)[keyof typeof LAYOUTS]
const MAIN_VW: Record<Layout, number> = { pair: 50, trio: 66, quad: 25 }
const PIECE_VW: Record<Layout, number> = { pair: 50, trio: 33, quad: 25 }

type CardProps = { project: Project; index: number; onOpen: (el: HTMLButtonElement) => void }

function ProjectCard({ project, index, onOpen }: CardProps) {
  const image = explorationImages[project.visual]
  // Solo los casos con cliente llevan etiqueta sobre la imagen.
  const label = project.kind === 'case' ? project.client : undefined
  // Con enlace: abre el sitio real. Sin enlace: abre el detalle solo si está activado.
  const action = project.url ? 'link' : work.showDetails ? 'modal' : 'static'
  const layout: Layout | undefined = project.gallery && LAYOUTS[project.gallery.length as keyof typeof LAYOUTS]

  const body = (
    <>
      <span
        className={`work__media${layout ? ` work__media--mosaic work__media--${layout}` : ''}`}
      >
        <img
          src={image.src}
          srcSet={image.srcSet}
          sizes={layout ? `(min-width: 768px) ${MAIN_VW[layout]}vw, ${layout === 'quad' ? 50 : 100}vw` : project.featured ? '100vw' : '(min-width: 768px) 50vw, 100vw'}
          alt={action === 'static' ? project.alt : ''}
          width={image.width}
          height={image.height}
          loading="lazy"
          decoding="async"
        />
        {project.gallery?.map((piece) => {
          const img = explorationImages[piece.visual]
          return (
            <img
              key={piece.visual}
              src={img.src}
              srcSet={img.srcSet}
              sizes={`(min-width: 768px) ${PIECE_VW[layout!]}vw, ${layout === 'pair' ? 100 : 50}vw`}
              alt={action === 'static' ? piece.alt : ''}
              width={img.width}
              height={img.height}
              loading="lazy"
              decoding="async"
            />
          )
        })}
        {label && <span className="work__badge">{label}</span>}
      </span>
      {action !== 'static' && (
        <span id={`${project.id}-desc`} className="visually-hidden">
          {project.alt}
        </span>
      )}
      <span className="work__caption">
        <span className="eyebrow">{project.discipline}</span>
        <span className="work__title">
          {project.title}
          {action !== 'static' && (
            <>
              <span className="work__rule" aria-hidden="true" />
              <span className="work__arrow" aria-hidden="true">
                {action === 'link' ? '↗' : '→'}
              </span>
            </>
          )}
        </span>
      </span>
    </>
  )

  return (
    <li
      className={`work__item${project.featured ? ' work__item--featured' : ''}`}
      style={{ '--i': index } as CSSProperties}
    >
      {action === 'link' ? (
        <a
          className="work__card"
          href={project.url}
          target="_blank"
          rel="noopener"
          aria-label={`${[project.title, label].filter(Boolean).join('. ')}. Abrir sitio en una pestaña nueva`}
          aria-describedby={`${project.id}-desc`}
        >
          {body}
        </a>
      ) : action === 'modal' ? (
        <button
          type="button"
          className="work__card"
          aria-haspopup="dialog"
          aria-label={`${[project.title, label].filter(Boolean).join('. ')}. Ver detalle`}
          aria-describedby={`${project.id}-desc`}
          onClick={(e) => onOpen(e.currentTarget)}
        >
          {body}
        </button>
      ) : (
        <div className="work__card work__card--static">{body}</div>
      )}
    </li>
  )
}

export function WorkGallery() {
  const [active, setActive] = useState<Project | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const headRef = useReveal<HTMLDivElement>()
  const listRef = useReveal<HTMLUListElement>()

  return (
    <section id="proyectos" className="section work" aria-labelledby="work-title">
      <div className="container">
        <div ref={headRef} className="work__head reveal">
          <div>
            <p className="eyebrow eyebrow--rule">Proyectos</p>
            <h2 id="work-title" className="h2 work__heading">
              {work.title}
            </h2>
          </div>
          <p className="work__intro">{work.description}</p>
        </div>

        <ul ref={listRef} className="work__list reveal-stagger">
          {work.projects.map((project, i) => (
            <ProjectCard
              key={project.id}
              project={project}
              index={i}
              onOpen={(el) => {
                triggerRef.current = el
                setActive(project)
              }}
            />
          ))}
        </ul>
      </div>

      {work.showDetails && (
        <ProjectModal
          project={active}
          onClose={() => {
            setActive(null)
            triggerRef.current?.focus()
          }}
        />
      )}
    </section>
  )
}
