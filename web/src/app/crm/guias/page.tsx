// ============================================
// MÓDULO: GUÍAS DE REMISIÓN
// ============================================

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Truck, Eye, Download } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import PDFGenerator from '@/components/pdf/PDFGenerator';

export default function GuiasPage() {
  const { guias, boletas, facturas } = useApp();
  const [busqueda, setBusqueda] = useState('');

  const guiasFiltradas = guias.filter(g => 
    g.numeroCompleto.toLowerCase().includes(busqueda.toLowerCase()) ||
    g.destinatarioNombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Guías de Remisión</h1>
          <p className="text-slate-500">Gestiona el transporte de tus productos</p>
        </div>
        <Link href="/crm/guias/nueva" className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-md">
          <Plus className="w-5 h-5" />
          Nueva Guía
        </Link>
      </div>

      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
        <p className="text-sm text-blue-800">
          <strong>Punto de Partida:</strong> {process.env.NEXT_PUBLIC_PUNTO_PARTIDA || 'PRO. QUINTA AVENIDA MZ. J LOTE. 17-B ASC. GANADEROS PORCINOS SARACO'}
        </p>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar guía..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {guiasFiltradas.length === 0 ? (
          <div className="p-12 text-center">
            <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-800">No hay guías registradas</h3>
            <Link href="/crm/guias/nueva" className="inline-flex items-center gap-2 px-5 py-2.5 mt-4 bg-indigo-600 text-white rounded-xl font-semibold">
              <Plus className="w-5 h-5" />
              Crear Guía
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase">Número</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase">Destinatario</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase">Motivo</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase">Fecha Traslado</th>
                <th className="px-6 py-4 text-center text-xs font-semibold uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {guiasFiltradas.map((guia) => (
                <tr key={guia.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      {guia.numeroCompleto}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-800">{guia.destinatarioNombre}</p>
                    <p className="text-sm text-slate-500">{guia.puntoLlegada.substring(0, 50)}...</p>
                  </td>
                  <td className="px-6 py-4 capitalize">{guia.motivoTraslado.replace('_', ' ')}</td>
                  <td className="px-6 py-4 text-slate-600">{guia.fechaInicioTraslado.toLocaleDateString('es-PE')}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <PDFGenerator documento={guia} tipo="guia" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
