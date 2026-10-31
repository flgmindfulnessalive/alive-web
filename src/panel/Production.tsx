// Vista de producción del panel: avisos del día, línea de tiempo por cliente y proyecto (días
// hábiles), ficha del proyecto con sus etapas y mensajes de WhatsApp que quedan anotados en las notas.
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { supabase, type Client } from './data'
import {
  addBusinessDays,
  advance,
  afterMessage,
  businessDaysBetween,
  businessToday,
  dayLabel,
  firstName,
  iso,
  isBusinessDay,
  money,
  PRICE_FROM,
  projectName,
  SERVICES,
  shortDate,
  flowOf,
  statusLabel,
  statusOf,
  tasksOf,
  TEMPLATES,
  undo,
  waNumber,
  type Project,
  type Service,
  type TemplateKey,
} from './production'

type Props = {
  clients: Client[]
  projects: Project[]
  author: string
  newFor: string | null
  onNewHandled: () => void
  onUpdate: (id: string, patch: Partial<Project>) => Promise<boolean>
  onCreated: (p: Project) => void
  onOpenClient: (id: string) => void
  onDeleted: (id: string) => void
  initialOpenId?: string | null
}

const clientLabel = (c?: Client) => (c ? c.company || c.name : 'Cliente eliminado')

async function logNote(client_id: string, body: string, author: string) {
  const { data } = await supabase!.from('notes').insert({ client_id, body, author }).select('id').single()
  return (data?.id as string | undefined) ?? null
}

// Último mensaje anotado, para poder deshacerlo con «No lo envié»: nota creada y estado anterior del proyecto.
type LastSent = {
  projectId: string
  noteId: string | null
  title: string
  client: string
  before: Partial<Project>
}

