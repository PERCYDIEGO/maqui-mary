import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import PrintButton from './PrintButton'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  return {
    title: `Comprobante ${params.id} — Maqui Mary Perú`,
    description: 'Verificación de comprobante electrónico emitido por Inversiones Maqui Mary Peru E.I.R.L.',
    robots: 'noindex, nofollow',
  }
}

// ─── Helpers ───
function tipoLabel(tipo: string) {
  if (tipo === '01') return 'FACTURA ELECTRÓNICA'
  if (tipo === '03') return 'BOLETA DE VENTA ELECTRÓNICA'
  if (tipo === '09') return 'GUÍA DE REMISIÓN ELECTRÓNICA'
  return 'COMPROBANTE ELECTRÓNICO'
}

function tipoColors(tipo: string) {
  if (tipo === '01') return { from: 'from-purple-700', to: 'to-purple-500', text: 'text-purple-200', badge: 'text-purple-900' }
  if (tipo === '09') return { from: 'from-blue-700', to: 'to-blue-500', text: 'text-blue-200', badge: 'text-blue-900' }
  return { from: 'from-amber-600', to: 'to-amber-400', text: 'text-amber-100', badge: 'text-amber-900' }
}

function estadoBadge(estado: string | null) {
  if (estado === 'ACEPTADO')  return { icon: '✅', label: 'ACEPTADO POR SUNAT', cls: 'bg-green-100 text-green-800 border-green-200' }
  if (estado === 'RECHAZADO') return { icon: '❌', label: 'RECHAZADO POR SUNAT', cls: 'bg-red-100 text-red-800 border-red-200' }
  return { icon: '⏳', label: 'PENDIENTE DE ENVÍO', cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtMonto(n: number | string) {
  return `S/ ${Number(n || 0).toFixed(2)}`
}

// ─── Página ───
export default async function DocVerificacionPage({ params }: { params: { id: string } }) {
  const dashIdx = params.id.indexOf('-')
  if (dashIdx === -1) notFound()

  const serie  = params.id.slice(0, dashIdx).toUpperCase()
  const numStr = params.id.slice(dashIdx + 1)
  const numero = parseInt(numStr, 10)
  if (!serie || isNaN(numero) || numero <= 0) notFound()

  const supabase = getSupabase()

  const { data: doc } = await supabase
    .from('facturas')
    .select('*')
    .eq('series', serie)
    .eq('number', numero)
    .single()

  if (!doc) notFound()

  const { data: items } = await supabase
    .from('factura_items')
    .select('description, quantity, unit_price, total')
    .eq('factura_id', doc.id)

  const numCompleto = `${serie}-${String(numero).padStart(8, '0')}`
  const fecha       = fmtFecha(doc.fecha_emision || doc.created_at)
  const colors      = tipoColors(doc.tipo_comprobante)
  const estado      = estadoBadge(doc.estado_sunat)
  const total       = Number(doc.total || 0)
  const subtotal    = Number(doc.subtotal || 0)
  const igv         = Number(doc.igv || 0)
  const showDesglose = subtotal > 0 && igv > 0 && subtotal !== total

  return (
    <>
      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .card { box-shadow: none !important; border: 1px solid #ddd !important; }
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 py-8 px-4 print:bg-white print:p-0 print:py-0">
        <div className="max-w-md mx-auto space-y-4">

          {/* Logo / branding */}
          <div className="text-center print:hidden">
            <div className="inline-flex items-center gap-2 bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-white/80">
              <span className="text-xl">🧽</span>
              <div className="text-left">
                <p className="font-bold text-slate-800 text-sm leading-tight">Maqui Mary Perú</p>
                <p className="text-slate-400 text-xs">Verificación de comprobante</p>
              </div>
            </div>
          </div>

          {/* Card principal */}
          <div className="card bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">

            {/* Header con color según tipo */}
            <div className={`bg-gradient-to-br ${colors.from} ${colors.to} text-white p-6`}>
              <p className={`text-xs font-semibold tracking-widest uppercase ${colors.text} mb-1`}>
                {tipoLabel(doc.tipo_comprobante)}
              </p>
              <p className="text-3xl font-bold font-mono tracking-tight mb-1">{numCompleto}</p>
              <p className={`text-sm ${colors.text} mb-3`}>{fecha}</p>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-white/90 ${estado.cls}`}>
                {estado.icon} {estado.label}
              </div>
            </div>

            {/* Emisor */}
            <div className="px-6 py-4 border-b border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Emisor</p>
              <p className="font-semibold text-slate-800">INVERSIONES MAQUI MARY PERU E.I.R.L.</p>
              <p className="text-sm text-slate-500">RUC 20606218801</p>
              <p className="text-sm text-slate-500">Lurigancho, Lima, Perú</p>
            </div>

            {/* Cliente */}
            {doc.cliente_nombre && (
              <div className="px-6 py-4 border-b border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  {doc.tipo_comprobante === '01' ? 'Adquiriente' : 'Cliente'}
                </p>
                <p className="font-semibold text-slate-800">{doc.cliente_nombre}</p>
                {doc.cliente_ruc && <p className="text-sm text-slate-500">RUC: {doc.cliente_ruc}</p>}
                {doc.cliente_dni && <p className="text-sm text-slate-500">DNI: {doc.cliente_dni}</p>}
                {doc.cliente_direccion && <p className="text-sm text-slate-500">{doc.cliente_direccion}</p>}
              </div>
            )}

            {/* Items */}
            {items && items.length > 0 && (
              <div className="px-6 py-4 border-b border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Detalle</p>
                <div className="space-y-3">
                  {items.map((item, i) => (
                    <div key={i} className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-800 font-medium leading-snug">{item.description}</p>
                        {item.unit_price != null && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {item.quantity} und × {fmtMonto(item.unit_price)}
                          </p>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-slate-800 shrink-0 tabular-nums">
                        {fmtMonto(item.total)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Totales */}
            <div className="px-6 py-5 bg-slate-50 border-b border-slate-100">
              {showDesglose && (
                <>
                  <div className="flex justify-between text-sm text-slate-500 mb-1.5">
                    <span>Subtotal (sin IGV)</span>
                    <span className="tabular-nums">{fmtMonto(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-500 mb-3">
                    <span>IGV (18%)</span>
                    <span className="tabular-nums">{fmtMonto(igv)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-baseline">
                <span className="text-base font-bold text-slate-800">TOTAL A PAGAR</span>
                <span className={`text-2xl font-bold tabular-nums ${
                  doc.tipo_comprobante === '01' ? 'text-purple-700'
                  : doc.tipo_comprobante === '09' ? 'text-blue-700'
                  : 'text-amber-600'
                }`}>
                  {fmtMonto(total)}
                </span>
              </div>
            </div>

            {/* Firma digital */}
            {doc.hash_cpe && (
              <div className="px-6 py-4 border-b border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Firma digital (HASH)</p>
                <p className="text-xs font-mono text-slate-500 break-all bg-slate-50 rounded-xl p-3 leading-relaxed">
                  {doc.hash_cpe}
                </p>
              </div>
            )}

            {/* Instrucciones de verificación SUNAT */}
            <div className="px-6 py-4">
              <div className="flex gap-3 p-3 bg-blue-50 rounded-2xl border border-blue-100">
                <span className="text-lg shrink-0">🏛️</span>
                <div className="text-xs text-blue-800 space-y-1">
                  <p className="font-semibold">Verificar en SUNAT</p>
                  <p>
                    Ingrese a <strong>ww1.sunat.gob.pe</strong> → "Consulta de
                    Comprobantes", luego ingrese RUC <strong>20606218801</strong>,
                    tipo de documento, serie <strong>{serie}</strong> y número{' '}
                    <strong>{String(numero).padStart(8, '0')}</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Botón imprimir */}
          <div className="text-center pb-2">
            <PrintButton />
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-slate-400 pb-4 print:hidden">
            🧽 Maqui Mary Perú · Fabricación de esponjas y accesorios de limpieza
            <br />RUC 20606218801 · Lurigancho, Lima
          </p>

        </div>
      </div>
    </>
  )
}
