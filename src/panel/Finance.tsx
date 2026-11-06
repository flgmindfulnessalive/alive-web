// Finanzas: ventas, compras y gastos, cierre del mes y ajustes (RMT · Perú).
// Control interno: el registro oficial está en el SIRE de SUNAT y la declaración la presenta el contador.
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { supabase, type Client } from './data'
import type { Project } from './production'
import type { Recurring } from './recurring'
import {
  CATEGORIES,
  DEFAULT_SETTINGS,
  DOC_TYPES,
  OPERATIONS,
  PAID_VIA,
  PARTY_DOC,
  active,
  alertsOf,
  amountIn,
  cobrosOf,
  currentPeriod,
  docNumber,
  docsCsv,
  exportName,
  monthSummary,
  pen,
  periodLabel,
  round2,
  shiftPeriod,
  sign,
  splitTotal,
  summaryCsv,
  toPen,
  todayIso,
  unbilled,
  withDefaults,
  yearEstimate,
  zip,
  type Closing,
  type Cobro,
  type Direction,
  type DocFile,
  type DocType,
  type FinDoc,
  type MonthSummary,
  type Operation,
  type PaidVia,
  type PartyDocType,
  type Settings,
} from './finanzas'

type Tab = 'ventas' | 'compras' | 'cierre' | 'ajustes'
const TABS: { id: Tab; label: string }[] = [
  { id: 'ventas', label: 'Ventas' },
  { id: 'compras', label: 'Compras y gastos' },
  { id: 'cierre', label: 'Cierre del mes' },
  { id: 'ajustes', label: 'Ajustes' },
]
const BUCKET = 'comprobantes'
const SUNAT_TC = 'https://e-consulta.sunat.gob.pe/cl-at-ittipcam/tcS01Alias'

const num = (v: unknown) => (v == null || v === '' ? 0 : Number(v))
const normalize = (d: FinDoc): FinDoc => ({
  ...d,
  fx_rate: num(d.fx_rate) || 1,
  base: num(d.base),
  igv: num(d.igv),
  other: num(d.other),
  total: num(d.total),
  retention: num(d.retention),
  detraccion_amount: d.detraccion_amount == null ? null : num(d.detraccion_amount),
  links: d.links ?? [],
  files: d.files ?? [],
})
const shortDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })

