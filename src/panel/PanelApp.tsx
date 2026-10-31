import { useCallback, useEffect, useMemo, useRef, useState, type ClipboardEvent, type FormEvent, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import wordmarkUrl from '../assets/brand/alive-wordmark.svg'
import { PROJECT_TYPES, steps } from '../brief/questions'
import { parseBriefEmail, type ImportedBrief } from './importBrief'
import { configured, SOURCE_LABEL, STAGES, supabase, type Client, type Note, type Stage } from './data'
import { Production } from './Production'
import { projectName, statusLabel, waNumber, type Project } from './production'

const money = (n: number | null) =>
  n == null ? '' : `US$ ${n.toLocaleString('es-PE', { maximumFractionDigits: 2 })}`
const date = (iso: string) =>
  new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
const ago = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  return days === 0 ? 'hoy' : days === 1 ? 'ayer' : days < 30 ? `hace ${days} días` : date(iso)
}
// Etiquetas cortas de los tipos de proyecto marcados en el brief.
const TYPE_SHORT: Record<string, string> = {
  [PROJECT_TYPES.web]: 'Web',
  [PROJECT_TYPES.marca]: 'Marca',
  [PROJECT_TYPES.producto]: 'App',
  [PROJECT_TYPES.ia]: 'IA',
  [PROJECT_TYPES.otro]: 'Otro',
}
const typesOf = (c: Client) =>
  Array.isArray(c.answers?.tipos) ? (c.answers.tipos as string[]).map((t) => TYPE_SHORT[t] ?? t) : []

const waLink = (phone: string) => `https://wa.me/${waNumber(phone)}`

// ¿Es administrador? (panel_admins solo devuelve filas a quien lo es) y la lista de clientes.
async function fetchWorkspace() {
  const [{ data: admins }, { data, error }, projects] = await Promise.all([
    supabase!.from('panel_admins').select('email').limit(1),
    supabase!.from('clients').select('*').order('created_at', { ascending: false }),
    supabase!.from('projects').select('*').order('created_at', { ascending: true }),
  ])
  return {
    admin: (admins?.length ?? 0) > 0,
    clients: (data ?? []) as Client[],
    failed: Boolean(error),
    // Si la tabla de proyectos aún no existe (falta ejecutar supabase/proyectos.sql), se avisa en Producción.
    projects: (projects.data ?? []) as Project[],
    projectsMissing: Boolean(projects.error),
  }
}

export function PanelApp() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!configured)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!configured) {
    return (
      <Shell>
        <div className="panel-center">
          <h1 className="panel-h1">Panel sin configurar</h1>
          <p className="panel-muted">Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en Vercel.</p>
        </div>
      </Shell>
    )
  }
  if (!ready) return <Shell />
  return session ? <Workspace session={session} /> : <Login />
}

function Shell({ children, right }: { children?: ReactNode; right?: ReactNode }) {
  return (
    <div className="panel">
      <header className="panel-bar">
        <a href="/" className="panel-logo" aria-label="ALIVE, ir a la web">
          <img src={wordmarkUrl} alt="" width="84" height="16" />
        </a>
        <span className="panel-label">Panel</span>
        <div className="panel-bar__right">{right}</div>
      </header>
      {children}
    </div>
  )
}

