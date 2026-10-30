// Contenido editable de la homepage. La presentación vive en src/components.
// Cualquier texto comercial, alcance o proyecto se cambia aquí sin tocar el diseño.

import blogIndex from './blog-index.json'

export type NavItem = { label: string; href: string }

// El enlace «Blog» aparece solo cuando hay al menos un artículo publicado.
export const hasBlog = blogIndex.length > 0
const blogLink: NavItem[] = hasBlog ? [{ label: 'Blog', href: '/blog/' }] : []

export const nav: NavItem[] = [
  { label: 'Nosotros', href: '#nosotros' },
  { label: 'Servicios', href: '#servicios' },
  { label: 'Proyectos', href: '#proyectos' },
  ...blogLink,
]

export const footerNav: NavItem[] = [
  ...nav.filter((item) => item.href.startsWith('#')),
  { label: 'Contacto', href: '#contacto' },
  ...blogLink,
]

export const brand = {
  name: 'ALIVE',
  signature: 'Estrategia. Creatividad. Tecnología.',
  founded: 2012,
  founder: 'Francesco Lulli',
}

export const hero = {
  eyebrow: 'Estudio de inteligencia creativa · Desde\u00a02012',
  title: 'Ideas que cobran vida.',
  // Cortes de línea del H1 para la entrada escalonada.
  titleLines: ['Ideas que', 'cobran vida.'],
  // Palabra que «respira» al entrar; el punto final se anima (HeroMark).
  titleAccent: 'vida',
  // Rótulo sobre la banda de capacidades.
  capabilitiesLabel: 'Nuestro expertise',
  description:
    'Combinamos estrategia, creatividad y tecnología para transformar ideas en marcas, productos y experiencias digitales.',
  primaryCta: { label: 'Hablemos de tu proyecto', href: '#contacto' },
  secondaryCta: { label: 'Explora lo que hacemos', href: '#proyectos' },
}

export const capabilities = ['Estrategia', 'Diseño', 'Tecnología', 'IA']

// `exploration`: pieza conceptual del estudio, sin cliente.
// `case`: caso real autorizado. Requiere `client` y datos verificados.
export type Project = {
  id: string
  kind: 'exploration' | 'case'
  title: string
  discipline: string
  visual: 'flow' | 'flow-devices' | 'web' | 'identity' | 'wewebinars-stationery' | 'glus-web' | 'vitara-home'
  // Ocupa todo el ancho de la sección.
  featured?: boolean
  alt: string
  // Piezas adicionales: con una, pareja lado a lado; con dos, mosaico (principal + dos);
  // con tres, cuatro cuadradas en fila.
  gallery?: {
    visual:
      | 'flow'
      | 'flow-stationery'
      | 'wewebinars-web'
      | 'wewebinars-campaign'
      | 'glus-campaign'
      | 'vitara-config'
      | 'vitara-gallery'
      | 'vitara-tablet'
    alt: string
  }[]
  summary: string
  details: string[]
  client?: string
  // Enlace al proyecto publicado. Si existe, la tarjeta abre el sitio real.
  url?: string
}

