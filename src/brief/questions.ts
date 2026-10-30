// Preguntas del brief de proyecto. Las usan el formulario (src/brief) y la función que
// envía el correo (api/brief.ts), así el correo llega con las mismas preguntas que vio el cliente.
// Sin dependencias de React: se importa también desde el servidor.

export type Field =
  | { id: string; kind: 'text' | 'email' | 'tel' | 'url' | 'date'; label: string; hint?: string; placeholder?: string; required?: boolean; showIf?: Condition }
  | { id: string; kind: 'textarea'; label: string; hint?: string; placeholder?: string; required?: boolean; showIf?: Condition }
  | { id: string; kind: 'chips'; label: string; hint?: string; options: string[]; required?: boolean; showIf?: Condition }
  | { id: string; kind: 'choice'; label: string; hint?: string; options: string[]; required?: boolean; showIf?: Condition }
  | { id: string; kind: 'scales'; label: string; hint?: string; scales: [string, string][]; showIf?: Condition }
  | { id: string; kind: 'files'; label: string; hint?: string; groups: FileGroup[] }
  | { id: string; kind: 'consent'; label: string; required: true }

export type Condition = { field: string; equals: string }
export type FileGroup = { id: 'logo' | 'fotos' | 'otros'; label: string; hint: string; accept: string; multiple: boolean }

export type Step = { id: string; title: string; intro: string; fields: Field[] }

export type Answers = Record<string, string | string[] | number[] | boolean | undefined>

export const BRIEF_LIMITS = {
  text: 300,
  textarea: 3000,
  fileSize: 25 * 1024 * 1024, // por archivo
  files: 30, // por brief
}

// Tipos de archivo admitidos (se validan también en el servidor al emitir el permiso de subida).
export const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/heic',
  'image/heif',
  'application/pdf',
  'application/postscript', // .ai y .eps
  'application/illustrator',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'text/plain',
]

