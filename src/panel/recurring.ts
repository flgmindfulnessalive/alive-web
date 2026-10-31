// Servicios mensuales (alojamiento, SEO, retainer): lo que se cobra cada mes, su costo y qué meses
// ya están pagados. Se usa en la ficha del cliente y en el Resumen (ingreso recurrente y cobros del mes).

export type RecurringKind = 'aloj_web' | 'aloj_eco' | 'seo' | 'aloj_seo' | 'otro'

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
}

// Montos sugeridos según las fichas (el costo es lo que paga ALIVE por prestarlo).
export const KINDS: Record<RecurringKind, { label: string; amount?: number; cost?: number }> = {
  aloj_web: { label: 'Alojamiento Web Esencial', amount: 10, cost: 10 },
  aloj_eco: { label: 'Alojamiento Ecommerce', amount: 20, cost: 10 }, // proyecto adicional en Supabase Pro
  seo: { label: 'SEO mensual' },
  aloj_seo: { label: 'Alojamiento + SEO' },
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