export const work = {
  // Detalle en ventana modal al pulsar una exploración. Desactivado por ahora.
  showDetails: false,
  title: 'Lo que podemos construir.',
  description:
    'Marcas, plataformas y experiencias digitales que conectan visión, diseño y tecnología.',
  projects: [
    {
      id: 'flow-talent-hub',
      kind: 'case',
      featured: true,
      title: 'FLOW Talent HUB',
      discipline: 'Producto digital y marca · Software de reclutamiento',
      visual: 'flow-devices',
      alt: 'FLOW Talent HUB en monitor, tableta y móvil: la sección «Construye tu Banco del Talento Digital» con los pasos atrae, evalúa, selecciona y crea; la portada «Una experiencia única en selección» y el portal «Encuentra tu próximo empleo».',
      gallery: [
        {
          visual: 'flow',
          alt: 'Plataforma FLOW Talent HUB en una pantalla: software de reclutamiento y selección con el titular «Una experiencia única en selección» y un panel de búsqueda con candidatos, compatibilidad y siguientes pasos.',
        },
        {
          visual: 'flow-stationery',
          alt: 'Papelería y piezas de FLOW Talent HUB: folleto «Menos carpetas. Más orden. Todo en FLOW.», carpeta «Tu experiencia. Un proceso a tu altura.», tableta con la misma campaña y tarjetas de visita.',
        },
      ],
      summary:
        'Plataforma de reclutamiento y selección que reúne perfiles, candidatos, evaluaciones y reportes en un mismo lugar para empresas, equipos de selección y headhunters.',
      details: [],
    },
    {
      id: 'wewebinars',
      kind: 'case',
      featured: true,
      title: 'WeWebinars',
      discipline: 'Marca, web y campaña · Plataforma de webinars automatizados',
      visual: 'wewebinars-stationery',
      alt: 'Identidad de WeWebinars aplicada a papelería: carpeta oscura con el símbolo W en degradado, folleto «Create once. Present endlessly.» y tarjetas de visita.',
      gallery: [
        {
          visual: 'wewebinars-web',
          alt: 'Sitio web de WeWebinars en un monitor: titular «Convierte tu presentación en un sistema», botones para automatizar la primera presentación y ver planes, y una vista previa de un webinar en vivo con chat.',
        },
        {
          visual: 'wewebinars-campaign',
          alt: 'Piezas de campaña de WeWebinars en violeta: un cartel «Your business on autopilot», un móvil con «Create once. Present endlessly. Sell 24/7.» y un banner «Everything you need. Nothing you don’t.».',
        },
      ],
      summary:
        'Identidad, sitio web y campaña para una plataforma que convierte una presentación grabada en un evento automatizado que vende 24/7.',
      details: [],
    },
    {
      id: 'glus',
      kind: 'case',
      featured: true,
      title: 'GLUS Asociados Comerciales',
      discipline: 'Web y campaña · Programa de asociados comerciales',
      visual: 'glus-web',
      alt: 'Sitio web de GLUS Asociados Comerciales en monitor, tableta y móvil: titular «Tus conexiones pueden abrir nuevas oportunidades.», el modelo de colaboración con un Director Comercial y los pasos para participar.',
      gallery: [
        {
          visual: 'glus-campaign',
          alt: 'Campaña de GLUS en dos pantallas y un móvil: «Tus conexiones pueden abrir nuevas oportunidades.», «Conecta. Colabora. Abre nuevas puertas.» y «Tú identificas la oportunidad. Juntos la desarrollamos.».',
        },
      ],
      summary:
        'Sitio web y campaña para el programa de asociados comerciales de GLUS, que invita a conectar empresas con soluciones y desarrollar oportunidades junto a un Director Comercial.',
      details: [],
    },
    {
      id: 'suzuki-vitara-vive',
      kind: 'case',
      featured: true,
      title: 'Campaña Vitara Vive – Suzuki',
      discipline: 'Campaña digital y sitio web · Lanzamiento automotriz',
      visual: 'vitara-home',
      alt: 'Sitio de la campaña «Vitara! Vive» de Suzuki en una laptop y una tableta: portada con el Vitara entre confeti y la sección «Vive» con el video de la campaña.',
      gallery: [
        {
          visual: 'vitara-config',
          alt: 'Sección «Personalízala» del sitio Vitara Vive: visor 360° para elegir grado, color de carrocería, llantas y accesorios; en la tableta, el formulario «Cotízala aquí» y en el móvil, la galería.',
        },
        {
          visual: 'vitara-gallery',
          alt: 'Galería de fotos del Suzuki Vitara en la laptop y la página de tecnología ALLGRIP con sus modos de conducción en la tableta.',
        },
        {
          visual: 'vitara-tablet',
          alt: 'Manos sosteniendo una tableta con la sección «Vive» del sitio: el texto de la campaña junto al Vitara atravesando un camino de bosque.',
        },
      ],
      summary:
        'Sitio de campaña para el lanzamiento del Suzuki Vitara: historia de la campaña, galería, equipamiento, tecnología, configurador 360° y cotización.',
      details: [],
    },
    {
      id: 'concepto-web',
      kind: 'exploration',
      title: 'Concepto de experiencia web',
      discipline: 'Diseño y desarrollo',
      visual: 'web',
      alt: 'Render conceptual de un sitio web de ALIVE en un monitor y un móvil flotando en un espacio oscuro, con titulares amplios y la cinta fluida azul, violeta y turquesa.',
      summary:
        'Una exploración interna sobre cómo puede sentirse un sitio web cuando estrategia, diseño y desarrollo se piensan juntos desde el principio.',
      details: [
        'Arquitectura de contenido pensada para que el mensaje principal se entienda en segundos.',
        'Sistema visual adaptable de escritorio a móvil, recompuesto para cada formato.',
        'Movimiento contenido que acompaña la lectura sin bloquearla.',
      ],
    },
    {
      id: 'concepto-identidad',
      kind: 'exploration',
      title: 'Concepto de identidad',
      discipline: 'Branding y dirección de arte',
      visual: 'identity',
      alt: 'Render conceptual de papelería ALIVE sobre una superficie marfil: cuaderno negro con la A en relieve, tarjetas oscuras y claras, y un sobre con la cinta fluida impresa.',
      summary:
        'Una exploración interna sobre cómo una identidad puede mantenerse coherente entre soportes impresos, digitales y de producto.',
      details: [
        'Símbolo y retícula pensados para funcionar en tamaños pequeños y grandes.',
        'Paleta y tipografía con reglas de uso claras.',
        'Dirección de arte que da continuidad a cada punto de contacto.',
      ],
    },
  ] satisfies Project[] as Project[],
}