export const steps: Step[] = [
  {
    id: 'contacto',
    title: 'Tú y tu marca',
    intro: 'Para saber con quién hablamos y cómo escribirte.',
    fields: [
      { id: 'nombre', kind: 'text', label: 'Tu nombre', required: true, placeholder: 'Nombre y apellido' },
      { id: 'email', kind: 'email', label: 'Correo electrónico', required: true, placeholder: 'tu@empresa.com' },
      { id: 'whatsapp', kind: 'tel', label: 'WhatsApp o teléfono', placeholder: '+51 …' },
      { id: 'marca', kind: 'text', label: 'Nombre de la marca o empresa', required: true },
      { id: 'sector', kind: 'text', label: '¿A qué se dedica?', required: true, placeholder: 'Ej.: estudio de arquitectura en Lima' },
      { id: 'webActual', kind: 'url', label: 'Web actual', hint: 'Si ya tienes una.', placeholder: 'https://' },
      { id: 'redes', kind: 'text', label: 'Redes sociales', placeholder: '@usuario en Instagram, LinkedIn…' },
    ],
  },
  {
    id: 'objetivo',
    title: 'El objetivo',
    intro: 'Qué tiene que conseguir la web para que valga la pena.',
    fields: [
      {
        id: 'objetivos',
        kind: 'chips',
        label: '¿Para qué quieres la web?',
        hint: 'Marca todas las que apliquen.',
        required: true,
        options: [
          'Conseguir clientes o contactos',
          'Mostrar mi trabajo',
          'Vender productos o servicios',
          'Recibir reservas o citas',
          'Dar confianza y credibilidad',
          'Informar sobre mi negocio',
          'Otro',
        ],
      },
      {
        id: 'accion',
        kind: 'choice',
        label: '¿Qué debería hacer quien visita tu web?',
        required: true,
        options: ['Escribir por WhatsApp', 'Llenar un formulario', 'Llamar', 'Comprar o reservar', 'Otro'],
      },
      { id: 'exito', kind: 'textarea', label: '¿Cómo sabrás que la web funciona?', placeholder: 'Ej.: recibir más consultas de empresas por WhatsApp' },
    ],
  },
  {
    id: 'publico',
    title: 'Tu público',
    intro: 'A quién le hablamos y por qué deberían elegirte.',
    fields: [
      { id: 'publico', kind: 'textarea', label: '¿A quién le hablas?', required: true, placeholder: 'Ej.: dueños de pequeñas empresas de 30 a 50 años' },
      { id: 'problema', kind: 'textarea', label: '¿Qué problema les resuelves?' },
      { id: 'diferencial', kind: 'textarea', label: '¿Por qué te eligen a ti y no a otro?', required: true },
      { id: 'competencia', kind: 'textarea', label: 'Competidores o marcas de referencia', hint: 'Nombres o enlaces.' },
    ],
  },
  {
    id: 'estilo',
    title: 'Marca y estilo',
    intro: 'Cómo se ve y cómo se siente tu marca.',
    fields: [
      {
        id: 'identidad',
        kind: 'choice',
        label: '¿Cómo está tu identidad visual?',
        required: true,
        options: ['Tengo logo y manual de marca', 'Tengo logo, pero sin manual', 'No tengo logo todavía'],
      },
      {
        id: 'personalidad',
        kind: 'scales',
        label: '¿Cómo debería sentirse tu web?',
        hint: 'Mueve cada barra hacia donde está tu marca.',
        scales: [
          ['Clásica', 'Moderna'],
          ['Sobria', 'Expresiva'],
          ['Formal', 'Cercana'],
          ['Minimalista', 'Con más detalle'],
        ],
      },
      { id: 'colores', kind: 'text', label: 'Colores de tu marca o que te gustan', placeholder: 'Ej.: azul marino y blanco' },
      { id: 'referencias', kind: 'textarea', label: 'Webs que te gustan y por qué', placeholder: 'Enlaces y qué te gusta de cada una' },
      { id: 'evitar', kind: 'textarea', label: 'Lo que no quieres ver en tu web' },
    ],
  },
  {
    id: 'contenido',
    title: 'Contenido',
    intro: 'Qué va a contar tu web. Si no lo tienes claro, lo afinamos juntos.',
    fields: [
      {
        id: 'secciones',
        kind: 'chips',
        label: '¿Qué secciones imaginas?',
        required: true,
        options: ['Inicio', 'Nosotros', 'Servicios', 'Productos', 'Proyectos o portafolio', 'Testimonios', 'Preguntas frecuentes', 'Blog', 'Contacto', 'Otra'],
      },
      { id: 'servicios', kind: 'textarea', label: 'Tus servicios o productos principales', placeholder: 'Uno por línea, con una frase si puedes' },
      {
        id: 'textos',
        kind: 'choice',
        label: '¿Cómo están los textos?',
        options: ['Los tengo listos', 'Tengo una base que hay que pulir', 'Necesito ayuda con los textos'],
      },
      { id: 'idiomas', kind: 'chips', label: 'Idiomas', options: ['Español', 'Inglés', 'Portugués', 'Otro'] },
      {
        id: 'funciones',
        kind: 'chips',
        label: 'Funciones que necesitas',
        options: ['Botón de WhatsApp', 'Formulario de contacto', 'Mapa', 'Galería de fotos', 'Reservas o citas', 'Tienda online', 'Boletín de correo', 'Integración con redes'],
      },
    ],
  },
  {
    id: 'archivos',
    title: 'Archivos',
    intro: 'Sube lo que tengas. Si no tienes algo, no pasa nada.',
    fields: [
      {
        id: 'archivos',
        kind: 'files',
        label: 'Tus archivos',
        groups: [
          { id: 'logo', label: 'Logo', hint: 'SVG, AI, PDF o PNG en buena calidad', accept: '.svg,.ai,.eps,.pdf,.png,.jpg,.jpeg,.webp', multiple: true },
          { id: 'fotos', label: 'Fotos', hint: 'Tu negocio, tu equipo, tus productos', accept: 'image/*', multiple: true },
          { id: 'otros', label: 'Otros documentos', hint: 'Manual de marca, textos, presentaciones', accept: '.pdf,.doc,.docx,.ppt,.pptx,.txt,.zip,image/*', multiple: true },
        ],
      },
      { id: 'enlaceArchivos', kind: 'url', label: '¿Algo muy pesado? Compártenos un enlace', hint: 'Google Drive, Dropbox o WeTransfer.', placeholder: 'https://' },
    ],
  },
  {
    id: 'detalles',
    title: 'Detalles prácticos',
    intro: 'Lo último antes de enviar.',
    fields: [
      { id: 'dominio', kind: 'choice', label: '¿Tienes dominio?', options: ['Sí, ya tengo', 'No, necesito uno', 'No lo sé'] },
      { id: 'dominioNombre', kind: 'text', label: '¿Cuál es?', placeholder: 'tumarca.com', showIf: { field: 'dominio', equals: 'Sí, ya tengo' } },
      { id: 'fecha', kind: 'date', label: '¿Para cuándo te gustaría tenerla?' },
      { id: 'comentarios', kind: 'textarea', label: '¿Algo más que debamos saber?' },
      {
        id: 'consentimiento',
        kind: 'consent',
        label: 'Acepto que ALIVE use esta información y estos archivos para preparar mi proyecto, según el aviso de privacidad.',
        required: true,
      },
    ],
  },
]

export const isVisible = (field: Field, answers: Answers) =>
  !('showIf' in field) || !field.showIf || answers[field.showIf.field] === field.showIf.equals

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Devuelve los errores de un paso (id del campo → mensaje). Lo usan el cliente y el servidor.
export function validateStep(step: Step, answers: Answers): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const field of step.fields) {
    if (!isVisible(field, answers) || !('required' in field) || !field.required) continue
    const v = answers[field.id]
    const empty = v === undefined || v === '' || v === false || (Array.isArray(v) && v.length === 0)
    if (empty) errors[field.id] = field.kind === 'consent' ? 'Necesitamos tu autorización para continuar.' : 'Este dato es necesario.'
  }
  const email = answers.email
  if (step.fields.some((f) => f.id === 'email') && typeof email === 'string' && email && !EMAIL_RE.test(email.trim())) {
    errors.email = 'Revisa el correo: parece incompleto.'
  }
  return errors
}
