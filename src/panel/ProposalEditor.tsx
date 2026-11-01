// Editor de propuestas: datos a la izquierda, la propuesta (A4, 7 páginas) a la derecha, y
// «Descargar PDF» con el diálogo de impresión del navegador. Se guarda en la oportunidad.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Client } from './data'
import { money, projectName, type Project } from './production'
import {
  defaultProposal,
  ECO_EXTRAS,
  MARCA_COMBO,
  overflowingPages,
  proposalTotal,
  rasterizeGradients,
  renderProposal,
  type ProposalService,
} from '../proposal/browser'
import type { ProposalData, ProposalExtra } from '../proposal/template.js'


type Props = {
  deal: Project
  client?: Client
  onClose: () => void
  onSave: (proposal: ProposalData, sent: boolean) => Promise<boolean>
}

const lines = (t: string) =>
  t
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)

export function ProposalEditor({ deal, client, onClose, onSave }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const service = deal.service as ProposalService
  const [d, setD] = useState<ProposalData>(
    () =>
      (deal as Project & { proposal?: ProposalData | null }).proposal ??
      defaultProposal(service, { nombre: client ? client.company || client.name : 'Cliente', detalle: client?.sector ?? '' }, deal.amount),
  )
  const [html, setHtml] = useState(() => renderProposal(d))
  const [overflow, setOverflow] = useState<number[]>([])
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [scale, setScale] = useState(0.5)
  const [frameH, setFrameH] = useState(0)

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  // La vista previa se rehace poco después de cada cambio.
  useEffect(() => {
    const t = setTimeout(() => setHtml(renderProposal(d)), 250)
    return () => clearTimeout(t)
  }, [d])

  // Escala de la vista previa al ancho disponible (la página A4 mide 794 px de ancho).
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(() => setScale(Math.min(1, (el.clientWidth - 32) / 794)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const set = (patch: Partial<ProposalData>) => setD((x) => ({ ...x, ...patch }))
  const setServicio = (patch: Partial<ProposalData['servicio']>) => setD((x) => ({ ...x, servicio: { ...x.servicio, ...patch } }))
  const eco = d.servicio.ecommerce
  const marca = d.servicio.marca
  const med = d.servicio.medida
  const total = useMemo(() => proposalTotal(d), [d])

  function onFrameLoad() {
    const doc = frame.current?.contentDocument
    if (!doc) return
    void doc.fonts.ready.then(() => {
      setOverflow(overflowingPages(doc))
      setFrameH(doc.documentElement.scrollHeight)
    })
  }

  async function download() {
    const win = frame.current?.contentWindow
    const doc = frame.current?.contentDocument
    if (!win || !doc) return
    setBusy(true)
    const ok = await onSave(d, true)
    setStatus(ok ? 'Guardada y marcada como «Propuesta enviada».' : 'No se pudo guardar, pero puedes descargarla igual.')
    await rasterizeGradients(doc)
    await Promise.all(Array.from(doc.images).map((i) => (i.complete ? null : new Promise((r) => (i.onload = i.onerror = r)))))
    setBusy(false)
    win.focus()
    win.print()
    // Vuelve a la vista normal (sin las imágenes del degradado).
    setHtml(renderProposal(d) + ' ')
  }

  async function save() {
    setBusy(true)
    const ok = await onSave(d, false)
    setBusy(false)
    setStatus(ok ? 'Propuesta guardada.' : 'No se pudo guardar. ¿Ejecutaste supabase/oportunidades.sql?')
  }

  const extras = (list: ProposalExtra[], current: ProposalExtra[], apply: (next: ProposalExtra[]) => void) => (
    <div className="pe-checks">
      {list.map((x) => {
        const on = current.some((c) => c.nombre === x.nombre)
        return (
          <label key={x.nombre} className="prod-pays">
            <input type="checkbox" checked={on} onChange={() => apply(on ? current.filter((c) => c.nombre !== x.nombre) : [...current, x])} />
            {x.nombre} · {money(x.precio)}
          </label>
        )
      })}
    </div>
  )

  return (
    <dialog ref={dialog} className="pe" aria-labelledby="pe-title" onClose={onClose}>
      <header className="pe-bar">
        <div>
          <p className="eyebrow">{client ? client.company || client.name : 'Cliente'}</p>
          <h2 id="pe-title">Propuesta · {projectName(deal)}</h2>
        </div>
        <div className="prod-actions">
          {status && <span className="pe-status">{status}</span>}
          <button className="btn btn-ghost btn-sm" disabled={busy} onClick={save}>
            Guardar
          </button>
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={download}>
            {busy ? 'Preparando…' : 'Descargar PDF'}
          </button>
          <button className="detail__close" onClick={() => dialog.current?.close()} aria-label="Cerrar">
            ×
          </button>
        </div>
      </header>
      <div className="pe-body">
        <form className="pe-form" onSubmit={(e) => e.preventDefault()}>
          <Group title="Cliente">
            <Field label="Nombre en la propuesta" value={d.cliente.nombre} onChange={(v) => set({ cliente: { ...d.cliente, nombre: v } })} />
            <Field label="Sector o tipo de negocio" value={d.cliente.detalle} onChange={(v) => set({ cliente: { ...d.cliente, detalle: v } })} />
            <div className="rec-form__row">
              <Field label="Fecha" type="date" value={d.fecha} onChange={(v) => set({ fecha: v })} />
              <Field label="Validez (días)" value={String(d.validezDias)} onChange={(v) => set({ validezDias: Number(v.replace(/\D/g, '')) || 30 })} />
            </div>
          </Group>

          <Group title="Precio y condiciones">
            <div className="rec-form__row">
              <Field
                label="Precio base (US$)"
                value={d.servicio.precio == null ? '' : String(d.servicio.precio)}
                onChange={(v) => setServicio({ precio: v ? Number(v.replace(/[^\d.]/g, '')) : null })}
              />
              <Field label="Plazo" value={d.plazo} onChange={(v) => set({ plazo: v })} />
            </div>
            <div className="rec-form__row">
              <Field label="Rondas de cambios" value={String(d.rondasDeAjustes)} onChange={(v) => set({ rondasDeAjustes: Number(v.replace(/\D/g, '')) || 0 })} />
              <Field
                label={med ? 'Garantía (días)' : 'Acompañamiento (días)'}
                value={String(d.acompanamientoDias)}
                onChange={(v) => set({ acompanamientoDias: Number(v.replace(/\D/g, '')) || 0 })}
              />
            </div>
            {d.alojamiento && (
              <Field
                label="Alojamiento mensual (US$)"
                value={d.alojamiento.mensual == null ? '' : String(d.alojamiento.mensual)}
                onChange={(v) => set({ alojamiento: { mensual: v ? Number(v.replace(/[^\d.]/g, '')) : null } })}
              />
            )}
            <p className="pe-total">
              Total: <b>{total == null ? '—' : money(total)}</b>
              {total != null && ` · 70 % ${money(Math.round(total * 70) / 100)} · 30 % ${money(Math.round(total * 30) / 100)}`}
            </p>
          </Group>

          {eco && (
            <Group title="Tienda">
              <div className="rec-form__row">
                <Field
                  label="Bloques extra de 40 productos"
                  value={String(eco.bloquesExtra)}
                  onChange={(v) => setServicio({ ecommerce: { ...eco, bloquesExtra: Number(v.replace(/\D/g, '')) || 0 } })}
                />
                <label className="panel-field">
                  <span>Pasarela</span>
                  <select className="prod-select" value={eco.pasarela} onChange={(e) => setServicio({ ecommerce: { ...eco, pasarela: e.target.value } })}>
                    <option>Culqi</option>
                    <option>Whop</option>
                  </select>
                </label>
              </div>
              <span className="pe-label">Adicionales</span>
              {extras(ECO_EXTRAS, eco.adicionales, (adicionales) => setServicio({ ecommerce: { ...eco, adicionales } }))}
            </Group>
          )}

          {marca && (
            <Group title="Marca">
              {extras([MARCA_COMBO[marca.nivel === 'completa' ? 'mid' : 'mar']], marca.adicionales, (adicionales) =>
                setServicio({ marca: { ...marca, adicionales } }),
              )}
            </Group>
          )}

          {med && (
            <Group title="Versión 1">
              <Field label="Nombre del producto" value={med.producto} onChange={(v) => setServicio({ medida: { ...med, producto: v } })} />
              <label className="panel-field">
                <span>Plataforma</span>
                <select
                  className="prod-select"
                  value={med.plataforma}
                  onChange={(e) => setServicio({ medida: { ...med, plataforma: e.target.value as 'web' | 'instalable' | 'tiendas' } })}
                >
                  <option value="web">Web (celular, tableta y escritorio)</option>
                  <option value="instalable">Web instalable en el celular</option>
                  <option value="tiendas">App en App Store y Google Play</option>
                </select>
              </label>
              <Area
                label="Funciones (3 a 5, una por línea: «[usuario] puede [acción]»)"
                value={med.funciones.join('\n')}
                onChange={(v) => setServicio({ medida: { ...med, funciones: lines(v) } })}
              />
              {med.funciones.length > 5 && <p className="prod-hint">Más de 5 funciones: la ficha pide dividirlo en dos fases.</p>}
              <Area label="Queda para después (una por línea)" value={med.despues.join('\n')} onChange={(v) => setServicio({ medida: { ...med, despues: lines(v) } })} />
              <Area
                label="Servicios de terceros que paga el cliente (una por línea)"
                value={med.terceros.join('\n')}
                onChange={(v) => setServicio({ medida: { ...med, terceros: lines(v) } })}
              />
            </Group>
          )}

          <Group title="Portada">
            <Field label="Título, primera parte" value={d.portada.titulo[0]} onChange={(v) => set({ portada: { ...d.portada, titulo: [v, d.portada.titulo[1]] } })} />
            <Field label="Título, parte en degradado" value={d.portada.titulo[1]} onChange={(v) => set({ portada: { ...d.portada, titulo: [d.portada.titulo[0], v] } })} />
            <label className="prod-pays">
              <input type="checkbox" checked={Boolean(d.portada.enLinea)} onChange={(e) => set({ portada: { ...d.portada, enLinea: e.target.checked } })} />
              Las dos partes seguidas, en la misma línea
            </label>
            <Area label="Bajada" value={d.portada.bajada} onChange={(v) => set({ portada: { ...d.portada, bajada: v } })} />
          </Group>

          <p className="pe-help">
            «Descargar PDF» abre el diálogo de impresión: elige <b>Guardar como PDF</b>, tamaño <b>A4</b> y márgenes <b>Ninguno</b>.
          </p>
        </form>

        <div className="pe-preview" ref={wrap}>
          {overflow.length > 0 && (
            <p className="prod-hint pe-overflow">El contenido no cabe en la página {overflow.join(', ')}. Acorta algún texto antes de descargar.</p>
          )}
          <div className="pe-sheet" style={{ width: 794 * scale, height: frameH * scale || undefined }}>
            <iframe
              ref={frame}
              title="Vista previa de la propuesta"
              srcDoc={html}
              onLoad={onFrameLoad}
              style={{ width: 794, height: frameH || 1123, transform: `scale(${scale})`, transformOrigin: 'top left' }}
            />
          </div>
        </div>
      </div>
    </dialog>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="pe-group">
      <legend>{title}</legend>
      {children}
    </fieldset>
  )
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="panel-field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState(value)
  return (
    <label className="panel-field">
      <span>{label}</span>
      <textarea
        className="prod-textarea"
        rows={4}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value)
          onChange(e.target.value)
        }}
      />
    </label>
  )
}
