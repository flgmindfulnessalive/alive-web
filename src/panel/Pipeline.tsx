// Tablero comercial: las consultas nuevas son clientes («Nuevo»); desde ahí, cada pedido es una
// oportunidad propia (un proyecto que aún no empieza) con su servicio, monto y etapa. Un cliente que
// vuelve a comprar suma una oportunidad nueva sin tocar lo anterior. Al ganarla, entra a Producción.
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { SOURCE_LABEL, supabase, type Client } from './data'
import { DEALS, businessToday, iso, money, PRICE_FROM, projectName, SERVICES, winPatch, type Deal, type Project, type Service } from './production'

type Column = 'nuevo' | Deal
const COLUMNS: { id: Column; label: string }[] = [
  { id: 'nuevo', label: 'Nuevo' },
  ...DEALS.map((d) => ({ id: d.id as Column, label: d.label })),
]

const ago = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  return days <= 0 ? 'hoy' : days === 1 ? 'ayer' : `hace ${days} días`
}


type BoardProps = {
  leads: Client[]
  opportunities: Project[]
  clients: Client[]
  types: (c: Client) => string[]
  onOpenClient: (id: string) => void
  onOpenDeal: (id: string) => void
  onMoveDeal: (id: string, to: Deal) => void
  onMoveLead: (id: string, to: Column) => void
}

export function Board({ leads, opportunities, clients, types, onOpenClient, onOpenDeal, onMoveDeal, onMoveLead }: BoardProps) {
  const [over, setOver] = useState<Column | null>(null)
  const [now] = useState(() => Date.now())
  const byId = new Map(clients.map((c) => [c.id, c]))
  // Ganados y perdidos: solo los de los últimos 60 días, para que el tablero no crezca sin fin.
  const recent = (p: Project) => now - new Date(p.deal_updated_at).getTime() < 60 * 864e5
  return (
    <div className="board">
      {COLUMNS.map((col) => {
        const isLead = col.id === 'nuevo'
        const deals = isLead
          ? []
          : opportunities.filter((p) => p.deal_stage === col.id && (col.id === 'conversacion' || col.id === 'propuesta' || recent(p)))
        const count = isLead ? leads.length : deals.length
        const total = deals.reduce((a, p) => a + (p.amount ?? 0), 0)
        return (
          <section
            key={col.id}
            className={`board-col board-col--${col.id}${over === col.id ? ' is-over' : ''}`}
            aria-label={col.label}
            onDragOver={(e) => {
              e.preventDefault()
              setOver(col.id)
            }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => {
              e.preventDefault()
              setOver(null)
              const [kind, id] = e.dataTransfer.getData('text/plain').split(':')
              if (kind === 'deal' && col.id !== 'nuevo') onMoveDeal(id, col.id)
              if (kind === 'lead' && col.id !== 'nuevo') onMoveLead(id, col.id)
            }}
          >
            <header className="board-col__head">
              <h2>{col.label}</h2>
              <span className="board-col__count">{count}</span>
              {total > 0 && <span className="board-col__total">{money(total)}</span>}
            </header>
            <div className="board-col__list">
              {isLead &&
                leads.map((c) => (
                  <button
                    key={c.id}
                    className="card"
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', `lead:${c.id}`)}
                    onClick={() => onOpenClient(c.id)}
                  >
                    <span className="card__top">
                      <span className={`tag tag--${c.source}`}>{SOURCE_LABEL[c.source]}</span>
                      <span className="card__date">{ago(c.created_at)}</span>
                    </span>
                    <span className="card__company">{c.company || c.name}</span>
                    {types(c).length > 0 && (
                      <span className="card__types">
                        {types(c).map((t) => (
                          <span key={t}>{t}</span>
                        ))}
                      </span>
                    )}
                    {c.company && <span className="card__name">{c.name}</span>}
                  </button>
                ))}
              {deals.map((p) => {
                const c = byId.get(p.client_id)
                const repeat = opportunities.some((o) => o.client_id === p.client_id && o.id !== p.id && o.deal_stage === 'ganado')
                return (
                  <button
                    key={p.id}
                    className="card"
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', `deal:${p.id}`)}
                    onClick={() => onOpenDeal(p.id)}
                  >
                    <span className="card__top">
                      <span className="tag tag--deal">{repeat ? 'Cliente que repite' : 'Oportunidad'}</span>
                      <span className="card__date">{ago(p.deal_updated_at)}</span>
                    </span>
                    <span className="card__company">{c ? c.company || c.name : 'Cliente'}</span>
                    <span className="card__types">
                      <span>{projectName(p)}</span>
                    </span>
                    {c?.company && <span className="card__name">{c.name}</span>}
                    {p.amount != null && <span className="card__value">{money(p.amount)}</span>}
                  </button>
                )
              })}
              {!count && <p className="board-col__empty">{isLead ? 'Las consultas nuevas llegan aquí' : 'Arrastra aquí'}</p>}
            </div>
          </section>
        )
      })}
    </div>
  )
}

