// Importa un brief al panel a partir del correo «Nuevo brief de proyecto» copiado y pegado.
// Sirve para los briefs que llegaron por correo pero no se guardaron (por ejemplo, si Supabase
// falló al enviarse). Lee el HTML del portapapeles: secciones, filas pregunta/respuesta, enlaces
// firmados a los archivos y el id del brief. Las respuestas que no coinciden con las preguntas
// actuales (versiones anteriores del brief) se guardan igual, como «otras respuestas».
import { steps, type Field } from '../brief/questions'
import type { ClientFile } from './data'

export type ImportedBrief = {
  briefId: string | null
  name: string
  email: string | null
  phone: string | null
  company: string | null
  sector: string | null
  answers: Record<string, unknown>
  files: ClientFile[]
  answered: number
}

const GROUPS: Record<string, string> = { Logo: 'logo', Fotos: 'fotos', 'Otros documentos': 'otros' }
const clean = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim()

// Gmail y Outlook a veces envuelven los enlaces en una redirección: se recupera el original.
function realHref(href: string) {
  try {
    const u = new URL(href)
    const inner = u.searchParams.get('q') ?? u.searchParams.get('url')
    if (inner?.includes('/api/brief-file')) return inner
  } catch {
    // href relativo o inválido: se devuelve tal cual
  }
  return href
}

function valueFor(field: Field, text: string): unknown {
  if (field.kind === 'chips') return text.split(/\s*·\s*/).filter(Boolean)
  if (field.kind === 'scales') {
    return text
      .split('\n')
      .map((line): string[] => line.match(/[●○]/g) ?? [])
      .filter((dots) => dots.length === 5)
      .map((dots) => dots.indexOf('●') + 1)
  }
  return text
}

export function parseBriefEmail(html: string, plain: string): ImportedBrief | null {
  const doc = new DOMParser().parseFromString(html || `<pre>${plain.replace(/</g, '&lt;')}</pre>`, 'text/html')
  const text = doc.body.innerText || doc.body.textContent || plain

  // Mapa pregunta → campo, distinguiendo por sección («¿Qué necesitas?» aparece en dos pasos).
  const bySection = new Map<string, Field>()
  const byLabel = new Map<string, Field>()
  for (const step of steps)
    for (const field of step.fields) {
      bySection.set(`${step.title.toLowerCase()}|${field.label}`, field)
      if (!byLabel.has(field.label)) byLabel.set(field.label, field)
    }

  const answers: Record<string, unknown> = {}
  const extra: { section: string; label: string; value: string }[] = []
  let answered = 0
  for (const h2 of doc.querySelectorAll('h2')) {
    const section = clean(h2.textContent)
    if (/^archivos$/i.test(section)) continue
    let table = h2.nextElementSibling
    while (table && table.tagName !== 'TABLE' && table.tagName !== 'H2') table = table.nextElementSibling
    if (!table || table.tagName !== 'TABLE') continue
    for (const row of table.querySelectorAll('tr')) {
      const cells = row.querySelectorAll('td')
      if (cells.length < 2) continue
      const label = clean(cells[0].textContent)
      const cell = cells[1].cloneNode(true) as HTMLElement
      cell.querySelectorAll('br').forEach((br) => br.replaceWith('\n'))
      const value = (cell.textContent ?? '').split('\n').map(clean).filter(Boolean).join('\n')
      if (!label || !value) continue
      answered++
      const field = bySection.get(`${section.toLowerCase()}|${label}`) ?? byLabel.get(label)
      if (field && !(field.id in answers)) answers[field.id] = valueFor(field, value)
      else extra.push({ section, label, value })
    }
  }
  if (extra.length) answers._extra = extra

  // Archivos: enlaces firmados del correo, con su grupo y tamaño.
  const files: ClientFile[] = []
  for (const a of doc.querySelectorAll('a')) {
    const href = realHref(a.getAttribute('href') ?? '')
    if (!href.includes('/api/brief-file')) continue
    const list = a.closest('ul')
    let label = list?.previousElementSibling
    while (label && !label.querySelector('strong') && label.tagName !== 'H2') label = label.previousElementSibling
    const group = GROUPS[clean(label?.querySelector('strong')?.textContent)] ?? 'otros'
    const mb = Number(clean(a.parentElement?.textContent).match(/\(([\d.]+)\s*MB\)/)?.[1] ?? 0)
    files.push({ name: clean(a.textContent), size: Math.round(mb * 1024 * 1024), group, url: href })
  }

  // Cabecera: marca (h1) y «nombre · correo».
  const company = clean(doc.querySelector('h1')?.textContent) || (answers.marca as string) || null
  const headline = clean(doc.querySelector('h1')?.nextElementSibling?.textContent)
  const [headName, headEmail] = headline.split(' · ')
  const name = (answers.nombre as string) || headName || ''
  const email = (answers.email as string) || headEmail || text.match(/[^\s@]+@[^\s@]+\.[a-z]{2,}/i)?.[0] || null
  const briefId = text.match(/Brief ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)?.[1] ?? null

  if (!name && !company) return null
  return {
    briefId,
    name: name || company || 'Sin nombre',
    email,
    phone: (answers.whatsapp as string) || null,
    company,
    sector: (answers.sector as string) || null,
    answers,
    files,
    answered,
  }
}
