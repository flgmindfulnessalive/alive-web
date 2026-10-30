import { useEffect, useRef } from 'react'
import type { Project } from '../content/site'
import { explorationImages } from './explorations'
import './ProjectModal.css'

type Props = { project: Project | null; onClose: () => void }

// <dialog> nativo: atrapa el foco, cierra con Escape y deja el resto inerte.
export function ProjectModal({ project, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (project && !dialog.open) dialog.showModal()
    if (!project && dialog.open) dialog.close()
  }, [project])

  return (
    <dialog
      ref={ref}
      className="project-modal"
      aria-labelledby="project-modal-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {project && (
        <div className="project-modal__body">
          <img
            className="project-modal__image"
            src={explorationImages[project.visual].src}
            srcSet={explorationImages[project.visual].srcSet}
            sizes="(min-width: 760px) 720px, 100vw"
            alt={project.alt}
            width={explorationImages[project.visual].width}
            height={explorationImages[project.visual].height}
          />
          <div className="project-modal__top">
            <p className="eyebrow">
              {project.kind === 'exploration' ? 'Concepto del estudio' : project.client}
            </p>
            <button type="button" className="project-modal__close" onClick={onClose} aria-label="Cerrar">
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <h2 id="project-modal-title" className="project-modal__title">
            {project.title}
          </h2>
          <p className="project-modal__discipline">{project.discipline}</p>
          <p className="project-modal__summary">{project.summary}</p>
          <ul className="project-modal__list">
            {project.details.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
          {project.kind === 'exploration' && (
            <p className="project-modal__note">
              Pieza conceptual creada para mostrar criterio y dirección. No corresponde a un cliente ni a resultados reales.
            </p>
          )}
          <a className="btn btn-primary" href="#contacto" onClick={onClose}>
            Hablemos de tu proyecto
            <span className="arrow" aria-hidden="true">→</span>
          </a>
        </div>
      )}
    </dialog>
  )
}
