// Cálculos del Resumen: cobros, por cobrar, ventas, embudo, producción y prioridades.
// Todo sale de los datos del panel (clientes y proyectos); nada se estima por fuera.
import type { Client } from './data'
import { activeIn, billingStatus, dueNotice, isPaid, monthName, mrr, overdue, recurringName, recurringPayments, type Recurring } from './recurring'
import {
  businessDaysBetween,
  businessToday,
  calendarDaysBetween,
  flowOf,
  projectName,
  statusOf,
  tasksOf,
  TEMPLATES,
  isWon,
  type Deal,
  type Project,
  type TemplateKey,
} from './production'

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic']
const monthKey = (d: string) => d.slice(0, 7)
const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

export type Payment = {
  date: string
  amount: number
  kind: 'deposit' | 'balance'
  project: Project
}

// Pagos registrados. Si un pago se marcó antes de que existiera su fecha, se usa la mejor aproximación:
// el fin de la etapa de inicio (70 %) o la última modificación del proyecto (30 %).
export function paymentsOf(p: Project): Payment[] {
  if (!p.amount) return []
  const out: Payment[] = []
  if (p.paid_deposit)
    out.push({
      kind: 'deposit',
      amount: Math.round(p.amount * 70) / 100,
      project: p,
      date: p.paid_deposit_at ?? p.history[0]?.e ?? p.created_at.slice(0, 10),
    })
  if (p.paid_balance)
    out.push({
      kind: 'balance',
      amount: Math.round(p.amount * 30) / 100,
      project: p,
      date: p.paid_balance_at ?? p.updated_at.slice(0, 10),
    })
  return out
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

// ——— Periodo del Resumen ———
const MONTHS_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
export type PeriodChoice = { kind: 'last'; n: number } | { kind: 'month'; key: string }
export type Period = { months: string[]; previous: string[]; label: string; short: string }

const shiftMonth = (key: string, delta: number) => {
  const d = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1 + delta, 1)
  return keyOf(d)
}
const monthLabel = (key: string, long = true) => `${(long ? MONTHS_LONG : MONTHS)[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`

// Meses que abarca la elección (del más antiguo al más reciente) y el periodo anterior de igual largo.
export function periodOf(choice: PeriodChoice, now = new Date()): Period {
  const current = keyOf(now)
  const end = choice.kind === 'month' ? choice.key : current
  const n = choice.kind === 'month' ? 1 : choice.n
  const months = Array.from({ length: n }, (_, i) => shiftMonth(end, i - (n - 1)))
  const previous = months.map((m) => shiftMonth(m, -n))
  const label =
    choice.kind === 'month'
      ? monthLabel(choice.key)
      : n === 1
        ? `este mes (${monthLabel(current)})`
        : n === 12
          ? 'el último año'
          : `los últimos ${n} meses`
  const short = choice.kind === 'month' || n === 1 ? MONTHS[Number(end.slice(5, 7)) - 1] : n === 12 ? '12 meses' : `${n} meses`
  return { months, previous, label, short }
}

// Meses para elegir uno en concreto: los últimos 24.
export const monthOptions = (now = new Date()) =>
  Array.from({ length: 24 }, (_, i) => shiftMonth(keyOf(now), -i)).map((key) => ({ key, label: monthLabel(key) }))

export type Priority = {
  id: string
  level: 'crit' | 'warn' | 'info'
  title: string
  detail: string
  amount?: number
  target: { kind: 'project'; id: string } | { kind: 'client'; id: string } | { kind: 'deal'; id: string }
  message?: TemplateKey
}

