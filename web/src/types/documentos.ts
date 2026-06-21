// ============================================
// TIPOS DEL SISTEMA DE DOCUMENTOS TRIBUTARIOS
// Maqui Mary - INVERSIONES MAQUI MARY PERU E.I.R.L.
// RUC: 20606218801
// ============================================

// Datos fijos de la empresa
export const EMPRESA_DATA = {
  razonSocial: 'INVERSIONES MAQUI MARY PERU E.I.R.L.',
  ruc: '20606218801',
  direccion: 'PRO. QUINTA AVENIDA MZA. J LOTE. 17-B ASC. GANADEROS PORCINOS SARACO',
  distrito: 'LURIGANCHO',
  provincia: 'LIMA',
  departamento: 'LIMA',
  telefono: '(51) 949 446 676',
} as const;

// Tipos de documentos
export type TipoDocumento = 'boleta' | 'factura' | 'guia';

// Estados del documento
export type EstadoDocumento = 
  | 'borrador'           // Creado, pendiente de envío a SUNAT
  | 'pendiente_envio'    // Listo para enviar a SUNAT (espera aprobación admin)
  | 'enviado'            // Enviado a SUNAT, esperando respuesta
  | 'aprobado'           // Aprobado por SUNAT (CDR recibido)
  | 'rechazado'          // Rechazado por SUNAT
  | 'anulado';           // Anulado

// Respuesta CDR de SUNAT
export interface CDRData {
  codigo: string;        // Código de respuesta (0 = éxito)
  mensaje: string;       // Mensaje de SUNAT
  observaciones?: string[];
  fechaRecepcion: Date;
  cdrXml?: string;       // Contenido XML del CDR
}

export interface DocumentoBase {
  id: string;
  tipo: TipoDocumento;
  serie: string;
  numero: number;
  numeroCompleto: string; // E001-883
  fechaEmision: Date;
  fechaVencimiento?: Date;
  observacion?: string;
  estado: EstadoDocumento;
  qrCode?: string;
  hashCpe?: string;
  // Datos SUNAT
  cdr?: CDRData;         // Constancia de Recepción de SUNAT
  enviadoPor?: string;   // ID del usuario que envió a SUNAT
  enviadoAt?: Date;      // Fecha de envío a SUNAT
  createdAt: Date;
  updatedAt: Date;
}

// Cliente
export interface Cliente {
  id: string;
  codigo?: string;
  tipo: 'natural' | 'juridica';
  nombre: string;
  apellidos?: string;
  razonSocial?: string;
  dni?: string;
  ruc?: string;
  direccion: string;
  telefono?: string;
  email?: string;
  esFrecuente: boolean;
  totalCompras: number;
  createdAt: Date;
}

// Item/Producto en documento
export interface ItemDocumento {
  id: string;
  numeroOrden: number;
  cantidad: number;
  unidadMedida: UnidadMedida;
  descripcion: string;
  detalle?: string; // Detalle adicional del producto
  valorUnitario: number; // Precio con IGV (precio que paga el cliente; calcularItem lo descompone internamente)
  descuento: number;
  anticipos: number;
  icbper: number;
  valorVenta: number;
  igv: number;
  importeTotal: number;
  // Campos para vincular con producto
  productoId?: string;
  precioCatalogo?: number; // Precio base del producto al momento de seleccionarlo
  // Campos adicionales para guías
  codigoBien?: string;
  codigoProductoSunat?: string;
  partidaArancelaria?: string;
  codigoGtin?: string;
}

export type UnidadMedida = 
  | 'CAJA' 
  | 'PAQUETE' 
  | 'UNIDAD' 
  | 'KILO' 
  | 'LITRO' 
  | 'METRO' 
  | 'GRAMO';

// Boleta de Venta
export interface Boleta extends DocumentoBase {
  tipo: 'boleta';
  clienteId: string;
  cliente: Cliente;
  moneda: 'PEN' | 'USD';
  formaPago?: 'contado' | 'credito';
  formaPagoSunat?: '001' | '002';
  items: ItemDocumento[];
  // Totales
  operacionGravada: number;
  operacionExonerada: number;
  operacionInafecta: number;
  descuentoTotal: number;
  icbperTotal: number;
  igvTotal: number;
  otrosCargos: number;
  otrosTributos: number;
  montoRedondeo: number;
  importeTotal: number;
  importeEnLetras: string;
}

// Factura
export interface Factura extends DocumentoBase {
  tipo: 'factura';
  clienteId: string;
  cliente: Cliente;
  moneda: 'PEN' | 'USD';
  formaPago: 'contado' | 'credito';
  formaPagoSunat?: '001' | '002'; // Catálogo 12: 001=Contado, 002=Crédito
  tipoOperacion?: string; // Catálogo 51: 0101=Venta
  fechaVencimiento?: Date;
  items: ItemDocumento[];
  // Totales
  subTotal: number;
  valorVenta: number;
  descuentoTotal: number;
  anticiposTotal: number;
  isc: number;
  igvTotal: number;
  icbperTotal: number;
  otrosCargos: number;
  otrosTributos: number;
  montoRedondeo: number;
  importeTotal: number;
  importeEnLetras: string;
  operacionesGratuitas?: number;
}

