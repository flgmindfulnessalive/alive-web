// Servicios mensuales (alojamiento, SEO, retainer): lo que se cobra cada mes, su costo y qué meses
// ya están pagados. Se usa en la ficha del cliente y en el Resumen (ingreso recurrente y cobros del mes).

export type RecurringKind = 'aloj_web' | 'aloj_eco' | 'seo' | 'aloj_seo' | 'cuidado' | 'evoluciona' | 'otro'

export type Recurring = {
  id: string
  created_at: string
  client_id: string
  kind: RecurringKind
  name: string | null
  amount: number
  cost: number
  started_on: string
  ended_on: string | null
  billing_day: number
  paid_months: { month: string; paid_at: string }[]
  // Avisos de cobro ya enviados: ["2026-11:aviso", …]
  sent?: string[]
}

// Montos sugeridos según las fichas (el costo es lo que paga ALIVE por prestarlo).
export const KINDS: Record<RecurringKind, { label: string; amount?: number; cost?: number }> = {
  aloj_web: { label: 'Alojamiento web', amount: 10 }, // lo gestiona Francesco directamente
  aloj_eco: { label: 'Alojamiento Ecommerce', amount: 20, cost: 10 }, // proyecto adicional en Supabase Pro
  seo: { label: 'SEO mensual (sin alojamiento)', amount: 140 },
  aloj_seo: { label: 'SEO + alojamiento', amount: 150 }, // 160 si el alojamiento es de Ecommerce
  cuidado: { label: 'Plan Cuidado (proyecto a medida)', amount: 120 },
  evoluciona: { label: 'Plan Evoluciona (proyecto a medida)', amount: 390 },
  otro: { label: 'Otro servicio mensual' },
}

export const recurringName = (r: Pick<Recurring, 'kind' | 'name'>) => r.name || KINDS[r.kind].label

export const monthOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
export const monthName = (key: string) => MONTHS[Number(key.slice(5, 7)) - 1]

// Activo en un mes: empezó antes de que termine ese mes y no terminó antes de que empiece.
export function activeIn(r: Recurring, month: string) {
  return r.started_on.slice(0, 7) <= month && (!r.ended_on || r.ended_on.slice(0, 7) >= month)
}

export const isPaid = (r: Recurring, month: string) => r.paid_months.some((m) => m.month === month)

export function togglePaid(r: Recurring, month: string, today: string): Recurring['paid_months'] {
  return isPaid(r, month) ? r.paid_months.filter((m) => m.month !== month) : [...r.paid_months, { month, paid_at: today }]
}

// Ingreso recurrente mensual (lo que se factura cada mes) y su margen.
export function mrr(list: Recurring[], now = new Date()) {
  const month = monthOf(now)
  const active = list.filter((r) => activeIn(r, month))
  const income = active.reduce((a, r) => a + r.amount, 0)
  const cost = active.reduce((a, r) => a + r.cost, 0)
  return { active, income, cost, margin: income - cost }
}

// Pagos recurrentes registrados, con su fecha real de cobro (para «cobrado por mes»).
export const recurringPayments = (list: Recurring[]) => list.flatMap((r) => r.paid_months.map((m) => ({ date: m.paid_at, month: m.month, amount: r.amount, r })))

// ——— Cobro e impago (ficha SEO Mensual · S4) ———
// Los días se cuentan desde el día de cobro del mes impago más antiguo.
export type NoticeKey = 'aviso' | 'pausa' | 'riesgo' | 'ultimo' | 'suspension' | 'gracias'
export const isSeo = (r: Pick<Recurring, 'kind'>) => r.kind === 'seo' || r.kind === 'aloj_seo'
export const hasHosting = (r: Pick<Recurring, 'kind'>) => r.kind === 'aloj_web' || r.kind === 'aloj_eco' || r.kind === 'aloj_seo'

const dayMs = 864e5
const noon = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12)
export const billingDate = (month: string, day: number) => new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, day, 12)
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * dayMs)
const fmt = (d: Date) => `${d.getDate()} de ${MONTHS[d.getMonth()]}`

// Meses ya cobrables y sin pagar, del más antiguo al más reciente.
export function unpaidMonths(r: Recurring, now = new Date()) {
  const out: string[] = []
  let m = r.started_on.slice(0, 7)
  const current = monthOf(now)
  while (m <= current) {
    if (activeIn(r, m) && !isPaid(r, m) && billingDate(m, r.billing_day) <= noon(now)) out.push(m)
    const d = new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 1)
    m = monthOf(d)
  }
  return out
}

export function overdue(r: Recurring, now = new Date()) {
  const months = unpaidMonths(r, now)
  if (!months.length) return null
  const since = billingDate(months[0], r.billing_day)
  return { month: months[0], months, days: Math.round((noon(now).getTime() - since.getTime()) / dayMs), since }
}

