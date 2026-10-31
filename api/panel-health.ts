// Vercel Function: GET /api/panel-health
// Diagnóstico para el panel: ¿pueden las funciones de la web guardar briefs y consultas en Supabase?
// Solo responde a un administrador conectado (token de sesión del panel) y no devuelve datos de clientes.
import { json } from './_brief-auth.js'

const clean = (raw?: string) => raw?.trim().replace(/\/(rest|auth)\/v1.*$/, '').replace(/\/+$/, '')

export async function GET(request: Request): Promise<Response> {
  const url = clean(process.env.SUPABASE_URL)
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  const publicUrl = clean(process.env.VITE_SUPABASE_URL)
  if (!url || !key) {
    return json(200, { ok: false, reason: `Faltan en Vercel: ${[!url && 'SUPABASE_URL', !key && 'SUPABASE_SECRET_KEY'].filter(Boolean).join(' y ')}.` })
  }
  const headers: Record<string, string> = { apikey: key }
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`

  // ¿Quién pregunta? Solo administradores del panel.
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  const who = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` } }).catch(() => null)
  const email = who?.ok ? ((await who.json()) as { email?: string }).email?.toLowerCase() : undefined
  if (!email) {
    return json(who ? 401 : 200, {
      ok: false,
      reason: who
        ? 'No autorizado.'
        : 'Las funciones de la web no llegan a Supabase: revisa SUPABASE_URL en Vercel.',
      ...(publicUrl && publicUrl !== url ? { hint: 'SUPABASE_URL y VITE_SUPABASE_URL apuntan a proyectos distintos.' } : {}),
    })
  }
  const admin = await fetch(`${url}/rest/v1/panel_admins?select=email&email=eq.${encodeURIComponent(email)}`, { headers }).catch(() => null)
  if (!admin?.ok) {
    const detail = admin ? await admin.text().catch(() => '') : 'sin respuesta'
    return json(200, {
      ok: false,
      reason: `Las funciones no pueden leer la base de datos con SUPABASE_SECRET_KEY (${admin?.status ?? 'error'}). Revisa que sea la clave «secret» (sb_secret_…) o «service_role» del mismo proyecto.`,
      detail: detail.slice(0, 300),
    })
  }
  if (!((await admin.json()) as unknown[]).length) return json(401, { ok: false, reason: 'No autorizado.' })

  // Lectura de la tabla de clientes con la misma clave que usan los briefs para guardar.
  const probe = await fetch(`${url}/rest/v1/clients?select=id&limit=1`, { headers }).catch(() => null)
  if (!probe?.ok) {
    return json(200, {
      ok: false,
      reason: `La tabla clients no responde con la clave del servidor (${probe?.status ?? 'error'}). ¿Se ejecutó supabase/schema.sql en este proyecto?`,
      detail: (probe ? await probe.text().catch(() => '') : '').slice(0, 300),
    })
  }
  return json(200, {
    ok: true,
    ...(publicUrl && publicUrl !== url ? { warning: 'SUPABASE_URL y VITE_SUPABASE_URL apuntan a proyectos distintos: los briefs se guardan en un proyecto y el panel lee otro.' } : {}),
  })
}
