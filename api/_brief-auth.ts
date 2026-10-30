// Firma de los briefs. Al empezar, /api/brief-session verifica Turnstile y entrega un id con su firma;
// las subidas (/api/brief-upload), el envío (/api/brief) y los enlaces a archivos (/api/brief-file)
// solo aceptan peticiones con una firma válida. Los archivos con prefijo _ no son funciones en Vercel.
import { createHmac, timingSafeEqual } from 'node:crypto'

// Vida de una sesión de brief: tiempo para completarlo y subir archivos.
export const SESSION_TTL_MS = 48 * 60 * 60 * 1000
const ID_RE = /^[0-9a-f-]{36}$/

function secret() {
  const s = process.env.BRIEF_SECRET ?? process.env.BLOB_READ_WRITE_TOKEN
  if (!s) throw new Error('Falta BRIEF_SECRET o BLOB_READ_WRITE_TOKEN')
  return s
}

export const sign = (value: string) => createHmac('sha256', secret()).update(value).digest('base64url')

export function verify(value: string, signature: string) {
  const expected = Buffer.from(sign(value))
  const given = Buffer.from(signature)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

export type Session = { id: string; ts: number; sig: string }

export function parseSession(value: unknown): Session | null {
  if (!value || typeof value !== 'object') return null
  const { id, ts, sig } = value as Record<string, unknown>
  if (typeof id !== 'string' || !ID_RE.test(id) || typeof ts !== 'number' || typeof sig !== 'string') return null
  if (Date.now() - ts > SESSION_TTL_MS || ts > Date.now() + 60_000) return null
  return verify(`${id}.${ts}`, sig) ? { id, ts, sig } : null
}

export const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })

export async function verifyTurnstile(token: string, secret: string, ip: string | null) {
  const body = new URLSearchParams({ secret, response: token })
  if (ip) body.set('remoteip', ip)
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body })
  const data = (await res.json()) as { success?: boolean }
  return data.success === true
}

// Enlace firmado y permanente a un archivo privado del brief.
export const fileLink = (origin: string, pathname: string) =>
  `${origin}/api/brief-file?p=${encodeURIComponent(pathname)}&s=${sign(`file:${pathname}`)}`
