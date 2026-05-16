// ============================================
// MÓDULO: LISTA DE FACTURAS
// ============================================

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter, Pencil } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatearMoneda } from '@/lib/calculos';
import PDFGenerator from '@/components/pdf/PDFGenerator';

const ESTADO_CONFIG = {
  borrador:  { label: 'Borrador',  bg: 'bg-slate-100', text: 'text-slate-600' },
  enviado:   { label: 'Enviado',   bg: 'bg-blue-100',  text: 'text-blue-700'  },
  aprobado:  { label: 'Aprobado',  bg: 'bg-green-100', text: 'text-green-700' },
  rechazado: { label: 'Rechazado', bg: 'bg-red-100',   text: 'text-red-700'   },
} as const;

export default function FacturasPage() {
  const { facturas } = useApp();
  const [busqueda, setBusqueda] = useState('');

  const facturasFiltradas = facturas.filter(factura => 
    factura.numeroCompleto.toLowerCase().includes(busqueda.toLowerCase()) ||
    factura.cliente.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    factura.cliente.ruc?.includes(busqueda)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Facturas Electrónicas</h1>
          <p className="text-slate-500">Gestiona tus facturas electrónicas para empresas</p>
        </div>
        <Link
          href="/crm/facturas/nueva"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors shadow-md"
        >
          <Plus className="w-5 h-5" />
          Nueva Factura
        </Link>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por número, cliente o RUC..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600">
            <Filter className="w-5 h-5" />
            Filtros
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {facturasFiltradas.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🧾</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              {busqueda ? 'No se encontraron facturas' : 'No hay facturas registradas'}
            </h3>
            <p className="text-slate-500 mb-4">
              {busqueda ? 'Intenta con otros términos' : 'Crea tu primera factura electrónica'}
            </p>
            {!busqueda && (
              <Link href="/crm/facturas/nueva" className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl font-semibold">
                <Plus className="w-5 h-5" />
                Crear Factura
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Número</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Cliente</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Forma Pago</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Fecha</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase">Total</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase">Estado</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {facturasFiltradas.map((factura) => (
                  <tr key={factura.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {factura.numeroCompleto}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-800">{factura.cliente.nombre}</p>
                        {factura.cliente.ruc && <p className="text-sm text-slate-500">RUC: {factura.cliente.ruc}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        factura.formaPago === 'contado' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {factura.formaPago === 'contado' ? 'Contado' : 'Crédito'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {factura.fechaEmision.toLocaleDateString('es-PE')}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-800">
                      {formatearMoneda(factura.importeTotal, factura.moneda)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {factura.estado in ESTADO_CONFIG && (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${ESTADO_CONFIG[factura.estado as keyof typeof ESTADO_CONFIG].bg} ${ESTADO_CONFIG[factura.estado as keyof typeof ESTADO_CONFIG].text}`}>
                          {ESTADO_CONFIG[factura.estado as keyof typeof ESTADO_CONFIG].label}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {factura.estado === 'borrador' && (
                          <Link
                            href={`/crm/facturas/nueva?edit=${factura.id}`}
                            className="p-1.5 hover:bg-purple-100 text-purple-600 rounded-lg transition-colors"
                            title="Editar factura"
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>
                        )}
                        <PDFGenerator documento={factura} tipo="factura" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