// Transportista
export interface Transportista {
  id: string;
  codigo?: string;
  modalidad: 'privado' | 'publico';
  // Privado — conductor propio de la empresa
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  dni?: string;
  licenciaConducir?: string;
  categoriaLicencia?: string; // Categoría MTC: AIIa, AIIb, AIIIb, etc.
  numeroPlaca?: string;
  // Público — empresa/persona transportista externa
  ruc?: string;
  numeroRegistroMTC?: string;
  direccion?: string;
  // Común
  fotoUrl?: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocRelacionado {
  id: string;
  tipo: 'boleta' | 'factura' | 'gre';
  numero: string;   // numeroCompleto, ej: "EB01-000135"
  serie: string;
  clienteNombre?: string;
  // Para GRE Transportista — vinculación con GRE Remitente (GRR)
  rucEmisorGRR?: string;
  serieGRR?: string;     // 4 dígitos
  numeroGRR?: string;    // 8 dígitos (con ceros adelante)
}

export interface DatosFlete {
  quienPaga: 'remitente' | 'destinatario' | 'tercero';
  rucTercero?: string;
  razonSocialTercero?: string;
}

// Guía de Remisión
export interface GuiaRemision extends DocumentoBase {
  tipo: 'guia';
  tipoGuia?: 'remitente' | 'transportista'; // SUNAT: 09 = Remitente, 31 = Transportista
  fechaInicioTraslado: Date;
  fechaEntregaTransportista?: Date;
  motivoTraslado: MotivoTraslado;
  // Documentos relacionados — puede ser UNO O MÁS (boletas y/o facturas)
  documentosRelacionados: DocRelacionado[];
  // Backward compat (deprecated)
  documentoRelacionadoId?: string;
  documentoRelacionadoTipo?: 'boleta' | 'factura';
  documentoRelacionadoNumero?: string;
  // Datos destinatario
  destinatarioId?: string;
  destinatarioNombre: string;
  destinatarioDniRuc: string;
  // Puntos de traslado
  puntoPartida: string;
  puntoLlegada: string;
  // Bienes
  bienes: ItemDocumento[];
  pesoTotal: number;
  unidadMedidaPeso: 'KGM';
  numeroBultos?: number;
  // Transporte
  modalidadTraslado: 'privado' | 'publico';
  transbordoProgramado: boolean;
  retornoEnvasesVacios: boolean;
  trasladoVehiculoM1L: boolean;
  retornoVehiculoVacio: boolean;
  // Transportista
  transportistaId?: string;
  transportista?: Transportista;
  // Datos de flete (opcional, para GRE Transportista — slide paso 9)
  datosFlete?: DatosFlete;
}

// Catálogo 31 SUNAT - Motivos de Traslado
export type MotivoTraslado = 
  | '01' // Venta
  | '02' // Compra
  | '03' // Traslado entre establecimientos
  | '04' // Devolución
  | '05' // Exportación
  | '06' // Zona primaria
  | '07' // Consignación
  | '08' // Emisor itinerante
  | '09' // Zona primaria por emisor itinerante
  | '10' // Venta con entrega a terceros
  | '11' // Anticipo
  | '12' // Transformación
  | '13' // Emisor itinerante destino
  | '14' // Recojo bienes transformados
  | '15' // Cambio depositario
  | '16' // Distribución directa
  | '17' // Distribución

export const CATALOGO_MOTIVOS_TRASLADO: { value: MotivoTraslado; label: string }[] = [
  { value: '01', label: 'Venta' },
  { value: '02', label: 'Compra' },
  { value: '03', label: 'Traslado entre establecimientos' },
  { value: '04', label: 'Devolución' },
  { value: '05', label: 'Exportación' },
  { value: '06', label: 'Traslado a zona primaria' },
  { value: '07', label: 'Consignación' },
  { value: '08', label: 'Emisor itinerante' },
  { value: '09', label: 'Zona primaria por emisor itinerante' },
  { value: '10', label: 'Venta con entrega a terceros' },
  { value: '11', label: 'Anticipo de compraventa' },
  { value: '12', label: 'Traslado para transformación' },
  { value: '13', label: 'Emisor itinerante por entrega a destino' },
  { value: '14', label: 'Recojo de bienes transformados' },
  { value: '15', label: 'Cambio de depositario' },
  { value: '16', label: 'Distribución directa' },
  { value: '17', label: 'Distribución' },
]

// Producto/Catálogo
export interface Producto {
  id: string;
  codigo: string;
  codigoSunat?: string;
  partidaArancelaria?: string;
  gtin?: string;
  descripcion: string;
  detalle?: string; // Descripción detallada que se jala automáticamente
  unidadMedida: UnidadMedida;
  precioOriginal: number; // Precio de lista (tachado)
  precioUnitario: number; // Precio de venta real
  stock: number;
  categoria: string;
  imagen?: string; // URL de la imagen
  activo: boolean;
  usosFrecuentes: number;
}

// Usuario del sistema
export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: 'admin' | 'vendedor' | 'almacen';
  avatar?: string;
  activo: boolean;
  ultimoAcceso?: Date;
}

// Filtros y paginación
export interface FiltrosDocumento {
  fechaDesde?: Date;
  fechaHasta?: Date;
  clienteId?: string;
  estado?: string;
  serie?: string;
  numero?: string;
  busqueda?: string;
}

export interface Paginacion {
  pagina: number;
  porPagina: number;
  total: number;
  totalPaginas: number;
}

// Respuesta API
export interface ApiResponse<T> {
  data: T;
  error: string | null;
  message?: string;
}

// Configuración de series
export interface ConfiguracionSerie {
  tipo: TipoDocumento;
  serie: string;
  numeroActual: number;
  activo: boolean;
}
