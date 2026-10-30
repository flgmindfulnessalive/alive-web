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

export type TurnstileHandle = {
  token: () => string | null
  // Espera a que Turnstile termine (en móvil puede tardar unos segundos). null si falla o se agota el tiempo.
  waitForToken: (timeoutMs?: number) => Promise<string | null>
  reset: () => void
}

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
  const waiters = useRef<((t: string | null) => void)[]>([])
  const settle = (t: string | null) => {
    token.current = t
    waiters.current.splice(0).forEach((resolve) => resolve(t))
  }

  useImperativeHandle(ref, () => ({
    token: () => token.current,
    waitForToken: (timeoutMs = 15000) =>
      token.current || !TURNSTILE_SITE_KEY
        ? Promise.resolve(token.current)
        : new Promise((resolve) => {
            const timer = setTimeout(() => {
              waiters.current = waiters.current.filter((w) => w !== done)
              resolve(null)
            }, timeoutMs)
            const done = (t: string | null) => {
              clearTimeout(timer)
              resolve(t)
            }
            waiters.current.push(done)
          }),
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
          callback: (t: string) => settle(t),
          'expired-callback': () => (token.current = null),
          'error-callback': () => settle(null),
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
