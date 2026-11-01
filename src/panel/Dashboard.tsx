// Resumen del panel: cuánto se cobra y se vende, qué hay por cobrar, qué toca hoy y cómo va el negocio.
import { useMemo, useState } from 'react'
import type { Client } from './data'
import { buildDashboard, monthOptions, periodOf, type PeriodChoice, type Priority } from './dashboard'
import { money, SERVICES, shortDate, type Project } from './production'
import { isPaid, monthName, recurringName, togglePaid, type Recurring } from './recurring'

type Props = {
  clients: Client[]
  projects: Project[]
  onOpenClient: (id: string) => void
  onOpenProject: (id: string) => void
  onOpenDeal: (id: string) => void
  onGo: (section: 'clientes' | 'produccion') => void
  recurring: Recurring[]
  recurringMissing: boolean
  onToggleRecurring: (id: string, patch: Partial<Recurring>) => Promise<boolean>
}

const SOURCE: Record<string, string> = {
  brief: 'Brief',
  contacto: 'Formulario',
  manual: 'Manual',
}
const usd = (n: number) => money(n) || 'US$ 0'

function greeting(now: Date) {
  const h = now.getHours()
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
}

export function Dashboard({ clients, projects, onOpenClient, onOpenProject, onOpenDeal, onGo, recurring, recurringMissing, onToggleRecurring }: Props) {
  const [now] = useState(() => new Date())
  // Periodo elegido (se recuerda en este navegador).
  const [choice, setChoice] = useState<PeriodChoice>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('alive-panel-periodo') ?? 'null') as PeriodChoice | null
      if (saved && (saved.kind === 'last' || saved.kind === 'month')) return saved
    } catch {
      // sin almacenamiento: se usa el mes actual
    }
    return { kind: 'last', n: 1 }
  })
  const pick = (c: PeriodChoice) => {
    setChoice(c)
    try {
      localStorage.setItem('alive-panel-periodo', JSON.stringify(c))
    } catch {
      // no se pudo recordar; no pasa nada
    }
  }
  const period = useMemo(() => periodOf(choice, now), [choice, now])
  const months = useMemo(() => monthOptions(now), [now])
  const d = useMemo(() => buildDashboard(clients, projects, now, recurring, period), [clients, projects, now, recurring, period])
  const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : null)
  const clientName = (id: string) => {
    const c = clients.find((x) => x.id === id)
    return c ? c.company || c.name : 'Cliente'
  }
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const delta = pct(d.cobradoMes, d.cobradoMesAnterior)
  const deltaVendido = pct(d.vendidoMes, d.vendidoAnterior)
  const before = choice.kind === 'last' && choice.n === 1 ? 'al mes anterior' : 'al periodo anterior'
  const open = (p: Priority) =>
    p.target.kind === 'project' ? onOpenProject(p.target.id) : p.target.kind === 'deal' ? onOpenDeal(p.target.id) : onOpenClient(p.target.id)
  const top = d.priorities.slice(0, 8)

  return (
    <div className="dash">
      <header className="dash-head">
        <div>
          <p className="eyebrow">
            Hoy · {shortDate(now)}
          </p>
          <h1 className="panel-h1">{greeting(now)}.</h1>
          <p className="panel-muted">
            {d.priorities.length
              ? `Tienes ${d.priorities.length} ${d.priorities.length === 1 ? 'cosa' : 'cosas'} por atender${d.priorities.some((p) => p.level === 'crit') ? ', alguna urgente' : ''}.`
              : 'Todo al día. Nada urgente por atender.'}
          </p>
        </div>
        <div className="dash-period" role="group" aria-label="Periodo">
          {(
            [
              [1, 'Este mes'],
              [3, '3 meses'],
              [6, '6 meses'],
              [12, '1 año'],
            ] as const
          ).map(([n, label]) => (
            <button key={n} aria-pressed={choice.kind === 'last' && choice.n === n} onClick={() => pick({ kind: 'last', n })}>
              {label}
            </button>
          ))}
          <select
            aria-label="Elegir un mes"
            className={`prod-select${choice.kind === 'month' ? ' is-active' : ''}`}
            value={choice.kind === 'month' ? choice.key : ''}
            onChange={(e) => (e.target.value ? pick({ kind: 'month', key: e.target.value }) : pick({ kind: 'last', n: 1 }))}
          >
            <option value="">Otro mes…</option>
            {months.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* ——— Dinero ——— */}
      <section className="dash-kpis" aria-label="Dinero">
        <article className="dash-kpi dash-kpi--hero">
          <span className="dash-kpi__label">Cobrado · {period.short}</span>
          <b className="dash-kpi__value">{usd(d.cobradoMes)}</b>
          <span className="dash-kpi__sub">
            {delta === null ? (
              `En ${d.year}: ${usd(d.cobradoAnio)}`
            ) : (
              <>
                <span className={delta >= 0 ? 'is-up' : 'is-down'}>
                  {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} %
                </span>{' '}
                frente {before} · en {d.year}: {usd(d.cobradoAnio)}
              </>
            )}
          </span>
        </article>
        <article className="dash-kpi">
          <span className="dash-kpi__label">Por cobrar</span>
          <b className="dash-kpi__value">{usd(d.porCobrar)}</b>
          <span className="dash-kpi__sub">
            {usd(d.pendingDeposit)} en adelantos · {usd(d.pendingBalance)} en saldos
            {d.porCobrarRecurrente ? ` · ${usd(d.porCobrarRecurrente)} mensuales` : ''}
          </span>
        </article>
        <article className="dash-kpi">
          <span className="dash-kpi__label">Ingreso mensual recurrente</span>
          <b className="dash-kpi__value">{usd(d.recurrente.income)}</b>
          <span className="dash-kpi__sub">
            {d.recurrente.active.length
              ? `${d.recurrente.active.length} ${d.recurrente.active.length === 1 ? 'servicio' : 'servicios'} · margen ${usd(d.recurrente.margin)} al mes`
              : 'Alojamientos y SEO: se cargan en la ficha del cliente'}
          </span>
        </article>
        <article className="dash-kpi">
          <span className="dash-kpi__label">Vendido · {period.short}</span>
          <b className="dash-kpi__value">{usd(d.vendidoMes)}</b>
          <span className="dash-kpi__sub">
            {deltaVendido !== null && (
              <>
                <span className={deltaVendido >= 0 ? 'is-up' : 'is-down'}>
                  {deltaVendido >= 0 ? '▲' : '▼'} {Math.abs(deltaVendido)} %
                </span>{' '}
              </>
            )}
            {d.proyectosMes} {d.proyectosMes === 1 ? 'proyecto nuevo' : 'proyectos nuevos'}
            {d.ticket ? ` · ticket promedio ${usd(Math.round(d.ticket))}` : ''}
          </span>
        </article>
        <article className="dash-kpi">
          <span className="dash-kpi__label">En negociación</span>
          <b className="dash-kpi__value">{usd(d.enNegociacion)}</b>
          <span className="dash-kpi__sub">
            {d.negociacion} {d.negociacion === 1 ? 'oportunidad' : 'oportunidades'}
            {d.negociacionSinValor ? ` · ${d.negociacionSinValor} sin valor cargado` : ''}
          </span>
        </article>
      </section>

      <div className="dash-grid">
        {/* ——— Prioridades ——— */}
        <section className="dash-card dash-card--wide" aria-labelledby="dash-pri">
          <header className="dash-card__head">
            <h2 id="dash-pri">Prioridades</h2>
            <span>{d.priorities.length ? `${top.length} de ${d.priorities.length}, lo más urgente primero` : 'Nada pendiente'}</span>
          </header>
          {top.length ? (
            <ol className="dash-pri">
              {top.map((p) => (
                <li key={p.id} className={`is-${p.level}`}>
                  <span
                    className="dash-pri__flag"
                    aria-label={p.level === 'crit' ? 'Urgente' : p.level === 'warn' ? 'Importante' : 'Pendiente'}
                  >
                    {p.level === 'crit' ? '!' : p.level === 'warn' ? '•' : '·'}
                  </span>
                  <div className="dash-pri__txt">
                    <b>{p.title}</b>
                    <small>{p.detail}</small>
                  </div>
                  {p.amount ? <span className="dash-pri__amount">{usd(p.amount)}</span> : <span />}
                  <button className="btn btn-ghost btn-sm" onClick={() => open(p)}>
                    Abrir
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="dash-empty">Cuando haya consultas sin responder, cobros pendientes o clientes sin respuesta, aparecerán aquí.</p>
          )}
          {d.priorities.length > top.length && (
            <button className="panel-link dash-more" onClick={() => onGo('produccion')}>
              Ver todo en Producción
            </button>
          )}
        </section>

        {/* ——— Producción ——— */}
        <section className="dash-card" aria-labelledby="dash-prod">
          <header className="dash-card__head">
            <h2 id="dash-prod">Producción</h2>
            <button className="panel-link" onClick={() => onGo('produccion')}>
              Abrir
            </button>
          </header>
          <div className="dash-big">
            <b>{d.activos}</b>
            <span>{d.activos === 1 ? 'proyecto activo' : 'proyectos activos'}</span>
          </div>
          <Split
            items={[
              { label: 'Con ALIVE', value: d.conAlive, tone: 'alive' },
              { label: 'Con el cliente', value: d.conCliente, tone: 'client' },
              { label: 'En pausa', value: d.enPausa, tone: 'pause' },
            ]}
          />
          <dl className="dash-facts">
            <div>
              <dt>Fuera de plazo</dt>
              <dd className={d.fueraDePlazo ? 'is-warn' : ''}>{d.fueraDePlazo}</dd>
            </div>
            <div>
              <dt>Etapas de ALIVE a tiempo</dt>
              <dd>{d.aTiempoPct === null ? '—' : `${d.aTiempoPct} %`}</dd>
            </div>
            <div>
              <dt>Espera media del cliente</dt>
              <dd>{d.esperaPromedio === null ? '—' : `${d.esperaPromedio} días hábiles`}</dd>
            </div>
          </dl>
          {d.aTiempoPct === null && <p className="dash-note">Los porcentajes aparecen cuando se cierren las primeras etapas.</p>}
        </section>

        {/* ——— Cobrado por mes ——— */}
        <section className="dash-card" aria-labelledby="dash-cob">
          <header className="dash-card__head">
            <h2 id="dash-cob">Cobrado por mes</h2>
            <span>{d.cobradoPorMes.length} meses · US$ · resaltado: {period.short}</span>
          </header>
          <Bars
            data={d.cobradoPorMes}
            format={usd}
            empty="Aún no hay pagos marcados. Se registran al marcar el 70 % y el 30 % en cada proyecto."
          />
        </section>

        {/* ——— Consultas por mes ——— */}
        <section className="dash-card" aria-labelledby="dash-leads">
          <header className="dash-card__head">
            <h2 id="dash-leads">Consultas por mes</h2>
            <span>
              {d.leadsMes} · {period.short}
              {d.leadsAnterior ? ` (antes ${d.leadsAnterior})` : ''}
            </span>
          </header>
          <Bars data={d.leadsPorMes} format={(n) => String(n)} empty="Aún no hay consultas registradas." />
          <p className="dash-note">
            Origen:{' '}
            {d.origen
              .filter((o) => o.count)
              .map((o) => `${SOURCE[o.id]} ${o.count}`)
              .join(' · ') || 'sin datos'}
          </p>
        </section>

        {/* ——— Embudo ——— */}
        <section className="dash-card" aria-labelledby="dash-fun">
          <header className="dash-card__head">
            <h2 id="dash-fun">Embudo · {period.short}</h2>
            <button className="panel-link" onClick={() => onGo('clientes')}>
              Clientes
            </button>
          </header>
          <Funnel rows={d.funnel} />
          <p className="dash-note">
            {d.conversion === null
              ? 'La tasa de cierre aparece con la primera oportunidad ganada o perdida.'
              : `Tasa de cierre: ${d.conversion} % (${d.funnel[3].count} de ${d.decididos} decididas).`}
            {d.repiten ? ` ${d.repiten} ${d.repiten === 1 ? 'venta' : 'ventas'} de clientes que repiten.` : ''}
          </p>
        </section>

        {/* ——— Servicios ——— */}
        <section className="dash-card" aria-labelledby="dash-rec">
          <header className="dash-card__head">
            <h2 id="dash-rec">Cobros mensuales</h2>
            <span>{monthName(d.thisMonth)}</span>
          </header>
          {recurringMissing ? (
            <p className="dash-empty">Falta crear la tabla: en Supabase → SQL Editor, ejecuta supabase/recurrentes.sql.</p>
          ) : d.recurringList.length ? (
            <ul className="rec-dash">
              {d.recurringList.map((x) => (
                <li key={x.id}>
                  <label className="prod-pays">
                    <input
                      type="checkbox"
                      checked={isPaid(x, d.thisMonth)}
                      onChange={() => onToggleRecurring(x.id, { paid_months: togglePaid(x, d.thisMonth, todayIso) })}
                    />
                    <span>
                      <b>{clientName(x.client_id)}</b>
                      <small>
                        {recurringName(x)} · día {x.billing_day}
                      </small>
                    </span>
                  </label>
                  <span className="rec-dash__amount">{usd(x.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dash-empty">Cuando cargues alojamientos o SEO en la ficha de un cliente, aquí marcas quién pagó cada mes.</p>
          )}
        </section>

        <section className="dash-card dash-card--wide" aria-labelledby="dash-serv">
          <header className="dash-card__head">
            <h2 id="dash-serv">Servicios vendidos</h2>
            <span>Proyectos de {period.label}</span>
          </header>
          {d.servicios.length ? (
            <div className="table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th scope="col">Servicio</th>
                    <th scope="col">Proyectos</th>
                    <th scope="col">Monto</th>
                    <th scope="col">Participación</th>
                  </tr>
                </thead>
                <tbody>
                  {d.servicios.map((s) => {
                    const total = d.servicios.reduce((a, x) => a + x.amount, 0)
                    const pct = total ? Math.round((s.amount / total) * 100) : 0
                    return (
                      <tr key={s.id}>
                        <th scope="row">{SERVICES[s.id]}</th>
                        <td>{s.count}</td>
                        <td>{usd(s.amount)}</td>
                        <td>
                          <span className="dash-share">
                            <i style={{ width: `${pct}%` }} />
                          </span>
                          {pct} %
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="dash-empty">Cuando crees proyectos, verás qué servicio vende más.</p>
          )}
        </section>
      </div>
    </div>
  )
}

// Barras de una sola serie: el mes actual lleva su valor; los demás, al pasar el cursor o con el teclado.
function Bars({
  data,
  format,
  empty,
}: {
  data: { key: string; label: string; value: number; year: number; inPeriod?: boolean }[]
  format: (n: number) => string
  empty: string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(...data.map((x) => x.value), 0)
  if (!max) return <p className="dash-empty">{empty}</p>
  const lastIn = data.map((x) => x.inPeriod).lastIndexOf(true)
  const shown = hover ?? (lastIn >= 0 ? lastIn : data.length - 1)
  return (
    <div className="dash-bars" onMouseLeave={() => setHover(null)}>
      <div className="dash-bars__plot">
        {data.map((x, i) => (
          <div
            key={x.key}
            className={`dash-bars__col${i === shown ? ' is-shown' : ''}${x.inPeriod ? ' is-in' : ''}`}
            tabIndex={0}
            aria-label={`${x.label} ${x.year}: ${format(x.value)}`}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
          >
            {i === shown && <span className="dash-bars__value">{format(x.value)}</span>}
            <i
              style={{
                height: `${x.value ? Math.max((x.value / max) * 100, 3) : 0}%`,
              }}
            />
          </div>
        ))}
      </div>
      <div className="dash-bars__axis">
        {data.map((x) => (
          <span key={x.key}>{x.label}</span>
        ))}
      </div>
    </div>
  )
}

function Funnel({ rows }: { rows: { id: string; name: string; count: number; value: number }[] }) {
  const max = Math.max(...rows.map((r) => r.count), 1)
  return (
    <ul className="dash-funnel">
      {rows.map((r) => (
        <li key={r.id} className={r.id === 'perdido' ? 'is-lost' : ''}>
          <span className="dash-funnel__name">{r.name}</span>
          <span className="dash-funnel__track">
            <i
              style={{
                width: `${r.count ? Math.max((r.count / max) * 100, 4) : 0}%`,
              }}
            />
          </span>
          <span className="dash-funnel__n">{r.count}</span>
          <span className="dash-funnel__v">{r.value ? usd(r.value) : ''}</span>
        </li>
      ))}
    </ul>
  )
}

function Split({ items }: { items: { label: string; value: number; tone: string }[] }) {
  const total = items.reduce((a, x) => a + x.value, 0)
  return (
    <div className="dash-split">
      <div className="dash-split__bar" aria-hidden="true">
        {total ? (
          items.filter((x) => x.value).map((x) => <i key={x.label} className={`is-${x.tone}`} style={{ flexGrow: x.value }} />)
        ) : (
          <i className="is-empty" />
        )}
      </div>
      <ul>
        {items.map((x) => (
          <li key={x.label}>
            <i className={`is-${x.tone}`} />
            {x.label} <b>{x.value}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}
