// Lectura del XML de un comprobante electrónico SUNAT (UBL 2.1): factura, boleta, nota de crédito o de débito.
// Se lee en el navegador, sin enviar el archivo a ningún servicio. Los datos salen exactos del XML.
import type { DocType, Operation, PartyDocType } from './finanzas'

export type XmlParty = { docType: PartyDocType; doc: string; name: string }

export type ParsedXml = {
  docType: DocType
  series: string
  number: string
  issuedOn: string
  currency: 'PEN' | 'USD' | string
  supplier: XmlParty
  customer: XmlParty
  operation: Operation
  base: number
  igv: number
  total: number
  detraccion: { percent: number; amount: number } | null
}

export class XmlError extends Error {}

const SCHEME: Record<string, PartyDocType> = { '6': '6', '1': '1', '4': '4', '7': '7', '0': '0', '-': '0', A: '0' }

// Hijos directos con ese nombre local (los XML de SUNAT usan prefijos cbc:/cac: que pueden variar).
const kids = (el: Element | null | undefined, name: string) => (el ? Array.from(el.children).filter((c) => c.localName === name) : [])
const kid = (el: Element | null | undefined, name: string) => kids(el, name)[0] ?? null
const path = (el: Element | null | undefined, ...names: string[]) => names.reduce<Element | null>((acc, n) => kid(acc, n), el ?? null)
const text = (el: Element | null | undefined) => el?.textContent?.trim() ?? ''
const amount = (el: Element | null | undefined) => {
  const n = Number(text(el))
  return Number.isFinite(n) ? n : 0
}

function partyOf(root: Element, role: 'AccountingSupplierParty' | 'AccountingCustomerParty'): XmlParty {
  const party = path(root, role, 'Party')
  const idEl = path(party, 'PartyIdentification', 'ID')
  const name = text(path(party, 'PartyLegalEntity', 'RegistrationName')) || text(path(party, 'PartyName', 'Name'))
  return { docType: SCHEME[idEl?.getAttribute('schemeID') ?? ''] ?? '6', doc: text(idEl), name }
}

export function parseInvoiceXml(source: string): ParsedXml {
  const xml = new DOMParser().parseFromString(source, 'application/xml')
  if (xml.getElementsByTagName('parsererror').length) throw new XmlError('El archivo no es un XML válido.')
  const root = xml.documentElement
  if (root.localName === 'ApplicationResponse')
    throw new XmlError('Este XML es la constancia de recepción de SUNAT (CDR), no el comprobante. Sube el XML de la factura o boleta.')

  let docType: DocType
  if (root.localName === 'CreditNote') docType = '07'
  else if (root.localName === 'DebitNote') docType = '08'
  else if (root.localName === 'Invoice') {
    const code = text(kid(root, 'InvoiceTypeCode'))
    docType = code === '03' ? '03' : '01'
  } else throw new XmlError('No es un comprobante electrónico de SUNAT (factura, boleta o nota).')

  const id = text(kid(root, 'ID'))
  const [series, ...rest] = id.split('-')
  const number = rest.join('-').replace(/^0+(?=\d)/, '')

  // Impuestos por tributo: 1000 IGV, 9995 exportación, 9997 exonerado, 9998 inafecto.
  let base = 0
  let igv = 0
  const by: Record<string, number> = {}
  for (const tax of kids(root, 'TaxTotal')) {
    for (const sub of kids(tax, 'TaxSubtotal')) {
      const scheme = text(path(sub, 'TaxCategory', 'TaxScheme', 'ID'))
      const taxable = amount(kid(sub, 'TaxableAmount'))
      by[scheme] = (by[scheme] ?? 0) + taxable
      if (scheme === '1000') {
        base += taxable
        igv += amount(kid(sub, 'TaxAmount'))
      }
    }
  }
  const monetary = kid(root, 'LegalMonetaryTotal') ?? kid(root, 'RequestedMonetaryTotal')
  const total = amount(kid(monetary, 'PayableAmount')) || amount(kid(monetary, 'TaxInclusiveAmount'))
  const operation: Operation = base > 0 ? 'gravada' : by['9995'] ? 'exportacion' : by['9997'] || by['9998'] ? 'exonerada' : 'no_gravada'
  if (operation !== 'gravada') base = by['9995'] || by['9997'] || by['9998'] || total

  // Detracción: forma de pago «Detraccion» con porcentaje y monto.
  let detraccion: ParsedXml['detraccion'] = null
  for (const term of kids(root, 'PaymentTerms')) {
    if (/detracci/i.test(text(kid(term, 'ID')))) detraccion = { percent: amount(kid(term, 'PaymentPercent')), amount: amount(kid(term, 'Amount')) }
  }

  if (!series || !total) throw new XmlError('No se encontraron la serie o el total en el XML.')
  return {
    docType,
    series,
    number,
    issuedOn: text(kid(root, 'IssueDate')),
    currency: text(kid(root, 'DocumentCurrencyCode')) || 'PEN',
    supplier: partyOf(root, 'AccountingSupplierParty'),
    customer: partyOf(root, 'AccountingCustomerParty'),
    operation,
    base: Math.round(base * 100) / 100,
    igv: Math.round(igv * 100) / 100,
    total: Math.round(total * 100) / 100,
    detraccion,
  }
}
