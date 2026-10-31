// URL del proyecto de Supabase para las funciones. Acepta SUPABASE_URL tal como se suele copiar
// (con /rest/v1, con barra final, la URL del dashboard o solo el id del proyecto) y, si no es
// válida, usa VITE_SUPABASE_URL, que es la misma dirección pública que usa el panel.
const REF = /^[a-z0-9]{20}$/

export function normalizeSupabaseUrl(raw?: string): string | null {
  let v = raw?.trim().replace(/^["']|["']$/g, '')
  if (!v) return null
  const dash = v.match(/supabase\.com\/dashboard\/project\/([a-z0-9]{20})/)
  if (dash) return `https://${dash[1]}.supabase.co`
  if (REF.test(v)) return `https://${v}.supabase.co`
  if (!/^https?:\/\//.test(v)) v = `https://${v}`
  try {
    const u = new URL(v)
    if (u.protocol !== 'https:' || !u.hostname.endsWith('.supabase.co')) return null
    return u.origin
  } catch {
    return null
  }
}

// Describe el problema del valor sin mostrarlo (para el aviso del panel).
export function describeSupabaseUrl(raw?: string): string {
  const v = raw?.trim() ?? ''
  if (!v) return 'SUPABASE_URL está vacía.'
  if (/\s/.test(v)) return 'SUPABASE_URL tiene espacios.'
  if (v.includes('supabase.com/dashboard')) return 'SUPABASE_URL es la dirección del dashboard de Supabase, no la del proyecto.'
  if (!/^https:\/\//.test(v)) return 'SUPABASE_URL no empieza por https://.'
  if (!/\.supabase\.co(\/|$)/.test(v)) return 'SUPABASE_URL no termina en .supabase.co.'
  return 'SUPABASE_URL no responde.'
}

export const supabaseUrl = () => normalizeSupabaseUrl(process.env.SUPABASE_URL) ?? normalizeSupabaseUrl(process.env.VITE_SUPABASE_URL)
