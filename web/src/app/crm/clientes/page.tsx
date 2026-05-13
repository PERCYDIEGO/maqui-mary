// ============================================
// CRUD: CLIENTES
// ============================================

'use client';

import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, User, Building2, Star } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Cliente } from '@/types/documentos';
import toast from 'react-hot-toast';

export default function ClientesPage() {
  const { clientes, addCliente, updateCliente } = useApp();
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  
  const [formData, setFormData] = useState({
    tipo: 'natural' as 'natural' | 'juridica',
    nombre: '',
    apellidos: '',
    dni: '',
    ruc: '',
    direccion: '',
    telefono: '',
    email: '',
  });

  const clientesFiltrados = clientes.filter(c => 
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.dni?.includes(busqueda) ||
    c.ruc?.includes(busqueda)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const nombreCompleto = formData.tipo === 'natural' 
      ? `${formData.nombre} ${formData.apellidos}`
      : formData.nombre;
    
    const clienteData: Cliente = {
      id: clienteEditando?.id || Math.random().toString(36).substr(2, 9),
      tipo: formData.tipo,
      nombre: nombreCompleto,
      apellidos: formData.tipo === 'natural' ? formData.apellidos : undefined,
      razonSocial: formData.tipo === 'juridica' ? formData.nombre : undefined,
      dni: formData.dni || undefined,
      ruc: formData.ruc || undefined,
      direccion: formData.direccion,
      telefono: formData.telefono || undefined,
      email: formData.email || undefined,
      esFrecuente: clienteEditando?.esFrecuente || false,
      totalCompras: clienteEditando?.totalCompras || 0,
      createdAt: clienteEditando?.createdAt || new Date(),
    };
    
    if (clienteEditando) {
      updateCliente(clienteData);
      toast.success('Cliente actualizado');
    } else {
      addCliente(clienteData);
      toast.success('Cliente creado');
    }
    
    cerrarModal();
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setClienteEditando(null);
    setFormData({
      tipo: 'natural',
      nombre: '',
      apellidos: '',
      dni: '',
      ruc: '',
      direccion: '',
      telefono: '',
      email: '',
    });
  };

  const abrirEditar = (cliente: Cliente) => {
    setClienteEditando(cliente);
    setFormData({
      tipo: cliente.tipo,
      nombre: cliente.tipo === 'natural' ? cliente.nombre.split(' ')[0] : cliente.nombre,
      apellidos: cliente.tipo === 'natural' ? cliente.nombre.split(' ').slice(1).join(' ') : '',
      dni: cliente.dni || '',
      ruc: cliente.ruc || '',
      direccion: cliente.direccion,
      telefono: cliente.telefono || '',
      email: cliente.email || '',
    });
    setModalAbierto(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-ink-800">Clientes</h1>
          <p className="text-ink-500">Gestiona tu base de clientes</p>
        </div>
        <button 
          onClick={() => setModalAbierto(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-terracotta hover:bg-accent-terracotta/90 text-white rounded-xl font-semibold shadow-warm transition-all"
        >
          <Plus className="w-5 h-5" />
          Nuevo Cliente
        </button>
      </div>

      <div className="bg-accent-cream p-4 rounded-xl border border-ink-200 shadow-soft">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-ink-200 rounded-xl focus:ring-2 focus:ring-accent-terracotta outline-none bg-white"
          />
        </div>
      </div>

      <div className="bg-accent-cream rounded-xl border border-ink-200 shadow-soft overflow-hidden">
        {clientesFiltrados.length === 0 ? (
          <div className="p-12 text-center">
            <User className="w-12 h-12 text-ink-300 mx-auto mb-3" />
            <h3 className="text-lg font-heading font-semibold text-ink-800">No hay clientes registrados</h3>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-ink-50 border-b border-ink-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-ink-600 uppercase">Cliente</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-ink-600 uppercase">Documento</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-ink-600 uppercase">Contacto</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-ink-600 uppercase">Compras</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-ink-600 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {clientesFiltrados.map((cliente) => (
                <tr key={cliente.id} className="hover:bg-ink-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        cliente.tipo === 'juridica' ? 'bg-purple-100' : 'bg-accent-sand'
                      }`}>
                        {cliente.tipo === 'juridica' ? (
                          <Building2 className="w-5 h-5 text-purple-600" />
                        ) : (
                          <User className="w-5 h-5 text-accent-terracotta" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-ink-800 flex items-center gap-1">
                          {cliente.nombre}
                          {cliente.esFrecuente && <Star className="w-4 h-4 text-accent-gold fill-accent-gold" />}
                        </p>
                        <p className="text-sm text-ink-500 capitalize">{cliente.tipo}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {cliente.dni && <p className="text-sm text-ink-600">DNI: {cliente.dni}</p>}
                    {cliente.ruc && <p className="text-sm text-ink-600">RUC: {cliente.ruc}</p>}
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-600">
                    {cliente.telefono && <p>{cliente.telefono}</p>}
                    {cliente.email && <p className="text-ink-400">{cliente.email}</p>}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2 py-1 bg-ink-100 rounded-lg text-sm font-medium text-ink-700">
                      {cliente.totalCompras}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => abrirEditar(cliente)} className="p-2 hover:bg-ink-100 rounded-lg text-ink-600 hover:text-accent-terracotta transition-colors">
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
          <div className="bg-accent-cream rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-ink-200 shadow-elevated">
            <div className="p-6 border-b border-ink-200">
              <h2 className="text-xl font-heading font-bold text-ink-800">
                {clienteEditando ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">Tipo</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-ink-700">
                    <input
                      type="radio"
                      value="natural"
                      checked={formData.tipo === 'natural'}
                      onChange={(e) => setFormData({...formData, tipo: e.target.value as 'natural'})}
                      className="w-4 h-4 text-accent-terracotta"
                    />
                    Persona Natural
                  </label>
                  <label className="flex items-center gap-2 text-ink-700">
                    <input
                      type="radio"
                      value="juridica"
                      checked={formData.tipo === 'juridica'}
                      onChange={(e) => setFormData({...formData, tipo: e.target.value as 'juridica'})}
                      className="w-4 h-4 text-accent-terracotta"
                    />
                    Empresa
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">
                  {formData.tipo === 'natural' ? 'Nombres' : 'Razón Social'} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="w-full px-4 py-3 border border-ink-200 rounded-xl focus:ring-2 focus:ring-accent-terracotta outline-none bg-white"
                />
              </div>

              {formData.tipo === 'natural' && (
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">Apellidos</label>
                  <input
                    type="text"
                    value={formData.apellidos}
                    onChange={(e) => setFormData({...formData, apellidos: e.target.value})}
                    className="w-full px-4 py-3 border border-ink-200 rounded-xl focus:ring-2 focus:ring-accent-terracotta outline-none bg-white"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">DNI</label>
                  <input
                    type="text"
                    maxLength={8}
                    value={formData.dni}
                    onChange={(e) => setFormData({...formData, dni: e.target.value.replace(/\D/g, '')})}
                    className="w-full px-4 py-3 border border-ink-200 rounded-xl focus:ring-2 focus:ring-accent-terracotta outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">RUC</label>
                  <input
                    type="text"
                    maxLength={11}
                    value={formData.ruc}
                    onChange={(e) => setFormData({...formData, ruc: e.target.value.replace(/\D/g, '')})}
                    className="w-full px-4 py-3 border border-ink-200 rounded-xl focus:ring-2 focus:ring-accent-terracotta outline-none bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">Dirección *</label>
                <textarea
                  required
                  value={formData.direccion}
                  onChange={(e) => setFormData({...formData, direccion: e.target.value})}
                  rows={2}
                  className="w-full px-4 py-3 border border-ink-200 rounded-xl focus:ring-2 focus:ring-accent-terracotta outline-none resize-none bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                    className="w-full px-4 py-3 border border-ink-200 rounded-xl focus:ring-2 focus:ring-accent-terracotta outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 border border-ink-200 rounded-xl focus:ring-2 focus:ring-accent-terracotta outline-none bg-white"
                  />
                </div>
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
                  {clienteEditando ? 'Guardar Cambios' : 'Crear Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
