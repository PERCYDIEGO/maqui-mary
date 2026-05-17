'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, User, Building2, Phone, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { validarRUC, validarDNI } from '@/lib/calculos'
import toast from 'react-hot-toast'

type Cliente = {
  id: number
  name: string
  tipo_documento: '0' | '1' | '6' | '7'
  num_documento: string
  dni: string
  address: string
  phone: string
  email: string
  created_at: string
}

type FormData = {
  tipo_documento: '1' | '6'
  name: string
  num_documento: string
  dni: string
  address: string
  phone: string
  email: string
}

const FORM_DEFAULT: FormData = {
  tipo_documento: '1',
  name: '',
  num_documento: '',
  dni: '',
  address: '',
  phone: '',
  email: '',
}

const TIPO_LABEL: Record<string, string> = {
  '0': 'Otros',
  '1': 'DNI',
  '6': 'RUC',
  '7': 'Pasaporte',
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [formData, setFormData] = useState<FormData>(FORM_DEFAULT)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const cached = localStorage.getItem('mm_clientes_cache')
    if (cached) {
      try { setClientes(JSON.parse(cached)); setLoading(false) } catch {}
    }
    loadClientes()
  }, [])

  async function loadClientes() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('name')
      if (error) {
        toast.error('Error al cargar clientes')
      } else if (data) {
        setClientes(data)
        try { localStorage.setItem('mm_clientes_cache', JSON.stringify(data)) } catch {}
      }
    } catch (err) {
      console.error('Error en loadClientes:', err)
      toast.error('Error al cargar clientes')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (formData.tipo_documento === '1') {
      if (!validarDNI(formData.num_documento)) {
        toast.error('El DNI debe tener exactamente 8 dígitos numéricos')
        return
      }
    } else if (formData.tipo_documento === '6') {
      if (formData.num_documento.length !== 11) {
        toast.error('El RUC debe tener exactamente 11 dígitos')
        return
      }
      if (!validarRUC(formData.num_documento)) {
        toast.error('El RUC ingresado no es válido (dígito verificador incorrecto)')
        return
      }
    }

    setSaving(true)
    try {
      const payload = {
        name: formData.name,
        tipo_documento: formData.tipo_documento,
        num_documento: formData.num_documento,
        dni: formData.tipo_documento === '1' ? formData.num_documento : formData.dni,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
      }

      if (editando) {
        const { error } = await supabase.from('clientes').update(payload).eq('id', editando.id)
        if (error) throw error
        toast.success('Cliente actualizado')
      } else {
        const { error } = await supabase.from('clientes').insert(payload)
        if (error) throw error
        toast.success('Cliente creado')
      }
      cerrarModal()
      loadClientes()
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar cliente')
    } finally {
      setSaving(false)
    }
  }

  function cerrarModal() {
    setModalAbierto(false)
    setEditando(null)
    setFormData(FORM_DEFAULT)
  }

  function abrirEditar(c: Cliente) {
    setEditando(c)
    setFormData({
      tipo_documento: (c.tipo_documento === '6' ? '6' : '1') as '1' | '6',
      name: c.name,
      num_documento: c.num_documento || c.dni || '',
      dni: c.dni || '',
      address: c.address || '',
      phone: c.phone || '',
      email: c.email || '',
    })
    setModalAbierto(true)
  }

  const filtrados = clientes.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.num_documento || '').includes(search) ||
    (c.phone || '').includes(search)
  )

  if (loading) {
    return (
      <div className="text-center py-16 text-primary-500">
        <User size={48} className="mx-auto mb-3 opacity-50 animate-pulse" />
        <p>Cargando clientes...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-primary-800">Clientes</h1>
          <p className="text-primary-500 text-sm mt-1">{clientes.length} clientes registrados</p>
        </div>
        <button
          onClick={() => setModalAbierto(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold shadow transition-all"
        >
          <Plus className="w-5 h-5" />
          Nuevo Cliente
        </button>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, RUC/DNI o teléfono..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field pl-12"
        />
      </div>

      <div className="card overflow-hidden !p-0">
        {filtrados.length === 0 ? (
          <div className="p-12 text-center">
            <User className="w-12 h-12 text-primary-300 mx-auto mb-3" />
            <h3 className="text-lg font-heading font-semibold text-primary-800">
              {search ? 'Sin resultados' : 'No hay clientes registrados'}
            </h3>
            <p className="text-primary-400 text-sm mt-1">
              Los clientes se crean automáticamente al emitir documentos, o puedes agregarlos manualmente.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-primary-50 border-b border-primary-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary-600 uppercase">Cliente</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary-600 uppercase">Documento</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary-600 uppercase">Contacto</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary-600 uppercase">Dirección</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-primary-600 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-100">
              {filtrados.map(c => (
                <tr key={c.id} className="hover:bg-primary-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        c.tipo_documento === '6' ? 'bg-purple-100' : 'bg-primary-100'
                      }`}>
                        {c.tipo_documento === '6'
                          ? <Building2 className="w-5 h-5 text-purple-600" />
                          : <User className="w-5 h-5 text-primary-600" />
                        }
                      </div>
                      <p className="font-medium text-primary-800 leading-tight">{c.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="text-primary-500">{TIPO_LABEL[c.tipo_documento] || 'Doc'}:</span>{' '}
                    <span className="font-mono text-primary-800">{c.num_documento || c.dni || '—'}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-primary-600">
                    {c.phone && (
                      <p className="flex items-center gap-1">
                        <Phone size={12} className="shrink-0" />{c.phone}
                      </p>
                    )}
                    {c.email && (
                      <p className="flex items-center gap-1 text-primary-400">
                        <Mail size={12} className="shrink-0" />{c.email}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-primary-500 max-w-xs truncate">
                    {c.address || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => abrirEditar(c)}
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
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-primary-200">
              <h2 className="text-xl font-heading font-bold text-primary-800">
                {editando ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">

              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1">Tipo de documento</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-primary-700 cursor-pointer">
                    <input
                      type="radio"
                      value="1"
                      checked={formData.tipo_documento === '1'}
                      onChange={() => setFormData({ ...formData, tipo_documento: '1' })}
                      className="w-4 h-4 text-primary-600"
                    />
                    Persona Natural (DNI)
                  </label>
                  <label className="flex items-center gap-2 text-primary-700 cursor-pointer">
                    <input
                      type="radio"
                      value="6"
                      checked={formData.tipo_documento === '6'}
                      onChange={() => setFormData({ ...formData, tipo_documento: '6' })}
                      className="w-4 h-4 text-primary-600"
                    />
                    Empresa (RUC)
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1">
                  {formData.tipo_documento === '6' ? 'Razón Social *' : 'Nombre completo *'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder={formData.tipo_documento === '6' ? 'Distribuidora Ejemplo S.A.C.' : 'Juan García López'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1">
                  {formData.tipo_documento === '6' ? 'RUC *' : 'DNI *'}
                </label>
                <input
                  type="text"
                  required
                  maxLength={formData.tipo_documento === '6' ? 11 : 8}
                  value={formData.num_documento}
                  onChange={e => setFormData({ ...formData, num_documento: e.target.value.replace(/\D/g, '') })}
                  className="input-field font-mono"
                  placeholder={formData.tipo_documento === '6' ? '20123456789' : '12345678'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1">Dirección *</label>
                <textarea
                  required
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className="input-field resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="input-field"
                    placeholder="987654321"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="input-field"
                  />
                </div>
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
                  {saving ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
