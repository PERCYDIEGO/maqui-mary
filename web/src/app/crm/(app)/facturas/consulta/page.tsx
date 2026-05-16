'use client'

import { useSearchParams } from 'next/navigation'
import { FileText, CheckCircle, AlertTriangle } from 'lucide-react'
import { Suspense } from 'react'

function ConsultaFacturaContent() {
  const sp = useSearchParams()

  const ruc = sp.get('ruc') || ''
  const tipo = sp.get('tipo') || ''
  const serie = sp.get('serie') || ''
  const numero = sp.get('numero') || ''
  const fecha = sp.get('fecha') || ''
  const total = sp.get('total') || ''
  const moneda = sp.get('moneda') || 'PEN'
  const emisor = sp.get('emisor') || ''
  const cliente = sp.get('cliente') || ''
  const hash = sp.get('hash') || ''

  const tipoLabel = tipo === '01' ? 'Factura Electrónica' : tipo === '03' ? 'Boleta de Venta Electrónica' : 'Comprobante Electrónico'
  const isPreview = hash === 'preview'

  return (
    <div className="min-h-screen bg-primary-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-primary-800 p-6 text-white text-center">
          <h1 className="font-heading font-bold text-xl">Consulta de Comprobante</h1>
          <p className="text-primary-300 text-sm mt-1">Superintendencia Nacional de Aduanas y de Administración Tributaria - SUNAT</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Estado */}
          <div className="flex items-center gap-3 justify-center">
            {isPreview ? (
              <>
                <AlertTriangle size={24} className="text-amber-500" />
                <div className="text-center">
                  <p className="font-semibold text-amber-700">Previsualización / En proceso de emisión</p>
                  <p className="text-xs text-amber-600">Este comprobante aún no ha sido remitido a SUNAT</p>
                </div>
              </>
            ) : (
              <>
                <CheckCircle size={24} className="text-green-500" />
                <div className="text-center">
                  <p className="font-semibold text-green-700">Comprobante válido</p>
                  <p className="text-xs text-green-600">Autorizado mediante Resolución N° 097-2012/SUNAT</p>
                </div>
              </>
            )}
          </div>

          {/* Datos */}
          <div className="bg-primary-50 rounded-xl p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-primary-500">Tipo de comprobante</span>
              <span className="font-medium text-primary-800">{tipoLabel}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-primary-500">Serie - Número</span>
              <span className="font-medium text-primary-800 font-mono">{serie}-{numero}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-primary-500">Fecha de emisión</span>
              <span className="font-medium text-primary-800">{fecha}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-primary-500">RUC Emisor</span>
              <span className="font-medium text-primary-800">{ruc}</span>
            </div>
            {emisor && (
              <div className="flex justify-between text-sm">
                <span className="text-primary-500">Razón Social Emisor</span>
                <span className="font-medium text-primary-800">{decodeURIComponent(emisor)}</span>
              </div>
            )}
            {cliente && (
              <div className="flex justify-between text-sm">
                <span className="text-primary-500">Cliente</span>
                <span className="font-medium text-primary-800">{decodeURIComponent(cliente)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm border-t border-primary-200 pt-2 mt-2">
              <span className="text-primary-500">Importe Total</span>
              <span className="font-bold text-accent-gold">{moneda === 'USD' ? '$' : 'S/'} {total}</span>
            </div>
            {hash && !isPreview && (
              <div className="flex justify-between text-sm">
                <span className="text-primary-500">Hash (firma digital)</span>
                <span className="font-mono text-primary-800 text-xs">{hash.slice(0, 20)}...</span>
              </div>
            )}
          </div>

          <div className="text-center text-xs text-primary-400 space-y-1">
            <p>Para verificar este comprobante en SUNAT:</p>
            <a href="https://www.sunat.gob.pe" target="_blank" rel="noopener noreferrer" className="text-accent-gold hover:underline">
              www.sunat.gob.pe
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-primary-100 p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <img src="/img/logo_oficial.png" alt="Maqui Mary" className="h-8 w-auto" />
            <span className="font-heading font-bold text-primary-700 text-sm">MAQUI MARY</span>
          </div>
          <p className="text-xs text-primary-500 mt-1">Esponjas de limpieza · Ate Vitarte, Lima, Perú</p>
        </div>
      </div>
    </div>
  )
}

export default function ConsultaFacturaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-primary-50 flex items-center justify-center">Cargando...</div>}>
      <ConsultaFacturaContent />
    </Suspense>
  )
}
