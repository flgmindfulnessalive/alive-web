// Tipos de la plantilla de propuesta (template.js se comparte con el script de Node).
export type ProposalExtra = { nombre: string; detalle?: string; precio: number }
export type ProposalData = {
  slug?: string
  cliente: { nombre: string; detalle: string }
  fecha: string
  validezDias: number
  moneda: 'USD' | 'PEN' | 'EUR'
  servicio: {
    nombre: string
    tipo: string
    precio: number | null
    panel?: boolean
    ecommerce?: { productos: number; bloquesExtra: number; precioBloque: number; pasarela: string; adicionales: ProposalExtra[] }
    marca?: { nivel: 'esencial' | 'completa'; adicionales: ProposalExtra[] }
    medida?: { producto: string; plataforma: 'web' | 'instalable' | 'tiendas'; funciones: string[]; despues: string[]; terceros: string[]; adicionales: ProposalExtra[] }
  }
  pago: { adelanto: number; saldo: number }
  plazo: string
  rondasDeAjustes: number
  acompanamientoDias: number
  alojamiento?: { mensual: number | null }
  pausa?: { diasSinRespuesta: number; diasCierre: number }
  portada: { titulo: [string, string]; bajada: string; enLinea?: boolean }
  // Con factura: se suma el 18 % de IGV (pagando con Whop no aplica).
  factura?: boolean
}
export const PROPOSAL_ASSETS: string[]
export function buildProposal(d: ProposalData, opts: { asset: (path: string) => string; wordmarkSvg: string }): string
