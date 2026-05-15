'use client'

import { useState, useEffect } from 'react'
import { ShoppingBag, Search, Check, X, AlertCircle, Smartphone, CreditCard, Eye } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

type Pedido = {
  id: number
  number: number
  cliente_nombre: string
  customer_phone: string
  total: number
  status: string
  payment_method: string
  notes: string
  payment_evidence_url: string | null
  created_at: string
}

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed'>('all')

  useEffect(() => {
    loadPedidos()
  }, [])

  async function loadPedidos() {
    const { data } = await supabase.from('facturas')
      .select('*')
      .or('origen.eq.web,payment_method.in.(yape,plin)')
      .order('created_at', { ascending: false })
    if (data) setPedidos(data)
    setLoading(false)
  }

  async function updateStatus(id: number, status: string) {
    if (status === 'confirmed') {
      // Obtener items del pedido para descontar stock
      const { data: items } = await supabase
        .from('factura_items')
        .select('*')
        .eq('factura_id', id)

      if (items && items.length > 0) {
        for (const it of items) {
          if (it.producto_id) {
            // Registrar salida
            await supabase.from('movimientos_stock').insert({
              producto_id: it.producto_id,
              tipo: 'salida',
              cantidad: it.quantity,
              motivo: `Venta web pedido #${id}`,
              pedido_id: id,
            })

            // Descontar stock
            const { data: prodData } = await supabase
              .from('productos')
              .select('stock')
              .eq('id', it.producto_id)
              .single()

            const stockActual = (prodData?.stock || 0)
            const nuevoStock = Math.max(0, stockActual - it.quantity)

            await supabase
              .from('productos')
              .update({ stock: nuevoStock })
              .eq('id', it.producto_id)
          }
        }
      }
    }

    const { error } = await supabase.from('facturas').update({ status }).eq('id', id)
    if (error) {
      toast.error('Error al actualizar')
    } else {
      setPedidos(prev => prev.map(p => p.id === id ? { ...p, status } : p))
      toast.success(status === 'confirmed' ? 'Pedido confirmado y stock actualizado' : 'Pedido cancelado')
    }
  }

  const filtered = pedidos.filter(p => {
    if (filter === 'pending' && p.status !== 'pending') return false
    if (filter === 'confirmed' && p.status !== 'confirmed') return false
    if (search && !p.cliente_nombre.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const pendingCount = pedidos.filter(p => p.status === 'pending').length

  if (loading) {
    return <div className="text-center py-16 text-primary-500"><ShoppingBag size={48} className="mx-auto mb-3 opacity-50 animate-pulse" /><p>Cargando pedidos...</p></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-primary-800">Pedidos</h1>
          <p className="text-primary-500 text-sm mt-1">
            {pedidos.length} pedidos
            {pendingCount > 0 && <span className="text-amber-500 font-semibold ml-2">({pendingCount} pendientes)</span>}
          </p>
        </div>
      </div>

      <div data-crm-section="filtros" className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-400" />
          <input type="text" placeholder="Buscar por cliente..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-12" />
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'confirmed'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f ? 'bg-primary-600 text-white' : 'bg-primary-100 text-primary-600 hover:bg-primary-200'}`}>
              {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendientes' : 'Confirmados'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-primary-400">
          <ShoppingBag size={48} className="mx-auto mb-3 opacity-50" />
          <p className="font-medium">No hay pedidos</p>
        </div>
      ) : (
        <div data-crm-section="lista-pedidos" className="space-y-4">
          {filtered.map(p => (
            <div key={p.id} className={`card !p-5 border-l-4 ${p.status === 'confirmed' ? 'border-l-green-500' : p.status === 'cancelled' ? 'border-l-red-500' : 'border-l-amber-500'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-heading font-bold text-primary-800">{p.cliente_nombre}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.status === 'pending' ? 'bg-amber-100 text-amber-700' : p.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {p.status === 'pending' ? 'Pendiente' : p.status === 'confirmed' ? 'Confirmado' : 'Cancelado'}
                    </span>
                  </div>
                  <p className="text-sm text-primary-500 mb-1">
                    <a href={`tel:${p.customer_phone}`} className="hover:text-primary-700">{p.customer_phone}</a>
                    {' | '}
                    {new Date(p.created_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex items-center gap-1 text-primary-600">
                      {p.payment_method === 'yape' ? <Smartphone size={14} /> : <CreditCard size={14} />}
                      {p.payment_method === 'yape' ? 'Yape' : 'Plin'}
                    </span>
                    <span className="font-heading font-bold text-accent-gold">S/ {Number(p.total).toFixed(2)}</span>
                  </div>
                  {(p.notes || p.payment_evidence_url) && (
                    <details className="mt-2">
                      <summary className="text-xs text-primary-500 cursor-pointer hover:text-primary-700"><Eye size={12} className="inline mr-1" />Ver detalle</summary>
                      <div className="mt-1 space-y-2">
                        {p.notes && (
                          <pre className="text-xs text-primary-600 bg-primary-50 rounded-lg p-2 whitespace-pre-wrap">{p.notes}</pre>
                        )}
                        {p.payment_evidence_url && (
                          <div>
                            <p className="text-xs text-primary-500 mb-1 font-medium">Comprobante de pago:</p>
                            <a href={p.payment_evidence_url} target="_blank" rel="noopener noreferrer">
                              <img src={p.payment_evidence_url} alt="Comprobante de pago" className="w-full max-w-xs rounded-lg border border-primary-200 hover:opacity-90 transition-opacity" />
                            </a>
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                </div>
                {p.status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => updateStatus(p.id, 'confirmed')} className="bg-green-500 text-white p-2 rounded-xl hover:bg-green-600"><Check size={18} /></button>
                    <button onClick={() => updateStatus(p.id, 'cancelled')} className="bg-red-500 text-white p-2 rounded-xl hover:bg-red-600"><X size={18} /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