const NOTICES: { key: NoticeKey; day: number; title: string; seoOnly?: boolean; hosting?: boolean }[] = [
  { key: 'aviso', day: 5, title: 'Aviso amable de pago' },
  { key: 'pausa', day: 10, title: 'SEO en pausa', seoOnly: true },
  { key: 'riesgo', day: 15, title: 'Alojamiento en riesgo', hosting: true },
  { key: 'ultimo', day: 25, title: 'Último aviso', hosting: true },
  { key: 'suspension', day: 35, title: 'Suspensión del alojamiento', hosting: true },
]
const applies = (r: Recurring, n: (typeof NOTICES)[number]) => (!n.seoOnly || isSeo(r)) && (!n.hosting || hasHosting(r))
export const noticeTitle = (k: NoticeKey) => (k === 'gracias' ? 'Pago regularizado' : NOTICES.find((n) => n.key === k)!.title)
export const wasNoticed = (r: Recurring, month: string, k: NoticeKey) => (r.sent ?? []).includes(`${month}:${k}`)

// El aviso que toca ahora (el más avanzado que aplica y no se envió), o null.
export function dueNotice(r: Recurring, now = new Date()) {
  const o = overdue(r, now)
  if (!o) return null
  const due = NOTICES.filter((n) => applies(r, n) && o.days >= n.day)
  const last = due[due.length - 1]
  if (!last || wasNoticed(r, o.month, last.key)) return null
  return { ...last, month: o.month, days: o.days }
}

// Estado para mostrar en la ficha y en el Resumen.
export function billingStatus(r: Recurring, now = new Date()): { tone: '' | 'warn' | 'crit'; text: string } {
  const o = overdue(r, now)
  if (!o) return { tone: '', text: 'Al día' }
  const n = o.months.length > 1 ? `${o.months.length} meses impagos` : `${monthName(o.month)} impago`
  if (hasHosting(r) && o.days >= 35) return { tone: 'crit', text: `${n} · día ${o.days}: suspender alojamiento` }
  if (isSeo(r) && o.days >= 10) return { tone: 'crit', text: `${n} · día ${o.days}: SEO en pausa` }
  if (o.days >= 5) return { tone: 'warn', text: `${n} · día ${o.days}` }
  return { tone: '', text: `${n} · vence el ${fmt(o.since)}` }
}

// Fin de la permanencia mínima (6 meses) de los planes con SEO.
export function commitmentEnd(r: Recurring) {
  if (!isSeo(r)) return null
  const d = new Date(Number(r.started_on.slice(0, 4)), Number(r.started_on.slice(5, 7)) - 1 + 6, 1)
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function noticeMessage(k: NoticeKey, r: Recurring, nombre: string, now = new Date()) {
  const o = overdue(r, now)
  const month = monthName(o?.month ?? monthOf(now))
  const plan = isSeo(r) ? (hasHosting(r) ? 'tu plan de SEO y alojamiento' : 'tu plan de SEO') : 'el alojamiento de tu web'
  const cut = o ? fmt(addDays(o.since, 35)) : '[fecha]'
  const keep = fmt(addDays(now, 30))
  const amount = `US$ ${r.amount.toLocaleString('es-PE', { maximumFractionDigits: 2 })}`
  switch (k) {
    case 'aviso':
      return `Hola ${nombre}, te escribo porque no vemos el pago de ${month} de ${plan} (${amount}). Puede que la tarjeta haya fallado; puedes actualizarla aquí: [enlace de Whop]. Cualquier cosa, me avisas.`
    case 'pausa':
      return `Hola ${nombre}, como aún no se registra el pago de ${month}, pausamos el trabajo de SEO de este mes. Tu web sigue en línea. Apenas se regularice, retomamos: [enlace de Whop].`
    case 'riesgo':
      return `Hola ${nombre}, sigue pendiente el pago de ${month}. Quiero avisarte con tiempo: si no se regulariza, el ${cut} tendríamos que suspender el alojamiento de tu web. Si estás pasando por algo, cuéntame y buscamos una solución.`
    case 'ultimo':
      return `Hola ${nombre}, es el último aviso: si el pago de ${month} no se regulariza antes del ${cut}, tu web dejará de estar en línea. Guardamos una copia completa por 30 días más para que puedas recuperarla.`
    case 'suspension':
      return `Hola ${nombre}, como no se registró el pago, hoy suspendimos el alojamiento de tu web. Guardamos una copia hasta el ${keep}. Si quieres reactivarla, regulariza el pago y la publicamos de nuevo el mismo día.`
    case 'gracias':
      return `¡Gracias, ${nombre}! Ya registramos el pago.${isSeo(r) ? ' Retomamos el trabajo de SEO esta semana.' : ''}`
  }
}

