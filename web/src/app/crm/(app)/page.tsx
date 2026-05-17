'use client'

import { useState, useEffect, useCallback } from 'react'
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

type Rango = '7d' | '30d' | 'mes'

// ─── Helpers de fecha (hora Perú UTC-5) ───
function toPeruDateStr(date: Date): string {
  const peru = new Date(date.getTime() - 5 * 60 * 60 * 1000)
  return peru.toISOString().split('T')[0]
}

function buildDias(rango: Rango): { fecha: string; label: string }[] {
  const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const today = new Date()
  const todayStr = toPeruDateStr(today)

  if (rango === '7d') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - i))
      const fecha = toPeruDateStr(d)
      return { fecha, label: fecha === todayStr ? 'Hoy' : DIAS[d.getDay()] }
    })
  }
  if (rango === '30d') {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (29 - i))
      const fecha = toPeruDateStr(d)
      return { fecha, label: fecha === todayStr ? 'Hoy' : String(d.getDate()) }
    })
  }
  // mes: desde día 1 del mes actual
  const daysInMonth = today.getDate()
  return Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), i + 1)
    const fecha = toPeruDateStr(d)
    return { fecha, label: fecha === todayStr ? 'Hoy' : String(d.getDate()) }
  })
}

// ─── Formatea un valor para el eje Y ───
function fmtY(val: number, max: number): string {
  if (val === 0) return ''
  if (max < 200)  return `${val.toFixed(0)}`
  if (max < 2000) return `S/${val.toFixed(0)}`
  return `S/${(val / 1000).toFixed(1)}k`
}

