'use client'

import { Package, Search, AlertTriangle, Plus, History, X, Pencil, RotateCcw } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Producto } from '@/types'
import toast from 'react-hot-toast'

type Movimiento = {
  id: number
  producto_id: number
  tipo: 'entrada' | 'salida'
  cantidad: number
  motivo: string
  factura_id: number | null
  pedido_id: number | null
  created_at: string
}

export default function InventarioPage() {
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<Producto[]>([])
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [loading, setLoading] = useState(true)

  // Modal nueva entrada
  const [showMov, setShowMov] = useState(false)
  const [movProducto, setMovProducto] = useState<Producto | null>(null)
  const [movCantidad, setMovCantidad] = useState(1)
  const [movMotivo, setMovMotivo] = useState('')
  const [saving, setSaving] = useState(false)

  // Historial
  const [showHistory, setShowHistory] = useState<number | null>(null)
  const [historyMovs, setHistoryMovs] = useState<Movimiento[]>([])
  const [undoing, setUndoing] = useState<number | null>(null)

  // Modal edición de lote
  const [editingMov, setEditingMov] = useState<Movimiento | null>(null)
  const [editCantidad, setEditCantidad] = useState(1)
  const [editMotivo, setEditMotivo] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // Modal ajuste manual de stock
  const [showAjuste, setShowAjuste] = useState(false)
  const [ajusteProducto, setAjusteProducto] = useState<Producto | null>(null)
  const [ajusteStockReal, setAjusteStockReal] = useState(0)
  const [ajusteMotivo, setAjusteMotivo] = useState('')
  const [ajusteSaving, setAjusteSaving] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: prods } = await supabase.from('productos').select('*').order('category').order('name')
    if (prods) setProducts(prods)
    const { data: movs } = await supabase.from('movimientos_stock').select('*').order('created_at', { ascending: false }).limit(50)
    if (movs) setMovimientos(movs)
    setLoading(false)
  }

  async function handleEntrada(e: React.FormEvent) {
    e.preventDefault()
    if (!movProducto || movCantidad <= 0) { toast.error('Datos inválidos'); return }
    setSaving(true)
    try {
      const { error: updErr } = await supabase.from('productos').update({
        stock: movProducto.stock + movCantidad
      }).eq('id', movProducto.id)
      if (updErr) throw updErr

      const { error: movErr } = await supabase.from('movimientos_stock').insert({
        producto_id: movProducto.id,
        tipo: 'entrada',
        cantidad: movCantidad,
        motivo: movMotivo || 'Lote de producción / compra',
      })
      if (movErr) throw movErr

      toast.success(`Entrada registrada: +${movCantidad} unidades ✅`)
      setShowMov(false); setMovMotivo(''); setMovCantidad(1)
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Error al registrar entrada')
    } finally { setSaving(false) }
  }

  async function handleAjusteStock(e: React.FormEvent) {
    e.preventDefault()
    if (!ajusteProducto || ajusteStockReal < 0) { toast.error('Stock inválido'); return }
    setAjusteSaving(true)
    try {
      const stockActual = ajusteProducto.stock || 0
      const diferencia = ajusteStockReal - stockActual
      if (diferencia === 0) {
        toast.success('El stock ya está en ese valor')
        setShowAjuste(false); return
      }

      const { error: updErr } = await supabase
        .from('productos').update({ stock: ajusteStockReal }).eq('id', ajusteProducto.id)
      if (updErr) throw updErr

      const { error: movErr } = await supabase.from('movimientos_stock').insert({
        producto_id: ajusteProducto.id,
        tipo: diferencia > 0 ? 'entrada' : 'salida',
        cantidad: Math.abs(diferencia),
        motivo: ajusteMotivo || `Ajuste manual: stock corregido de ${stockActual} a ${ajusteStockReal}`,
      })
      if (movErr) throw movErr

      toast.success(`Stock ajustado: ${stockActual} → ${ajusteStockReal} ✅`)
      setShowAjuste(false); setAjusteMotivo('')
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Error al ajustar stock')
    } finally { setAjusteSaving(false) }
  }

  async function handleEditEntrada(e: React.FormEvent) {
    e.preventDefault()
    if (!editingMov || editCantidad <= 0) { toast.error('Cantidad inválida'); return }
    if (editCantidad === editingMov.cantidad && editMotivo === editingMov.motivo) {
      setEditingMov(null); return
    }

    setEditSaving(true)
    try {
      // Calcular diferencia para ajustar el stock
      const diferencia = editCantidad - editingMov.cantidad

      if (diferencia !== 0) {
        const { data: prod } = await supabase
          .from('productos').select('stock').eq('id', editingMov.producto_id).single()
        const stockActual = prod?.stock || 0
        const nuevoStock = Math.max(0, stockActual + diferencia)

        const { error: updErr } = await supabase
          .from('productos').update({ stock: nuevoStock }).eq('id', editingMov.producto_id)
        if (updErr) throw updErr
      }

      // Actualizar el movimiento
      const { error: movErr } = await supabase
        .from('movimientos_stock')
        .update({ cantidad: editCantidad, motivo: editMotivo })
        .eq('id', editingMov.id)
      if (movErr) throw movErr

      const signo = diferencia > 0 ? `+${diferencia}` : `${diferencia}`
      toast.success(diferencia !== 0
        ? `Lote corregido: ${signo} unidades ajustadas al stock ✅`
        : 'Motivo actualizado ✅'
      )
      setEditingMov(null)
      loadData()
      if (showHistory === editingMov.producto_id) loadHistory(editingMov.producto_id)
    } catch (err: any) {
      toast.error(err.message || 'Error al editar entrada')
    } finally { setEditSaving(false) }
  }

  async function loadHistory(productoId: number) {
    setShowHistory(productoId)
    const { data } = await supabase.from('movimientos_stock')
      .select('*')
      .eq('producto_id', productoId)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setHistoryMovs(data)
  }

  async function undoEntrada(mov: Movimiento) {
    if (!mov || mov.tipo !== 'entrada') return
    if (mov.factura_id || mov.pedido_id) {
      toast.error('No se puede deshacer: esta entrada está vinculada a una venta')
      return
    }
    setUndoing(mov.id)
    try {
      const { data: prod } = await supabase.from('productos').select('stock').eq('id', mov.producto_id).single()
      const nuevoStock = Math.max(0, (prod?.stock || 0) - mov.cantidad)

      const { error: updErr } = await supabase.from('productos').update({ stock: nuevoStock }).eq('id', mov.producto_id)
      if (updErr) throw updErr

      const { error: delErr } = await supabase.from('movimientos_stock').delete().eq('id', mov.id)
      if (delErr) throw delErr

      toast.success(`Entrada eliminada: -${mov.cantidad} unidades ✅`)
      loadData()
      if (showHistory === mov.producto_id) loadHistory(mov.producto_id)
    } catch (err: any) {
      toast.error(err.message || 'Error al deshacer entrada')
    } finally { setUndoing(null) }
  }

  function openEdit(mov: Movimiento) {
    setEditingMov(mov)
    setEditCantidad(mov.cantidad)
    setEditMotivo(mov.motivo)
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.codigo || '').toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="text-center py-16 text-primary-500">
        <Package size={48} className="mx-auto mb-3 opacity-50 animate-pulse" />
        <p>Cargando inventario...</p>
      </div>
    )
  }

  const totalStock = products.reduce((s, p) => s + (p.stock || 0), 0)
  const lowStock = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) < 50).length
  const outStock = products.filter(p => (p.stock || 0) <= 0).length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-primary-800">Inventario</h1>
          <p className="text-primary-500 text-sm mt-1">{products.length} productos · {totalStock} unidades totales</p>
        </div>
      </div>

      {/* Info alert */}
      <div className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-800 text-sm flex items-start gap-3">
        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Las salidas de stock son automáticas</p>
          <p className="text-blue-600 text-xs mt-1">
            Cada vez que se emite una factura o se confirma un pedido web, el stock se descuenta solo.
            Aquí solo registras las <strong>entradas</strong> (lotes de producción o compras).
          </p>
        </div>
      </div>

      {/* Stats */}
      <div data-crm-section="resumen-stock" className="grid grid-cols-3 gap-4 mb-6">
        <div className="card !p-4 text-center">
          <p className="text-2xl font-heading font-bold text-green-600">{products.filter(p => (p.stock || 0) >= 50).length}</p>
          <p className="text-xs text-primary-500">Stock normal</p>
        </div>
        <div className="card !p-4 text-center">
          <p className="text-2xl font-heading font-bold text-amber-500">{lowStock}</p>
          <p className="text-xs text-primary-500">Stock bajo</p>
        </div>
        <div className="card !p-4 text-center">
          <p className="text-2xl font-heading font-bold text-red-500">{outStock}</p>
          <p className="text-xs text-primary-500">Sin stock</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-400" />
        <input
          type="text"
          placeholder="Buscar producto o código..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field pl-12"
        />
      </div>

      {/* Product list */}
      <div data-crm-section="lista-productos" className="space-y-2">
        {filtered.map(p => {
          const productMovs = movimientos.filter(m => m.producto_id === p.id && m.tipo === 'entrada')
          const lastEntrada = productMovs[0]
          return (
            <div key={p.id} className="card !p-4">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full shrink-0 ${(p.stock || 0) <= 0 ? 'bg-red-500' : (p.stock || 0) < 50 ? 'bg-amber-500' : 'bg-green-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {p.codigo && <span className="text-xs font-mono bg-primary-100 text-primary-500 px-2 py-0.5 rounded-md">{p.codigo}</span>}
                    <p className="font-heading font-semibold text-primary-800 truncate">{p.name}</p>
                  </div>
                  <p className="text-primary-400 text-xs">{p.category}</p>
                </div>
                <div className="text-right">
                  <p className={`font-heading font-bold text-lg ${(p.stock || 0) <= 0 ? 'text-red-500' : 'text-primary-800'}`}>{p.stock || 0}</p>
                  <p className="text-xs text-primary-400">unidades</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setMovProducto(p); setShowMov(true) }}
                    className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                    title="Registrar entrada de lote"
                  >
                    <Plus size={15} />
                  </button>
                  <button
                    onClick={() => { setAjusteProducto(p); setAjusteStockReal(p.stock || 0); setShowAjuste(true) }}
                    className="p-2 rounded-lg bg-amber-100 text-amber-600 hover:bg-amber-200 transition-colors"
                    title="Ajustar stock manualmente"
                  >
                    <RotateCcw size={15} />
                  </button>
                  <button
                    onClick={() => showHistory === p.id ? setShowHistory(null) : loadHistory(p.id)}
                    className="p-2 rounded-lg bg-primary-100 text-primary-600 hover:bg-primary-200 transition-colors"
                    title="Historial de entradas"
                  >
                    <History size={15} />
                  </button>
                </div>
              </div>

              {lastEntrada && (
                <p className="text-xs text-primary-400 mt-2 ml-7">
                  Última entrada: <span className="text-green-600 font-medium">+{lastEntrada.cantidad}</span> · {lastEntrada.motivo} · {new Date(lastEntrada.created_at).toLocaleDateString('es-PE')}
                </p>
              )}

              {showHistory === p.id && (
                <div className="mt-3 ml-7 bg-primary-50 rounded-xl p-3 max-h-64 overflow-y-auto">
                  <p className="text-xs font-semibold text-primary-600 mb-2">Historial de entradas</p>
                  {historyMovs.filter(m => m.tipo === 'entrada').length === 0 ? (
                    <p className="text-xs text-primary-400">Sin entradas registradas</p>
                  ) : (
                    historyMovs.filter(m => m.tipo === 'entrada').map(m => (
                      <div key={m.id} className="flex items-center gap-2 text-xs py-1.5 border-b border-primary-100 last:border-0">
                        <span className="text-green-600 font-medium shrink-0 w-12 text-right">+{m.cantidad}</span>
                        <span className="text-primary-500 truncate flex-1">{m.motivo}</span>
                        <span className="text-primary-400 shrink-0">{new Date(m.created_at).toLocaleDateString('es-PE')}</span>
                        {!m.factura_id && !m.pedido_id && (
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => openEdit(m)}
                              className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors text-[10px] font-medium"
                              title="Editar cantidad o motivo del lote"
                            >
                              <Pencil size={10} className="inline mr-0.5" />
                              Editar
                            </button>
                            <button
                              onClick={() => undoEntrada(m)}
                              disabled={undoing === m.id}
                              className="px-2 py-0.5 rounded-md bg-red-50 text-red-500 hover:bg-red-100 transition-colors text-[10px] font-medium disabled:opacity-50"
                              title="Eliminar esta entrada del historial"
                            >
                              {undoing === m.id ? '...' : 'Eliminar'}
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && !loading && (
        <div className="text-center py-16 text-primary-400">
          <Package size={48} className="mx-auto mb-3 opacity-50" />
          <p className="font-medium">No se encontraron productos</p>
        </div>
      )}

      {/* Modal: nueva entrada de lote */}
      {showMov && movProducto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowMov(false)} />
          <div className="relative bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <button onClick={() => setShowMov(false)} className="absolute top-4 right-4 text-primary-400 hover:text-primary-600">
              <X size={20} />
            </button>
            <h2 className="font-heading text-xl font-bold text-primary-800 mb-2">Registrar entrada de lote</h2>
            <p className="text-sm text-primary-500 mb-1">{movProducto.codigo} — {movProducto.name}</p>
            <p className="text-sm text-primary-600 mb-4">
              Stock actual: <strong>{movProducto.stock || 0}</strong> unidades
            </p>
            <form onSubmit={handleEntrada} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1">Cantidad recibida</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={movCantidad}
                  onChange={e => setMovCantidad(parseInt(e.target.value) || 1)}
                  className="input-field"
                  placeholder="Ej: 100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1">Motivo / Origen del lote</label>
                <input
                  type="text"
                  value={movMotivo}
                  onChange={e => setMovMotivo(e.target.value)}
                  placeholder="Ej: Producción del 12/05, Compra a proveedor..."
                  className="input-field"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full btn-primary py-3 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? 'Guardando...' : <><Plus size={18} /> Registrar entrada</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: editar lote existente */}
      {editingMov && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setEditingMov(null)} />
          <div className="relative bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <button onClick={() => setEditingMov(null)} className="absolute top-4 right-4 text-primary-400 hover:text-primary-600">
              <X size={20} />
            </button>
            <h2 className="font-heading text-xl font-bold text-primary-800 mb-1">Corregir lote</h2>
            <p className="text-sm text-primary-500 mb-1">
              Registrado el {new Date(editingMov.created_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-800">
              Cantidad original: <strong>{editingMov.cantidad}</strong> unidades.
              El stock se ajustará por la diferencia automáticamente.
            </div>
            <form onSubmit={handleEditEntrada} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1">Cantidad correcta</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={editCantidad}
                  onChange={e => setEditCantidad(parseInt(e.target.value) || 1)}
                  className="input-field"
                  autoFocus
                />
                {editCantidad !== editingMov.cantidad && (
                  <p className={`text-xs mt-1 font-medium ${editCantidad > editingMov.cantidad ? 'text-green-600' : 'text-red-500'}`}>
                    Ajuste al stock: {editCantidad > editingMov.cantidad ? '+' : ''}{editCantidad - editingMov.cantidad} unidades
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1">Motivo</label>
                <input
                  type="text"
                  value={editMotivo}
                  onChange={e => setEditMotivo(e.target.value)}
                  className="input-field"
                />
              </div>
              <button
                type="submit"
                disabled={editSaving}
                className="w-full btn-primary py-3 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {editSaving ? 'Guardando...' : <><Pencil size={16} /> Guardar corrección</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: ajuste manual de stock */}
      {showAjuste && ajusteProducto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowAjuste(false)} />
          <div className="relative bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <button onClick={() => setShowAjuste(false)} className="absolute top-4 right-4 text-primary-400 hover:text-primary-600">
              <X size={20} />
            </button>
            <h2 className="font-heading text-xl font-bold text-primary-800 mb-2">Ajustar stock manual</h2>
            <p className="text-sm text-primary-500 mb-1">{ajusteProducto.codigo} — {ajusteProducto.name}</p>
            <p className="text-sm text-primary-600 mb-1">
              Stock actual registrado: <strong>{ajusteProducto.stock || 0}</strong> unidades
            </p>
            <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-800">
              Ingresa el stock <strong>real/correcto</strong>. El sistema calculará la diferencia automáticamente.
            </div>
            <form onSubmit={handleAjusteStock} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1">Stock real (cantidad correcta)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={ajusteStockReal}
                  onChange={e => setAjusteStockReal(parseInt(e.target.value) || 0)}
                  className="input-field"
                  autoFocus
                />
                {(ajusteProducto.stock || 0) !== ajusteStockReal && (
                  <p className={`text-xs mt-1 font-medium ${ajusteStockReal > (ajusteProducto.stock || 0) ? 'text-green-600' : 'text-red-500'}`}>
                    {ajusteStockReal > (ajusteProducto.stock || 0)
                      ? `+${ajusteStockReal - (ajusteProducto.stock || 0)} unidades (aumento)`
                      : `${ajusteStockReal - (ajusteProducto.stock || 0)} unidades (reducción)`}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1">Motivo del ajuste</label>
                <input
                  type="text"
                  value={ajusteMotivo}
                  onChange={e => setAjusteMotivo(e.target.value)}
                  placeholder="Ej: Error de conteo, inventario físico..."
                  className="input-field"
                />
              </div>
              <button
                type="submit"
                disabled={ajusteSaving}
                className="w-full btn-primary py-3 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {ajusteSaving ? 'Ajustando...' : <><RotateCcw size={16} /> Ajustar stock</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
