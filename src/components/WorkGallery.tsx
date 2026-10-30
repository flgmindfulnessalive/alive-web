import { useRef, useState, type CSSProperties } from 'react'
import { work, type Project } from '../content/site'
import { useReveal } from '../lib/useReveal'
import { explorationImages } from './explorations'
import { ProjectModal } from './ProjectModal'
import './WorkGallery.css'

type CardProps = { project: Project; index: number; onOpen: (el: HTMLButtonElement) => void }

function ProjectCard({ project, index, onOpen }: CardProps) {
  const image = explorationImages[project.visual]
  // Solo los casos con cliente llevan etiqueta sobre la imagen.
  const label = project.kind === 'case' ? project.client : undefined
  // Con enlace: abre el sitio real. Sin enlace: abre el detalle solo si está activado.
  const action = project.url ? 'link' : work.showDetails ? 'modal' : 'static'

  const body = (
    <>
      <span className="work__media">
        <img
          src={image.src}
          srcSet={image.srcSet}
          sizes={project.featured ? '100vw' : '(min-width: 768px) 50vw, 100vw'}
          alt={action === 'static' ? project.alt : ''}
          width={explorationImages[project.visual].width}
          height={explorationImages[project.visual].height}
          loading="lazy"
          decoding="async"
        />
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