// Motivo legible del fallo al entrar (Supabase responde en inglés).
function loginError(message: string, status?: number) {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.'
  if (m.includes('email not confirmed'))
    return 'Tu usuario aún no está confirmado. En Supabase → Authentication → Users, confírmalo o vuelve a crearlo con «Auto Confirm User».'
  if (m.includes('signups not allowed') || m.includes('user not found'))
    return 'Este correo no tiene cuenta en el panel. Créala en Supabase → Authentication → Users con este mismo correo.'
  if (status === 429 || m.includes('rate limit'))
    return 'Demasiados intentos seguidos. Espera unos minutos y vuelve a pedir el enlace.'
  if (m.includes('redirect')) return 'La dirección del panel no está autorizada en Supabase → Authentication → URL Configuration.'
  return `No pudimos enviarte el enlace (${message}).`
}

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [reason, setReason] = useState('')

  // Acceso con contraseña. Al entrar, onAuthStateChange muestra el panel.
  async function submit(e: FormEvent) {
    e.preventDefault()
    setState('sending')
    const { error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password })
    if (error) {
      setReason(loginError(error.message, error.status))
      setState('error')
    } else setState('idle')
  }

  // Alternativa si se olvida la contraseña: enlace de acceso al correo.
  async function sendLink() {
    if (!email.trim()) {
      setReason('Escribe tu correo y vuelve a pulsar «Entrar con un enlace».')
      setState('error')
      return
    }
    setState('sending')
    const { error } = await supabase!.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: `${location.origin}/panel/` },
    })
    if (error) setReason(loginError(error.message, error.status))
    setState(error ? 'error' : 'sent')
  }

  return (
    <Shell>
      <main className="panel-center">
        <p className="eyebrow eyebrow--rule">Acceso privado</p>
        <h1 className="panel-h1">Panel de ALIVE</h1>
        {state === 'sent' ? (
          <p className="panel-muted" role="status">
            Te enviamos un enlace de acceso a <strong>{email}</strong>. Ábrelo en este mismo navegador.
          </p>
        ) : (
          <form className="panel-login" onSubmit={submit}>
            <label htmlFor="login-email">Correo</label>
            <input id="login-email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
            <label htmlFor="login-password">Contraseña</label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button className="btn btn-primary" disabled={state === 'sending'}>
              {state === 'sending' ? 'Entrando…' : 'Entrar'}
            </button>
            {state === 'error' && (
              <p className="panel-error" role="alert">
                {reason}
              </p>
            )}
            <button type="button" className="panel-link panel-login__alt" onClick={sendLink} disabled={state === 'sending'}>
              ¿Olvidaste la contraseña? Entrar con un enlace al correo
            </button>
          </form>
        )}
      </main>
    </Shell>
  )
}

