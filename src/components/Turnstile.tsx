import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'

// Cloudflare Turnstile en modo «solo si hace falta interacción»: la mayoría de
// visitantes no ven nada. Se carga solo si existe VITE_TURNSTILE_SITE_KEY.
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string
  reset: (id: string) => void
  remove: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

export type TurnstileHandle = { token: () => string | null; reset: () => void }

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let loading: Promise<TurnstileApi> | null = null

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile')))
    script.onerror = () => reject(new Error('turnstile'))
    document.head.appendChild(script)
  })
  return loading
}

export function Turnstile({ ref }: { ref: Ref<TurnstileHandle> }) {
  const container = useRef<HTMLDivElement>(null)
  const widget = useRef<string | null>(null)
  const token = useRef<string | null>(null)

  useImperativeHandle(ref, () => ({
    token: () => token.current,
    reset: () => {
      token.current = null
      if (widget.current) window.turnstile?.reset(widget.current)
    },
  }))

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return
    let cancelled = false
    loadTurnstile()
      .then((api) => {
        if (cancelled || !container.current) return
        widget.current = api.render(container.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: 'dark',
          size: 'flexible',
          appearance: 'interaction-only',
          language: 'es',
          callback: (t: string) => (token.current = t),
          'expired-callback': () => (token.current = null),
          'error-callback': () => (token.current = null),
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
      if (widget.current) window.turnstile?.remove(widget.current)
      widget.current = null
    }
  }, [])

  if (!TURNSTILE_SITE_KEY) return null
  return <div ref={container} className="contact__turnstile" />
}
