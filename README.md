# ALIVE — Homepage (demo)

Homepage responsive de ALIVE construida con React 19, TypeScript, Vite y CSS con variables de diseño. Sin dependencias de UI, sin rastreadores y sin envío real de datos.

## Comandos

```bash
npm install
npm run dev        # desarrollo en http://localhost:5173
npm run build      # tipos + compilación en dist/ + portada prerenderizada (scripts/prerender.mjs)
npm run preview    # sirve dist/ en http://localhost:4173
npm run lint       # oxlint
npm run brand          # regenera escultura y OG desde brand-source/ (Python 3 + Pillow + NumPy)
npm run explorations   # regenera los renders de las exploraciones (Playwright + Chromium)
npm run social         # regenera miniatura OG y publicación cuadrada (Playwright + Chromium)
npm run icons          # regenera favicon (SVG + ICO) e iconos de app desde la A del logo
npm run blog           # genera el blog desde content/blog/ (lo hacen solos dev y build)
npm run blog-covers    # imágenes para compartir de cada artículo (public/blog/<slug>.jpg)
npm run propuesta -- propuestas/datos/<archivo>.json   # propuesta comercial en PDF
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
privacidad/index.html       Aviso de privacidad (Ley 29733, Perú)
prensa/index.html           Menciones en prensa (recortes en public/prensa/)
content/blog/*.md           Artículos del blog (Markdown con cabecera)
scripts/build-blog.mjs      Genera blog/, el sitemap y el índice que activa el enlace «Blog»
src/secondary.ts            Menú móvil de las páginas secundarias (cabecera insertada por vite.config.ts)
    Wordmark.tsx            Wordmark ALIVE (trazado en assets/brand/paths.ts)
    Sculpture.tsx           Escultura fluida de la marca
brand-source/               Originales de marca entregados
scripts/process-brand.py    Extrae la escultura y genera la imagen OG
scripts/render-explorations.mjs  Renderiza las dos exploraciones visuales
```

## Editar contenido

- Textos, servicios y pasos: `src/content/site.ts`.
- Proyectos: añade elementos a `work.projects` y su imagen en `src/components/explorations.ts`. `featured: true` lo muestra a todo el ancho; `gallery` con una pieza la muestra en pareja, con dos en mosaico y con tres en fila de cuatro cuadradas; `url` lo enlaza (ahora ninguno lleva enlace).
- Aviso de privacidad: define `contact.privacyHref` y aparecerá junto al botón de envío.
- Enlaces legales y redes: añádelos a `footerLinks` cuando existan destinos reales.

## Blog

1. Copia `content/blog/_ejemplo.md` a un archivo nuevo, por ejemplo `content/blog/mi-articulo.md` (el nombre es la URL: `/blog/mi-articulo/`).
2. Edita la cabecera: `title`, `description` (≈150 caracteres), `date` (AAAA-MM-DD) y opcionalmente `author`, `order` (desempata artículos del mismo día), `cover` (imagen dentro del artículo) e `image` (imagen para compartir). Quita `draft: true`.
   Para crear la imagen para compartir con el título: `npm run blog-covers` y pon `image: /blog/<slug>.jpg`.
3. Escribe en Markdown y sube el cambio a `main`.

El enlace «Blog» aparece en el menú y en el pie en cuanto hay un artículo publicado. Cada artículo lleva botones para compartir (WhatsApp, LinkedIn, X, Facebook, copiar enlace y, en móvil, el menú nativo) bajo el autor y al final; son enlaces directos, sin scripts de terceros. Cada artículo genera su página estática con canonical, Open Graph y JSON-LD `BlogPosting`, y entra en el sitemap. Para ver borradores en local: `BLOG_DRAFTS=1 npm run dev`.

## Brief de proyecto (`/brief-form/`)

