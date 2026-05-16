// ============================================
// CRUD: TRANSPORTISTAS
// Estilo marrón Maqui Mary
// ============================================

'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Truck, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

type Transportista = {
  id: number;
  nombres: string;
  apellidos: string;
  nombre_completo: string;
  dni: string;
  licencia_conducir: string;
  numero_placa: string;
  activo: boolean;
  created_at: string;
};

type FormData = {
  nombres: string;
  apellidos: string;
  dni: string;
  licencia_conducir: string;
  numero_placa: string;
  activo: boolean;
};

const FORM_DEFAULT: FormData = {
  nombres: '',
  apellidos: '',
  dni: '',
  licencia_conducir: '',
  numero_placa: '',
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
    const cached = localStorage.getItem('mm_transportistas_cache')
    if (cached) {
      try { setTransportistas(JSON.parse(cached)); setLoading(false) } catch {}
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
      try { localStorage.setItem('mm_transportistas_cache', JSON.stringify(data)) } catch {}
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (formData.dni.length !== 8) {
      toast.error('El DNI debe tener exactamente 8 dígitos');
      return;
    }
    setSaving(true);
    try {
      if (editando) {
        const { error } = await supabase
          .from('transportistas')
          .update({
            nombres: formData.nombres,
            apellidos: formData.apellidos,
            dni: formData.dni,
            licencia_conducir: formData.licencia_conducir,
            numero_placa: formData.numero_placa.toUpperCase(),
            activo: formData.activo,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editando.id);
        if (error) throw error;
        toast.success('Transportista actualizado');
      } else {
        const { error } = await supabase.from('transportistas').insert({
          nombres: formData.nombres,
          apellidos: formData.apellidos,
          dni: formData.dni,
          licencia_conducir: formData.licencia_conducir,
          numero_placa: formData.numero_placa.toUpperCase(),
          activo: formData.activo,
        });
        if (error) {
          if (error.code === '23505') {
            toast.error(`La placa ${formData.numero_placa.toUpperCase()} ya está registrada`);
          } else {
            throw error;
          }
          return;
        }
        toast.success('Transportista creado');
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
    setFormData({
      nombres: t.nombres,
      apellidos: t.apellidos,
      dni: t.dni,
      licencia_conducir: t.licencia_conducir,
      numero_placa: t.numero_placa,
      activo: t.activo,
    });
    setModalAbierto(true);
  }

  const filtrados = transportistas.filter(t =>
    t.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
    t.dni.includes(busqueda) ||
    t.numero_placa.toLowerCase().includes(busqueda.toLowerCase())
  );

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
            {transportistas.filter(t => t.activo).length} activos · {transportistas.length} en total
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

      <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-800">
        Cada conductor tiene asignado un solo vehículo (relación 1:1 conductor/placa).
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, DNI o placa..."
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
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary-600 uppercase">Conductor</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary-600 uppercase">DNI</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary-600 uppercase">Licencia</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary-600 uppercase">Placa</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-primary-600 uppercase">Estado</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-primary-600 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-100">
              {filtrados.map(t => (
                <tr key={t.id} className="hover:bg-primary-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-primary-600" />
                      </div>
                      <p className="font-medium text-primary-800">{t.nombre_completo}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-primary-600">{t.dni}</td>
                  <td className="px-6 py-4 text-sm font-mono text-primary-600">{t.licencia_conducir}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-mono font-medium">
                      {t.numero_placa}
                    </span>
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
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-primary-200">
              <h2 className="text-xl font-heading font-bold text-primary-800">
                {editando ? 'Editar Transportista' : 'Nuevo Transportista'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1">Nombres *</label>
                  <input
                    type="text"
                    required
                    value={formData.nombres}
                    onChange={e => setFormData({ ...formData, nombres: e.target.value })}
                    className="input-field"
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
                <label className="block text-sm font-medium text-primary-700 mb-1">Licencia de Conducir *</label>
                <input
                  type="text"
                  required
                  value={formData.licencia_conducir}
                  onChange={e => setFormData({ ...formData, licencia_conducir: e.target.value.toUpperCase() })}
                  className="input-field font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1">Número de Placa *</label>
                <input
                  type="text"
                  required
                  value={formData.numero_placa}
                  onChange={e => setFormData({ ...formData, numero_placa: e.target.value.toUpperCase() })}
                  placeholder="ABC-123"
                  className="input-field font-mono"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={formData.activo}
                  onChange={e => setFormData({ ...formData, activo: e.target.checked })}
                  className="w-4 h-4 text-primary-600"
                />
                <label htmlFor="activo" className="text-sm text-primary-700">Transportista activo</label>
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
                  {saving ? 'Guardando...' : editando ? 'Guardar Cambios' : 'Crear Transportista'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
