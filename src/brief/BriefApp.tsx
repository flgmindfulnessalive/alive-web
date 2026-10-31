import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type ReactNode } from 'react'
import { upload } from '@vercel/blob/client'
import wordmarkUrl from '../assets/brand/alive-wordmark.svg'
import { TURNSTILE_SITE_KEY, Turnstile, type TurnstileHandle } from '../components/Turnstile'
import { PhoneField } from './PhoneField'
import {
  ALLOWED_TYPES,
  BRIEF_LIMITS,
  isVisible,
  activeSteps,
  typeFromQuery,
  validateStep,
  type Answers,
  type Field,
  type FileGroup,
} from './questions'

type Session = { id: string; ts: number; sig: string }
type Phase = 'intro' | 'form' | 'review' | 'sent'
type Upload = {
  key: string
  group: FileGroup['id']
  name: string
  size: number
  progress: number
  status: 'uploading' | 'done' | 'error'
  pathname?: string
  error?: string
}

const MB = 1024 * 1024
const formatSize = (bytes: number) => (bytes < MB ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / MB).toFixed(1)} MB`)
// Nombre de archivo seguro para la ruta: sin acentos, espacios ni símbolos raros.
const safeName = (name: string) => {
  const dot = name.lastIndexOf('.')
  const base = (dot > 0 ? name.slice(0, dot) : name).normalize('NFD').replace(/[̀-ͯ]/g, '')
  const ext = dot > 0 ? name.slice(dot).toLowerCase() : ''
  return `${base.replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'archivo'}${ext}`
}
// El navegador no siempre informa el tipo (p. ej. .ai, .heic); se deduce de la extensión.
const EXT_TYPES: Record<string, string> = {
  '.ai': 'application/postscript',
  '.eps': 'application/postscript',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.svg': 'image/svg+xml',
}
const fileType = (file: File) => file.type || EXT_TYPES[file.name.slice(file.name.lastIndexOf('.')).toLowerCase()] || ''

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Algo falló. Inténtalo de nuevo.')
  return data
}

export function BriefApp() {
  const [phase, setPhase] = useState<Phase>('intro')
  const [index, setIndex] = useState(0)
  // ?tipo=web|marca|producto|ia: enlace directo por servicio, con el tipo ya marcado.
  const [answers, setAnswers] = useState<Answers>(() => {
    const preset = typeFromQuery(new URLSearchParams(location.search).get('tipo'))
    return { personalidad: [3, 3, 3, 3], ...(preset ? { tipos: [preset] } : {}) }
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [session, setSession] = useState<Session | null>(null)
  const [uploads, setUploads] = useState<Upload[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [trap, setTrap] = useState('')
  const turnstile = useRef<TurnstileHandle>(null)
  const heading = useRef<HTMLHeadingElement>(null)

  // Al cambiar de paso: arriba del todo y el foco en el título, para lectores de pantalla.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
    heading.current?.focus()
  }, [phase, index])

  // Aviso si se intenta salir con el brief a medias.
  useEffect(() => {
    if (phase !== 'form' && phase !== 'review') return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [phase])

  const set = (id: string, value: Answers[string]) => {
    setAnswers((a) => ({ ...a, [id]: value }))
    setErrors((e) => (e[id] ? Object.fromEntries(Object.entries(e).filter(([k]) => k !== id)) : e))
  }

  async function start() {
    setBusy(true)
    setMessage(null)
    try {
      // Si Turnstile aún verifica (habitual en móvil), se espera aquí en vez de pedir otro toque.
      const token = turnstile.current?.token() ?? (await turnstile.current?.waitForToken(15000)) ?? null
      if (TURNSTILE_SITE_KEY && !token)
        throw new Error('No pudimos verificar la conexión. Recarga la página y vuelve a intentarlo.')
      setSession((await postJson('/api/brief-session', { turnstileToken: token })) as Session)
      setPhase('form')
    } catch (error) {
      setMessage((error as Error).message)
      turnstile.current?.reset()
    } finally {
      setBusy(false)
    }
  }

  // Los pasos dependen de los tipos de proyecto marcados.
  const steps = activeSteps(answers)
  const step = steps[Math.min(index, steps.length - 1)]
  const uploading = uploads.some((u) => u.status === 'uploading')

  function next() {
    const found = validateStep(step, answers)
    setErrors(found)
    if (Object.keys(found).length) {
      document.getElementById(`f-${Object.keys(found)[0]}`)?.focus()
      return
    }
    if (index < steps.length - 1) setIndex(index + 1)
    else setPhase('review')
  }

  function addFiles(group: FileGroup['id'], list: FileList | File[]) {
    if (!session) return
    const files = [...list]
    const room = BRIEF_LIMITS.files - uploads.filter((u) => u.status !== 'error').length
    files.forEach((file, i) => {
      const key = `${Date.now()}-${i}-${file.name}`
      const type = fileType(file)
      const problem =
        i >= room
          ? `Máximo ${BRIEF_LIMITS.files} archivos. Para más, comparte un enlace.`
          : file.size > BRIEF_LIMITS.fileSize
            ? `Pesa más de ${BRIEF_LIMITS.fileSize / MB} MB. Compártelo con un enlace.`
            : !ALLOWED_TYPES.includes(type)
              ? 'Este tipo de archivo no se admite.'
              : null
      const item: Upload = { key, group, name: file.name, size: file.size, progress: 0, status: problem ? 'error' : 'uploading', error: problem ?? undefined }
      setUploads((u) => [...u, item])
      if (problem) return
      upload(`briefs/${session.id}/${group}/${safeName(file.name)}`, file, {
        access: 'private',
        handleUploadUrl: '/api/brief-upload',
        clientPayload: JSON.stringify(session),
        contentType: type,
        multipart: file.size > 8 * MB,
        onUploadProgress: ({ percentage }) =>
          setUploads((u) => u.map((x) => (x.key === key ? { ...x, progress: percentage } : x))),
      })
        .then((blob) => setUploads((u) => u.map((x) => (x.key === key ? { ...x, status: 'done', progress: 100, pathname: blob.pathname } : x))))
        .catch(() =>
          setUploads((u) => u.map((x) => (x.key === key ? { ...x, status: 'error', error: 'No se pudo subir. Inténtalo de nuevo.' } : x))),
        )
    })
  }

  async function removeFile(item: Upload) {
    setUploads((u) => u.filter((x) => x.key !== item.key))
    if (item.pathname && session) {
      await fetch('/api/brief-file', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, pathname: item.pathname }),
      }).catch(() => {})
    }
  }

  async function send() {
    setBusy(true)
    setMessage(null)
    try {
      await postJson('/api/brief', { session, answers, website: trap })
      setPhase('sent')
    } catch (error) {
      setMessage((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const progress = phase === 'intro' ? 0 : phase === 'form' ? (index + 1) / (steps.length + 1) : 1

  return (
    <div className="brief">
      <header className="brief__bar">
        <a href="/" className="brief__logo" aria-label="ALIVE, ir a la web">
          <img src={wordmarkUrl} alt="" width="92" height="18" />
        </a>
        <span className="brief__label">Brief de proyecto</span>
        <div className="brief__progress" aria-hidden="true">
          <span style={{ transform: `scaleX(${progress})` }} />
        </div>
      </header>

      {phase === 'intro' && (
        <main className="brief__intro container" id="contenido">
          <p className="eyebrow eyebrow--rule">Brief de proyecto</p>
          <h1 ref={heading} tabIndex={-1} className="brief__title">
            Cuéntanos tu proyecto.
            <span className="brief__grad"> Lo hacemos crecer juntos.</span>
          </h1>
          <p className="brief__lead">
            Con tus respuestas preparamos la reunión de arranque. Son pasos cortos, unos 10 minutos: solo te preguntamos
            lo que aplica a tu proyecto, y al final puedes subir tu logo, fotos y documentos.
          </p>
          <ul className="brief__promises">
            <li>Si no sabes algo, déjalo en blanco: lo vemos juntos.</li>
            <li>Tus archivos se guardan de forma privada y solo los ve el equipo de ALIVE.</li>
            <li>Al terminar te llega un correo de confirmación.</li>
          </ul>
          <Turnstile ref={turnstile} />
          <div className="brief__actions">
            <button type="button" className="btn btn-primary" onClick={start} disabled={busy}>
              {busy ? 'Verificando…' : 'Empezar'} <span className="arrow" aria-hidden="true">→</span>
            </button>
          </div>
          {message && <p className="brief__message" role="alert">{message}</p>}
        </main>
      )}

      {phase === 'form' && (
        <div className="brief__layout container">
          <nav className="brief__steps" aria-label="Pasos del brief">
            <ol>
              {steps.map((s, i) => (
                <li key={s.id} aria-current={i === index ? 'step' : undefined} className={i < index ? 'is-done' : undefined}>
                  <span className="brief__step-n">{String(i + 1).padStart(2, '0')}</span>
                  {s.title}
                </li>
              ))}
            </ol>
          </nav>
          <main id="contenido" className="brief__main">
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault()
                next()
              }}
            >
              <p className="brief__count">
                Paso {index + 1} de {steps.length}
              </p>
              <h1 ref={heading} tabIndex={-1} className="brief__step-title">
                {step.title}
              </h1>
              <p className="brief__step-intro">{step.intro}</p>
              <div className="brief__fields">
                {step.fields
                  .filter((f) => isVisible(f, answers))
                  .map((f) => (
                    <FieldView
                      key={f.id}
                      field={f}
                      value={answers[f.id]}
                      error={errors[f.id]}
                      onChange={(v) => set(f.id, v)}
                      uploads={uploads}
                      onFiles={addFiles}
                      onRemove={removeFile}
                    />
                  ))}
              </div>
              <div className="brief__nav">
                {index > 0 && (
                  <button type="button" className="brief__back" onClick={() => setIndex(index - 1)}>
                    ← Atrás
                  </button>
                )}
                <button type="submit" className="btn btn-primary" disabled={uploading && step.id === 'archivos'}>
                  {uploading && step.id === 'archivos' ? 'Subiendo archivos…' : index === steps.length - 1 ? 'Revisar' : 'Siguiente'}
                  <span className="arrow" aria-hidden="true">→</span>
                </button>
              </div>
            </form>
          </main>
        </div>
      )}

      {phase === 'review' && (
        <main id="contenido" className="brief__review container">
          <p className="eyebrow eyebrow--rule">Último paso</p>
          <h1 ref={heading} tabIndex={-1} className="brief__step-title">
            Revisa y envía
          </h1>
          <p className="brief__step-intro">Así nos llega tu brief. Puedes corregir cualquier parte antes de enviarlo.</p>
          {steps.map((s, i) => (
            <section key={s.id} className="brief__summary" aria-labelledby={`r-${s.id}`}>
              <div className="brief__summary-head">
                <h2 id={`r-${s.id}`}>{s.title}</h2>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => {
                    setIndex(i)
                    setPhase('form')
                  }}
                >
                  Editar
                </button>
              </div>
              <dl>
                {s.fields
                  .filter((f) => f.kind !== 'consent' && isVisible(f, answers))
                  .map((f) => (
                    <div key={f.id}>
                      <dt>{f.label}</dt>
                      <dd>{summary(f, answers, uploads)}</dd>
                    </div>
                  ))}
              </dl>
            </section>
          ))}
          {/* Campo trampa para bots: invisible para personas. */}
          <div className="field--trap" aria-hidden="true">
            <label>
              Web
              <input tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
            </label>
          </div>
          <div className="brief__nav">
            <button
              type="button"
              className="brief__back"
              onClick={() => {
                setIndex(steps.length - 1)
                setPhase('form')
              }}
            >
              ← Atrás
            </button>
            <button type="button" className="btn btn-primary" onClick={send} disabled={busy}>
              {busy ? 'Enviando…' : 'Enviar brief'} <span className="arrow" aria-hidden="true">→</span>
            </button>
          </div>
          {message && <p className="brief__message" role="alert">{message}</p>}
        </main>
      )}

      {phase === 'sent' && (
        <main id="contenido" className="brief__sent container">
          <div className="brief__check" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M5 12.5l4.2 4.2L19 7" />
            </svg>
          </div>
          <h1 ref={heading} tabIndex={-1} className="brief__title">
            Brief recibido.
            <span className="brief__grad"> Gracias, {String(answers.nombre ?? '').split(' ')[0]}.</span>
          </h1>
          <p className="brief__lead">
            Lo revisamos y te escribimos para agendar la reunión de arranque. Te enviamos una confirmación a{' '}
            <strong>{String(answers.email)}</strong>.
          </p>
          <a className="text-link" href="/">
            Volver a alivedigital.agency
          </a>
        </main>
      )}
    </div>
  )
}

function summary(field: Field, a: Answers, uploads: Upload[]): ReactNode {
  if (field.kind === 'files') {
    const done = uploads.filter((u) => u.status === 'done')
    return done.length ? done.map((u) => u.name).join(', ') : 'Sin archivos'
  }
  const v = a[field.id]
  if (field.kind === 'scales' && Array.isArray(v)) {
    return field.scales.map(([l, r], i) => `${l} ${'●'.repeat(Number(v[i]))}${'○'.repeat(5 - Number(v[i]))} ${r}`).join(' · ')
  }
  if (Array.isArray(v)) return v.length ? v.join(' · ') : '—'
  return typeof v === 'string' && v ? v : '—'
}

type FieldProps = {
  field: Field
  value: Answers[string]
  error?: string
  onChange: (value: Answers[string]) => void
  uploads: Upload[]
  onFiles: (group: FileGroup['id'], files: FileList | File[]) => void
  onRemove: (item: Upload) => void
}

function FieldView({ field, value, error, onChange, uploads, onFiles, onRemove }: FieldProps) {
  const id = `f-${field.id}`
  const describedBy = [field.kind !== 'consent' && field.hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined
  const required = 'required' in field && field.required
  const label = (
    <>
      {field.label}
      {required ? <span className="brief__req"> (obligatorio)</span> : null}
    </>
  )
  const hint = field.kind !== 'consent' && field.hint ? <p id={`${id}-hint`} className="brief__hint">{field.hint}</p> : null
  const err = error ? <p id={`${id}-error`} className="field__error">{error}</p> : null

  if (field.kind === 'chips' || field.kind === 'choice') {
    const multi = field.kind === 'chips'
    const selected = multi ? ((value as string[]) ?? []) : value
    return (
      <fieldset className="brief__group" aria-describedby={describedBy} aria-invalid={error ? true : undefined}>
        <legend>{label}</legend>
        {hint}
        <div className="brief__chips">
          {field.options.map((opt, i) => {
            const checked = multi ? (selected as string[]).includes(opt) : selected === opt
            return (
              <label key={opt} className="brief__chip">
                <input
                  id={i === 0 ? id : undefined}
                  type={multi ? 'checkbox' : 'radio'}
                  name={field.id}
                  checked={checked}
                  onChange={() =>
                    onChange(multi ? (checked ? (selected as string[]).filter((x) => x !== opt) : [...(selected as string[]), opt]) : opt)
                  }
                />
                <span>{opt}</span>
              </label>
            )
          })}
        </div>
        {err}
      </fieldset>
    )
  }

  if (field.kind === 'scales') {
    const values = (value as number[]) ?? field.scales.map(() => 3)
    return (
      <fieldset className="brief__group">
        <legend>{label}</legend>
        {hint}
        <div className="brief__scales">
          {field.scales.map(([l, r], i) => (
            <div key={l} className="brief__scale">
              <span aria-hidden="true">{l}</span>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={values[i]}
                aria-label={`${l} o ${r}`}
                aria-valuetext={['Muy ' + l.toLowerCase(), l, 'Equilibrada', r, 'Muy ' + r.toLowerCase()][values[i] - 1]}
                onChange={(e) => onChange(values.map((v, k) => (k === i ? Number(e.target.value) : v)))}
                style={{ '--v': (values[i] - 1) / 4 } as CSSProperties}
              />
              <span aria-hidden="true">{r}</span>
            </div>
          ))}
        </div>
      </fieldset>
    )
  }

  if (field.kind === 'files') {
    return (
      <div className="brief__files">
        {field.groups.map((g) => (
          <Dropzone key={g.id} group={g} items={uploads.filter((u) => u.group === g.id)} onFiles={onFiles} onRemove={onRemove} />
        ))}
        <p className="brief__hint">
          Hasta {BRIEF_LIMITS.files} archivos de {BRIEF_LIMITS.fileSize / MB} MB como máximo cada uno.
        </p>
      </div>
    )
  }

  if (field.kind === 'consent') {
    return (
      <div className="brief__consent">
        <label>
          <input id={id} type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} aria-invalid={error ? true : undefined} aria-describedby={describedBy} />
          <span>
            {field.label.replace('el aviso de privacidad.', '')}
            <a href="/privacidad/" target="_blank" rel="noopener">
              el aviso de privacidad
            </a>
            .
          </span>
        </label>
        {err}
      </div>
    )
  }

  if (field.kind === 'tel') {
    return (
      <>
        <PhoneField id={id} label={field.label} value={(value as string) ?? ''} describedBy={describedBy} invalid={!!error} onChange={onChange} />
        {err}
      </>
    )
  }

  const common = {
    id,
    value: (value as string) ?? '',
    placeholder: field.placeholder,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
  }
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {hint}
      {field.kind === 'textarea' ? (
        <textarea rows={4} maxLength={BRIEF_LIMITS.textarea} {...common} />
      ) : (
        <input
          type={field.kind}
          maxLength={BRIEF_LIMITS.text}
          autoComplete={field.id === 'nombre' ? 'name' : field.id === 'email' ? 'email' : field.id === 'marca' ? 'organization' : 'off'}
          inputMode={field.kind === 'url' ? 'url' : undefined}
          {...common}
        />
      )}
      {err}
    </div>
  )
}

function Dropzone({
  group,
  items,
  onFiles,
  onRemove,
}: {
  group: FileGroup
  items: Upload[]
  onFiles: FieldProps['onFiles']
  onRemove: FieldProps['onRemove']
}) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  return (
    <div className="brief__drop-wrap">
      <div
        className={`brief__drop${over ? ' is-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          onFiles(group.id, e.dataTransfer.files)
        }}
      >
        <svg className="brief__drop-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 15V4m0 0L7.5 8.5M12 4l4.5 4.5M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
        </svg>
        <div>
          <p className="brief__drop-title">{group.label}</p>
          <p className="brief__hint">{group.hint}</p>
        </div>
        <button type="button" className="brief__drop-btn" onClick={() => input.current?.click()}>
          Elegir archivos
        </button>
        <input
          ref={input}
          type="file"
          hidden
          multiple={group.multiple}
          accept={group.accept}
          aria-label={`Subir ${group.label.toLowerCase()}`}
          onChange={(e) => {
            if (e.target.files) onFiles(group.id, e.target.files)
            e.target.value = ''
          }}
        />
      </div>
      {items.length > 0 && (
        <ul className="brief__uploads" aria-live="polite">
          {items.map((u) => (
            <li key={u.key} className={`is-${u.status}`}>
              <span className="brief__upload-name">{u.name}</span>
              <span className="brief__upload-meta">
                {u.status === 'uploading' ? `${Math.round(u.progress)} %` : u.status === 'done' ? formatSize(u.size) : u.error}
              </span>
              <button type="button" className="brief__upload-x" onClick={() => onRemove(u)} aria-label={`Quitar ${u.name}`}>
                ×
              </button>
              {u.status === 'uploading' && (
                <span className="brief__upload-bar" aria-hidden="true">
                  <span style={{ transform: `scaleX(${u.progress / 100})` }} />
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
