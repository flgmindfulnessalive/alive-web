// Producción: etapas de cada proyecto (ficha operativa de Web Esencial), días hábiles (lunes a
// viernes), avisos por falta de respuesta (días 3, 7 y 10) y plantillas de WhatsApp.
// Lógica pura, sin React ni Supabase, para poder probarla aparte.

export type Service = 'we' | 'wep' | 'eco' | 'otro'
export type Owner = 'alive' | 'cliente'
export type HistoryItem = { i: number; s: string; e: string }

export type Project = {
  id: string
  created_at: string
  updated_at: string
  client_id: string
  service: Service
  title: string | null
  phase: number
  phase_started: string
  history: HistoryItem[]
  sent: string[]
  paused_since: string | null
  closed_admin: boolean
  paid_deposit: boolean
  paid_balance: boolean
  amount: number | null
  paid_deposit_at: string | null
  paid_balance_at: string | null
}

export const SERVICES: Record<Service, string> = {
  we: 'Web Esencial',
  wep: 'Web Esencial + Panel',
  eco: 'Ecommerce Esencial',
  otro: 'Otro servicio',
}
// Precio «desde» de cada servicio con ficha: se propone al crear el proyecto y se puede cambiar.
export const PRICE_FROM: Partial<Record<Service, number>> = { we: 350, wep: 450, eco: 750 }
export const money = (n: number | null | undefined) => (n == null ? '' : `US$ ${n.toLocaleString('es-PE', { maximumFractionDigits: 2 })}`)

export const projectName = (p: Pick<Project, 'service' | 'title'>) => (p.service === 'otro' ? p.title || 'Proyecto' : SERVICES[p.service])

// ——— Días hábiles ———
const noon = (d: string | Date) => {
  const x = typeof d === 'string' ? new Date(`${d.slice(0, 10)}T12:00:00`) : new Date(d)
  x.setHours(12, 0, 0, 0)
  return x
}
export const isBusinessDay = (d: Date) => d.getDay() % 6 !== 0
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function addBusinessDays(d: string | Date, n: number) {
  const x = noon(d)
  const step = Math.sign(n)
  let left = Math.abs(n)
  while (left > 0) {
    x.setDate(x.getDate() + step)
    if (isBusinessDay(x)) left--
  }
  return x
}

// Días hábiles de a a b (sin contar a). Negativo si b es anterior.
export function businessDaysBetween(a: string | Date, b: string | Date) {
  const from = noon(a)
  const to = noon(b)
  if (+from === +to) return 0
  const step = to > from ? 1 : -1
  let n = 0
  const x = new Date(from)
  while (+x !== +to) {
    x.setDate(x.getDate() + step)
    if (isBusinessDay(x)) n += step
  }
  return n
}

export const calendarDaysBetween = (a: string | Date, b: string | Date) => Math.round((+noon(b) - +noon(a)) / 864e5)

// Último día hábil hasta hoy (en fin de semana cuenta el viernes).
export function businessToday(now = new Date()) {
  const d = noon(now)
  while (!isBusinessDay(d)) d.setDate(d.getDate() - 1)
  return d
}

const DAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic']
export const shortDate = (d: string | Date) => {
  const x = noon(d)
  return `${DAYS[x.getDay()]} ${x.getDate()} ${MONTHS[x.getMonth()]}`
}
export const dayLabel = (d: Date) => DAYS[d.getDay()].slice(0, 2)

// ——— Etapas de la ficha Web Esencial (desde la propuesta aceptada) ———
export type Phase = { o: Owner; d: number; l: string; pago?: 'deposit' | 'balance' }
export const STAGES_WE: { n: string; f: Phase[] }[] = [
  { n: 'Inicio', f: [{ o: 'cliente', d: 5, l: 'Pago del 70 % y materiales', pago: 'deposit' }] },
  {
    n: 'Dirección visual',
    f: [
      { o: 'alive', d: 1, l: 'Diseñar la portada' },
      { o: 'cliente', d: 2, l: 'Aprobar la portada' },
    ],
  },
  { n: 'Construcción', f: [{ o: 'alive', d: 2, l: 'Secciones, formulario, WhatsApp, SEO y panel si aplica' }] },
  {
    n: 'Ronda de cambios 1',
    f: [
      { o: 'cliente', d: 3, l: 'Enviar la lista de cambios' },
      { o: 'alive', d: 1, l: 'Aplicar cambios' },
    ],
  },
  {
    n: 'Ronda de cambios 2',
    f: [
      { o: 'cliente', d: 3, l: 'Cambios o aprobación final' },
      { o: 'alive', d: 1, l: 'Aplicar cambios' },
    ],
  },
  {
    n: 'Entrega',
    f: [
      { o: 'cliente', d: 2, l: 'Pago del 30 %', pago: 'balance' },
      { o: 'alive', d: 1, l: 'Publicar y entregar accesos y guía' },
    ],
  },
  { n: 'Cierre', f: [{ o: 'alive', d: 8, l: 'Acompañamiento (10 días naturales)' }] },
]

