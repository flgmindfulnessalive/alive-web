// La propuesta en el navegador: resuelve las imágenes con Vite, arma los datos por defecto de cada
// servicio (según sus fichas) y prepara el documento para guardarlo como PDF desde el navegador.
import fontUrl from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url'
import wordmarkSvg from '../assets/brand/alive-wordmark.svg?raw'
import symbolUrl from '../assets/brand/alive-symbol.svg?url'
import sculptureUrl from '../assets/visual/sculpture-closing.webp?url'
import flowUrl from '../assets/visual/project-flow-dispositivos-800.webp?url'
import wewUrl from '../assets/visual/project-wewebinars-papeleria-800.webp?url'
import glusUrl from '../assets/visual/project-glus-web-800.webp?url'
import activaUrl from '../assets/visual/project-activa-landing-800.webp?url'
import { buildProposal, type ProposalData, type ProposalExtra } from './template.js'

const ASSETS: Record<string, string> = {
  'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2': fontUrl,
  'src/assets/brand/alive-symbol.svg': symbolUrl,
  'src/assets/visual/sculpture-closing.webp': sculptureUrl,
  'src/assets/visual/project-flow-dispositivos-800.webp': flowUrl,
  'src/assets/visual/project-wewebinars-papeleria-800.webp': wewUrl,
  'src/assets/visual/project-glus-web-800.webp': glusUrl,
  'src/assets/visual/project-activa-landing-800.webp': activaUrl,
}
const absolute = (u: string) => new URL(u, location.href).href

export const renderProposal = (d: ProposalData) => buildProposal(d, { asset: (p) => absolute(ASSETS[p] ?? p), wordmarkSvg })

export type ProposalService = 'we' | 'wep' | 'eco' | 'mar' | 'mid' | 'med'
// Servicios con plantilla de propuesta («otro» no tiene ficha).
export const hasProposalTemplate = (p: { service: string }) => ['we', 'wep', 'eco', 'mar', 'mid', 'med'].includes(p.service)

// Adicionales de la ficha de Ecommerce (se eligen en el editor).
export const ECO_EXTRAS: ProposalExtra[] = [
  { nombre: 'Pasarela de pago adicional', precio: 100 },
  { nombre: 'Facturación electrónica SUNAT', detalle: 'Conexión con tu proveedor de facturación', precio: 250 },
  { nombre: 'Envíos por peso o conexión con courier', precio: 200 },
  { nombre: 'Recordatorio de carrito abandonado', detalle: 'Por correo o WhatsApp', precio: 120 },
  { nombre: 'Asistente con IA del catálogo', detalle: 'Responde dudas sobre tus productos', precio: 200 },
  { nombre: 'Otro idioma o moneda', precio: 150 },
  { nombre: 'Reseñas de productos', precio: 80 },
]
// Combos de la ficha de Marca: lo que se suma al precio de la marca.
export const MARCA_COMBO = {
  mar: { nombre: 'Web Esencial (combo)', detalle: 'Marca Esencial + Web Esencial: US$ 500 en total', precio: 300 },
  mid: { nombre: 'Web Esencial con panel (combo)', detalle: 'Identidad Completa + Web con panel: US$ 800 en total', precio: 350 },
}

const PORTADAS: Record<ProposalService, ProposalData['portada']> = {
  we: { titulo: ['Tu web, con diseño propio,', 'lista para que te escriban.'], bajada: 'Una web a medida, rápida y lista para Google, con formulario y WhatsApp conectados desde el primer día.' },
  wep: { titulo: ['Tu web, con diseño propio', 'y un panel para cambiarla tú.'], bajada: 'Una web a medida, rápida y lista para Google, que actualizas desde el móvil sin depender de nadie.' },
  eco: { titulo: ['Tu tienda online, con diseño propio', 'y lista para vender.'], bajada: 'Catálogo, pago seguro desde el celular y un panel para llevar pedidos y stock, sin licencias mensuales de plataforma.', enLinea: true },
  mar: { titulo: ['Tu marca, con criterio propio', 'y lista para usar en todas partes.'], bajada: 'Concepto, 3 rutas creativas y todos los archivos que necesitas, con una guía clara para usarlos.' },
  mid: { titulo: ['Tu marca, con criterio propio', 'y lista para usar en todas partes.'], bajada: 'Estrategia, 3 rutas creativas y todos los archivos que necesitas, con una guía clara para usarlos.' },
  med: { titulo: ['Tu producto digital,', 'en manos de usuarios reales.'], bajada: 'Una Versión 1 enfocada, con demos cada semana y lista para crecer con lo que aprendas.' },
}
const NOMBRES: Record<ProposalService, [string, string]> = {
  we: ['Web Esencial', 'Diseño y desarrollo · pago único'],
  wep: ['Web Esencial con panel propio', 'Diseño y desarrollo · pago único'],
  eco: ['Ecommerce Esencial', 'Tienda online · pago único'],
  mar: ['Marca Esencial', 'Marca e identidad · pago único'],
  mid: ['Identidad Completa', 'Marca e identidad · pago único'],
  med: ['Proyecto a medida · Versión 1', 'Producto digital · pago único'],
}
const PRECIOS: Record<ProposalService, number> = { we: 350, wep: 450, eco: 750, mar: 200, mid: 450, med: 1500 }

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Datos iniciales de una propuesta según el servicio, el cliente y el monto de la oportunidad.
export function defaultProposal(service: ProposalService, cliente: { nombre: string; detalle: string }, amount: number | null): ProposalData {
  const [nombre, tipo] = NOMBRES[service]
  const base: ProposalData = {
    cliente,
    fecha: today(),
    validezDias: 30,
    moneda: 'USD',
    servicio: { nombre, tipo, precio: amount ?? PRECIOS[service] },
    pago: { adelanto: 70, saldo: 30 },
    plazo: 'hasta 10 días hábiles',
    rondasDeAjustes: 2,
    acompanamientoDias: 10,
    pausa: { diasSinRespuesta: 10, diasCierre: 30 },
    portada: PORTADAS[service],
  }
  if (service === 'we' || service === 'wep') return { ...base, servicio: { ...base.servicio, panel: service === 'wep' }, alojamiento: { mensual: 10 } }
  if (service === 'eco')
    return {
      ...base,
      servicio: { ...base.servicio, precio: amount ?? 750, ecommerce: { productos: 40, bloquesExtra: 0, precioBloque: 100, pasarela: 'Culqi', adicionales: [] } },
      plazo: 'hasta 20 días hábiles',
      acompanamientoDias: 15,
      alojamiento: { mensual: 20 },
    }
  if (service === 'mar' || service === 'mid')
    return { ...base, servicio: { ...base.servicio, marca: { nivel: service === 'mid' ? 'completa' : 'esencial', adicionales: [] } }, acompanamientoDias: 7 }
  return {
    ...base,
    servicio: { ...base.servicio, medida: { producto: 'tu producto', plataforma: 'web', funciones: [], despues: [], terceros: [], adicionales: [] } },
    plazo: 'hasta 6 semanas',
    acompanamientoDias: 30,
  }
}

