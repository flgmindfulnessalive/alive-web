// Imágenes de los proyectos: casos reales y exploraciones del estudio.
// Las exploraciones se generan con scripts/render-explorations.mjs.
import web1200 from '../assets/visual/concept-web-1200.webp'
import web2400 from '../assets/visual/concept-web-2400.webp'
import identity1200 from '../assets/visual/concept-identity-1200.webp'
import identity2400 from '../assets/visual/concept-identity-2400.webp'
import flow1000 from '../assets/visual/project-flow-1000.webp'
import flow1497 from '../assets/visual/project-flow-1497.webp'

export const explorationImages = {
  flow: { src: flow1000, srcSet: `${flow1000} 1000w, ${flow1497} 1497w`, width: 1497, height: 1051 },
  web: { src: web1200, srcSet: `${web1200} 1200w, ${web2400} 2400w`, width: 1600, height: 1120 },
  identity: { src: identity1200, srcSet: `${identity1200} 1200w, ${identity2400} 2400w`, width: 1600, height: 1120 },
} as const
