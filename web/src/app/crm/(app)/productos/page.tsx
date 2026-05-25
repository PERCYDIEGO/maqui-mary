'use client'

import { Package, Plus, Search, AlertTriangle, Pencil, Trash2, X, Check } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/context/AppContext'
import type { Producto, UnidadMedida } from '@/types/documentos'
import toast from 'react-hot-toast'

// Imágenes locales disponibles en public/img
const LOCAL_IMAGES = [
  { path: '/img/esponjas-colores.png',                  label: 'Esponjas Colores Mix' },
  { path: '/img/esponja_doble_uso_cuadrada.png',        label: 'Doble Uso Cuadrada' },
  { path: '/img/esponja_doble_uso_cuadrada_tira.png',   label: 'Doble Uso Cuadrada (tira)' },
  { path: '/img/esponja_doble_uso_redonda en_tiras.jpeg', label: 'Doble Uso Redonda' },
  { path: '/img/esponja_doble_uso_salva_uñas.png',      label: 'Salva Uñas' },
  { path: '/img/esponja_payasito_colores_tiras.jpeg',   label: 'Payasito Colores' },
  { path: '/img/lana_de_acero.png',                     label: 'Lana de Acero' },
  { path: '/img/paño_amarillo.png',                     label: 'Paño Amarillo' },
]

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

async function apiProducto(method: 'POST' | 'PUT' | 'DELETE', body: object): Promise<void> {
  const token = await getToken()
  if (!token) throw new Error('Sin sesión activa')
  const res = await fetch('/api/productos', {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!json.ok) throw new Error(json.error || 'Error en la operación')
}

export default function ProductosPage() {
  const { productos, productosLoaded, refreshProductos } = useApp()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Producto | null>(null)
  const [saving, setSaving] = useState(false)
  const [showImagePicker, setShowImagePicker] = useState(false)
  const [rawPrecio, setRawPrecio] = useState<{ original: string | null; venta: string | null }>({ original: null, venta: null })

  useEffect(() => {
    if (!productosLoaded) refreshProductos()
  }, [])

  const emptyForm = {
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
  const [form, setForm] = useState(emptyForm)

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
        description: form.detalle,
        precio_original: form.precioOriginal,
        price: form.precioUnitario,
        category: form.categoria,
        unidad_de_medida: form.unidadMedida,
        imagen: form.imagen,
        activo: true,
      }

      if (editing) {
        await apiProducto('PUT', { id: editing.id, ...payload })
        toast.success('Producto actualizado')
      } else {
        await apiProducto('POST', payload)
        toast.success('Producto creado')
      }

      setShowModal(false)
      setEditing(null)
      setForm(emptyForm)
      await refreshProductos()
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(p: Producto) {
    if (!confirm(`¿Eliminar "${p.descripcion}"? Esta acción no se puede deshacer.`)) return
    try {
      await apiProducto('DELETE', { id: p.id })
      toast.success('Producto eliminado')
      await refreshProductos()
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
    setRawPrecio({ original: null, venta: null })
    setShowModal(true)
  }

  async function openCreate() {
    setEditing(null)
    setForm({ ...emptyForm, codigo: await getNextCodigo() })
    setRawPrecio({ original: null, venta: null })
    setShowModal(true)
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

      {/* ── Modal ── */}
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
                <p className="text-xs text-ink-400 mt-1">Se muestra al seleccionar el producto en documentos</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">Precio Original (S/)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={rawPrecio.original ?? (form.precioOriginal === 0 ? '' : String(form.precioOriginal))}
                    onChange={e => {
                      const raw = e.target.value.replace(',', '.');
                      if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) return;
                      setRawPrecio(r => ({ ...r, original: raw }));
                      if (raw !== '') {
                        const val = parseFloat(raw);
                        setForm(f => ({ ...f, precioOriginal: isNaN(val) ? 0 : val }));
                      }
                    }}
                    onBlur={() => {
                      if (rawPrecio.original === '') setForm(f => ({ ...f, precioOriginal: 0 }));
                      setRawPrecio(r => ({ ...r, original: null }));
                    }}
                    placeholder="0.00"
                    className="w-full px-4 py-3 border border-ink-200 rounded-xl focus:ring-2 focus:ring-accent-terracotta focus:border-transparent outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">Precio Venta (S/) *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={rawPrecio.venta ?? (form.precioUnitario === 0 ? '' : String(form.precioUnitario))}
                    onChange={e => {
                      const raw = e.target.value.replace(',', '.');
                      if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) return;
                      setRawPrecio(r => ({ ...r, venta: raw }));
                      if (raw !== '') {
                        const val = parseFloat(raw);
                        setForm(f => ({ ...f, precioUnitario: isNaN(val) ? 0 : val }));
                      }
                    }}
                    onBlur={() => {
                      if (rawPrecio.venta === '') setForm(f => ({ ...f, precioUnitario: 0 }));
                      setRawPrecio(r => ({ ...r, venta: null }));
                    }}
                    placeholder="0.00"
                    className="w-full px-4 py-3 border border-ink-200 rounded-xl focus:ring-2 focus:ring-accent-terracotta focus:border-transparent outline-none bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">Unidad de medida</label>
                  <select
                    value={form.unidadMedida}
                    onChange={e => setForm({ ...form, unidadMedida: e.target.value as UnidadMedida })}
                    className="w-full px-4 py-3 border border-ink-200 rounded-xl focus:ring-2 focus:ring-accent-terracotta focus:border-transparent outline-none bg-white"
                  >
                    {['UNIDAD', 'CAJA', 'PAQUETE', 'KILO', 'LITRO'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
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
              </div>

              {/* Selector de imagen */}
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-2">Imagen del producto</label>

                {/* Vista previa + botón para abrir selector */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-16 h-16 rounded-xl border-2 border-ink-200 overflow-hidden bg-ink-50 shrink-0 flex items-center justify-center">
                    {form.imagen ? (
                      <img src={form.imagen} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Package size={24} className="text-ink-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowImagePicker(v => !v)}
                      className="w-full px-4 py-2 border border-ink-200 rounded-xl text-sm text-ink-700 bg-white hover:bg-ink-50 transition-colors text-left"
                    >
                      {form.imagen ? 'Cambiar imagen' : 'Seleccionar imagen'}
                    </button>
                    {form.imagen && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, imagen: '' })}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors"
                      >
                        Quitar imagen
                      </button>
                    )}
                  </div>
                </div>

                {/* Grid de imágenes locales */}
                {showImagePicker && (
                  <div className="border border-ink-200 rounded-xl p-3 bg-white">
                    <p className="text-xs text-ink-500 mb-2 font-medium">Imágenes disponibles</p>
                    <div className="grid grid-cols-4 gap-2">
                      {LOCAL_IMAGES.map(img => (
                        <button
                          key={img.path}
                          type="button"
                          onClick={() => { setForm({ ...form, imagen: img.path }); setShowImagePicker(false) }}
                          className={`relative rounded-xl overflow-hidden border-2 transition-all aspect-square ${
                            form.imagen === img.path
                              ? 'border-accent-terracotta ring-2 ring-accent-terracotta/30'
                              : 'border-ink-200 hover:border-accent-terracotta/50'
                          }`}
                          title={img.label}
                        >
                          <img src={img.path} alt={img.label} className="w-full h-full object-cover" />
                          {form.imagen === img.path && (
                            <div className="absolute inset-0 bg-accent-terracotta/20 flex items-center justify-center">
                              <Check size={20} className="text-accent-terracotta" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-ink-400 mt-2">El stock se gestiona desde la sección Inventario</p>
                  </div>
                )}
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
