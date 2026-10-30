// Contenido editable de la homepage. La presentación vive en src/components.
// Cualquier texto comercial, alcance o proyecto se cambia aquí sin tocar el diseño.

export type NavItem = { label: string; href: string }

export const nav: NavItem[] = [
  { label: 'Estudio', href: '#estudio' },
  { label: 'Servicios', href: '#servicios' },
  { label: 'Proyectos', href: '#proyectos' },
]

export const footerNav: NavItem[] = [...nav, { label: 'Contacto', href: '#contacto' }]

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
  visual: 'web' | 'identity'
  alt: string
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
    text: `ALIVE nació en ${FOUNDED} de la mano de ${brand.founder}. Detrás del estudio hay ${years} años creando marcas, plataformas y experiencias digitales, y esa experiencia acompaña cada proyecto desde la primera conversación.`,
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
