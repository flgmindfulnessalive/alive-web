# SEO y textos para compartir — ALIVE

Dominio principal: `https://alivedigital.agency` (la versión con `www` redirige aquí).
Todo lo de este documento ya está aplicado en `index.html` y `vite.config.ts`, salvo los textos para publicaciones.

## Concepto que guía los textos

- **Posicionamiento:** un estudio de inteligencia creativa que construye lo que viene.
- **Promesa:** Ideas que cobran vida.
- **Firma:** Estrategia. Creatividad. Tecnología.
- **Trayectoria:** desde 2011. Fundado por Francesco Lulli; se menciona en el hero, en el bloque «Desde 2011» y en el pie.
- **Tono:** seguro, cercano, selectivo. Sin promesas de resultados, sin cifras, sin clientes que no estén confirmados.
- **Términos de búsqueda que cubrimos de forma natural:** estudio creativo, estrategia digital, branding, diseño web, diseño UX/UI, desarrollo web, inteligencia artificial aplicada, automatización.

## Buscadores (Google)

| Campo | Texto | Longitud |
|---|---|---|
| Title | ALIVE \| Estrategia, diseño y tecnología con IA aplicada | 55 caracteres |
| Meta description | Estudio boutique de inteligencia creativa desde 2011. Unimos estrategia, diseño y tecnología para crear marcas, webs y experiencias digitales con IA. | 150 caracteres |

El title recoge lo que la gente busca (estrategia, diseño, tecnología, IA). La marca ya aparece en el nombre del sitio.

## Redes y mensajería (WhatsApp, LinkedIn, Facebook, X)

| Campo | Texto |
|---|---|
| og:title / twitter:title | ALIVE — Ideas que cobran vida |
| og:description | Estudio de inteligencia creativa. Damos vida a marcas, webs y experiencias digitales con estrategia, diseño y tecnología. Hablemos de tu proyecto. |
| twitter:description | Estudio de inteligencia creativa: estrategia, diseño y tecnología para marcas, webs y experiencias digitales. |
| Imagen | `public/og-image.jpg` (1200×630, 82 KB) |
| Texto alternativo | ALIVE. Ideas que cobran vida. Estrategia, creatividad y tecnología. |

En redes manda la emoción (la promesa); en Google, la claridad (qué hacemos).

## Datos estructurados (JSON-LD)

Se generan en el build cuando existe `VITE_SITE_URL`:
- **Organization:** nombre, URL, logo, imagen, eslogan, año de fundación (2011), fundador (Francesco Lulli), descripción y áreas de conocimiento (los servicios de la web).
- **WebSite:** idioma español, publicado por la organización.

No incluyen dirección, teléfono ni redes porque aún no hay datos reales. Cuando existan, se añaden `address`, `telephone`, `email` y `sameAs` (perfiles sociales) en `vite.config.ts`.

## Archivos técnicos

- `robots.txt`: permite todo y apunta al sitemap.
- `sitemap.xml`: home. Añadir `/privacidad/` cuando deje de ser borrador.
- `site.webmanifest` e iconos (`apple-touch-icon.png` 180, `icon-192.png`, `icon-512.png`).
- La página de privacidad tiene `noindex` mientras sea borrador.

## Después de publicar

1. **Google Search Console:** añadir la propiedad de dominio `alivedigital.agency` (verificación por registro TXT en GoDaddy) y enviar `https://alivedigital.agency/sitemap.xml`.
2. **Refrescar la miniatura** si se compartió antes:
   - Facebook y WhatsApp: https://developers.facebook.com/tools/debug/ y pulsa «Volver a extraer».
   - LinkedIn: https://www.linkedin.com/post-inspector/
   - WhatsApp guarda caché unos días; la URL de la imagen lleva `?v=20261030` para forzar la nueva. Si cambias la imagen, cambia también esa versión en `index.html`.
3. **Comprobar datos estructurados:** https://search.google.com/test/rich-results

## Textos para compartir

### WhatsApp (mensaje corto con enlace)
> Hemos lanzado la nueva web de ALIVE ✨
> Somos un estudio de inteligencia creativa: estrategia, diseño y tecnología para dar vida a marcas, webs y experiencias digitales.
> 👉 https://alivedigital.agency

### Estado de WhatsApp / historia de Instagram
Imagen: `docs/social/alive-post-1080.jpg`
> Ideas que cobran vida. Nueva web → alivedigital.agency

### LinkedIn
> Hoy presentamos ALIVE, un estudio de inteligencia creativa.
>
> Trabajamos donde se cruzan la estrategia, el diseño y la tecnología: definimos qué construir y para quién, le damos forma con identidad y experiencia, y lo desarrollamos con soluciones inteligentes conectadas a necesidades reales.
>
> Si tienes una idea que quieres hacer realidad, empecemos por una buena conversación.
>
> https://alivedigital.agency
>
> #EstudioCreativo #EstrategiaDigital #Branding #DiseñoWeb #InteligenciaArtificial

### Instagram (publicación cuadrada)
Imagen: `docs/social/alive-post-1080.jpg`
> Ideas que cobran vida.
>
> Somos ALIVE, un estudio de inteligencia creativa. Estrategia, diseño y tecnología para marcas, webs y experiencias digitales que se sienten vivas.
>
> Hablemos de tu proyecto → enlace en la bio.
>
> #alivedigital #estudiocreativo #branding #diseñoweb #estrategiadigital #uxui #inteligenciaartificial

## Regenerar las imágenes

```bash
npm run social
```

Genera la miniatura OG, la publicación cuadrada y los iconos a partir de la marca y la escultura reales (`scripts/render-social.mjs`).