// ——— Etapas de la ficha Ecommerce Esencial ———
export const STAGES_ECO: { n: string; f: Phase[] }[] = [
  { n: 'Inicio', f: [{ o: 'cliente', d: 5, l: 'Pago del 70 %, materiales y planilla de productos', pago: 'deposit' }] },
  {
    n: 'Dirección visual',
    f: [
      { o: 'alive', d: 2, l: 'Diseñar la portada y la ficha de producto' },
      { o: 'cliente', d: 2, l: 'Aprobar la dirección visual' },
    ],
  },
  { n: 'Construcción', f: [{ o: 'alive', d: 8, l: 'Catálogo, carrito, checkout, pedidos, envíos y legales' }] },
  { n: 'Carga del catálogo', f: [{ o: 'alive', d: 3, l: 'Fichas de producto con IA' }] },
  {
    n: 'Ronda de cambios 1',
    f: [
      { o: 'cliente', d: 3, l: 'Revisar tienda y fichas en una sola lista' },
      { o: 'alive', d: 2, l: 'Aplicar cambios' },
    ],
  },
  {
    n: 'Ronda de cambios 2',
    f: [
      { o: 'cliente', d: 3, l: 'Cambios o aprobación final' },
      { o: 'alive', d: 1, l: 'Aplicar cambios' },
    ],
  },
  { n: 'Pruebas de pago', f: [{ o: 'alive', d: 1, l: 'Compra real, reembolso, correo y stock' }] },
  {
    n: 'Entrega',
    f: [
      { o: 'cliente', d: 2, l: 'Pago del 30 %', pago: 'balance' },
      { o: 'alive', d: 1, l: 'Publicar y entregar accesos y guía de pedidos' },
    ],
  },
  { n: 'Cierre', f: [{ o: 'alive', d: 11, l: 'Acompañamiento hasta el primer pedido (15 días naturales)' }] },
]

const flatten = (stages: { n: string; f: Phase[] }[]) => stages.flatMap((s, stage) => s.f.map((f) => ({ ...f, stage })))
export type FlowPhase = Phase & { stage: number }
export type Flow = {
  stages: { n: string; f: Phase[] }[]
  phases: FlowPhase[]
  last: number
  support: number // días naturales de acompañamiento
  plazo: number // días hábiles de trabajo prometidos
  thing: string // «tu web» o «tu tienda» en los mensajes
}
const mkFlow = (stages: Flow['stages'], support: number, plazo: number, thing: string): Flow => ({
  stages,
  phases: flatten(stages),
  last: stages.length - 1,
  support,
  plazo,
  thing,
})
const FLOW_WE = mkFlow(STAGES_WE, 10, 10, 'tu web')
const FLOW_ECO = mkFlow(STAGES_ECO, 15, 20, 'tu tienda')
export const flowOf = (service: Service) => (service === 'eco' ? FLOW_ECO : FLOW_WE)

// ——— Plantillas (documento operativo · Común 7) ———
export type TemplateKey =
  | 'inicio'
  | 'materiales'
  | 'revision'
  | 'recordatorio'
  | 'aviso'
  | 'pausa'
  | 'cierreAdm'
  | 'reactivacion'
  | 'final'
  | 'cierre'
type Ctx = { nombre: string; project: Project }
const F = (c: Ctx) => flowOf(c.project.service)
const panelGuide = (c: Ctx) =>
  c.project.service === 'wep' ? ' y la guía de tu panel' : c.project.service === 'eco' ? ' y la guía de tu panel de pedidos' : ''
