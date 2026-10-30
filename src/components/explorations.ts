// Renders de las «Exploraciones visuales» (scripts/render-explorations.mjs).
// Sustituir por renders o fotografía reales del estudio manteniendo las claves.
import web1200 from '../assets/visual/concept-web-1200.webp'
import web2400 from '../assets/visual/concept-web-2400.webp'
import identity1200 from '../assets/visual/concept-identity-1200.webp'
import identity2400 from '../assets/visual/concept-identity-2400.webp'

export const explorationImages = {
  web: { src: web1200, srcSet: `${web1200} 1200w, ${web2400} 2400w` },
  identity: { src: identity1200, srcSet: `${identity1200} 1200w, ${identity2400} 2400w` },
} as const

export const EXPLORATION_SIZE = { width: 1600, height: 1120 }
