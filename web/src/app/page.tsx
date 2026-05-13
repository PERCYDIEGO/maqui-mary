'use client'

import { useState, useEffect, useRef } from 'react'
import { Menu, X, ChevronRight, Star, Shield, Truck, Package, ShoppingCart, Plus, Minus, Trash2, CreditCard, Smartphone, Check, TrendingUp, Store, Lock, Users, Sparkles, MessageCircle, ExternalLink, Volume2, VolumeX, MapPin, Clock, Heart } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import type { Producto } from '@/types'
import { useApp } from '@/context/AppContext'
import MaryBot from '@/components/MaryBot'
import { MaquiMaryLogoLight } from '@/components/Logo'
import { audio } from '@/lib/audio'
import dynamic from 'next/dynamic'

const GuiaAnimada = dynamic(() => import('@/components/GuiaAnimada'), { ssr: false })

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
  const ref = useRef<HTMLDivElement>(null)
  const counted = useRef(false)

  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !counted.current) {
        counted.current = true
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
    <div ref={ref} className="text-center">
      <p className="font-display text-4xl md:text-5xl text-accent-terracotta font-bold">
        {Intl.NumberFormat('es-PE').format(count)}{suffix}
      </p>
      <p className="text-ink-500 text-sm mt-1">{label}</p>
    </div>
  )
}