export const TEMPLATES: Record<TemplateKey, { t: string; m: (c: Ctx) => string }> = {
  inicio: {
    t: 'Inicio del proyecto',
    m: (c) =>
      `Hola ${c.nombre}, confirmamos tu pago, ¡empezamos! Para avanzar necesito estos materiales: [lista corta o enlace al brief]. En cuanto los tenga completos, el plazo es de hasta ${F(c).plazo} días hábiles de trabajo (no cuentan los días en que esperamos tu respuesta). Cualquier duda, escríbeme por aquí.`,
  },
  materiales: {
    t: 'Materiales pendientes',
    m: (c) =>
      `Hola ${c.nombre}, ya revisé lo que enviaste, gracias. Para arrancar me falta: [lista]. Si alguno no lo tienes, dime y vemos una alternativa.`,
  },
  revision: {
    t: 'Entrega para revisión',
    m: (c) =>
      `Hola ${c.nombre}, ya puedes ver ${F(c).thing} aquí: [enlace]. Revísala con calma y envíame todos tus comentarios juntos en un solo mensaje, así lo resolvemos en una ronda. Quedo atento en los próximos días.`,
  },
  recordatorio: {
    t: 'Recordatorio (día 3)',
    m: (c) => `Hola ${c.nombre}, te escribo por si se te pasó: ${F(c).thing} está lista para revisar en [enlace]. ¿Pudiste verla?`,
  },
  aviso: {
    t: 'Aviso de pausa (día 7)',
    m: (c) =>
      `Hola ${c.nombre}, sigo atento a tus comentarios sobre ${F(c).thing}. Si no tengo respuesta hasta el ${shortDate(addBusinessDays(c.project.phase_started, 10))}, pondré el proyecto en pausa para no dejarlo a medias. Podrás retomarlo cuando quieras.`,
  },
  pausa: {
    t: 'Proyecto en pausa (día 10)',
    m: (c) =>
      `Hola ${c.nombre}, como no he recibido respuesta, el proyecto queda en pausa desde hoy. Cuando quieras retomarlo, escríbeme y lo reactivamos. Si pasan 30 días sin novedades, lo daré por cerrado.`,
  },
  cierreAdm: {
    t: 'Cierre administrativo',
    m: (c) =>
      `Hola ${c.nombre}, tal como te comenté, el proyecto queda cerrado. Si más adelante quieres retomarlo, se reactiva con el pago del 30 % pendiente y seguimos desde donde lo dejamos.`,
  },
  reactivacion: {
    t: 'Reactivación',
    m: (c) => `¡Qué bueno saber de ti, ${c.nombre}! Retomamos. En cuanto lo tenga todo, te comparto las fechas.`,
  },
  final: {
    t: 'Entrega final',
    m: (c) =>
      `Hola ${c.nombre}, ¡${F(c).thing} está aprobada! Para publicarla en tu dominio, el siguiente paso es el pago del 30 % restante: [enlace]. Apenas se confirme, la publico y te envío los accesos${panelGuide(c)}.`,
  },
  cierre: {
    t: 'Cierre del proyecto',
    m: (c) =>
      `Hola ${c.nombre}, ${F(c).thing} ya está publicada en [dominio]. Te envío los accesos${panelGuide(c)}. Tienes ${F(c).support} días de acompañamiento para dudas o ajustes menores${c.project.service === 'eco' ? ', y vemos juntos tu primer pedido real' : ''}. Gracias por confiar en ALIVE.`,
  },
}

// ——— Estado de un proyecto ———
export type Status =
  | { kind: 'sinficha' }
  | { kind: 'terminado' }
  | { kind: 'pausa'; phase: FlowPhase; days: number; pausedDays: number }
  | { kind: 'acompanamiento'; phase: FlowPhase; days: number; calendar: number }
  | { kind: Owner; phase: FlowPhase; days: number; late: boolean }

export function statusOf(p: Project, today = businessToday()): Status {
  if (p.service === 'otro') return { kind: 'sinficha' }
  const fl = flowOf(p.service)
  if (p.phase >= fl.phases.length) return { kind: 'terminado' }
  const phase = fl.phases[p.phase]
  const days = Math.max(0, businessDaysBetween(p.phase_started, today))
  if (p.paused_since) return { kind: 'pausa', phase, days, pausedDays: calendarDaysBetween(p.paused_since, new Date()) }
  if (phase.stage === fl.last) return { kind: 'acompanamiento', phase, days, calendar: calendarDaysBetween(p.phase_started, new Date()) }
  return { kind: phase.o, phase, days, late: days >= phase.d }
}

export const wasSent = (p: Project, k: TemplateKey) => p.sent.includes(`${p.phase}:${k}`)

export type Task = { key?: TemplateKey; level: 'crit' | 'warn' | 'info'; text: string }

