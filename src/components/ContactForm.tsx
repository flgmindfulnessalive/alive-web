import { useId, useRef, useState, type FormEvent } from 'react'
import { contact } from '../content/site'
import { activeAdapter, type ContactSubmission } from '../lib/contactAdapter'
import { useReveal } from '../lib/useReveal'
import { Sculpture } from './Sculpture'
import { TURNSTILE_SITE_KEY, Turnstile, type TurnstileHandle } from './Turnstile'
import { WHATSAPP, WHATSAPP_ICON, whatsappUrl } from '../content/whatsapp'
import './ContactForm.css'

type Field = 'name' | 'email' | 'company' | 'message'
type Errors = Partial<Record<Field, string>>
type Status = 'idle' | 'submitting' | 'demo' | 'sent' | 'error'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function validate(data: ContactSubmission): Errors {
  const errors: Errors = {}
  if (!data.name.trim()) errors.name = 'Indica tu nombre.'
  if (!data.email.trim()) errors.email = 'Indica tu correo.'
  else if (!EMAIL_RE.test(data.email.trim())) errors.email = 'Revisa el formato del correo.'
  if (!data.message.trim()) errors.message = 'Cuéntanos brevemente qué quieres construir.'
  return errors
}

export function ContactForm() {
  const id = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const statusRef = useRef<HTMLParagraphElement>(null)
  const turnstileRef = useRef<TurnstileHandle>(null)
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const headRef = useReveal<HTMLDivElement>()

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data: ContactSubmission = {
      name: String(fd.get('name') ?? ''),
      email: String(fd.get('email') ?? ''),
      company: String(fd.get('company') ?? '') || undefined,
      message: String(fd.get('message') ?? ''),
      honeypot: String(fd.get('website') ?? ''),
    }
    const found = validate(data)
    setErrors(found)
    const first = Object.keys(found)[0] as Field | undefined
    if (first) {
      setStatus('idle')
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      return
    }

    if (!activeAdapter.isDemo && TURNSTILE_SITE_KEY) {
      data.spamToken = turnstileRef.current?.token() ?? undefined
      if (!data.spamToken) {
        setErrorMessage('Estamos comprobando que el envío es seguro. Inténtalo de nuevo en unos segundos.')
        setStatus('error')
        statusRef.current?.focus()
        return
      }
    }

    setStatus('submitting')
    const result = await activeAdapter.submit(data)
    if (!activeAdapter.isDemo) turnstileRef.current?.reset()
    if (result.status === 'error') {
      setErrorMessage(result.message)
      setStatus('error')
    } else {
      setStatus(result.status)
      if (result.status === 'sent') formRef.current?.reset()
    }
    statusRef.current?.focus()
  }

  const clearError = (field: Field) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const fieldProps = (field: Field, required: boolean) => ({
    id: `${id}-${field}`,
    name: field,
    required,
    'aria-required': required || undefined,
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `${id}-${field}-error` : undefined,
    onInput: () => clearError(field),
  })

  const errorFor = (field: Field) =>
    errors[field] && (
      <p id={`${id}-${field}-error`} className="field__error">
        {errors[field]}
      </p>
    )

  return (
    <section id="contacto" className="section contact" aria-labelledby="contact-title">
      <Sculpture variant="closing" className="contact__sculpture" />

      <div className="container contact__inner">
        <div ref={headRef} className="contact__head reveal">
          <p className="eyebrow eyebrow--rule">Hablemos</p>
          <h2 id="contact-title" className="h2 contact__heading">
            {contact.title}
          </h2>
          <p className="lead contact__text">{contact.text}</p>
          <a className="contact__whatsapp" href={whatsappUrl()} target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={WHATSAPP_ICON} />
            </svg>
            <span>
              ¿Prefieres WhatsApp? <strong>{WHATSAPP.display}</strong>
            </span>
          </a>
        </div>

        <form ref={formRef} className="contact__form" noValidate onSubmit={onSubmit}>
          {activeAdapter.isDemo && (
            <p className="contact__demo" role="note">
              <span aria-hidden="true" className="contact__demo-dot" />
              {contact.demoNotice}
            </p>
          )}

          <div className="contact__fields">
            <div className="field">
              <label htmlFor={`${id}-name`}>
                Nombre <span className="field__req">(obligatorio)</span>
              </label>
              <input type="text" autoComplete="name" {...fieldProps('name', true)} />
              {errorFor('name')}
            </div>

            <div className="field">
              <label htmlFor={`${id}-email`}>
                Correo <span className="field__req">(obligatorio)</span>
              </label>
              <input type="email" autoComplete="email" inputMode="email" {...fieldProps('email', true)} />
              {errorFor('email')}
            </div>

            <div className="field">
              <label htmlFor={`${id}-company`}>
                Empresa <span className="field__req">(opcional)</span>
              </label>
              <input type="text" autoComplete="organization" {...fieldProps('company', false)} />
            </div>

            <div className="field field--wide">
              <label htmlFor={`${id}-message`}>
                ¿Qué quieres construir? <span className="field__req">(obligatorio)</span>
              </label>
              <textarea rows={4} {...fieldProps('message', true)} />
              {errorFor('message')}
            </div>

            {/* Campo trampa antispam: oculto para personas y lectores de pantalla. */}
            <div className="field--trap" aria-hidden="true">
              <label htmlFor={`${id}-website`}>Web</label>
              <input id={`${id}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>
          </div>

          {!activeAdapter.isDemo && <Turnstile ref={turnstileRef} />}

          <div className="contact__actions">
            <button type="submit" className="btn btn-primary" disabled={status === 'submitting'}>
              {contact.submitLabel}
              <span className="arrow" aria-hidden="true">→</span>
            </button>
            {contact.privacyHref && (
              <p className="contact__privacy">
                Usaremos tus datos solo para responder tu consulta. Más información en el{' '}
                <a href={contact.privacyHref}>aviso de privacidad</a>.
              </p>
            )}
          </div>

          <p
            ref={statusRef}
            tabIndex={-1}
            className={`contact__status${status === 'error' ? ' is-error' : ''}`}
            role="status"
            aria-live="polite"
          >
            {status === 'demo' && contact.demoSuccess}
            {status === 'sent' && 'Gracias. Hemos recibido tu mensaje.'}
            {status === 'error' && errorMessage}
          </p>
        </form>
      </div>
    </section>
  )
}
