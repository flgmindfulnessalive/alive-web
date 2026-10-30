import { useRef, useState, type CSSProperties } from 'react'
import { work, type Project } from '../content/site'
import { useReveal } from '../lib/useReveal'
import { EXPLORATION_SIZE, explorationImages } from './explorations'
import { ProjectModal } from './ProjectModal'
import './WorkGallery.css'

function ProjectCard({ project, index, onOpen }: { project: Project; index: number; onOpen: (el: HTMLButtonElement) => void }) {
  const image = explorationImages[project.visual]
  const label = project.kind === 'exploration' ? 'Exploración visual' : project.client
  return (
    <li className="work__item" style={{ '--i': index } as CSSProperties}>
      <button
        type="button"
        className="work__card"
        aria-haspopup="dialog"
        aria-label={`${project.title}. ${label}. Ver concepto`}
        aria-describedby={`${project.id}-desc`}
        onClick={(e) => onOpen(e.currentTarget)}
      >
        <span className="work__media">
          <img
            src={image.src}
            srcSet={image.srcSet}
            sizes="(min-width: 768px) 50vw, 100vw"
            alt=""
            width={EXPLORATION_SIZE.width}
            height={EXPLORATION_SIZE.height}
            loading="lazy"
            decoding="async"
          />
          <span className="work__badge">{label}</span>
        </span>
        <span id={`${project.id}-desc`} className="visually-hidden">
          {project.alt}
        </span>
        <span className="work__caption">
          <span className="eyebrow">{project.discipline}</span>
          <span className="work__title">
            {project.title}
            <span className="work__rule" aria-hidden="true" />
            <span className="work__arrow" aria-hidden="true">→</span>
          </span>
        </span>
      </button>
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
            <p className="eyebrow eyebrow--rule">Exploración visual</p>
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

      <ProjectModal
        project={active}
        onClose={() => {
          setActive(null)
          triggerRef.current?.focus()
        }}
      />
    </section>
  )
}
