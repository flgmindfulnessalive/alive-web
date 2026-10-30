# ALIVE — Homepage (demo)

Homepage responsive de ALIVE construida con React 19, TypeScript, Vite y CSS con variables de diseño. Sin dependencias de UI, sin rastreadores y sin envío real de datos.

## Comandos

```bash
npm install
npm run dev        # desarrollo en http://localhost:5173
npm run build      # comprobación de tipos + compilación en dist/
npm run preview    # sirve dist/ en http://localhost:4173
npm run lint       # oxlint
npm run brand          # regenera escultura y OG desde brand-source/ (Python 3 + Pillow + NumPy)
npm run explorations   # regenera los renders de las exploraciones (Playwright + Chromium)
```

## Estructura

```
src/
  content/site.ts           Todo el copy, servicios, pasos y proyectos (editable)
  lib/contactAdapter.ts     Adaptador de envío del formulario (demo / real)
  lib/useReveal.ts          Entradas suaves con IntersectionObserver
  styles/tokens.css         Tokens: color, tipografía, espaciado, movimiento
  styles/global.css         Base, retícula, botones, utilidades
  components/
    Header.tsx              Sticky 80 px, menú móvil accesible (Escape, foco, inert)
    Hero.tsx                H1, CTAs, firma y escultura
    CapabilityStrip.tsx     Banda estática ESTRATEGIA / DISEÑO / TECNOLOGÍA / IA
    WorkGallery.tsx         Dos exploraciones visuales + ProjectModal (<dialog>)
    explorations.ts         Imágenes de las exploraciones (srcset 1200/2400)
    Manifesto.tsx           Posicionamiento con iluminación por palabra al hacer scroll
    StudioServices.tsx      Sección marfil: estudio y tres servicios
    Process.tsx             Cuatro pasos con raíl ligado al scroll
    ContactForm.tsx         Formulario con validación y aviso de demo
    Footer.tsx
    Turnstile.tsx           Widget antispam de Cloudflare (solo si hay site key)
api/contact.ts              Vercel Function: valida, verifica Turnstile y envía con Resend
privacidad/index.html       Aviso de privacidad (borrador)
    Wordmark.tsx            Wordmark ALIVE (trazado en assets/brand/paths.ts)
    Sculpture.tsx           Escultura fluida de la marca
brand-source/               Originales de marca entregados
scripts/process-brand.py    Extrae la escultura y genera la imagen OG
scripts/render-explorations.mjs  Renderiza las dos exploraciones visuales
```

## Editar contenido

- Textos, servicios y pasos: `src/content/site.ts`.
- Proyectos: añade elementos a `work.projects`. Usa `kind: 'case'` y `client` solo con casos autorizados; las piezas `exploration` muestran siempre «Exploración visual».
- Aviso de privacidad: define `contact.privacyHref` y aparecerá junto al botón de envío.
- Enlaces legales y redes: añádelos a `footerLinks` cuando existan destinos reales.

## Verificación realizada

- Anchos 1440, 1024, 768 y 390 px: sin desbordamiento horizontal (`scrollWidth === clientWidth`).
- Un único H1; todas las anclas apuntan a secciones existentes; enlace «Saltar al contenido».
- Menú móvil: `aria-expanded`, foco al primer enlace, Escape cierra y devuelve el foco, contenido detrás `inert`.
- Modal: `<dialog>` nativo, Escape y clic fuera cierran, el foco vuelve a la tarjeta.
- Formulario: errores por campo con `aria-invalid`/`aria-describedby`, foco al primer error, aviso de demo visible, mensaje de validación completada, cero peticiones de red, sin localStorage/sessionStorage, consola limpia.
- `prefers-reduced-motion`: sin animaciones ni desplazamientos.
- Contraste (WCAG AA): texto secundario #A1A1AA 7,4:1 sobre #080F14; botón #2563EB con texto blanco 5,2:1 (#3B82F6 se reserva para enlaces/acentos, 5,1:1 sobre fondo); texto secundario en marfil #4A4F57 7,6:1.

Capturas en `docs/screenshots/`. Recursos y pendientes en `ASSETS.md`.

## Despliegue (Vercel)

Vercel detecta Vite (`vercel.json`) y publica la carpeta `dist/`. La función `api/contact.ts` se despliega sola como Vercel Function.

### 1. Importar el proyecto
vercel.com → Add New → Project → importa el repositorio de GitHub. No hace falta cambiar ajustes de build.

### 2. Variables de entorno (Settings → Environment Variables)

| Variable | Dónde se usa | Valor |
|---|---|---|
| `VITE_SITE_URL` | Build | URL principal sin barra final, p. ej. `https://dominio.com` |
| `VITE_CONTACT_ENDPOINT` | Build | `/api/contact` (vacío = modo demo) |
| `VITE_TURNSTILE_SITE_KEY` | Build | Site key de Cloudflare Turnstile |
| `RESEND_API_KEY` | Función | Clave de API de Resend |
| `CONTACT_TO` | Función | Buzón que recibe las consultas (varios separados por comas) |
| `CONTACT_FROM` | Función | `ALIVE Web <web@dominio.com>`, en un dominio verificado en Resend |
| `TURNSTILE_SECRET_KEY` | Función | Secret key de Turnstile |

Las `VITE_*` se incrustan en el build: tras cambiarlas, vuelve a desplegar.

### 3. Resend
Resend → Domains → añade el dominio y crea los registros DNS que indique (SPF/DKIM). Hasta verificarlo solo puede enviar desde `onboarding@resend.dev` al correo de la propia cuenta.

### 4. Cloudflare Turnstile
Cloudflare → Turnstile → Add widget → modo **Managed**, dominios: el dominio con y sin `www` (y `*.vercel.app` para las previews si quieres probar ahí).

### 5. Dominio con y sin www
Vercel → Settings → Domains → añade `dominio.com` y `www.dominio.com`. Elige uno como principal y el otro redirige con 308. Registros DNS habituales (usa los que muestre Vercel):

- `dominio.com`: `A` → `76.76.21.21`
- `www.dominio.com`: `CNAME` → `cname.vercel-dns.com`

HTTPS se activa automáticamente.

### Seguridad
`vercel.json` añade CSP (permite solo recursos propios y Turnstile), HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy` y bloqueo de iframes, y caché inmutable para `/assets`.

### Aviso de privacidad
`privacidad/index.html` es un **borrador** con `noindex`: completa los textos entre corchetes, haz que lo revise un profesional y quita el `noindex` y el aviso de borrador.

Variables locales de ejemplo en `.env.example`.
