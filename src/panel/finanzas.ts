// Finanzas (RMT · Perú): tipos, ajustes, cálculo del mes, alertas y exportación para el contador.
// Es control interno: los registros oficiales están en el SIRE de SUNAT y la declaración la hace el contador.
// Todos los totales se calculan en soles con el tipo de cambio de cada comprobante.
import type { Client } from './data'
import { paymentsOf } from './dashboard'
import { projectName, type Project } from './production'
import { recurringName, recurringPayments, type Recurring } from './recurring'

export type Direction = 'venta' | 'compra'
export type DocType = '01' | '02' | '03' | '07' | '08' | '12' | '14' | '91' | '00'
export type PartyDocType = '0' | '1' | '4' | '6' | '7'
export type Operation = 'gravada' | 'exportacion' | 'exonerada' | 'no_gravada'
export type PaidVia = 'banco' | 'tarjeta' | 'efectivo' | 'whop' | 'otro'
export type DocFile = { path: string; name: string; size: number }

export type FinDoc = {
  id: string
  created_at: string
  updated_at: string
  direction: Direction
  period: string
  issued_on: string
  doc_type: DocType
  series: string | null
  number: string | null
  party_doc_type: PartyDocType
  party_doc: string | null
  party_name: string
  currency: 'PEN' | 'USD'
  fx_rate: number
  operation: Operation
  base: number
  igv: number
  other: number
  total: number
  category: string | null
  credit_igv: boolean
  paid_via: PaidVia | null
  paid_on: string | null
  retention: number
  detraccion: boolean
  detraccion_amount: number | null
  detraccion_ref: string | null
  links: string[]
  client_id: string | null
  project_id: string | null
  annulled: boolean
  notes: string | null
  files: DocFile[]
  // Gasto fijo: el panel lo recuerda cada mes (requiere supabase/finanzas-fase2.sql).
  fijo?: boolean
}

export type MonthSummary = {
  ventasGravadas: number
  ventasExportacion: number
  ventasOtras: number
  ingresosNetos: number
  igvVentas: number
  comprasBase: number
  igvCompras: number
  creditoFiscal: number
  saldoAnterior: number
  igvPagar: number
  saldoFavor: number
  acumuladoAnual: number
  tasaPagoCuenta: number
  pagoCuenta: number
  retenciones: number
  detracciones: number
  totalPagar: number
}

export type Closing = { period: string; closed_at: string; closed_by: string | null; summary: MonthSummary; declared_ref: string | null; notes: string | null }

// ——— Ajustes (editables en Finanzas → Ajustes) ———
export type Settings = {
  uit: number
  igvRate: number
  pagoCuentaRate: number
  pagoCuentaRateSobreTramo: number
  tramoUit: number
  limiteRmtUit: number
  rentaTramoUit: number
  rentaTasa1: number
  rentaTasa2: number
  bancarizacionPen: number
  bancarizacionUsd: number
  detraccionMinPen: number
  detraccionTasa: number
  rxhRetencionMin: number
  rxhTasa: number
}

// Valores 2026: UIT S/ 5,500 (D. S. 301-2025-EF). Revisar cada enero.
export const DEFAULT_SETTINGS: Settings = {
  uit: 5500,
  igvRate: 0.18,
  pagoCuentaRate: 0.01,
  pagoCuentaRateSobreTramo: 0.015,
  tramoUit: 300,
  limiteRmtUit: 1700,
  rentaTramoUit: 15,
  rentaTasa1: 0.1,
  rentaTasa2: 0.295,
  bancarizacionPen: 2000,
  bancarizacionUsd: 500,
  detraccionMinPen: 700,
  detraccionTasa: 0.12,
  rxhRetencionMin: 1500,
  rxhTasa: 0.08,
}

export const withDefaults = (data: Partial<Settings> | null | undefined): Settings => {
  const out = { ...DEFAULT_SETTINGS }
  for (const k of Object.keys(out) as (keyof Settings)[]) {
    const v = Number(data?.[k])
    if (data?.[k] != null && Number.isFinite(v)) out[k] = v
  }
  return out
}