// Posicionamiento aprobado en el brief.
export const manifesto = {
  lead: 'Un estudio de inteligencia creativa',
  accent: 'que construye lo que viene.',
}

const FOUNDED = brand.founded
export const currentYear = new Date().getFullYear()
const years = currentYear - FOUNDED

export const studio = {
  title: 'Pensamos contigo. Construimos para avanzar.',
  // Trayectoria: el número de años se calcula solo.
  since: {
    year: FOUNDED,
    label: 'Desde',
    years: `${years} años de trayectoria`,
    founder: `Fundado por ${brand.founder}`,
    press: { label: 'Ver menciones en prensa', href: '/prensa/' },
    text: `ALIVE nació de la mano de ${brand.founder}, siendo pioneros en Perú. Detrás del estudio hay años de trayectoria creando marcas, plataformas y experiencias digitales, y esa experiencia acompaña cada proyecto desde la primera conversación.`,
  },
  text: 'Somos un estudio boutique que combina pensamiento estratégico, criterio creativo y ejecución tecnológica. Trabajamos cerca de cada proyecto para convertir una visión en una experiencia digital coherente.',
  // Propuesta comercial editable: no añadir especializaciones no confirmadas.
  services: [
    {
      number: '01',
      name: 'Estrategia',
      text: 'Claridad para decidir qué construir, para quién y con qué propósito.',
      scope: 'Consultoría digital, posicionamiento y definición de experiencias.',
    },
    {
      number: '02',
      name: 'Diseño',
      text: 'Identidades y experiencias que dan forma a lo que hace distinta a tu marca.',
      scope: 'Branding, dirección de arte y diseño UX/UI.',
    },
    {
      number: '03',
      name: 'Tecnología + IA',
      text: 'Desarrollo y soluciones inteligentes conectadas con necesidades reales del negocio.',
      scope: 'Sitios web, aplicaciones, integraciones y automatización.',
    },
  ],
}

export const process = {
  title: 'De la idea a la experiencia.',
  steps: [
    { name: 'Entendemos', text: 'Contexto, objetivos y necesidades.' },
    { name: 'Definimos', text: 'Dirección, alcance y prioridades.' },
    { name: 'Creamos', text: 'Diseño, desarrollo e iteración.' },
    { name: 'Evolucionamos', text: 'Lanzamiento, aprendizaje y mejora.' },
  ],
}

export const contact = {
  title: 'Demos vida a tu próximo proyecto.',
  text: 'Cuéntanos qué quieres construir. Empecemos por una buena conversación.',
  submitLabel: 'Enviar proyecto',
  demoNotice: 'Formulario de demostración. Los datos no se enviarán.',
  demoSuccess: 'Validación completada. Conecta el servicio de envío para recibir consultas.',
  // Enlace al aviso de privacidad (privacidad/index.html). null lo oculta.
  privacyHref: '/privacidad/' as string | null,
}

// Destinos reales de legales y redes. Vacío hasta que existan.
export const footerLinks: NavItem[] = [
  { label: 'Prensa', href: '/prensa/' },
  { label: 'Privacidad', href: '/privacidad/' },
]
