// Vercel Function: POST /api/contact
// Valida la consulta, verifica Cloudflare Turnstile (si está configurado) y la
// envía por correo con Resend. No guarda los datos en ningún sitio.
//
// Variables de entorno (Vercel → Settings → Environment Variables):
//   RESEND_API_KEY        Clave de API de Resend.
//   CONTACT_TO            Buzón que recibe las consultas.
//   CONTACT_FROM          Remitente en un dominio verificado en Resend,
//                         p. ej. "ALIVE Web <web@dominio.com>".
//   TURNSTILE_SECRET_KEY  Clave secreta de Turnstile. Si falta, no se verifica.

type Payload = {
  name?: unknown
  email?: unknown
  company?: unknown
  message?: unknown
  website?: unknown
  turnstileToken?: unknown
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const LIMITS = { name: 120, email: 200, company: 160, message: 5000 }

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

async function verifyTurnstile(token: string, secret: string, ip: string | null) {
  const body = new URLSearchParams({ secret, response: token })
  if (ip) body.set('remoteip', ip)
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body })
  const data = (await res.json()) as { success?: boolean }
  return data.success === true
}

export async function POST(request: Request): Promise<Response> {
  const { RESEND_API_KEY, CONTACT_TO, CONTACT_FROM, TURNSTILE_SECRET_KEY } = process.env
  if (!RESEND_API_KEY || !CONTACT_TO || !CONTACT_FROM) {
    return json(503, { error: 'El formulario no está disponible ahora mismo. Inténtalo más tarde.' })
  }

  let payload: Payload
  try {
    payload = (await request.json()) as Payload
  } catch {
    return json(400, { error: 'No hemos podido leer el formulario.' })
  }

  // Campo trampa relleno: respondemos como si todo fuera bien y no enviamos nada.
  if (text(payload.website, 200)) return json(200, { ok: true })

  const name = text(payload.name, LIMITS.name)
  const email = text(payload.email, LIMITS.email)
  const company = text(payload.company, LIMITS.company)
  const message = text(payload.message, LIMITS.message)
  if (!name || !email || !message || !EMAIL_RE.test(email)) {
    return json(400, { error: 'Revisa los campos obligatorios e inténtalo de nuevo.' })
  }

  if (TURNSTILE_SECRET_KEY) {
    const token = text(payload.turnstileToken, 4096)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
    if (!token || !(await verifyTurnstile(token, TURNSTILE_SECRET_KEY, ip).catch(() => false))) {
      return json(403, { error: 'No hemos podido verificar el envío. Recarga la página e inténtalo de nuevo.' })
    }
  }

  const rows: [string, string][] = [
    ['Nombre', name],
    ['Correo', email],
    ['Empresa', company || '—'],
  ]
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;font-size:15px;line-height:1.6;color:#0b1218">
      <p style="margin:0 0 16px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#4a4f57">Nueva consulta desde la web</p>
      ${rows.map(([k, v]) => `<p style="margin:0"><strong>${k}:</strong> ${escapeHtml(v)}</p>`).join('')}
      <p style="margin:16px 0 4px"><strong>¿Qué quiere construir?</strong></p>
      <p style="margin:0;white-space:pre-wrap">${escapeHtml(message)}</p>
    </div>`
  const plain = `${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n¿Qué quiere construir?\n${message}`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: CONTACT_FROM,
      to: CONTACT_TO.split(',').map((s) => s.trim()),
      reply_to: email,
      subject: `Nuevo proyecto: ${name}${company ? ` (${company})` : ''}`,
      html,
      text: plain,
    }),
  }).catch(() => null)

  if (!res?.ok) {
    return json(502, { error: 'No hemos podido enviar tu mensaje. Inténtalo de nuevo en unos minutos.' })
  }
  return json(200, { ok: true })
}
