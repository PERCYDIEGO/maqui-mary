'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  TrendingUp, Users, ShoppingBag, AlertTriangle,
  FileText, Package, ArrowRight, Clock, CheckCircle,
  Smartphone, Send, Boxes, Star, ChevronRight, RefreshCw
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─── Tipos ───
interface DashStats {
  ingresosMes: number
  ingresosMesAnterior: number
  documentosMes: number
  pedidosPendientes: number
  stockAlertas: number
  clientesTotal: number
}

interface VentaDia { fecha: string; total: number; label: string }
interface TopProducto { descripcion: string; cantidad: number; total: number }
interface PedidoReciente { id: number; cliente_nombre: string; total: number; payment_method: string; created_at: string; status: string }
interface DocReciente { id: number; series: string; number: number; cliente_nombre: string; total: number; tipo_comprobante: string; created_at: string; estado_sunat: string }

// ─── Mini bar chart SVG ───
function BarChart({ data }: { data: VentaDia[] }) {
  const max = Math.max(...data.map(d => d.total), 1)
  const W = 480; const H = 120; const pad = 36; const barW = 36; const gap = (W - pad * 2 - barW * data.length) / (data.length - 1 || 1)

  return (
    <svg viewBox={`0 0 ${W} ${H + 30}`} className="w-full h-auto">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = pad + (1 - t) * H
        return (
          <g key={t}>
            <line x1={pad} y1={y} x2={W - pad} y2={y} stroke="#e5e0d8" strokeWidth="1" strokeDasharray="4 4" />
            {t > 0 && (
              <text x={pad - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#9c8b7a">
                S/{(max * t / 1000).toFixed(0)}k
              </text>
            )}
          </g>
        )
      })}
      {/* Bars */}
      {data.map((d, i) => {
        const x = pad + i * (barW + gap)
        const barH = Math.max(4, (d.total / max) * H)
        const y = pad + H - barH
        const isToday = i === data.length - 1
        return (
          <g key={i}>
            <motion.rect
              x={x} y={H + pad} width={barW} height={0} rx="6"
              fill={isToday ? '#D97060' : '#C8A97E'} opacity={isToday ? 1 : 0.7}
              animate={{ y, height: barH }} transition={{ delay: i * 0.06, duration: 0.5, ease: 'easeOut' }}
            />
            {d.total > 0 && (
              <motion.text
                x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="10" fill={isToday ? '#D97060' : '#9c8b7a'} fontWeight="bold"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 + 0.4 }}
              >
                {d.total >= 1000 ? `${(d.total / 1000).toFixed(1)}k` : d.total.toFixed(0)}
              </motion.text>
            )}
            <text x={x + barW / 2} y={H + pad + 16} textAnchor="middle" fontSize="10" fill="#9c8b7a">{d.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Mini horizontal bar ───
function HBar({ pct, color = '#C8A97E' }: { pct: number; color?: string }) {
  return (
    <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
      <motion.div className="h-full rounded-full" style={{ backgroundColor: color }}
        initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
    </div>
  )
}

// ─── Stat Card ───
function StatCard({ titulo, valor, sub, icon: Icon, href, color, trend }: {
  titulo: string; valor: string; sub: string; icon: React.ElementType
  href: string; color: string; trend?: number
}) {
  return (
    <Link href={href}>
      <motion.div whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
        className="bg-accent-cream rounded-2xl p-5 border border-ink-200 transition-all cursor-pointer">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          {trend !== undefined && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${trend >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
        </div>
        <p className="text-2xl font-heading font-bold text-ink-800">{valor}</p>
        <p className="text-sm font-medium text-ink-700 mt-0.5">{titulo}</p>
        <p className="text-xs text-ink-400 mt-1">{sub}</p>
      </motion.div>
    </Link>
  )
}

// ─── Página principal ───
export default function DashboardPage() {
  const [stats, setStats] = useState<DashStats>({ ingresosMes: 0, ingresosMesAnterior: 0, documentosMes: 0, pedidosPendientes: 0, stockAlertas: 0, clientesTotal: 0 })
  const [ventas7d, setVentas7d] = useState<VentaDia[]>([])
  const [topProductos, setTopProductos] = useState<TopProducto[]>([])
  const [pedidosRecientes, setPedidosRecientes] = useState<PedidoReciente[]>([])
  const [docsRecientes, setDocsRecientes] = useState<DocReciente[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    await Promise.all([loadStats(), loadVentas7d(), loadTopProductos(), loadPedidosRecientes(), loadDocsRecientes()])
    setLastUpdate(new Date())
    setLoading(false)
  }

  async function loadStats() {
    const now = new Date()
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const inicioMesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const finMesAnterior = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()

    const [resMes, resMesAnt, resPendientes, resStock, resClientes] = await Promise.all([
      supabase.from('facturas').select('total, tipo_comprobante').gte('created_at', inicioMes).or('origen.neq.web,origen.is.null'),
      supabase.from('facturas').select('total').gte('created_at', inicioMesAnterior).lte('created_at', finMesAnterior).or('origen.neq.web,origen.is.null'),
      supabase.from('facturas').select('id', { count: 'exact' }).eq('status', 'pending').or('origen.eq.web,payment_method.in.(yape,plin)'),
      supabase.from('productos').select('id', { count: 'exact' }).lt('stock', 20),
      supabase.from('clientes').select('id', { count: 'exact' }),
    ])

    const ingresosMes = (resMes.data || []).reduce((s, f) => s + Number(f.total || 0), 0)
    const ingresosMesAnt = (resMesAnt.data || []).reduce((s, f) => s + Number(f.total || 0), 0)
    const trend = ingresosMesAnt > 0 ? Math.round(((ingresosMes - ingresosMesAnt) / ingresosMesAnt) * 100) : 0

    setStats({
      ingresosMes,
      ingresosMesAnterior: ingresosMesAnt,
      documentosMes: resMes.data?.length || 0,
      pedidosPendientes: resPendientes.count || 0,
      stockAlertas: resStock.count || 0,
      clientesTotal: resClientes.count || 0,
    })
  }

  async function loadVentas7d() {
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const today = new Date()
    const dias = await Promise.all(
      Array.from({ length: 7 }, (_, idx) => {
        const daysAgo = 6 - idx
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysAgo)
        const inicio = d.toISOString()
        const fin = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).toISOString()
        const label = daysAgo === 0 ? 'Hoy' : diasSemana[d.getDay()]
        return supabase.from('facturas')
          .select('total')
          .gte('created_at', inicio)
          .lte('created_at', fin)
          .or('origen.neq.web,origen.is.null')
          .then(({ data }) => ({
            fecha: inicio,
            total: (data || []).reduce((s, f) => s + Number(f.total || 0), 0),
            label
          }))
      })
    )
    setVentas7d(dias)
  }

  async function loadTopProductos() {
    const { data } = await supabase.from('factura_items').select('description, quantity, total').order('quantity', { ascending: false }).limit(200)
    if (!data) return
    const map: Record<string, { cantidad: number; total: number }> = {}
    data.forEach(it => {
      const k = it.description
      if (!map[k]) map[k] = { cantidad: 0, total: 0 }
      map[k].cantidad += Number(it.quantity || 0)
      map[k].total += Number(it.total || 0)
    })
    const sorted = Object.entries(map).sort((a, b) => b[1].cantidad - a[1].cantidad).slice(0, 5)
    setTopProductos(sorted.map(([descripcion, v]) => ({ descripcion, ...v })))
  }

  async function loadPedidosRecientes() {
    const { data } = await supabase.from('facturas').select('id, cliente_nombre, total, payment_method, created_at, status')
      .or('origen.eq.web,payment_method.in.(yape,plin)').eq('status', 'pending').order('created_at', { ascending: false }).limit(4)
    if (data) setPedidosRecientes(data)
  }

  async function loadDocsRecientes() {
    const { data } = await supabase.from('facturas').select('id, series, number, cliente_nombre, total, tipo_comprobante, created_at, estado_sunat')
      .or('origen.neq.web,origen.is.null').order('created_at', { ascending: false }).limit(6)
    if (data) setDocsRecientes(data)
  }

  const ingresosTrend = stats.ingresosMesAnterior > 0
    ? Math.round(((stats.ingresosMes - stats.ingresosMesAnterior) / stats.ingresosMesAnterior) * 100)
    : 0

  const maxTop = topProductos[0]?.cantidad || 1
  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="space-y-6">
      {/* Greeting banner */}
      <div className="bg-gradient-to-r from-accent-terracotta via-accent-gold to-amber-400 rounded-2xl p-6 text-white shadow-warm relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm mb-1">{saludo} 👋</p>
            <h1 className="text-2xl font-heading font-bold mb-1">Maqui Mary — Panel de Control</h1>
            <p className="text-white/80 text-sm">
              {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-2">
            <button onClick={loadAll} disabled={loading}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl text-sm transition-all">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
            </button>
            <p className="text-white/60 text-xs">Actualizado: {lastUpdate.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div data-crm-section="stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard titulo="Ingresos del mes" valor={`S/ ${stats.ingresosMes.toLocaleString('es-PE', { minimumFractionDigits: 0 })}`}
          sub={`vs S/ ${stats.ingresosMesAnterior.toLocaleString('es-PE', { minimumFractionDigits: 0 })} mes anterior`}
          icon={TrendingUp} href="/crm/documentos" color="bg-accent-terracotta/15 text-accent-terracotta" trend={ingresosTrend} />
        <StatCard titulo="Documentos emitidos" valor={String(stats.documentosMes)}
          sub="Este mes (boletas + facturas)"
          icon={FileText} href="/crm/documentos" color="bg-purple-100 text-purple-600" />
        <StatCard titulo="Pedidos pendientes" valor={String(stats.pedidosPendientes)}
          sub="Yape / Plin sin confirmar"
          icon={Smartphone} href="/crm/pedidos" color={stats.pedidosPendientes > 0 ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}
          trend={undefined} />
        <StatCard titulo="Stock bajo alerta" valor={String(stats.stockAlertas)}
          sub="Productos con menos de 20 uds"
          icon={AlertTriangle} href="/crm/inventario" color={stats.stockAlertas > 3 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'} />
      </div>

      {/* Fila central: gráfico + pedidos pendientes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Ventas 7 días */}
        <div data-crm-section="chart" className="lg:col-span-2 bg-accent-cream rounded-2xl border border-ink-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-heading font-semibold text-ink-800">Ventas últimos 7 días</h2>
              <p className="text-xs text-ink-400 mt-0.5">Solo documentos SUNAT (boletas y facturas)</p>
            </div>
            <span className="text-2xl font-heading font-bold text-accent-terracotta">
              S/ {ventas7d.reduce((s, d) => s + d.total, 0).toLocaleString('es-PE', { minimumFractionDigits: 0 })}
            </span>
          </div>
          {loading ? (
            <div className="h-36 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-accent-terracotta border-t-transparent animate-spin" />
            </div>
          ) : ventas7d.every(d => d.total === 0) ? (
            <div className="h-36 flex flex-col items-center justify-center text-ink-400">
              <TrendingUp className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">Sin ventas registradas esta semana</p>
            </div>
          ) : (
            <BarChart data={ventas7d} />
          )}
        </div>

        {/* Pedidos Yape/Plin pendientes */}
        <div data-crm-section="pedidos-web" className="bg-accent-cream rounded-2xl border border-ink-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold text-ink-800">Pedidos web</h2>
            {stats.pedidosPendientes > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                {stats.pedidosPendientes} pendientes
              </span>
            )}
          </div>
          {pedidosRecientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-ink-400">
              <CheckCircle className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">Sin pedidos pendientes</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pedidosRecientes.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-800 truncate">{p.cliente_nombre}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Smartphone className="w-3 h-3 text-ink-400" />
                      <span className="text-xs text-ink-500 capitalize">{p.payment_method}</span>
                      <span className="text-xs text-ink-400">·</span>
                      <Clock className="w-3 h-3 text-ink-400" />
                      <span className="text-xs text-ink-400">
                        {new Date(p.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <span className="font-heading font-bold text-accent-terracotta text-sm ml-2">S/ {Number(p.total).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
          <Link href="/crm/pedidos" className="flex items-center justify-center gap-2 mt-4 text-sm text-accent-terracotta hover:text-accent-terracotta/80 font-medium transition-colors">
            Ver todos los pedidos <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Fila inferior: top productos + docs recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top productos */}
        <div data-crm-section="top-productos" className="bg-accent-cream rounded-2xl border border-ink-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold text-ink-800">Productos más vendidos</h2>
            <Star className="w-4 h-4 text-accent-gold" />
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-10 bg-ink-100 rounded-xl animate-pulse" />)}
            </div>
          ) : topProductos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-28 text-ink-400">
              <Package className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">Sin datos de ventas aún</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topProductos.map((p, i) => (
                <div key={p.descripcion}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${i === 0 ? 'bg-accent-gold text-ink-900' : 'bg-ink-200 text-ink-600'}`}>{i + 1}</span>
                      <span className="text-sm text-ink-700 truncate">{p.descripcion}</span>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="text-xs font-bold text-ink-800">{p.cantidad} uds</span>
                      <span className="text-xs text-ink-400 ml-1">· S/ {p.total.toFixed(0)}</span>
                    </div>
                  </div>
                  <HBar pct={(p.cantidad / maxTop) * 100} color={i === 0 ? '#D97060' : '#C8A97E'} />
                </div>
              ))}
            </div>
          )}
          <Link href="/crm/inventario" className="flex items-center justify-center gap-2 mt-4 text-sm text-accent-terracotta hover:text-accent-terracotta/80 font-medium transition-colors">
            Ver inventario completo <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Documentos recientes */}
        <div data-crm-section="docs-recientes" className="bg-accent-cream rounded-2xl border border-ink-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold text-ink-800">Documentos recientes</h2>
            <Send className="w-4 h-4 text-ink-400" />
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-14 bg-ink-100 rounded-xl animate-pulse" />)}
            </div>
          ) : docsRecientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-28 text-ink-400">
              <FileText className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">Sin documentos emitidos aún</p>
            </div>
          ) : (
            <div className="space-y-2">
              {docsRecientes.map(d => {
                const tipo = d.tipo_comprobante === '01' ? 'Factura' : d.tipo_comprobante === '03' ? 'Boleta' : 'Doc'
                const colorTipo = d.tipo_comprobante === '01' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'
                const estadoColor = d.estado_sunat === 'ACEPTADO' ? 'text-green-600' : d.estado_sunat === 'RECHAZADO' ? 'text-red-500' : 'text-ink-400'
                return (
                  <div key={d.id} className="flex items-center justify-between p-3 bg-ink-50 rounded-xl border border-ink-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${colorTipo}`}>{tipo}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-800 truncate">{d.cliente_nombre || 'Cliente'}</p>
                        <p className={`text-xs ${estadoColor}`}>{d.estado_sunat || 'PENDIENTE'}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-sm font-bold text-ink-800">S/ {Number(d.total).toFixed(2)}</p>
                      <p className="text-xs text-ink-400">{new Date(d.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <Link href="/crm/documentos" className="flex items-center justify-center gap-2 mt-4 text-sm text-accent-terracotta hover:text-accent-terracotta/80 font-medium transition-colors">
            Ver todos los documentos <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div data-crm-section="accesos-rapidos" className="bg-accent-cream rounded-2xl border border-ink-200 p-5">
        <h2 className="font-heading font-semibold text-ink-800 mb-4">Accesos rápidos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { href: '/crm/boletas/nueva', icon: FileText, label: 'Nueva Boleta', color: 'bg-amber-100 text-amber-700' },
            { href: '/crm/facturas/nueva', icon: FileText, label: 'Nueva Factura', color: 'bg-purple-100 text-purple-700' },
            { href: '/crm/guias/nueva', icon: Send, label: 'Nueva Guía', color: 'bg-blue-100 text-blue-700' },
            { href: '/crm/pedidos', icon: Smartphone, label: 'Pedidos web', color: 'bg-amber-100 text-amber-700' },
            { href: '/crm/inventario', icon: Boxes, label: 'Inventario', color: 'bg-orange-100 text-orange-700' },
            { href: '/crm/sunat', icon: Send, label: 'Envío SUNAT', color: 'bg-green-100 text-green-700' },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-ink-200 hover:border-accent-terracotta/30 hover:shadow-warm transition-all group text-center">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform`}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-ink-700 group-hover:text-accent-terracotta transition-colors">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