// Datos que no son tasas: RUC de ALIVE y gastos fijos que ya no se quieren recordar.
export type FinConfig = { ruc: string; fijosOff: string[] }
export const configOf = (data: Record<string, unknown> | null | undefined): FinConfig => ({
  ruc: typeof data?.ruc === 'string' ? data.ruc.trim() : '',
  fijosOff: Array.isArray(data?.fijosOff) ? (data.fijosOff as unknown[]).filter((x): x is string => typeof x === 'string') : [],
})

// ——— Catálogos ———
export const DOC_TYPES: Record<DocType, { label: string; short: string; credit: boolean; sale: boolean }> = {
  '01': { label: 'Factura', short: 'Factura', credit: true, sale: true },
  '03': { label: 'Boleta de venta', short: 'Boleta', credit: false, sale: true },
  '07': { label: 'Nota de crédito', short: 'N. crédito', credit: true, sale: true },
  '08': { label: 'Nota de débito', short: 'N. débito', credit: true, sale: true },
  '02': { label: 'Recibo por honorarios', short: 'RxH', credit: false, sale: false },
  '12': { label: 'Ticket', short: 'Ticket', credit: false, sale: false },
  '14': { label: 'Recibo de servicio público (luz, agua, teléfono, internet)', short: 'Servicio público', credit: true, sale: false },
  '91': { label: 'Comprobante del exterior (no domiciliado)', short: 'Exterior', credit: false, sale: false },
  '00': { label: 'Otro', short: 'Otro', credit: false, sale: true },
}

export const PARTY_DOC: Record<PartyDocType, string> = { '6': 'RUC', '1': 'DNI', '4': 'Carné de extranjería', '7': 'Pasaporte', '0': 'Doc. del exterior' }

export const OPERATIONS: Record<Operation, string> = {
  gravada: 'Gravada con IGV',
  exportacion: 'Exportación de servicios (IGV 0)',
  exonerada: 'Exonerada o inafecta',
  no_gravada: 'Sin IGV (otro motivo)',
}

export const PAID_VIA: Record<PaidVia, string> = { banco: 'Transferencia o depósito', tarjeta: 'Tarjeta', whop: 'Whop', efectivo: 'Efectivo', otro: 'Otro' }

export const CATEGORIES = [
  'Software y suscripciones',
  'Alojamiento y dominios',
  'Freelancers y colaboradores',
  'Equipos y herramientas',
  'Publicidad de ALIVE',
  'Servicios básicos e internet',
  'Comisiones bancarias y de pago',
  'Contabilidad y trámites',
  'Capacitación',
  'Movilidad y viajes',
  'Otros gastos del negocio',
] as const

