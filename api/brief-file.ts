// Vercel Function: /api/brief-file
//   GET ?p=<ruta>&s=<firma>  Sirve un archivo privado del brief solo con un enlace firmado (los del correo).
//   DELETE {session, pathname} Borra un archivo que el cliente quitó antes de enviar el brief.
import { del, get } from '@vercel/blob'
import { json, parseSession, verify } from './_brief-auth.js'

export async function DELETE(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as { session?: unknown; pathname?: unknown }
  const session = parseSession(body.session)
  const pathname = typeof body.pathname === 'string' ? body.pathname : ''
  if (!session || !pathname.startsWith(`briefs/${session.id}/`) || pathname.includes('..')) {
    return json(403, { error: 'No permitido.' })
  }
  await del(pathname).catch(() => {})
  return json(200, { ok: true })
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const pathname = url.searchParams.get('p') ?? ''
  const signature = url.searchParams.get('s') ?? ''
  if (!pathname.startsWith('briefs/') || !signature || !verify(`file:${pathname}`, signature)) {
    return new Response('Enlace no válido.', { status: 403, headers: { 'Cache-Control': 'no-store' } })
  }

  const blob = await get(pathname, { access: 'private' }).catch(() => null)
  if (!blob?.stream) return new Response('El archivo ya no está disponible.', { status: 404 })

  const name = pathname.split('/').pop() ?? 'archivo'
  return new Response(blob.stream, {
    headers: {
      'Content-Type': blob.blob.contentType || 'application/octet-stream',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(name)}`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  })
}
