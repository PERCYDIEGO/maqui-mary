// ============================================
// PÁGINA: DOCUMENTOS UNIFICADA
// Tabs: Boletas | Facturas | Guías
// ============================================

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Plus, Search, FileText, Receipt, Truck, Filter, Pencil, Trash2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatearMoneda } from '@/lib/calculos';

const PDFGenerator = dynamic(() => import('@/components/pdf/PDFGenerator'), { ssr: false });

type TipoDocumento = 'boletas' | 'facturas' | 'guias';

const tabs = [
  { id: 'boletas' as TipoDocumento, label: 'Boletas de Venta', icon: Receipt, color: 'amber', serie: 'EB01' },
  { id: 'facturas' as TipoDocumento, label: 'Facturas', icon: FileText, color: 'purple', serie: 'E001' },
  { id: 'guias' as TipoDocumento, label: 'Guías de Remisión', icon: Truck, color: 'indigo', serie: 'T001' },
];

const colorClasses: Record<string, { bg: string; text: string; light: string }> = {
  amber: { bg: 'bg-amber-100', text: 'text-amber-800', light: 'bg-amber-50' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-800', light: 'bg-purple-50' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-800', light: 'bg-indigo-50' },
};

export default function DocumentosPage() {
  const { boletas, facturas, guias, eliminarDocumentoRechazado } = useApp();
  const [tabActiva, setTabActiva] = useState<TipoDocumento>('boletas');
  const [busqueda, setBusqueda] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const getDocumentos = () => {
    switch (tabActiva) {
      case 'boletas': return boletas;
      case 'facturas': return facturas;
      case 'guias': return guias;
    }
  };

  const documentos = getDocumentos()
    // Los documentos aprobados ya no requieren acción — quedan visibles con PDF/impresión
    // en /crm/sunat > Historial de Envíos en vez de acá.
    .filter((doc: any) => doc.estado !== 'aprobado')
    .filter((doc: any) => {
      const termino = busqueda.toLowerCase();
      const clienteNombre = String(doc.cliente?.nombre || doc.destinatarioNombre || '');
      return String(doc.numeroCompleto || '').toLowerCase().includes(termino) || clienteNombre.toLowerCase().includes(termino);
    })
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const tabConfig = tabs.find(t => t.id === tabActiva)!;
  const colors = colorClasses[tabConfig.color];

  const getNuevaUrl = () => {
    switch (tabActiva) {
      case 'boletas': return '/crm/boletas/nueva';
      case 'facturas': return '/crm/facturas/nueva';
      case 'guias': return '/crm/guias/nueva';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-ink-800">Documentos Electrónicos</h1>
            <p className="text-ink-500">Gestiona boletas, facturas y guías de remisión</p>
          </div>
          <Link href={getNuevaUrl()} className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-terracotta hover:bg-accent-terracotta/90 text-white rounded-xl font-semibold transition-all shadow-warm">
            <Plus className="w-5 h-5" />
            <span>Nueva {tabConfig.label}</span>
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 p-1 bg-ink-100 rounded-xl">
          {tabs.map((tab) => {
            const isActive = tabActiva === tab.id;
            const Icon = tab.icon;
            const tabColors = colorClasses[tab.color];
            const count = (tab.id === 'boletas' ? boletas : tab.id === 'facturas' ? facturas : guias).filter((d: any) => d.estado !== 'aprobado').length;
            
            return (
              <button key={tab.id} onClick={() => { setTabActiva(tab.id); setBusqueda(''); }} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive ? `${tabColors.bg} ${tabColors.text} shadow-soft` : 'text-ink-600 hover:bg-ink-200'}`}>
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.serie}</span>
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-white/50' : 'bg-ink-200 text-ink-600'}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-accent-cream p-4 rounded-xl border border-ink-200 shadow-soft">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
            <input type="text" placeholder={`Buscar ${tabConfig.label.toLowerCase()}...`} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-ink-200 rounded-xl focus:ring-2 focus:ring-accent-terracotta focus:border-transparent outline-none bg-white" />
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 border border-ink-200 rounded-xl hover:bg-ink-100 text-ink-600 transition-colors">
            <Filter className="w-5 h-5" /> Filtros
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-accent-cream rounded-xl border border-ink-200 shadow-soft overflow-hidden">
        {documentos.length === 0 ? (
          <div className="p-12 text-center">
            <div className={`w-16 h-16 ${colors.light} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <tabConfig.icon className={`w-8 h-8 ${colors.text}`} />
            </div>
            <h3 className="text-lg font-heading font-semibold text-ink-800 mb-2">{busqueda ? 'No se encontraron documentos' : `No hay ${tabConfig.label.toLowerCase()}`}</h3>
            {!busqueda && <Link href={getNuevaUrl()} className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-terracotta text-white rounded-xl font-semibold"><Plus className="w-5 h-5" /> Crear {tabConfig.label}</Link>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-ink-50 border-b border-ink-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-ink-600 uppercase">Número</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-ink-600 uppercase">{tabActiva === 'guias' ? 'Destinatario' : 'Cliente'}</th>
                  {tabActiva === 'facturas' && <th className="px-6 py-4 text-left text-xs font-semibold text-ink-600 uppercase">Forma Pago</th>}
                  {tabActiva === 'guias' && <th className="px-6 py-4 text-left text-xs font-semibold text-ink-600 uppercase">Motivo</th>}
                  <th className="px-6 py-4 text-left text-xs font-semibold text-ink-600 uppercase">Fecha</th>
                  {tabActiva !== 'guias' && <th className="px-6 py-4 text-right text-xs font-semibold text-ink-600 uppercase">Total</th>}
                  <th className="px-6 py-4 text-center text-xs font-semibold text-ink-600 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {documentos.map((doc: any) => (
                  <tr key={doc.id} className="hover:bg-ink-50/50 transition-colors">
                    <td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>{doc.numeroCompleto}</span></td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-ink-800">{tabActiva === 'guias' ? doc.destinatarioNombre : doc.cliente?.nombre}</p>
                      {tabActiva !== 'guias' && doc.cliente?.dni && <p className="text-sm text-ink-500">DNI: {doc.cliente.dni}</p>}
                      {tabActiva !== 'guias' && doc.cliente?.ruc && <p className="text-sm text-ink-500">RUC: {doc.cliente.ruc}</p>}
                    </td>
                    {tabActiva === 'facturas' && <td className="px-6 py-4"><span className={`px-2 py-1 rounded-lg text-xs font-medium ${doc.formaPago === 'contado' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{doc.formaPago === 'contado' ? 'Contado' : 'Crédito'}</span></td>}
                    {tabActiva === 'guias' && <td className="px-6 py-4 capitalize text-ink-600">{doc.motivoTraslado?.replace(/_/g, ' ')}</td>}
                    <td className="px-6 py-4 text-ink-600 text-sm">
                      <span className="block">{new Date(doc.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      <span className="text-ink-400 text-xs">{new Date(doc.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    {tabActiva !== 'guias' && <td className="px-6 py-4 text-right font-semibold text-ink-800">{formatearMoneda(doc.importeTotal, doc.moneda)}</td>}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {doc.estado === 'borrador' && (
                          <Link
                            href={`${getNuevaUrl()}?edit=${doc.id}`}
                            className="p-1.5 hover:bg-ink-200 text-accent-terracotta rounded-lg transition-colors"
                            title={`Editar ${tabConfig.label.toLowerCase()}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>
                        )}
                        <PDFGenerator documento={doc} tipo={tabActiva.slice(0, -1) as any} />
                        {doc.estado === 'borrador' && (
                          confirmDelete === doc.id ? (
                            <button
                              onClick={() => { eliminarDocumentoRechazado(doc.id, tabActiva.slice(0, -1) as 'boleta' | 'factura' | 'guia'); setConfirmDelete(null); }}
                              className="px-2 py-1 text-xs font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                            >
                              ¿Eliminar?
                            </button>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(doc.id)}
                              className="p-1.5 hover:bg-red-100 text-red-400 hover:text-red-600 rounded-lg transition-colors"
                              title={`Eliminar ${tabConfig.label.toLowerCase()}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )
                        )}
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