export function Production({
  clients,
  projects,
  author,
  newFor,
  onNewHandled,
  onUpdate,
  onCreated,
  onOpenClient,
  onDeleted,
  initialOpenId = null,
}: Props) {
  const [openId, setOpenId] = useState<string | null>(initialOpenId)
  const [message, setMessage] = useState<{
    id: string
    key: TemplateKey
  } | null>(null)
  const [creating, setCreating] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [lastSent, setLastSent] = useState<LastSent | null>(null)
  const today = businessToday()
  const byId = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients])

  // «+ Crear proyecto» desde la ficha de un cliente llega como newFor (cliente preseleccionado).
  const creatingFor = newFor ?? creating
  const closeCreating = () => {
    setCreating(null)
    onNewHandled()
  }
  const [now] = useState(() => new Date())

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  const active = projects.filter((p) => !['sinficha', 'terminado'].includes(statusOf(p, today).kind))
  const count = (k: string) => active.filter((p) => statusOf(p, today).kind === k).length
  const late = active.filter((p) => {
    const s = statusOf(p, today)
    return (s.kind === 'alive' || s.kind === 'cliente') && s.late
  }).length
  const order = { crit: 0, warn: 1, info: 2 }
  const tasks = projects.flatMap((p) => tasksOf(p, today).map((t) => ({ ...t, p }))).sort((a, b) => order[a.level] - order[b.level])

  const open = projects.find((p) => p.id === openId) ?? null

  async function undoSent() {
    const l = lastSent
    if (!l) return
    setLastSent(null)
    await onUpdate(l.projectId, l.before)
    if (l.noteId) await supabase!.from('notes').delete().eq('id', l.noteId)
    setToast('Listo: se borró la nota y el proyecto quedó como estaba')
  }
  const msgProject = message ? projects.find((p) => p.id === message.id) : null

  return (
    <>
      <div className="panel-toolbar">
        <div>
          <p className="eyebrow">Hoy · {shortDate(now)}</p>
          <h1 className="panel-h1">Producción</h1>
        </div>
        <div className="panel-toolbar__actions">
          <div className="prod-stats">
            {(
              [
                ['var(--color-text)', active.length, 'activos'],
                ['var(--prod-alive)', count('alive'), 'con ALIVE'],
                ['var(--prod-client)', count('cliente'), 'con el cliente'],
                ['var(--prod-warn)', late, 'fuera de plazo'],
                ['var(--prod-pause)', count('pausa'), 'en pausa'],
              ] as const
            ).map(([color, n, label]) => (
              <span key={label} className="prod-stat">
                <i style={{ background: color }} />
                <b>{n}</b>
                {label}
              </span>
            ))}
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setCreating('')}>
            + Proyecto
          </button>
        </div>
      </div>

      <section className="prod-today" aria-labelledby="prod-today-title">
        <header>
          <h2 id="prod-today-title">Hoy toca</h2>
          <span>Avisos del día 3, 7 y 10 hábil sin respuesta, y mensajes de cada etapa</span>
        </header>
        {tasks.length ? (
          tasks.map((t) => (
            <div key={`${t.p.id}-${t.key ?? t.text}`} className={`prod-task is-${t.level}`}>
              <div className="prod-task__txt">
                <b>{clientLabel(byId.get(t.p.client_id))}</b> · {projectName(t.p)}
                <small>{t.text}</small>
              </div>
              <div className="prod-task__act">
                {t.key && (
                  <button className="btn btn-sm prod-wa" onClick={() => setMessage({ id: t.p.id, key: t.key! })}>
                    WhatsApp: {TEMPLATES[t.key].t}
                  </button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => setOpenId(t.p.id)}>
                  Ver
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="prod-empty">
            {projects.length
              ? 'Nada pendiente hoy. Los avisos aparecen solos cuando un cliente lleva 3, 7 o 10 días hábiles sin responder.'
              : 'Todavía no hay proyectos. Crea uno con «+ Proyecto» cuando un cliente acepte la propuesta.'}
          </p>
        )}
      </section>

      <section className="prod-tl-wrap" aria-labelledby="prod-tl-title">
        <div className="prod-tl-head">
          <h2 id="prod-tl-title">Línea de tiempo · días hábiles</h2>
          <div className="prod-legend">
            <span>
              <i className="sw sw--alive" />
              ALIVE trabaja
            </span>
            <span>
              <i className="sw sw--client" />
              Espera al cliente
            </span>
            <span>
              <i className="sw sw--plan" />
              Planeado
            </span>
            <span>
              <i className="sw sw--late" />
              Fuera de plazo
            </span>
            <span>
              <i className="sw sw--pause" />
              En pausa
            </span>
          </div>
        </div>
        <Timeline clients={clients} projects={projects} openId={openId} onOpen={setOpenId} />
      </section>

      {open && (
        <ProjectDetail
          key={open.id}
          project={open}
          client={byId.get(open.client_id)}
          siblings={projects.filter((p) => p.client_id === open.client_id && p.id !== open.id)}
          onClose={() => setOpenId(null)}
          onOpen={setOpenId}
          onOpenClient={onOpenClient}
          onDeleted={onDeleted}
          onUpdate={onUpdate}
          onMessage={(key) => setMessage({ id: open.id, key })}
          toastText={toast}
          banner={lastSent ? <SentBanner inline sent={lastSent} onDone={() => setLastSent(null)} onUndo={undoSent} /> : null}
          toast={setToast}
        />
      )}
      {message && msgProject && (
        <MessageDialog
          project={msgProject}
          client={byId.get(msgProject.client_id)}
          tkey={message.key}
          onClose={() => setMessage(null)}
          onSent={async (text) => {
            const c = byId.get(msgProject.client_id)
            const key = message.key
            setMessage(null)
            const patch = afterMessage(msgProject, key)
            // Copia de lo que el mensaje cambia, para restaurarlo si no se llegó a enviar.
            const before = Object.fromEntries(Object.keys(patch).map((k) => [k, msgProject[k as keyof Project]])) as Partial<Project>
            await onUpdate(msgProject.id, patch)
            const noteId = c ? await logNote(c.id, `WhatsApp · ${TEMPLATES[key].t} (${projectName(msgProject)})\n${text}`, author) : null
            setLastSent({
              projectId: msgProject.id,
              noteId,
              title: TEMPLATES[key].t,
              client: clientLabel(c),
              before,
            })
          }}
        />
      )}
      {creatingFor !== null && (
        <NewProject
          clients={clients}
          preset={creatingFor}
          onClose={closeCreating}
          onCreated={(p) => {
            closeCreating()
            onCreated(p)
            setOpenId(p.id)
            setToast('Proyecto creado')
          }}
        />
      )}
      {lastSent && !open && <SentBanner sent={lastSent} onDone={() => setLastSent(null)} onUndo={undoSent} />}
      {toast && !open && (
        <div className="prod-toast" role="status">
          {toast}
        </div>
      )}
    </>
  )
}

// ——— Línea de tiempo ———
function useColumnWidth() {
  const get = () => (window.innerWidth < 640 ? 30 : 34)
  const [w, setW] = useState(get)
  useEffect(() => {
    const on = () => setW(get())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return w
}

function Timeline({
  clients,
  projects,
  openId,
  onOpen,
}: {
  clients: Client[]
  projects: Project[]
  openId: string | null
  onOpen: (id: string) => void
}) {
  const W = useColumnWidth()
  const today = businessToday()
  const N = 30
  // Ventana de 30 días hábiles; se mueve por semanas para ver proyectos largos (Ecommerce dura 6 a 7 semanas).
  const [weeks, setWeeks] = useState(0)
  const start = addBusinessDays(today, -16 + weeks * 5)
  const idx = (d: string | Date) => businessDaysBetween(start, d)
  const days = Array.from({ length: N }, (_, i) => addBusinessDays(start, i))
  const width = N * W
  const todayIdx = idx(today)

  // Proyectos visibles: activos o que terminaron dentro de la ventana.
  const visible = (p: Project) => {
    const s = statusOf(p, today)
    if (s.kind !== 'terminado') return true
    const last = p.history[p.history.length - 1]
    return last ? idx(last.e) >= 0 : false
  }
  const groups = clients
    .map((c) => ({
      c,
      ps: projects.filter((p) => p.client_id === c.id && visible(p)),
    }))
    .filter((g) => g.ps.length)

  return (
    <>
      <div className="prod-tl-nav" role="group" aria-label="Mover la línea de tiempo">
        <button className="btn btn-ghost btn-sm" onClick={() => setWeeks((w) => w - 1)}>
          ← Semana anterior
        </button>
        <button className="btn btn-ghost btn-sm" disabled={weeks === 0} onClick={() => setWeeks(0)}>
          Hoy
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => setWeeks((w) => w + 1)}>
          Semana siguiente →
        </button>
        <span>
          {shortDate(days[0])} – {shortDate(days[N - 1])}
        </span>
      </div>
      <TimelineGrid
        {...{
          groups,
          W,
          today,
          N,
          start,
          idx,
          days,
          width,
          todayIdx,
          openId,
          onOpen,
        }}
      />
    </>
  )
}

function TimelineGrid({
  groups,
  W,
  today,
  N,
  idx,
  days,
  width,
  todayIdx,
  openId,
  onOpen,
}: {
  groups: { c: Client; ps: Project[] }[]
  W: number
  today: Date
  N: number
  start: Date
  idx: (d: string | Date) => number
  days: Date[]
  width: number
  todayIdx: number
  openId: string | null
  onOpen: (id: string) => void
}) {
  // Al aparecer (y al cambiar el ancho de columna), se desplaza para dejar hoy a la vista.
  const hasRows = groups.length > 0
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = box.current
    if (el) el.scrollLeft = Math.max(0, todayIdx * W - el.clientWidth * 0.55)
  }, [todayIdx, W, hasRows])

  if (!groups.length)
    return <p className="prod-empty prod-tl-empty">Los proyectos activos aparecerán aquí, con sus etapas sobre los días hábiles.</p>

  const seg = (a: string | Date, b: string | Date, cls: string, text = '', title = '') => {
    const l = Math.max(idx(a), 0)
    const r = Math.min(idx(b), N)
    if (r <= 0 || l >= N) return null
    const w = Math.max((r - l) * W - 3, W / 2)
    return (
      <span key={`${cls}-${l}-${text}-${title}`} className={`prod-seg ${cls}`} style={{ left: l * W + 1, width: w }} title={title || text}>
        {text}
      </span>
    )
  }

  const lines = days.map((d, i) => <i key={i} className={`prod-col${d.getDay() === 1 ? ' is-mon' : ''}`} style={{ left: i * W }} />)
  const todayCol = <i className="prod-today-col" style={{ left: todayIdx * W, width: W }} />

  return (
    <div className="prod-tl" ref={box}>
      <div className="prod-tl__grid" style={{ ['--col' as string]: `${W}px` }}>
        <div className="prod-row prod-row--days">
          <div className="prod-name">Cliente · proyecto</div>
          <div className="prod-track" style={{ width }}>
            {todayCol}
            {days.map((d, i) => (
              <span
                key={i}
                className={`prod-day${d.getDay() === 1 ? ' is-mon' : ''}${+d === +today ? ' is-today' : ''}`}
                style={{ left: i * W, width: W }}
              >
                {dayLabel(d)}
                <br />
                {d.getDate()}
              </span>
            ))}
          </div>
        </div>
        {groups.map(({ c, ps }) => (
          <div key={c.id} role="rowgroup">
            <div className="prod-row prod-row--client">
              <div className="prod-name">
                <span>{c.company || c.name}</span>
                {ps.length > 1 && <small>{ps.length} proyectos</small>}
              </div>
              <div className="prod-track" style={{ width }}>
                {lines}
                {todayCol}
              </div>
            </div>
            {ps.map((p) => {
              const s = statusOf(p, today)
              const bars: ReactNode[] = []
              if (s.kind !== 'sinficha') {
                const fl = flowOf(p.service)
                const STAGES_WE = fl.stages
                for (const h of p.history) {
                  const f = fl.phases[h.i]
                  bars.push(seg(h.s, h.e, `is-${f.o}`, STAGES_WE[f.stage].n, `${STAGES_WE[f.stage].n} · ${f.l}`))
                }
                if (s.kind !== 'terminado') {
                  const f = s.phase
                  const tomorrow = addBusinessDays(today, 1)
                  if (s.kind === 'pausa') {
                    bars.push(seg(p.phase_started, p.paused_since!, `is-${f.o} is-crit`, STAGES_WE[f.stage].n))
                    bars.push(seg(p.paused_since!, tomorrow, 'is-pause', 'En pausa'))
                  } else {
                    const end = addBusinessDays(p.phase_started, f.d)
                    const late = s.kind !== 'acompanamiento' && s.late ? (s.days >= 7 ? ' is-crit' : ' is-late') : ''
                    bars.push(
                      seg(
                        p.phase_started,
                        tomorrow,
                        `is-${f.o}${late}`,
                        STAGES_WE[f.stage].n,
                        `${STAGES_WE[f.stage].n} · ${f.l} · día ${s.days} de ${f.d}`,
                      ),
                    )
                    let cursor = end > tomorrow ? end : tomorrow
                    if (end > tomorrow) bars.push(seg(tomorrow, end, `is-plan is-${f.o}`, '', 'Planeado'))
                    for (let i = p.phase + 1; i < fl.phases.length; i++) {
                      const g = fl.phases[i]
                      const next = addBusinessDays(cursor, g.d)
                      bars.push(seg(cursor, next, `is-plan is-${g.o}`, '', `Planeado · ${STAGES_WE[g.stage].n} · ${g.l}`))
                      cursor = next
                    }
                  }
                }
              }
              const label = statusLabel(p, s)
              return (
                <div
                  key={p.id}
                  className={`prod-row prod-row--project${openId === p.id ? ' is-open' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Abrir ${c.company || c.name} · ${projectName(p)}`}
                  onClick={() => onOpen(p.id)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen(p.id))}
                >
                  <div className="prod-name">
                    <span>{projectName(p)}</span>
                    <small className={label.tone ? `is-${label.tone}` : ''}>{label.text}</small>
                  </div>
                  <div className="prod-track" style={{ width }}>
                    {lines}
                    {todayCol}
                    {s.kind === 'sinficha' ? (
                      <span className="prod-nostage">Etapas por definir: este servicio aún no tiene ficha operativa</span>
                    ) : (
                      bars
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ——— Ficha del proyecto ———
function ProjectDetail({
  project: p,
  client: c,
  siblings,
  onClose,
  onOpen,
  onOpenClient,
  onDeleted,
  onUpdate,
  onMessage,
  toast,
  banner,
  toastText,
}: {
  project: Project
  client?: Client
  siblings: Project[]
  onClose: () => void
  onOpen: (id: string) => void
  onOpenClient: (id: string) => void
  onDeleted: (id: string) => void
  onUpdate: (id: string, patch: Partial<Project>) => Promise<boolean>
  onMessage: (k: TemplateKey) => void
  toast: (t: string) => void
  banner: ReactNode
  toastText: string | null
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  useEffect(() => {
    dialog.current?.showModal()
  }, [])
  const s = statusOf(p)
  const label = statusLabel(p, s)
  const tasks = tasksOf(p)
  const fl = flowOf(p.service)
  const { stages: STAGES_WE, phases: PHASES, last: LAST_STAGE } = fl

  let now: ReactNode
  if (s.kind === 'sinficha') {
    now = (
      <div className="prod-now">
        <h3>Etapas por definir</h3>
        <p className="panel-muted">
          Este servicio aún no tiene ficha operativa. Cuando la armemos, sus etapas aparecerán aquí y en la línea de tiempo. Mientras,
          puedes enviar mensajes y llevar notas.
        </p>
        <div className="prod-actions">
          {(['inicio', 'materiales', 'revision', 'final', 'cierre'] as const).map((k) => (
            <button key={k} className="btn btn-ghost btn-sm" onClick={() => onMessage(k)}>
              {TEMPLATES[k].t}
            </button>
          ))}
        </div>
      </div>
    )
  } else if (s.kind === 'terminado') {
    now = (
      <div className="prod-now">
        <h3>{p.closed_admin ? 'Cierre administrativo' : 'Proyecto cerrado'}</h3>
        <p className="panel-muted">
          {p.closed_admin
            ? 'Se cerró tras 30 días en pausa. Para retomarlo, el cliente paga el 30 % pendiente.'
            : 'Terminó el acompañamiento.'}
        </p>
      </div>
    )
  } else {
    const f = s.phase
    const missing = f.pago && !(f.pago === 'deposit' ? p.paid_deposit : p.paid_balance)
    const text =
      s.kind === 'pausa'
        ? `En pausa desde el ${shortDate(p.paused_since!)} · ${s.pausedDays} de 30 días naturales antes del cierre administrativo`
        : s.kind === 'acompanamiento'
          ? `Día ${s.calendar} de ${fl.support} naturales de acompañamiento`
          : `Día ${s.days} de ${f.d} hábiles acordados${s.late ? ' · fuera de plazo' : ''} · desde el ${shortDate(p.phase_started)}`
    const waiting = s.kind === 'cliente' || s.kind === 'pausa'
    const filled = Math.min(s.days, 10)
    now = (
      <div className="prod-now">
        <div className="prod-now__top">
          <span className={`prod-who is-${f.o}`}>
            <i />
            {f.o === 'alive' ? 'ALIVE trabaja' : 'Espera al cliente'}
          </span>
          <span className={`prod-pill${label.tone ? ` is-${label.tone}` : ''}`}>
            {s.kind === 'pausa' ? 'En pausa' : STAGES_WE[f.stage].n}
          </span>
        </div>
        <div>
          <h3>{f.l}</h3>
          <p className="panel-muted prod-small">{text}</p>
        </div>
        {waiting && (
          <div aria-label={`Día ${s.days} de espera`}>
            <div className="prod-meter">
              {Array.from({ length: 10 }, (_, i) => (
                <i key={i} className={i < filled ? `is-on${i >= 9 ? ' is-crit' : i >= 6 ? ' is-warn' : ''}` : ''} />
              ))}
            </div>
            <div className="prod-meter prod-meter--labels">
              {Array.from({ length: 10 }, (_, i) => (
                <span key={i}>{i === 2 ? '3 · rec.' : i === 6 ? '7 · aviso' : i === 9 ? '10 · pausa' : ''}</span>
              ))}
            </div>
          </div>
        )}
        {tasks.length > 0 && (
          <div className="prod-actions">
            {tasks.map((t) =>
              t.key ? (
                <button key={t.key} className="btn btn-sm prod-wa" onClick={() => onMessage(t.key!)}>
                  WhatsApp: {TEMPLATES[t.key].t}
                </button>
              ) : (
                <p key={t.text} className="prod-hint">
                  {t.text}.
                </p>
              ),
            )}
          </div>
        )}
        {missing && <p className="prod-hint">Para avanzar falta marcar el pago del {f.pago === 'deposit' ? '70' : '30'} %.</p>}
        <div className="prod-actions">
          {s.kind === 'pausa' ? (
            <button className="btn btn-primary btn-sm" onClick={() => onMessage('reactivacion')}>
              Reactivar
            </button>
          ) : (
            <>
              <button
                className="btn btn-primary btn-sm"
                disabled={Boolean(missing)}
                onClick={async () => {
                  await onUpdate(p.id, advance(p))
                  toast(p.phase + 1 >= PHASES.length ? 'Proyecto cerrado' : `Siguiente: ${PHASES[p.phase + 1].l}`)
                }}
              >
                {f.stage === LAST_STAGE ? 'Cerrar proyecto' : 'Marcar como hecho'}
              </button>
              {f.o === 'cliente' && (
                <button className="btn btn-ghost btn-sm" onClick={() => onMessage('pausa')}>
                  Pausar
                </button>
              )}
            </>
          )}
          <OtherMessages onPick={onMessage} />
        </div>
      </div>
    )
  }

  // En pausa no se ofrece: lo que corresponde es «Reactivar».
  const previous = p.history.length && !p.paused_since ? fl.phases[p.history[p.history.length - 1].i] : null
  return (
    <dialog
      ref={dialog}
      className="detail"
      aria-labelledby="prod-title"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
    >
      <div className="detail__body">
        <header className="detail__head">
          <div>
            <p className="eyebrow">
              {clientLabel(c)}
              {c?.company ? ` · ${c.name}` : ''}
            </p>
            <h2 id="prod-title">{projectName(p)}</h2>
          </div>
          <button className="detail__close" onClick={() => dialog.current?.close()} aria-label="Cerrar">
            ×
          </button>
        </header>

        {banner}
        {/* Dentro del diálogo, para que el aviso quede por encima de él y no detrás. */}
        {toastText && (
          <div className="prod-toast" role="status">
            {toastText}
          </div>
        )}
        {now}
        {previous && (
          <button
            className="panel-link prod-undo"
            onClick={async () => {
              const patch = undo(p)
              if (patch && (await onUpdate(p.id, patch))) toast(`Volviste a: ${previous.l}`)
            }}
          >
            ↶ Deshacer el último paso
            <span className="prod-undo__to"> · vuelve a {STAGES_WE[previous.stage].n}</span>
          </button>
        )}

        <section className="detail__section">
          <h3>Monto y pagos</h3>
          <AmountField value={p.amount} onSave={(amount) => onUpdate(p.id, { amount })} />
          <div className="prod-pays">
            <label>
              <input
                type="checkbox"
                checked={p.paid_deposit}
                onChange={(e) =>
                  onUpdate(p.id, {
                    paid_deposit: e.target.checked,
                    paid_deposit_at: e.target.checked ? iso(new Date()) : null,
                  })
                }
              />
              70 % al confirmar
              {p.amount ? ` · ${money(Math.round(p.amount * 70) / 100)}` : ''}
            </label>
            <label>
              <input
                type="checkbox"
                checked={p.paid_balance}
                onChange={(e) =>
                  onUpdate(p.id, {
                    paid_balance: e.target.checked,
                    paid_balance_at: e.target.checked ? iso(new Date()) : null,
                  })
                }
              />
              30 % al aprobar
              {p.amount ? ` · ${money(Math.round(p.amount * 30) / 100)}` : ''}
            </label>
          </div>
        </section>

        <section className="detail__section">
          <h3>Cliente</h3>
          <div className="prod-actions">
            {c && (
              <button className="btn btn-ghost btn-sm" onClick={() => onOpenClient(c.id)}>
                Ver ficha y notas de {clientLabel(c)}
              </button>
            )}
            {siblings.map((o) => (
              <button key={o.id} className="btn btn-ghost btn-sm" onClick={() => onOpen(o.id)}>
                {projectName(o)} · {statusLabel(o).text}
              </button>
            ))}
          </div>
          {c && !waNumber(c.phone) && (
            <p className="prod-hint">Este cliente no tiene WhatsApp. Añádelo en su ficha para usar los mensajes.</p>
          )}
        </section>

        {p.service !== 'otro' && (
          <section className="detail__section">
            <h3>Etapas</h3>
            <ol className="prod-steps">
              {STAGES_WE.map((st, si) => {
                const phases = PHASES.map((f, i) => ({ ...f, i })).filter((f) => f.stage === si)
                const done = phases.every((f) => f.i < p.phase)
                const current = phases.some((f) => f.i === p.phase)
                const h0 = p.history.find((h) => h.i === phases[0].i)
                const hN = p.history.find((h) => h.i === phases[phases.length - 1].i)
                const when =
                  done && h0 && hN
                    ? `${shortDate(h0.s)} → ${shortDate(hN.e)}`
                    : current
                      ? 'En curso'
                      : `${phases.reduce((a, f) => a + f.d, 0)} días hábiles`
                return (
                  <li key={st.n} className={`${done ? 'is-done' : ''}${current ? ' is-current' : ''}`}>
                    <span className="prod-steps__ico">{done ? '✓' : si + 1}</span>
                    <div>
                      <div className="prod-steps__head">
                        <b>{st.n}</b>
                        <span>{when}</span>
                      </div>
                      {phases.map((f) => (
                        <div key={f.i} className={`prod-steps__ph${f.i === p.phase ? ' is-current' : ''}`}>
                          <b>{f.l}</b>
                          <span>
                            {f.o === 'alive' ? 'ALIVE' : 'Cliente'} · {f.d} d
                          </span>
                        </div>
                      ))}
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>
        )}

        <footer className="detail__foot">
          {confirmDelete ? (
            <span className="prod-actions">
              ¿Eliminar este proyecto? Las notas del cliente se conservan.
              <button
                className="panel-link panel-link--danger"
                onClick={async () => {
                  const { error } = await supabase!.from('projects').delete().eq('id', p.id)
                  if (error) toast('No se pudo eliminar')
                  else {
                    dialog.current?.close()
                    toast('Proyecto eliminado')
                    onDeleted(p.id)
                  }
                }}
              >
                Sí, eliminar
              </button>
              <button className="panel-link" onClick={() => setConfirmDelete(false)}>
                Cancelar
              </button>
            </span>
          ) : (
            <button className="panel-link panel-link--danger" onClick={() => setConfirmDelete(true)}>
              Eliminar proyecto
            </button>
          )}
        </footer>
      </div>
    </dialog>
  )
}

// «¿Lo enviaste?»: queda hasta que se responde. Dentro de la ficha abierta va en línea (un aviso fijo
// quedaría detrás del diálogo y no se podría pulsar).
function SentBanner({
  sent,
  onDone,
  onUndo,
  inline = false,
}: {
  sent: LastSent
  onDone: () => void
  onUndo: () => void
  inline?: boolean
}) {
  return (
    <div className={`prod-sent${inline ? ' is-inline' : ''}`} role="status">
      <span>
        Anotado: <b>{sent.title}</b> a {sent.client}. ¿Lo enviaste?
      </span>
      <span className="prod-actions">
        <button className="btn btn-ghost btn-sm" onClick={onDone}>
          Sí, lo envié
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onUndo}>
          No lo envié
        </button>
      </span>
    </div>
  )
}

// Monto del proyecto en US$: se guarda al salir del campo, con Enter o al cerrar la ficha.
function AmountField({ value, onSave }: { value: number | null; onSave: (v: number | null) => void }) {
  const [draft, setDraft] = useState(value?.toString() ?? '')
  const commit = () => {
    const next = draft ? Number(draft) : null
    if (next !== value && (next === null || Number.isFinite(next))) onSave(next)
  }
  const commitRef = useRef(commit)
  useEffect(() => {
    commitRef.current = commit
  })
  useEffect(() => () => commitRef.current(), [])
  return (
    <label className="panel-field prod-amount">
      <span>Monto del proyecto (US$)</span>
      <input
        inputMode="decimal"
        value={draft}
        placeholder="Ej.: 750"
        onChange={(e) => setDraft(e.target.value.replace(/[^\d.]/g, ''))}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
    </label>
  )
}

function OtherMessages({ onPick }: { onPick: (k: TemplateKey) => void }) {
  return (
    <select
      className="prod-select"
      aria-label="Otros mensajes"
      value=""
      onChange={(e) => e.target.value && onPick(e.target.value as TemplateKey)}
    >
      <option value="">Otros mensajes…</option>
      {(Object.keys(TEMPLATES) as TemplateKey[]).map((k) => (
        <option key={k} value={k}>
          {TEMPLATES[k].t}
        </option>
      ))}
    </select>
  )
}

// ——— Mensaje de WhatsApp ———
function MessageDialog({
  project,
  client,
  tkey,
  onClose,
  onSent,
}: {
  project: Project
  client?: Client
  tkey: TemplateKey
  onClose: () => void
  onSent: (text: string) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [text, setText] = useState(() => TEMPLATES[tkey].m({ nombre: firstName(client?.name ?? ''), project }))
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    dialog.current?.showModal()
  }, [])
  const phone = waNumber(client?.phone ?? null)
  const href = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
  const effect =
    tkey === 'pausa'
      ? ', y el proyecto pasa a pausa'
      : tkey === 'reactivacion'
        ? ', y el proyecto se reactiva'
        : tkey === 'cierreAdm'
          ? ', y el proyecto se cierra'
          : ''

  return (
    <dialog ref={dialog} className="detail detail--small prod-msg" aria-labelledby="msg-title" onClose={onClose}>
      <div className="detail__body">
        <header className="detail__head">
          <div>
            <p className="eyebrow">
              {clientLabel(client)}
              {phone ? ` · +${phone}` : ''}
            </p>
            <h2 id="msg-title">{TEMPLATES[tkey].t}</h2>
          </div>
          <button className="detail__close" onClick={() => dialog.current?.close()} aria-label="Cerrar">
            ×
          </button>
        </header>
        <label className="panel-field">
          <span>Mensaje (puedes editarlo antes de enviar)</span>
          <textarea className="prod-textarea" rows={7} value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        {/\[[^\]]+\]/.test(text) && <p className="prod-hint">Completa lo que va entre [corchetes] antes de enviar.</p>}
        {!phone && <p className="panel-error">Este cliente no tiene WhatsApp en su ficha. Puedes copiar el mensaje y anotarlo.</p>}
        <div className="prod-actions">
          {phone ? (
            <a className="btn btn-sm prod-wa" href={href} target="_blank" rel="noopener" onClick={() => onSent(text)}>
              Abrir en WhatsApp y anotar
            </a>
          ) : (
            <button className="btn btn-sm prod-wa" onClick={() => onSent(text)}>
              Solo anotar
            </button>
          )}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() =>
              navigator.clipboard?.writeText(text).then(
                () => setCopied(true),
                () => setCopied(false),
              )
            }
          >
            {copied ? 'Copiado ✓' : 'Copiar'}
          </button>
        </div>
        <p className="panel-muted prod-small">Al abrir WhatsApp se guarda una nota en el cliente con la fecha y el mensaje{effect}.</p>
      </div>
    </dialog>
  )
}

// Buscador de clientes: escribe parte del nombre, la marca, el correo o el teléfono y elige de la lista.
const fold = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
function ClientPicker({ clients, value, onChange }: { clients: Client[]; value: string; onChange: (id: string) => void }) {
  const selected = clients.find((c) => c.id === value)
  const show = (c: Client) => (c.company ? `${c.company} · ${c.name}` : c.name)
  const [query, setQuery] = useState(selected ? show(selected) : '')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const q = fold(query.trim())
  const typing = !selected || query !== show(selected)
  const matches = (typing && q ? clients.filter((c) => [c.name, c.company, c.email, c.phone].some((v) => v && fold(v).includes(q))) : clients).slice(0, 8)
  const choose = (c: Client) => {
    onChange(c.id)
    setQuery(show(c))
    setOpen(false)
  }
  return (
    <div className="panel-field prod-picker">
      <label htmlFor="prod-picker-input">
        <span>Cliente</span>
      </label>
      <input
        id="prod-picker-input"
        role="combobox"
        aria-expanded={open}
        aria-controls="prod-picker-list"
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="Busca por nombre, marca, correo o teléfono"
        value={query}
        onFocus={(e) => {
          setOpen(true)
          e.currentTarget.select()
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
          setOpen(true)
          if (selected) onChange('')
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            setActive((a) => Math.min(a + 1, matches.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => Math.max(a - 1, 0))
          } else if (e.key === 'Enter' && open && matches[active]) {
            e.preventDefault()
            choose(matches[active])
          } else if (e.key === 'Escape' && open) {
            e.preventDefault()
            e.stopPropagation()
            setOpen(false)
          }
        }}
      />
      {open && (
        <ul id="prod-picker-list" role="listbox" className="prod-picker__list">
          {matches.length ? (
            matches.map((c, i) => (
              <li
                key={c.id}
                role="option"
                aria-selected={i === active}
                className={i === active ? 'is-active' : ''}
                onMouseDown={(e) => {
                  e.preventDefault()
                  choose(c)
                }}
                onMouseEnter={() => setActive(i)}
              >
                <b>{c.company || c.name}</b>
                <small>{[c.company ? c.name : null, c.email, c.phone].filter(Boolean).join(' · ')}</small>
              </li>
            ))
          ) : (
            <li className="prod-picker__none">Sin resultados. Si es nuevo, créalo antes en Clientes.</li>
          )}
        </ul>
      )}
    </div>
  )
}

// ——— Nuevo proyecto ———
function NewProject({
  clients,
  preset,
  onClose,
  onCreated,
}: {
  clients: Client[]
  preset: string
  onClose: () => void
  onCreated: (p: Project) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [clientId, setClientId] = useState(preset || clients.find((c) => c.stage === 'ganado')?.id || clients[0]?.id || '')
  const [service, setService] = useState<Service>('we')
  const [title, setTitle] = useState('')
  const [start, setStart] = useState(() => iso(new Date()))
  const [deposit, setDeposit] = useState(false)
  // Se propone el precio «desde» del servicio; si se escribe otro, se respeta.
  const [amount, setAmount] = useState<string | null>(null)
  const amountValue = amount ?? PRICE_FROM[service]?.toString() ?? ''
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!clientId) return setError('Elige un cliente. Si es nuevo, créalo antes en Clientes.')
    if (service === 'otro' && !title.trim()) return setError('Ponle nombre al proyecto.')
    const d = new Date(`${start}T12:00:00`)
    while (!isBusinessDay(d)) d.setDate(d.getDate() + 1)
    setBusy(true)
    const { data, error } = await supabase!
      .from('projects')
      .insert({
        client_id: clientId,
        service,
        title: service === 'otro' ? title.trim() : null,
        phase_started: iso(d),
        paid_deposit: deposit,
        paid_deposit_at: deposit ? start : null,
        amount: amountValue ? Number(amountValue) : null,
      })
      .select()
      .single()
    setBusy(false)
    if (error || !data) return setError('No se pudo crear el proyecto. ¿Ejecutaste supabase/proyectos.sql en Supabase?')
    onCreated(data as Project)
  }

  const sorted = [...clients].sort((a, b) => (a.company || a.name).localeCompare(b.company || b.name, 'es'))
  return (
    <dialog ref={dialog} className="detail detail--small" aria-labelledby="new-project-title" onClose={onClose}>
      <form className="detail__body" onSubmit={submit}>
        <header className="detail__head">
          <h2 id="new-project-title">Nuevo proyecto</h2>
          <button type="button" className="detail__close" onClick={() => dialog.current?.close()} aria-label="Cerrar">
            ×
          </button>
        </header>
        <ClientPicker clients={sorted} value={clientId} onChange={setClientId} />
        <label className="panel-field">
          <span>Servicio</span>
          <select className="prod-select" value={service} onChange={(e) => setService(e.target.value as Service)}>
            <option value="we">{SERVICES.we} · desde US$ 350</option>
            <option value="wep">{SERVICES.wep} · desde US$ 450</option>
            <option value="eco">{SERVICES.eco} · desde US$ 750</option>
            <option value="mar">{SERVICES.mar} · desde US$ 200</option>
            <option value="mid">{SERVICES.mid} · desde US$ 450</option>
            <option value="otro">Otro servicio (sin ficha aún)</option>
          </select>
        </label>
        {service === 'otro' && (
          <label className="panel-field">
            <span>Nombre del proyecto</span>
            <input value={title} placeholder="Ej.: Campaña de lanzamiento" onChange={(e) => setTitle(e.target.value)} />
          </label>
        )}
        <label className="panel-field">
          <span>Propuesta aceptada el</span>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="panel-field">
          <span>Monto del proyecto (US$)</span>
          <input
            inputMode="decimal"
            value={amountValue}
            placeholder="Ej.: 1100"
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
          />
        </label>
        <label className="prod-pays">
          <input type="checkbox" checked={deposit} onChange={(e) => setDeposit(e.target.checked)} />
          Ya pagó el 70 %
        </label>
        {error && <p className="panel-error">{error}</p>}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Creando…' : 'Crear proyecto'}
        </button>
      </form>
    </dialog>
  )
}