function download(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

async function openFile(path: string) {
  const { data } = await supabase!.storage.from(BUCKET).createSignedUrl(path, 120)
  if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener')
}

type Props = { clients: Client[]; projects: Project[]; recurring: Recurring[]; email: string }

export function Finance({ clients, projects, recurring, email }: Props) {
  const [docs, setDocs] = useState<FinDoc[]>([])
  const [closings, setClosings] = useState<Closing[]>([])
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [missing, setMissing] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState(currentPeriod)
  const [tab, setTab] = useState<Tab>(() => {
    try {
      return (localStorage.getItem('alive-fin-tab') as Tab) || 'compras'
    } catch {
      return 'compras'
    }
  })
  const [editing, setEditing] = useState<{ direction: Direction; doc?: FinDoc; preset?: Partial<FinDoc> } | null>(null)

  const load = useCallback(async () => {
    const [d, c, s] = await Promise.all([
      supabase!.from('fin_docs').select('*').order('issued_on', { ascending: true }),
      supabase!.from('fin_closings').select('*'),
      supabase!.from('fin_settings').select('data').eq('id', 1).maybeSingle(),
    ])
    setMissing(Boolean(d.error || c.error || s.error))
    setDocs(((d.data ?? []) as FinDoc[]).map(normalize))
    setClosings((c.data ?? []) as Closing[])
    setSettings(withDefaults((s.data?.data ?? null) as Partial<Settings> | null))
    setLoaded(true)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const choose = (t: Tab) => {
    setTab(t)
    try {
      localStorage.setItem('alive-fin-tab', t)
    } catch {
      /* sin almacenamiento: no pasa nada */
    }
  }

  const closing = closings.find((c) => c.period === period) ?? null
  const inPeriod = docs.filter((d) => d.period === period)
  const cobros = useMemo(() => cobrosOf(projects, recurring, clients), [projects, recurring, clients])
  const pending = unbilled(cobros, docs, period)

  // Proveedores y clientes ya usados: para autocompletar RUC, nombre y categoría.
  const parties = useMemo(() => {
    const map = new Map<string, FinDoc>()
    for (const d of docs) map.set(`${d.direction}:${d.party_name.toLowerCase()}`, d)
    return [...map.values()]
  }, [docs])

  function saved(doc: FinDoc) {
    setDocs((list) => {
      const rest = list.filter((x) => x.id !== doc.id)
      return [...rest, normalize(doc)].sort((a, b) => a.issued_on.localeCompare(b.issued_on))
    })
  }

  return (
    <div className="fin">
      <div className="panel-toolbar">
        <div>
          <h1 className="panel-h1">Finanzas</h1>
          <p className="panel-muted">Control interno del Régimen MYPE Tributario. El registro oficial está en el SIRE y la declaración la presenta tu contador.</p>
        </div>
        <div className="fin-period" aria-label="Periodo">
          <button className="btn btn-ghost btn-sm" onClick={() => setPeriod((p) => shiftPeriod(p, -1))} aria-label="Mes anterior">
            ‹
          </button>
          <b className="fin-period__label" aria-live="polite">
            {periodLabel(period)}
          </b>
          <button className="btn btn-ghost btn-sm" onClick={() => setPeriod((p) => shiftPeriod(p, 1))} aria-label="Mes siguiente">
            ›
          </button>
          {period !== currentPeriod() && (
            <button className="panel-link" onClick={() => setPeriod(currentPeriod())}>
              Este mes
            </button>
          )}
          {closing && <span className="prod-pill is-ok">Declarado</span>}
        </div>
      </div>

      {missing && (
        <div className="panel-alert" role="alert">
          <strong>Falta crear las tablas de Finanzas.</strong> En Supabase → SQL Editor, pega el contenido de supabase/finanzas.sql y pulsa Run. Después recarga esta página.
        </div>
      )}
      {error && (
        <p className="panel-error" role="alert">
          {error}{' '}
          <button className="panel-link" onClick={() => setError(null)}>
            Cerrar
          </button>
        </p>
      )}

      <div className="panel-tabs fin-tabs" role="tablist" aria-label="Finanzas">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => choose(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {!loaded ? (
        <p className="panel-muted">Cargando…</p>
      ) : tab === 'ventas' ? (
        <DocsTab
          direction="venta"
          period={period}
          docs={inPeriod}
          settings={settings}
          locked={Boolean(closing)}
          pending={pending}
          onNew={(preset) => setEditing({ direction: 'venta', preset })}
          onOpen={(doc) => setEditing({ direction: 'venta', doc })}
        />
      ) : tab === 'compras' ? (
        <DocsTab
          direction="compra"
          period={period}
          docs={inPeriod}
          settings={settings}
          locked={Boolean(closing)}
          pending={[]}
          onNew={(preset) => setEditing({ direction: 'compra', preset })}
          onOpen={(doc) => setEditing({ direction: 'compra', doc })}
        />
      ) : tab === 'cierre' ? (
        <ClosingTab
          period={period}
          docs={docs}
          closings={closings}
          settings={settings}
          pending={pending}
          email={email}
          onOpen={(doc) => setEditing({ direction: doc.direction, doc })}
          onGoVentas={() => choose('ventas')}
          onChanged={load}
          onError={setError}
        />
      ) : (
        <SettingsTab settings={settings} onSaved={setSettings} onError={setError} />
      )}

      {editing && (
        <DocDialog
          key={editing.doc?.id ?? 'nuevo'}
          direction={editing.direction}
          doc={editing.doc}
          preset={editing.preset}
          period={period}
          settings={settings}
          lockedPeriods={new Set(closings.map((c) => c.period))}
          parties={parties.filter((p) => p.direction === editing.direction)}
          clients={clients}
          onClose={() => setEditing(null)}
          onSaved={saved}
          onDeleted={(id) => setDocs((list) => list.filter((d) => d.id !== id))}
        />
      )}
    </div>
  )
}

// ——— Ventas / Compras ———
function DocsTab({
  direction,
  period,
  docs,
  settings,
  locked,
  pending,
  onNew,
  onOpen,
}: {
  direction: Direction
  period: string
  docs: FinDoc[]
  settings: Settings
  locked: boolean
  pending: Cobro[]
  onNew: (preset?: Partial<FinDoc>) => void
  onOpen: (doc: FinDoc) => void
}) {
  const list = docs.filter((d) => d.direction === direction)
  const live = active(list)
  const totalPen = round2(live.reduce((a, d) => a + sign(d) * toPen(d, d.total), 0))
  const igvPen = round2(live.reduce((a, d) => a + sign(d) * toPen(d, d.igv), 0))
  const sale = direction === 'venta'

  return (
    <section className="fin-section">
      <div className="fin-head">
        <p className="panel-muted">
          {list.length ? `${live.length} ${live.length === 1 ? 'comprobante' : 'comprobantes'}` : 'Sin comprobantes'} en {periodLabel(period)}
          {live.length > 0 && ` · total ${pen(totalPen)} · IGV ${pen(igvPen)}`}
        </p>
        {!locked && (
          <button className="btn btn-primary btn-sm" onClick={() => onNew()}>
            {sale ? '+ Registrar venta' : '+ Registrar gasto'}
          </button>
        )}
      </div>
      {locked && <p className="panel-note">Este mes está declarado. Para corregirlo, reábrelo en Cierre del mes.</p>}

      {sale && pending.length > 0 && (
        <div className="fin-pending">
          <p>
            <b>Cobros de {periodLabel(period)} sin comprobante</b>
            <span className="panel-muted"> · marcados como pagados en el panel</span>
          </p>
          <ul>
            {pending.map((c) => (
              <li key={c.key}>
                <span>
                  {c.label}
                  <span className="panel-muted"> · {shortDate(c.date)}</span>
                </span>
                <b>{amountIn('USD', c.amount)}</b>
                {!locked && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() =>
                      onNew({
                        issued_on: c.date,
                        currency: 'USD',
                        base: c.amount,
                        links: [c.key],
                        client_id: c.clientId,
                        project_id: c.projectId,
                      })
                    }
                  >
                    Registrar comprobante
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {list.length === 0 ? (
        <div className="fin-empty">
          <p>{sale ? 'Registra aquí cada factura o boleta que emitas.' : 'Registra aquí cada factura, boleta o recibo de lo que pagas para el negocio.'}</p>
          <p className="panel-muted">
            {sale
              ? 'Los cobros que marques en Clientes y Producción aparecen arriba para que no quede ninguno sin comprobante.'
              : 'Adjunta el PDF o la foto: así el paquete para el contador sale completo.'}
          </p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table fin-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Comprobante</th>
                <th>{sale ? 'Cliente' : 'Proveedor'}</th>
                <th>{sale ? 'Operación' : 'Categoría'}</th>
                <th className="fin-num">Total</th>
                <th className="fin-num">En soles</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {list.map((d) => {
                const alerts = alertsOf(d, settings)
                const warn = alerts.filter((a) => a.tone === 'warn').length
                return (
                  <tr key={d.id} className={d.annulled ? 'is-annulled' : undefined}>
                    <td>{shortDate(d.issued_on)}</td>
                    <td>
                      <button className="table__open" onClick={() => onOpen(d)}>
                        {DOC_TYPES[d.doc_type].short} {docNumber(d)}
                      </button>
                    </td>
                    <td>{d.party_name}</td>
                    <td>{sale ? OPERATIONS[d.operation] : d.category || '—'}</td>
                    <td className="fin-num">{amountIn(d.currency, sign(d) * d.total)}</td>
                    <td className="fin-num">{pen(sign(d) * toPen(d, d.total))}</td>
                    <td>
                      {d.annulled ? (
                        <span className="prod-pill">Anulado</span>
                      ) : warn ? (
                        <span className="prod-pill is-warn">{warn === 1 ? '1 pendiente' : `${warn} pendientes`}</span>
                      ) : (
                        <span className="prod-pill is-ok">Completo</span>
                      )}
                      {!sale && !locked && (
                        <button
                          className="panel-link fin-repeat"
                          title="Crear el mismo gasto en este mes"
                          onClick={() => {
                            const { id: _id, created_at: _c, updated_at: _u, files: _f, series: _s, number: _n, ...rest } = d
                            onNew({ ...rest, issued_on: todayIso(), period, paid_on: null, annulled: false })
                          }}
                        >
                          Repetir
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

// ——— Formulario de comprobante ———
function DocDialog({
  direction,
  doc,
  preset,
  period,
  settings,
  lockedPeriods,
  parties,
  clients,
  onClose,
  onSaved,
  onDeleted,
}: {
  direction: Direction
  doc?: FinDoc
  preset?: Partial<FinDoc>
  period: string
  settings: Settings
  lockedPeriods: Set<string>
  parties: FinDoc[]
  clients: Client[]
  onClose: () => void
  onSaved: (d: FinDoc) => void
  onDeleted: (id: string) => void
}) {
  const sale = direction === 'venta'
  const dialog = useRef<HTMLDialogElement>(null)
  const start: Partial<FinDoc> = doc ?? preset ?? {}
  const presetClient = clients.find((c) => c.id === start.client_id)
  const [docType, setDocType] = useState<DocType>(start.doc_type ?? '01')
  const [series, setSeries] = useState(start.series ?? '')
  const [number, setNumber] = useState(start.number ?? '')
  const [issuedOn, setIssuedOn] = useState(start.issued_on ?? (period === currentPeriod() ? todayIso() : `${period}-01`))
  const [docPeriod, setDocPeriod] = useState(start.period ?? (start.issued_on ? start.issued_on.slice(0, 7) : period))
  const [periodTouched, setPeriodTouched] = useState(Boolean(doc))
  const [partyType, setPartyType] = useState<PartyDocType>(start.party_doc_type ?? '6')
  const [partyDoc, setPartyDoc] = useState(start.party_doc ?? '')
  const [partyName, setPartyName] = useState(start.party_name ?? (presetClient ? presetClient.company || presetClient.name : ''))
  const [clientId, setClientId] = useState(start.client_id ?? '')
  const [currency, setCurrency] = useState<'PEN' | 'USD'>(start.currency ?? (sale ? 'USD' : 'PEN'))
  const [fx, setFx] = useState(start.fx_rate && start.fx_rate !== 1 ? String(start.fx_rate) : '')
  const [operation, setOperation] = useState<Operation>(start.operation ?? 'gravada')
  // Montos: se escribe el total y se calculan base e IGV; se pueden corregir a mano.
  const initialTotal = start.total ?? (start.base != null && !doc ? round2(start.base * (operation === 'gravada' ? 1 + settings.igvRate : 1)) : undefined)
  const [total, setTotal] = useState(initialTotal != null ? String(initialTotal) : '')
  const [totalTouched, setTotalTouched] = useState(Boolean(doc))
  const [base, setBase] = useState(doc ? String(doc.base) : '')
  const [igv, setIgv] = useState(doc ? String(doc.igv) : '')
  const [manual, setManual] = useState(Boolean(doc))
  const [category, setCategory] = useState(start.category ?? '')
  const [credit, setCredit] = useState(start.credit_igv ?? !sale)
  const [paidVia, setPaidVia] = useState<PaidVia | ''>(start.paid_via ?? '')
  const [paidOn, setPaidOn] = useState(start.paid_on ?? '')
  const [retention, setRetention] = useState(start.retention ? String(start.retention) : '')
  const [detraccion, setDetraccion] = useState(start.detraccion ?? false)
  const [detAmount, setDetAmount] = useState(start.detraccion_amount != null ? String(start.detraccion_amount) : '')
  const [detRef, setDetRef] = useState(start.detraccion_ref ?? '')
  const [notes, setNotes] = useState(start.notes ?? '')
  const [annulled, setAnnulled] = useState(start.annulled ?? false)
  const [files, setFiles] = useState<DocFile[]>(doc?.files ?? [])
  const [removed, setRemoved] = useState<DocFile[]>([])
  const [adding, setAdding] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const locked = Boolean(doc && lockedPeriods.has(doc.period))

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  // Si no se tocaron a mano, base e IGV salen del total.
  const totalN = Number(total) || 0
  const split = splitTotal(totalN, operation, settings.igvRate)
  const baseN = manual ? Number(base) || 0 : split.base
  const igvN = manual ? Number(igv) || 0 : split.igv
  const otherN = round2(totalN - baseN - igvN)
  const fxN = currency === 'USD' ? Number(fx) || 1 : 1

  // El crédito fiscal se propone según el comprobante (no se fuerza).
  const suggestCredit = (t: DocType, op: Operation, party: PartyDocType) => !sale && DOC_TYPES[t].credit && op === 'gravada' && party === '6'

  const draft: FinDoc = {
    id: doc?.id ?? 'nuevo',
    created_at: doc?.created_at ?? '',
    updated_at: doc?.updated_at ?? '',
    direction,
    period: docPeriod,
    issued_on: issuedOn,
    doc_type: docType,
    series: series.trim().toUpperCase() || null,
    number: number.trim() || null,
    party_doc_type: partyType,
    party_doc: partyDoc.trim() || null,
    party_name: partyName.trim(),
    currency,
    fx_rate: fxN,
    operation,
    base: baseN,
    igv: igvN,
    other: otherN,
    total: totalN,
    category: sale ? null : category || null,
    credit_igv: sale ? false : credit,
    paid_via: paidVia || null,
    paid_on: paidOn || null,
    retention: Number(retention) || 0,
    detraccion: sale ? detraccion : false,
    detraccion_amount: sale && detraccion ? Number(detAmount) || 0 : null,
    detraccion_ref: sale && detraccion ? detRef.trim() || null : null,
    links: doc?.links ?? preset?.links ?? [],
    client_id: clientId || null,
    project_id: doc?.project_id ?? preset?.project_id ?? null,
    annulled,
    notes: notes.trim() || null,
    files: [...files, ...adding.map((f) => ({ path: '', name: f.name, size: f.size }))],
  }
  const alerts = alertsOf(draft, settings)
  const totalPen = toPen(draft, totalN)

  function pickParty(name: string) {
    setPartyName(name)
    const p = parties.find((x) => x.party_name.toLowerCase() === name.trim().toLowerCase())
    if (!p) return
    setPartyType(p.party_doc_type)
    setPartyDoc(p.party_doc ?? '')
    if (!sale && p.category) setCategory(p.category)
    if (!doc && p.currency !== currency) setCurrency(p.currency)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (locked) return
    if (!partyName.trim()) return setError(sale ? 'Escribe el nombre del cliente.' : 'Escribe el nombre del proveedor.')
    if (!totalN) return setError('Escribe el total del comprobante.')
    if (currency === 'USD' && !(Number(fx) > 0)) return setError('Escribe el tipo de cambio del día de emisión.')
    if (lockedPeriods.has(docPeriod)) return setError(`${periodLabel(docPeriod)} ya está declarado: elige otro periodo o reábrelo.`)
    setBusy(true)
    setError(null)
    const id = doc?.id ?? crypto.randomUUID()
    const uploaded: DocFile[] = []
    for (const f of adding) {
      const safe = f.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '-').slice(-80)
      const path = `${id}/${Date.now()}-${safe}`
      const { error: upErr } = await supabase!.storage.from(BUCKET).upload(path, f, { contentType: f.type || undefined })
      if (upErr) {
        if (uploaded.length) await supabase!.storage.from(BUCKET).remove(uploaded.map((u) => u.path))
        setBusy(false)
        return setError(`No se pudo subir «${f.name}». Revisa que sea PDF, XML o imagen de hasta 10 MB.`)
      }
      uploaded.push({ path, name: f.name, size: f.size })
    }
    const { id: _i, created_at: _c, updated_at: _u, ...row } = draft
    const payload = { ...row, files: [...files, ...uploaded] }
    const res = doc
      ? await supabase!.from('fin_docs').update(payload).eq('id', id).select().single()
      : await supabase!.from('fin_docs').insert({ ...payload, id }).select().single()
    if (res.error || !res.data) {
      if (uploaded.length) await supabase!.storage.from(BUCKET).remove(uploaded.map((u) => u.path))
      setBusy(false)
      return setError(res.error?.message.includes('cerrado') ? res.error.message : 'No se pudo guardar el comprobante.')
    }
    if (removed.length) await supabase!.storage.from(BUCKET).remove(removed.map((r) => r.path))
    onSaved(res.data as FinDoc)
    dialog.current?.close()
  }

  async function remove() {
    if (!doc) return
    setBusy(true)
    const { error: delErr } = await supabase!.from('fin_docs').delete().eq('id', doc.id)
    if (delErr) {
      setBusy(false)
      return setError(delErr.message.includes('cerrado') ? delErr.message : 'No se pudo eliminar.')
    }
    if (doc.files.length) await supabase!.storage.from(BUCKET).remove(doc.files.map((f) => f.path))
    onDeleted(doc.id)
    dialog.current?.close()
  }

  const types = (Object.keys(DOC_TYPES) as DocType[]).filter((t) => (sale ? DOC_TYPES[t].sale : true))

  return (
    <dialog ref={dialog} className="detail fin-dialog" aria-labelledby="fin-doc-title" onClose={onClose}>
      <form className="detail__body" onSubmit={submit}>
        <header className="detail__head">
          <div>
            <p className="eyebrow">{sale ? 'Venta' : 'Compra o gasto'}</p>
            <h2 id="fin-doc-title">{doc ? `${DOC_TYPES[doc.doc_type].short} ${docNumber(doc)}` : sale ? 'Registrar venta' : 'Registrar gasto'}</h2>
          </div>
          <button type="button" className="detail__close" onClick={() => dialog.current?.close()} aria-label="Cerrar">
            ×
          </button>
        </header>
        {locked && <p className="panel-note">Este comprobante es de un mes declarado: solo se puede ver.</p>}

        <fieldset className="fin-fields" disabled={locked || busy}>
          <div className="fin-grid fin-grid--3">
            <label className="panel-field fin-span-3">
              <span>Comprobante</span>
              <select
                className="prod-select"
                value={docType}
                onChange={(e) => {
                  const t = e.target.value as DocType
                  setDocType(t)
                  setCredit(suggestCredit(t, operation, partyType))
                  if (t === '91') setPartyType('0')
                }}
              >
                {types.map((t) => (
                  <option key={t} value={t}>
                    {DOC_TYPES[t].label}
                  </option>
                ))}
              </select>
            </label>
            <label className="panel-field">
              <span>Serie</span>
              <input value={series} placeholder="F001" onChange={(e) => setSeries(e.target.value)} />
            </label>
            <label className="panel-field">
              <span>Número</span>
              <input value={number} inputMode="numeric" placeholder="123" onChange={(e) => setNumber(e.target.value)} />
            </label>
            <label className="panel-field">
              <span>Emisión</span>
              <input
                type="date"
                value={issuedOn}
                required
                onChange={(e) => {
                  setIssuedOn(e.target.value)
                  if (!periodTouched && e.target.value) setDocPeriod(e.target.value.slice(0, 7))
                }}
              />
            </label>
          </div>

          {sale && (
            <label className="panel-field">
              <span>Cliente del panel (opcional)</span>
              <select
                className="prod-select"
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value)
                  const c = clients.find((x) => x.id === e.target.value)
                  if (c && !partyName) setPartyName(c.company || c.name)
                }}
              >
                <option value="">Sin vincular</option>
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

          <div className="fin-grid fin-grid--3">
            <label className="panel-field fin-span-3">
              <span>{sale ? 'Razón social o nombre del cliente' : 'Razón social del proveedor'}</span>
              <input value={partyName} list={`fin-parties-${direction}`} required onChange={(e) => pickParty(e.target.value)} />
              <datalist id={`fin-parties-${direction}`}>
                {parties.map((p) => (
                  <option key={p.id} value={p.party_name} />
                ))}
              </datalist>
            </label>
            <label className="panel-field">
              <span>Documento</span>
              <select
                className="prod-select"
                value={partyType}
                onChange={(e) => {
                  const t = e.target.value as PartyDocType
                  setPartyType(t)
                  setCredit(suggestCredit(docType, operation, t))
                }}
              >
                {(Object.keys(PARTY_DOC) as PartyDocType[]).map((t) => (
                  <option key={t} value={t}>
                    {PARTY_DOC[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="panel-field fin-span-2">
              <span>Número de documento</span>
              <input value={partyDoc} inputMode={partyType === '6' || partyType === '1' ? 'numeric' : 'text'} onChange={(e) => setPartyDoc(e.target.value)} />
            </label>
          </div>

          <div className="fin-grid fin-grid--3">
            <label className="panel-field fin-span-3">
              <span>Operación</span>
              <select
                className="prod-select"
                value={operation}
                onChange={(e) => {
                  const op = e.target.value as Operation
                  setOperation(op)
                  setManual(false)
                  // Desde un cobro (monto sin IGV): el total se ajusta a la operación elegida.
                  if (!totalTouched && preset?.base != null) setTotal(String(round2(preset.base * (op === 'gravada' ? 1 + settings.igvRate : 1))))
                  setCredit(suggestCredit(docType, op, partyType))
                }}
              >
                {(Object.keys(OPERATIONS) as Operation[])
                  .filter((o) => sale || o !== 'exportacion')
                  .map((o) => (
                    <option key={o} value={o}>
                      {OPERATIONS[o]}
                    </option>
                  ))}
              </select>
            </label>
            <label className="panel-field">
              <span>Moneda</span>
              <select className="prod-select" value={currency} onChange={(e) => setCurrency(e.target.value as 'PEN' | 'USD')}>
                <option value="PEN">Soles (S/)</option>
                <option value="USD">Dólares (US$)</option>
              </select>
            </label>
            {currency === 'USD' && (
              <label className="panel-field fin-span-2">
                <span>
                  Tipo de cambio ·{' '}
                  <a href={SUNAT_TC} target="_blank" rel="noopener">
                    ver el de SUNAT
                  </a>
                </span>
                <input value={fx} inputMode="decimal" placeholder="3.750" onChange={(e) => setFx(e.target.value.replace(/[^\d.]/g, ''))} />
              </label>
            )}
          </div>

          <div className="fin-grid fin-grid--3">
            <label className="panel-field">
              <span>Total ({currency === 'USD' ? 'US$' : 'S/'})</span>
              <input
                value={total}
                inputMode="decimal"
                required
                onChange={(e) => {
                  setTotalTouched(true)
                  setTotal(e.target.value.replace(/[^\d.]/g, ''))
                }}
              />
            </label>
            <label className="panel-field">
              <span>Base imponible</span>
              <input
                value={manual ? base : String(split.base)}
                inputMode="decimal"
                onChange={(e) => {
                  if (!manual) setIgv(String(split.igv))
                  setManual(true)
                  setBase(e.target.value.replace(/[^\d.]/g, ''))
                }}
              />
            </label>
            <label className="panel-field">
              <span>IGV</span>
              <input
                value={manual ? igv : String(split.igv)}
                inputMode="decimal"
                onChange={(e) => {
                  if (!manual) setBase(String(split.base))
                  setManual(true)
                  setIgv(e.target.value.replace(/[^\d.]/g, ''))
                }}
              />
            </label>
          </div>
          <p className="fin-hint fin-calc">
            {otherN !== 0 && `Otros conceptos sin IGV: ${amountIn(currency, otherN)} · `}
            {currency === 'USD' && totalN > 0 && `En soles: ${pen(totalPen)} · `}
            {manual ? (
              <button type="button" className="panel-link" onClick={() => setManual(false)}>
                Recalcular desde el total
              </button>
            ) : (
              `Base e IGV calculados con el ${Math.round(settings.igvRate * 100)} %.`
            )}
          </p>

          {!sale && (
            <div className="fin-grid fin-grid--2">
              <label className="panel-field">
                <span>Categoría</span>
                <select className="prod-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">Elige…</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="prod-pays fin-check">
                <input type="checkbox" checked={credit} onChange={(e) => setCredit(e.target.checked)} />
                Usar el IGV como crédito fiscal
              </label>
            </div>
          )}

          <div className="fin-grid fin-grid--2">
            <label className="panel-field">
              <span>{sale ? 'Cobrado por' : 'Pagado con'}</span>
              <select className="prod-select" value={paidVia} onChange={(e) => setPaidVia(e.target.value as PaidVia | '')}>
                <option value="">Aún no</option>
                {(Object.keys(PAID_VIA) as PaidVia[]).map((p) => (
                  <option key={p} value={p}>
                    {PAID_VIA[p]}
                  </option>
                ))}
              </select>
            </label>
            <label className="panel-field">
              <span>Fecha de {sale ? 'cobro' : 'pago'}</span>
              <input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
            </label>
          </div>

          {!sale && docType === '02' && (
            <label className="panel-field">
              <span>
                Retención de renta ({Math.round(settings.rxhTasa * 100)} %) ·{' '}
                <button type="button" className="panel-link" onClick={() => setRetention(String(round2(totalN * settings.rxhTasa)))}>
                  Calcular
                </button>
              </span>
              <input value={retention} inputMode="decimal" placeholder="0.00" onChange={(e) => setRetention(e.target.value.replace(/[^\d.]/g, ''))} />
            </label>
          )}

          {sale && (
            <div className="fin-grid fin-grid--2">
              <label className="prod-pays fin-check fin-span-2">
                <input
                  type="checkbox"
                  checked={detraccion}
                  onChange={(e) => {
                    setDetraccion(e.target.checked)
                    if (e.target.checked && !detAmount) setDetAmount(String(Math.round(totalPen * settings.detraccionTasa)))
                  }}
                />
                Tiene detracción
              </label>
              {detraccion && (
                <>
                  <label className="panel-field">
                    <span>Monto detraído (S/)</span>
                    <input value={detAmount} inputMode="decimal" onChange={(e) => setDetAmount(e.target.value.replace(/[^\d.]/g, ''))} />
                  </label>
                  <label className="panel-field">
                    <span>Número de constancia</span>
                    <input value={detRef} onChange={(e) => setDetRef(e.target.value)} />
                  </label>
                </>
              )}
            </div>
          )}

          <label className="panel-field">
            <span>Periodo en que se anota</span>
            <input
              type="month"
              value={docPeriod}
              required
              onChange={(e) => {
                setPeriodTouched(true)
                setDocPeriod(e.target.value)
              }}
            />
          </label>
          {!sale && docPeriod !== issuedOn.slice(0, 7) && (
            <p className="fin-hint">Se anota en {periodLabel(docPeriod)} aunque se emitió en {periodLabel(issuedOn.slice(0, 7))}. El crédito fiscal se puede usar hasta 12 meses después.</p>
          )}

          <div className="panel-field">
            <span>Comprobante (PDF, XML o foto)</span>
            {files.length > 0 && (
              <ul className="fin-files">
                {files.map((f) => (
                  <li key={f.path}>
                    <button type="button" className="panel-link" onClick={() => openFile(f.path)}>
                      {f.name}
                    </button>
                    {!locked && (
                      <button
                        type="button"
                        className="panel-link panel-link--danger"
                        onClick={() => {
                          setFiles((l) => l.filter((x) => x.path !== f.path))
                          setRemoved((l) => [...l, f])
                        }}
                      >
                        Quitar
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {adding.length > 0 && <p className="fin-hint">Se subirán al guardar: {adding.map((f) => f.name).join(', ')}</p>}
            <input
              type="file"
              multiple
              accept="application/pdf,.pdf,.xml,text/xml,application/xml,image/*"
              onChange={(e) => setAdding([...adding, ...Array.from(e.target.files ?? [])])}
            />
          </div>

          <label className="panel-field">
            <span>Notas</span>
            <textarea className="prod-textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>

          {doc && (
            <label className="prod-pays fin-check">
              <input type="checkbox" checked={annulled} onChange={(e) => setAnnulled(e.target.checked)} />
              Comprobante anulado (no suma en el mes)
            </label>
          )}
        </fieldset>

        {alerts.length > 0 && !locked && (
          <ul className="fin-alerts">
            {alerts.map((a) => (
              <li key={a.text} className={`is-${a.tone}`}>
                {a.text}
              </li>
            ))}
          </ul>
        )}
        {error && <p className="panel-error">{error}</p>}

        {!locked && (
          <div className="prod-actions">
            <button className="btn btn-primary btn-sm" disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => dialog.current?.close()}>
              Cancelar
            </button>
            {doc &&
              (confirmDelete ? (
                <span className="rec-row__end">
                  ¿Eliminar este comprobante y sus archivos?
                  <button type="button" className="panel-link panel-link--danger" onClick={remove}>
                    Sí, eliminar
                  </button>
                  <button type="button" className="panel-link" onClick={() => setConfirmDelete(false)}>
                    No
                  </button>
                </span>
              ) : (
                <button type="button" className="panel-link panel-link--danger" onClick={() => setConfirmDelete(true)}>
                  Eliminar
                </button>
              ))}
          </div>
        )}
      </form>
    </dialog>
  )
}

// ——— Cierre del mes ———
function ClosingTab({
  period,
  docs,
  closings,
  settings,
  pending,
  email,
  onOpen,
  onGoVentas,
  onChanged,
  onError,
}: {
  period: string
  docs: FinDoc[]
  closings: Closing[]
  settings: Settings
  pending: Cobro[]
  email: string
  onOpen: (d: FinDoc) => void
  onGoVentas: () => void
  onChanged: () => Promise<void>
  onError: (msg: string) => void
}) {
  const closing = closings.find((c) => c.period === period) ?? null
  const prev = closings.find((c) => c.period === shiftPeriod(period, -1)) ?? null
  const [manualSaldo, setManualSaldo] = useState('')
  const [ref, setRef] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<'cerrar' | 'reabrir' | null>(null)
  const [zipping, setZipping] = useState(false)

  const saldoAnterior = prev ? prev.summary.saldoFavor : Number(manualSaldo) || 0
  const live = monthSummary(docs, period, settings, saldoAnterior)
  const m: MonthSummary = closing ? closing.summary : live
  const inPeriod = docs.filter((d) => d.period === period)
  const issues = inPeriod.flatMap((d) => alertsOf(d, settings).map((a) => ({ ...a, d })))
  const warns = issues.filter((i) => i.tone === 'warn')
  const year = period.slice(0, 4)
  const est = yearEstimate(docs, year, settings)
  const tramoPct = Math.min(100, Math.round((m.acumuladoAnual / est.tramoPagoCuenta) * 100))

  async function close() {
    setBusy(true)
    const { error } = await supabase!
      .from('fin_closings')
      .insert({ period, closed_by: email, summary: live, declared_ref: ref.trim() || null })
    setBusy(false)
    setConfirm(null)
    if (error) return onError('No se pudo cerrar el mes.')
    await onChanged()
  }

  async function reopen() {
    setBusy(true)
    const { error } = await supabase!.from('fin_closings').delete().eq('period', period)
    setBusy(false)
    setConfirm(null)
    if (error) return onError('No se pudo reabrir el mes.')
    await onChanged()
  }

  async function exportZip() {
    setZipping(true)
    const enc = new TextEncoder()
    const entries: { name: string; data: Uint8Array }[] = [
      { name: `ventas-${period}.csv`, data: enc.encode(docsCsv(inPeriod, 'venta')) },
      { name: `compras-${period}.csv`, data: enc.encode(docsCsv(inPeriod, 'compra')) },
      { name: `resumen-${period}.csv`, data: enc.encode(summaryCsv(period, m)) },
    ]
    const failed: string[] = []
    for (const d of inPeriod) {
      for (const [i, f] of d.files.entries()) {
        const { data } = await supabase!.storage.from(BUCKET).download(f.path)
        if (data) entries.push({ name: exportName(d, f, i), data: new Uint8Array(await data.arrayBuffer()) })
        else failed.push(f.name)
      }
    }
    download(`ALIVE-${period}-contador.zip`, zip(entries) as BlobPart, 'application/zip')
    setZipping(false)
    if (failed.length) onError(`No se pudieron incluir: ${failed.join(', ')}.`)
  }

  const line = (label: string, value: number, strong = false, hint?: string) => (
    <tr className={strong ? 'is-strong' : undefined}>
      <th scope="row">
        {label}
        {hint && <span className="panel-muted"> · {hint}</span>}
      </th>
      <td className="fin-num">{value < 0 ? `− ${pen(-value)}` : pen(Math.abs(value))}</td>
    </tr>
  )

  return (
    <section className="fin-section">
      <div className="dash-kpis fin-kpis">
        <article className="dash-kpi dash-kpi--hero">
          <span className="dash-kpi__label">Total estimado a pagar · {periodLabel(period)}</span>
          <b className="dash-kpi__value">{pen(m.totalPagar)}</b>
          <span className="dash-kpi__sub">IGV + pago a cuenta{m.retenciones ? ' + retenciones' : ''}, en soles enteros</span>
        </article>
        <article className="dash-kpi">
          <span className="dash-kpi__label">IGV a pagar</span>
          <b className="dash-kpi__value">{pen(m.igvPagar)}</b>
          <span className="dash-kpi__sub">{m.saldoFavor ? `Saldo a favor: ${pen(m.saldoFavor)}` : 'Sin saldo a favor'}</span>
        </article>
        <article className="dash-kpi">
          <span className="dash-kpi__label">Pago a cuenta de renta</span>
          <b className="dash-kpi__value">{pen(m.pagoCuenta)}</b>
          <span className="dash-kpi__sub">{(m.tasaPagoCuenta * 100).toLocaleString('es-PE')} % de {pen(m.ingresosNetos)}</span>
        </article>
        <article className="dash-kpi">
          <span className="dash-kpi__label">Pendientes</span>
          <b className="dash-kpi__value">{warns.length + pending.length}</b>
          <span className="dash-kpi__sub">{warns.length + pending.length ? 'Revisa la lista de abajo' : 'Todo en orden'}</span>
        </article>
      </div>

      <div className="fin-cols">
        <div className="dash-card">
          <div className="dash-card__head">
            <h2>Cálculo del mes</h2>
            {closing && <span className="prod-pill is-ok">Guardado al cerrar</span>}
          </div>
          <table className="table fin-summary">
            <tbody>
              {line('Ventas gravadas (base)', m.ventasGravadas)}
              {line('Exportación de servicios', m.ventasExportacion, false, 'sin IGV')}
              {m.ventasOtras !== 0 && line('Otras ventas sin IGV', m.ventasOtras)}
              {line('Ingresos netos del mes', m.ingresosNetos, true)}
              {line('IGV de ventas', m.igvVentas)}
              {line('Crédito fiscal (IGV de compras)', -m.creditoFiscal)}
              {m.saldoAnterior > 0 && line('Saldo a favor del mes anterior', -m.saldoAnterior)}
              {line('IGV a pagar', m.igvPagar, true)}
              {line('Pago a cuenta de renta', m.pagoCuenta, true, `${(m.tasaPagoCuenta * 100).toLocaleString('es-PE')} %`)}
              {m.retenciones > 0 && line('Retenciones de recibos por honorarios', m.retenciones, true, 'se declaran en el PLAME')}
              {m.detracciones > 0 && line('Detracciones de tus ventas', m.detracciones, false, 'se pueden usar para pagar el IGV')}
              {line('Gastos del mes', m.comprasBase, false, 'sin el IGV usado como crédito')}
            </tbody>
          </table>
          {!closing && !prev && (
            <label className="panel-field fin-saldo">
              <span>Saldo a favor de IGV del mes anterior (S/), si tu contador te lo indicó</span>
              <input value={manualSaldo} inputMode="decimal" placeholder="0.00" onChange={(e) => setManualSaldo(e.target.value.replace(/[^\d.]/g, ''))} />
            </label>
          )}
          <p className="fin-hint">
            Es una estimación para prepararte: el monto final lo confirma tu contador al declarar. Revisa el{' '}
            <a href="https://www.sunat.gob.pe/cronogramaobligaciones/" target="_blank" rel="noopener">
              cronograma de SUNAT
            </a>{' '}
            según el último dígito de tu RUC.
          </p>
        </div>

        <div className="dash-card">
          <div className="dash-card__head">
            <h2>Antes de declarar</h2>
          </div>
          {pending.length === 0 && issues.length === 0 ? (
            <p className="panel-muted">Todo en orden: cada comprobante tiene su archivo y sus datos.</p>
          ) : (
            <ul className="fin-issues">
              {pending.length > 0 && (
                <li className="is-warn">
                  <button className="panel-link" onClick={onGoVentas}>
                    {pending.length === 1 ? '1 cobro' : `${pending.length} cobros`} sin comprobante de venta
                  </button>
                </li>
              )}
              {issues.map((i) => (
                <li key={`${i.d.id}-${i.text}`} className={`is-${i.tone}`}>
                  <button className="panel-link" onClick={() => onOpen(i.d)}>
                    {DOC_TYPES[i.d.doc_type].short} {docNumber(i.d)} · {i.d.party_name}
                  </button>
                  <span>{i.text}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="fin-export">
            <h3>Para tu contador</h3>
            <div className="prod-actions">
              <button className="btn btn-primary btn-sm" disabled={zipping} onClick={exportZip}>
                {zipping ? 'Preparando…' : 'Descargar paquete (ZIP)'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => download(`ventas-${period}.csv`, docsCsv(inPeriod, 'venta'), 'text/csv')}>
                Ventas (Excel)
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => download(`compras-${period}.csv`, docsCsv(inPeriod, 'compra'), 'text/csv')}>
                Compras (Excel)
              </button>
            </div>
            <p className="fin-hint">El ZIP trae ventas, compras y el resumen en Excel, y todos los comprobantes ordenados por fecha.</p>
          </div>
        </div>
      </div>

      <div className="dash-card">
        <div className="dash-card__head">
          <h2>{closing ? 'Mes declarado' : 'Cerrar el mes'}</h2>
        </div>
        {closing ? (
          <>
            <p>
              Cerrado el {new Date(closing.closed_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}
              {closing.closed_by ? ` por ${closing.closed_by}` : ''}
              {closing.declared_ref ? ` · constancia ${closing.declared_ref}` : ''}. Sus comprobantes ya no se pueden editar.
            </p>
            {confirm === 'reabrir' ? (
              <p className="rec-row__end">
                ¿Reabrir {periodLabel(period)}? Si cambias algo, avisa a tu contador por si hay que rectificar.
                <button className="panel-link panel-link--danger" disabled={busy} onClick={reopen}>
                  Sí, reabrir
                </button>
                <button className="panel-link" onClick={() => setConfirm(null)}>
                  No
                </button>
              </p>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirm('reabrir')}>
                Reabrir el mes
              </button>
            )}
          </>
        ) : (
          <>
            <p className="panel-muted">Cuando tu contador presente la declaración, ciérralo aquí: se guarda el cálculo y el saldo a favor pasa al mes siguiente.</p>
            <div className="fin-grid fin-grid--2">
              <label className="panel-field">
                <span>Número de orden o constancia (opcional)</span>
                <input value={ref} onChange={(e) => setRef(e.target.value)} />
              </label>
            </div>
            {confirm === 'cerrar' ? (
              <p className="rec-row__end">
                {warns.length + pending.length ? `Quedan ${warns.length + pending.length} pendientes. ` : ''}¿Cerrar {periodLabel(period)}?
                <button className="panel-link" disabled={busy} onClick={close}>
                  Sí, cerrar
                </button>
                <button className="panel-link" onClick={() => setConfirm(null)}>
                  No
                </button>
              </p>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={() => setConfirm('cerrar')}>
                Marcar como declarado
              </button>
            )}
          </>
        )}
      </div>

      <div className="dash-card">
        <div className="dash-card__head">
          <h2>Año {year}</h2>
        </div>
        <div className="fin-year">
          <div>
            <p className="panel-muted">Ingresos netos hasta {periodLabel(period)}</p>
            <b>{pen(m.acumuladoAnual)}</b>
            <div className="fin-meter" role="img" aria-label={`${tramoPct} % del tramo de 300 UIT`}>
              <span style={{ width: `${tramoPct}%` }} />
            </div>
            <p className="fin-hint">
              {tramoPct} % de {pen(est.tramoPagoCuenta)} ({settings.tramoUit} UIT). Al pasarlo, el pago a cuenta sube a{' '}
              {(settings.pagoCuentaRateSobreTramo * 100).toLocaleString('es-PE')} % y cambian los libros obligatorios.
            </p>
          </div>
          <div>
            <p className="panel-muted">Renta anual estimada (referencia)</p>
            <b>{pen(est.impuesto)}</b>
            <p className="fin-hint">
              Ingresos {pen(est.ingresos)} − gastos {pen(est.gastos)} = renta {pen(est.renta)}. {Math.round(settings.rentaTasa1 * 100)} % hasta {settings.rentaTramoUit} UIT
              y {(settings.rentaTasa2 * 100).toLocaleString('es-PE')} % sobre el exceso, antes de descontar los pagos a cuenta. Tu contador hace los ajustes finales.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ——— Ajustes ———
const FIELDS: { key: keyof Settings; label: string; pct?: boolean; hint?: string }[] = [
  { key: 'uit', label: 'UIT (S/)', hint: '2026: S/ 5,500' },
  { key: 'igvRate', label: 'IGV', pct: true },
  { key: 'pagoCuentaRate', label: 'Pago a cuenta de renta', pct: true },
  { key: 'pagoCuentaRateSobreTramo', label: 'Pago a cuenta sobre el tramo', pct: true, hint: 'o el coeficiente, si es mayor' },
  { key: 'tramoUit', label: 'Tramo del pago a cuenta (UIT)' },
  { key: 'limiteRmtUit', label: 'Límite del RMT (UIT)' },
  { key: 'rentaTramoUit', label: 'Primer tramo de renta anual (UIT)' },
  { key: 'rentaTasa1', label: 'Renta anual hasta el tramo', pct: true },
  { key: 'rentaTasa2', label: 'Renta anual sobre el exceso', pct: true },
  { key: 'bancarizacionPen', label: 'Bancarización desde (S/)' },
  { key: 'bancarizacionUsd', label: 'Bancarización desde (US$)' },
  { key: 'detraccionMinPen', label: 'Detracción desde (S/)' },
  { key: 'detraccionTasa', label: 'Tasa de detracción de servicios', pct: true },
  { key: 'rxhRetencionMin', label: 'Retención de honorarios desde (S/)' },
  { key: 'rxhTasa', label: 'Retención de honorarios', pct: true },
]

function SettingsTab({ settings, onSaved, onError }: { settings: Settings; onSaved: (s: Settings) => void; onError: (m: string) => void }) {
  const toText = (s: Settings) =>
    Object.fromEntries(FIELDS.map((f) => [f.key, f.pct ? String(round2(s[f.key] * 100)) : String(s[f.key])])) as Record<keyof Settings, string>
  const [values, setValues] = useState(() => toText(settings))
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState(false)

  async function save(e: FormEvent) {
    e.preventDefault()
    const data = Object.fromEntries(FIELDS.map((f) => [f.key, f.pct ? Number(values[f.key]) / 100 : Number(values[f.key])])) as Settings
    if (Object.values(data).some((v) => !Number.isFinite(v) || v < 0)) return onError('Revisa los valores: deben ser números.')
    setBusy(true)
    const { error } = await supabase!.from('fin_settings').upsert({ id: 1, data, updated_at: new Date().toISOString() })
    setBusy(false)
    if (error) return onError('No se pudieron guardar los ajustes.')
    onSaved(data)
    setOk(true)
    setTimeout(() => setOk(false), 2500)
  }

  return (
    <form className="fin-section dash-card" onSubmit={save}>
      <div className="dash-card__head">
        <h2>Valores tributarios</h2>
      </div>
      <p className="panel-muted">Actualízalos cuando SUNAT los cambie (la UIT cambia cada enero). Confírmalos con tu contador.</p>
      <div className="fin-grid fin-grid--3">
        {FIELDS.map((f) => (
          <label key={f.key} className="panel-field">
            <span>
              {f.label}
              {f.pct ? ' (%)' : ''}
              {f.hint ? ` · ${f.hint}` : ''}
            </span>
            <input value={values[f.key]} inputMode="decimal" onChange={(e) => setValues({ ...values, [f.key]: e.target.value.replace(/[^\d.]/g, '') })} />
          </label>
        ))}
      </div>
      <div className="prod-actions">
        <button className="btn btn-primary btn-sm" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar ajustes'}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setValues(toText(DEFAULT_SETTINGS))}>
          Volver a los valores 2026
        </button>
        {ok && <span className="fin-hint">Guardado.</span>}
      </div>
    </form>
  )
}
