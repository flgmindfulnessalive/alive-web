// Guarda briefs y consultas en Supabase para el panel de ALIVE (tabla clients).
// Usa la API REST con la clave secreta (no pasa por las reglas de seguridad por filas).
// Si Supabase no está configurado o falla, no bloquea: el correo se envía igual.
//
// Variables: SUPABASE_URL y SUPABASE_SECRET_KEY (clave «secret» o la antigua «service_role»).

export type ClientRow = {
  source: 'brief' | 'contacto'
  name: string
  email?: string
  phone?: string
  company?: string
  sector?: string
  message?: string
  brief_id?: string
  answers?: Record<string, unknown>
  files?: { name: string; size: number; group: string; url: string }[]
}

export async function saveClient(row: ClientRow): Promise<boolean> {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return false
  const headers: Record<string, string> = {
    apikey: key,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  }
  // Las claves antiguas (JWT) también van en Authorization; las nuevas (sb_secret_…), solo en apikey.
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`
  const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/clients`, {
    method: 'POST',
    headers,
    body: JSON.stringify(row),
  }).catch(() => null)
  if (!res?.ok) console.error('No se pudo guardar en Supabase', res?.status, await res?.text().catch(() => ''))
  return !!res?.ok
}
