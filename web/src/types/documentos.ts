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

export interface DocumentoBase {
  id: string;
  tipo: TipoDocumento;
  serie: string;
  numero: number;
  numeroCompleto: string; // E001-883
  fechaEmision: Date;
  fechaVencimiento?: Date;
  observacion?: string;
  estado: 'emitido' | 'anulado' | 'pendiente';
  qrCode?: string;
  hashCpe?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Cliente
export interface Cliente {
  id: string;
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
  valorUnitario: number; // Sin IGV
  descuento: number;
  anticipos: number;
  icbper: number;
  valorVenta: number;
  igv: number;
  importeTotal: number;
  // Campos para vincular con producto
  productoId?: string;
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
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  dni: string;
  licenciaConducir: string;
  numeroPlaca: string;
  fotoUrl?: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Guía de Remisión
export interface GuiaRemision extends DocumentoBase {
  tipo: 'guia';
  fechaInicioTraslado: Date;
  motivoTraslado: MotivoTraslado;
  // Documento relacionado (opcional)
  documentoRelacionadoId?: string;
  documentoRelacionadoTipo?: 'boleta' | 'factura';
  documentoRelacionadoNumero?: string;
  // Datos destinatario
  destinatarioId?: string;
  destinatarioNombre: string;
  destinatarioDniRuc: string;
  // Puntos de traslado
  puntoPartida: string; // Fijo
  puntoLlegada: string;
  // Bienes
  bienes: ItemDocumento[];
  pesoTotal: number;
  unidadMedidaPeso: 'KGM';
  // Transporte
  modalidadTraslado: 'privado' | 'publico';
  transbordoProgramado: boolean;
  retornoEnvasesVacios: boolean;
  trasladoVehiculoM1L: boolean;
  retornoVehiculoVacio: boolean;
  // Transportista
  transportistaId?: string;
  transportista?: Transportista;
}

export type MotivoTraslado = 
  | 'venta'
  | 'traslado_establecimientos'
  | 'importacion'
  | 'exportacion'
  | 'compra'
  | 'devolucion'
  | 'consignacion'
  | 'emisor_itinerante'
  | 'otros';

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
