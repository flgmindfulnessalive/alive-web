// Imágenes de los proyectos: casos reales y exploraciones del estudio.
// Las exploraciones se generan con scripts/render-explorations.mjs.
import web1200 from '../assets/visual/concept-web-1200.webp'
import web2400 from '../assets/visual/concept-web-2400.webp'
import identity1200 from '../assets/visual/concept-identity-1200.webp'
import identity2400 from '../assets/visual/concept-identity-2400.webp'
import flow1000 from '../assets/visual/project-flow-1000.webp'
import flow1497 from '../assets/visual/project-flow-1497.webp'
import flowDevices800 from '../assets/visual/project-flow-dispositivos-800.webp'
import flowDevices1536 from '../assets/visual/project-flow-dispositivos-1536.webp'
import flowStationery600 from '../assets/visual/project-flow-papeleria-600.webp'
import flowStationery1000 from '../assets/visual/project-flow-papeleria-1000.webp'
import wwStationery800 from '../assets/visual/project-wewebinars-papeleria-800.webp'
import wwStationery1499 from '../assets/visual/project-wewebinars-papeleria-1499.webp'
import wwWeb600 from '../assets/visual/project-wewebinars-web-600.webp'
import wwWeb1000 from '../assets/visual/project-wewebinars-web-1000.webp'
import wwCampaign600 from '../assets/visual/project-wewebinars-campana-600.webp'
import wwCampaign1000 from '../assets/visual/project-wewebinars-campana-1000.webp'

export const explorationImages = {
  flow: { src: flow1000, srcSet: `${flow1000} 1000w, ${flow1497} 1497w`, width: 1497, height: 1051 },
  web: { src: web1200, srcSet: `${web1200} 1200w, ${web2400} 2400w`, width: 1600, height: 1120 },
  'flow-devices': { src: flowDevices800, srcSet: `${flowDevices800} 800w, ${flowDevices1536} 1536w`, width: 1536, height: 1024 },
  'flow-stationery': { src: flowStationery600, srcSet: `${flowStationery600} 600w, ${flowStationery1000} 1000w`, width: 1536, height: 1024 },
  'wewebinars-stationery': { src: wwStationery800, srcSet: `${wwStationery800} 800w, ${wwStationery1499} 1499w`, width: 1499, height: 1049 },
  'wewebinars-web': { src: wwWeb600, srcSet: `${wwWeb600} 600w, ${wwWeb1000} 1000w`, width: 1499, height: 1049 },
  'wewebinars-campaign': { src: wwCampaign600, srcSet: `${wwCampaign600} 600w, ${wwCampaign1000} 1000w`, width: 1499, height: 1049 },
  identity: { src: identity1200, srcSet: `${identity1200} 1200w, ${identity2400} 2400w`, width: 1600, height: 1120 },
} as const
