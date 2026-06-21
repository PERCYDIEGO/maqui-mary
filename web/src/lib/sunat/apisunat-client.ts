export type ApiSunatEnv = 'sandbox' | 'produccion'

// ─── Factura / Boleta ───
export interface ApiSunatItem {
  unidad_de_medida: string
  descripcion: string
  cantidad: string
  valor_unitario: string
  porcentaje_igv: string
  codigo_tipo_afectacion_igv: string
  nombre_tributo: string
}

export interface ApiSunatRequest {
  documento: 'factura' | 'boleta'
  serie: string
  numero: number
  fecha_de_emision: string
  hora_de_emision?: string
  observacion?: string
  moneda: string
  tipo_operacion: string
  cliente_tipo_de_documento: string
  cliente_numero_de_documento: string
  cliente_denominacion: string
  cliente_direccion: string
  items: ApiSunatItem[]
  total: string
}

// ─── Guía de Remisión (APISUNAT v3 /dispatches) ───
export interface ApiSunatGuiaTransportista {
  ruc: string
  denominacion: string
  numero_registro_MTC?: string
  numero_autorizacion?: string
  codigo_entidad_autorizadora?: string
}

export interface ApiSunatGuiaConductor {
  conductor: 'principal' | 'secundario'
  tipo_de_documento: string
  numero_de_documento: string
  nombres: string
  apellidos: string
  numero_licencia_conducir: string
}

export interface ApiSunatGuiaVehiculo {
  vehiculo: 'principal' | 'secundario'
  numero_de_placa: string
}

export interface ApiSunatGuiaItem {
  codigo_interno: string
  descripcion: string
  unidad_de_medida: string
  cantidad: number
}

export interface ApiSunatGuiaDocRelacionado {
  documento: 'factura' | 'boleta' | 'guia'
  serie: string
  numero: string
  ruc_emisor: string
}

export interface ApiSunatGuiaRequest {
  documento: 'guia_remision_remitente' | 'guia_remision_transportista'
  serie: string
  numero: string
  fecha_de_emision: string
  hora_de_emision: string
  modalidad_de_transporte: '01' | '02' // 01=Público, 02=Privado
  motivo_de_traslado: string
  motivo_traslado_descripcion?: string
  fecha_inicio_de_traslado: string
  fecha_entrega_a_transportista: string  // APISUNAT usa este nombre (sin _de_)
  destinatario_tipo_de_documento: string
  destinatario_numero_de_documento: string
  destinatario_denominacion: string
  destinatario_direccion: string
  punto_de_partida_ubigeo: string
  punto_de_partida_direccion: string
  punto_de_llegada_ubigeo: string
  punto_de_llegada_direccion: string
  peso_bruto_total: string
  peso_bruto_unidad_de_medida: string // KGM
  numero_de_bultos?: number
  observaciones?: string | null
  documentos_relacionados?: ApiSunatGuiaDocRelacionado[]
  transportista?: ApiSunatGuiaTransportista
  conductores?: ApiSunatGuiaConductor[]
  vehiculos?: ApiSunatGuiaVehiculo[]
  items: ApiSunatGuiaItem[]
}

// ─── Response ───
export interface ApiSunatPayload {
  estado: 'ACEPTADO' | 'PENDIENTE' | 'RECHAZADO'
  hash: string
  xml: string
  cdr: string | null
  pdf: {
    ticket?: string
    a4?: string
  }
}

export interface ApiSunatResponse {
  success: boolean
  message: string
  payload?: ApiSunatPayload
}

const BASE_URL: Record<ApiSunatEnv, string> = {
  sandbox: 'https://sandbox.apisunat.pe',
  produccion: 'https://app.apisunat.pe',
}

export function getApiSunatBaseUrl(env: ApiSunatEnv): string {
  return BASE_URL[env]
}

export function mapTipoComprobante(tipo: string): 'factura' | 'boleta' {
  if (tipo === '01') return 'factura'
  if (tipo === '03') return 'boleta'
  return 'boleta'
}

export function mapTipoDocCliente(tipo: string): string {
  if (tipo === '6') return '6'
  return '1'
}

export function buildApiSunatRequest(params: {
  tipoComprobante: string
  serie: string
  numero: number
  fechaEmision: string
  horaEmision?: string
  moneda: string
  clienteTipoDoc: string
  clienteNumDoc: string
  clienteNombre: string
  clienteDireccion: string
  items: Array<{
    descripcion: string
    cantidad: number
    valorUnitario: number
  }>
  total: number
  nota?: string
}): ApiSunatRequest {
  return {
    documento: mapTipoComprobante(params.tipoComprobante),
    serie: params.serie,
    numero: params.numero,
    fecha_de_emision: params.fechaEmision,
    hora_de_emision: params.horaEmision,
    observacion: params.nota || undefined,
    moneda: params.moneda,
    tipo_operacion: '0101',
    cliente_tipo_de_documento: mapTipoDocCliente(params.clienteTipoDoc),
    cliente_numero_de_documento: params.clienteNumDoc,
    cliente_denominacion: params.clienteNombre,
    cliente_direccion: params.clienteDireccion || '-',
    items: params.items.map(it => ({
      unidad_de_medida: 'NIU',
      descripcion: it.descripcion,
      cantidad: String(it.cantidad),
      valor_unitario: it.valorUnitario.toFixed(6),
      porcentaje_igv: '18',
      codigo_tipo_afectacion_igv: '10',
      nombre_tributo: 'IGV',
    })),
    total: params.total.toFixed(2),
  }
}