function CintilloBanner({ bestseller }: { bestseller: { name: string; price: number } | null }) {
  const [seconds, setSeconds] = useState(0)
  const [msgIdx, setMsgIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  const timer = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  const messages = [
    {
      icon: '🔥',
      text: mins >= 5 && mins % 5 === 0 && secs < 2
        ? `🎉 ¡${mins} minutos aquí! Llevas más tiempo del que crees — El más vendido: ${bestseller?.name || 'Nuestras esponjas'}`
        : `El más vendido: ${bestseller?.name || 'Esponjas'} — desde S/ ${bestseller?.price.toFixed(2) || '—'} 🏆`
    },
    { icon: '⏱️', text: `Llevas ${timer} explorando — ¡Calidad y precio justo te esperan!` },
    { icon: '🇵🇪', text: 'Hecho en Perú · Fabricación propia en Ate Vitarte — Calidad que tu hogar merece' },
    { icon: '⭐', text: '5.0 estrellas · Más de 12,800 clientes nos respaldan' },
    { icon: '💪', text: 'La mejor relación calidad-precio — ¡Agrega al carrito y comprueba!' },
  ]

  useEffect(() => {
    const t = setInterval(() => setMsgIdx(i => (i + 1) % messages.length), 6000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (mins >= 5 && mins % 5 === 0 && secs === 0) setMsgIdx(0)
  }, [mins, secs])

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-accent-gold via-ink-600 to-accent-gold bg-[length:200%_100%] animate-shimmer mb-10 rounded-2xl">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-center gap-3 text-white text-sm md:text-base font-medium text-center min-h-[48px] drop-shadow-md">
        <span className="text-lg shrink-0 drop-shadow-sm">{messages[msgIdx].icon}</span>
        <span className="animate-pulse-soft drop-shadow-sm">{messages[msgIdx].text}</span>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'form' | 'payment' | 'done'>('cart')
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'yape' | 'plin'>('yape')
  const [submitting, setSubmitting] = useState(false)
  const [lastOrderId, setLastOrderId] = useState<number | null>(null)
  const [paymentEvidenceUrl, setPaymentEvidenceUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const { productos } = useApp()
  const [bgMusic, setBgMusic] = useState(true)
  const [heroLoaded, setHeroLoaded] = useState(false)
  const [landingTrack, setLandingTrack] = useState('')
  const [successTrack, setSuccessTrack] = useState('')

  // Cargar configuración y animación del hero
  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(data => {
      if (data.ok) {
        const dt = data.settings.default_tracks || {}
        if (dt.landing !== undefined) setLandingTrack(dt.landing)
        if (dt.success !== undefined) setSuccessTrack(dt.success)
        if (data.settings.track_volume) audio.setTrackVolume(data.settings.track_volume)
        if (data.settings.track_volume === 0) setBgMusic(false)
        if (!dt.landing) setBgMusic(false)
      }
    })
    setTimeout(() => setHeroLoaded(true), 100)
  }, [])

  useEffect(() => {
    if (!landingTrack) return
    if (bgMusic) audio.startTrack(landingTrack)
    const handler = () => {
      if (bgMusic) audio.startTrack(landingTrack)
    }
    document.addEventListener('pointerdown', handler)
    document.addEventListener('keydown', handler)
    return () => {
      document.removeEventListener('pointerdown', handler)
      document.removeEventListener('keydown', handler)
    }
  }, [bgMusic, landingTrack])

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const itemsCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const featuredCandidates = ['Paquetes', 'Doble Uso', 'Paños', 'Acero']
  const featuredItemMap: Record<string, { img: string; desc: string }> = {
    Paquetes: { img: '/img/esponjas-colores.png', desc: 'Pack x10 unidades variadas' },
    'Doble Uso': { img: '/img/doble-uso.png', desc: 'Cara suave + cara abrasiva' },
    Paños: { img: '/img/panos-amarillos.png', desc: 'Paños absorbentes multiuso x10 y x20' },
    Acero: { img: '', desc: 'Fibra de acero para limpieza profunda' },
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
    'Esponja Doble Uso': '/img/doble-uso.png',
    'Paños Amarillos x10': '/img/panos-amarillos.png',
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
    audio.addToCart()
    setCart(prev => {
      const exist = prev.find(i => i.id === id)
      if (exist) return prev.map(i => i.id === id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { id, name, price, quantity: 1 }]
    })
    toast.success(`${name} agregado 🛒`)
  }

  function updateQty(id: number, delta: number) {
    setCart(prev => prev.map(i => {
      if (i.id !== id) return i
      const q = i.quantity + delta
      return q <= 0 ? null : { ...i, quantity: q }
    }).filter(Boolean) as CartItem[])
  }

  function removeItem(id: number) {
    audio.removeFromCart()
    setCart(prev => prev.filter(i => i.id !== id))
  }

  async function handleCheckout() {
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error('Completa tus datos')
      return
    }
    setSubmitting(true)
    try {
      const { data, error } = await supabase.from('facturas').insert({
        number: Date.now(),
        cliente_nombre: customerName.trim(),
        customer_phone: customerPhone.trim(),
        subtotal: total,
        igv: total * 0.18,
        total: total * 1.18,
        status: 'pending',
        payment_method: paymentMethod,
        notes: cart.map(i => `${i.name} x${i.quantity} = S/ ${(i.price * i.quantity).toFixed(2)}`).join('\n'),
      }).select('id').single()
      if (error) throw error
      setLastOrderId(data.id)
      setCheckoutStep('payment')
      audio.checkout()
      if (successTrack) audio.startTrack(successTrack, false)
    } catch (e: any) {
      audio.error()
      toast.error(e.message || 'Error al procesar pedido')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUploadEvidence(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !lastOrderId) return
    setUploading(true)
    try {
      const allowed = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowed.includes(file.type)) { toast.error('Solo imágenes JPG, PNG o WebP'); setUploading(false); return }
      if (file.size > 5 * 1024 * 1024) { toast.error('La imagen no debe superar 5MB'); setUploading(false); return }
      const fd = new FormData()
      fd.append('file', file)
      fd.append('facturaId', String(lastOrderId))
      const r = await fetch('/api/payment/evidence', { method: 'POST', body: fd })
      const data = await r.json()
      if (!data.ok) throw new Error(data.error || 'Error al subir')
      setPaymentEvidenceUrl(data.publicUrl)
      toast.success('Comprobante subido correctamente ✅')
    } catch (e: any) {
      toast.error(e.message || 'Error al subir el comprobante')
    } finally {
      setUploading(false)
    }
  }

  function resetCart() {
    setCart([]); setCustomerName(''); setCustomerPhone(''); setPaymentMethod('yape')
    setLastOrderId(null); setPaymentEvidenceUrl(''); setCheckoutStep('cart'); setCartOpen(false)
  }

  const checkoutProgress = checkoutStep === 'cart' ? 1 : checkoutStep === 'form' ? 2 : checkoutStep === 'payment' ? 3 : 4
  const totalSteps = 4
  
  return (
    <div className="min-h-screen">
      {/* ===== NAVBAR ===== */}
      <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${cartOpen ? 'bg-ink-800' : 'bg-ink-800/90 backdrop-blur-md'}`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <MaquiMaryLogoLight size={48} />
          <div className="hidden md:flex items-center gap-6 text-sm">
            <a href="#productos" className="text-ink-200 hover:text-accent-gold transition-colors">Productos</a>
            <a href="#nosotros" className="text-ink-200 hover:text-accent-gold transition-colors">Nosotros</a>
            <a href="#testimonios" className="text-ink-200 hover:text-accent-gold transition-colors">Testimonios</a>
            <a href="#contacto" className="text-ink-200 hover:text-accent-gold transition-colors">Contacto</a>
          </div>
          <div className="flex items-center gap-3">
            <a href="/crm/login" className="hidden md:flex items-center gap-1.5 text-sm text-ink-400 hover:text-accent-gold transition-colors mr-2 border border-ink-700 px-3 py-1.5 rounded-lg hover:border-accent-gold">
              <Lock size={14} />
              <span>Área de Empleados</span>
            </a>
            <button onClick={() => { setCartOpen(true); setCheckoutStep('cart') }} className="relative">
              <ShoppingCart size={22} className="text-ink-200 hover:text-accent-gold transition-colors" />
              {itemsCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-accent-terracotta text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center animate-scale-in">
                  {itemsCount}
                </span>
              )}
            </button>
            <button className="md:hidden text-ink-200" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-ink-800 px-4 pb-4 flex flex-col gap-3 text-ink-200">
            <a href="#productos" onClick={() => setMenuOpen(false)} className="hover:text-accent-gold transition-colors">Productos</a>
            <a href="#nosotros" onClick={() => setMenuOpen(false)} className="hover:text-accent-gold transition-colors">Nosotros</a>
            <a href="#testimonios" onClick={() => setMenuOpen(false)} className="hover:text-accent-gold transition-colors">Testimonios</a>
            <a href="#contacto" onClick={() => setMenuOpen(false)} className="hover:text-accent-gold transition-colors">Contacto</a>
            <a href="/crm/login" className="text-accent-gold border-t border-ink-700 pt-3 mt-2 flex items-center gap-2 font-medium">
              <Lock size={14} /> Área de Empleados
            </a>
          </div>
        )}
      </nav>

      {/* ===== HERO ===== */}
      <section className="min-h-screen flex items-center bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-textile-pattern opacity-30" />
        <div className="absolute inset-0 bg-noise" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-accent-gold/5 rounded-full blur-3xl animate-breathe" />
        <div className="absolute bottom-20 left-0 w-80 h-80 bg-accent-terracotta/5 rounded-full blur-3xl animate-breathe" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-gold/3 rounded-full blur-[120px]" />
        <div className="max-w-7xl mx-auto px-4 py-32 md:py-40 relative">
          <div className="max-w-3xl">
            <div className={`flex items-center gap-3 mb-6 transition-all duration-700 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <span className="badge-gold text-sm">🇵🇪 Empresa Peruana</span>
              <span className="inline-flex items-center gap-1 bg-white/10 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                <Star size={14} className="fill-accent-gold text-accent-gold" />
                5.0 (12.8k reseñas)
              </span>
            </div>
            <h1 className={`font-display text-5xl md:text-7xl font-bold leading-tight mb-6 transition-all duration-700 delay-200 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              Esponjas{' '}
              <span className="gradient-text bg-gradient-to-r from-accent-gold via-accent-terracotta to-accent-gold bg-clip-text text-transparent">
                Maqui Mary
              </span>
              <br />
              <span className="text-2xl md:text-3xl font-light text-ink-300 font-body animate-fade-in" style={{ animationDelay: '1s', animationFillMode: 'both' }}>
                Limpieza que inspira confianza
              </span>
            </h1>
            <p className={`text-lg md:text-xl text-ink-300 mb-8 max-w-2xl leading-relaxed transition-all duration-700 delay-400 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              Fabricantes y distribuidores de esponjas de limpieza en Ate Vitarte, Lima.
              Calidad que tu hogar merece, precio justo para tu bolsillo.
            </p>
            <div className={`flex flex-wrap gap-4 transition-all duration-700 delay-600 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <a href="https://wa.me/51949324254?text=¡Hola!%20Quiero%20hacer%20un%20pedido" target="_blank" rel="noopener noreferrer" className="btn-secondary text-lg flex items-center gap-2 group">
                <MessageCircle size={20} /> Cotizar por WhatsApp{' '}
                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </a>
              <button onClick={() => { setCartOpen(true); setCheckoutStep('cart') }} className="btn-outline !border-ink-300 !text-ink-200 hover:!bg-accent-cream hover:!text-ink-900">
                Comprar ahora
              </button>
            </div>
            <div className={`mt-12 flex items-center gap-6 text-sm text-ink-400 transition-all duration-700 delay-800 ${heroLoaded ? 'opacity-100' : 'opacity-0'}`}>
              <span className="flex items-center gap-1.5"><Shield size={14} /> Fabricación propia</span>
              <span className="flex items-center gap-1.5"><Truck size={14} /> Delivery Lima</span>
              <span className="flex items-center gap-1.5"><Users size={14} /> +12.8k clientes</span>
            </div>
          </div>
        </div>
        <div className="h-2 bg-gradient-to-r from-accent-gold via-accent-terracotta to-accent-gold/50 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
      </section>

      {/* ===== CONFIANZA / CONTADORES ===== */}
      <section className="bg-ink-100 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <ContadorAnimado target={12800} suffix="+" label="Clientes satisfechos" />
            <ContadorAnimado target={50} suffix="+" label="Productos fabricados" />
            <ContadorAnimado target={4} suffix=" años" label="Fabricando calidad" />
            <ContadorAnimado target={100} suffix="%" label="Calidad garantizada" />
          </div>
        </div>
      </section>

      {/* ===== PRODUCTOS ===== */}
      <section id="productos" className="py-20 bg-accent-cream">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="badge-gold text-sm mb-4 inline-block">Venta al por mayor y menor</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-ink-800 mb-4">
              Nuestros Productos
            </h2>
            <p className="text-ink-500 max-w-2xl mx-auto text-lg">
              Fabricamos esponjas para cada necesidad. Todos nuestros productos cuentan con la valoración máxima de nuestros clientes.
            </p>
          </div>

          {bestseller && <CintilloBanner bestseller={bestseller} />}

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
                    <div key={f.id} className="card hover:shadow-2xl transition-all duration-300 group overflow-hidden animate-fade-up" style={{ animationDelay: `${idx * 80}ms`, animationFillMode: 'both' }}>
                      <div className="h-44 -mx-6 -mt-6 mb-4 bg-gradient-to-b from-ink-100 to-white relative overflow-hidden rounded-t-3xl">
                        {imgUrl ? (
                          <img src={imgUrl} alt={nombre} className={`w-full h-full object-contain p-4 transition-all duration-500 ${out ? 'opacity-30' : 'group-hover:scale-110 group-hover:rotate-1'}`} />
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
                          <div className="absolute top-2 right-2 bg-accent-terracotta text-white text-xs font-bold px-2 py-1 rounded-lg animate-pulse-soft">
                            Solo {f.stock} uds
                          </div>
                        )}
                      </div>
                      <Rating rating={5.0} count={12800} />
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
                    </div>
                  )
                })}
              </div>
            ) : (
              Object.entries(grouped).map(([category, prods]) => (
                <div key={category} className="mb-10">
                  <div className="flex items-center gap-3 mb-5">
                    <h3 className="font-display font-bold text-2xl text-ink-800">{category}</h3>
                    <span className="text-ink-400 text-sm">({prods.length} productos)</span>
                    <Rating rating={5.0} count={8500} />
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
                      <div key={p.id} className="card !p-4 flex flex-col animate-fade-up" style={{ animationDelay: `${idx * 60}ms`, animationFillMode: 'both' }}>
                        <div className="h-28 -mx-4 -mt-4 mb-3 bg-gradient-to-b from-ink-100 to-white rounded-t-2xl overflow-hidden relative">
                          {imgUrl ? (
                            <img src={imgUrl} alt={nombre} className={`w-full h-full object-contain p-2 transition-transform duration-500 ${outOfStock ? 'opacity-30' : 'hover:scale-105'}`} />
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
                              uds: {p.stock}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-heading font-semibold text-ink-800 text-sm">{nombre}</h4>
                          <Rating rating={5.0} count={3200 + Math.floor(Math.random() * 5000)} />
                          <p className="text-ink-500 text-xs mt-2">{colorInfo && `${colorInfo}`}</p>
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
                      </div>
                    )})}
                  </div>
                </div>
              ))
            )
          )}

          {/* Wholesale CTA */}
          <div className="mt-12 bg-gradient-to-r from-ink-800 to-ink-900 rounded-3xl p-8 md:p-12 text-white text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-textile-pattern opacity-10" />
            <div className="relative">
              <Store size={40} className="mx-auto mb-4 opacity-80" />
              <h3 className="font-display text-2xl md:text-3xl font-bold mb-3">¿Eres distribuidor o bodeguero?</h3>
              <p className="text-ink-300 max-w-2xl mx-auto mb-6 text-lg">
                Tenemos precios especiales para compras por mayor. Contáctanos directo y te armamos una cotización personalizada.
              </p>
              <a href="https://wa.me/51949324254?text=¡Hola!%20Quiero%20una%20cotización%20por%20mayor" target="_blank" rel="noopener noreferrer" className="btn-secondary text-lg inline-flex items-center gap-2">
                <MessageCircle size={20} /> Cotizar por mayor <ChevronRight size={20} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CART DRAWER ===== */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => {
            if (cart.length > 0 && checkoutStep === 'cart') {
              toast('¿Seguro? Tus productos te esperan 🛒', { icon: '💭', duration: 3000 })
            }
            setCartOpen(false)
          }} />
          <div className="relative w-full max-w-md bg-accent-cream shadow-2xl h-full overflow-y-auto animate-fade-up">
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 border-b border-ink-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="font-display font-bold text-lg text-ink-800">
                  {checkoutStep === 'payment' ? 'Pagar' : checkoutStep === 'done' ? '¡Pedido listo!' : 'Carrito'}
                </h2>
                {checkoutStep !== 'done' && (
                  <div className="flex items-center gap-1 text-xs text-ink-400">
                    {[1, 2, 3, 4].map(s => (
                      <div key={s} className={`w-2 h-2 rounded-full ${s <= checkoutProgress ? 'bg-accent-terracotta' : 'bg-ink-200'}`} />
                    ))}
                    <span className="ml-1">Paso {checkoutProgress}/{totalSteps}</span>
                  </div>
                )}
              </div>
              <button onClick={() => setCartOpen(false)}><X size={20} className="text-ink-500 hover:text-ink-700 transition-colors" /></button>
            </div>

            {checkoutStep === 'cart' && (
              <div className="p-4" data-section="cart">
                {cart.length === 0 ? (
                  <div className="text-center py-20 text-ink-400">
                    <ShoppingCart size={48} className="mx-auto mb-3 opacity-50" />
                    <p className="font-medium text-ink-600">Tu carrito está vacío</p>
                    <p className="text-sm mt-1">Agrega productos para empezar</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 mb-6">
                      {cart.map(item => (
                        <div key={item.id} className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm border border-ink-100 animate-scale-in">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-ink-800 text-sm truncate">{item.name}</p>
                            <p className="text-accent-terracotta font-bold font-heading">S/ {(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 rounded-xl bg-ink-100 flex items-center justify-center text-ink-600 hover:bg-ink-200 transition-colors"><Minus size={14} /></button>
                            <span className="w-7 text-center font-medium text-ink-800">{item.quantity}</span>
                            <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 rounded-xl bg-ink-100 flex items-center justify-center text-ink-600 hover:bg-ink-200 transition-colors"><Plus size={14} /></button>
                          </div>
                          <button onClick={() => removeItem(item.id)} className="text-ink-400 hover:text-accent-terracotta transition-colors"><Trash2 size={16} /></button>
                        </div>
                      ))}
                    </div>

                    <div className="bg-white rounded-2xl p-4 border border-ink-100">
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-heading font-bold text-lg text-ink-800">Total</span>
                        <span className="font-display font-bold text-2xl text-accent-terracotta">S/ {total.toFixed(2)}</span>
                      </div>
                      <button onClick={() => setCheckoutStep('form')} className="w-full btn-primary py-3 flex items-center justify-center gap-2">
                        Continuar <ChevronRight size={18} />
                      </button>
                      <p className="text-xs text-ink-400 text-center mt-2">➕ IGV incluido</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {checkoutStep === 'form' && (
              <div className="p-4 space-y-4" data-section="checkout">
                <div className="bg-white rounded-2xl p-4 border border-ink-100 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1">Nombre completo</label>
                    <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Ej: María García" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1">Teléfono / WhatsApp</label>
                    <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Ej: 999 888 777" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-3">Método de pago</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setPaymentMethod('yape')} className={`p-3 rounded-2xl border-2 text-center transition-all bg-white ${paymentMethod === 'yape' ? 'border-accent-gold shadow-md ring-1 ring-accent-gold/30' : 'border-ink-200 hover:border-ink-300'}`}>
                        <img src="/medio-de-pagos/yape.png" alt="Yape" style={{ height: 80, objectFit: 'contain' }} className="mx-auto" />
                        <span className="block text-xs font-medium text-ink-600 mt-1">Yape</span>
                       </button>
                       <button onClick={() => setPaymentMethod('plin')} className={`p-3 rounded-2xl border-2 text-center transition-all bg-white ${paymentMethod === 'plin' ? 'border-blue-500 shadow-md ring-1 ring-blue-500/30' : 'border-ink-200 hover:border-ink-300'}`}>
                        <img src="/medio-de-pagos/plin.png" alt="Plin" style={{ height: 72, objectFit: 'contain' }} className="mx-auto" />
                        <span className="block text-xs font-medium text-ink-600 mt-1">Plin</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-ink-100 rounded-2xl p-4 text-sm text-ink-700">
                  <p className="font-heading font-bold mb-2">📋 Resumen del pedido:</p>
                  {cart.map(i => (
                    <p key={i.id} className="flex justify-between py-0.5"><span>{i.name} x{i.quantity}</span><span>S/ {(i.price * i.quantity).toFixed(2)}</span></p>
                  ))}
                  <div className="border-t border-ink-300 mt-2 pt-2 font-heading font-bold flex justify-between text-base">
                    <span>Total</span>
                    <span className="text-accent-terracotta">S/ {total.toFixed(2)}</span>
                  </div>
                </div>

                <button onClick={handleCheckout} disabled={submitting} className="w-full btn-primary py-3 disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? 'Procesando...' : 'Confirmar pedido'} <Heart size={18} />
                </button>
                <button onClick={() => setCheckoutStep('cart')} className="w-full text-sm text-ink-500 hover:text-ink-700 transition-colors">
                  ← Volver al carrito
                </button>
              </div>
            )}

            {checkoutStep === 'payment' && (
              <div className="p-4 text-center" data-section="checkout">
                {/* Steps visual indicator */}
                <div className="flex items-center justify-center gap-1 mb-6">
                  {[
                    { label: 'Pagar', done: true },
                    { label: 'Subir captura', done: !!paymentEvidenceUrl },
                    { label: '¡Listo!', done: !!paymentEvidenceUrl },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                        s.done ? 'bg-accent-sage text-white scale-100' : 'bg-ink-200 text-ink-500 scale-95'
                      }`}>
                        {s.done ? <Check size={14} /> : i + 1}
                      </div>
                      <span className={`text-[10px] ${s.done ? 'text-accent-sage font-medium' : 'text-ink-400'}`}>{s.label}</span>
                      {i < 2 && <div className={`w-6 h-0.5 mx-1 ${s.done ? 'bg-accent-sage' : 'bg-ink-200'}`} />}
                    </div>
                  ))}
                </div>

                {/* Title */}
                <motion.h3
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="font-display font-bold text-2xl text-ink-800 mb-1"
                >
                  {paymentEvidenceUrl ? '🎉 ¡Comprobante recibido!' : '💳 Paga con ' + (paymentMethod === 'yape' ? 'Yape' : 'Plin')}
                </motion.h3>
                <motion.p
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="text-ink-500 text-sm mb-6"
                >
                  {paymentEvidenceUrl
                    ? 'Hemos recibido tu comprobante. Te confirmaremos por WhatsApp.'
                    : `Monto: S/ ${(total * 1.18).toFixed(2)} — Sigue estos pasos:`}
                </motion.p>

                {/* QR / Payment info */}
                {!paymentEvidenceUrl && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl p-6 mb-4 border border-ink-100 shadow-md"
                  >
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <div className={`w-10 h-10 rounded-full ${paymentMethod === 'yape' ? 'bg-[#FFD100]' : 'bg-blue-600'} flex items-center justify-center font-bold text-lg`}>
                        {paymentMethod === 'yape' ? <span className="text-ink-900">Y</span> : <span className="text-white">P</span>}
                      </div>
                    </div>
                    <p className="font-heading font-bold text-xl text-ink-800 mb-1">{paymentMethod === 'yape' ? 'Yape' : 'Plin'}</p>
                    <p className="text-sm text-ink-500 mb-4">
                      Paga <strong className="text-accent-terracotta text-lg">S/ {(total * 1.18).toFixed(2)}</strong> (IGV incluido)
                    </p>
                    <div className="bg-ink-50 rounded-xl p-4 border-2 border-dashed border-ink-300">
                      {paymentMethod === 'yape' ? (
                        <>
                          <img src="/img/yape-qr.jpeg" alt="Código QR Yape" className="w-40 h-40 object-contain mx-auto" />
                          <p className="text-xs text-ink-400 text-center mt-2">1. Abre Yape · 2. Escanea este QR · 3. Confirma el pago</p>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-2 py-4">
                          <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xl text-white">P</div>
                          <p className="text-xs text-ink-400">Abre Plin · Busca Maqui Mary · Paga y captura pantalla</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Upload evidence */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.35 }}
                >
                  <div className="border-t border-ink-200 pt-4 mt-4">
                    <p className="text-xs text-ink-500 mb-3 font-medium">
                      {paymentEvidenceUrl ? '📸 Comprobante subido:' : '📸 3. Sube la captura de tu pago:'}
                    </p>
                    {!paymentEvidenceUrl ? (
                      <label className={`flex flex-col items-center justify-center border-2 border-dashed border-ink-300 rounded-2xl p-6 cursor-pointer hover:border-accent-gold hover:bg-ink-50/50 transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                        <input type="file" accept="image/*" onChange={handleUploadEvidence} className="hidden" />
                        {uploading ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-accent-gold/20 flex items-center justify-center">
                              <div className="w-5 h-5 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
                            </div>
                            <span className="text-sm text-ink-500">Subiendo comprobante...</span>
                          </div>
                        ) : (
                          <>
                            <div className="w-12 h-12 rounded-full bg-accent-gold/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                              <svg className="w-6 h-6 text-accent-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>
                            </div>
                            <span className="text-sm text-ink-600 font-medium">Toca para subir tu captura</span>
                            <span className="text-[10px] text-ink-400 mt-1">JPEG, PNG o WebP · Máx 5MB</span>
                          </>
                        )}
                      </label>
                    ) : (
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-center animate-scale-in"
                      >
                        <div className="relative inline-block">
                          <img src={paymentEvidenceUrl} alt="Comprobante" className="w-full max-w-[200px] mx-auto rounded-2xl border-2 border-accent-sage shadow-md" />
                          <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent-sage rounded-full flex items-center justify-center">
                            <Check size={16} className="text-white" />
                          </div>
                        </div>
                        <p className="text-sm text-accent-sage mt-3 font-medium">✅ Comprobante recibido correctamente</p>
                        <p className="text-[10px] text-ink-400 mt-1">Te notificaremos por WhatsApp cuando confirmemos tu pedido</p>
                        <label className="inline-block mt-3 text-xs text-ink-500 hover:text-ink-700 underline cursor-pointer px-4 py-2 rounded-xl hover:bg-ink-50 transition-colors">
                          <input type="file" accept="image/*" onChange={handleUploadEvidence} className="hidden" />
                          Re-subir comprobante
                        </label>
                      </motion.div>
                    )}
                  </div>
                </motion.div>

                {/* CTA actions */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-3 mt-6"
                >
                  {!paymentEvidenceUrl && (
                    <a
                      href={`https://wa.me/51949324254?text=${encodeURIComponent(`¡Hola! Soy ${customerName}. Acabo de pagar S/ ${(total * 1.18).toFixed(2)} por ${paymentMethod}.`)}`}
                      target="_blank"
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-green-500 text-white font-medium text-sm hover:bg-green-600 transition-all hover:shadow-lg active:scale-[0.98]"
                    >
                      <MessageCircle size={18} /> Ya pagué — avisar por WhatsApp
                    </a>
                  )}
                  <button onClick={resetCart} className={`w-full ${paymentEvidenceUrl ? 'btn-primary' : 'btn-outline'} py-3.5 flex items-center justify-center gap-2 text-sm`}>
                    {paymentEvidenceUrl ? '🛒 Seguir comprando' : '← Volver a productos'}
                  </button>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== NOSOTROS ===== */}
      <section id="nosotros" className="py-20 bg-ink-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="badge-gold text-sm mb-4 inline-block">Nuestra Historia</span>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-ink-800 mb-6">
                Hecho en Perú, con <span className="text-accent-gold">orgullo</span>
              </h2>
              <p className="text-ink-600 mb-4 leading-relaxed text-lg">
                Somos una empresa peruana fabricante de esponjas de limpieza ubicada en 
                Ate Vitarte, Lima. Nacimos del esfuerzo y las ganas de ofrecer productos 
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
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 relative shadow-xl border border-ink-200/30">
              <div className="absolute -top-3 -left-3 bg-accent-gold text-ink-800 px-4 py-2 rounded-xl font-heading font-bold text-sm shadow-lg">
                +4 años de experiencia
              </div>
              <div className="space-y-5">
                {[
                  { icon: Shield, label: 'Fabricación propia', desc: 'Producimos nuestras esponjas en nuestro local en Ate' },
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
            </div>
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIOS ===== */}
      <section id="testimonios" className="py-20 bg-accent-cream">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-ink-800 mb-4">
              Lo que dicen nuestros clientes
            </h2>
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={24} className="fill-accent-gold text-accent-gold" />
                ))}
              </div>
              <span className="font-display font-bold text-3xl text-ink-800">5.0</span>
            </div>
            <p className="text-ink-500">Valoración promedio de 12.8k clientes satisfechos</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'María G.', location: 'Los Olivos', text: 'Compra semanal segura. Las esponjas son de buena calidad y el precio justo. Llevo comprando más de un año.', purchases: 15 },
              { name: 'Carlos R.', location: 'Ate', text: 'Distribuyo sus esponjas en mi bodega. Mis clientes las prefieren por su durabilidad y buen precio. Ventas constantes.', purchases: 30 },
              { name: 'Rosa M.', location: 'San Juan de Lurigancho', text: 'Las doble uso son las mejores para la cocina. Compro al por mayor cada mes desde que las descubrí.', purchases: 12 },
            ].map((t, idx) => (
              <div key={t.name} className="card animate-fade-up" style={{ animationDelay: `${idx * 150}ms`, animationFillMode: 'both' }}>
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} className="fill-accent-gold text-accent-gold" />
                  ))}
                </div>
                <p className="text-ink-600 mb-4 italic leading-relaxed">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-accent-gold/20 flex items-center justify-center font-heading font-bold text-accent-gold text-lg">
                    {t.name[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-heading font-semibold text-ink-800">{t.name}</p>
                    <p className="text-ink-500 text-xs flex items-center gap-1"><MapPin size={12} /> {t.location}</p>
                  </div>
                  <span className="text-xs text-ink-400 bg-ink-100 px-2 py-1 rounded-full">{t.purchases} compras</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CONTACTO ===== */}
      <section id="contacto" className="py-20 bg-gradient-to-br from-ink-900 to-ink-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-textile-pattern opacity-10" />
        <div className="max-w-4xl mx-auto px-4 text-center relative">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
            ¿Quieres hacer un pedido?
          </h2>
          <p className="text-ink-300 text-lg mb-8 max-w-2xl mx-auto">
            Contáctanos directo por WhatsApp o pide desde nuestra web con Yape o Plin.
            Delivery a todo Lima.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-10">
            <a href="#productos" className="btn-secondary text-lg inline-flex items-center gap-2">
              <ShoppingCart size={22} /> Comprar ahora
            </a>
            <a href="https://wa.me/51949324254?text=¡Hola!%20Quiero%20consultar%20por%20un%20pedido" target="_blank" rel="noopener noreferrer" className="btn-outline !border-ink-300 !text-ink-200 hover:!bg-accent-cream hover:!text-ink-900 inline-flex items-center gap-2">
              <MessageCircle size={20} /> WhatsApp
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-4 px-4">
            <svg width="60" height="28" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" fill="#6B21A8"/>
              <text x="42" y="27" font-family="Arial" font-weight="bold" font-size="22" fill="white">yape</text>
            </svg>
            <svg width="60" height="28" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" fill="#00B4D8"/>
              <text x="42" y="27" font-family="Arial" font-weight="bold" font-size="22" fill="white">plin</text>
            </svg>
            <img src="/img/bcp-logo.svg" alt="BCP" className="h-7 w-auto object-contain brightness-0 invert opacity-80" />
            <img src="/img/bbva-logo.svg" alt="BBVA" className="h-7 w-auto object-contain brightness-0 invert opacity-80" />
            <img src="/img/interbank-logo.svg" alt="Interbank" className="h-7 w-auto object-contain brightness-0 invert opacity-80" />
          </div>
        </div>
      </section>

      {/* ===== AUDIO TOGGLE ===== */}
      {landingTrack && (
        <button
          onClick={() => {
            if (bgMusic) { audio.stopTrack(); setBgMusic(false) }
            else { audio.startTrack(landingTrack); setBgMusic(true) }
          }}
          className={`fixed bottom-6 left-20 z-40 p-3.5 rounded-full shadow-xl transition-all duration-200 hover:scale-110 active:scale-95 ${bgMusic ? 'bg-ink-700 text-accent-cream' : 'bg-ink-200 text-ink-500'}`}
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
                Fabricantes de esponjas de limpieza en Ate Vitarte, Lima. Calidad peruana para tu hogar. 🇵🇪
              </p>
            </div>
            <div>
              <h4 className="font-heading font-semibold text-accent-cream mb-4">Contacto</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-1.5"><MapPin size={14} className="text-accent-gold" /> Ate Vitarte, Lima</li>
                <li><a href="https://wa.me/51949324254" target="_blank" rel="noopener noreferrer" className="hover:text-accent-gold transition-colors flex items-center gap-1.5"><MessageCircle size={14} className="text-green-500" /> WhatsApp: 949 324 254</a></li>
                <li className="flex items-center gap-1.5"><Clock size={14} className="text-accent-gold" /> Lun–Sáb: 8:00 am – 6:00 pm</li>
              </ul>
            </div>
            <div>
              <h4 className="font-heading font-semibold text-accent-cream mb-4">Paga con</h4>
              <div className="flex flex-wrap items-center gap-4">
                <svg width="60" height="28" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="18" fill="#6B21A8"/>
                  <text x="42" y="27" font-family="Arial" font-weight="bold" font-size="22" fill="white">yape</text>
                </svg>
                <svg width="60" height="28" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="18" fill="#00B4D8"/>
                  <text x="42" y="27" font-family="Arial" font-weight="bold" font-size="22" fill="white">plin</text>
                </svg>
                <img src="/img/bcp-logo.svg" alt="BCP" className="h-7 w-auto object-contain brightness-0 invert opacity-70" />
                <img src="/img/bbva-logo.svg" alt="BBVA" className="h-7 w-auto object-contain brightness-0 invert opacity-70" />
                <img src="/img/interbank-logo.svg" alt="Interbank" className="h-7 w-auto object-contain brightness-0 invert opacity-70" />
              </div>
            </div>
          </div>
          <div className="border-t border-ink-800 mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-ink-500">
            <p>&copy; {new Date().getFullYear()} Esponjas Maqui Mary Perú. Todos los derechos reservados.</p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Star size={12} className="fill-accent-gold text-accent-gold" />
                5.0 (12.8k)
              </span>
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
        href="https://wa.me/51949324254?text=¡Hola!%20Quiero%20hacer%20un%20pedido"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-xl"
        aria-label="Contactar por WhatsApp"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>
    </div>
  )
}