// ─── Line Chart SVG ───
function LineChart({ data }: { data: VentaDia[] }) {
  const W = 520; const H = 150; const padX = 48; const padTop = 22; const padBot = 26
  const innerW = W - padX * 2
  const innerH = H - padTop - padBot

  const nonZero = data.filter(d => d.total > 0)
  const max = Math.max(...data.map(d => d.total), 1)
  const singlePoint = nonZero.length === 1

  const yTicks = [0, 0.25, 0.5, 0.75, 1]

  const pts = data.map((d, i) => ({
    x: padX + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW),
    y: padTop + innerH - (d.total / max) * innerH,
    ...d,
  }))

  // smooth bezier path
  const buildPath = (points: typeof pts) =>
    points.reduce((acc, p, i) => {
      if (i === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
      const prev = points[i - 1]
      const cpX = ((prev.x + p.x) / 2).toFixed(1)
      return `${acc} C ${cpX} ${prev.y.toFixed(1)}, ${cpX} ${p.y.toFixed(1)}, ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
    }, '')

  const pathD = pts.length > 1 ? buildPath(pts) : ''
  const areaD = pts.length > 1
    ? `${pathD} L ${pts[pts.length - 1].x.toFixed(1)} ${(padTop + innerH).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(padTop + innerH).toFixed(1)} Z`
    : ''

  // X labels: don't show all if > 14 days
  const showLabel = (i: number) => {
    if (data.length <= 14) return true
    if (i === data.length - 1) return true
    if (data.length <= 30) return i % 5 === 0
    return i % 7 === 0
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none">
      <defs>
        <linearGradient id="lgArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D97060" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#D97060" stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Grid horizontales */}
      {yTicks.map(t => {
        const y = padTop + (1 - t) * innerH
        return (
          <g key={t}>
            <line x1={padX} y1={y} x2={W - padX} y2={y}
              stroke={t === 0 ? '#d0c8be' : '#e8e2db'}
              strokeWidth={t === 0 ? 1.5 : 1}
              strokeDasharray={t > 0 ? '3 5' : '0'} />
            <text x={padX - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#b0a090">
              {fmtY(max * t, max)}
            </text>
          </g>
        )
      })}

      {/* Área degradada */}
      {areaD && <path d={areaD} fill="url(#lgArea)" />}

      {/* Línea principal */}
      {pathD && (
        <motion.path d={pathD} fill="none" stroke="#D97060" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.9, ease: 'easeOut' }} />
      )}

      {/* Puntos */}
      {pts.map((p, i) => {
        const isLast = i === pts.length - 1
        const hasVal = p.total > 0
        if (!hasVal && !singlePoint) return null

        // solo el primero con valor si hay 1 punto
        if (singlePoint && p.total === 0) return null

        return (
          <motion.g key={i} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 + i * 0.03 }}>
            {/* Halo pulsante para el punto más reciente o único */}
            {(isLast || singlePoint) && (
              <motion.circle cx={p.x} cy={p.y} r={10} fill="#D97060" opacity={0}
                animate={{ opacity: [0.15, 0, 0.15], r: [8, 14, 8] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }} />
            )}
            {/* Círculo blanco exterior */}
            <circle cx={p.x} cy={p.y} r={isLast || singlePoint ? 5.5 : 3.5}
              fill="white" stroke="#D97060" strokeWidth={2} />
            {/* Label valor */}
            {(hasVal && (isLast || singlePoint || data.length <= 10)) && (
              <text x={p.x} y={p.y - 11} textAnchor="middle" fontSize="10"
                fill="#D97060" fontWeight="700">
                {p.total >= 1000 ? `${(p.total / 1000).toFixed(1)}k` : p.total.toFixed(0)}
              </text>
            )}
          </motion.g>
        )
      })}

      {/* Eje X */}
      {pts.map((p, i) =>
        showLabel(i) ? (
          <text key={i} x={p.x} y={H - 4} textAnchor="middle"
            fontSize={data.length > 20 ? 9 : 10} fill="#b0a090">
            {p.label}
          </text>
        ) : null
      )}
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

// ─── Tabs de rango ───
function RangoTabs({ value, onChange }: { value: Rango; onChange: (r: Rango) => void }) {
  const tabs: { key: Rango; label: string }[] = [
    { key: '7d', label: '7 días' },
    { key: '30d', label: '30 días' },
    { key: 'mes', label: 'Este mes' },
  ]
  return (
    <div className="flex gap-1 bg-ink-100 rounded-xl p-1">
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${value === t.key
            ? 'bg-white text-accent-terracotta shadow-sm'
            : 'text-ink-500 hover:text-ink-700'}`}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ─── Página principal ───
export default function DashboardPage() {
  const [stats, setStats] = useState<DashStats>({
    ingresosMes: 0, ingresosMesAnterior: 0, documentosMes: 0,
    pedidosPendientes: 0, stockAlertas: 0, clientesTotal: 0,
  })
  const [rango, setRango] = useState<Rango>('7d')
  const [ventas, setVentas] = useState<VentaDia[]>([])
  const [loadingChart, setLoadingChart] = useState(true)
  const [topProductos, setTopProductos] = useState<TopProducto[]>([])
  const [pedidosRecientes, setPedidosRecientes] = useState<PedidoReciente[]>([])
  const [docsRecientes, setDocsRecientes] = useState<DocReciente[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  const loadVentasGrafico = useCallback(async (r: Rango) => {
    setLoadingChart(true)
    const dias = buildDias(r)
    const startDate = new Date(dias[0].fecha + 'T05:00:00Z') // 00:00 hora Perú = 05:00 UTC

    const { data } = await supabase.from('facturas')
      .select('total, created_at')
      .gte('created_at', startDate.toISOString())
      .or('origen.neq.web,origen.is.null')

    const byDate: Record<string, number> = {}
    ;(data || []).forEach(f => {
      const d = new Date(f.created_at)
      const key = toPeruDateStr(d)
      byDate[key] = (byDate[key] || 0) + Number(f.total || 0)
    })

    setVentas(dias.map(d => ({ fecha: d.fecha, label: d.label, total: byDate[d.fecha] || 0 })))
    setLoadingChart(false)
  }, [])

  async function loadStats() {
    const peruOffset = -5 * 60
    const now = new Date(new Date().getTime() + peruOffset * 60000)
    const inicioMes = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
    const inicioMesAnterior = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString()
    const finMesAnterior = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59)).toISOString()

    const resultados = await Promise.allSettled([
      supabase.from('facturas').select('total').gte('created_at', inicioMes).or('origen.neq.web,origen.is.null'),
      supabase.from('facturas').select('total').gte('created_at', inicioMesAnterior).lte('created_at', finMesAnterior).or('origen.neq.web,origen.is.null'),
      supabase.from('facturas').select('id', { count: 'exact' }).eq('origen', 'web').eq('status', 'pending'),
      supabase.from('productos').select('id', { count: 'exact' }).lt('stock', 20),
      supabase.from('clientes').select('id', { count: 'exact' }),
    ])

    const resMes    = resultados[0].status === 'fulfilled' ? resultados[0].value : { data: [] }
    const resMesAnt = resultados[1].status === 'fulfilled' ? resultados[1].value : { data: [] }
    const resPend   = resultados[2].status === 'fulfilled' ? resultados[2].value : { count: 0 }
    const resStock  = resultados[3].status === 'fulfilled' ? resultados[3].value : { count: 0 }
    const resCli    = resultados[4].status === 'fulfilled' ? resultados[4].value : { count: 0 }

    const ingresosMes    = (resMes.data    || []).reduce((s: number, f: any) => s + Number(f.total || 0), 0)
    const ingresosMesAnt = (resMesAnt.data || []).reduce((s: number, f: any) => s + Number(f.total || 0), 0)

    setStats({
      ingresosMes, ingresosMesAnterior: ingresosMesAnt,
      documentosMes: resMes.data?.length || 0,
      pedidosPendientes: resPend.count || 0,
      stockAlertas: resStock.count || 0,
      clientesTotal: resCli.count || 0,
    })
  }

  async function loadTopProductos() {
    const { data } = await supabase.from('factura_items')
      .select('description, quantity, total')
      .order('quantity', { ascending: false })
      .limit(200)
    if (!data) return
    const map: Record<string, { cantidad: number; total: number }> = {}
    data.forEach(it => {
      const k = it.description
      if (!map[k]) map[k] = { cantidad: 0, total: 0 }
      map[k].cantidad += Number(it.quantity || 0)
      map[k].total    += Number(it.total    || 0)
    })
    setTopProductos(
      Object.entries(map)
        .sort((a, b) => b[1].cantidad - a[1].cantidad)
        .slice(0, 5)
        .map(([descripcion, v]) => ({ descripcion, ...v }))
    )
  }

  async function loadPedidosRecientes() {
    const { data } = await supabase.from('facturas')
      .select('id, cliente_nombre, total, payment_method, created_at, status')
      .eq('origen', 'web').eq('status', 'pending')
      .order('created_at', { ascending: false }).limit(4)
    if (data) setPedidosRecientes(data)
  }

  async function loadDocsRecientes() {
    const { data } = await supabase.from('facturas')
      .select('id, series, number, cliente_nombre, total, tipo_comprobante, created_at, estado_sunat')
      .or('origen.neq.web,origen.is.null')
      .order('created_at', { ascending: false }).limit(6)
    if (data) setDocsRecientes(data)
  }

  async function loadAll() {
    setLoading(true)
    await Promise.all([
      loadStats(), loadVentasGrafico(rango),
      loadTopProductos(), loadPedidosRecientes(), loadDocsRecientes(),
    ])
    setLastUpdate(new Date())
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  // Cambio de rango solo recarga el gráfico
  useEffect(() => {
    loadVentasGrafico(rango)
  }, [rango, loadVentasGrafico])

  const ingresosTrend = stats.ingresosMesAnterior > 0
    ? Math.round(((stats.ingresosMes - stats.ingresosMesAnterior) / stats.ingresosMesAnterior) * 100)
    : 0

  const maxTop = topProductos[0]?.cantidad || 1
  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches'

  const totalGrafico = ventas.reduce((s, d) => s + d.total, 0)
  const rangoLabel = rango === '7d' ? 'últimos 7 días' : rango === '30d' ? 'últimos 30 días' : 'este mes'

  return (
    <div className="space-y-6">
      {/* Greeting banner */}
      <div className="bg-gradient-to-r from-accent-terracotta via-accent-gold to-amber-400 rounded-2xl p-6 text-white shadow-warm relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
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
            <p className="text-white/60 text-xs">
              {lastUpdate.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          titulo="Ingresos del mes" href="/crm/documentos"
          valor={`S/ ${stats.ingresosMes.toLocaleString('es-PE', { minimumFractionDigits: 0 })}`}
          sub={`vs S/ ${stats.ingresosMesAnterior.toLocaleString('es-PE', { minimumFractionDigits: 0 })} mes anterior`}
          icon={TrendingUp} color="bg-accent-terracotta/15 text-accent-terracotta" trend={ingresosTrend} />
        <StatCard
          titulo="Documentos emitidos" href="/crm/documentos"
          valor={String(stats.documentosMes)} sub="Este mes (boletas + facturas)"
          icon={FileText} color="bg-purple-100 text-purple-600" />
        <StatCard
          titulo="Pedidos pendientes" href="/crm/pedidos"
          valor={String(stats.pedidosPendientes)} sub="Yape / Plin sin confirmar"
          icon={Smartphone}
          color={stats.pedidosPendientes > 0 ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'} />
        <StatCard
          titulo="Stock bajo alerta" href="/crm/inventario"
          valor={String(stats.stockAlertas)} sub="Productos con menos de 20 uds"
          icon={AlertTriangle}
          color={stats.stockAlertas > 3 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'} />
      </div>

      {/* Fila central: gráfico + pedidos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Gráfico de ventas */}
        <div className="lg:col-span-2 bg-accent-cream rounded-2xl border border-ink-200 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="font-heading font-semibold text-ink-800">Ventas — {rangoLabel}</h2>
              <p className="text-xs text-ink-400 mt-0.5">Solo documentos SUNAT (boletas y facturas)</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-2xl font-heading font-bold text-accent-terracotta">
                S/ {totalGrafico.toLocaleString('es-PE', { minimumFractionDigits: 0 })}
              </span>
              <RangoTabs value={rango} onChange={setRango} />
            </div>
          </div>

          {loadingChart ? (
            <div className="h-40 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-accent-terracotta border-t-transparent animate-spin" />
            </div>
          ) : ventas.every(d => d.total === 0) ? (
            <div className="h-40 flex flex-col items-center justify-center text-ink-400">
              <TrendingUp className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">Sin ventas registradas en este período</p>
            </div>
          ) : (
            <LineChart data={ventas} />
          )}
        </div>

        {/* Pedidos Yape/Plin */}
        <div className="bg-accent-cream rounded-2xl border border-ink-200 p-5">
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
                  <span className="font-heading font-bold text-accent-terracotta text-sm ml-2">
                    S/ {Number(p.total).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <Link href="/crm/pedidos"
            className="flex items-center justify-center gap-2 mt-4 text-sm text-accent-terracotta hover:text-accent-terracotta/80 font-medium transition-colors">
            Ver todos los pedidos <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Fila inferior: top productos + docs recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top productos */}
        <div className="bg-accent-cream rounded-2xl border border-ink-200 p-5">
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
                      <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${i === 0 ? 'bg-accent-gold text-ink-900' : 'bg-ink-200 text-ink-600'}`}>
                        {i + 1}
                      </span>
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
          <Link href="/crm/inventario"
            className="flex items-center justify-center gap-2 mt-4 text-sm text-accent-terracotta hover:text-accent-terracotta/80 font-medium transition-colors">
            Ver inventario completo <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Documentos recientes */}
        <div className="bg-accent-cream rounded-2xl border border-ink-200 p-5">
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
                      <p className="text-xs text-ink-400">
                        {new Date(d.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <Link href="/crm/documentos"
            className="flex items-center justify-center gap-2 mt-4 text-sm text-accent-terracotta hover:text-accent-terracotta/80 font-medium transition-colors">
            Ver todos los documentos <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="bg-accent-cream rounded-2xl border border-ink-200 p-5">
        <h2 className="font-heading font-semibold text-ink-800 mb-4">Accesos rápidos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { href: '/crm/boletas/nueva',  icon: FileText,  label: 'Nueva Boleta',  color: 'bg-amber-100 text-amber-700' },
            { href: '/crm/facturas/nueva', icon: FileText,  label: 'Nueva Factura', color: 'bg-purple-100 text-purple-700' },
            { href: '/crm/guias/nueva',    icon: Send,      label: 'Nueva Guía',    color: 'bg-blue-100 text-blue-700' },
            { href: '/crm/pedidos',        icon: Smartphone,label: 'Pedidos web',   color: 'bg-amber-100 text-amber-700' },
            { href: '/crm/inventario',     icon: Boxes,     label: 'Inventario',    color: 'bg-orange-100 text-orange-700' },
            { href: '/crm/sunat',          icon: Send,      label: 'Envío SUNAT',   color: 'bg-green-100 text-green-700' },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-ink-200 hover:border-accent-terracotta/30 hover:shadow-warm transition-all group text-center">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform`}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-ink-700 group-hover:text-accent-terracotta transition-colors">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
