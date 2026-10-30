// Vercel Function: POST /api/brief
// Recibe las respuestas del brief, comprueba la sesión firmada, lista los archivos subidos a su
// carpeta privada de Vercel Blob y envía todo por correo con Resend: el brief completo a ALIVE
// (responder va al cliente) y una confirmación breve al cliente. Las respuestas no se guardan.
//
// Variables: RESEND_API_KEY, CONTACT_TO, CONTACT_FROM (como /api/contact) y BLOB_READ_WRITE_TOKEN.
import { list } from '@vercel/blob'
import { BRIEF_LIMITS, isVisible, steps, validateStep, type Answers, type Field } from '../src/brief/questions.js'
import { fileLink, json, parseSession } from './_brief-auth.js'
import { briefConfirmation } from './_email.js'

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const GROUP_LABEL: Record<string, string> = { logo: 'Logo', fotos: 'Fotos', otros: 'Otros documentos' }

// Limpia las respuestas: solo campos conocidos, con su tipo y longitud máxima.
function clean(raw: unknown): Answers {
  const input = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const out: Answers = {}
  for (const field of steps.flatMap((s) => s.fields)) {
    const v = input[field.id]
    if (field.kind === 'chips') {
      if (Array.isArray(v)) out[field.id] = v.filter((x): x is string => typeof x === 'string' && field.options.includes(x))
    } else if (field.kind === 'choice') {
      if (typeof v === 'string' && field.options.includes(v)) out[field.id] = v
    } else if (field.kind === 'scales') {
      if (Array.isArray(v)) out[field.id] = field.scales.map((_, i) => Math.min(5, Math.max(1, Math.round(Number(v[i]) || 3))))
    } else if (field.kind === 'consent') {
      out[field.id] = v === true
    } else if (field.kind !== 'files' && typeof v === 'string') {
      out[field.id] = v.trim().slice(0, field.kind === 'textarea' ? BRIEF_LIMITS.textarea : BRIEF_LIMITS.text)
    }
  }
  return out
}

function answerHtml(field: Field, a: Answers): string | null {
  const v = a[field.id]
  if (field.kind === 'scales') {
    if (!Array.isArray(v)) return null
    return field.scales
      .map(([l, r], i) => {
        const n = Number(v[i])
        const dots = [1, 2, 3, 4, 5].map((k) => (k === n ? '●' : '○')).join(' ')
        return `${escapeHtml(l)} <span style="letter-spacing:2px;color:#2f6bff">${dots}</span> ${escapeHtml(r)}`
      })
      .join('<br>')
  }
  if (Array.isArray(v)) return v.length ? v.map((x) => escapeHtml(String(x))).join(' · ') : null
  if (typeof v === 'string' && v) return escapeHtml(v).replace(/\n/g, '<br>')
  return null
}

