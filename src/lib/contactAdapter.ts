// Adaptador de envío del formulario de contacto.
// Sin VITE_CONTACT_ENDPOINT se usa `demoAdapter`, que no envía ni guarda nada.
// Con VITE_CONTACT_ENDPOINT=/api/contact se envía por POST JSON a la Vercel
// Function de api/contact.ts (Resend + Turnstile).

export type ContactSubmission = {
  name: string
  email: string
  company?: string
  message: string
  // Campo trampa: los humanos lo dejan vacío.
  honeypot?: string
  // Token de Cloudflare Turnstile, verificado en el servidor.
  spamToken?: string
}

export type ContactResult =
  | { status: 'sent' }
  | { status: 'demo' }
  | { status: 'error'; message: string }

export interface ContactAdapter {
  readonly isDemo: boolean
  submit(data: ContactSubmission): Promise<ContactResult>
}

export const demoAdapter: ContactAdapter = {
  isDemo: true,
  async submit() {
    // Intencionadamente vacío: no se envían, registran ni persisten datos.
    return { status: 'demo' }
  },
}

// Ejemplo de adaptador real. No se usa hasta disponer de un endpoint verificado.
export function createFetchAdapter(endpoint: string): ContactAdapter {
  return {
    isDemo: false,
    async submit(data) {
      if (data.honeypot) return { status: 'sent' }
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            company: data.company ?? '',
            message: data.message,
            turnstileToken: data.spamToken,
          }),
        })
        if (res.ok) return { status: 'sent' }
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        return { status: 'error', message: body?.error ?? 'No hemos podido enviar tu mensaje. Inténtalo de nuevo.' }
      } catch {
        return { status: 'error', message: 'No hemos podido enviar tu mensaje. Revisa tu conexión.' }
      }
    },
  }
}

const endpoint = import.meta.env.VITE_CONTACT_ENDPOINT as string | undefined

export const activeAdapter: ContactAdapter = endpoint ? createFetchAdapter(endpoint) : demoAdapter
