// Servicios mensuales en la ficha del cliente: alta, cobro del mes y baja.
import { useState, type FormEvent } from 'react'
import { firstName, money, waNumber } from './production'
import {
  activeIn,
  billingStatus,
  commitmentEnd,
  dueNotice,
  isPaid,
  KINDS,
  monthName,
  monthOf,
  noticeMessage,
  noticeTitle,
  overdue,
  recurringName,
  togglePaid,
  type NoticeKey,
  type Recurring,
  type RecurringKind,
} from './recurring'

export type NoteHelpers = { logNote: (body: string) => Promise<string | null>; removeNote: (id: string) => Promise<void> }
type Who = { name: string; phone: string | null }

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type Props = {
  clientId: string
  client: Who
  notes: NoteHelpers
  items: Recurring[]
  onAdd: (row: Omit<Recurring, 'id' | 'created_at'>) => Promise<boolean>
  onUpdate: (id: string, patch: Partial<Recurring>) => Promise<boolean>
}

export function RecurringSection({ clientId, client, notes, items, onAdd, onUpdate }: Props) {
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
            <RecurringRow key={r.id} r={r} month={month} onUpdate={onUpdate} client={client} notes={notes} />
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

function RecurringRow({
  r,
  month,
  onUpdate,
  client,
  notes,
}: {
  r: Recurring
  month: string
  onUpdate: Props['onUpdate']
  client: Who
  notes: NoteHelpers
}) {
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [writing, setWriting] = useState<{ key: NoticeKey; month: string; text: string } | null>(null)
  const [sentNow, setSentNow] = useState<{ noteId: string | null; before: string[]; title: string } | null>(null)
  const paid = isPaid(r, month)
  const running = activeIn(r, month)
  const status = billingStatus(r)
  const due = dueNotice(r)
  const end = commitmentEnd(r)
  const sent = r.sent ?? []
  // Tras regularizar un mes con avisos, se sugiere el mensaje de agradecimiento.
  const thanksFor = !overdue(r) ? sent.map((x) => x.slice(0, 7)).find((m) => isPaid(r, m) && !sent.includes(`${m}:gracias`)) : undefined
  const phone = waNumber(client.phone)
  const open = (key: NoticeKey, m: string) => setWriting({ key, month: m, text: noticeMessage(key, r, firstName(client.name)) })

  async function send() {
    if (!writing) return
    const before = sent
    const tag = `${writing.month}:${writing.key}`
    setWriting(null)
    await onUpdate(r.id, { sent: before.includes(tag) ? before : [...before, tag] })
    const noteId = await notes.logNote(`WhatsApp · ${noticeTitle(writing.key)} (${recurringName(r)})\n${writing.text}`)
    setSentNow({ noteId, before, title: noticeTitle(writing.key) })
  }

  return (
    <li className="rec-row">
      <div className="rec-row__main">
        <b>
          {recurringName(r)}
          {running && <span className={`prod-pill rec-row__status${status.tone ? ` is-${status.tone}` : ''}`}>{status.text}</span>}
        </b>
        <span>
          {money(r.amount)} / mes{r.cost ? ` · costo ${money(r.cost)} · margen ${money(r.amount - r.cost)}` : ''} · cobro el día {r.billing_day}
          {end ? ` · permanencia hasta ${end}` : ''}
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
      {(due || thanksFor) && !writing && !sentNow && (
        <div className="rec-row__notice">
          {due && (
            <button className="btn btn-sm prod-wa" onClick={() => open(due.key, due.month)}>
              WhatsApp: {due.title} (día {due.days})
            </button>
          )}
          {thanksFor && (
            <button className="btn btn-sm prod-wa" onClick={() => open('gracias', thanksFor)}>
              WhatsApp: Pago regularizado
            </button>
          )}
        </div>
      )}
      {writing && (
        <div className="rec-row__notice rec-msg">
          <label className="panel-field">
            <span>
              {noticeTitle(writing.key)} · {phone ? `+${phone}` : 'sin WhatsApp en la ficha'}
            </span>
            <textarea className="prod-textarea" rows={4} value={writing.text} onChange={(e) => setWriting({ ...writing, text: e.target.value })} />
          </label>
          {/\[[^\]]+\]/.test(writing.text) && <p className="prod-hint">Completa lo que va entre [corchetes], como el enlace de Whop.</p>}
          <div className="prod-actions">
            {phone ? (
              <a className="btn btn-sm prod-wa" href={`https://wa.me/${phone}?text=${encodeURIComponent(writing.text)}`} target="_blank" rel="noopener" onClick={send}>
                Abrir en WhatsApp y anotar
              </a>
            ) : (
              <button className="btn btn-sm prod-wa" onClick={send}>
                Solo anotar
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => setWriting(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      {sentNow && (
        <div className="rec-row__notice prod-sent is-inline">
          <span>
            Anotado: <b>{sentNow.title}</b>. ¿Lo enviaste?
          </span>
          <span className="prod-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => setSentNow(null)}>
              Sí, lo envié
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={async () => {
                const l = sentNow
                setSentNow(null)
                await onUpdate(r.id, { sent: l.before })
                if (l.noteId) await notes.removeNote(l.noteId)
              }}
            >
              No lo envié
            </button>
          </span>
        </div>
      )}
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
      sent: [],
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