export function buildApiSunatGuiaRequest(params: {
  tipoGuia: '09' | '31'
  serie: string
  numero: number
  fechaEmision: string
  horaEmision?: string
  moneda: string
  modalidadTraslado: 'privado' | 'publico'
  motivoTraslado: string
  descripcionMotivo?: string
  fechaInicioTraslado: string
  fechaEntregaTransportista?: string
  destinatarioTipoDoc: string
  destinatarioNumDoc: string
  destinatarioNombre: string
  destinatarioDireccion: string
  puntoPartidaUbigeo: string
  puntoPartida: string
  puntoLlegadaUbigeo: string
  puntoLlegada: string
  pesoTotal: number
  unidadPeso: string
  numeroBultos?: number
  observaciones?: string
  documentosRelacionados?: Array<{
    tipo: string
    serie: string
    numero: string
    rucEmisor?: string
  }>
  transportista?: {
    ruc?: string
    denominacion?: string
    numeroRegistroMTC?: string
  }
  conductores?: Array<{
    tipoDoc: string
    numDoc: string
    nombres: string
    apellidos: string
    licencia: string
  }>
  vehiculos?: Array<{
    placa: string
  }>
  bienes: Array<{
    descripcion: string
    cantidad: number
    unidadMedida: string
    codigo?: string
  }>
}): ApiSunatGuiaRequest {
  const req: ApiSunatGuiaRequest = {
    documento: params.tipoGuia === '31' ? 'guia_remision_transportista' : 'guia_remision_remitente',
    serie: params.serie,
    numero: String(params.numero),
    fecha_de_emision: params.fechaEmision,
    hora_de_emision: params.horaEmision || '00:00:00',
    modalidad_de_transporte: params.modalidadTraslado === 'publico' ? '01' : '02',
    motivo_de_traslado: params.motivoTraslado,
    fecha_inicio_de_traslado: params.fechaInicioTraslado,
    fecha_entrega_a_transportista: params.fechaEntregaTransportista || params.fechaInicioTraslado,
    destinatario_tipo_de_documento: params.destinatarioTipoDoc,
    destinatario_numero_de_documento: params.destinatarioNumDoc,
    destinatario_denominacion: params.destinatarioNombre,
    destinatario_direccion: params.destinatarioDireccion || '-',
    punto_de_partida_ubigeo: params.puntoPartidaUbigeo,
    punto_de_partida_direccion: params.puntoPartida,
    punto_de_llegada_ubigeo: params.puntoLlegadaUbigeo,
    punto_de_llegada_direccion: params.puntoLlegada,
    peso_bruto_total: params.pesoTotal.toFixed(3),
    peso_bruto_unidad_de_medida: params.unidadPeso || 'KGM',
    items: params.bienes.map(b => ({
      codigo_interno: b.codigo || '0001',
      descripcion: b.descripcion,
      unidad_de_medida: (b.unidadMedida || 'UN').substring(0, 2), // APISUNAT exige < 3 caracteres
      cantidad: b.cantidad,
    })),
  }

  if (params.descripcionMotivo && params.descripcionMotivo.trim()) {
    req.motivo_traslado_descripcion = params.descripcionMotivo
  }

  if (params.numeroBultos && params.numeroBultos > 0) {
    req.numero_de_bultos = params.numeroBultos
  }

  if (params.observaciones && params.observaciones.trim()) {
    req.observaciones = params.observaciones
  }

  if (params.documentosRelacionados && params.documentosRelacionados.length > 0) {
    req.documentos_relacionados = params.documentosRelacionados.map(d => ({
      documento: d.tipo === 'factura' ? 'factura' : d.tipo === 'boleta' ? 'boleta' : 'guia',
      serie: d.serie,
      numero: d.numero,
      ruc_emisor: d.rucEmisor || EMPRESA_RUC,
    }))
  }

  if (params.transportista && params.transportista.ruc) {
    req.transportista = {
      ruc: params.transportista.ruc,
      denominacion: params.transportista.denominacion || '',
      numero_registro_MTC: params.transportista.numeroRegistroMTC || '',
    }
  }

  if (params.conductores && params.conductores.length > 0) {
    req.conductores = params.conductores.map(c => ({
      conductor: 'principal' as 'principal' | 'secundario',
      tipo_de_documento: c.tipoDoc,
      numero_de_documento: c.numDoc,
      nombres: c.nombres,
      apellidos: c.apellidos,
      numero_licencia_conducir: c.licencia,
    }))
  }

  if (params.vehiculos && params.vehiculos.length > 0) {
    req.vehiculos = params.vehiculos.map(v => ({
      vehiculo: 'principal' as 'principal' | 'secundario',
      numero_de_placa: v.placa,
    }))
  }

  return req
}

const EMPRESA_RUC = '20606218801'

export async function sendToApiSunat(
  request: ApiSunatRequest | ApiSunatGuiaRequest,
  token: string,
  env: ApiSunatEnv = 'sandbox',
  isGuia: boolean = false,
): Promise<ApiSunatResponse> {
  const baseUrl = getApiSunatBaseUrl(env)
  const url = isGuia
    ? `${baseUrl}/api/v3/dispatches`
    : `${baseUrl}/api/v3/documents`

  const bodyPayload = JSON.stringify(request)
  if (isGuia) {
    // eslint-disable-next-line no-console
    console.log('[APISUNAT GUÍA REQUEST]', bodyPayload)
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: bodyPayload,
  })

  const body: ApiSunatResponse = await res.json()
  // eslint-disable-next-line no-console
  console.log('[APISUNAT GUÍA RESPONSE]', JSON.stringify(body))
  return body
}
