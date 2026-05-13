'use client'

import { Package, Search, AlertTriangle, Plus, History, X } from 'lucide-react'
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
  const [showMov, setShowMov] = useState(false)
  const [movProducto, setMovProducto] = useState<Producto | null>(null)
  const [movCantidad, setMovCantidad] = useState(1)
  const [movMotivo, setMovMotivo] = useState('')
  const [saving, setSaving] = useState(false)
  const [undoing, setUndoing] = useState<number | null>(null)
  const [showHistory, setShowHistory] = useState<number | null>(null)
  const [historyMovs, setHistoryMovs] = useState<Movimiento[]>([])

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
      // Actualizar stock
      const { error: updErr } = await supabase.from('productos').update({ 
        stock: movProducto.stock + movCantidad 
      }).eq('id', movProducto.id)
      if (updErr) throw updErr

      // Registrar entrada
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
    // Solo permitir deshacer entradas manuales (sin factura ni pedido asociado)
    if (mov.factura_id || mov.pedido_id) {
      toast.error('No se puede deshacer: esta entrada está vinculada a una venta')
      return
    }

    setUndoing(mov.id)
    try {
      // 1. Buscar producto y su stock actual
      const { data: prod } = await supabase
        .from('productos')
        .select('stock')
        .eq('id', mov.producto_id)
        .single()

      const stockActual = prod?.stock || 0
      const nuevoStock = Math.max(0, stockActual - mov.cantidad)

      // 2. Actualizar stock del producto
      const { error: updErr } = await supabase
        .from('productos')
        .update({ stock: nuevoStock })
        .eq('id', mov.producto_id)
      if (updErr) throw updErr

      // 3. Eliminar el movimiento
      const { error: delErr } = await supabase
        .from('movimientos_stock')
        .delete()
        .eq('id', mov.id)
      if (delErr) throw delErr

      toast.success(`Entrada deshecha: -${mov.cantidad} unidades ✅`)
      loadData()
      if (showHistory === mov.producto_id) loadHistory(mov.producto_id)
    } catch (err: any) {
      toast.error(err.message || 'Error al deshacer entrada')
    } finally {
      setUndoing(null)
    }
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

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
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
      <div className="space-y-2">
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
                    onClick={() => loadHistory(p.id)} 
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
                <div className="mt-3 ml-7 bg-primary-50 rounded-xl p-3 max-h-48 overflow-y-auto">
                  <p className="text-xs font-semibold text-primary-600 mb-2">Historial de entradas</p>
                  {historyMovs.filter(m => m.tipo === 'entrada').length === 0 ? (
                    <p className="text-xs text-primary-400">Sin entradas registradas</p>
                  ) : (
                    historyMovs.filter(m => m.tipo === 'entrada').map(m => (
                      <div key={m.id} className="flex items-center justify-between text-xs py-1.5 border-b border-primary-100 last:border-0">
                        <span className="text-green-600 font-medium shrink-0">+ {m.cantidad}</span>
                        <span className="text-primary-500 truncate flex-1 mx-2">{m.motivo}</span>
                        <span className="text-primary-400 shrink-0">{new Date(m.created_at).toLocaleDateString('es-PE')}</span>
                        {!m.factura_id && !m.pedido_id && (
                          <button
                            onClick={() => undoEntrada(m)}
                            disabled={undoing === m.id}
                            className="ml-2 px-2 py-0.5 rounded-md bg-red-50 text-red-500 hover:bg-red-100 transition-colors text-[10px] font-medium shrink-0 disabled:opacity-50"
                            title="Deshacer entrada (corrige errores)"
                          >
                            {undoing === m.id ? '...' : 'Deshacer'}
                          </button>
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

      {/* Modal entrada de lote */}
      {showMov && movProducto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowMov(false)} />
          <div className="relative bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <button onClick={() => setShowMov(false)} className="absolute top-4 right-4 text-primary-400 hover:text-primary-600">
              <X size={20} />
            </button>
            <h2 className="font-heading text-xl font-bold text-primary-800 mb-2">
              Registrar entrada de lote
            </h2>
            <p className="text-sm text-primary-500 mb-4">{movProducto.codigo} — {movProducto.name}</p>
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
    </div>
  )
}