// Total del proyecto (precio + bloques de productos + adicionales), igual que la plantilla.
export function proposalTotal(d: ProposalData) {
  const s = d.servicio
  const extras = (s.ecommerce?.adicionales ?? s.marca?.adicionales ?? s.medida?.adicionales ?? []).reduce((a, x) => a + x.precio, 0)
  const blocks = s.ecommerce ? s.ecommerce.bloquesExtra * s.ecommerce.precioBloque : 0
  return s.precio == null ? null : s.precio + blocks + extras
}

// El texto con degradado (background-clip: text) no se exporta bien a PDF (según el visor sale con
// filetes o como un rectángulo). Antes de imprimir, cada línea de cada .grad se dibuja en un canvas
// con su degradado y se reemplaza por esa imagen; el texto queda como texto alternativo.
export async function rasterizeGradients(doc: Document) {
  await doc.fonts.ready
  const win = doc.defaultView!
  for (const el of Array.from(doc.querySelectorAll<HTMLElement>('.grad'))) {
    const text = el.textContent ?? ''
    const node = el.firstChild
    if (!text.trim() || !node || node.nodeType !== Node.TEXT_NODE) continue
    const box = el.getBoundingClientRect()
    // Agrupa las letras por línea según su posición.
    const range = doc.createRange()
    const lines: { from: number; to: number; rect: DOMRect }[] = []
    for (let i = 0; i < text.length; i++) {
      range.setStart(node, i)
      range.setEnd(node, i + 1)
      const r = range.getBoundingClientRect()
      if (!r.width && /\s/.test(text[i])) continue
      const last = lines[lines.length - 1]
      if (last && Math.abs(last.rect.top - r.top) < r.height / 2) last.to = i + 1
      else lines.push({ from: i, to: i + 1, rect: r })
    }
    const cs = win.getComputedStyle(el)
    const scale = 4
    const frag = doc.createDocumentFragment()
    lines.forEach((line, n) => {
      range.setStart(node, line.from)
      range.setEnd(node, line.to)
      const r = range.getBoundingClientRect()
      const canvas = doc.createElement('canvas')
      canvas.width = Math.ceil(r.width * scale)
      canvas.height = Math.ceil(r.height * scale)
      const ctx = canvas.getContext('2d')!
      ctx.scale(scale, scale)
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
      ;(ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing
      // El degradado recorre todo el elemento, como en pantalla.
      const g = ctx.createLinearGradient(box.left - r.left, 0, box.right - r.left, 0)
      g.addColorStop(0, '#7c3aed')
      g.addColorStop(0.52, '#2f6bff')
      g.addColorStop(1, '#00e0d0')
      ctx.fillStyle = g
      const m = ctx.measureText(text.slice(line.from, line.to))
      const asc = m.fontBoundingBoxAscent
      const desc = m.fontBoundingBoxDescent
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(text.slice(line.from, line.to).replace(/\s+$/, ''), 0, (r.height - (asc + desc)) / 2 + asc)
      const img = doc.createElement('img')
      img.src = canvas.toDataURL('image/png')
      img.alt = text.slice(line.from, line.to)
      img.style.cssText = `display:inline-block;vertical-align:bottom;width:${r.width}px;height:${r.height}px`
      frag.append(img)
      if (n < lines.length - 1) frag.append(doc.createElement('br'))
    })
    el.replaceChildren(frag)
    el.style.background = 'none'
  }
}

// Páginas con contenido que pasa del pie (para avisar antes de descargar).
export function overflowingPages(doc: Document) {
  return Array.from(doc.querySelectorAll('.page')).flatMap((pg, i) => {
    const pie = pg.querySelector('.pie')
    const limite = (pie ? pie.getBoundingClientRect().top : pg.getBoundingClientRect().bottom) - 4
    const fuera = Array.from(pg.querySelectorAll('h2, h3, p, li, .card, .fila, .fase, .paso, .trabajo, dl')).some(
      (el) => el.getBoundingClientRect().bottom > limite,
    )
    return fuera ? [i + 1] : []
  })
}
