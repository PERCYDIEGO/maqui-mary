'use client';

import { MapPin, Star } from 'lucide-react';
import { DireccionReferencia } from '@/types/documentos';

interface DireccionSelectorProps {
  direccionFiscal: string;
  direccionesReferencia: DireccionReferencia[];
  value: string;
  onChange: (dir: string) => void;
}

export default function DireccionSelector({
  direccionFiscal,
  direccionesReferencia,
  value,
  onChange,
}: DireccionSelectorProps) {
  const opciones = [
    { id: 0, etiqueta: 'Dirección Fiscal', direccion: direccionFiscal, esFiscal: true },
    ...direccionesReferencia.map(d => ({ ...d, esFiscal: false })),
  ];

  if (opciones.length === 1) {
    return (
      <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-sm">
        <Star className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
        <div>
          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Dirección Fiscal</span>
          <p className="text-slate-700 mt-0.5">{direccionFiscal || '—'}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-medium text-slate-700 mb-2">
        Dirección de entrega
        <span className="ml-2 text-xs font-normal text-slate-400">
          {opciones.length} disponibles
        </span>
      </p>
      <div className="space-y-2">
        {opciones.map(op => {
          const activa = value === op.direccion;
          return (
            <button
              key={op.id}
              type="button"
              onClick={() => onChange(op.direccion)}
              className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                activa
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${activa ? 'text-indigo-500' : 'text-slate-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs font-semibold uppercase tracking-wide ${op.esFiscal ? 'text-amber-700' : 'text-indigo-700'}`}>
                    {op.etiqueta}
                  </span>
                  {op.esFiscal && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide">
                      Fiscal
                    </span>
                  )}
                </div>
                <p className={`text-sm leading-snug ${activa ? 'text-indigo-800' : 'text-slate-600'}`}>
                  {op.direccion}
                </p>
              </div>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                activa ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'
              }`}>
                {activa && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