// ——— Fechas y periodos ———
export const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const currentPeriod = () => todayIso().slice(0, 7)
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
export const periodLabel = (p: string) => `${MONTHS[Number(p.slice(5, 7)) - 1]} ${p.slice(0, 4)}`
export function shiftPeriod(p: string, n: number) {
  const d = new Date(Number(p.slice(0, 4)), Number(p.slice(5, 7)) - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ——— Montos ———
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
export const sign = (d: Pick<FinDoc, 'doc_type'>) => (d.doc_type === '07' ? -1 : 1)
export const toPen = (d: Pick<FinDoc, 'currency' | 'fx_rate'>, n: number) => round2(n * (d.currency === 'USD' ? d.fx_rate : 1))
export const pen = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
export const amountIn = (currency: 'PEN' | 'USD', n: number) =>
  `${currency === 'USD' ? 'US$' : 'S/'} ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Base e IGV a partir del total (comprobante gravado): base = total / (1 + tasa).
export function splitTotal(total: number, operation: Operation, igvRate: number) {
  if (operation !== 'gravada') return { base: round2(total), igv: 0 }
  const base = round2(total / (1 + igvRate))
  return { base, igv: round2(total - base) }
}

export const docNumber = (d: Pick<FinDoc, 'series' | 'number'>) => [d.series, d.number].filter(Boolean).join('-')
export const active = (docs: FinDoc[]) => docs.filter((d) => !d.annulled)

// ——— Cálculo del mes ———
// SUNAT redondea los tributos a soles enteros en la declaración.
export function monthSummary(docs: FinDoc[], period: string, s: Settings, saldoAnterior: number): MonthSummary {
  const inPeriod = active(docs).filter((d) => d.period === period)
  const ventas = inPeriod.filter((d) => d.direction === 'venta')
  const compras = inPeriod.filter((d) => d.direction === 'compra')
  const sumOf = (list: FinDoc[], f: (d: FinDoc) => number) => round2(list.reduce((a, d) => a + sign(d) * toPen(d, f(d)), 0))

  const ventasGravadas = sumOf(ventas.filter((d) => d.operation === 'gravada'), (d) => d.base)
  const ventasExportacion = sumOf(ventas.filter((d) => d.operation === 'exportacion'), (d) => d.base + d.other)
  const ventasOtras = round2(
    sumOf(ventas.filter((d) => d.operation === 'exonerada' || d.operation === 'no_gravada'), (d) => d.base + d.other) +
      sumOf(ventas.filter((d) => d.operation === 'gravada'), (d) => d.other),
  )
  const ingresosNetos = round2(ventasGravadas + ventasExportacion + ventasOtras)
  const igvVentas = sumOf(ventas, (d) => d.igv)

  const comprasBase = sumOf(compras, (d) => d.base + d.other + (d.credit_igv ? 0 : d.igv))
  const igvCompras = sumOf(compras, (d) => d.igv)
  const creditoFiscal = sumOf(compras.filter((d) => d.credit_igv), (d) => d.igv)

  const neto = round2(igvVentas - creditoFiscal - saldoAnterior)
  const igvPagar = Math.max(0, Math.round(neto))
  const saldoFavor = round2(Math.max(0, -neto))

  // Ingresos netos del año hasta este mes: si pasan el tramo (300 UIT), el pago a cuenta sube.
  const year = period.slice(0, 4)
  const acumuladoAnual = sumOf(
    active(docs).filter((d) => d.direction === 'venta' && d.period.startsWith(year) && d.period <= period),
    (d) => d.base + d.other,
  )
  const tasaPagoCuenta = acumuladoAnual > s.tramoUit * s.uit ? s.pagoCuentaRateSobreTramo : s.pagoCuentaRate
  const pagoCuenta = Math.max(0, Math.round(ingresosNetos * tasaPagoCuenta))

  const retenciones = Math.round(compras.filter((d) => d.doc_type === '02').reduce((a, d) => a + toPen(d, d.retention), 0))
  const detracciones = round2(ventas.filter((d) => d.detraccion).reduce((a, d) => a + (d.detraccion_amount ?? 0), 0))

  return {
    ventasGravadas,
    ventasExportacion,
    ventasOtras,
    ingresosNetos,
    igvVentas,
    comprasBase,
    igvCompras,
    creditoFiscal,
    saldoAnterior,
    igvPagar,
    saldoFavor,
    acumuladoAnual,
    tasaPagoCuenta,
    pagoCuenta,
    retenciones,
    detracciones,
    totalPagar: igvPagar + pagoCuenta + retenciones,
  }
}

// Renta anual estimada (referencia): 10 % hasta 15 UIT de renta neta y 29.5 % sobre el exceso.
export function yearEstimate(docs: FinDoc[], year: string, s: Settings) {
  const list = active(docs).filter((d) => d.period.startsWith(year))
  const total = (dir: Direction) =>
    round2(list.filter((d) => d.direction === dir).reduce((a, d) => a + sign(d) * toPen(d, d.base + d.other + (dir === 'compra' && !d.credit_igv ? d.igv : 0)), 0))
  const ingresos = total('venta')
  const gastos = total('compra')
  const renta = Math.max(0, round2(ingresos - gastos))
  const tramo = s.rentaTramoUit * s.uit
  const impuesto = Math.round(Math.min(renta, tramo) * s.rentaTasa1 + Math.max(0, renta - tramo) * s.rentaTasa2)
  return { ingresos, gastos, renta, impuesto, tramoPagoCuenta: s.tramoUit * s.uit, limiteRmt: s.limiteRmtUit * s.uit }
}

// ——— Alertas por comprobante ———
export type Alert = { tone: 'warn' | 'info'; text: string }

export function alertsOf(d: FinDoc, s: Settings): Alert[] {
  if (d.annulled) return []
  const out: Alert[] = []
  const totalPen = toPen(d, d.total)
  if (!d.files.length) out.push({ tone: 'warn', text: 'Falta adjuntar el comprobante.' })
  if (d.currency === 'USD' && d.fx_rate === 1) out.push({ tone: 'warn', text: 'Falta el tipo de cambio del día de emisión.' })
  if (d.direction === 'compra') {
    const limitHit = d.currency === 'USD' ? d.total >= s.bancarizacionUsd : totalPen >= s.bancarizacionPen
    if (limitHit && (d.paid_via === 'efectivo' || !d.paid_via))
      out.push({ tone: 'warn', text: `Desde ${d.currency === 'USD' ? `US$ ${s.bancarizacionUsd}` : pen(s.bancarizacionPen)} el pago debe ser bancarizado, o se pierde el gasto y el crédito fiscal.` })
    if (d.doc_type === '02' && totalPen > s.rxhRetencionMin && !d.retention)
      out.push({ tone: 'warn', text: `Recibo por honorarios de más de ${pen(s.rxhRetencionMin)}: corresponde retener el ${Math.round(s.rxhTasa * 100)} %.` })
    if (d.credit_igv && !DOC_TYPES[d.doc_type].credit) out.push({ tone: 'warn', text: `Este tipo de comprobante (${DOC_TYPES[d.doc_type].short.toLowerCase()}) no da crédito fiscal.` })
    if (d.credit_igv && d.party_doc_type !== '6') out.push({ tone: 'warn', text: 'Para usar el crédito fiscal, el proveedor debe tener RUC.' })
    if (d.doc_type === '91') out.push({ tone: 'info', text: 'Proveedor del exterior: revisa con el contador el IGV por utilización de servicios.' })
  } else {
    if (d.operation === 'exportacion' && d.doc_type === '03')
      out.push({ tone: 'info', text: 'La exportación de servicios se sustenta normalmente con factura: confírmalo con el contador.' })
    if (d.operation === 'exportacion' && (d.party_doc_type === '6' || d.party_doc_type === '1'))
      out.push({ tone: 'warn', text: 'Para que sea exportación, el cliente debe ser del exterior (no domiciliado).' })
    if (d.operation === 'gravada' && d.party_doc_type === '6' && totalPen > s.detraccionMinPen && !d.detraccion)
      out.push({ tone: 'info', text: `Venta a empresa por más de ${pen(s.detraccionMinPen)}: revisa si corresponde detracción.` })
    if (d.detraccion && !d.detraccion_ref) out.push({ tone: 'warn', text: 'Falta el número de constancia de la detracción.' })
  }
  return out
}

// ——— Cobros del panel sin comprobante ———
export type Cobro = { key: string; date: string; amount: number; label: string; clientId: string; projectId: string | null }

export function cobrosOf(projects: Project[], recurring: Recurring[], clients: Client[]): Cobro[] {
  const name = (id: string) => {
    const c = clients.find((x) => x.id === id)
    return c ? c.company || c.name : 'Cliente'
  }
  const fromProjects = projects.flatMap((p) =>
    paymentsOf(p).map((x) => ({
      key: `${x.kind === 'deposit' ? 'dep' : 'bal'}:${p.id}`,
      date: x.date,
      amount: x.amount,
      label: `${name(p.client_id)} · ${projectName(p)} · ${x.kind === 'deposit' ? 'adelanto 70 %' : 'saldo 30 %'}`,
      clientId: p.client_id,
      projectId: p.id,
    })),
  )
  const fromRecurring = recurringPayments(recurring).map((x) => ({
    key: `rec:${x.r.id}:${x.month}`,
    date: x.date,
    amount: x.amount,
    label: `${name(x.r.client_id)} · ${recurringName(x.r)} · ${x.month}`,
    clientId: x.r.client_id,
    projectId: null,
  }))
  return [...fromProjects, ...fromRecurring].sort((a, b) => a.date.localeCompare(b.date))
}

export function unbilled(cobros: Cobro[], docs: FinDoc[], period: string) {
  const linked = new Set(active(docs).flatMap((d) => d.links))
  return cobros.filter((c) => c.date.slice(0, 7) === period && !linked.has(c.key))
}

// ——— Exportación para el contador ———
const csvCell = (v: unknown) => {
  const s = v == null ? '' : typeof v === 'number' ? v.toFixed(2) : String(v)
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function docsCsv(docs: FinDoc[], direction: Direction) {
  const head = [
    'Periodo',
    'Fecha de emisión',
    'Tipo de comprobante',
    'Serie',
    'Número',
    'Tipo de documento',
    'Número de documento',
    direction === 'venta' ? 'Cliente' : 'Proveedor',
    'Moneda',
    'Tipo de cambio',
    'Operación',
    'Base imponible',
    'IGV',
    'Otros',
    'Total',
    'Base S/',
    'IGV S/',
    'Total S/',
    ...(direction === 'compra' ? ['Categoría', 'Usa crédito fiscal', 'Retención'] : ['Detracción', 'Constancia de detracción']),
    'Medio de pago',
    'Fecha de pago',
    'Anulado',
    'Notas',
    'Archivos',
  ]
  const rows = docs
    .filter((d) => d.direction === direction)
    .sort((a, b) => a.issued_on.localeCompare(b.issued_on))
    .map((d) => {
      const s = sign(d)
      return [
        d.period,
        d.issued_on,
        `${d.doc_type} ${DOC_TYPES[d.doc_type].short}`,
        d.series,
        d.number,
        PARTY_DOC[d.party_doc_type],
        d.party_doc,
        d.party_name,
        d.currency,
        Number(d.fx_rate).toFixed(3),
        OPERATIONS[d.operation],
        s * d.base,
        s * d.igv,
        s * d.other,
        s * d.total,
        s * toPen(d, d.base),
        s * toPen(d, d.igv),
        s * toPen(d, d.total),
        ...(direction === 'compra'
          ? [d.category, d.credit_igv ? 'Sí' : 'No', d.retention]
          : [d.detraccion ? (d.detraccion_amount ?? 0) : '', d.detraccion_ref]),
        d.paid_via ? PAID_VIA[d.paid_via] : '',
        d.paid_on,
        d.annulled ? 'Sí' : 'No',
        d.notes,
        d.files.map((f) => f.name).join(' | '),
      ]
    })
  // BOM para que Excel lea bien las tildes; «;» como separador.
  return '﻿' + [head, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n')
}

export function summaryCsv(period: string, m: MonthSummary) {
  const rows: [string, number][] = [
    ['Ventas gravadas (base)', m.ventasGravadas],
    ['Exportación de servicios', m.ventasExportacion],
    ['Otras ventas sin IGV', m.ventasOtras],
    ['Ingresos netos del mes', m.ingresosNetos],
    ['IGV de ventas', m.igvVentas],
    ['Crédito fiscal (IGV de compras)', m.creditoFiscal],
    ['Saldo a favor del mes anterior', m.saldoAnterior],
    ['IGV a pagar (estimado)', m.igvPagar],
    ['Saldo a favor para el mes siguiente', m.saldoFavor],
    [`Pago a cuenta del Impuesto a la Renta (${(m.tasaPagoCuenta * 100).toFixed(1)} %)`, m.pagoCuenta],
    ['Retenciones de recibos por honorarios', m.retenciones],
    ['Detracciones de ventas del mes', m.detracciones],
    ['Total estimado a pagar', m.totalPagar],
    ['Ingresos netos acumulados del año', m.acumuladoAnual],
  ]
  return '﻿' + [['Concepto', `Monto S/ (${period})`], ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n')
}

// Nombre de archivo seguro para el ZIP: «2026-11-05 F001-123 Proveedor.pdf».
export function exportName(d: FinDoc, f: DocFile, i: number) {
  const ext = f.name.includes('.') ? f.name.slice(f.name.lastIndexOf('.')) : ''
  const base = [d.issued_on, docNumber(d) || DOC_TYPES[d.doc_type].short, d.party_name]
    .join(' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w .-]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90)
  return `${d.direction === 'venta' ? 'ventas' : 'compras'}/${base}${i ? ` (${i + 1})` : ''}${ext}`
}

// ——— ZIP sin compresión (los PDF e imágenes ya vienen comprimidos), sin dependencias ———
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

export function crc32(data: Uint8Array) {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export function zip(entries: { name: string; data: Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder()
  const now = new Date()
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)
  const day = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()
  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  const seen = new Set<string>()
  for (const e of entries) {
    let name = e.name
    for (let i = 2; seen.has(name); i++) name = e.name.replace(/(\.[^./]+)?$/, ` (${i})$1`)
    seen.add(name)
    const nameBytes = enc.encode(name)
    const crc = crc32(e.data)
    const local = new Uint8Array(30 + nameBytes.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(6, 0x0800, true) // nombres en UTF-8
    lv.setUint16(8, 0, true)
    lv.setUint16(10, time, true)
    lv.setUint16(12, day, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, e.data.length, true)
    lv.setUint32(22, e.data.length, true)
    lv.setUint16(26, nameBytes.length, true)
    local.set(nameBytes, 30)
    const cd = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(cd.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0x0800, true)
    cv.setUint16(10, 0, true)
    cv.setUint16(12, time, true)
    cv.setUint16(14, day, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, e.data.length, true)
    cv.setUint32(24, e.data.length, true)
    cv.setUint16(28, nameBytes.length, true)
    cv.setUint32(42, offset, true)
    cd.set(nameBytes, 46)
    parts.push(local, e.data)
    central.push(cd)
    offset += local.length + e.data.length
  }
  const cdSize = central.reduce((a, c) => a + c.length, 0)
  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, entries.length, true)
  ev.setUint16(10, entries.length, true)
  ev.setUint32(12, cdSize, true)
  ev.setUint32(16, offset, true)
  const out = new Uint8Array(offset + cdSize + 22)
  let p = 0
  for (const x of [...parts, ...central, end]) {
    out.set(x, p)
    p += x.length
  }
  return out
}

// ——— Gastos fijos ———
// Un proveedor es «fijo» si su último gasto se marcó así. Se recuerda en cada mes siguiente
// (hasta el mes actual) mientras no tenga un gasto registrado en ese mes.
export const partyKey = (d: Pick<FinDoc, 'party_doc' | 'party_name'>) => `${(d.party_doc ?? '').trim()}|${d.party_name.trim().toLowerCase()}`

export function fijosPendientes(docs: FinDoc[], period: string, off: string[]) {
  if (period > currentPeriod()) return []
  const groups = new Map<string, FinDoc[]>()
  for (const d of active(docs)) {
    if (d.direction !== 'compra') continue
    const k = partyKey(d)
    groups.set(k, [...(groups.get(k) ?? []), d])
  }
  const out: { key: string; last: FinDoc }[] = []
  for (const [key, list] of groups) {
    const before = list.filter((d) => d.period < period)
    if (!before.length || list.some((d) => d.period === period) || off.includes(key)) continue
    const last = before.reduce((a, b) => (b.period > a.period || (b.period === a.period && b.issued_on > a.issued_on) ? b : a))
    if (last.fijo) out.push({ key, last })
  }
  return out.sort((a, b) => a.last.party_name.localeCompare(b.last.party_name, 'es'))
}
