// Comparar el mes con la propuesta del SIRE: lo que SUNAT tiene y el panel no, y al revés.
import { useState } from 'react'
import { DOC_TYPES, amountIn, docNumber, periodLabel, type Direction, type FinDoc } from './finanzas'
import { compareSire, isoDate, readSireFile, type SireRow } from './finanzasSire'

type Result = ReturnType<typeof compareSire> & { direction: Direction; file: string }

const SIRE_URL = 'https://e-menu.sunat.gob.pe/cl-ti-itmenu/MenuInternet.htm'

export function SireCompare({
  period,
  docs,
  locked,
  onOpen,
  onRegister,
}: {
  period: string
  docs: FinDoc[]
  locked: boolean
  onOpen: (d: FinDoc) => void
  onRegister: (direction: Direction, preset: Partial<FinDoc>) => void
}) {
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function load(direction: Direction, input: HTMLInputElement) {
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const table = await readSireFile(file)
      if (table.missing.length)
        return setError(
          `No reconocí las columnas ${table.missing.join(', ')} en «${file.name}». Descarga la propuesta en TXT o Excel (CSV) desde el SIRE, o mándale el archivo a Claude para ajustarlo.`,
        )
      if (!table.rows.length) return setError('El archivo no trae comprobantes.')
      setResult({ ...compareSire(table.rows, docs, direction, period), direction, file: file.name })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer el archivo.')
    } finally {
      setBusy(false)
    }
  }

  const register = (r: SireRow, direction: Direction) =>
    onRegister(direction, {
      doc_type: r.tipo in DOC_TYPES ? r.tipo : '01',
      series: r.serie,
      number: r.numero.replace(/^0+(?=\d)/, ''),
      issued_on: isoDate(r.fecha) || `${period}-01`,
      period,
      party_doc_type: r.doc.length === 11 ? '6' : r.doc.length === 8 ? '1' : '0',
      party_doc: r.doc || null,
      party_name: r.nombre,
      currency: r.moneda === 'USD' ? 'USD' : 'PEN',
      total: r.total,
    })

  const ok = result && !result.onlySire.length && !result.onlyPanel.length && !result.diff.length

  return (
    <div className="dash-card">
      <div className="dash-card__head">
        <h2>Comparar con el SIRE</h2>
      </div>
      <p className="panel-muted">
        Descarga de{' '}
        <a className="fin-link" href={SIRE_URL} target="_blank" rel="noopener">
          SUNAT Operaciones en Línea
        </a>{' '}
        la propuesta del SIRE de {periodLabel(period)} (registro de ventas o de compras) y súbela aquí tal cual: TXT, CSV o ZIP. El panel te dice qué falta en
        cada lado.
      </p>
      <div className="fin-upload">
        <label className="btn btn-ghost btn-sm">
          Propuesta de ventas (RVIE)
          <input className="visually-hidden" type="file" accept=".txt,.csv,.zip,text/plain,text/csv,application/zip" onChange={(e) => void load('venta', e.target)} />
        </label>
        <label className="btn btn-ghost btn-sm">
          Propuesta de compras (RCE)
          <input className="visually-hidden" type="file" accept=".txt,.csv,.zip,text/plain,text/csv,application/zip" onChange={(e) => void load('compra', e.target)} />
        </label>
        {busy && <span className="fin-hint">Leyendo…</span>}
      </div>
      {error && <p className="fin-xml">{error}</p>}
      {result && (
        <div className="fin-sire">
          <p>
            <b>{result.direction === 'venta' ? 'Ventas' : 'Compras'}</b> · {result.file}: {result.total} en el SIRE, {result.matched} {result.matched === 1 ? 'coincide' : 'coinciden'} con el panel.
          </p>
          {ok && <p className="fin-xml is-ok">Todo coincide.</p>}
          {result.onlySire.length > 0 && (
            <>
              <h3>En el SIRE y no en el panel ({result.onlySire.length})</h3>
              <ul className="fin-issues">
                {result.onlySire.map((r) => (
                  <li key={r.key} className="is-warn">
                    <span className="fin-sire__row">
                      <span>
                        {DOC_TYPES[r.tipo]?.short ?? r.tipo} {r.serie}-{r.numero} · {r.nombre || r.doc}
                      </span>
                      <b>{amountIn(r.moneda === 'USD' ? 'USD' : 'PEN', r.total)}</b>
                      {!locked && (
                        <button className="panel-link" onClick={() => register(r, result.direction)}>
                          Registrar
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {result.onlyPanel.length > 0 && (
            <>
              <h3>En el panel y no en el SIRE ({result.onlyPanel.length})</h3>
              <p className="fin-hint">Puede ser un comprobante físico, del exterior o un recibo por honorarios (no salen en esta propuesta), o un error de serie o número.</p>
              <ul className="fin-issues">
                {result.onlyPanel.map((d) => (
                  <li key={d.id} className="is-info">
                    <button className="panel-link" onClick={() => onOpen(d)}>
                      {DOC_TYPES[d.doc_type].short} {docNumber(d)} · {d.party_name}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {result.diff.length > 0 && (
            <>
              <h3>Montos distintos ({result.diff.length})</h3>
              <ul className="fin-issues">
                {result.diff.map(({ row, doc }) => (
                  <li key={doc.id} className="is-warn">
                    <button className="panel-link" onClick={() => onOpen(doc)}>
                      {DOC_TYPES[doc.doc_type].short} {docNumber(doc)} · {doc.party_name}
                    </button>
                    <span>
                      SIRE {amountIn(row.moneda === 'USD' ? 'USD' : 'PEN', row.total)} · panel {amountIn(doc.currency, doc.total)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
