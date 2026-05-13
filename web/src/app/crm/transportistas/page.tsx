// ============================================
// CRUD: TRANSPORTISTAS
// Estilo marrón Maqui Mary
// ============================================

'use client';

import React, { useState } from 'react';
import { Plus, Search, Edit2, Truck, User } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Transportista } from '@/types/documentos';
import toast from 'react-hot-toast';

export default function TransportistasPage() {
  const { transportistas, addTransportista, updateTransportista } = useApp();
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [transportistaEditando, setTransportistaEditando] = useState<Transportista | null>(null);
  
  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    dni: '',
    licenciaConducir: '',
    numeroPlaca: '',
    activo: true,
  });

  const transportistasFiltrados = transportistas.filter(t => 
    t.nombreCompleto.toLowerCase().includes(busqueda.toLowerCase()) ||
    t.dni.includes(busqueda) ||
    t.numeroPlaca.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const transportistaData: Transportista = {
      id: transportistaEditando?.id || Math.random().toString(36).substr(2, 9),
      nombres: formData.nombres,
      apellidos: formData.apellidos,
      nombreCompleto: `${formData.apellidos}, ${formData.nombres}`,
      dni: formData.dni,
      licenciaConducir: formData.licenciaConducir,
      numeroPlaca: formData.numeroPlaca.toUpperCase(),
      activo: formData.activo,
      createdAt: transportistaEditando?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    
    if (transportistaEditando) {
      updateTransportista(transportistaData);
      toast.success('Transportista actualizado');
    } else {
      addTransportista(transportistaData);
      toast.success('Transportista creado');
    }
    
    cerrarModal();
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setTransportistaEditando(null);
    setFormData({
      nombres: '',
      apellidos: '',
      dni: '',
      licenciaConducir: '',
      numeroPlaca: '',
      activo: true,
    });
  };

  const abrirEditar = (t: Transportista) => {
    setTransportistaEditando(t);
    setFormData({
      nombres: t.nombres,
      apellidos: t.apellidos,
      dni: t.dni,
      licenciaConducir: t.licenciaConducir,
      numeroPlaca: t.numeroPlaca,
      activo: t.activo,
    });
    setModalAbierto(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-ink-800">Transportistas</h1>
          <p className="text-ink-500">Gestiona conductores y vehículos para guías de remisión</p>
        </div>
        <button 
          onClick={() => setModalAbierto(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-terracotta hover:bg-accent-terracotta/90 
            text-white rounded-xl font-semibold shadow-warm transition-all"
        >
          <Plus className="w-5 h-5" />
          Nuevo Transportista
        </button>
      </div>

      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
        <p className="text-sm text-blue-800">
          <strong>Nota:</strong> Cada conductor tiene asignado un solo vehículo. 
          La relación es 1:1 entre conductor y placa.
        </p>
      </div>

      <div className="bg-accent-cream p-4 rounded-xl border border-ink-200 shadow-soft">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, DNI o placa..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-ink-200 rounded-xl 
              focus:ring-2 focus:ring-accent-terracotta outline-none bg-white"
          />
        </div>
      </div>

      <div className="bg-accent-cream rounded-xl border border-ink-200 shadow-soft overflow-hidden">
        {transportistasFiltrados.length === 0 ? (
          <div className="p-12 text-center">
            <Truck className="w-12 h-12 text-ink-300 mx-auto mb-3" />
            <h3 className="text-lg font-heading font-semibold text-ink-800">No hay transportistas registrados</h3>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-ink-50 border-b border-ink-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-ink-600 uppercase">Conductor</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-ink-600 uppercase">DNI</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-ink-600 uppercase">Licencia</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-ink-600 uppercase">Vehículo</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-ink-600 uppercase">Estado</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-ink-600 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {transportistasFiltrados.map((t) => (
                <tr key={t.id} className="hover:bg-ink-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-accent-sand rounded-full flex items-center justify-center border border-ink-200">
                        <User className="w-5 h-5 text-accent-terracotta" />
                      </div>
                      <div>
                        <p className="font-medium text-ink-800">{t.nombreCompleto}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-ink-600">{t.dni}</td>
                  <td className="px-6 py-4 text-sm font-mono text-ink-600">{t.licenciaConducir}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-mono font-medium">
                      {t.numeroPlaca}
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
                      <button onClick={() => abrirEditar(t)} className="p-2 hover:bg-ink-100 rounded-lg text-ink-600 hover:text-accent-terracotta transition-colors">
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
        <div className="fixed inset-0 bg-ink-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-accent-cream rounded-2xl w-full max-w-md border border-ink-200 shadow-elevated">
            <div className="p-6 border-b border-ink-200">
              <h2 className="text-xl font-heading font-bold text-ink-800">
                {transportistaEditando ? 'Editar Transportista' : 'Nuevo Transportista'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">Nombres *</label>
                  <input
                    type="text"
                    required
                    value={formData.nombres}
                    onChange={(e) => setFormData({...formData, nombres: e.target.value})}
                    className="w-full px-4 py-3 border border-ink-200 rounded-xl focus:ring-2 focus:ring-accent-terracotta outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">Apellidos *</label>
                  <input
                    type="text"
                    required
                    value={formData.apellidos}
                    onChange={(e) => setFormData({...formData, apellidos: e.target.value})}
                    className="w-full px-4 py-3 border border-ink-200 rounded-xl focus:ring-2 focus:ring-accent-terracotta outline-none bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">DNI *</label>
                <input
                  type="text"
                  required
                  maxLength={8}
                  value={formData.dni}
                  onChange={(e) => setFormData({...formData, dni: e.target.value.replace(/\D/g, '')})}
                  className="w-full px-4 py-3 border border-ink-200 rounded-xl focus:ring-2 focus:ring-accent-terracotta outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">Licencia de Conducir *</label>
                <input
                  type="text"
                  required
                  value={formData.licenciaConducir}
                  onChange={(e) => setFormData({...formData, licenciaConducir: e.target.value.toUpperCase()})}
                  className="w-full px-4 py-3 border border-ink-200 rounded-xl focus:ring-2 focus:ring-accent-terracotta outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">Número de Placa *</label>
                <input
                  type="text"
                  required
                  value={formData.numeroPlaca}
                  onChange={(e) => setFormData({...formData, numeroPlaca: e.target.value.toUpperCase()})}
                  placeholder="ABC-123 o ABC123"
                  className="w-full px-4 py-3 border border-ink-200 rounded-xl focus:ring-2 focus:ring-accent-terracotta outline-none bg-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.activo}
                  onChange={(e) => setFormData({...formData, activo: e.target.checked})}
                  className="w-4 h-4 text-accent-terracotta"
                />
                <label className="text-sm text-ink-700">Transportista activo</label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="flex-1 px-4 py-3 border border-ink-300 text-ink-700 rounded-xl font-semibold hover:bg-ink-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-accent-terracotta hover:bg-accent-terracotta/90 text-white rounded-xl font-semibold transition-colors"
                >
                  {transportistaEditando ? 'Guardar Cambios' : 'Crear Transportista'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
