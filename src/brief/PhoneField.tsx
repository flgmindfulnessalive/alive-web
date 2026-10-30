import { useEffect, useId, useMemo, useRef, useState } from 'react'

// Banderas en SVG (flag-icons, MIT): Windows no muestra los emojis de bandera.
// Solo se incluyen las de esta lista y se cargan al abrir el selector.
const FLAGS = import.meta.glob(
  '/node_modules/flag-icons/flags/4x3/{pe,ar,bo,br,ca,cl,co,cr,cu,de,do,ec,es,fr,gb,gt,hn,it,mx,ni,nl,pa,pr,pt,py,sv,us,uy,ve,ch,au,jp}.svg',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>
const flag = (code: string) => FLAGS[`/node_modules/flag-icons/flags/4x3/${code}.svg`]

type Country = { code: string; name: string; dial: string }

// Perú primero; el resto, por orden alfabético.
const COUNTRIES: Country[] = [
  { code: 'pe', name: 'Perú', dial: '+51' },
  { code: 'de', name: 'Alemania', dial: '+49' },
  { code: 'ar', name: 'Argentina', dial: '+54' },
  { code: 'au', name: 'Australia', dial: '+61' },
  { code: 'bo', name: 'Bolivia', dial: '+591' },
  { code: 'br', name: 'Brasil', dial: '+55' },
  { code: 'ca', name: 'Canadá', dial: '+1' },
  { code: 'cl', name: 'Chile', dial: '+56' },
  { code: 'co', name: 'Colombia', dial: '+57' },
  { code: 'cr', name: 'Costa Rica', dial: '+506' },
  { code: 'cu', name: 'Cuba', dial: '+53' },
  { code: 'ec', name: 'Ecuador', dial: '+593' },
  { code: 'sv', name: 'El Salvador', dial: '+503' },
  { code: 'es', name: 'España', dial: '+34' },
  { code: 'us', name: 'Estados Unidos', dial: '+1' },
  { code: 'fr', name: 'Francia', dial: '+33' },
  { code: 'gt', name: 'Guatemala', dial: '+502' },
  { code: 'hn', name: 'Honduras', dial: '+504' },
  { code: 'it', name: 'Italia', dial: '+39' },
  { code: 'jp', name: 'Japón', dial: '+81' },
  { code: 'mx', name: 'México', dial: '+52' },
  { code: 'ni', name: 'Nicaragua', dial: '+505' },
  { code: 'nl', name: 'Países Bajos', dial: '+31' },
  { code: 'pa', name: 'Panamá', dial: '+507' },
  { code: 'py', name: 'Paraguay', dial: '+595' },
  { code: 'pt', name: 'Portugal', dial: '+351' },
  { code: 'pr', name: 'Puerto Rico', dial: '+1' },
  { code: 'gb', name: 'Reino Unido', dial: '+44' },
  { code: 'do', name: 'República Dominicana', dial: '+1' },
  { code: 'ch', name: 'Suiza', dial: '+41' },
  { code: 'uy', name: 'Uruguay', dial: '+598' },
  { code: 've', name: 'Venezuela', dial: '+58' },
]

// País elegido por campo, para recuperarlo al volver a un paso (+1 lo comparten varios países).
const remembered = new Map<string, Country>()
const fromValue = (value: string) =>
  [...COUNTRIES].sort((x, y) => y.dial.length - x.dial.length).find((c) => value.startsWith(`${c.dial} `))

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

type Props = {
  id: string
  label: string
  value: string
  describedBy?: string
  invalid?: boolean
  onChange: (value: string) => void
}

// Teléfono con selector de país. Guarda «+51 999 999 999» (prefijo + número) en un solo campo.
export function PhoneField({ id, label, value, describedBy, invalid, onChange }: Props) {
  const [country, setCountry] = useState(() => remembered.get(id) ?? fromValue(value) ?? COUNTRIES[0])
  const [number, setNumber] = useState(() => value.replace(/^\+\d+\s*/, ''))
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const wrap = useRef<HTMLDivElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const listId = useId()

  const results = useMemo(() => {
    const q = fold(query.trim())
    return q ? COUNTRIES.filter((c) => fold(c.name).includes(q) || c.dial.includes(q)) : COUNTRIES
  }, [query])

  const emit = (c: Country, n: string) => onChange(n.trim() ? `${c.dial} ${n.trim()}` : '')

  useEffect(() => {
    if (!open) return
    search.current?.focus()
    const onDoc = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('pointerdown', onDoc)
    return () => document.removeEventListener('pointerdown', onDoc)
  }, [open])

  function choose(c: Country) {
    remembered.set(id, c)
    setCountry(c)
    setOpen(false)
    setQuery('')
    emit(c, number)
    document.getElementById(id)?.focus()
  }

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div ref={wrap} className={`phone${invalid ? ' is-invalid' : ''}`}>
        <button
          type="button"
          className="phone__country"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Código de país: ${country.name} ${country.dial}. Cambiar`}
          onClick={() => {
            setActive(0)
            setOpen((o) => !o)
          }}
        >
          <img src={flag(country.code)} alt="" width="22" height="16" />
          <span>{country.dial}</span>
          <svg viewBox="0 0 12 12" aria-hidden="true">
            <path d="M3 4.5l3 3 3-3" />
          </svg>
        </button>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="999 999 999"
          value={number}
          maxLength={20}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          onChange={(e) => {
            const n = e.target.value.replace(/[^\d\s()-]/g, '')
            setNumber(n)
            emit(country, n)
          }}
        />
        {open && (
          <div className="phone__menu">
            <input
              ref={search}
              className="phone__search"
              type="search"
              placeholder="Buscar país o código"
              aria-label="Buscar país o código"
              aria-controls={listId}
              aria-activedescendant={results[active] ? `${listId}-${results[active].code}` : undefined}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActive(0)
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setActive((a) => Math.min(a + 1, results.length - 1))
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setActive((a) => Math.max(a - 1, 0))
                } else if (e.key === 'Enter') {
                  e.preventDefault()
                  if (results[active]) choose(results[active])
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  setOpen(false)
                }
              }}
            />
            <ul id={listId} role="listbox" aria-label="Países">
              {results.map((c, i) => (
                <li
                  key={c.code}
                  id={`${listId}-${c.code}`}
                  role="option"
                  aria-selected={c.code === country.code}
                  className={i === active ? 'is-active' : undefined}
                  onPointerEnter={() => setActive(i)}
                  onClick={() => choose(c)}
                >
                  <img src={flag(c.code)} alt="" width="22" height="16" loading="lazy" />
                  <span className="phone__name">{c.name}</span>
                  <span className="phone__dial">{c.dial}</span>
                </li>
              ))}
              {!results.length && <li className="phone__empty">Sin resultados. Escribe el número con su prefijo.</li>}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