Formulario por pasos para clientes (no se indexa ni aparece en el menú: se comparte por enlace). Se adapta al tipo de proyecto: un tronco común (contacto, proyecto, objetivo, público, estilo, archivos) y un paso propio para cada tipo marcado (Sitio web, Marca e identidad, Producto digital o app, IA y automatización). Enlaces directos por servicio: `/brief-form/?tipo=web`, `?tipo=marca`, `?tipo=producto`, `?tipo=ia`. Las preguntas están en `src/brief/questions.ts`, que usan tanto el formulario como el correo. Los archivos se suben desde el navegador directamente a un **Blob Store privado de Vercel**; las respuestas y los enlaces firmados a los archivos llegan por correo con Resend, y el cliente recibe una confirmación.

Funciones: `api/brief-session.ts` (verifica Turnstile y abre una sesión firmada de 48 h), `api/brief-upload.ts` (autoriza subidas solo en la carpeta de esa sesión, con tipos y tamaños permitidos), `api/brief.ts` (envía el brief) y `api/brief-file.ts` (abre o borra archivos con firma). Variables: las del formulario de contacto, más `BLOB_READ_WRITE_TOKEN` (la crea Vercel al conectar el Blob Store) y, recomendado, `BRIEF_SECRET` (firma de sesiones y enlaces; si falta, se usa el token de Blob).

## Panel de ALIVE (`/panel/`)

Gestión de clientes con Supabase: tablero por etapas (Nuevo, En conversación, Propuesta enviada, Ganado, Perdido) con arrastrar y soltar, lista con búsqueda, ficha con las respuestas del brief, archivos, valor y notas internas, y alta manual. Los briefs y las consultas del formulario entran solos (`api/_db.ts`); si Supabase falla, el correo se envía igual.

Acceso con correo y contraseña (o enlace al correo si se olvida), solo para cuentas creadas en Supabase → Authentication y listadas en `panel_admins`. El esquema y las reglas de seguridad por filas están en `supabase/schema.sql`. Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (clave publishable), `SUPABASE_URL` y `SUPABASE_SECRET_KEY`.

## Propuestas comerciales

Cada propuesta es un archivo de datos en `propuestas/datos/` (copia `ejemplo-web-esencial.json` para Web Esencial o `ejemplo-web-esencial-panel.json` para la versión con panel): cliente, fecha, validez, moneda (`USD`, `PEN` o `EUR`), precio, `panel` (true/false), porcentajes de adelanto y saldo, plazo, rondas de cambios, acompañamiento, alojamiento mensual opcional y regla de pausa (días sin respuesta y días hasta el cierre). Las condiciones por defecto siguen la ficha operativa de Web Esencial: 70/30, hasta 10 días hábiles desde el material completo, 2 rondas, 10 días de acompañamiento, alojamiento aparte (US$ 10/mes) y pausa a los 10 días hábiles sin respuesta con cierre a los 30 días. `npm run propuesta -- propuestas/datos/<archivo>.json` genera `propuestas/salida/<slug>.pdf` (A4, 7 páginas) con la identidad de ALIVE. Lo que falte (por ejemplo, `precio: null`) sale marcado en amarillo para que no se envíe incompleto. Los PDF generados no se suben al repositorio.

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

- `dominio.com`: `A` → la IP que indique Vercel (en este proyecto, `216.198.79.1`)
- `www.dominio.com`: `CNAME` → el valor propio del proyecto (p. ej. `xxxx.vercel-dns-017.com`)

Con el DNS en GoDaddy, elimina el registro `A @ Parked` y no añadas registros `NS` de Vercel dentro de la zona.

HTTPS se activa automáticamente.

### Seguridad
`vercel.json` añade CSP (permite solo recursos propios y Turnstile), HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy` y bloqueo de iframes, y caché inmutable para `/assets`.

### Aviso de privacidad
`privacidad/index.html` está publicado y adaptado a la Ley N.º 29733 (Perú). Si cambian los proveedores, el plazo de conservación o se añade analítica, actualiza el texto y la fecha.

Variables locales de ejemplo en `.env.example`.
