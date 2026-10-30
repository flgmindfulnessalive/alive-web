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

## Despliegue (GitHub Pages)

El workflow `.github/workflows/deploy.yml` compila y publica en cada push a `main`.

1. En el repositorio: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. En **Settings → Secrets and variables → Actions → Variables**, define:
   - `SITE_URL`: URL final sin barra (p. ej. `https://dominio.com`).
   - `CONTACT_ENDPOINT`: endpoint del formulario (p. ej. `https://formspree.io/f/xxxxxxx`). Si falta, la web queda en modo demo.
   - `PRIVACY_URL`: enlace al aviso de privacidad.
3. Dominio propio: `public/CNAME` con el dominio, y en el DNS:
   - Dominio raíz: registros `A` a `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (y `AAAA` a `2606:50c0:8000::153` … `8003::153`).
   - Subdominio `www`: `CNAME` a `<usuario>.github.io`.
   - Después, en Settings → Pages, marca **Enforce HTTPS**.

Variables locales de ejemplo en `.env.example`.
