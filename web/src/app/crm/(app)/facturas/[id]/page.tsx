'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  FileText,
  ArrowLeft,
  Download,
  RefreshCw,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Hash,
  CreditCard,
  Building2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface FacturaItem {
  id: number
  description: string
  quantity: number
  unit_price: number
  total: number
}

interface Factura {
  id: number
  series: string
  number: number
  cliente_id: number | null
  cliente_nombre: string
  cliente_ruc: string
  cliente_direccion: string
  tipo_comprobante: string
  origen: string
  subtotal: number
  igv: number
  total: number
  notes: string
  estado_sunat: string
  sunat_response: string
  ticket_sunat: string
  cdr_xml: string
  cdr_codigo: string
  cdr_descripcion: string
  xml_url: string
  pdf_url: string
  forma_pago: string
  moneda: string
  tipo_cambio: number | null
  guia_remision: string
  orden_compra: string
  enviado_at: string | null
  created_at: string
}

const ESTADO_INFO: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  ACEPTADO: { label: 'Aceptado por SUNAT', bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  ENVIADO: { label: 'Enviado a SUNAT', bg: 'bg-blue-100', text: 'text-blue-700', icon: Send },
  PENDIENTE: { label: 'Pendiente de envío', bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
  RECHAZADO: { label: 'Rechazado por SUNAT', bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
  ERROR: { label: 'Error al enviar', bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle },
}

export default function FacturaDetallePage() {
  const params = useParams()
  const id = Number(params.id)

  const [factura, setFactura] = useState<Factura | null>(null)
  const [items, setItems] = useState<FacturaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)

  async function cargarDetalle() {
    setLoading(true)
    try {
      const { data: fData, error: fError } = await supabase
        .from('facturas')
        .select('*')
        .eq('id', id)
        .single()

      if (fError) throw fError
      setFactura(fData)

      const { data: iData, error: iError } = await supabase
        .from('factura_items')
        .select('*')
        .eq('factura_id', id)

      if (iError) throw iError
      setItems(iData || [])
    } catch (e: any) {
      toast.error('Error cargando detalle: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) cargarDetalle()
  }, [id])

  function tipoLabel(tipo: string) {
    switch (tipo) {
      case '01': return 'Factura Electrónica'
      case '03': return 'Boleta de Venta Electrónica'
      case '07': return 'Nota de Crédito Electrónica'
      case '08': return 'Nota de Débito Electrónica'
      default: return 'Comprobante Electrónico'
    }
  }

  async function reenviarSunat() {
    if (!factura) return
    setEnviando(true)
    try {
      const res = await fetch('/api/sunat/emit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facturaId: factura.id }),
      })
      const data = await res.json()

      if (data.success) {
        toast.success('Enviado a SUNAT: ' + (data.message || 'OK'))
        await cargarDetalle()
      } else {
        toast.error(data.message || 'Error al enviar')
      }
    } catch (e: any) {
      toast.error('Error de red: ' + e.message)
    } finally {
      setEnviando(false)
    }
  }

  function downloadXml() {
    if (!factura?.cdr_xml) {
      toast.error('No hay XML disponible')
      return
    }
    const blob = new Blob([factura.cdr_xml], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${factura.series}-${String(factura.number).padStart(4, '0')}.xml`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-primary-400">
        <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm">Cargando comprobante...</p>
      </div>
    )
  }

  if (!factura) {
    return (
      <div className="text-center py-32 text-primary-400">
        <FileText size={64} className="mx-auto mb-4 opacity-50" />
        <p className="font-heading font-bold text-lg text-primary-600 mb-2">Comprobante no encontrado</p>
        <Link href="/crm/facturas" className="btn-primary text-sm inline-flex items-center gap-2 mt-4">
          <ArrowLeft size={18} /> Volver a facturas
        </Link>
      </div>
    )
  }

  const estado = ESTADO_INFO[factura.estado_sunat] || ESTADO_INFO.PENDIENTE
  const EstadoIcon = estado.icon
  const numero = `${factura.series}-${String(factura.number).padStart(4, '0')}`
  const puedeReenviar = ['PENDIENTE', 'ERROR', 'RECHAZADO'].includes(factura.estado_sunat)

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/crm/facturas"
            className="p-2 rounded-xl bg-white border border-primary-200 text-primary-600 hover:bg-primary-50 transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="font-heading text-2xl font-bold text-primary-800">{numero}</h1>
            <p className="text-primary-500 text-sm">{tipoLabel(factura.tipo_comprobante)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {factura.pdf_url && (
            <a
              href={factura.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-sm flex items-center gap-2"
            >
              <FileText size={16} /> Ver PDF
            </a>
          )}
          {puedeReenviar && (
            <button
              onClick={reenviarSunat}
              disabled={enviando}
              className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={16} className={enviando ? 'animate-spin' : ''} />
              {enviando ? 'Enviando...' : 'Reenviar a SUNAT'}
            </button>
          )}
        </div>
      </div>

      {/* Estado badge */}
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium mb-6 ${estado.bg} ${estado.text}`}>
        <EstadoIcon size={18} />
        {estado.label}
        {factura.ticket_sunat && (
          <span className="opacity-75 text-xs">· Ticket: {factura.ticket_sunat}</span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal: cliente + items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cliente */}
          <div className="card !p-5">
            <h2 className="font-heading font-bold text-lg text-primary-800 mb-4 flex items-center gap-2">
              <User size={20} className="text-accent-gold" /> Cliente
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Building2 size={18} className="text-primary-400 mt-0.5" />
                <div>
                  <p className="text-sm text-primary-500">Razón social / Nombre</p>
                  <p className="font-medium text-primary-800">
                    {factura.cliente_nombre || (
                      factura.tipo_comprobante === '03' ? 'PÚBLICO EN GENERAL' : '—'
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Hash size={18} className="text-primary-400 mt-0.5" />
                <div>
                  <p className="text-sm text-primary-500">RUC / Documento</p>
                  <p className="font-medium text-primary-800">
                    {factura.cliente_ruc || (
                      factura.tipo_comprobante === '03' ? 'Sin identificar' : 'Sin documento'
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-primary-400 mt-0.5" />
                <div>
                  <p className="text-sm text-primary-500">Dirección</p>
                  <p className="font-medium text-primary-800">{factura.cliente_direccion || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar size={18} className="text-primary-400 mt-0.5" />
                <div>
                  <p className="text-sm text-primary-500">Fecha de emisión</p>
                  <p className="font-medium text-primary-800">
                    {new Date(factura.created_at).toLocaleDateString('es-PE', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="card !p-5">
            <h2 className="font-heading font-bold text-lg text-primary-800 mb-4 flex items-center gap-2">
              <CreditCard size={20} className="text-accent-gold" /> Items
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-primary-100">
                    <th className="text-left py-2 text-primary-500 font-medium">Descripción</th>
                    <th className="text-right py-2 text-primary-500 font-medium">Cant.</th>
                    <th className="text-right py-2 text-primary-500 font-medium">P. Unit</th>
                    <th className="text-right py-2 text-primary-500 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-primary-50 last:border-0">
                      <td className="py-3 text-primary-800">{item.description}</td>
                      <td className="py-3 text-right text-primary-700">{item.quantity}</td>
                      <td className="py-3 text-right text-primary-700">S/ {Number(item.unit_price).toFixed(2)}</td>
                      <td className="py-3 text-right font-medium text-primary-800">S/ {Number(item.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Respuesta SUNAT */}
          {factura.sunat_response && (
            <div className="card !p-5">
              <h2 className="font-heading font-bold text-lg text-primary-800 mb-3 flex items-center gap-2">
                <Send size={20} className="text-accent-gold" /> Respuesta SUNAT
              </h2>
              <pre className="bg-primary-50 rounded-xl p-4 text-xs text-primary-700 overflow-x-auto whitespace-pre-wrap">
                {factura.sunat_response}
              </pre>
            </div>
          )}

          {/* XML CDR */}
          {factura.cdr_xml && (
            <div className="card !p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-heading font-bold text-lg text-primary-800 flex items-center gap-2">
                  <FileText size={20} className="text-accent-gold" /> XML / CDR
                </h2>
                <button
                  onClick={downloadXml}
                  className="text-xs flex items-center gap-1 text-primary-600 hover:text-primary-800"
                >
                  <Download size={14} /> Descargar XML
                </button>
              </div>
              <pre className="bg-primary-50 rounded-xl p-4 text-xs text-primary-700 overflow-x-auto whitespace-pre-wrap max-h-64">
                {factura.cdr_xml.substring(0, 2000)}
                {factura.cdr_xml.length > 2000 && '...'}
              </pre>
            </div>
          )}
        </div>

        {/* Sidebar: totales + metadatos */}
        <div className="space-y-6">
          <div className="card !p-5">
            <h2 className="font-heading font-bold text-lg text-primary-800 mb-4">Totales</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-primary-500">Subtotal</span>
                <span className="font-medium text-primary-800">S/ {Number(factura.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-primary-500">IGV (18%)</span>
                <span className="font-medium text-primary-800">S/ {Number(factura.igv).toFixed(2)}</span>
              </div>
              <div className="border-t border-primary-100 pt-3 flex justify-between">
                <span className="font-heading font-bold text-primary-800">Total</span>
                <span className="font-heading font-bold text-accent-gold text-lg">S/ {Number(factura.total).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Datos adicionales SUNAT */}
          <div className="card !p-5">
            <h2 className="font-heading font-bold text-lg text-primary-800 mb-4">Datos SUNAT</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <CreditCard size={14} className="text-primary-400" />
                <span className="text-primary-500">Forma de pago:</span>
                <span className="font-medium text-primary-800 capitalize">{factura.forma_pago || '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Hash size={14} className="text-primary-400" />
                <span className="text-primary-500">Moneda:</span>
                <span className="font-medium text-primary-800">{factura.moneda || 'PEN'}</span>
                {factura.tipo_cambio && (
                  <span className="text-primary-400 text-xs">(TC: {factura.tipo_cambio})</span>
                )}
              </div>
              {factura.guia_remision && (
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-primary-400" />
                  <span className="text-primary-500">Guía de remisión:</span>
                  <span className="font-medium text-primary-800">{factura.guia_remision}</span>
                </div>
              )}
              {factura.orden_compra && (
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-primary-400" />
                  <span className="text-primary-500">Orden de compra:</span>
                  <span className="font-medium text-primary-800">{factura.orden_compra}</span>
                </div>
              )}
              {factura.cdr_codigo && (
                <div className="pt-2 border-t border-primary-100">
                  <p className="text-primary-500 mb-1">CDR SUNAT:</p>
                  <p className="font-medium text-primary-800 text-xs">Código: {factura.cdr_codigo}</p>
                  {factura.cdr_descripcion && (
                    <p className="text-primary-600 text-xs">{factura.cdr_descripcion}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="card !p-5">
            <h2 className="font-heading font-bold text-lg text-primary-800 mb-4">Metadatos</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Hash size={14} className="text-primary-400" />
                <span className="text-primary-500">ID interno:</span>
                <span className="font-medium text-primary-800">{factura.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <Send size={14} className="text-primary-400" />
                <span className="text-primary-500">Origen:</span>
                <span className="font-medium text-primary-800 capitalize">{factura.origen}</span>
              </div>
              {factura.enviado_at && (
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-primary-400" />
                  <span className="text-primary-500">Enviado:</span>
                  <span className="font-medium text-primary-800">
                    {new Date(factura.enviado_at).toLocaleString('es-PE')}
                  </span>
                </div>
              )}
              {factura.notes && (
                <div className="pt-2 border-t border-primary-100">
                  <p className="text-primary-500 mb-1">Notas:</p>
                  <p className="text-primary-700">{factura.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
