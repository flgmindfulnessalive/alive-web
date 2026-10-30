// Acceso a Supabase desde el panel. Solo usa la clave pública: lo que se puede leer o editar lo
// deciden las reglas de seguridad por filas (supabase/schema.sql), que solo dejan pasar a panel_admins.
import { createClient } from '@supabase/supabase-js'

// Solo el origen del proyecto (https://xxxx.supabase.co): si se copió con /rest/v1 u otra ruta, se quita.
const cleanUrl = (raw?: string) => raw?.trim().replace(/\/(rest|auth)\/v1.*$/, '').replace(/\/+$/, '') || undefined
const url = cleanUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined)
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const configured = Boolean(url && key)
export const supabase = configured ? createClient(url!, key!, { auth: { persistSession: true, detectSessionInUrl: true } }) : null

export const STAGES = [
  { id: 'nuevo', label: 'Nuevo' },
  { id: 'conversacion', label: 'En conversación' },
  { id: 'propuesta', label: 'Propuesta enviada' },
  { id: 'ganado', label: 'Ganado' },
  { id: 'perdido', label: 'Perdido' },
] as const

export type Stage = (typeof STAGES)[number]['id']

export type ClientFile = { name: string; size: number; group: string; url: string }

export type Client = {
  id: string
  created_at: string
  updated_at: string
  source: 'brief' | 'contacto' | 'manual'
  stage: Stage
  name: string
  email: string | null
  phone: string | null
  company: string | null
  sector: string | null
  message: string | null
  value: number | null
  brief_id: string | null
  answers: Record<string, unknown> | null
  files: ClientFile[]
}

export type Note = { id: string; client_id: string; created_at: string; author: string | null; body: string }

export const SOURCE_LABEL: Record<Client['source'], string> = { brief: 'Brief', contacto: 'Formulario', manual: 'Manual' }
