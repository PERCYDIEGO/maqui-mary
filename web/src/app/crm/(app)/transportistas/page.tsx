// ============================================
// CRUD: TRANSPORTISTAS
// Privado (conductor propio) / Público (empresa contratada)
// ============================================

'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Truck, User, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

type Modalidad = 'privado' | 'publico';

type Transportista = {
  id: number;
  modalidad: Modalidad;
  nombres: string;
  apellidos: string;
  nombre_completo: string;
  dni: string;
  licencia_conducir: string;
  numero_placa: string;
  ruc: string;
  numero_registro_mtc: string;
  activo: boolean;
  created_at: string;
};

type FormData = {
  modalidad: Modalidad;
  // Privado
  nombres: string;
  apellidos: string;
  dni: string;
  licencia_conducir: string;
  numero_placa: string;
  // Público
  razon_social: string;  // va a nombres
  ruc: string;
  numero_registro_mtc: string;
  activo: boolean;
};

const FORM_DEFAULT: FormData = {
  modalidad: 'privado',
  nombres: '',
  apellidos: '',
  dni: '',
  licencia_conducir: '',
  numero_placa: '',
  razon_social: '',
  ruc: '',
  numero_registro_mtc: '',
  activo: true,
};

export default function TransportistasPage() {
  const [transportistas, setTransportistas] = useState<Transportista[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Transportista | null>(null);
  const [formData, setFormData] = useState<FormData>(FORM_DEFAULT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const cached = localStorage.getItem('mm_transportistas_cache');
    if (cached) {
      try { setTransportistas(JSON.parse(cached)); setLoading(false); } catch {}
    }
    loadTransportistas();
  }, []);

  async function loadTransportistas() {
    setLoading(true);
    const { data, error } = await supabase
      .from('transportistas')
      .select('*')
      .order('apellidos')
      .order('nombres');
    if (error) {
      toast.error('Error al cargar transportistas');
    } else if (data) {
      setTransportistas(data);
      try { localStorage.setItem('mm_transportistas_cache', JSON.stringify(data)); } catch {}
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (formData.modalidad === 'privado') {
      if (formData.dni.length !== 8) {
        toast.error('El DNI debe tener exactamente 8 dígitos');
        return;
      }
      if (!formData.nombres.trim() || !formData.apellidos.trim()) {
        toast.error('Nombres y apellidos son requeridos');
        return;
      }
    } else {
      if (formData.ruc.length !== 11) {
        toast.error('El RUC debe tener exactamente 11 dígitos');
        return;
      }
      if (!formData.razon_social.trim()) {
        toast.error('La razón social es requerida');
        return;
      }
    }

    setSaving(true);
    try {
      const payload =
        formData.modalidad === 'privado'
          ? {
              modalidad: 'privado',
              nombres: formData.nombres.trim(),
              apellidos: formData.apellidos.trim(),
              dni: formData.dni,
              licencia_conducir: formData.licencia_conducir.trim(),
              numero_placa: formData.numero_placa.trim().toUpperCase(),
              ruc: null,
              numero_registro_mtc: null,
              activo: formData.activo,
            }
          : {
              modalidad: 'publico',
              nombres: formData.razon_social.trim(),
              apellidos: '',
              dni: '',
              licencia_conducir: '',
              numero_placa: '',
              ruc: formData.ruc.trim(),
              numero_registro_mtc: formData.numero_registro_mtc.trim().toUpperCase(),
              activo: formData.activo,
            };

      if (editando) {
        const { error } = await supabase
          .from('transportistas')
          .update({ ...payload as any, updated_at: new Date().toISOString() })
          .eq('id', editando.id);
        if (error) throw error;
        toast.success('Transportista actualizado');
      } else {
        const { error } = await supabase.from('transportistas').insert(payload as any);
        if (error) {
          if (error.code === '23505') {
            toast.error(
              formData.modalidad === 'privado'
                ? `La placa ${formData.numero_placa.toUpperCase()} ya está registrada`
                : `El RUC ${formData.ruc} ya está registrado`
            );
          } else {
            throw error;
          }
          return;
        }
        toast.success(
          formData.modalidad === 'privado'
            ? 'Conductor registrado'
            : 'Transportista público registrado'
        );
      }
      cerrarModal();
      loadTransportistas();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  function cerrarModal() {
    setModalAbierto(false);
    setEditando(null);
    setFormData(FORM_DEFAULT);
  }

  function abrirEditar(t: Transportista) {
    setEditando(t);
    const modalidad: Modalidad = t.modalidad === 'publico' ? 'publico' : 'privado';
    setFormData({
      modalidad,
      nombres: modalidad === 'privado' ? t.nombres : '',
      apellidos: t.apellidos || '',
      dni: t.dni || '',
      licencia_conducir: t.licencia_conducir || '',
      numero_placa: t.numero_placa || '',
      razon_social: modalidad === 'publico' ? t.nombres : '',
      ruc: t.ruc || '',
      numero_registro_mtc: t.numero_registro_mtc || '',
      activo: t.activo,
    });
    setModalAbierto(true);
  }

  function displayName(t: Transportista): string {
    if (t.modalidad === 'publico') return t.nombres;
    return t.nombre_completo || `${t.apellidos}, ${t.nombres}`;
  }

  const filtrados = transportistas.filter(t => {
    const search = busqueda.toLowerCase();
    return (
      displayName(t).toLowerCase().includes(search) ||
      (t.dni || '').includes(busqueda) ||
      (t.numero_placa || '').toLowerCase().includes(search) ||
      (t.ruc || '').includes(busqueda)
    );
  });

  const privados = filtrados.filter(t => t.modalidad !== 'publico');
  const publicos = filtrados.filter(t => t.modalidad === 'publico');

  if (loading) {
    return (
      <div className="text-center py-16 text-primary-500">
        <Truck size={48} className="mx-auto mb-3 opacity-50 animate-pulse" />
        <p>Cargando transportistas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-primary-800">Transportistas</h1>
          <p className="text-primary-500 text-sm mt-1">
            {privados.filter(t => t.activo).length} conductores activos ·{' '}
            {publicos.filter(t => t.activo).length} empresas activas
          </p>
        </div>
        <button
          onClick={() => setModalAbierto(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700
            text-white rounded-xl font-semibold shadow transition-all"
        >
          <Plus className="w-5 h-5" />
          Nuevo Transportista
        </button>
      </div>

      {/* Leyenda SUNAT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-800">
          <strong>🚛 Privado:</strong> Usa vehículo propio. Se registra el conductor (DNI, licencia, placa).
        </div>
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-800">
          <strong>🏢 Público:</strong> Empresa contratada externamente. Se registra su RUC y N° MTC. No se registra conductor.
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, DNI, placa o RUC..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="input-field pl-12"
        />
      </div>

      <div className="card overflow-hidden !p-0">
        {filtrados.length === 0 ? (
          <div className="p-12 text-center">
            <Truck className="w-12 h-12 text-primary-300 mx-auto mb-3" />
            <h3 className="text-lg font-heading font-semibold text-primary-800">
              {busqueda ? 'Sin resultados' : 'No hay transportistas registrados'}
            </h3>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-primary-50 border-b border-primary-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary-600 uppercase">Transportista</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary-600 uppercase">Tipo</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary-600 uppercase">Identificación</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary-600 uppercase">Vehículo / MTC</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-primary-600 uppercase">Estado</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-primary-600 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-100">
              {filtrados.map(t => {
                const esPublico = t.modalidad === 'publico';
                return (
                  <tr key={t.id} className="hover:bg-primary-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${esPublico ? 'bg-amber-100' : 'bg-primary-100'}`}>
                          {esPublico
                            ? <Building2 className="w-5 h-5 text-amber-600" />
                            : <User className="w-5 h-5 text-primary-600" />}
                        </div>
                        <p className="font-medium text-primary-800">{displayName(t)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                        esPublico
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {esPublico ? 'Público' : 'Privado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-primary-600">
                      {esPublico
                        ? `RUC: ${t.ruc || '—'}`
                        : `DNI: ${t.dni || '—'}`}
                    </td>
                    <td className="px-6 py-4">
                      {esPublico ? (
                        <span className="text-sm text-slate-600">{t.numero_registro_mtc || '—'}</span>
                      ) : (
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-mono font-medium">
                          {t.numero_placa || '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        t.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {t.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => abrirEditar(t)}
                          className="p-2 hover:bg-primary-100 rounded-lg text-primary-600 hover:text-primary-800 transition-colors"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-primary-200">
              <h2 className="text-xl font-heading font-bold text-primary-800">
                {editando ? 'Editar Transportista' : 'Nuevo Transportista'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">

              {/* Selector de modalidad */}
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-2">
                  Tipo de transporte *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...FORM_DEFAULT, modalidad: 'privado', activo: formData.activo })}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 font-medium text-sm transition-all ${
                      formData.modalidad === 'privado'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Truck className="w-4 h-4 shrink-0" />
                    <div className="text-left">
                      <p className="font-semibold">Privado</p>
                      <p className="text-xs font-normal opacity-75">Conductor propio</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...FORM_DEFAULT, modalidad: 'publico', activo: formData.activo })}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 font-medium text-sm transition-all ${
                      formData.modalidad === 'publico'
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Building2 className="w-4 h-4 shrink-0" />
                    <div className="text-left">
                      <p className="font-semibold">Público</p>
                      <p className="text-xs font-normal opacity-75">Empresa contratada</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Campos según modalidad */}
              {formData.modalidad === 'privado' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary-700 mb-1">Nombres *</label>
                      <input
                        type="text"
                        required
                        value={formData.nombres}
                        onChange={e => setFormData({ ...formData, nombres: e.target.value })}
                        className="input-field"
                        placeholder="Juan"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-700 mb-1">Apellidos *</label>
                      <input
                        type="text"
                        required
                        value={formData.apellidos}
                        onChange={e => setFormData({ ...formData, apellidos: e.target.value })}
                        className="input-field"
                        placeholder="García López"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">DNI * (8 dígitos)</label>
                    <input
                      type="text"
                      required
                      maxLength={8}
                      value={formData.dni}
                      onChange={e => setFormData({ ...formData, dni: e.target.value.replace(/\D/g, '') })}
                      className="input-field font-mono"
                      placeholder="12345678"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">Licencia de Conducir</label>
                    <input
                      type="text"
                      value={formData.licencia_conducir}
                      onChange={e => setFormData({ ...formData, licencia_conducir: e.target.value.toUpperCase() })}
                      className="input-field font-mono"
                      placeholder="Q00000000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">Número de Placa *</label>
                    <input
                      type="text"
                      required
                      value={formData.numero_placa}
                      onChange={e => setFormData({ ...formData, numero_placa: e.target.value.toUpperCase() })}
                      placeholder="F9J-802"
                      className="input-field font-mono"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">Razón Social *</label>
                    <input
                      type="text"
                      required
                      value={formData.razon_social}
                      onChange={e => setFormData({ ...formData, razon_social: e.target.value })}
                      className="input-field"
                      placeholder="TRANSPORTES GARCIA S.A.C."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">RUC * (11 dígitos)</label>
                    <input
                      type="text"
                      required
                      maxLength={11}
                      value={formData.ruc}
                      onChange={e => setFormData({ ...formData, ruc: e.target.value.replace(/\D/g, '') })}
                      className="input-field font-mono"
                      placeholder="20123456789"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">N° Registro MTC</label>
                    <input
                      type="text"
                      value={formData.numero_registro_mtc}
                      onChange={e => setFormData({ ...formData, numero_registro_mtc: e.target.value.toUpperCase() })}
                      className="input-field font-mono"
                      placeholder="15117368CNG"
                    />
                    <p className="text-xs text-slate-500 mt-1">Número de inscripción en el Ministerio de Transportes</p>
                  </div>
                </>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activo"
                  checked={formData.activo}
                  onChange={e => setFormData({ ...formData, activo: e.target.checked })}
                  className="w-4 h-4 text-primary-600"
                />
                <label htmlFor="activo" className="text-sm text-primary-700">Activo</label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="flex-1 px-4 py-3 border border-primary-300 text-primary-700 rounded-xl font-semibold hover:bg-primary-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : editando ? 'Guardar Cambios' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
