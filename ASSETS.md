# Inventario de assets y pendientes

Originales entregados (en `brand-source/`): banner de marca 2000×741 y símbolo de app 1254×1254, ambos WebP. A partir de ellos se generan los recursos de la web con `npm run brand` (`scripts/process-brand.py`).

| Recurso | Archivo | Origen | Estado |
|---|---|---|---|
| Wordmark ALIVE con ® | `src/assets/brand/paths.ts`, `alive-wordmark.svg` | Vectorizado del banner oficial (potrace, ×4) | Fiel al original; sustituir por el SVG maestro de la guía si existe |
| Símbolo A | `src/assets/brand/paths.ts`, `alive-symbol.svg` | Vectorizado del icono de app, sin ® | Igual que el anterior |
| Favicon | `public/favicon.svg` | Símbolo A + anillo degradado del icono de app | Añadir `apple-touch-icon` 180 px desde el original |
| Escultura (hero) | `src/assets/visual/sculpture-hero.webp` 920×741, 149 KB | Banner oficial, textos eliminados, fondo transparente | Para pantallas retina conviene un original de 2400 px o más |
| Escultura (cierre) | `src/assets/visual/sculpture-closing.webp` 1560×741, 182 KB | Igual que el anterior | Igual que el anterior |
| Imagen Open Graph | `public/og-image.jpg` 1200×630 | Banner oficial con wordmark y firma | Lista |
| Exploración «Concepto de experiencia web» | `src/assets/visual/concept-web-{1200,2400}.webp` | Render de escena HTML/CSS (monitor y móvil en perspectiva) con marca, escultura e Inter reales: `npm run explorations` | Listo para demo; sustituir por render o mockup del estudio si existe |
| Exploración «Concepto de identidad» | `src/assets/visual/concept-identity-{1200,2400}.webp` | Render de papelería ALIVE sobre marfil (cuaderno con A en relieve, tarjetas, sobre) | Listo para demo; la fotografía real de papelería impresa lo superaría |
| Tipografía Inter | `@fontsource-variable/inter` (autoalojada) | SIL Open Font License 1.1 | En uso, sustituto provisional de Suisse Int'l |
| Suisse Int'l | — | Comercial (Swiss Typefaces) | **No incluida.** Añadir `.woff2` con licencia web como `'Suisse Intl'`; `--font-display` ya la prioriza |

## Recursos que mejorarían la calidad

1. Los SVG maestros del wordmark y del símbolo (los actuales son vectorizaciones muy fieles, pero no los maestros).
2. La escultura en alta resolución (2400 px o más), idealmente sobre transparente.
3. Fotografía real de papelería impresa o renders 3D del estudio, si se quieren sustituir las exploraciones.
4. Suisse Int'l con licencia web.

# Conexiones pendientes para producción

- **Formulario**: listo en `api/contact.ts` (Resend + Turnstile). Falta definir las variables de entorno en Vercel y verificar el dominio en Resend. Ver README.
- **Aviso de privacidad**: borrador en `privacidad/index.html`. Completar los datos entre corchetes, revisión legal, quitar `noindex` y el aviso de borrador.
- **Dominio**: añadir en Vercel con y sin `www` y definir `VITE_SITE_URL`.
- **Analítica**: no hay ninguna. Si se añade, requiere aviso y, en su caso, consentimiento.
- **Casos reales**: cambia las piezas a `kind: 'case'` solo con autorización y datos verificados.
