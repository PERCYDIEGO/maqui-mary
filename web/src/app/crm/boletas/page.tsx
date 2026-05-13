// ============================================
// PÁGINA: LISTA DE BOLETAS
// ============================================

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter, Eye, Download } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatearMoneda } from '@/lib/calculos';
import PDFGenerator from '@/components/pdf/PDFGenerator';
import { Boleta } from '@/types/documentos';

export default function BoletasPage() {
  const { boletas } = useApp();
  const [busqueda, setBusqueda] = useState('');

  // Filtrar boletas
  const boletasFiltradas = boletas.filter(boleta => 
    boleta.numeroCompleto.toLowerCase().includes(busqueda.toLowerCase()) ||
    boleta.cliente.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    boleta.cliente.dni?.includes(busqueda)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Boletas de Venta</h1>
          <p className="text-slate-500">Gestiona tus boletas electrónicas</p>
        </div>
        <Link
          href="/crm/boletas/nueva"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold transition-colors shadow-md"
        >
          <Plus className="w-5 h-5" />
          Nueva Boleta
        </Link>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por número, cliente o DNI..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
            />
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600">
            <Filter className="w-5 h-5" />
            Filtros
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {boletasFiltradas.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🧾</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              {busqueda ? 'No se encontraron boletas' : 'No hay boletas registradas'}
            </h3>
            <p className="text-slate-500 mb-4">
              {busqueda 
                ? 'Intenta con otros términos de búsqueda' 
                : 'Crea tu primera boleta de venta electrónica'}
            </p>
            {!busqueda && (
              <Link
                href="/crm/boletas/nueva"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold transition-colors"
              >
                <Plus className="w-5 h-5" />
                Crear Boleta
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Número
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {boletasFiltradas.map((boleta) => (
                  <tr key={boleta.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        {boleta.numeroCompleto}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-800">{boleta.cliente.nombre}</p>
                        {boleta.cliente.dni && (
                          <p className="text-sm text-slate-500">DNI: {boleta.cliente.dni}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {boleta.fechaEmision.toLocaleDateString('es-PE', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-semibold text-slate-800">
                        {formatearMoneda(boleta.importeTotal, boleta.moneda)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <PDFGenerator documento={boleta} tipo="boleta" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info */}
      {boletasFiltradas.length > 0 && (
        <p className="text-sm text-slate-500 text-center">
          Mostrando {boletasFiltradas.length} de {boletas.length} boletas
        </p>
      )}
    </div>
  );
}
