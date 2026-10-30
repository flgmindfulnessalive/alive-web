// Plantilla de los correos que reciben los clientes. Maquetada con tablas y estilos en línea para
// que se vea igual en Gmail, Outlook y Apple Mail; las imágenes (logo y filete de degradado) están
// en public/email y se sirven desde la web. Sin texto libre del cliente: solo nombre y marca, escapados.

const SITE = 'https://alivedigital.agency'

export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

type Step = { title: string; text: string }

type Options = {
  preheader: string
  eyebrow: string
  title: string
  intro: string
  highlight?: string
  steps?: Step[]
  closing: string
  reason: string
}

export function clientEmail(o: Options): string {
  const font = "font-family:Inter,'Segoe UI',Helvetica,Arial,sans-serif"
  const steps = (o.steps ?? [])
    .map(
      (s, i) => `
              <tr>
                <td width="44" valign="top" style="padding:0 0 18px 0">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                    <td width="30" height="30" align="center" valign="middle" style="width:30px;height:30px;border-radius:15px;background-color:#0b1218;color:#f5f7fa;${font};font-size:13px;font-weight:600;line-height:30px">${i + 1}</td>
                  </tr></table>
                </td>
                <td valign="top" style="padding:3px 0 18px 0;${font}">
                  <p style="margin:0;font-size:15px;line-height:22px;font-weight:600;color:#0b1218">${s.title}</p>
                  <p style="margin:2px 0 0;font-size:14px;line-height:21px;color:#4a4f57">${s.text}</p>
                </td>
              </tr>`,
    )
    .join('')

  return `<!doctype html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>${o.eyebrow}</title>
<style>
  @media (max-width: 620px) {
    .card { padding: 32px 24px !important; }
    .hero { padding: 32px 24px 28px !important; }
    .title { font-size: 26px !important; line-height: 32px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f5f3ee;-webkit-text-size-adjust:100%">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f5f3ee">${o.preheader}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f3ee">
    <tr>
      <td align="center" style="padding:32px 12px">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px">
          <!-- Cabecera oscura -->
          <tr>
            <td class="hero" style="background-color:#080f14;border-radius:16px 16px 0 0;padding:40px 44px 36px">
              <img src="${SITE}/email/alive-wordmark.png" width="120" height="24" alt="ALIVE" style="display:block;border:0;width:120px;height:auto;color:#f5f7fa;${font};font-size:20px;font-weight:600;letter-spacing:2px">
              <p style="margin:40px 0 0;${font};font-size:11px;line-height:16px;letter-spacing:2.6px;text-transform:uppercase;color:#a1a1aa">${o.eyebrow}</p>
              <h1 class="title" style="margin:10px 0 0;${font};font-size:30px;line-height:36px;font-weight:500;letter-spacing:-0.6px;color:#f5f7fa">${o.title}</h1>
            </td>
          </tr>
          <tr>
            <td style="line-height:0;font-size:0;background-color:#2f6bff"><img src="${SITE}/email/gradient-line.png" width="600" height="4" alt="" style="display:block;width:100%;height:4px;border:0"></td>
          </tr>
          <!-- Cuerpo -->
          <tr>
            <td class="card" style="background-color:#ffffff;border-radius:0 0 16px 16px;padding:40px 44px">
              <p style="margin:0;${font};font-size:16px;line-height:26px;color:#0b1218">${o.intro}</p>
              ${
                o.highlight
                  ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0">
                <tr><td style="background-color:#f5f3ee;border-left:3px solid #7c3aed;border-radius:0 10px 10px 0;padding:14px 18px;${font};font-size:14px;line-height:21px;color:#0b1218">${o.highlight}</td></tr>
              </table>`
                  : ''
              }
              ${
                steps
                  ? `<p style="margin:32px 0 16px;${font};font-size:11px;line-height:16px;letter-spacing:2.6px;text-transform:uppercase;color:#4a4f57">Qué pasa ahora</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${steps}
              </table>`
                  : ''
              }
              <p style="margin:${steps ? '8px' : '28px'} 0 0;${font};font-size:15px;line-height:24px;color:#0b1218">${o.closing}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;border-top:1px solid #ebe8e1;width:100%">
                <tr><td style="padding-top:20px;${font}">
                  <p style="margin:0;font-size:15px;line-height:22px;font-weight:600;color:#0b1218">Francesco Lulli</p>
                  <p style="margin:2px 0 0;font-size:13px;line-height:20px;color:#4a4f57">Fundador · ALIVE</p>
                </td></tr>
              </table>
            </td>
          </tr>
          <!-- Pie -->
          <tr>
            <td align="center" style="padding:24px 24px 0;${font}">
              <p style="margin:0;font-size:12px;line-height:18px;letter-spacing:1.6px;text-transform:uppercase;color:#4a4f57">Estrategia. Creatividad. Tecnología.</p>
              <p style="margin:8px 0 0;font-size:13px;line-height:20px"><a href="${SITE}" style="color:#2f6bff;text-decoration:none">alivedigital.agency</a></p>
              <p style="margin:14px 0 0;font-size:12px;line-height:18px;color:#8a8f97">${o.reason} <a href="${SITE}/privacidad/" style="color:#8a8f97">Aviso de privacidad</a>.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// Confirmación del brief de proyecto.
export function briefConfirmation({ nombre, marca, files }: { nombre: string; marca: string; files: number }) {
  const first = escapeHtml(nombre.split(' ')[0] || nombre)
  const brand = escapeHtml(marca)
  const archivos = files ? ` y ${files} archivo${files === 1 ? '' : 's'}` : ''
  const html = clientEmail({
    preheader: `Recibimos el brief de ${brand}. Te contamos los siguientes pasos.`,
    eyebrow: 'Brief recibido',
    title: `Gracias, ${first}.<br>Tu proyecto ya está en marcha.`,
    intro: `Recibimos el brief de <strong>${brand}</strong>${archivos}. Con esto preparamos una reunión de arranque a la medida de tu proyecto.`,
    highlight: '¿Te olvidaste de algo? Responde a este correo y lo sumamos a tu brief.',
    steps: [
      { title: 'Revisamos tu brief', text: 'Leemos tus respuestas y tus archivos con calma, sin plantillas.' },
      { title: 'Agendamos la reunión de arranque', text: 'Te escribimos para encontrar un momento que te funcione.' },
      { title: 'Te mostramos la dirección visual', text: 'La ves y la apruebas antes de construir nada.' },
    ],
    closing: 'Gracias por confiar en ALIVE. Nos vemos pronto.',
    reason: 'Recibes este correo porque enviaste un brief en alivedigital.agency.',
  })
  const text = `Hola, ${nombre}:

Recibimos el brief de ${marca}${files ? ` y ${files} archivo${files === 1 ? '' : 's'}` : ''}. Con esto preparamos una reunión de arranque a la medida de tu proyecto.

Qué pasa ahora:
1. Revisamos tu brief.
2. Te escribimos para agendar la reunión de arranque.
3. Te mostramos la dirección visual y la apruebas antes de construir nada.

¿Te olvidaste de algo? Responde a este correo y lo sumamos a tu brief.

Francesco Lulli
Fundador · ALIVE
alivedigital.agency`
  return { html, text }
}