function Workspace({ session }: { session: Session }) {
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsMissing, setProjectsMissing] = useState(false)
  const [section, setSection] = useState<'clientes' | 'produccion'>(() =>
    location.hash === '#produccion' ? 'produccion' : 'clientes',
  )
  const [newProjectFor, setNewProjectFor] = useState<string | null>(null)
  const [focusProject, setFocusProject] = useState<string | null>(null)
  const [admin, setAdmin] = useState<boolean | null>(null)
  const [view, setView] = useState<'tablero' | 'lista'>('tablero')
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // ¿Pueden las funciones de la web guardar en Supabase? Si no, se avisa con el motivo.
  const [health, setHealth] = useState<{ ok: boolean; reason?: string; warning?: string; note?: string; detail?: string } | null>(null)
  useEffect(() => {
    fetch('/api/panel-health', { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth(null))
  }, [session.access_token])

  const load = useCallback(
    () =>
      fetchWorkspace().then(({ admin, clients, failed, projects, projectsMissing }) => {
        setAdmin(admin)
        if (failed) setError('No se pudieron cargar los clientes.')
        else setClients(clients)
        setProjects(projects)
        setProjectsMissing(projectsMissing)
      }),
    [],
  )

  useEffect(() => {
    void load()
    const onFocus = () => void load()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [load])

  async function update(id: string, patch: Partial<Client>) {
    setClients((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)))
    const { error } = await supabase!.from('clients').update(patch).eq('id', id)
    if (error) {
      setError('No se pudo guardar el cambio.')
      load()
    }
    return !error
  }

  async function updateProject(id: string, patch: Partial<Project>) {
    setProjects((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)))
    const { error } = await supabase!.from('projects').update(patch).eq('id', id)
    if (error) {
      setError('No se pudo guardar el cambio del proyecto.')
      load()
    }
    return !error
  }

  function go(next: 'clientes' | 'produccion') {
    setSection(next)
    history.replaceState(null, '', next === 'produccion' ? '#produccion' : location.pathname)
  }

  async function remove(id: string) {
    setOpenId(null)
    setClients((list) => list.filter((c) => c.id !== id))
    // Sus proyectos se borran en cascada en Supabase; aquí también, para que no queden huérfanos en Producción.
    setProjects((list) => list.filter((p) => p.client_id !== id))
    const { error } = await supabase!.from('clients').delete().eq('id', id)
    if (error) {
      setError('No se pudo eliminar.')
      load()
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return clients.filter(
      (c) =>
        (!type || typesOf(c).includes(type)) &&
        (!q || [c.name, c.company, c.email, c.sector].some((v) => v?.toLowerCase().includes(q))),
    )
  }, [clients, query, type])

  const open = clients.find((c) => c.id === openId) ?? null
  const clearNewProject = useCallback(() => setNewProjectFor(null), [])
  const nuevos = clients.filter((c) => c.stage === 'nuevo').length
  const signOut = () => supabase!.auth.signOut()

  if (admin === false) {
    return (
      <Shell right={<button className="panel-link" onClick={signOut}>Salir</button>}>
        <div className="panel-center">
          <h1 className="panel-h1">Sin acceso</h1>
          <p className="panel-muted">
            {session.user.email} no está autorizado. Añádelo a la tabla panel_admins en Supabase.
          </p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell
      right={
        <>
          <span className="panel-user">{session.user.email}</span>
          <button className="panel-link" onClick={signOut}>
            Salir
          </button>
        </>
      }
    >
      <main className="panel-main">
        <nav className="panel-tabs prod-nav" aria-label="Secciones">
          {(['clientes', 'produccion'] as const).map((v) => (
            <button key={v} aria-current={section === v ? 'page' : undefined} aria-selected={section === v} onClick={() => go(v)}>
              {v === 'clientes' ? 'Clientes' : 'Producción'}
            </button>
          ))}
        </nav>
        {error && (
          <p className="panel-error" role="alert">
            {error}{' '}
            <button className="panel-link" onClick={() => setError(null)}>
              Cerrar
            </button>
          </p>
        )}
        {section === 'produccion' ? (
          <>
            {projectsMissing && (
              <div className="panel-alert" role="alert">
                <strong>Falta crear la tabla de proyectos.</strong> En Supabase → SQL Editor, pega el contenido de supabase/proyectos.sql y pulsa Run. Después recarga esta página.
              </div>
            )}
            <Production
              initialOpenId={focusProject}
              clients={clients}
              projects={projects}
              author={session.user.email ?? ''}
              newFor={newProjectFor}
              onNewHandled={clearNewProject}
              onUpdate={updateProject}
              onCreated={(p) => setProjects((list) => [...list, p])}
              onDeleted={(id) => setProjects((list) => list.filter((p) => p.id !== id))}
              onOpenClient={(id) => {
                go('clientes')
                setOpenId(id)
              }}
            />
          </>
        ) : (
        <>
        <div className="panel-toolbar">
          <div>
            <h1 className="panel-h1">Clientes</h1>
            <p className="panel-muted">
              {clients.length} en total · {nuevos} {nuevos === 1 ? 'nuevo' : 'nuevos'}
            </p>
          </div>
          <div className="panel-toolbar__actions">
            <select className="panel-filter" aria-label="Filtrar por tipo" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Todos los tipos</option>
              {Object.values(TYPE_SHORT).map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <input className="panel-search" type="search" placeholder="Buscar cliente, marca o correo" aria-label="Buscar" value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="panel-tabs" role="tablist" aria-label="Vista">
              {(['tablero', 'lista'] as const).map((v) => (
                <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}>
                  {v === 'tablero' ? 'Tablero' : 'Lista'}
                </button>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setImporting(true)}>
              Importar brief
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>
              + Cliente
            </button>
          </div>
        </div>
        {health?.ok && health.note && !health.warning && (
          <p className="panel-note" role="status">
            Los briefs entran al panel. {health.note}
          </p>
        )}
        {health && (!health.ok || health.warning) && (
          <div className="panel-alert" role="alert">
            <strong>Los briefs y consultas nuevos no están entrando al panel.</strong> {health.reason ?? health.warning}
            {health.detail && <code>{health.detail}</code>}
            <span>Mientras tanto siguen llegando por correo; puedes añadirlos con «Importar brief».</span>
          </div>
        )}
        {view === 'tablero' ? (
          <Board clients={filtered} onOpen={setOpenId} onMove={(id, stage) => update(id, { stage })} />
        ) : (
          <List clients={filtered} onOpen={setOpenId} />
        )}
        </>
        )}
      </main>
      {open && (
        <Detail
          key={open.id}
          client={open}
          author={session.user.email ?? ''}
          projects={projects.filter((p) => p.client_id === open.id)}
          onNewProject={() => {
            setOpenId(null)
            go('produccion')
            setNewProjectFor(open.id)
          }}
          onOpenProject={(id) => {
            setOpenId(null)
            setFocusProject(id)
            go('produccion')
          }}
          onClose={() => setOpenId(null)}
          onUpdate={update}
          onRemove={remove}
        />
      )}
      {importing && (
        <ImportBrief
          onClose={() => setImporting(false)}
          onAdded={(c) => {
            setClients((list) => [c, ...list])
            setImporting(false)
            setOpenId(c.id)
          }}
        />
      )}
      {adding && (
        <AddClient
          onClose={() => setAdding(false)}
          onAdded={(c) => {
            setClients((list) => [c, ...list])
            setAdding(false)
            setOpenId(c.id)
          }}
        />
      )}
    </Shell>
  )
}

function Board({ clients, onOpen, onMove }: { clients: Client[]; onOpen: (id: string) => void; onMove: (id: string, stage: Stage) => void }) {
  const [over, setOver] = useState<Stage | null>(null)
  return (
    <div className="board">
      {STAGES.map((s) => {
        const items = clients.filter((c) => c.stage === s.id)
        const total = items.reduce((sum, c) => sum + (c.value ?? 0), 0)
        return (
          <section
            key={s.id}
            className={`board-col board-col--${s.id}${over === s.id ? ' is-over' : ''}`}
            aria-label={s.label}
            onDragOver={(e) => {
              e.preventDefault()
              setOver(s.id)
            }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => {
              e.preventDefault()
              setOver(null)
              const id = e.dataTransfer.getData('text/plain')
              if (id) onMove(id, s.id)
            }}
          >
            <header className="board-col__head">
              <h2>{s.label}</h2>
              <span className="board-col__count">{items.length}</span>
              {total > 0 && <span className="board-col__total">{money(total)}</span>}
            </header>
            <div className="board-col__list">
              {items.map((c) => (
                <button
                  key={c.id}
                  className="card"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', c.id)}
                  onClick={() => onOpen(c.id)}
                >
                  <span className="card__top">
                    <span className={`tag tag--${c.source}`}>{SOURCE_LABEL[c.source]}</span>
                    <span className="card__date">{ago(c.created_at)}</span>
                  </span>
                  <span className="card__company">{c.company || c.name}</span>
                  {typesOf(c).length > 0 && (
                    <span className="card__types">
                      {typesOf(c).map((t) => (
                        <span key={t}>{t}</span>
                      ))}
                    </span>
                  )}
                  {c.company && <span className="card__name">{c.name}</span>}
                  {c.value != null && <span className="card__value">{money(c.value)}</span>}
                </button>
              ))}
              {!items.length && <p className="board-col__empty">Arrastra aquí</p>}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function List({ clients, onOpen }: { clients: Client[]; onOpen: (id: string) => void }) {
  if (!clients.length) return <p className="panel-muted panel-empty">Todavía no hay clientes. Los briefs y consultas aparecerán aquí solos.</p>
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Cliente</th>
            <th scope="col">Etapa</th>
            <th scope="col">Origen</th>
            <th scope="col">Valor</th>
            <th scope="col">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.id} onClick={() => onOpen(c.id)}>
              <td>
                <button className="table__open" onClick={() => onOpen(c.id)}>
                  <strong>{c.company || c.name}</strong>
                  <span>{c.company ? c.name : c.email}</span>
                </button>
              </td>
              <td>
                <span className={`stage stage--${c.stage}`}>{STAGES.find((s) => s.id === c.stage)?.label}</span>
              </td>
              <td>{SOURCE_LABEL[c.source]}</td>
              <td>{money(c.value)}</td>
              <td>{date(c.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Detail({
  client: c,
  author,
  projects,
  onNewProject,
  onOpenProject,
  onClose,
  onUpdate,
  onRemove,
}: {
  client: Client
  author: string
  projects: Project[]
  onNewProject: () => void
  onOpenProject: (id: string) => void
  onClose: () => void
  onUpdate: (id: string, patch: Partial<Client>) => Promise<boolean>
  onRemove: (id: string) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [draft, setDraft] = useState('')
  const [value, setValue] = useState(c.value?.toString() ?? '')
  // Todo se guarda solo; este aviso confirma cada cambio («Guardando…» → «Guardado ✓»).
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  async function save(patch: Partial<Client>) {
    setSaved('saving')
    setSaved((await onUpdate(c.id, patch)) ? 'saved' : 'error')
  }
  // El valor se guarda al salir del campo, con Enter o al cerrar la ficha, solo si cambió.
  // Se lleva en refs (actualizadas en los eventos) para poder guardarlo también al desmontar.
  const typed = useRef(value)
  const stored = useRef(c.value)
  function saveValue() {
    const next = typed.current ? Number(typed.current) : null
    if (next === stored.current) return
    stored.current = next
    void save({ value: next })
  }
  const saveOnClose = useRef(saveValue)
  useEffect(() => {
    saveOnClose.current = saveValue
  })
  useEffect(() => () => saveOnClose.current(), [])

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  useEffect(() => {
    supabase!
      .from('notes')
      .select('*')
      .eq('client_id', c.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setNotes((data ?? []) as Note[]))
  }, [c.id])

  async function addNote(e: FormEvent) {
    e.preventDefault()
    const body = draft.trim()
    if (!body) return
    const { data } = await supabase!.from('notes').insert({ client_id: c.id, body, author }).select().single()
    if (data) setNotes((n) => [data as Note, ...n])
    setDraft('')
  }

  const answers = c.answers ?? {}
  const answered = (v: unknown) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== '')

  return (
    <dialog ref={dialog} className="detail" aria-labelledby="detail-title" onClose={onClose} onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}>
      <div className="detail__body">
        <header className="detail__head">
          <div>
            <span className={`tag tag--${c.source}`}>{SOURCE_LABEL[c.source]}</span>
            <span className={`detail__saved is-${saved}`} role="status" aria-live="polite">
              {saved === 'saving' ? 'Guardando…' : saved === 'saved' ? 'Guardado ✓' : saved === 'error' ? 'No se guardó' : 'Se guarda automáticamente'}
            </span>
            {typesOf(c).map((t) => (
              <span key={t} className="tag tag--type">
                {t}
              </span>
            ))}
            <h2 id="detail-title">{c.company || c.name}</h2>
            {c.company && <p className="panel-muted">{c.name}</p>}
          </div>
          <button className="detail__close" onClick={() => dialog.current?.close()} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className="detail__grid">
          <label>
            <span>Etapa</span>
            <select value={c.stage} onChange={(e) => save({ stage: e.target.value as Stage })}>
              {STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Valor (US$)</span>
            <input
              inputMode="decimal"
              value={value}
              placeholder="450"
              onChange={(e) => {
                const v = e.target.value.replace(/[^\d.]/g, '')
                typed.current = v
                setValue(v)
              }}
              onBlur={saveValue}
              onKeyDown={(e) => e.key === 'Enter' && saveValue()}
            />
          </label>
        </div>

        <div className="detail__grid detail__grid--contact">
          <ContactField label="Nombre" value={c.name} required onSave={(v) => save({ name: v! })} />
          <ContactField label="Marca o empresa" value={c.company} onSave={(v) => save({ company: v })} />
          <ContactField
            label="WhatsApp"
            hint="Con código de país, por ejemplo +51 906 013 371"
            type="tel"
            value={c.phone}
            onSave={(v) => save({ phone: v })}
            action={c.phone ? { href: waLink(c.phone), label: 'Abrir chat' } : undefined}
          />
          <ContactField
            label="Correo"
            type="email"
            value={c.email}
            onSave={(v) => save({ email: v })}
            action={c.email ? { href: `mailto:${c.email}`, label: 'Escribir' } : undefined}
          />
          <ContactField label="Sector" value={c.sector} onSave={(v) => save({ sector: v })} />
          <label>
            <span>Recibido</span>
            <input value={date(c.created_at)} readOnly tabIndex={-1} className="is-readonly" />
          </label>
        </div>

        <section className="detail__section">
          <h3>Proyectos</h3>
          {projects.length > 0 && (
            <ul className="detail__files">
              {projects.map((p) => (
                <li key={p.id}>
                  <button className="panel-link" onClick={() => onOpenProject(p.id)}>
                    {projectName(p)}
                  </button>
                  <span>{statusLabel(p).text}</span>
                </li>
              ))}
            </ul>
          )}
          {c.stage === 'ganado' && !projects.length && (
            <p className="prod-hint">Cliente ganado: crea su proyecto para seguir sus etapas en Producción.</p>
          )}
          <button className="btn btn-ghost btn-sm prod-start" onClick={onNewProject}>
            + Crear proyecto
          </button>
        </section>

        {c.message && (
          <section className="detail__section">
            <h3>Mensaje</h3>
            <p className="detail__text">{c.message}</p>
          </section>
        )}

        {c.source === 'brief' &&
          steps.map((s) => {
            const fields = s.fields.filter((f) => f.kind !== 'files' && f.kind !== 'consent' && answered(answers[f.id]))
            if (!fields.length) return null
            return (
              <section key={s.id} className="detail__section">
                <h3>{s.title}</h3>
                <dl className="detail__answers">
                  {fields.map((f) => {
                    const v = answers[f.id]
                    const text =
                      f.kind === 'scales' && Array.isArray(v)
                        ? f.scales.map(([l, r], i) => `${l} ${'●'.repeat(Number(v[i]))}${'○'.repeat(5 - Number(v[i]))} ${r}`).join('\n')
                        : Array.isArray(v)
                          ? v.join(' · ')
                          : String(v)
                    return (
                      <div key={f.id}>
                        <dt>{f.label}</dt>
                        <dd>{text}</dd>
                      </div>
                    )
                  })}
                </dl>
              </section>
            )
          })}

        {Array.isArray(answers._extra) && answers._extra.length > 0 && (
          <section className="detail__section">
            <h3>Otras respuestas</h3>
            <dl className="detail__answers">
              {(answers._extra as { section: string; label: string; value: string }[]).map((r, i) => (
                <div key={i}>
                  <dt>
                    {r.section} · {r.label}
                  </dt>
                  <dd>{r.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {c.files.length > 0 && (
          <section className="detail__section">
            <h3>Archivos</h3>
            <ul className="detail__files">
              {c.files.map((f) => (
                <li key={f.url}>
                  <a href={f.url} target="_blank" rel="noopener">
                    {f.name}
                  </a>
                  <span>
                    {f.group} · {(f.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="detail__section">
          <h3>Notas</h3>
          <form className="detail__note-form" onSubmit={addNote}>
            <textarea rows={3} placeholder="Escribe una nota interna…" aria-label="Nueva nota" value={draft} onChange={(e) => setDraft(e.target.value)} />
            <button className="btn btn-primary btn-sm" disabled={!draft.trim()}>
              Añadir nota
            </button>
          </form>
          <ul className="detail__notes">
            {notes.map((n) => (
              <li key={n.id}>
                <p>{n.body}</p>
                <span>
                  {date(n.created_at)}
                  {n.author ? ` · ${n.author}` : ''}
                  <button
                    className="panel-link detail__note-delete"
                    onClick={async () => {
                      if (!confirm('¿Eliminar esta nota?')) return
                      const { error } = await supabase!.from('notes').delete().eq('id', n.id)
                      if (!error) setNotes((list) => list.filter((x) => x.id !== n.id))
                    }}
                  >
                    Eliminar
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <footer className="detail__foot">
          <button
            className="panel-link panel-link--danger"
            onClick={() => {
              if (confirm(`¿Eliminar a ${c.company || c.name} y sus notas? No se puede deshacer.`)) onRemove(c.id)
            }}
          >
            Eliminar cliente
          </button>
        </footer>
      </div>
    </dialog>
  )
}

// Campo de contacto que se guarda al salir de él (o con Enter), solo si cambió.
function ContactField({
  label,
  value,
  onSave,
  type = 'text',
  required = false,
  hint,
  action,
}: {
  label: string
  value: string | null
  onSave: (v: string | null) => void
  type?: 'text' | 'email' | 'tel'
  required?: boolean
  hint?: string
  action?: { href: string; label: string }
}) {
  const [draft, setDraft] = useState(value ?? '')
  const [problem, setProblem] = useState<string | null>(null)
  function commit() {
    const v = draft.trim()
    if (v === (value ?? '')) return setProblem(null)
    if (required && !v) {
      setDraft(value ?? '')
      return setProblem('Este dato es obligatorio.')
    }
    if (type === 'tel' && v && waNumber(v).length < 9) return setProblem('Revisa el número: faltan dígitos.')
    if (type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return setProblem('Revisa el correo.')
    setProblem(null)
    onSave(v || null)
  }
  // Si se cierra la ficha con el campo a medio editar (Esc o clic fuera), también se guarda.
  const commitRef = useRef(commit)
  useEffect(() => {
    commitRef.current = commit
  })
  useEffect(() => () => commitRef.current(), [])
  return (
    <label>
      <span>
        {label}
        {action && (
          <a className="detail__field-action" href={action.href} target="_blank" rel="noopener">
            {action.label}
          </a>
        )}
      </span>
      <input
        type={type}
        value={draft}
        placeholder={hint}
        aria-invalid={problem ? true : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
      />
      {problem && <small className="panel-error detail__field-error">{problem}</small>}
    </label>
  )
}

function ImportBrief({ onClose, onAdded }: { onClose: () => void; onAdded: (c: Client) => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [parsed, setParsed] = useState<ImportedBrief | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  function onPaste(e: ClipboardEvent<HTMLDivElement>) {
    e.preventDefault()
    const result = parseBriefEmail(e.clipboardData.getData('text/html'), e.clipboardData.getData('text/plain'))
    setParsed(result)
    setError(result ? null : 'No encontramos un brief en lo pegado. Copia el correo «Brief: …» completo y vuelve a pegarlo.')
  }

  async function save() {
    if (!parsed) return
    setBusy(true)
    const { data, error } = await supabase!
      .from('clients')
      .insert({
        source: 'brief',
        brief_id: parsed.briefId,
        name: parsed.name,
        email: parsed.email,
        phone: parsed.phone,
        company: parsed.company,
        sector: parsed.sector,
        answers: parsed.answers,
        files: parsed.files,
      })
      .select()
      .single()
    setBusy(false)
    if (error?.code === '23505') return setError('Este brief ya está en el panel.')
    if (error || !data) return setError('No se pudo importar. Inténtalo de nuevo.')
    onAdded(data as Client)
  }

  return (
    <dialog ref={dialog} className="detail detail--small" aria-labelledby="import-title" onClose={onClose}>
      <div className="detail__body">
        <header className="detail__head">
          <h2 id="import-title">Importar brief</h2>
          <button type="button" className="detail__close" onClick={() => dialog.current?.close()} aria-label="Cerrar">
            ×
          </button>
        </header>
        <p className="panel-muted">
          Abre el correo «Brief: …», selecciona todo su contenido (Ctrl + A), cópialo (Ctrl + C) y pégalo aquí (Ctrl + V).
        </p>
        <div
          className="import__paste"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label="Pega aquí el correo del brief"
          onPaste={onPaste}
        >
          {parsed ? '✓ Correo leído' : 'Pega aquí el correo del brief'}
        </div>
        {parsed && (
          <dl className="detail__contact">
            <div>
              <dt>Marca</dt>
              <dd>{parsed.company ?? '—'}</dd>
            </div>
            <div>
              <dt>Cliente</dt>
              <dd>{parsed.name}</dd>
            </div>
            <div>
              <dt>Correo</dt>
              <dd>{parsed.email ?? '—'}</dd>
            </div>
            <div>
              <dt>Contenido</dt>
              <dd>
                {parsed.answered} respuestas · {parsed.files.length} archivos
              </dd>
            </div>
          </dl>
        )}
        {error && <p className="panel-error">{error}</p>}
        <button className="btn btn-primary" disabled={!parsed || busy} onClick={save}>
          {busy ? 'Importando…' : 'Importar al panel'}
        </button>
      </div>
    </dialog>
  )
}

function AddClient({ onClose, onAdded }: { onClose: () => void; onAdded: (c: Client) => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '' })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return setError('El nombre es obligatorio.')
    const row = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() || null]))
    const { data, error } = await supabase!.from('clients').insert({ ...row, source: 'manual' }).select().single()
    if (error || !data) return setError('No se pudo crear el cliente.')
    onAdded(data as Client)
  }

  return (
    <dialog ref={dialog} className="detail detail--small" aria-labelledby="add-title" onClose={onClose}>
      <form className="detail__body" onSubmit={submit}>
        <header className="detail__head">
          <h2 id="add-title">Nuevo cliente</h2>
          <button type="button" className="detail__close" onClick={() => dialog.current?.close()} aria-label="Cerrar">
            ×
          </button>
        </header>
        {(
          [
            ['name', 'Nombre', 'text'],
            ['company', 'Marca o empresa', 'text'],
            ['email', 'Correo', 'email'],
            ['phone', 'WhatsApp', 'tel'],
          ] as const
        ).map(([k, label, type]) => (
          <label key={k} className="panel-field">
            <span>{label}</span>
            <input type={type} value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
          </label>
        ))}
        {error && <p className="panel-error">{error}</p>}
        <button className="btn btn-primary">Crear cliente</button>
      </form>
    </dialog>
  )
}
