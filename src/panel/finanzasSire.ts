// Comparación con la propuesta del SIRE (registro de ventas RVIE o de compras RCE) que se descarga de SUNAT.
// Acepta el TXT o CSV, o el ZIP tal como lo entrega SUNAT. Todo se procesa en el navegador.
import { active, toPen, type Direction, type DocType, type FinDoc } from './finanzas'

// ——— ZIP (lectura): sin dependencias, con DecompressionStream del navegador ———
export async function unzip(bytes: Uint8Array): Promise<{ name: string; data: Uint8Array }[]> {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let eocd = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (v.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('El ZIP está dañado.')
  const count = v.getUint16(eocd + 10, true)
  let p = v.getUint32(eocd + 16, true)
  const out: { name: string; data: Uint8Array }[] = []
  const dec = new TextDecoder()
  for (let n = 0; n < count; n++) {
    if (v.getUint32(p, true) !== 0x02014b50) break
    const method = v.getUint16(p + 10, true)
    const size = v.getUint32(p + 20, true)
    const nameLen = v.getUint16(p + 28, true)
    const extraLen = v.getUint16(p + 30, true)
    const commentLen = v.getUint16(p + 32, true)
    const local = v.getUint32(p + 42, true)
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen))
    p += 46 + nameLen + extraLen + commentLen
    if (name.endsWith('/')) continue
    const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true)
    const raw = bytes.subarray(start, start + size)
    if (method === 0) out.push({ name, data: raw.slice() })
    else if (method === 8) {
      const stream = new Blob([raw as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
      out.push({ name, data: new Uint8Array(await new Response(stream).arrayBuffer()) })
    }
  }
  return out
}

// ——— Texto de tabla (TXT con «|», CSV con «;» o «,», o tabulado) ———
function decode(data: Uint8Array) {
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(data)
  // Si hay caracteres inválidos, probablemente viene en Latin-1 (Windows).
  return utf8.includes('�') ? new TextDecoder('windows-1252').decode(data) : utf8
}

function splitLine(line: string, sep: string) {
  if (sep === '|' || sep === '\t') return line.split(sep)
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"'
        i++
      } else quoted = !quoted
    } else if (c === sep && !quoted) {
      out.push(cur)
      cur = ''
    } else cur += c
  }
  out.push(cur)
  return out
}

export function readTable(raw: string) {
  const lines = raw.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim())
  if (!lines.length) return { head: [] as string[], rows: [] as string[][] }
  const first = lines[0]
  const sep = ['|', ';', '\t', ','].sort((a, b) => first.split(b).length - first.split(a).length)[0]
  const rows = lines.map((l) => splitLine(l, sep).map((c) => c.trim()))
  return { head: rows[0], rows: rows.slice(1).filter((r) => r.length > 2) }
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

// Columnas del SIRE por su encabezado (los nombres varían un poco entre versiones).
export function findColumns(head: string[]) {
  const h = head.map(norm)
  const pick = (test: (x: string) => boolean) => h.findIndex(test)
  const tipo = pick((x) => /tipo/.test(x) && /(cp|cdp|comprobante)/.test(x) && !/identidad/.test(x) && !/(modific|ref)/.test(x))
  const serie = pick((x) => /serie/.test(x) && !/(modific|ref)/.test(x))
  const numero = pick((x) => (/(nro|numero|num)/.test(x) && /(cp|cdp|comprobante|inicial)/.test(x) && !/(identidad|final|modific|ref)/.test(x)) || x === 'numero' || x === 'nro')
  const fecha = pick((x) => /fecha/.test(x) && /emision/.test(x))
  let doc = pick((x) => /(doc|documento)/.test(x) && /identidad/.test(x) && /(nro|numero|num)/.test(x))
  if (doc < 0) doc = h.findIndex((x, i) => i > 0 && /^ruc/.test(x))
  const nombre = h.findIndex((x, i) => i > 1 && /(razon social|nombres)/.test(x))
  const total = pick((x) => /^(total|importe total)/.test(x) || x === 'total cp' || x === 'total comprobante')
  const moneda = pick((x) => /moneda/.test(x) && !/tipo de cambio/.test(x))
  return { tipo, serie, numero, fecha, doc, nombre, total, moneda }
}

export type SireRow = { key: string; tipo: DocType; serie: string; numero: string; fecha: string; doc: string; nombre: string; total: number; moneda: string }

const tipo2 = (s: string) => (s.replace(/\D/g, '').padStart(2, '0').slice(-2) as DocType)
const numKey = (s: string | null) => String(Number((s ?? '').replace(/\D/g, '')) || (s ?? '').trim())
export const keyOf = (tipo: string, serie: string | null, numero: string | null) => `${tipo2(tipo)}|${(serie ?? '').trim().toUpperCase()}|${numKey(numero)}`

export function sireRows(raw: string) {
  const { head, rows } = readTable(raw)
  const c = findColumns(head)
  const missing = (['tipo', 'serie', 'numero', 'total'] as const).filter((k) => c[k] < 0)
  if (missing.length) return { rows: [] as SireRow[], missing, head }
  const num = (s: string) => Number((s ?? '').replace(/,/g, '')) || 0
  return {
    head,
    missing,
    rows: rows.map((r) => ({
      key: keyOf(r[c.tipo], r[c.serie], r[c.numero]),
      tipo: tipo2(r[c.tipo]),
      serie: (r[c.serie] ?? '').toUpperCase(),
      numero: r[c.numero] ?? '',
      fecha: c.fecha >= 0 ? r[c.fecha] : '',
      doc: c.doc >= 0 ? r[c.doc] : '',
      nombre: c.nombre >= 0 ? r[c.nombre] : '',
      total: num(r[c.total]),
      moneda: c.moneda >= 0 ? r[c.moneda] : '',
    })),
  }
}

export async function readSireFile(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b
  if (!isZip) return sireRows(decode(bytes))
  const entries = (await unzip(bytes)).filter((e) => /\.(txt|csv)$/i.test(e.name))
  if (!entries.length) throw new Error('El ZIP no trae ningún TXT o CSV.')
  const all = entries.map((e) => sireRows(decode(e.data)))
  const ok = all.filter((x) => !x.missing.length)
  return ok.length ? { head: ok[0].head, missing: [], rows: ok.flatMap((x) => x.rows) } : all[0]
}

// SUNAT entrega fechas como dd/mm/aaaa; el panel usa aaaa-mm-dd.
export const isoDate = (s: string) => {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''
}

export function compareSire(rows: SireRow[], docs: FinDoc[], direction: Direction, period: string) {
  const mine = active(docs).filter((d) => d.direction === direction && d.period === period)
  const byKey = new Map(mine.map((d) => [keyOf(d.doc_type, d.series, d.number), d]))
  const seen = new Set<string>()
  const onlySire: SireRow[] = []
  const diff: { row: SireRow; doc: FinDoc }[] = []
  for (const r of rows) {
    const d = byKey.get(r.key)
    if (!d) {
      onlySire.push(r)
      continue
    }
    seen.add(r.key)
    const close = (a: number) => Math.abs(Math.abs(a) - Math.abs(r.total)) <= 1
    if (!close(d.total) && !close(toPen(d, d.total))) diff.push({ row: r, doc: d })
  }
  const onlyPanel = mine.filter((d) => !seen.has(keyOf(d.doc_type, d.series, d.number)))
  return { matched: seen.size, onlySire, onlyPanel, diff, total: rows.length }
}
