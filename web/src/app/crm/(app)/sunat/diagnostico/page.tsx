'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, RefreshCw, ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface CheckItem {
  ok: boolean;
  mensaje: string;
}

interface DiagnosticoResult {
  ok: boolean;
  checks: Record<string, CheckItem>;
  ultimo_error: {
    series: string;
    number: number;
    estado_sunat: string;
    sunat_response: string;
    created_at: string;
  } | null;
  resumen: string;
}

const CHECK_LABELS: Record<string, string> = {
  config_sunat:        'Configuración en Supabase',
  ruc:                 'RUC del emisor',
  razon_social:        'Razón Social',
  sol_user:            'Usuario SOL',
  sol_password:        'Clave SOL',
  ambiente:            'Ambiente (Beta / Producción)',
  cert_base64:         'Certificado PFX cargado',
  cert_password:       'Contraseña del certificado',
  pfx_valido:          'PFX válido (extracción OK)',
  conectividad_sunat:  'Conectividad al endpoint SUNAT',
};

export default function DiagnosticoSunatPage() {
  const [resultado, setResultado] = useState<DiagnosticoResult | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ejecutarDiagnostico = async () => {
    setCargando(true);
    setError(null);
    setResultado(null);
    try {
      const res = await fetch('/api/sunat/diagnostico');
      const data = await res.json();
      setResultado(data);
    } catch (e: any) {
      setError(e.message || 'Error al conectar con la API de diagnóstico');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    ejecutarDiagnostico();
  }, []);

  const okCount = resultado ? Object.values(resultado.checks).filter(c => c.ok).length : 0;
  const totalCount = resultado ? Object.values(resultado.checks).length : 0;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/crm/sunat" className="p-2 hover:bg-ink-100 rounded-lg text-ink-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-heading font-bold text-ink-800">Diagnóstico SUNAT</h1>
          <p className="text-ink-500 text-sm">Verifica que la configuración esté lista para emitir comprobantes</p>
        </div>
      </div>

      {/* Botón ejecutar */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-ink-500">
          {resultado && (
            <span>
              {okCount}/{totalCount} verificaciones pasadas
            </span>
          )}
        </div>
        <button
          onClick={ejecutarDiagnostico}
          disabled={cargando}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent-terracotta hover:bg-accent-terracotta/90 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
        >
          {cargando
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>
            : <><RefreshCw className="w-4 h-4" /> Volver a verificar</>
          }
        </button>
      </div>

      {/* Error de red */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Error al ejecutar diagnóstico</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Resumen */}
      {resultado && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${resultado.ok ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          {resultado.ok
            ? <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            : <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
          }
          <p className={`font-medium ${resultado.ok ? 'text-green-800' : 'text-amber-800'}`}>
            {resultado.resumen}
          </p>
        </div>
      )}

      {/* Checks */}
      {resultado && (
        <div className="bg-accent-cream rounded-xl border border-ink-200 shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-ink-200 bg-ink-50">
            <h2 className="font-heading font-semibold text-ink-800">Resultado de verificaciones</h2>
          </div>
          <div className="divide-y divide-ink-100">
            {Object.entries(resultado.checks).map(([key, check]) => (
              <div key={key} className="px-6 py-4 flex items-start gap-4">
                <div className="mt-0.5">
                  {check.ok
                    ? <CheckCircle className="w-5 h-5 text-green-500" />
                    : <XCircle className="w-5 h-5 text-red-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink-800 text-sm">
                    {CHECK_LABELS[key] || key}
                  </p>
                  <p className={`text-sm mt-0.5 ${check.ok ? 'text-ink-500' : 'text-red-600'}`}>
                    {check.mensaje}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${check.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {check.ok ? 'OK' : 'FALLA'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Último error */}
      {resultado?.ultimo_error && (
        <div className="bg-accent-cream rounded-xl border border-ink-200 shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-ink-200 bg-ink-50">
            <h2 className="font-heading font-semibold text-ink-800">Último comprobante con error</h2>
          </div>
          <div className="px-6 py-4 space-y-2 text-sm">
            <div className="flex gap-3">
              <span className="text-ink-500 w-32">Comprobante:</span>
              <span className="font-medium text-ink-800">{resultado.ultimo_error.series}-{String(resultado.ultimo_error.number).padStart(8, '0')}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-ink-500 w-32">Estado:</span>
              <span className="font-medium text-red-700">{resultado.ultimo_error.estado_sunat}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-ink-500 w-32">Fecha:</span>
              <span className="text-ink-700">
                {new Date(resultado.ultimo_error.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="flex gap-3">
              <span className="text-ink-500 w-32">Respuesta:</span>
              <span className="text-red-600 break-all">{resultado.ultimo_error.sunat_response}</span>
            </div>
          </div>
        </div>
      )}

      {/* Guía de solución */}
      {resultado && !resultado.ok && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 space-y-4">
          <h3 className="font-heading font-semibold text-slate-800">¿Cómo solucionar los errores?</h3>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex gap-3">
              <span className="font-bold text-slate-800 shrink-0">1.</span>
              <span>Ve a <Link href="/crm/configuracion" className="text-purple-600 hover:underline font-medium">Configuración → SUNAT</Link> y completa los campos faltantes (RUC, razón social, credenciales SOL, certificado PFX).</span>
            </div>
            <div className="flex gap-3">
              <span className="font-bold text-slate-800 shrink-0">2.</span>
              <span>El <strong>Usuario SOL</strong> es solo el sufijo (sin el RUC), por ejemplo: <code className="bg-slate-200 px-1 rounded">MAQUIMARI</code></span>
            </div>
            <div className="flex gap-3">
              <span className="font-bold text-slate-800 shrink-0">3.</span>
              <span>El certificado <strong>.pfx</strong> lo emite SUNAT. Debes subirlo en base64 y colocar su contraseña.</span>
            </div>
            <div className="flex gap-3">
              <span className="font-bold text-slate-800 shrink-0">4.</span>
              <span>Si la <strong>conectividad a SUNAT falla</strong>, puede ser una restricción del servidor de Vercel. Considera usar un OSE (como Nubefact) como intermediario.</span>
            </div>
          </div>
        </div>
      )}

      {cargando && !resultado && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-accent-terracotta mx-auto" />
            <p className="text-ink-500">Verificando configuración SUNAT...</p>
          </div>
        </div>
      )}
    </div>
  );
}
