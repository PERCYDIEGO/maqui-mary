'use client'

import { Package, Plus, Search, AlertTriangle, Pencil, Trash2, X, Upload } from 'lucide-react'
import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/context/AppContext'
import type { Producto, UnidadMedida } from '@/types/documentos'
import toast from 'react-hot-toast'

export default function ProductosPage() {
  const { productos, productosLoaded, refreshProductos } = useApp()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Producto | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleImageUpload(file: File): Promise<string> {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) throw new Error('Solo imágenes JPG, PNG o WebP')
    if (file.size > 5 * 1024 * 1024) throw new Error('La imagen no debe superar 5MB')

    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `producto_${Date.now()}.${ext}`
    const buffer = await file.arrayBuffer()

    const { error } = await supabase.storage
      .from('productos')
      .upload(fileName, buffer, { contentType: file.type, upsert: false })
    if (error) throw new Error(error.message)

    const { data: { publicUrl } } = supabase.storage.from('productos').getPublicUrl(fileName)
    return publicUrl
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await handleImageUpload(file)
      setForm(f => ({ ...f, imagen: url }))
      toast.success('Imagen subida')
    } catch (err: any) {
      toast.error(err.message || 'Error al subir imagen')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }
  
  // Formulario
  const [form, setForm] = useState({
    codigo: '',
    descripcion: '',
    detalle: '',
    precioOriginal: 0,
    precioUnitario: 0,
    categoria: 'Esponjas',
    unidadMedida: 'UNIDAD' as UnidadMedida,
    imagen: '',
    activo: true,
  })

  // Recargar productos después de guardar/eliminar
  const reloadProductos = async () => {
    await refreshProductos()
  }

  async function getNextCodigo(): Promise<string> {
    const { data } = await supabase
      .from('productos')
      .select('codigo')
      .order('codigo', { ascending: false })
      .limit(1)
    const last = data?.[0]?.codigo || 'PRO-000'
    const num = parseInt(last.replace('PRO-', ''), 10) + 1
    return `PRO-${String(num).padStart(3, '0')}`
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        codigo: editing ? form.codigo : await getNextCodigo(),
        name: form.descripcion,
        descripcion: form.descripcion,
        detalle: form.detalle,
        description: form.detalle,
        precioOriginal: form.precioOriginal,
        precioUnitario: form.precioUnitario,
        price: form.precioUnitario,
        category: form.categoria,
        unidadMedida: form.unidadMedida,
        imagen: form.imagen,
        image: form.imagen,
        activo: true,
      }

      if (editing) {
        const { error } = await supabase.from('productos').update(payload).eq('id', editing.id)
        if (error) throw error
        toast.success('Producto actualizado')
      } else {
        const { error } = await supabase.from('productos').insert(payload)
        if (error) throw error
        toast.success('Producto creado')
      }

      setShowModal(false)
      setEditing(null)
      resetForm()
      await reloadProductos() // Recargar para sincronizar con el contexto
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar')
    } finally {
      setSaving(false) 
    }
  }

  async function handleDelete(p: Producto) {
    if (!confirm(`¿Eliminar "${p.descripcion}"? Esta acción no se puede deshacer.`)) return
    
    try {
      // Soft delete - marcar como inactivo
      const { error } = await supabase
        .from('productos')
        .update({ activo: false })
        .eq('id', p.id)
      
      if (error) throw error
      
      toast.success('Producto eliminado')
      await reloadProductos() // Recargar para sincronizar
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar')
    }
  }

  function openEdit(p: Producto) {
    setEditing(p)
    setForm({
      codigo: p.codigo || '',
      descripcion: p.descripcion,
      detalle: p.detalle || '',
      precioOriginal: p.precioOriginal,
      precioUnitario: p.precioUnitario,
      categoria: p.categoria,
      unidadMedida: p.unidadMedida,
      imagen: p.imagen || '',
      activo: p.activo,
    })
    setShowModal(true)
  }

  async function openCreate() {
    setEditing(null)
    setForm({
      ...resetForm(),
      codigo: await getNextCodigo(),
    })
    setShowModal(true)
  }

  function resetForm() {
    return {
      codigo: '',
      descripcion: '',
      detalle: '',
      precioOriginal: 0,
      precioUnitario: 0,
      categoria: 'Esponjas',
      unidadMedida: 'UNIDAD' as UnidadMedida,
      imagen: '',
      activo: true,
    }
  }

  const filtered = productos.filter(p =>
    p.descripcion.toLowerCase().includes(search.toLowerCase()) ||
    p.categoria.toLowerCase().includes(search.toLowerCase()) ||
    (p.codigo || '').toLowerCase().includes(search.toLowerCase())
  )

  const grouped = filtered.reduce<Record<string, Producto[]>>((acc, p) => {
    if (!acc[p.categoria]) acc[p.categoria] = []
    acc[p.categoria].push(p)
    return acc
  }, {})

  // Mostrar loading solo si los productos aún no se han cargado en el contexto
  if (!productosLoaded) {
    return (
      <div className="text-center py-16 text-ink-500">
        <Package size={48} className="mx-auto mb-3 opacity-50 animate-pulse" />
        <p>Cargando productos...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-ink-800">Productos</h1>
          <p className="text-ink-500 text-sm mt-1">{productos.length} productos activos</p>
        </div>
        <button 
          onClick={openCreate} 
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-terracotta hover:bg-accent-terracotta/90 text-white rounded-xl font-semibold shadow-warm transition-all"
        >
          <Plus size={18} /> Agregar Producto
        </button>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
        <input 
          type="text" 
          placeholder="Buscar producto o código..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          className="w-full pl-12 pr-4 py-3 border border-ink-200 rounded-xl focus:ring-2 focus:ring-accent-terracotta focus:border-transparent outline-none bg-white"
        />
      </div>

      {Object.entries(grouped).map(([categoria, prods]) => (
        <div key={categoria} className="mb-8">
          <h2 className="font-heading font-bold text-ink-700 text-sm uppercase tracking-wider mb-3 px-1">
            {categoria} <span className="text-ink-400 font-normal ml-2">({prods.length})</span>
          </h2>
          <div className="space-y-3">
            {prods.map(p => (
              <div key={p.id} className="bg-accent-cream p-4 rounded-xl border border-ink-200 shadow-soft flex items-center gap-4 hover:shadow-warm transition-shadow">
                <div className="w-16 h-16 bg-accent-sand rounded-xl shrink-0 flex items-center justify-center border border-ink-200 overflow-hidden">
                  {p.imagen ? (
                    <img src={p.imagen} alt={p.descripcion} className="w-full h-full object-cover" />
                  ) : (
                    <Package size={24} className="text-accent-terracotta" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-ink-100 text-ink-600 px-2 py-0.5 rounded-md">{p.codigo || '—'}</span>
                    <p className="font-heading font-semibold text-ink-800 truncate">{p.descripcion}</p>
                  </div>
                  {p.detalle && (
                    <p className="text-ink-500 text-xs mt-1 line-clamp-2">{p.detalle}</p>
                  )}
                  <p className="text-ink-400 text-xs">{p.categoria} — {p.unidadMedida}</p>
                </div>
                <div className="text-right">
                  {p.precioOriginal > p.precioUnitario && (
                    <p className="text-xs text-ink-400 line-through">S/ {p.precioOriginal.toFixed(2)}</p>
                  )}
                  <p className="font-heading font-bold text-accent-terracotta">S/ {p.precioUnitario.toFixed(2)}</p>
                  <p className={`text-xs flex items-center gap-1 justify-end ${p.stock <= 0 ? 'text-red-500' : p.stock < 50 ? 'text-amber-500' : 'text-green-600'}`}>
                    {p.stock <= 0 ? <><AlertTriangle size={12} /> Sin stock</> : `${p.stock} uds`}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(p)} className="p-2 rounded-lg bg-ink-100 text-ink-600 hover:bg-ink-200 transition-colors">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => handleDelete(p)} className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && productosLoaded && (
        <div className="text-center py-16 text-ink-400">
          <Package size={48} className="mx-auto mb-3 opacity-50" />
          <p className="font-medium">No se encontraron productos</p>
          <p className="text-sm mt-2">Agrega tu primer producto haciendo clic en "Agregar Producto"</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-ink-900/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-accent-cream rounded-2xl w-full max-w-lg p-6 shadow-elevated border border-ink-200 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-ink-400 hover:text-ink-600">
              <X size={20} />
            </button>
            <h2 className="font-heading text-xl font-bold text-ink-800 mb-6">
              {editing ? 'Editar Producto' : 'Nuevo Producto'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono bg-ink-100 text-ink-600 px-3 py-1.5 rounded-lg">{form.codigo || 'PRO-XXX'}</span>
                <span className="text-xs text-ink-400">Código auto-generado</span>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">Nombre / Descripción *</label>
                <input 
                  type="text" 
                  required 
                  value={form.descripcion} 
                  onChange={e => setForm({ ...form, descripcion: e.target.value })} 
                  className="w-full px-4 py-3 border border-ink-200 rounded-xl focus:ring-2 focus:ring-accent-terracotta focus:border-transparent outline-none bg-white"
                  placeholder="Ej: Esponja Multiuso"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">Detalle</label>
                <textarea 
                  value={form.detalle} 
                  onChange={e => setForm({ ...form, detalle: e.target.value })} 
                  className="w-full px-4 py-3 border border-ink-200 rounded-xl focus:ring-2 focus:ring-accent-terracotta focus:border-transparent outline-none bg-white resize-none"
                  rows={3}
                  placeholder="Descripción detallada del producto..."
                />
                <p className="text-xs text-ink-400 mt-1">Este detalle se mostrará automáticamente al seleccionar el producto en documentos</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">Precio Original (S/)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    value={form.precioOriginal} 
                    onChange={e => setForm({ ...form, precioOriginal: parseFloat(e.target.value) || 0 })} 
                    className="w-full px-4 py-3 border border-ink-200 rounded-xl focus:ring-2 focus:ring-accent-terracotta focus:border-transparent outline-none bg-white"
                    placeholder="Precio tachado"
                  />
                  <p className="text-xs text-ink-400 mt-1">Precio de lista (opcional)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">Precio Venta (S/) *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    required 
                    value={form.precioUnitario} 
                    onChange={e => setForm({ ...form, precioUnitario: parseFloat(e.target.value) || 0 })} 
                    className="w-full px-4 py-3 border border-ink-200 rounded-xl focus:ring-2 focus:ring-accent-terracotta focus:border-transparent outline-none bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">Unidad de medida</label>
                <select
                  value={form.unidadMedida}
                  onChange={e => setForm({ ...form, unidadMedida: e.target.value as any })}
                  className="w-full px-4 py-3 border border-ink-200 rounded-xl focus:ring-2 focus:ring-accent-terracotta focus:border-transparent outline-none bg-white"
                >
                  {['UNIDAD', 'CAJA', 'PAQUETE', 'KILO', 'LITRO'].map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
                <p className="text-xs text-ink-400 mt-1">El stock se gestiona desde la sección Inventario</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">Categoría</label>
                  <select 
                    value={form.categoria} 
                    onChange={e => setForm({ ...form, categoria: e.target.value })} 
                    className="w-full px-4 py-3 border border-ink-200 rounded-xl focus:ring-2 focus:ring-accent-terracotta focus:border-transparent outline-none bg-white"
                  >
                    {['Esponjas', 'Limpieza', 'Hogar', 'Otros'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">Imagen del producto</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={form.imagen}
                      onChange={e => setForm({ ...form, imagen: e.target.value })}
                      className="w-full px-4 py-3 border border-ink-200 rounded-xl focus:ring-2 focus:ring-accent-terracotta focus:border-transparent outline-none bg-white text-sm"
                      placeholder="URL o sube un archivo"
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="shrink-0 px-3 py-2 rounded-xl border border-ink-200 bg-white hover:bg-ink-50 text-ink-600 transition-colors disabled:opacity-50"
                      title="Subir imagen"
                    >
                      {uploading ? <span className="text-xs">...</span> : <Upload size={16} />}
                    </button>
                  </div>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFileChange} />
                  {form.imagen && (
                    <img src={form.imagen} alt="Preview" className="mt-2 h-16 w-16 object-cover rounded-lg border border-ink-200" />
                  )}
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={saving} 
                className="w-full bg-accent-terracotta hover:bg-accent-terracotta/90 text-white font-semibold py-3 rounded-xl disabled:opacity-50 transition-colors"
              >
                {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear producto'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