export function buildDashboard(
  clients: Client[],
  allProjects: Project[],
  now = new Date(),
  recurring: Recurring[] = [],
  period: Period = periodOf({ kind: 'last', n: 1 }, now),
) {
  const today = businessToday(now)
  const thisMonth = keyOf(now)
  // Proyectos = oportunidades ganadas (Producción, cobros). Las demás son ventas en curso o perdidas.
  const projects = allProjects.filter(isWon)
  const deals = allProjects
  const withDeals = new Set(allProjects.map((p) => p.client_id))
  const leads = clients.filter((c) => c.stage === 'nuevo' && !withDeals.has(c.id))
  const wonDate = (p: Project) => p.won_at ?? p.created_at.slice(0, 10)
  const inPeriod = (d: string) => period.months.includes(monthKey(d))
  const inPrevious = (d: string) => period.previous.includes(monthKey(d))
  const clientById = new Map(clients.map((c) => [c.id, c]))
  const label = (id: string) => {
    const c = clientById.get(id)
    return c ? c.company || c.name : 'Cliente'
  }

  // ——— Dinero ———
  // Cobros: pagos de proyectos y de servicios mensuales, por la fecha en que se marcaron.
  const payments: { date: string; amount: number }[] = [...projects.flatMap(paymentsOf), ...recurringPayments(recurring)]
  const recurrente = mrr(recurring, now)
  // Por cobrar mensual: meses impagos ya vencidos más el mes en curso si aún no se pagó.
  const porCobrarRecurrente = recurring.reduce((a, x) => {
    const late = overdue(x, now)?.months ?? []
    const current = activeIn(x, thisMonth) && !isPaid(x, thisMonth) && !late.includes(thisMonth) ? 1 : 0
    return a + x.amount * (late.length + current)
  }, 0)
  const cobradoMes = sum(payments.filter((x) => inPeriod(x.date)).map((x) => x.amount))
  const cobradoMesAnterior = sum(payments.filter((x) => inPrevious(x.date)).map((x) => x.amount))
  const endYear = period.months[period.months.length - 1].slice(0, 4)
  const cobradoAnio = sum(payments.filter((x) => x.date.startsWith(endYear)).map((x) => x.amount))

  const open = projects.filter((p) => !p.closed_admin && p.amount)
  const pendingDeposit = sum(open.filter((p) => !p.paid_deposit).map((p) => Math.round(p.amount! * 70) / 100))
  const pendingBalance = sum(open.filter((p) => !p.paid_balance).map((p) => Math.round(p.amount! * 30) / 100))
  const porCobrar = pendingDeposit + pendingBalance + porCobrarRecurrente

  const vendidos = projects.filter((p) => inPeriod(wonDate(p)))
  const vendidoMes = sum(vendidos.map((p) => p.amount ?? 0))
  const vendidoAnterior = sum(projects.filter((p) => inPrevious(wonDate(p))).map((p) => p.amount ?? 0))
  // Ventas a clientes que ya habían comprado antes.
  const repiten = vendidos.filter((p) => projects.some((o) => o.client_id === p.client_id && o.id !== p.id && wonDate(o) < wonDate(p))).length
  const proyectosMes = vendidos.length
  const withAmount = vendidos.filter((p) => p.amount)
  const ticket = withAmount.length ? sum(withAmount.map((p) => p.amount!)) / withAmount.length : null
  const sinMonto = projects.filter((p) => p.amount == null && !p.closed_admin)

  // Gráficos: los meses del periodo; si son menos de 6, los 6 que terminan en el último del periodo.
  const endKey = period.months[period.months.length - 1]
  const chartMonths =
    period.months.length >= 6
      ? period.months.map((key) => ({ key, label: MONTHS[Number(key.slice(5, 7)) - 1], year: Number(key.slice(0, 4)) }))
      : Array.from({ length: 6 }, (_, i) => shiftMonth(endKey, i - 5)).map((key) => ({
          key,
          label: MONTHS[Number(key.slice(5, 7)) - 1],
          year: Number(key.slice(0, 4)),
        }))
  const cobradoPorMes = chartMonths.map((m) => ({
    ...m,
    inPeriod: period.months.includes(m.key),
    value: sum(payments.filter((x) => monthKey(x.date) === m.key).map((x) => x.amount)),
  }))

  // ——— Comercial ———
  const periodClients = clients.filter((c) => inPeriod(c.created_at))
  // Embudo del periodo: consultas nuevas sin oportunidad, y oportunidades abiertas en el periodo según su etapa actual.
  const periodDeals = deals.filter((p) => inPeriod(p.created_at))
  const dealCount = (s: Deal) => periodDeals.filter((p) => p.deal_stage === s).length
  const funnel = [
    { id: 'nuevo', name: 'Consultas sin oportunidad', count: leads.filter((c) => inPeriod(c.created_at)).length, value: 0 },
    ...(
      [
        ['conversacion', 'En conversación'],
        ['propuesta', 'Propuesta enviada'],
        ['ganado', 'Ganadas'],
        ['perdido', 'Perdidas'],
      ] as const
    ).map(([id, name]) => ({
      id,
      name,
      count: dealCount(id),
      value: sum(periodDeals.filter((p) => p.deal_stage === id).map((p) => p.amount ?? 0)),
    })),
  ]
  const negociacion = deals.filter((p) => p.deal_stage === 'conversacion' || p.deal_stage === 'propuesta')
  const enNegociacion = sum(negociacion.map((p) => p.amount ?? 0))
  const negociacionSinValor = negociacion.filter((p) => p.amount == null).length
  const decididos = dealCount('ganado') + dealCount('perdido')
  const conversion = decididos ? Math.round((dealCount('ganado') / decididos) * 100) : null
  const leadsPorMes = chartMonths.map((m) => ({
    ...m,
    inPeriod: period.months.includes(m.key),
    value: clients.filter((c) => monthKey(c.created_at) === m.key).length,
  }))
  const leadsMes = periodClients.length
  const leadsAnterior = clients.filter((c) => inPrevious(c.created_at)).length
  const origen = (['brief', 'contacto', 'manual'] as const).map((s) => ({
    id: s,
    count: periodClients.filter((c) => c.source === s).length,
  }))

  // ——— Servicios ———
  const servicios = (['we', 'wep', 'eco', 'mar', 'mid', 'med', 'otro'] as const)
    .map((s) => {
      const ps = vendidos.filter((p) => p.service === s)
      return {
        id: s,
        count: ps.length,
        amount: sum(ps.map((p) => p.amount ?? 0)),
      }
    })
    .filter((s) => s.count)

  // ——— Producción ———
  const status = projects.map((p) => ({ p, s: statusOf(p, today) }))
  const activos = status.filter(({ s }) => !['sinficha', 'terminado'].includes(s.kind))
  const conAlive = activos.filter(({ s }) => s.kind === 'alive').length
  const conCliente = activos.filter(({ s }) => s.kind === 'cliente').length
  const enPausa = activos.filter(({ s }) => s.kind === 'pausa').length
  const fueraDePlazo = activos.filter(({ s }) => (s.kind === 'alive' || s.kind === 'cliente') && s.late).length
  // Etapas terminadas a tiempo: cada fase cerrada frente a su tiempo acordado (sin el acompañamiento).
  const fases = projects.flatMap((p) => {
    const fl = flowOf(p.service)
    if (p.service === 'otro') return []
    return p.history
      .filter((h) => fl.phases[h.i] && fl.phases[h.i].stage !== fl.last)
      .map((h) => ({
        owner: fl.phases[h.i].o,
        onTime: businessDaysBetween(h.s, h.e) <= fl.phases[h.i].d,
        days: businessDaysBetween(h.s, h.e),
      }))
  })
  const aTiempo = fases.filter((f) => f.owner === 'alive')
  const aTiempoPct = aTiempo.length ? Math.round((aTiempo.filter((f) => f.onTime).length / aTiempo.length) * 100) : null
  const esperas = fases.filter((f) => f.owner === 'cliente')
  const esperaPromedio = esperas.length ? Math.round((sum(esperas.map((f) => f.days)) / esperas.length) * 10) / 10 : null

  // ——— Prioridades ———
  const priorities: Priority[] = []
  for (const { p, s } of status) {
    const name = `${label(p.client_id)} · ${projectName(p)}`
    for (const t of tasksOf(p, today))
      priorities.push({
        id: `${p.id}-${t.key ?? t.text}`,
        level: t.level,
        title: t.key ? TEMPLATES[t.key].t : 'Cerrar el proyecto',
        detail: `${name} · ${t.text}`,
        target: { kind: 'project', id: p.id },
        message: t.key,
      })
    // Cobros que frenan el avance: la fase actual espera un pago no marcado.
    if ((s.kind === 'cliente' || s.kind === 'alive') && s.phase.pago && p.amount) {
      const unpaid = s.phase.pago === 'deposit' ? !p.paid_deposit : !p.paid_balance
      if (unpaid) {
        const pct = s.phase.pago === 'deposit' ? 70 : 30
        priorities.push({
          id: `${p.id}-cobro`,
          level: 'warn',
          title: `Cobrar el ${pct} %`,
          detail: `${name} · el proyecto no avanza sin este pago`,
          amount: Math.round(p.amount * pct) / 100,
          target: { kind: 'project', id: p.id },
        })
      }
    }
  }
  for (const c of clients) {
    const who = c.company || c.name
    const age = businessDaysBetween(c.created_at.slice(0, 10), today)
    if (c.stage === 'nuevo' && !withDeals.has(c.id) && age >= 1)
      priorities.push({
        id: `${c.id}-nuevo`,
        level: age >= 3 ? 'crit' : 'warn',
        title: 'Responder consulta nueva',
        detail: `${who} · ${age === 1 ? 'llegó hace 1 día hábil' : `llegó hace ${age} días hábiles`} (la ficha pide responder en 1)`,
        target: { kind: 'client', id: c.id },
      })
  }
  // Clientes de antes de las oportunidades que quedaron sin ninguna (por ejemplo, «ganado» sin proyecto).
  for (const c of clients.filter((x) => (x.stage === 'ganado' || x.stage === 'conversacion' || x.stage === 'propuesta') && !withDeals.has(x.id)))
    priorities.push({
      id: `${c.id}-sinoportunidad`,
      level: 'info',
      title: 'Crear su oportunidad',
      detail: `${c.company || c.name} · no tiene oportunidad ni proyecto; sin ella no aparece en el tablero`,
      target: { kind: 'client', id: c.id },
    })
  for (const p of deals.filter((x) => x.deal_stage === 'propuesta')) {
    const who = label(p.client_id)
    const quiet = calendarDaysBetween(p.deal_updated_at.slice(0, 10), now)
    if (quiet >= 30)
      priorities.push({
        id: `${p.id}-vencida`,
        level: 'warn',
        title: 'Propuesta vencida',
        detail: `${who} · ${projectName(p)} · enviada hace ${quiet} días; vale 30. Renueva o marca como perdida`,
        amount: p.amount ?? undefined,
        target: { kind: 'deal', id: p.id },
      })
    else if (quiet >= 5)
      priorities.push({
        id: `${p.id}-seguimiento`,
        level: 'info',
        title: 'Seguimiento de propuesta',
        detail: `${who} · ${projectName(p)} · enviada hace ${quiet} días`,
        amount: p.amount ?? undefined,
        target: { kind: 'deal', id: p.id },
      })
  }
  for (const p of sinMonto)
    priorities.push({
      id: `${p.id}-monto`,
      level: 'info',
      title: 'Completar el monto',
      detail: `${label(p.client_id)} · ${projectName(p)} · sin monto no entra en cobros`,
      target: { kind: 'project', id: p.id },
    })
  const order = { crit: 0, warn: 1, info: 2 }
  // Cobros mensuales impagos, con el aviso que toca según los días desde el día de cobro (ficha SEO · S4).
  for (const x of recurring) {
    const o = overdue(x, now)
    if (!o) continue
    const n = dueNotice(x, now)
    const status = billingStatus(x, now)
    priorities.push({
      id: `${x.id}-cobro-${o.month}`,
      level: status.tone === 'crit' ? 'crit' : status.tone === 'warn' ? 'warn' : 'info',
      title: n ? `${n.title}: ${recurringName(x).toLowerCase()}` : `Cobrar ${recurringName(x).toLowerCase()} de ${monthName(o.month)}`,
      detail: `${label(x.client_id)} · ${status.text}${n ? ' · mensaje listo en su ficha' : ''}`,
      amount: x.amount * o.months.length,
      target: { kind: 'client', id: x.client_id },
    })
  }
  priorities.sort((a, b) => order[a.level] - order[b.level])

  return {
    repiten,
    period,
    vendidoAnterior,
    leadsAnterior,
    recurrente,
    porCobrarRecurrente,
    recurringList: recurring.filter((x) => activeIn(x, thisMonth)),
    thisMonth,
    cobradoMes,
    cobradoMesAnterior,
    cobradoAnio,
    porCobrar,
    pendingDeposit,
    pendingBalance,
    vendidoMes,
    proyectosMes,
    ticket,
    cobradoPorMes,
    funnel,
    enNegociacion,
    negociacion: negociacion.length,
    negociacionSinValor,
    conversion,
    decididos,
    leadsPorMes,
    leadsMes,
    origen,
    servicios,
    activos: activos.length,
    conAlive,
    conCliente,
    enPausa,
    fueraDePlazo,
    aTiempoPct,
    aTiempoN: aTiempo.length,
    esperaPromedio,
    priorities,
    monthLabel: MONTHS[now.getMonth()],
    year: Number(endYear),
  }
}
