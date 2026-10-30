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
import glusWeb800 from '../assets/visual/project-glus-web-800.webp'
import glusWeb1536 from '../assets/visual/project-glus-web-1536.webp'
import glusCampaign800 from '../assets/visual/project-glus-campana-800.webp'
import glusCampaign1536 from '../assets/visual/project-glus-campana-1536.webp'
import vitaraHome480 from '../assets/visual/project-vitara-inicio-480.webp'
import vitaraHome850 from '../assets/visual/project-vitara-inicio-850.webp'
import vitaraConfig480 from '../assets/visual/project-vitara-personaliza-480.webp'
import vitaraConfig850 from '../assets/visual/project-vitara-personaliza-850.webp'
import vitaraGallery480 from '../assets/visual/project-vitara-galeria-480.webp'
import vitaraGallery850 from '../assets/visual/project-vitara-galeria-850.webp'
import vitaraTablet480 from '../assets/visual/project-vitara-tableta-480.webp'
import vitaraTablet850 from '../assets/visual/project-vitara-tableta-850.webp'
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
  'glus-web': { src: glusWeb800, srcSet: `${glusWeb800} 800w, ${glusWeb1536} 1536w`, width: 1536, height: 1024 },
  'glus-campaign': { src: glusCampaign800, srcSet: `${glusCampaign800} 800w, ${glusCampaign1536} 1536w`, width: 1536, height: 1024 },
  'vitara-home': { src: vitaraHome480, srcSet: `${vitaraHome480} 480w, ${vitaraHome850} 850w`, width: 850, height: 850 },
  'vitara-config': { src: vitaraConfig480, srcSet: `${vitaraConfig480} 480w, ${vitaraConfig850} 850w`, width: 850, height: 850 },
  'vitara-gallery': { src: vitaraGallery480, srcSet: `${vitaraGallery480} 480w, ${vitaraGallery850} 850w`, width: 850, height: 850 },
  'vitara-tablet': { src: vitaraTablet480, srcSet: `${vitaraTablet480} 480w, ${vitaraTablet850} 850w`, width: 850, height: 850 },
  identity: { src: identity1200, srcSet: `${identity1200} 1200w, ${identity2400} 2400w`, width: 1600, height: 1120 },
} as const
