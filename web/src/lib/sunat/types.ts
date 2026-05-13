export type SunatEnviroment = 'demo' | 'beta' | 'produccion'

export type TipoComprobante = '01' | '03' | '07' | '08'

export const TIPO_COMPROBANTE = {
  FACTURA: '01' as TipoComprobante,
  BOLETA: '03' as TipoComprobante,
  NOTA_CREDITO: '07' as TipoComprobante,
  NOTA_DEBITO: '08' as TipoComprobante,
}

export interface SunatConfig {
  environment: SunatEnviroment
  ruc: string
  razonSocial: string
  nombreComercial: string
  address: string
  urbanizacion: string
  provincia: string
  departamento: string
  distrito: string
  codigoPais: string
  ubigeo: string

  solUser: string
  solPassword: string

  certPath: string
  certPassword: string

  seriesFactura: string
  seriesBoleta: string
  seriesNC: string
  seriesND: string
}

export interface SunatCliente {
  tipoDoc: '6' | '1'
  numDoc: string
  nombre: string
  direccion: string
  email?: string
}

export interface SunatProducto {
  codigo: string
  descripcion: string
  cantidad: number
  precioUnitario: number
  precioConIgv: number
  total: number
}

export interface SunatInvoiceRequest {
  tipoComprobante: TipoComprobante
  serie: string
  numero: number
  fechaEmision: string
  horaEmision: string

  cliente: SunatCliente
  productos: SunatProducto[]

  subtotal: number
  igv: number
  total: number

  totalLetras?: string
  nota?: string

  tipoOperacion?: string
  moneda?: string

  emisor?: SunatConfig
}

export interface SunatEmisorConfig {
  ruc: string
  razonSocial: string
  nombreComercial: string
  address: string
  urbanizacion: string
  provincia: string
  departamento: string
  distrito: string
  codigoPais: string
  ubigeo: string
}

export interface SunatDirectResult {
  success: boolean
  cdrXml?: string
  cdrBase64?: string
  error?: string
  responseCode?: string
  description?: string
}

export interface SunatInvoiceResult {
  success: boolean
  ruc: string
  tipoComprobante: TipoComprobante
  serie: string
  numero: number
  fechaEmision: string

  cdr?: SunatCDR
  hash?: string
  codigoQR?: string
  xmlFirmado?: string
  ticket?: string

  error?: string
  esDemo: boolean
}

export interface SunatCDR {
  id: string
  codigo: string
  descripcion: string
  estado: 'ACEPTADO' | 'RECHAZADO' | 'BAJA' | 'PROCESANDO' | 'ERROR'
  observaciones: string[]
  hashFirma: string
  xml: string
  fechaRecepcion: string
}

export interface SunatConfigDB {
  id: number
  environment: SunatEnviroment
  ruc: string
  razon_social: string
  nombre_comercial: string
  address: string
  urbanizacion: string
  provincia: string
  departamento: string
  distrito: string
  ubigeo: string
  sol_user: string
  sol_password: string
  cert_path: string
  cert_password: string
  series_factura: string
  series_boleta: string
  series_nc: string
  series_nd: string
  updated_at: string
}

export interface SunatComprobanteDB {
  id: number
  factura_id: number
  tipo: TipoComprobante
  serie: string
  numero: number
  ruc_emisor: string
  ruc_cliente: string
  nombre_cliente: string
  total: number
  xml_firmado: string
  hash: string
  codigo_qr: string
  ticket_sunat: string
  estado_sunat: string
  cdr_codigo: string
  cdr_descripcion: string
  cdr_xml: string
  cdr_observaciones: string
  enviado_at: string
  created_at: string
}
