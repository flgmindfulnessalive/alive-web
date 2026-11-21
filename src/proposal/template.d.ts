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
    adicionales?: ProposalExtra[]
    medida?: { producto: string; plataforma: 'web' | 'instalable' | 'tiendas'; funciones: string[]; despues: string[]; terceros: string[]; adicionales: ProposalExtra[] }
  }
  pago: { adelanto: number; saldo: number }
  plazo: string
  rondasDeAjustes: number
  acompanamientoDias: number
  alojamiento?: { mensual: number | null }
  pausa?: { diasSinRespuesta: number; diasCierre: number }
  portada: { titulo: [string, string]; bajada: string; enLinea?: boolean }
  // Servicio con textos propios (encargos fuera de las fichas). Se puede sumar servicio.adicionales.
  textos?: {
    cosa: string
    resumen: { titulo: string; lead: string; pilares: [string, string][]; comoEmpezamos: string; frase: string }
    incluye: string[]; noIncluye: string[]; necesitamos: string[]; notaIncluye: string
    tituloProceso: string; plazoDesde: string; fases: [string, string, string][]
    detalleInversion: string; acompanamiento: string; saldo: string
    condicion: [string, string]; propiedad: string; pasos: [string, string][]
    adelanto?: [string, string]; adelantoNota?: string
  }
  // Con factura: se suma el 18 % de IGV (pagando con Whop no aplica).
  factura?: boolean
}
export const PROPOSAL_ASSETS: string[]
export function buildProposal(d: ProposalData, opts: { asset: (path: string) => string; wordmarkSvg: string }): string
