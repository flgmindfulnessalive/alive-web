// Vercel Function: POST /api/brief-session
// Verifica Turnstile (si está configurado) y abre una sesión de brief: un id y su firma,
// que el formulario usa para subir archivos y enviar las respuestas.
import { randomUUID } from 'node:crypto'
import { json, sign, verifyTurnstile } from './_brief-auth.js'

export async function POST(request: Request): Promise<Response> {
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BRIEF_SECRET) {
    return json(503, { error: 'El brief no está disponible ahora mismo. Inténtalo más tarde.' })
  }
  let body: { turnstileToken?: unknown } = {}
  try {
    body = (await request.json()) as typeof body
  } catch {
    // cuerpo vacío: válido si no hay Turnstile
  }

  const secret = process.env.TURNSTILE_SECRET_KEY
  if (secret) {
    const token = typeof body.turnstileToken === 'string' ? body.turnstileToken.slice(0, 4096) : ''
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
    if (!token || !(await verifyTurnstile(token, secret, ip).catch(() => false))) {
      return json(403, { error: 'No hemos podido verificar que no eres un robot. Recarga la página e inténtalo de nuevo.' })
    }
  }

  const id = randomUUID()
  const ts = Date.now()
  return json(200, { id, ts, sig: sign(`${id}.${ts}`) })
}