// Crear o editar una oportunidad.
export function DealDialog({
  deal,
  client,
  clients,
  presetClient,
  presetStage = 'conversacion',
  onClose,
  onSaved,
  onUpdate,
  onOpenClient,
  onOpenProject,
}: {
  deal?: Project
  client?: Client
  clients: Client[]
  presetClient?: string
  presetStage?: Deal
  onClose: () => void
  onSaved: (p: Project) => void
  onUpdate: (id: string, patch: Partial<Project>) => Promise<boolean>
  onOpenClient: (id: string) => void
  onOpenProject: (id: string) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [service, setService] = useState<Service>(deal?.service ?? 'we')
  const [title, setTitle] = useState(deal?.title ?? '')
  const [amount, setAmount] = useState<string | null>(deal?.amount != null ? String(deal.amount) : null)
  const [stage, setStage] = useState<Deal>(deal?.deal_stage ?? presetStage)
  const [clientId, setClientId] = useState(deal?.client_id ?? presetClient ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    dialog.current?.showModal()
  }, [])
  const amountValue = amount ?? (PRICE_FROM[service]?.toString() ?? '')
  const started = Boolean(deal && deal.deal_stage === 'ganado' && deal.history.length)
  const who = client ?? clients.find((c) => c.id === clientId)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!clientId) return setError('Elige el cliente.')
    if (service === 'otro' && !title.trim()) return setError('Ponle nombre a lo que necesita (por ejemplo, «Campaña de lanzamiento»).')
    setBusy(true)
    const base: Partial<Project> = {
      service,
      title: service === 'otro' ? title.trim() : null,
      amount: amountValue ? Number(amountValue) : null,
    }
    const stageChanged = !deal || deal.deal_stage !== stage
    const patch: Partial<Project> = {
      ...base,
      ...(stageChanged ? { deal_stage: stage, deal_updated_at: new Date().toISOString() } : {}),
      ...(stageChanged && stage === 'ganado' ? winPatch() : {}),
    }
    if (deal) {
      const ok = await onUpdate(deal.id, patch)
      setBusy(false)
      if (!ok) return setError('No se pudo guardar.')
      dialog.current?.close()
      return
    }
    const { data, error } = await supabase!
      .from('projects')
      .insert({ client_id: clientId, phase_started: iso(businessToday()), ...patch })
      .select()
      .single()
    setBusy(false)
    if (error || !data) return setError('No se pudo crear la oportunidad. ¿Ejecutaste supabase/oportunidades.sql en Supabase?')
    onSaved(data as Project)
    dialog.current?.close()
  }

  return (
    <dialog ref={dialog} className="detail detail--small" aria-labelledby="deal-title" onClose={onClose}>
      <form className="detail__body" onSubmit={submit}>
        <header className="detail__head">
          <div>
            <p className="eyebrow">{who ? who.company || who.name : 'Oportunidad'}</p>
            <h2 id="deal-title">{deal ? projectName(deal) : 'Nueva oportunidad'}</h2>
          </div>
          <button type="button" className="detail__close" onClick={() => dialog.current?.close()} aria-label="Cerrar">
            ×
          </button>
        </header>
        {!deal && !presetClient && (
          <label className="panel-field">
            <span>Cliente</span>
            <select className="prod-select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Elige un cliente…</option>
              {[...clients]
                .sort((a, b) => (a.company || a.name).localeCompare(b.company || b.name, 'es'))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company ? `${c.company} · ${c.name}` : c.name}
                  </option>
                ))}
            </select>
          </label>
        )}
        <label className="panel-field">
          <span>Qué necesita</span>
          <select
            className="prod-select"
            value={service}
            disabled={started}
            onChange={(e) => {
              setService(e.target.value as Service)
              setAmount(null)
            }}
          >
            {(Object.keys(SERVICES) as Service[]).map((s) => (
              <option key={s} value={s}>
                {SERVICES[s]}
                {PRICE_FROM[s] ? ` · desde US$ ${PRICE_FROM[s]}` : ' (sin ficha aún)'}
              </option>
            ))}
          </select>
        </label>
        {service === 'otro' && (
          <label className="panel-field">
            <span>Nombre</span>
            <input value={title} placeholder="Ej.: Campaña de lanzamiento" onChange={(e) => setTitle(e.target.value)} />
          </label>
        )}
        <div className="rec-form__row">
          <label className="panel-field">
            <span>Monto (US$)</span>
            <input inputMode="decimal" value={amountValue} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} />
          </label>
          <label className="panel-field">
            <span>Etapa</span>
            <select className="prod-select" value={stage} disabled={started} onChange={(e) => setStage(e.target.value as Deal)}>
              {DEALS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {stage === 'ganado' && (!deal || deal.deal_stage !== 'ganado') && (
          <p className="prod-hint">Al guardar como ganada, entra a Producción y su plazo empieza hoy.</p>
        )}
        {started && <p className="panel-muted prod-small">Ya está en producción: el servicio y la etapa se manejan desde Producción.</p>}
        {error && <p className="panel-error">{error}</p>}
        <div className="prod-actions">
          <button className="btn btn-primary btn-sm" disabled={busy}>
            {busy ? 'Guardando…' : deal ? 'Guardar' : 'Crear oportunidad'}
          </button>
          {deal && deal.deal_stage === 'ganado' && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onOpenProject(deal.id)}>
              Ver en Producción
            </button>
          )}
          {who && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onOpenClient(who.id)}>
              Ficha del cliente
            </button>
          )}
        </div>
      </form>
    </dialog>
  )
}
