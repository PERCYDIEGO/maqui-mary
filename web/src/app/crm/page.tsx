// ============================================
// DASHBOARD - CRM MAQUI MARY
// Estilo marrón/terracota del landing
// ============================================

'use client';

import React from 'react';
import Link from 'next/link';
import { 
  FileText, 
  TrendingUp,
  Users,
  ArrowRight,
  Calendar,
  Package,
  Store,
  Plus
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

// ============================================
// COMPONENTE STAT CARD
// ============================================

function StatCard({ 
  titulo, 
  valor, 
  subtitulo, 
  icono: Icono,
  href 
}: { 
  titulo: string;
  valor: string | number;
  subtitulo: string;
  icono: React.ElementType;
  href: string;
}) {
  return (
    <Link 
      href={href}
      className="block bg-accent-cream rounded-2xl p-6 border border-ink-200 shadow-soft hover:shadow-warm transition-all hover:border-accent-terracotta/30"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-ink-600 mb-1">{titulo}</p>
          <p className="text-3xl font-heading font-bold text-ink-800 mb-1">{valor}</p>
          <p className="text-sm text-ink-500">{subtitulo}</p>
        </div>
        <div className="p-3 rounded-xl border bg-accent-sand border-ink-200 text-accent-terracotta">
          <Icono className="w-6 h-6" />
        </div>
      </div>
    </Link>
  );
}

// ============================================
// COMPONENTE ACCESO RÁPIDO
// ============================================

function AccesoRapido({ 
  titulo, 
  descripcion, 
  icono: Icono,
  href 
}: { 
  titulo: string;
  descripcion: string;
  icono: React.ElementType;
  href: string;
}) {
  return (
    <Link 
      href={href}
      className="group flex items-center gap-4 p-4 bg-accent-cream rounded-xl border border-ink-200 hover:border-accent-terracotta/30 transition-all hover:shadow-warm"
    >
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-terracotta to-accent-gold flex items-center justify-center shadow-warm group-hover:scale-105 transition-transform">
        <Icono className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1">
        <h3 className="font-heading font-semibold text-ink-800 group-hover:text-accent-terracotta transition-colors">{titulo}</h3>
        <p className="text-sm text-ink-500">{descripcion}</p>
      </div>
      <ArrowRight className="w-5 h-5 text-ink-400 group-hover:text-accent-terracotta group-hover:translate-x-1 transition-all" />
    </Link>
  );
}

// ============================================
// COMPONENTE DOCUMENTO RECIENTE
// ============================================

function DocumentoReciente({ 
  tipo, 
  numero, 
  cliente, 
  monto, 
  fecha,
}: { 
  tipo: 'boleta' | 'factura' | 'guia';
  numero: string;
  cliente: string;
  monto: string;
  fecha: string;
}) {
  const config = {
    boleta: { label: 'Boleta', bg: 'bg-amber-100', text: 'text-amber-800' },
    factura: { label: 'Factura', bg: 'bg-purple-100', text: 'text-purple-800' },
    guia: { label: 'Guía', bg: 'bg-indigo-100', text: 'text-indigo-800' },
  };

  return (
    <div className="flex items-center justify-between p-4 bg-accent-cream rounded-xl border border-ink-200">
      <div className="flex items-center gap-4">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config[tipo].bg} ${config[tipo].text}`}>
          {config[tipo].label}
        </span>
        <div>
          <p className="font-semibold text-ink-800">{numero}</p>
          <p className="text-sm text-ink-500">{cliente}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold text-ink-800">{monto}</p>
        <p className="text-sm text-ink-500">{fecha}</p>
      </div>
    </div>
  );
}

// ============================================
// PÁGINA PRINCIPAL
// ============================================

export default function DashboardPage() {
  const { boletas, facturas, guias, clientes } = useApp();

  const totalBoletas = boletas.length;
  const totalFacturas = facturas.length;
  const totalGuias = guias.length;
  const totalClientes = clientes.length;

  const montoTotalBoletas = boletas.reduce((sum, b) => sum + b.importeTotal, 0);
  const montoTotalFacturas = facturas.reduce((sum, f) => sum + f.importeTotal, 0);

  return (
    <div className="space-y-6">
      {/* Header de bienvenida */}
      <div className="bg-gradient-to-r from-accent-terracotta to-accent-gold rounded-2xl p-6 text-white shadow-warm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold mb-2">¡Bienvenido a Maqui Mary!</h1>
            <p className="text-white/90">
              Sistema de documentos tributarios electrónicos. RUC: 20606218801
            </p>
          </div>
          <div className="hidden sm:block p-3 bg-white/20 rounded-xl">
            <Store className="w-8 h-8 text-white" />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          titulo="Boletas del Mes"
          valor={totalBoletas}
          subtitulo={`S/ ${montoTotalBoletas.toFixed(2)}`}
          icono={FileText}
          href="/crm/documentos"
        />
        <StatCard
          titulo="Facturas del Mes"
          valor={totalFacturas}
          subtitulo={`S/ ${montoTotalFacturas.toFixed(2)}`}
          icono={FileText}
          href="/crm/documentos"
        />
        <StatCard
          titulo="Guías Emitidas"
          valor={totalGuias}
          subtitulo="Total acumulado"
          icono={FileText}
          href="/crm/documentos"
        />
        <StatCard
          titulo="Clientes Registrados"
          valor={totalClientes}
          subtitulo="Base de datos"
          icono={Users}
          href="/crm/clientes"
        />
      </div>

      {/* Grid de contenido */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accesos Rápidos */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-heading font-semibold text-ink-800">Accesos Rápidos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AccesoRapido
              titulo="Ver Documentos"
              descripcion="Gestiona boletas, facturas y guías"
              icono={FileText}
              href="/crm/documentos"
            />
            <AccesoRapido
              titulo="Nuevo Documento"
              descripcion="Emitir boleta, factura o guía"
              icono={Plus}
              href="/crm/documentos"
            />
            <AccesoRapido
              titulo="Clientes"
              descripcion="Administrar base de clientes"
              icono={Users}
              href="/crm/clientes"
            />
            <AccesoRapido
              titulo="Transportistas"
              descripcion="Conductores y vehículos"
              icono={Package}
              href="/crm/transportistas"
            />
          </div>
        </div>

        {/* Documentos Recientes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-heading font-semibold text-ink-800">Documentos Recientes</h2>
            <Calendar className="w-5 h-5 text-ink-400" />
          </div>
          
          <div className="space-y-3">
            {boletas.length === 0 && facturas.length === 0 && guias.length === 0 ? (
              <div className="text-center py-8 bg-accent-cream rounded-xl border border-ink-200 border-dashed">
                <p className="text-ink-500 mb-2">No hay documentos registrados</p>
                <p className="text-sm text-ink-400">Crea tu primer documento</p>
              </div>
            ) : (
              <>
                {boletas.slice(0, 2).map((boleta) => (
                  <DocumentoReciente
                    key={boleta.id}
                    tipo="boleta"
                    numero={boleta.numeroCompleto}
                    cliente={boleta.cliente.nombre}
                    monto={`S/ ${boleta.importeTotal.toFixed(2)}`}
                    fecha={boleta.fechaEmision.toLocaleDateString()}
                  />
                ))}
                {facturas.slice(0, 2).map((factura) => (
                  <DocumentoReciente
                    key={factura.id}
                    tipo="factura"
                    numero={factura.numeroCompleto}
                    cliente={factura.cliente.nombre}
                    monto={`S/ ${factura.importeTotal.toFixed(2)}`}
                    fecha={factura.fechaEmision.toLocaleDateString()}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