export async function POST(request: Request): Promise<Response> {
  const { RESEND_API_KEY, CONTACT_TO, CONTACT_FROM } = process.env
  if (!RESEND_API_KEY || !CONTACT_TO || !CONTACT_FROM) {
    return json(503, { error: 'El brief no está disponible ahora mismo. Inténtalo más tarde.' })
  }

  let payload: { session?: unknown; answers?: unknown; website?: unknown }
  try {
    payload = (await request.json()) as typeof payload
  } catch {
    return json(400, { error: 'No hemos podido leer el brief.' })
  }
  // Campo trampa: respondemos como si todo fuera bien.
  if (typeof payload.website === 'string' && payload.website.trim()) return json(200, { ok: true })

  const session = parseSession(payload.session)
  if (!session) return json(403, { error: 'La sesión del brief caducó. Recarga la página y vuelve a enviarlo.' })

  const answers = clean(payload.answers)
  const invalid = steps.find((s) => Object.keys(validateStep(s, answers)).length > 0)
  if (invalid) return json(400, { error: `Revisa el paso «${invalid.title}»: falta algún dato obligatorio.` })

  // Archivos: los que hay de verdad en la carpeta del brief, no los que diga el navegador.
  const origin = new URL(request.url).origin
  let files: { pathname: string; size: number }[] = []
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const res = await list({ prefix: `briefs/${session.id}/`, limit: BRIEF_LIMITS.files * 2 }).catch(() => null)
    files = (res?.blobs ?? []).map((b) => ({ pathname: b.pathname, size: b.size }))
  }

  const nombre = String(answers.nombre)
  const marca = String(answers.marca)
  const sections = steps
    .map((step) => {
      const rows = step.fields
        .filter((f) => f.kind !== 'files' && f.kind !== 'consent' && isVisible(f, answers))
        .map((f) => {
          const value = answerHtml(f, answers)
          return value
            ? `<tr><td style="padding:8px 16px 8px 0;vertical-align:top;color:#4a4f57;width:38%">${escapeHtml(f.label)}</td><td style="padding:8px 0;vertical-align:top">${value}</td></tr>`
            : ''
        })
        .join('')
      return rows
        ? `<h2 style="margin:28px 0 6px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#7c3aed">${escapeHtml(step.title)}</h2><table style="width:100%;border-collapse:collapse;border-top:1px solid #e6e3dc">${rows}</table>`
        : ''
    })
    .join('')

  const groups = ['logo', 'fotos', 'otros']
    .map((g) => {
      const items = files.filter((f) => f.pathname.split('/')[2] === g)
      if (!items.length) return ''
      const links = items
        .map((f) => {
          const name = f.pathname.split('/').pop() ?? ''
          return `<li style="margin:4px 0"><a href="${fileLink(origin, f.pathname)}" style="color:#2f6bff">${escapeHtml(name)}</a> <span style="color:#8a8f97">(${(f.size / 1024 / 1024).toFixed(1)} MB)</span></li>`
        })
        .join('')
      return `<p style="margin:12px 0 4px"><strong>${GROUP_LABEL[g]}</strong></p><ul style="margin:0;padding-left:18px">${links}</ul>`
    })
    .join('')
  const filesHtml = `<h2 style="margin:28px 0 6px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#7c3aed">Archivos</h2>${
    groups || '<p style="margin:0;color:#4a4f57">No subió archivos.</p>'
  }`

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;font-size:15px;line-height:1.6;color:#0b1218;max-width:680px">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#4a4f57">Nuevo brief de proyecto</p>
      <h1 style="margin:0 0 4px;font-size:24px;font-weight:600">${escapeHtml(marca)}</h1>
      <p style="margin:0;color:#4a4f57">${escapeHtml(nombre)} · ${escapeHtml(String(answers.email))}</p>
      ${sections}
      ${filesHtml}
      <p style="margin:28px 0 0;font-size:12px;color:#8a8f97">Brief ${session.id}. Los enlaces a archivos son privados: no los reenvíes.</p>
    </div>`

  const send = (body: Record<string, unknown>) =>
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: CONTACT_FROM, ...body }),
    }).catch(() => null)

  const res = await send({
    to: CONTACT_TO.split(',').map((s) => s.trim()),
    reply_to: String(answers.email),
    subject: `Brief: ${marca} (${nombre})`,
    html,
  })
  if (!res?.ok) return json(502, { error: 'No hemos podido enviar tu brief. Inténtalo de nuevo en unos minutos.' })

  // Confirmación al cliente, con la plantilla de marca y sin repetir sus respuestas
  // (no reenviamos texto libre a terceros).
  const confirmation = briefConfirmation({ nombre, marca, files: files.length })
  await send({
    to: [String(answers.email)],
    reply_to: CONTACT_TO.split(',')[0].trim(),
    subject: `Recibimos tu brief, ${nombre.split(' ')[0]} · ALIVE`,
    html: confirmation.html,
    text: confirmation.text,
  })

  return json(200, { ok: true, files: files.length })
}
