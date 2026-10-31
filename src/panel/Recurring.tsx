// Servicios mensuales en la ficha del cliente: alta, cobro del mes y baja.
import { useState, type FormEvent } from 'react'
import { money } from './production'
import { isPaid, KINDS, monthName, monthOf, recurringName, togglePaid, activeIn, type Recurring, type RecurringKind } from './recurring'

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type Props = {
  clientId: string
  items: Recurring[]
  onAdd: (row: Omit<Recurring, 'id' | 'created_at'>) => Promise<boolean>
  onUpdate: (id: string, patch: Partial<Recurring>) => Promise<boolean>
}

export function RecurringSection({ clientId, items, onAdd, onUpdate }: Props) {
  const [adding, setAdding] = useState(false)
  const [month] = useState(() => monthOf(new Date()))
  const active = items.filter((r) => !r.ended_on || r.ended_on.slice(0, 7) >= month)
  const ended = items.filter((r) => !active.includes(r))

  return (
    <section className="detail__section">
      <h3>Servicios mensuales</h3>
      {active.length > 0 && (
        <ul className="rec-list">
          {active.map((r) => (
            <RecurringRow key={r.id} r={r} month={month} onUpdate={onUpdate} />
          ))}
        </ul>
      )}
      {ended.length > 0 && (
        <p className="panel-muted prod-small">
          Terminados: {ended.map((r) => `${recurringName(r)} (hasta ${monthName(r.ended_on!.slice(0, 7))})`).join(' · ')}
        </p>
      )}
      {adding ? (
        <AddRecurring
          onCancel={() => setAdding(false)}
          onSave={async (row) => {
            if (await onAdd({ ...row, client_id: clientId })) setAdding(false)
          }}
        />
      ) : (
        <button className="btn btn-ghost btn-sm prod-start" onClick={() => setAdding(true)}>
          + Servicio mensual
        </button>
      )}
    </section>
  )
}

function RecurringRow({ r, month, onUpdate }: { r: Recurring; month: string; onUpdate: Props['onUpdate'] }) {
  const [confirmEnd, setConfirmEnd] = useState(false)
  const paid = isPaid(r, month)
  const running = activeIn(r, month)
  return (
    <li className="rec-row">
      <div className="rec-row__main">
        <b>{recurringName(r)}</b>
        <span>
          {money(r.amount)} / mes{r.cost ? ` · costo ${money(r.cost)} · margen ${money(r.amount - r.cost)}` : ''} · cobro el día {r.billing_day}
          {r.ended_on ? ` · termina en ${monthName(r.ended_on.slice(0, 7))}` : ''}
        </span>
      </div>
      {running ? (
        <label className="prod-pays rec-row__paid">
          <input type="checkbox" checked={paid} onChange={() => onUpdate(r.id, { paid_months: togglePaid(r, month, today()) })} />
          Pagó {monthName(month)}
        </label>
      ) : (
        <span className="panel-muted prod-small">Empieza en {monthName(r.started_on.slice(0, 7))}</span>
      )}
      {!r.ended_on &&
        (confirmEnd ? (
          <span className="rec-row__end">
            ¿Terminar a fin de {monthName(month)}?
            <button className="panel-link panel-link--danger" onClick={() => onUpdate(r.id, { ended_on: `${month}-28` })}>
              Sí
            </button>
            <button className="panel-link" onClick={() => setConfirmEnd(false)}>
              No
            </button>
          </span>
        ) : (
          <button className="panel-link rec-row__end" onClick={() => setConfirmEnd(true)}>
            Terminar
          </button>
        ))}
    </li>
  )
}

function AddRecurring({ onSave, onCancel }: { onSave: (row: Omit<Recurring, 'id' | 'created_at' | 'client_id'>) => void; onCancel: () => void }) {
  const [kind, setKind] = useState<RecurringKind>('aloj_web')
  const [name, setName] = useState('')
  // Se proponen los montos de la ficha; si se escriben otros, se respetan.
  const [amount, setAmount] = useState<string | null>(null)
  const [cost, setCost] = useState<string | null>(null)
  const [start, setStart] = useState(today)
  const [day, setDay] = useState('1')
  const [error, setError] = useState<string | null>(null)
  const amountValue = amount ?? KINDS[kind].amount?.toString() ?? ''
  const costValue = cost ?? KINDS[kind].cost?.toString() ?? ''

  function submit(e: FormEvent) {
    e.preventDefault()
    const a = Number(amountValue)
    if (!amountValue || !Number.isFinite(a) || a <= 0) return setError('Escribe el monto mensual.')
    const d = Math.min(28, Math.max(1, Number(day) || 1))
    onSave({
      kind,
      name: name.trim() || null,
      amount: a,
      cost: Number(costValue) || 0,
      started_on: start,
      ended_on: null,
      billing_day: d,
      paid_months: [],
    })
  }

  const digits = (v: string) => v.replace(/[^\d.]/g, '')
  return (
    <form className="rec-form" onSubmit={submit}>
      <label className="panel-field">
        <span>Servicio</span>
        <select
          className="prod-select"
          value={kind}
          onChange={(e) => {
            setKind(e.target.value as RecurringKind)
            setAmount(null)
            setCost(null)
          }}
        >
          {(Object.keys(KINDS) as RecurringKind[]).map((k) => (
            <option key={k} value={k}>
              {KINDS[k].label}
            </option>
          ))}
        </select>
      </label>
      {kind === 'otro' && (
        <label className="panel-field">
          <span>Nombre</span>
          <input value={name} placeholder="Ej.: Mantenimiento mensual" onChange={(e) => setName(e.target.value)} />
        </label>
      )}
      <div className="rec-form__row">
        <label className="panel-field">
          <span>Cobro mensual (US$)</span>
          <input inputMode="decimal" value={amountValue} onChange={(e) => setAmount(digits(e.target.value))} />
        </label>
        <label className="panel-field">
          <span>Costo para ALIVE (US$)</span>
          <input inputMode="decimal" value={costValue} placeholder="0" onChange={(e) => setCost(digits(e.target.value))} />
        </label>
      </div>
      <div className="rec-form__row">
        <label className="panel-field">
          <span>Desde</span>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="panel-field">
          <span>Día de cobro (1 a 28)</span>
          <input inputMode="numeric" value={day} onChange={(e) => setDay(e.target.value.replace(/\D/g, '').slice(0, 2))} />
        </label>
      </div>
      {error && <p className="panel-error">{error}</p>}
      <div className="prod-actions">
        <button className="btn btn-primary btn-sm">Guardar</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
