export interface ProductoInsert extends Record<string, unknown> {
  name: string
  description: string
  price: number
  precio_original: number | null
  category: string
  color_info: string
  imagen: string
  codigo?: string
}

export interface Producto {
  id: number
  codigo: string
  name: string
  descripcion?: string
  description: string
  detalle?: string
  price: number
  precioUnitario?: number
  precio_original: number | null
  precioOriginal?: number
  category: string
  categoria?: string
  color_info: string
  stock: number
  is_active: boolean
  activo?: boolean
  imagen: string
  image?: string
  created_at: string
}

export interface Profile {
  id: string
  full_name: string
  role: string
}

export interface Cliente {
  id: number
  name: string
  ruc: string
  address: string
  phone: string
  email: string
  created_at: string
}

export interface Factura {
  id: number
  series: string
  number: number
  cliente_id: number | null
  cliente_nombre: string
  cliente_ruc: string
  cliente_direccion: string
  date_millis: number
  subtotal: number
  igv: number
  total: number
  notes: string
  payment_evidence_url: string | null
  created_at: string
  items?: FacturaItem[]
}

export interface FacturaItem {
  id: number
  factura_id: number
  producto_id: number | null
  description: string
  quantity: number
  unit_price: number
  total: number
}

export interface Configuracion {
  id: number
  company_name: string
  ruc: string
  address: string
  phone: string
  series: string
  next_number: number
}
