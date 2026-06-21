'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Menu, X, ChevronRight, Star, Shield, Truck, Package, ShoppingCart, Plus, Minus, Trash2, Check, Store, Lock, Users, Sparkles, MessageCircle, ExternalLink, Volume2, VolumeX, MapPin, Clock, Heart } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import type { Producto } from '@/types'
import { useApp } from '@/context/AppContext'
import { MaquiMaryLogoLight } from '@/components/Logo'
import dynamic from 'next/dynamic'

const GuiaAnimada = dynamic(() => import('@/components/GuiaAnimada'), { ssr: false })
const MaryBot = dynamic(() => import('@/components/MaryBot'), { ssr: false })
const CartDrawer = dynamic(() => import('@/components/CartDrawer'), { ssr: false })

import { motion } from 'framer-motion'

const slideUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 80, damping: 18 } }
}

const slideUpSlow = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 60, damping: 20, delay: 0.15 } }
}

const staggerReveal = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } }
}

const scaleReveal = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring' as const, stiffness: 100, damping: 15 } }
}

type CartItem = { id: number; name: string; price: number; quantity: number }

function Rating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star key={star} size={14} className={star <= Math.floor(rating) ? 'fill-accent-gold text-accent-gold' : 'text-ink-300'} />
        ))}
      </div>
      <span className="font-heading font-bold text-sm text-ink-800">{rating.toFixed(1)}</span>
      <span className="text-xs text-ink-400">({count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count})</span>
    </div>
  )
}