// Qué mensaje toca hoy en cada proyecto.
export function tasksOf(p: Project, today = businessToday()): Task[] {
  const s = statusOf(p, today)
  const out: Task[] = []
  if (s.kind === 'pausa') {
    if (s.pausedDays >= 30 && !wasSent(p, 'cierreAdm'))
      out.push({ key: 'cierreAdm', level: 'crit', text: '30 días en pausa: toca el cierre administrativo' })
    return out
  }
  if (s.kind === 'cliente') {
    const base: TemplateKey = s.phase.stage === 0 ? 'inicio' : s.phase.pago === 'balance' ? 'final' : 'revision'
    if (!wasSent(p, base)) out.push({ key: base, level: 'info', text: `Etapa nueva: enviar «${TEMPLATES[base].t}»` })
    if (s.days >= 10 && !wasSent(p, 'pausa'))
      out.push({ key: 'pausa', level: 'crit', text: `Día ${s.days} sin respuesta: pausar el proyecto` })
    else if (s.days >= 7 && !wasSent(p, 'aviso'))
      out.push({ key: 'aviso', level: 'warn', text: `Día ${s.days} sin respuesta: avisar la pausa` })
    else if (s.days >= 3 && !wasSent(p, 'recordatorio'))
      out.push({ key: 'recordatorio', level: 'warn', text: `Día ${s.days} sin respuesta: enviar recordatorio` })
  }
  if (s.kind === 'acompanamiento' && !wasSent(p, 'cierre'))
    out.push({ key: 'cierre', level: 'info', text: 'Publicado: enviar «Cierre del proyecto»' })
  if (s.kind === 'acompanamiento' && s.calendar >= flowOf(p.service).support)
    out.push({ level: 'info', text: `Pasaron los ${flowOf(p.service).support} días de acompañamiento: cerrar el proyecto` })
  return out
}

export function statusLabel(p: Project, s = statusOf(p)): { tone: '' | 'ok' | 'warn' | 'crit' | 'pause'; text: string } {
  if (s.kind === 'sinficha') return { tone: '', text: 'Sin ficha' }
  if (s.kind === 'terminado') return { tone: 'ok', text: p.closed_admin ? 'Cierre administrativo' : 'Cerrado' }
  if (s.kind === 'pausa') return { tone: 'pause', text: `En pausa · ${s.pausedDays} de 30 días` }
  if (s.kind === 'acompanamiento') return { tone: 'ok', text: `Acompañamiento · día ${s.calendar} de ${flowOf(p.service).support}` }
  const who = s.kind === 'alive' ? 'ALIVE' : 'Cliente'
  const tone = !s.late ? '' : s.days >= 7 ? 'crit' : 'warn'
  return { tone, text: `${flowOf(p.service).stages[s.phase.stage].n} · ${who} · día ${s.days}/${s.phase.d}` }
}

// Cambios al marcar la fase actual como hecha.
export function advance(p: Project, today = iso(businessToday())): Partial<Project> {
  return {
    history: [...p.history, { i: p.phase, s: p.phase_started, e: today }],
    phase: p.phase + 1,
    phase_started: today,
  }
}

// Deshacer el último «Marcar como hecho» (o un cierre administrativo): vuelve a la fase anterior con sus fechas.
export function undo(p: Project): Partial<Project> | null {
  const last = p.history[p.history.length - 1]
  if (!last) return null
  return { history: p.history.slice(0, -1), phase: last.i, phase_started: last.s, closed_admin: false, paused_since: null }
}

// Efectos de enviar un mensaje: se marca como enviado y, si es de pausa, cierre o reactivación, cambia el estado.
export function afterMessage(p: Project, k: TemplateKey, today = iso(businessToday())): Partial<Project> {
  const patch: Partial<Project> = { sent: p.sent.includes(`${p.phase}:${k}`) ? p.sent : [...p.sent, `${p.phase}:${k}`] }
  if (k === 'pausa' && p.service !== 'otro') patch.paused_since = today
  if (k === 'reactivacion' && p.paused_since) Object.assign(patch, { paused_since: null, phase_started: today })
  const total = flowOf(p.service).phases.length
  // El cierre administrativo solo cierra un proyecto en pausa (evita cerrarlo por error desde «Otros mensajes»).
  if (k === 'cierreAdm' && p.service !== 'otro' && p.phase < total && p.paused_since)
    Object.assign(patch, {
      history: [...p.history, { i: p.phase, s: p.phase_started, e: p.paused_since ?? today }],
      phase: total,
      paused_since: null,
      closed_admin: true,
    })
  return patch
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] || name
// Solo dígitos, con código de país. Un celular peruano escrito sin código (9 dígitos que empiezan
// por 9) se completa con 51 para que el enlace de WhatsApp funcione.
export function waNumber(phone: string | null) {
  const d = (phone ?? '').replace(/\D/g, '').replace(/^00/, '')
  return /^9\d{8}$/.test(d) ? `51${d}` : d
}
