# Inventario de assets y pendientes

Originales entregados (en `brand-source/`): banner de marca 2000×741 y símbolo de app 1254×1254, ambos WebP. A partir de ellos se generan los recursos de la web con `npm run brand` (`scripts/process-brand.py`).

| Recurso | Archivo | Origen | Estado |
|---|---|---|---|
| Wordmark ALIVE con ® | `src/assets/brand/paths.ts`, `alive-wordmark.svg` | Vectorizado del banner oficial (potrace, ×4) | Fiel al original; sustituir por el SVG maestro de la guía si existe |
| Wordmark ALIVE (SVG limpio) | `brand-source/logo/alive-logo.svg` (`currentColor`), `-negro.svg`, `-blanco.svg` | Reconstruido con geometría (rectas y arcos) desde el logotipo oficial: 99,4 % de coincidencia; 5 trazos + ® | Listo; aún no reemplaza al de la web |
| Símbolo A | `src/assets/brand/paths.ts`, `alive-symbol.svg` | Vectorizado del icono de app, sin ® | Igual que el anterior |
| Favicon e iconos | `public/favicon.svg` (A sola, adaptable claro/oscuro), `favicon.ico` (16/32/48), `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | A del logotipo: `npm run icons` | Listos |
| Escultura (hero) | `src/assets/visual/sculpture-hero.webp` 920×741, 28 KB | Banner oficial, textos eliminados, aplanada sobre el fondo de la web (#080F14) | Para pantallas retina conviene un original de 2400 px o más |
| Escultura (cierre) | `src/assets/visual/sculpture-closing.webp` 1560×741, 32 KB | Igual que el anterior | Igual que el anterior |
| Imagen Open Graph | `public/og-image.jpg` 1200×630 | Composición con titular, cinta real y dominio: `npm run social` | Lista |
| Publicación cuadrada | `docs/social/alive-post-1080.jpg` 1080×1080 | Igual que la anterior | Lista |
| Proyecto FLOW Talent HUB | `src/assets/visual/project-flow-{1000,1497}.webp` y `project-flow-{dispositivos,papeleria}-*.webp` (originales en `brand-source/proyectos/`) | Mockups entregados por ALIVE: plataforma, plataforma en dispositivos y papelería | Listo; destacado en mosaico (plataforma grande + dos piezas), sin enlace |
| Proyecto WeWebinars | `src/assets/visual/project-wewebinars-{web,campana,papeleria}-*.webp` (originales en `brand-source/proyectos/wewebinars/`) | Mockups entregados por ALIVE: papelería, web y campaña | Listo; destacado en mosaico (papelería grande + web y campaña), sin enlace |
| Proyecto GLUS Asociados Comerciales | `src/assets/visual/project-glus-{web,campana}-*.webp` (originales en `brand-source/proyectos/glus/`) | Mockups entregados por ALIVE: web en dispositivos y campaña | Listo; destacado en pareja (dos piezas enteras), sin enlace |
| Proyecto Campaña Vitara Vive – Suzuki | `src/assets/visual/project-vitara-{inicio,personaliza,galeria,tableta}-*.webp` (originales en `brand-source/proyectos/suzuki-vitara/`) | Mockups entregados por ALIVE (850 × 850) | Listo; destacado con cuatro piezas en fila, sin enlace. A 850 px, en pantallas retina grandes se ven algo blandas: convendría un original mayor |
| Proyecto Activa tu Vida X39 | `src/assets/visual/project-activa-{landing,simulador}-*.webp` (originales en `brand-source/proyectos/activa-tu-vida/`) | Mockups entregados por ALIVE: landing y simulador del Plan 10-10-20 | Listo; destacado en pareja, sin enlace |
| Exploración «Concepto de experiencia web» | `src/assets/visual/concept-web-{1200,2400}.webp` | Render de escena HTML/CSS (monitor y móvil en perspectiva) con marca, escultura e Inter reales: `npm run explorations` | Listo para demo; sustituir por render o mockup del estudio si existe |
| Exploración «Concepto de identidad» | `src/assets/visual/concept-identity-{1200,2400}.webp` | Render de papelería ALIVE sobre marfil (cuaderno con A en relieve, tarjetas, sobre) | Listo para demo; la fotografía real de papelería impresa lo superaría |
| Recortes de prensa | `public/prensa/*.webp` (originales en `brand-source/prensa/`) | Entregados por ALIVE: Correo 24/10/2015 y artículo sobre realidad virtual (Grupo Epensa) | Listos; falta confirmar medio y fecha del segundo |
| Tipografía Inter | `@fontsource-variable/inter` (autoalojada) | SIL Open Font License 1.1 | En uso, sustituto provisional de Suisse Int'l |
| Suisse Int'l | — | Comercial (Swiss Typefaces) | **No incluida.** Añadir `.woff2` con licencia web como `'Suisse Intl'`; `--font-display` ya la prioriza |

## Recursos que mejorarían la calidad

1. Los SVG maestros del wordmark y del símbolo (los actuales son vectorizaciones muy fieles, pero no los maestros).
2. La escultura en alta resolución (2400 px o más), idealmente sobre transparente.
3. Fotografía real de papelería impresa o renders 3D del estudio, si se quieren sustituir las exploraciones.
4. Suisse Int'l con licencia web.

# Conexiones pendientes para producción

- **Formulario**: en producción desde el 30/10/2026 (`api/contact.ts` con Resend + Turnstile; dominio verificado en Resend, región São Paulo; variables en Vercel → Production). Probado de extremo a extremo: el correo llega y la respuesta va al remitente.
- **Aviso de privacidad**: publicado el 30/10/2026 (`privacidad/index.html`), adaptado a la Ley N.º 29733 (Perú); incluye uso de IA (Claude y ChatGPT, sin entrenamiento) y cobros con Whop como merchant of record. Pendiente: revisión por un abogado e inscripción del banco de datos «Contactos web» ante la ANPD.
- **Brief de proyecto** (`/brief-form/`): en producción desde el 30/10/2026. Blob Store privado `alive-briefs` (São Paulo) con `BLOB_READ_WRITE_TOKEN` y `BRIEF_SECRET` en Vercel. No revocar el token de lectura y escritura: lo usan las subidas. Probado de extremo a extremo: correo con enlaces a archivos y confirmación al cliente.
- **Panel** (`/panel/`): en producción desde el 30/10/2026 con Supabase (proyecto `alive`, São Paulo). Acceso con correo y contraseña (usuarios de Supabase Auth listados en `panel_admins`); enlace al correo como alternativa. Pendiente: generar la propuesta en PDF desde la ficha del cliente.
- **Google Search Console**: propiedad de dominio `alivedigital.agency` verificada (TXT en GoDaddy) y sitemap enviado el 30/10/2026: correcto, 7 páginas. Indexación solicitada para la portada y los 3 artículos.
- **Dominio**: `alivedigital.agency` (principal) y `www` en Vercel; `VITE_SITE_URL` definido.
- **Analítica**: no hay ninguna. Si se añade, requiere aviso y, en su caso, consentimiento.
- **Casos reales**: falta WeFunnels.
- **Casos con autorización**: cambia las piezas a `kind: 'case'` solo con autorización y datos verificados.