function ContadorAnimado({ target, suffix = '', label }: { target: number; suffix?: string; label: string }) {
  const [count, setCount] = useState(0)
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const counted = useRef(false)

  useEffect(() => {
    // Reiniciar cuando el target cambia (datos cargados desde la API)
    counted.current = false
    setCount(0)
    setVisible(false)

    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !counted.current) {
        counted.current = true
        setVisible(true)
        const step = Math.ceil(target / 40)
        const t = setInterval(() => {
          setCount(prev => {
            if (prev >= target) { clearInterval(t); return target }
            return Math.min(prev + step, target)
          })
        }, 30)
      }
    }, { threshold: 0.3 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [target])

  return (
    <div ref={ref} className={`text-center transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <p className="font-display text-4xl md:text-5xl text-accent-terracotta font-bold">
        {Intl.NumberFormat('es-PE').format(count)}{suffix}
      </p>
      <p className="text-ink-500 text-sm mt-1">{label}</p>
    </div>
  )
}

function CintilloBanner({ bestseller, clientes = 0 }: { bestseller: { name: string; price: number } | null; clientes?: number }) {
  const [msgIdx, setMsgIdx] = useState(0)

  const messages = [
    { icon: '🔥', text: `Más vendido: ${bestseller?.name || 'Esponjas Maqui Mary'} — desde S/ ${bestseller?.price.toFixed(2) || '—'} 🏆` },
    { icon: '🇵🇪', text: 'Fabricación propia en Lurigancho · Sin intermediarios → precio directo de fábrica' },
    { icon: '⭐', text: clientes > 0 ? `Más de ${Intl.NumberFormat('es-PE').format(clientes)} clientes satisfechos en Lima` : 'Calidad comprobada por cientos de hogares limeños' },
    { icon: '🚚', text: 'Delivery a todos los distritos de Lima · Recojo gratis en Lurigancho' },
  ]

  useEffect(() => {
    const t = setInterval(() => setMsgIdx(i => (i + 1) % messages.length), 6000)
    return () => clearInterval(t)
  }, [messages.length])

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-accent-gold via-ink-600 to-accent-gold bg-[length:200%_100%] animate-shimmer mb-10 rounded-2xl">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-center gap-3 text-white text-sm md:text-base font-medium text-center min-h-[48px] drop-shadow-md">
        <span className="text-lg shrink-0 drop-shadow-sm">{messages[msgIdx].icon}</span>
        <span className="drop-shadow-sm">{messages[msgIdx].text}</span>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const { productos, refreshProductos } = useApp()
  const [bgMusic, setBgMusic] = useState(false)
  const [heroLoaded, setHeroLoaded] = useState(false)
  const [landingTrack, setLandingTrack] = useState('')
  const audioRef = useRef<any>(null)
  const [empresaData, setEmpresaData] = useState<{
    whatsapp_clientes: string
    direccion_display: string
    horario: string
  }>({
    whatsapp_clientes: '51916165543',
    direccion_display: 'Lurigancho, Lima',
    horario: 'Lun–Sáb: 8:00 am – 6:00 pm',
  })
  const [estadisticas, setEstadisticas] = useState({
    clientes_satisfechos: 0,
    anios_experiencia: 0,
  })

  // Cargar productos actualizados desde Supabase al montar
  useEffect(() => {
    refreshProductos()
  }, [refreshProductos])

  // Cargar configuración, empresa y animación del hero
  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(data => {
      if (data.ok) {
        const dt = data.settings.default_tracks || {}
        if (dt.landing !== undefined) setLandingTrack(dt.landing)
        if (!dt.landing) setBgMusic(false)
      }
    })
    fetch('/api/empresa').then(r => r.json()).then(data => {
      if (data.ok) {
        setEmpresaData(prev => ({
          ...prev,
          whatsapp_clientes: data.whatsapp_clientes || prev.whatsapp_clientes,
          direccion_display: data.direccion_display || prev.direccion_display,
          horario: data.horario || prev.horario,
        }))
        // Calcular años de experiencia desde fecha_constitucion
        const clientes = Number(data.clientes_satisfechos) || 0
        let anios = 0
        if (data.fecha_constitucion) {
          const fechaFundacion = new Date(data.fecha_constitucion)
          const hoy = new Date()
          anios = hoy.getFullYear() - fechaFundacion.getFullYear()
          // Si aún no llegó el aniversario de este año, restar 1
          const mesTodo = hoy.getMonth() > fechaFundacion.getMonth() ||
            (hoy.getMonth() === fechaFundacion.getMonth() && hoy.getDate() >= fechaFundacion.getDate())
          if (!mesTodo) anios -= 1
          anios = Math.max(1, anios)
        }
        setEstadisticas({ clientes_satisfechos: clientes, anios_experiencia: anios })
      }
    }).catch(() => {})
    setTimeout(() => setHeroLoaded(true), 100)
  }, [])

  // Audio: solo arranca cuando el usuario lo activa explícitamente (opt-in)
  useEffect(() => {
    if (!landingTrack || !bgMusic) return
    import('@/lib/audio').then(mod => {
      audioRef.current = mod.audio
      mod.audio.startTrack(landingTrack)
    })
    return () => { audioRef.current?.stopTrack?.() }
  }, [bgMusic, landingTrack])

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const itemsCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const featuredCandidates = ['Paquetes', 'Doble Uso', 'Paños', 'Acero']
  const featuredItemMap: Record<string, { img: string; desc: string }> = {
    Paquetes: { img: '/img/esponjas-colores.png', desc: 'Pack x10 unidades variadas' },
    'Doble Uso': { img: '/img/esponja_doble_uso_cuadrada.png', desc: 'Cara suave + cara abrasiva' },
    Paños: { img: '/img/paño_amarillo.png', desc: 'Paños absorbentes multiuso x10 y x20' },
    Acero: { img: '/img/lana_de_acero.png', desc: 'Fibra de acero para limpieza profunda' },
  }

  // Mapear productos del contexto al formato del landing
  const productosLanding: Producto[] = productos.map(p => ({
    id: Number(p.id),
    codigo: p.codigo,
    name: p.descripcion,
    descripcion: p.descripcion,
    description: p.detalle || p.descripcion,
    detalle: p.detalle,
    price: p.precioUnitario,
    precioUnitario: p.precioUnitario,
    precio_original: p.precioOriginal || null,
    precioOriginal: p.precioOriginal,
    category: p.categoria,
    categoria: p.categoria,
    color_info: p.detalle || '',
    stock: p.stock,
    is_active: p.activo,
    activo: p.activo,
    imagen: p.imagen || '',
    image: p.imagen,
    created_at: new Date().toISOString(),
  }))

  const featuredItems = featuredCandidates
    .map(cat => {
      const db = productosLanding.find(p => p.category === cat || p.categoria === cat)
      if (!db) return null
      const meta = featuredItemMap[cat] || { img: '', desc: '' }
      const precioVenta = Number(db.precioUnitario || db.price || 0)
      const precioOriginal = Number(db.precioOriginal || db.precio_original || precioVenta)
      const imagen = db.imagen || db.image || meta.img || null
      const nombre = db.name || db.descripcion || 'Producto'
      return { id: db.id, name: nombre, desc: meta.desc, img: imagen, price: precioVenta, precio_original: precioOriginal > precioVenta ? precioOriginal : null, stock: db.stock }
    })
    .filter((f): f is NonNullable<typeof f> => f !== null)

  const productImageMap: Record<string, string> = {
    'Mix x10 Esponjas Colores': '/img/esponjas-colores.png',
    'Esponja Doble Uso': '/img/esponja_doble_uso_cuadrada.png',
    'Paños Amarillos x10': '/img/paño_amarillo.png',
    'Lana de Acero': '/img/lana_de_acero.png',
    'Paño Absorbente Amarillo': '/img/paño_amarillo.png',
  }

  const bestseller = featuredItems[0] || null

  function getProductImage(p: Producto): string | null {
    const imagen = p.imagen || p.image
    if (imagen) return imagen
    return productImageMap[p.name || p.descripcion || ''] || null
  }

  const productosFiltrados = productosLanding.filter(p => (p.category || p.categoria) !== 'Colores')
  const grouped = productosFiltrados.reduce<Record<string, Producto[]>>((acc, p) => {
    const categoria = p.category || p.categoria || 'General'
    if (!acc[categoria]) acc[categoria] = []
    acc[categoria].push(p)
    return acc
  }, {})

  const totalStock = productosLanding.reduce((s, p) => s + (p.stock || 0), 0)

  function addToCart(id: number, name: string, price: number) {
    import('@/lib/audio').then(mod => mod.audio.addToCart()).catch(() => {})
    setCart(prev => {
      const exist = prev.find(i => i.id === id)
      if (exist) return prev.map(i => i.id === id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { id, name, price, quantity: 1 }]
    })
    toast.success(`${name} agregado 🛒`)
  }
  
  return (
    <div className="min-h-screen">
      {/* ===== NAVBAR ===== */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-ink-900 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-4 md:py-5 flex items-center justify-between">
          <MaquiMaryLogoLight size={42} />
          <div className="hidden md:flex items-center gap-8">
            <a href="#productos" className="text-[15px] font-medium text-ink-300 hover:text-white transition-colors duration-150">Productos</a>
            <a href="#nosotros" className="text-[15px] font-medium text-ink-300 hover:text-white transition-colors duration-150">Nosotros</a>
            <a href="#testimonios" className="text-[15px] font-medium text-ink-300 hover:text-white transition-colors duration-150">Testimonios</a>
            <a href="#contacto" className="text-[15px] font-medium text-ink-300 hover:text-white transition-colors duration-150">Contacto</a>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex items-center gap-2 text-ink-300 hover:text-white transition-colors duration-150"
              aria-label="Abrir carrito"
            >
              <ShoppingCart size={20} />
              {itemsCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-accent-terracotta text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {itemsCount}
                </span>
              )}
            </button>
            <button
              className="md:hidden text-ink-300 hover:text-white transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-ink-900 border-t border-white/10 px-6 pb-6 flex flex-col gap-1">
            <a href="#productos" onClick={() => setMenuOpen(false)} className="text-[15px] font-medium text-ink-300 hover:text-white transition-colors py-3 border-b border-white/5">Productos</a>
            <a href="#nosotros" onClick={() => setMenuOpen(false)} className="text-[15px] font-medium text-ink-300 hover:text-white transition-colors py-3 border-b border-white/5">Nosotros</a>
            <a href="#testimonios" onClick={() => setMenuOpen(false)} className="text-[15px] font-medium text-ink-300 hover:text-white transition-colors py-3 border-b border-white/5">Testimonios</a>
            <a href="#contacto" onClick={() => setMenuOpen(false)} className="text-[15px] font-medium text-ink-300 hover:text-white transition-colors py-3">Contacto</a>
          </div>
        )}
      </nav>

      {/* ===== HERO ===== */}
      <section className="min-h-screen flex items-center bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-textile-pattern opacity-30" />
        <div className="absolute inset-0 bg-noise" />
        <div className="absolute top-20 right-0 w-48 md:w-96 h-48 md:h-96 bg-accent-gold/5 rounded-full blur-3xl animate-breathe" />
        <div className="absolute bottom-20 left-0 w-40 md:w-80 h-40 md:h-80 bg-accent-terracotta/5 rounded-full blur-3xl animate-breathe" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-accent-gold/3 rounded-full blur-[120px]" />
        <div className="max-w-7xl mx-auto px-4 py-32 md:py-40 relative">
          <div className="max-w-3xl">
            <div className={`flex items-center gap-3 mb-6 transition-all duration-700 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <span className="badge-gold text-sm">🇵🇪 Empresa Peruana</span>
              {estadisticas.clientes_satisfechos > 0 && (
                <span className="inline-flex items-center gap-1 bg-white/10 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                  <Star size={14} className="fill-accent-gold text-accent-gold" />
                  +{estadisticas.clientes_satisfechos >= 1000 ? `${(estadisticas.clientes_satisfechos / 1000).toFixed(1)}k` : estadisticas.clientes_satisfechos} clientes
                </span>
              )}
            </div>
            <h1 className={`font-display text-5xl md:text-7xl font-bold leading-tight mb-6 transition-all duration-700 delay-200 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ textWrap: 'balance' } as React.CSSProperties}>
              Directo de fábrica,{' '}
              <span className="text-accent-gold">
                sin intermediarios
              </span>
              <br />
              <span className="text-2xl md:text-3xl font-light text-ink-300 font-body animate-fade-in" style={{ animationDelay: '1s', animationFillMode: 'both' }}>
                Esponjas de limpieza · Fabricamos en Lurigancho · Delivery Lima
              </span>
            </h1>
            <p className={`text-lg md:text-xl text-ink-300 mb-8 max-w-2xl leading-relaxed transition-all duration-700 delay-400 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              Somos fabricantes directos — sin bodegón de por medio. Mejor calidad, precio justo,
              y el respaldo de miles de hogares limeños que nos eligen cada semana.
            </p>
            <div className={`flex flex-wrap gap-4 transition-all duration-700 delay-600 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <a href={`https://wa.me/${empresaData.whatsapp_clientes}?text=¡Hola!%20Quiero%20comprar%20esponjas%20de%20limpieza`} target="_blank" rel="noopener noreferrer" className="btn-secondary text-lg flex items-center gap-2 group relative overflow-hidden">
                <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-bl-lg animate-pulse">HOT</span>
                <MessageCircle size={20} /> Comprar por WhatsApp{' '}
                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </a>
              <button onClick={() => document.getElementById('productos')?.scrollIntoView({ behavior: 'smooth' })} className="btn-outline !border-ink-300 !text-ink-200 hover:!bg-accent-cream hover:!text-ink-900 flex items-center gap-2">
                🛒 Ver Productos
              </button>
            </div>
            <div className={`mt-12 flex items-center gap-6 text-sm text-ink-400 transition-all duration-700 delay-800 ${heroLoaded ? 'opacity-100' : 'opacity-0'}`}>
              <span className="flex items-center gap-1.5"><Shield size={14} /> Fabricación propia</span>
              <span className="flex items-center gap-1.5"><Truck size={14} /> Delivery Lima</span>
              <span className="flex items-center gap-1.5"><Users size={14} /> +{estadisticas.clientes_satisfechos >= 1000 ? `${(estadisticas.clientes_satisfechos / 1000).toFixed(1)}k` : estadisticas.clientes_satisfechos} clientes</span>
            </div>
          </div>
        </div>
        <div className="h-2 bg-gradient-to-r from-accent-gold via-accent-terracotta to-accent-gold/50 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
      </section>

      {/* ===== CONFIANZA / CONTADORES ===== */}
      <section className="bg-ink-100 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={staggerReveal}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            <motion.div variants={slideUp}><ContadorAnimado target={estadisticas.clientes_satisfechos} suffix="+" label="Clientes satisfechos" /></motion.div>
            <motion.div variants={slideUp}><ContadorAnimado target={productosLanding.length || 0} suffix="+" label="Productos únicos" /></motion.div>
            <motion.div variants={slideUp}><ContadorAnimado target={estadisticas.anios_experiencia} suffix=" años" label="Fabricando calidad" /></motion.div>
            <motion.div variants={slideUp}><ContadorAnimado target={100} suffix="%" label="Calidad garantizada" /></motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===== PRODUCTOS ===== */}
      <section id="productos" className="py-20 bg-accent-cream">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={staggerReveal}
            className="text-center mb-16"
          >
            <motion.span variants={slideUp} className="badge-gold text-sm mb-4 inline-block">Venta al por mayor y menor</motion.span>
            <motion.h2 variants={slideUp} className="font-display text-4xl md:text-5xl font-bold text-ink-800 mb-4">
              Nuestros Productos
            </motion.h2>
            <motion.p variants={slideUp} className="text-ink-500 max-w-2xl mx-auto text-lg">
              Fabricamos esponjas para cada necesidad. Todos nuestros productos cuentan con la valoración máxima de nuestros clientes.
            </motion.p>
          </motion.div>

          {bestseller && <CintilloBanner bestseller={bestseller} clientes={estadisticas.clientes_satisfechos} />}

          {productosLanding.length === 0 && (
            <div className="text-center py-16 text-ink-400">
              <Package size={48} className="mx-auto mb-3 opacity-50" />
              <p className="font-medium text-ink-600">Próximamente más productos</p>
              <p className="text-sm mt-1">Estamos actualizando nuestro catálogo. Escríbenos a WhatsApp para consultar.</p>
            </div>
          )}

          {productosLanding.length > 0 && (
            productosLanding.length <= 8 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {productosLanding.map((f, idx) => {
                  const out = f.stock <= 0
                  const imgUrl = getProductImage(f)
                  const nombre = f.name || f.descripcion || 'Producto'
                  const categoria = f.category || f.categoria || 'General'
                  const precio = Number(f.price || f.precioUnitario || 0)
                  const precioOriginal = Number(f.precio_original || f.precioOriginal || 0)
                  const descripcion = f.description || f.detalle || ''
                  return (
                    <motion.div
                      key={f.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-40px' }}
                      transition={{ type: 'spring' as const, stiffness: 80, damping: 18, delay: idx * 0.04 }}
                      whileHover={{ y: -8, transition: { type: 'spring' as const, stiffness: 300, damping: 15 } }}
                      className="card hover:shadow-2xl transition-all duration-300 group overflow-hidden"
                    >
                      <div className="h-44 -mx-6 -mt-6 mb-4 bg-gradient-to-b from-ink-100 to-white relative overflow-hidden rounded-t-3xl">
                        {imgUrl ? (
                          <Image src={imgUrl} alt={nombre} fill className={`object-contain p-4 transition-all duration-500 ${out ? 'opacity-30' : 'group-hover:scale-110 group-hover:rotate-1'}`} sizes="(max-width: 768px) 50vw, 25vw" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-ink-200 to-ink-400 flex items-center justify-center">
                            <Package size={64} className="text-white/30" />
                          </div>
                        )}
                        {out && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="bg-accent-terracotta/90 text-white px-4 py-2 rounded-xl font-heading font-bold text-sm">Sin stock</span>
                          </div>
                        )}
                        {!out && f.stock < 20 && f.stock > 0 && (
                          <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg animate-pulse">
                            🔥 Solo {f.stock} uds — Se agota
                          </div>
                        )}
                        {!out && idx === 0 && (
                          <div className="absolute top-2 left-2 bg-accent-gold text-ink-800 text-xs font-bold px-2 py-1 rounded-lg shadow-md">
                            🏆 MÁS VENDIDO
                          </div>
                        )}
                        {!out && precioOriginal > precio && (
                          <div className="absolute bottom-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                            ⚡ OFERTA -{Math.round((1 - precio/precioOriginal) * 100)}%
                          </div>
                        )}
                      </div>
                      <h3 className="font-heading font-bold text-ink-800 text-lg mt-2">{nombre}</h3>
                      <p className="text-ink-400 text-xs mb-2">{featuredItemMap[categoria]?.desc || descripcion || ''}</p>
                      {precioOriginal > precio ? (
                        <div className="mb-4">
                          <p className="text-sm text-ink-400 line-through">S/ {precioOriginal.toFixed(2)}</p>
                          <p className="font-heading font-bold text-accent-terracotta text-xl">S/ {precio.toFixed(2)} 🔥</p>
                        </div>
                      ) : (
                        <p className="font-heading font-bold text-accent-gold text-xl mb-4">S/ {precio.toFixed(2)}</p>
                      )}
                      <button
                        onClick={() => addToCart(f.id, nombre, precio)}
                        disabled={out}
                        className="w-full btn-primary text-sm !py-2.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus size={16} /> {out ? 'Agotado' : 'Agregar al carrito'}
                      </button>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              Object.entries(grouped).map(([category, prods]) => (
                <div key={category} className="mb-10">
                  <div className="flex items-center gap-3 mb-5">
                    <h3 className="font-display font-bold text-2xl text-ink-800">{category}</h3>
                    <span className="text-ink-400 text-sm">({prods.length} productos)</span>
                    <div className="flex-1 h-px bg-ink-200" />
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {prods.map((p, idx) => {
                      const imgUrl = getProductImage(p)
                      const outOfStock = p.stock <= 0
                      const nombre = p.name || p.descripcion || 'Producto'
                      const precio = Number(p.price || p.precioUnitario || 0)
                      const precioOriginal = Number(p.precio_original || p.precioOriginal || 0)
                      const colorInfo = p.color_info || p.detalle || ''
                      return (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-40px' }}
                        transition={{ type: 'spring' as const, stiffness: 80, damping: 18, delay: idx * 0.04 }}
                        whileHover={{ y: -6, transition: { type: 'spring' as const, stiffness: 300, damping: 15 } }}
                        className="card !p-4 flex flex-col"
                      >
                        <div className="h-28 -mx-4 -mt-4 mb-3 bg-gradient-to-b from-ink-100 to-white rounded-t-2xl overflow-hidden relative">
                          {imgUrl ? (
                            <Image src={imgUrl} alt={nombre} fill className={`object-contain p-2 transition-transform duration-500 ${outOfStock ? 'opacity-30' : 'hover:scale-105'}`} sizes="(max-width: 640px) 50vw, 25vw" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-ink-200/50">
                              <Package size={32} className="text-ink-400/40" />
                            </div>
                          )}
                          {outOfStock && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="bg-accent-terracotta/90 text-white px-3 py-1 rounded-lg font-heading font-bold text-xs">Sin stock</span>
                            </div>
                          )}
                          {!outOfStock && p.stock < 20 && (
                            <div className="absolute top-1 right-1 bg-accent-terracotta text-white text-xs font-bold px-1.5 py-0.5 rounded-lg animate-pulse-soft">
                              Solo {p.stock} uds
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-heading font-semibold text-ink-800 text-sm">{nombre}</h4>
                          <p className="text-ink-500 text-xs mt-1">{colorInfo && `${colorInfo}`}</p>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-ink-100">
                          <div>
                            {precioOriginal > precio ? (
                              <div className="text-left">
                                <p className="text-xs text-ink-400 line-through">S/ {precioOriginal.toFixed(2)}</p>
                                <p className="font-heading font-bold text-accent-terracotta">S/ {precio.toFixed(2)}</p>
                              </div>
                            ) : (
                              <p className="font-heading font-bold text-accent-gold">S/ {precio.toFixed(2)}</p>
                            )}
                          </div>
                          <button
                            onClick={() => addToCart(p.id, nombre, precio)}
                            disabled={outOfStock}
                            className="bg-ink-100 hover:bg-ink-200 text-ink-700 p-2.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </motion.div>
                    )})}
                  </div>
                </div>
              ))
            )
          )}

          {/* Wholesale CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring' as const, stiffness: 80, damping: 18 }}
            className="mt-12 bg-gradient-to-r from-ink-800 to-ink-900 rounded-3xl p-8 md:p-12 text-white text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-textile-pattern opacity-10" />
            <div className="relative">
              <Store size={40} className="mx-auto mb-4 opacity-80" />
              <h3 className="font-display text-2xl md:text-3xl font-bold mb-3">¿Eres distribuidor o bodeguero?</h3>
              <p className="text-ink-300 max-w-2xl mx-auto mb-6 text-lg">
                Tenemos precios especiales para compras por mayor. Contáctanos directo y te armamos una cotización personalizada.
              </p>
              <a href={`https://wa.me/${empresaData.whatsapp_clientes}?text=¡Hola!%20Quiero%20una%20cotización%20por%20mayor`} target="_blank" rel="noopener noreferrer" className="btn-secondary text-lg inline-flex items-center gap-2">
                <MessageCircle size={20} /> Cotizar por mayor <ChevronRight size={20} />
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== CART DRAWER (lazy) ===== */}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        setCart={setCart}
        productosLanding={productosLanding}
        total={total}
        itemsCount={itemsCount}
        waNumero={empresaData.whatsapp_clientes}
      />

      {/* ===== NOSOTROS ===== */}
      <section id="nosotros" className="py-20 bg-ink-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ type: 'spring' as const, stiffness: 80, damping: 18 }}
            >
              <span className="badge-gold text-sm mb-4 inline-block">Nuestra Historia</span>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-ink-800 mb-6">
                Hecho en Perú, con <span className="text-accent-gold">orgullo</span>
              </h2>
              <p className="text-ink-600 mb-4 leading-relaxed text-lg">
                Somos una empresa peruana fabricante de esponjas de limpieza ubicada en 
                Lurigancho, Lima. Nacimos del esfuerzo y las ganas de ofrecer productos 
                de calidad a precios justos para el hogar peruano.
              </p>
              <p className="text-ink-600 mb-6 leading-relaxed">
                Hoy distribuimos a tiendas, bodegas y hogares en todo Lima. 
                Cada esponja que fabricamos lleva el compromiso de la limpieza 
                y el cuidado de tu familia.
              </p>
              <div className="flex flex-wrap gap-3">
                {[
                  { emoji: '🇵🇪', label: 'Peruanos' },
                  { emoji: '🧼', label: 'Calidad' },
                  { emoji: '💪', label: 'Esfuerzo' },
                  { emoji: '🏠', label: 'Hogar' },
                ].map((item) => (
                  <span key={item.label} className="bg-white/80 px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium text-ink-700 shadow-sm border border-ink-200/50">
                    <span className="text-xl">{item.emoji}</span>
                    {item.label}
                  </span>
                ))}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ type: 'spring' as const, stiffness: 80, damping: 18, delay: 0.15 }}
              className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 relative shadow-xl border border-ink-200/30"
            >
              <div className="absolute -top-3 -left-3 bg-accent-gold text-ink-800 px-4 py-2 rounded-xl font-heading font-bold text-sm shadow-lg">
                +{estadisticas.anios_experiencia} años de experiencia
              </div>
              <div className="space-y-5">
                {[
                  { icon: Shield, label: 'Fabricación propia', desc: 'Producimos nuestras esponjas en nuestro local en Lurigancho' },
                  { icon: Store, label: 'Venta al por mayor y menor', desc: 'Desde una unidad hasta pallets completos' },
                  { icon: Truck, label: 'Delivery en Lima', desc: 'Coordinamos la entrega en tu zona' },
                  { icon: MessageCircle, label: 'Atención personalizada', desc: 'Habla directo con nosotros por WhatsApp' },
                ].map((item) => (
                  <div key={item.label} className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent-gold/15 flex items-center justify-center shrink-0">
                      <item.icon size={18} className="text-accent-gold" />
                    </div>
                    <div>
                      <p className="font-heading font-semibold text-ink-800">{item.label}</p>
                      <p className="text-ink-500 text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIOS ===== */}
      <section id="testimonios" className="py-20 bg-accent-cream">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={staggerReveal}
            className="text-center mb-16"
          >
            <motion.h2 variants={slideUp} className="font-display text-4xl md:text-5xl font-bold text-ink-800 mb-4">
              Lo que dicen nuestros clientes
            </motion.h2>
            <motion.div variants={slideUp} className="flex items-center justify-center gap-3 mb-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={24} className="fill-accent-gold text-accent-gold" />
                ))}
              </div>
              <span className="font-display font-bold text-3xl text-ink-800">5.0</span>
            </motion.div>
            <motion.p variants={slideUp} className="text-ink-500">Valoración promedio de {estadisticas.clientes_satisfechos >= 1000 ? `${(estadisticas.clientes_satisfechos / 1000).toFixed(1)}k` : estadisticas.clientes_satisfechos} clientes satisfechos</motion.p>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={staggerReveal}
            className="grid md:grid-cols-3 gap-6"
          >
            {[
              { name: 'María G.', location: 'Los Olivos', producto: 'Esponja Doble Uso', text: 'Compra semanal segura. Las esponjas son de buena calidad y el precio justo. Llevo comprando más de un año — nunca me han fallado.' },
              { name: 'Carlos R.', location: 'Ate', producto: 'Pack x10 Colores', text: 'Distribuyo sus esponjas en mi bodega. Mis clientes las prefieren por su durabilidad y buen precio. Ventas constantes, nunca me quedan en almacén.' },
              { name: 'Rosa M.', location: 'San Juan de Lurigancho', producto: 'Doble Uso x mayor', text: 'Las doble uso son las mejores para la cocina. Compro al por mayor cada mes desde que las descubrí. El precio directo de fábrica se nota.' },
            ].map((t, idx) => (
              <motion.div key={t.name} variants={slideUp} className="card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={15} className="fill-accent-gold text-accent-gold" />
                    ))}
                  </div>
                  <span className="text-[11px] font-medium text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check size={10} /> Comprador verificado
                  </span>
                </div>
                <p className="text-ink-600 mb-4 italic leading-relaxed">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent-gold/20 flex items-center justify-center font-heading font-bold text-accent-gold text-base shrink-0">
                    {t.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-semibold text-ink-800 text-sm">{t.name}</p>
                    <p className="text-ink-500 text-xs flex items-center gap-1 truncate"><MapPin size={11} /> {t.location}</p>
                  </div>
                  <span className="text-[11px] text-ink-400 bg-ink-50 px-2 py-1 rounded-lg shrink-0">{t.producto}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== PREGUNTAS FRECUENTES ===== */}
      <section id="faq" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={staggerReveal}
            className="text-center mb-12"
          >
            <motion.h2 variants={slideUp} className="font-display text-4xl md:text-5xl font-bold text-ink-800 mb-4">
              Preguntas Frecuentes
            </motion.h2>
            <motion.p variants={slideUp} className="text-ink-500">Resolvemos tus dudas para que compres con confianza</motion.p>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={staggerReveal}
            className="space-y-4"
          >
            {[
              { q: '¿Hacen delivery a todo Lima?', a: 'Sí, hacemos delivery a todos los distritos de Lima. El costo de envío varía según la zona, desde S/ 5.00 hasta S/ 15.00. También puedes recoger en nuestro local en Lurigancho sin costo adicional.' },
              { q: '¿Cuál es el pedido mínimo?', a: 'No hay pedido mínimo. Puedes comprar desde una sola esponja. A mayor volumen, mejor precio — consulta por nuestros precios al por mayor, tenemos descuentos especiales para bodegueros y distribuidores.' },
              { q: '¿Tienen precios al por mayor?', a: '¡Sí! Tenemos precios especiales para bodegueros, distribuidores y compras por volumen. Contáctanos por WhatsApp y te enviamos la lista de precios mayoristas.' },
              { q: '¿Qué métodos de pago aceptan?', a: 'Aceptamos Yape, Plin, transferencia bancaria (BCP, BBVA, Interbank), tarjeta de crédito/débito y pago contraentrega (con recargo de S/ 5.00).' },
              { q: '¿Cuánto duran las esponjas?', a: 'Nuestras esponjas están hechas para rendir. Con uso diario mantienen su forma y poder de limpieza por mucho tiempo. La línea de acero es ideal para limpieza profunda y su durabilidad es aún mayor. Calidad que se siente en cada uso.' },
            ].map((faq, idx) => {
              const isOpen = openFaq === idx
              return (
                <motion.div key={idx} variants={slideUp} className="border border-ink-200 rounded-2xl overflow-hidden bg-white">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-ink-50 transition-colors"
                    aria-expanded={isOpen}
                  >
                    <h3 className="font-heading font-bold text-base md:text-lg text-ink-800">{faq.q}</h3>
                    <ChevronRight
                      size={18}
                      className={`shrink-0 text-accent-gold transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5">
                      <p className="text-ink-600 leading-relaxed">{faq.a}</p>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: '¿Hacen delivery a todo Lima?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Sí, hacemos delivery a todos los distritos de Lima. El costo de envío varía según la zona. Consulta el costo exacto por WhatsApp. También puedes recoger en nuestro local en Lurigancho sin costo adicional.'
              }
            },
            {
              '@type': 'Question',
              name: '¿Cuál es el pedido mínimo?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'No hay pedido mínimo. Puedes comprar desde una sola esponja. A mayor volumen, mejor precio — consulta por nuestros precios al por mayor por WhatsApp.'
              }
            },
            {
              '@type': 'Question',
              name: '¿Tienen precios al por mayor?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: '¡Sí! Tenemos precios especiales para bodegueros, distribuidores y compras por volumen. Contáctanos por WhatsApp y te enviamos la lista de precios mayoristas.'
              }
            },
            {
              '@type': 'Question',
              name: '¿Qué métodos de pago aceptan?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Aceptamos Yape, Plin, transferencia bancaria (BCP, BBVA, Interbank), tarjeta de crédito/débito y pago contraentrega. Consulta condiciones por WhatsApp.'
              }
            },
            {
              '@type': 'Question',
              name: '¿Cuánto duran las esponjas?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Nuestras esponjas están hechas para rendir. Con uso diario mantienen su forma y poder de limpieza por mucho tiempo. La línea de acero es ideal para limpieza profunda y su durabilidad es aún mayor. Calidad que se siente en cada uso.'
              }
            }
          ]
        }) }}
      />

      {/* ===== CONTACTO ===== */}
      <section id="contacto" className="py-20 bg-gradient-to-br from-ink-900 to-ink-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-textile-pattern opacity-10" />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={staggerReveal}
          className="max-w-4xl mx-auto px-4 text-center relative"
        >
          <motion.h2 variants={slideUp} className="font-display text-4xl md:text-5xl font-bold mb-6">
            ¿Quieres hacer un pedido?
          </motion.h2>
          <motion.p variants={slideUp} className="text-ink-300 text-lg mb-8 max-w-2xl mx-auto">
            Contáctanos directo por WhatsApp o pide desde nuestra web con Yape o Plin.
            Delivery a todo Lima.
          </motion.p>
          <div className="flex flex-wrap justify-center gap-4 mb-10">
            <a href="#productos" className="btn-secondary text-lg inline-flex items-center gap-2">
              <ShoppingCart size={22} /> Comprar ahora
            </a>
            <a href={`https://wa.me/${empresaData.whatsapp_clientes}?text=¡Hola!%20Quiero%20consultar%20por%20un%20pedido`} target="_blank" rel="noopener noreferrer" className="btn-outline !border-ink-300 !text-ink-200 hover:!bg-accent-cream hover:!text-ink-900 inline-flex items-center gap-2">
              <MessageCircle size={20} /> WhatsApp
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-3 px-4">
            <Image src="/img/yape_logo_blanco.png" alt="Yape" width={28} height={28} className="h-7 w-auto object-contain opacity-80" />
            <Image src="/img/plin_logo_blanco.svg" alt="Plin" width={28} height={28} className="h-7 w-auto object-contain opacity-80" />
            <Image src="/img/bcp-logo.svg" alt="BCP" width={28} height={28} className="h-7 w-auto object-contain brightness-0 invert opacity-80" />
            <Image src="/img/bbva-logo.svg" alt="BBVA" width={28} height={28} className="h-7 w-auto object-contain brightness-0 invert opacity-80" />
            <Image src="/img/interbank-logo.svg" alt="Interbank" width={28} height={28} className="h-7 w-auto object-contain brightness-0 invert opacity-80" />
          </div>
        </motion.div>
      </section>

      {/* ===== AUDIO TOGGLE ===== */}
      {landingTrack && (
        <button
          onClick={() => {
            if (bgMusic) { audioRef.current?.stopTrack?.(); setBgMusic(false) }
            else { import('@/lib/audio').then(mod => { audioRef.current = mod.audio; mod.audio.startTrack(landingTrack); setBgMusic(true) }) }
          }}
          className={`fixed bottom-24 right-6 z-40 p-3.5 rounded-full shadow-xl transition-all duration-200 hover:scale-110 active:scale-95 ${bgMusic ? 'bg-ink-700 text-accent-cream' : 'bg-ink-200 text-ink-500'}`}
          aria-label={bgMusic ? 'Silenciar música de fondo' : 'Activar música de fondo'}
          title={bgMusic ? 'Silenciar música de fondo' : 'Activar música de fondo'}
        >
          {bgMusic ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      )}

      {/* ===== MARYBOT ===== */}
      <MaryBot />

      {/* ===== FOOTER ===== */}
      <footer className="bg-ink-900 text-ink-400 py-12 border-t border-ink-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="mb-4">
                <MaquiMaryLogoLight size={56} variant="full" />
              </div>
              <p className="text-sm leading-relaxed text-ink-400">
                Fabricantes de esponjas de limpieza en Lurigancho, Lima. Calidad peruana para tu hogar. 🇵🇪
              </p>
            </div>
            <div>
              <h4 className="font-heading font-semibold text-accent-cream mb-4">Contacto</h4>
              <ul className="space-y-2 text-sm">
                <li><a href={`https://wa.me/${empresaData.whatsapp_clientes}`} target="_blank" rel="noopener noreferrer" className="hover:text-accent-gold transition-colors flex items-center gap-1.5"><MessageCircle size={14} className="text-green-500" /> WhatsApp</a></li>
                <li className="flex items-center gap-1.5"><Clock size={14} className="text-accent-gold" /> {empresaData.horario}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-heading font-semibold text-accent-cream mb-4">Paga con</h4>
              <div className="flex flex-wrap items-center gap-3">
                <Image src="/img/yape_logo_blanco.png" alt="Yape" width={28} height={28} className="h-7 w-auto object-contain opacity-70" />
                <Image src="/img/plin_logo_blanco.svg" alt="Plin" width={28} height={28} className="h-7 w-auto object-contain opacity-70" />
                <Image src="/img/bcp-logo.svg" alt="BCP" width={28} height={28} className="h-7 w-auto object-contain brightness-0 invert opacity-70" />
                <Image src="/img/bbva-logo.svg" alt="BBVA" width={28} height={28} className="h-7 w-auto object-contain brightness-0 invert opacity-70" />
                <Image src="/img/interbank-logo.svg" alt="Interbank" width={28} height={28} className="h-7 w-auto object-contain brightness-0 invert opacity-70" />
              </div>
            </div>
          </div>
          <div className="border-t border-ink-800 mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-ink-500">
            <p>&copy; {new Date().getFullYear()} Esponjas Maqui Mary Perú. Todos los derechos reservados.</p>
            <div className="flex items-center gap-4">
              {estadisticas.clientes_satisfechos > 0 && (
                <span className="flex items-center gap-1">
                  <Star size={12} className="fill-accent-gold text-accent-gold" />
                  5.0 ({estadisticas.clientes_satisfechos >= 1000 ? `${(estadisticas.clientes_satisfechos / 1000).toFixed(1)}k` : estadisticas.clientes_satisfechos})
                </span>
              )}
              <a href="/crm/login" className="flex items-center gap-1.5 hover:text-accent-gold transition-colors text-ink-400">
                <Lock size={12} /> Área de Empleados
              </a>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Guía Animada — Asistente de compra */}
      <GuiaAnimada mode="landing" />
      
      {/* Botón flotante de WhatsApp */}
      <a
        href={`https://wa.me/${empresaData.whatsapp_clientes}?text=¡Hola!%20Quiero%20hacer%20un%20pedido`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-xl"
        aria-label="Contactar por WhatsApp"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>

      {/* Schema HowTo: Cómo limpiar ollas quemadas */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: 'Cómo limpiar ollas quemadas con esponja de acero',
          description: 'Guía paso a paso para eliminar grasa quemada de ollas usando esponjas de limpieza de Maqui Mary.',
          image: 'https://maquimary.vercel.app/img/lana_de_acero.png',
          totalTime: 'PT15M',
          supply: [
            { '@type': 'HowToSupply', name: 'Lana de acero o esponja doble uso Maqui Mary' },
            { '@type': 'HowToSupply', name: 'Jabón líquido para platos' },
            { '@type': 'HowToSupply', name: 'Agua caliente' },
          ],
          tool: [
            { '@type': 'HowToTool', name: 'Olla con grasa quemada' },
          ],
          step: [
            {
              '@type': 'HowToStep',
              name: 'Remoja la olla',
              text: 'Llena la olla con agua caliente y jabón. Déjala reposar 30 minutos para ablandar la grasa carbonizada.',
              url: 'https://maquimary.vercel.app/#como-limpiar-ollas',
            },
            {
              '@type': 'HowToStep',
              name: 'Usa la esponja abrasiva',
              text: 'Toma la esponja doble uso de Maqui Mary y usa la cara abrasiva. Frota en círculos sobre la zona con grasa quemada.',
              url: 'https://maquimary.vercel.app/#como-limpiar-ollas',
            },
            {
              '@type': 'HowToStep',
              name: 'Refuerza con lana de acero',
              text: 'Para grasa muy carbonizada, usa lana de acero Maqui Mary con presión moderada. No raya el acero inoxidable.',
              url: 'https://maquimary.vercel.app/#como-limpiar-ollas',
            },
            {
              '@type': 'HowToStep',
              name: 'Enjuaga y seca',
              text: 'Lava con agua tibia y seca con un paño absorbente amarillo para evitar manchas de agua.',
              url: 'https://maquimary.vercel.app/#como-limpiar-ollas',
            },
          ],
        }) }}
      />

      {/* Schema Productos Destacados */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([
          {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'Esponjas de Colores Mix x10 - Maqui Mary',
            image: 'https://maquimary.vercel.app/img/esponjas-colores.png',
            description: 'Pack de 10 esponjas de colores variados. Suaves para limpieza general de vajilla y superficies delicadas.',
            brand: { '@type': 'Brand', name: 'Maqui Mary' },
            offers: {
              '@type': 'Offer',
              url: 'https://maquimary.vercel.app',
              priceCurrency: 'PEN',
              availability: 'https://schema.org/InStock',
              itemCondition: 'https://schema.org/NewCondition',
              seller: { '@type': 'Organization', name: 'Maqui Mary' }
            }
          },
          {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'Esponja Doble Uso - Maqui Mary',
            image: 'https://maquimary.vercel.app/img/esponja_doble_uso_cuadrada.png',
            description: 'Un lado suave para delicados, otro lado abrasivo para suciedad difícil. Perfecta para ollas y sartenes.',
            brand: { '@type': 'Brand', name: 'Maqui Mary' },
            offers: {
              '@type': 'Offer',
              url: 'https://maquimary.vercel.app',
              priceCurrency: 'PEN',
              availability: 'https://schema.org/InStock',
              itemCondition: 'https://schema.org/NewCondition',
              seller: { '@type': 'Organization', name: 'Maqui Mary' }
            }
          },
          {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'Paño Absorbente Amarillo - Maqui Mary',
            image: 'https://maquimary.vercel.app/img/paño_amarillo.png',
            description: 'Paño de microfibra super absorbente. Ideal para secar, limpiar vidrios y pulir superficies sin dejar pelusa.',
            brand: { '@type': 'Brand', name: 'Maqui Mary' },
            offers: {
              '@type': 'Offer',
              url: 'https://maquimary.vercel.app',
              priceCurrency: 'PEN',
              availability: 'https://schema.org/InStock',
              itemCondition: 'https://schema.org/NewCondition',
              seller: { '@type': 'Organization', name: 'Maqui Mary' }
            }
          }
        ]) }}
      />
    </div>
  )
}
