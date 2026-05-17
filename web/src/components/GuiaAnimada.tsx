'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, ChevronLeft, ShoppingCart, Sparkles } from 'lucide-react'

type Mood = 'wave' | 'point' | 'celebrate' | 'think' | 'warn'
type SectionKey = 'hero' | 'productos' | 'nosotros' | 'testimonios' | 'contacto' | 'footer' | 'cart' | 'checkout'

interface Tip {
  icon: string; title: string; message: string; mood: Mood
}

const MESSAGES_POOL: Record<SectionKey, Tip[]> = {
  hero: [
    { icon: '👋', title: '¡Bienvenido a Maqui Mary! 🧽', message: 'Somos fabricantes peruanos de esponjas en Ate Vitarte. Calidad de fábrica, precio justo. Desliza para ver productos o toca "Comprar ahora" 🚀', mood: 'wave' },
    { icon: '🇵🇪', title: 'Hecho en Perú, con orgullo', message: 'Fabricamos todo aquí en Lima. Sin intermediarios = mejores precios para ti. ¿Sabías que ya somos más de 12,800 clientes? ⭐', mood: 'celebrate' },
    { icon: '💡', title: '¿Primera vez por aquí?', message: 'Agrega productos al carrito, paga con Yape o Plin, y sube tu comprobante. ¡Así de fácil! O si prefieres, pregúntanos por WhatsApp.', mood: 'point' },
  ],
  productos: [
    { icon: '🧼', title: 'Elige tus esponjas favoritas', message: 'Toca el "+" del producto. Tenemos colores, acero, doble uso y paquetes. ¿Vendes en bodega? Pregunta por precio al por mayor 💪', mood: 'point' },
    { icon: '🔥', title: 'Los más vendidos del mes', message: 'Nuestros clientes prefieren el Mix x10 Colores y la Esponja Doble Uso. ¿Ya los viste? ¡Están volando!', mood: 'celebrate' },
    { icon: '💰', title: '¿Muchas unidades?', message: 'Entre más compras, más ahorras. ¿Eres distribuidor? Tenemos precios especiales por volumen. Consulta por WhatsApp.', mood: 'think' },
  ],
  nosotros: [
    { icon: '🏭', title: 'Fabricación propia en Ate', message: 'Producimos nuestras esponjas en nuestro local. Calidad controlada, precios directos de fábrica. Sin terceros ni sobrecostos.', mood: 'think' },
    { icon: '🤝', title: '¿Quieres ser distribuidor?', message: 'Tenemos precios especiales para bodegas, tiendas y distribuidores. Delivery en Lima. Cotiza al toque por WhatsApp.', mood: 'point' },
  ],
  testimonios: [
    { icon: '⭐', title: '12,800+ clientes felices', message: 'María G. de Los Olivos: "Compro cada mes, calidad y precio justo". ¿Aún no pruebas nuestras esponjas? ¡Agrega una al carrito!', mood: 'celebrate' },
    { icon: '🗣️', title: 'Lo que dicen de nosotros', message: 'Carlos R. de Ate: "Las vendo en mi bodega, mis clientes las prefieren". Únete a los que ya confían en Maqui Mary.', mood: 'wave' },
  ],
  contacto: [
    { icon: '🛒', title: '¡Estás a 2 clics de comprar!', message: 'Agrega productos al carrito, paga con Yape/Plin y sube tu captura. ¿Dudas? Escríbenos al WhatsApp, te respondemos al instante.', mood: 'point' },
    { icon: '📱', title: 'Paga como quieras', message: 'Aceptamos Yape, Plin y transferencia bancaria. ¿No tienes esas apps? También puedes pagar contraentrega en Lima.', mood: 'wave' },
  ],
  footer: [
    { icon: '🧽', title: '¿Aún con dudas?', message: 'No hay problema. Escríbenos al 949 324 254 y te enviamos fotos reales, precios y opciones de envío. Atendemos de lun-sáb 8am-6pm.', mood: 'wave' },
    { icon: '🎯', title: 'Tu opinión nos importa', message: '¿Ya compraste? Déjanos tu reseña. ¿Aún no? ¿Qué esperas? Calidad peruana al mejor precio. ¡Te esperamos!', mood: 'celebrate' },
  ],
  cart: [
    { icon: '🛒', title: 'Revisa tu carrito', message: '¿Todo listo? Toca "Continuar", completa tus datos y elige Yape o Plin para pagar. Fácil, rápido y seguro.', mood: 'celebrate' },
    { icon: '⚡', title: '¿Falta algo?', message: 'Revisa bien las cantidades. Entre más compras, más ahorras. ¿Necesitas ayuda? Puedes hablar con un asesor.', mood: 'point' },
  ],
  checkout: [
    { icon: '💳', title: 'Momento de pagar', message: '1) Abre Yape o Plin 2) Escanea el QR o busca Maqui Mary 3) Paga el monto exacto 4) Sube la captura aquí. ¡En minutos te confirmamos!', mood: 'point' },
    { icon: '✅', title: 'No olvides subir tu comprobante', message: 'Después de pagar, sube la captura de pantalla. Así podemos confirmar tu pedido al instante. ¿Ya pagaste? ¡Sube tu foto! 📸', mood: 'warn' },
  ],
}

function getTipForSection(section: SectionKey): Tip {
  const pool = MESSAGES_POOL[section] || MESSAGES_POOL.hero
  const day = new Date().getDate()
  const hour = new Date().getHours()
  const idx = (day + hour + section.length) % pool.length
  return pool[idx] || pool[0]
}

const SECTIONS: { id: SectionKey; selector: string }[] = [
  { id: 'hero', selector: 'section:first-of-type' },
  { id: 'productos', selector: '#productos' },
  { id: 'nosotros', selector: '#nosotros' },
  { id: 'testimonios', selector: '#testimonios' },
  { id: 'contacto', selector: '#contacto' },
  { id: 'footer', selector: 'footer' },
  { id: 'cart', selector: '[data-section="cart"], .cart-panel, #cart' },
  { id: 'checkout', selector: '[data-section="checkout"], .checkout-panel, #checkout' },
]

interface CrmStep { icon: string; title: string; message: string; mood: Mood; sectionId?: string }
interface GuiaAnimadaProps {
  mode: 'landing' | 'crm'
  crmSteps?: CrmStep[]
  userId?: string
  hideMinimized?: boolean
}

let particleId = 0

export default function GuiaAnimada({ mode, crmSteps, userId, hideMinimized }: GuiaAnimadaProps) {
  const isLanding = mode === 'landing'
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(true)
  const [seen, setSeen] = useState(false)
  const [currentSection, setCurrentSection] = useState<SectionKey>('hero')
  const [stepIdx, setStepIdx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [posY, setPosY] = useState(-999)
  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([])
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const dragStart = useRef({ y: 0, py: 0 })
  const elRef = useRef<HTMLDivElement>(null)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef(currentSection)
  sectionRef.current = currentSection
  const seenRef = useRef(seen)
  seenRef.current = seen
  const crmStepsRef = useRef(crmSteps)
  crmStepsRef.current = crmSteps
  const storageKeyRef = useRef('')
  const activeCrmSectionRef = useRef<string | null>(null)

  const storageKey = useMemo(() => {
    if (isLanding) return 'mm_guia_landing_v2'
    const safePath = (pathname || '').replace(/\//g, '_') || 'unknown'
    return `mm_guia_crm_${userId || 'anon'}_${safePath}`
  }, [isLanding, userId, pathname])

  // Mantener ref sincronizada con storageKey
  storageKeyRef.current = storageKey

  // Load/restore state cuando cambia la página o la storageKey
  useEffect(() => {
    // Solo inicializar posY la primera vez
    if (posY === -999) {
      const vh = window.innerHeight
      setPosY(Math.max(80, vh - 520))
    }
    // Cerrar burbuja actual antes de cargar nueva página
    setOpen(false)
    setMinimized(true)

    const timer = setTimeout(() => {
      try {
        const saved = localStorage.getItem(storageKey)
        if (saved) {
          const s = JSON.parse(saved)
          setSeen(s.seen || false)
          setStepIdx(s.stepIdx || 0)
          if (s.wasOpen) {
            setOpen(true)
            setMinimized(false)
          }
        } else {
          setSeen(false)
          setStepIdx(0)
          setOpen(true)
          setMinimized(false)
        }
      } catch { }
    }, isLanding ? 1500 : 800)

    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, isLanding])

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        seen: seen || open, wasOpen: open, stepIdx, timestamp: Date.now(),
      }))
    } catch { }
  }, [seen, open, stepIdx, storageKey])

  // Section detection (landing only) — re-shows if user navigated away
  useEffect(() => {
    if (!isLanding) return
    const obs = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const found = SECTIONS.find(s => entry.target.matches(s.selector))
          if (found && found.id !== sectionRef.current) {
            setCurrentSection(found.id)
            burstParticles()
            // Re-open guide for new section if previously minimized
            if (!open && !seen) {
              setOpen(true)
              setMinimized(false)
            } else if (!open && seen) {
              // Re-show briefly only if user hasn't permanently dismissed
              const permDismissed = localStorage.getItem(storageKey + '_perm')
              if (!permDismissed) {
                setOpen(true)
                setMinimized(false)
              }
            }
          }
          break
        }
      }
    }, { threshold: 0.2 })
    const targets = SECTIONS.map(s => document.querySelector(s.selector)).filter(Boolean) as Element[]
    targets.forEach(t => obs.observe(t))
    return () => obs.disconnect()
  }, [isLanding, open, seen, storageKey])

  // Detección de secciones CRM mediante IntersectionObserver
  useEffect(() => {
    if (isLanding) return

    let obs: IntersectionObserver | null = null

    const setup = () => {
      obs = new IntersectionObserver((entries) => {
        // Encontrar la sección con mayor visibilidad
        let best: { el: Element; ratio: number } | null = null
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > (best?.ratio ?? 0)) {
            best = { el: entry.target, ratio: entry.intersectionRatio }
          }
        }
        if (!best) return

        const sectionId = (best.el as HTMLElement).dataset.crmSection
        if (!sectionId || sectionId === activeCrmSectionRef.current) return

        activeCrmSectionRef.current = sectionId
        const steps = crmStepsRef.current
        if (!steps) return

        const idx = steps.findIndex(s => s.sectionId === sectionId)
        if (idx === -1) return

        setStepIdx(idx)
        burstParticles()

        // Re-abrir guía si estaba minimizada (y no fue cerrada permanentemente)
        if (!open && !seenRef.current) {
          try {
            const perm = localStorage.getItem(storageKeyRef.current + '_perm')
            if (!perm) { setOpen(true); setMinimized(false) }
          } catch { }
        }
      }, { threshold: [0.25, 0.5, 0.75] })

      const targets = document.querySelectorAll('[data-crm-section]')
      targets.forEach(t => obs!.observe(t))
    }

    // Esperar a que la página renderice sus secciones
    const timer = setTimeout(setup, 600)

    return () => {
      clearTimeout(timer)
      obs?.disconnect()
      activeCrmSectionRef.current = null
    }
  }, [isLanding, pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // Escuchar evento toggle-guide desde el header del CRM
  useEffect(() => {
    if (isLanding) return
    const handler = () => setOpen(prev => !prev)
    window.addEventListener('toggle-guide', handler)
    return () => window.removeEventListener('toggle-guide', handler)
  }, [isLanding])

  // Auto-close after 25s on same section (landing)
  useEffect(() => {
    if (!isLanding || !open || minimized || seen) return
    const t = setTimeout(() => {
      setMinimized(true)
      setOpen(false)
    }, 25000)
    return () => clearTimeout(t)
  }, [isLanding, open, minimized, seen, currentSection])

  function burstParticles() {
    const now = Array.from({ length: 8 }, (_, i) => ({
      id: ++particleId, x: (Math.random() - 0.5) * 120, y: (Math.random() - 0.5) * 120,
    }))
    setParticles(now)
    setTimeout(() => setParticles([]), 800)
  }

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setDragging(true)
    elRef.current?.setPointerCapture(e.pointerId)
    dragStart.current = { y: e.clientY, py: posY }
  }, [posY])

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: PointerEvent) => {
      const dy = e.clientY - dragStart.current.y
      setPosY(Math.max(60, Math.min(window.innerHeight - 200, dragStart.current.py + dy)))
    }
    const onUp = () => setDragging(false)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp) }
  }, [dragging])

  // 3D tilt tracking
  useEffect(() => {
    if (!open || isLanding) return
    const el = bubbleRef.current
    if (!el) return
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      setTilt({
        x: ((e.clientY - cy) / (r.height / 2)) * -8,
        y: ((e.clientX - cx) / (r.width / 2)) * 8,
      })
    }
    const onLeave = () => setTilt({ x: 0, y: 0 })
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => { el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', onLeave) }
  }, [open, isLanding])

  const totalSteps = isLanding ? 0 : (crmSteps?.length || 0)
  const isLast = stepIdx >= totalSteps - 1

  const bubbleContent = useMemo(() => {
    if (isLanding) return getTipForSection(currentSection)
    return crmSteps?.[stepIdx] || null
  }, [isLanding, currentSection, crmSteps, stepIdx])

  const getMood: Mood = useMemo(() => {
    if (isLanding) return bubbleContent?.mood || 'wave'
    return bubbleContent?.mood || 'wave'
  }, [isLanding, bubbleContent])

  // ─── Speech Bubble ───
  if (open) {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        className="fixed z-[60]" style={{ right: 24, top: posY, touchAction: 'none' }}
        ref={elRef}
      >
        <div className="flex flex-col items-start gap-2" style={{ width: 'clamp(260px, 32vw, 380px)' }}>
          {/* Particle burst */}
          <AnimatePresence>
            {particles.map(p => (
              <motion.div key={p.id} className="fixed w-2 h-2 rounded-full bg-accent-gold pointer-events-none z-50"
                style={{ left: '50%', top: 28, marginLeft: -4 }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{ x: p.x, y: p.y, opacity: 0, scale: 0 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.7, ease: 'easeOut' }}
              />
            ))}
          </AnimatePresence>

          {/* Ripple glow behind mascot */}
          <motion.div className="fixed w-24 h-24 rounded-full bg-accent-gold/10 pointer-events-none"
            style={{ right: 24, top: posY + 40 }}
            animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          />

          <AnimatePresence mode="wait">
            <motion.div
              ref={bubbleRef}
              key={isLanding ? currentSection : stepIdx}
              initial={{ opacity: 0, y: 16, scale: 0.92 }}
              animate={{
                opacity: 1, y: 0, scale: 1,
                rotateX: tilt.x, rotateY: tilt.y,
              }}
              exit={{ opacity: 0, y: -12, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 350, damping: 22 }}
              className="bg-white rounded-3xl shadow-2xl border border-ink-200/70 overflow-hidden w-full"
              style={{ perspective: '800px', transformStyle: 'preserve-3d' }}
            >
              {/* Glow header */}
              <div className="relative bg-gradient-to-r from-accent-gold/20 via-accent-terracotta/10 to-accent-gold/20 px-4 md:px-5 py-3 flex items-center justify-between border-b border-ink-100 overflow-hidden">
                <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ['-100%', '100%'] }} transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }} />
                <span className="text-xs md:text-sm font-bold text-ink-700 relative z-10">
                  {isLanding ? '🧽 Guía de compra' : `Paso ${stepIdx + 1} de ${totalSteps}`}
                </span>
                <div className="flex gap-1 relative z-10">
                  {isLanding && (
                    <button onClick={() => {
                      try { localStorage.setItem(storageKey + '_perm', '1') } catch {}
                      setMinimized(true); setOpen(false); setSeen(true)
                    }}
                      className="px-2 py-1.5 rounded-xl hover:bg-ink-100/70 text-ink-400 hover:text-red-500 transition-all text-[10px] font-medium"
                      title="No mostrar más">
                      ✕
                    </button>
                  )}
                  <button onClick={() => {
                    if (isLanding) try { localStorage.setItem(storageKey + '_perm', '1') } catch {}
                    setMinimized(true); setOpen(false); setSeen(true)
                  }}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-xl hover:bg-ink-100/70 text-ink-500 hover:text-ink-700 transition-all text-xs font-medium"
                    title="Minimizar guía">
                    <ChevronDown size={14} /> Ocultar
                  </button>
                </div>
              </div>

              {/* Progress bar (CRM) */}
              {!isLanding && totalSteps > 1 && (
                <div className="w-full h-1.5 bg-ink-100">
                  <motion.div className="h-full bg-gradient-to-r from-accent-gold to-accent-terracotta rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${((stepIdx + 1) / totalSteps) * 100}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
              )}

              {/* Content */}
              <div className="p-4 md:p-5">
                <div className="flex gap-3 md:gap-4 mb-3 md:mb-4">
                  <div className="shrink-0">
                    <EsponjaSVG mood={getMood} size={64} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-bold text-ink-900 text-sm md:text-base lg:text-lg mb-1 leading-tight">
                      {bubbleContent?.title || ''}
                    </h3>
                    <p className="text-ink-600 text-xs md:text-sm lg:text-base leading-relaxed md:leading-relaxed whitespace-pre-line">
                      {bubbleContent?.message || ''}
                    </p>
                  </div>
                </div>

                {/* Dots (CRM multi-step) */}
                {!isLanding && totalSteps > 1 && (
                  <div className="flex justify-center gap-2 mb-4">
                    {Array.from({ length: totalSteps }, (_, idx) => (
                      <button key={idx} onClick={() => setStepIdx(idx)}
                        className={`h-2 rounded-full transition-all duration-300 ${idx === stepIdx ? 'bg-accent-gold w-6' : idx < stepIdx ? 'bg-accent-gold/40 w-2' : 'bg-ink-200 w-2'}`}
                      />
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {isLanding && currentSection === 'contacto' && (
                    <MagneticButton>
                      <a href="https://wa.me/51999999999" target="_blank" rel="noopener"
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 md:px-5 md:py-3 rounded-xl text-xs md:text-sm font-bold bg-green-500 text-white hover:bg-green-600 transition-all hover:shadow-lg active:scale-95">
                        <ShoppingCart size={16} /> Comprar ahora
                      </a>
                    </MagneticButton>
                  )}
                  {isLanding && currentSection === 'productos' && (
                    <MagneticButton>
                      <button onClick={() => document.querySelector('#productos')?.scrollIntoView({ behavior: 'smooth' })}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 md:px-5 md:py-3 rounded-xl text-xs md:text-sm font-bold bg-accent-gold text-ink-900 hover:bg-accent-gold/85 transition-all active:scale-95 shadow-md hover:shadow-lg">
                        Explorar productos
                      </button>
                    </MagneticButton>
                  )}

                  <div className="flex items-center gap-1.5 ml-auto">
                    {!isLanding && stepIdx > 0 && (
                      <button onClick={() => setStepIdx(i => i - 1)}
                        className="p-2 md:p-2.5 rounded-xl hover:bg-ink-100 text-ink-500 transition-all active:scale-90">
                        <ChevronLeft size={18} />
                      </button>
                    )}
                    {!isLanding && (
                      <button onClick={() => {
                        if (isLast) { setOpen(false); setMinimized(true); setSeen(true) }
                        else setStepIdx(i => i + 1)
                      }}
                        className={`flex items-center gap-1.5 px-4 py-2.5 md:px-5 md:py-3 rounded-xl text-xs md:text-sm font-bold text-white transition-all hover:shadow-lg active:scale-95 ${isLast ? 'bg-accent-sage' : 'bg-accent-gold text-ink-900'}`}>
                        {isLast ? '¡Entendido!' : 'Siguiente'}
                        {!isLast && <ChevronRight size={16} />}
                      </button>
                    )}
                    {isLanding && (
                      <MagneticButton>
                        <button onClick={() => {
                          if (seen) {
                            try { localStorage.setItem(storageKey + '_perm', '1') } catch {}
                          }
                          setMinimized(true); setOpen(false); setSeen(true)
                        }}
                          className="px-4 py-2.5 md:px-5 md:py-3 rounded-xl text-xs md:text-sm font-medium text-ink-500 hover:text-ink-700 hover:bg-ink-100/70 transition-all active:scale-95 flex items-center gap-1">
                          <ChevronDown size={14} /> Minimizar
                        </button>
                      </MagneticButton>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Arrow + Drag Handle */}
          <div className="flex items-end gap-2 ml-3">
            <div className="w-3 h-3 bg-white border-l border-b border-ink-200 rotate-[-45deg] mb-[-5px]" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
            <div onPointerDown={handlePointerDown}
              className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-accent-gold to-accent-terracotta shadow-xl flex items-center justify-center text-xl md:text-2xl cursor-grab active:cursor-grabbing motion-safe:animate-sponge-float hover:shadow-2xl transition-shadow active:scale-95"
            >
              🧽
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  // ─── Minimized floating sponge (static, sin movimiento) ───
  if (hideMinimized) return null
  return (
    <div
      className="fixed z-[60]"
      style={{ right: 24, bottom: 100 }}
    >
      <button
        onClick={() => { setOpen(true); setMinimized(false) }}
        className="relative block"
      >
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-gold to-accent-terracotta shadow-xl flex items-center justify-center text-2xl relative overflow-hidden">
          {isLanding ? '🧽' : <Sparkles size={24} className="text-white relative z-10" />}
        </div>
        {!isLanding && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
            <span className="text-[8px] text-white font-bold">1</span>
          </span>
        )}
        {isLanding && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white" />
        )}
      </button>
    </div>
  )
}

// ─── Sub-components ───

function MagneticButton({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [mag, setMag] = useState({ x: 0, y: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      const dx = e.clientX - (r.left + r.width / 2)
      const dy = e.clientY - (r.top + r.height / 2)
      setMag({ x: dx * 0.15, y: dy * 0.15 })
    }
    const onLeave = () => setMag({ x: 0, y: 0 })
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => { el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', onLeave) }
  }, [])
  return (
    <div ref={ref} style={{ transform: `translate(${mag.x}px, ${mag.y}px)` }} className="transition-transform duration-100 ease-out inline-block">
      {children}
    </div>
  )
}

function FloatingBubbles({ count = 4 }: { count?: number }) {
  const bubbles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i, size: 4 + Math.random() * 6, left: 10 + Math.random() * 60,
      delay: i * 0.6, duration: 2 + Math.random() * 2,
    })), [count])
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {bubbles.map(b => (
        <motion.div key={b.id} className="absolute rounded-full bg-white/40 border border-white/20"
          style={{ width: b.size, height: b.size, left: `${b.left}%`, bottom: -10 }}
          animate={{ y: [0, -80, -120], x: [0, b.id % 2 === 0 ? 10 : -10, 0], opacity: [0, 0.6, 0], scale: [0.5, 1, 0.3] }}
          transition={{ duration: b.duration, repeat: Infinity, delay: b.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

function EsponjaSVG({ mood = 'wave', size = 64 }: { mood?: Mood; size?: number }) {
  const baseColor = '#f4d03f'
  const shadowColor = '#d4ac0d'

  const [squeeze, setSqueeze] = useState(0)
  const [blink, setBlink] = useState(false)
  const squeezeRef = useRef(0)
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const blinkCloseRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (mood !== 'point' && mood !== 'warn') return
    const interval = setInterval(() => {
      squeezeRef.current = squeezeRef.current === 0 ? 1 : 0
      setSqueeze(squeezeRef.current)
    }, 3000)
    return () => clearInterval(interval)
  }, [mood])

  useEffect(() => {
    const blinkLoop = () => {
      const delay = 4000 + Math.random() * 3000
      blinkTimerRef.current = setTimeout(() => {
        setBlink(true)
        blinkCloseRef.current = setTimeout(() => {
          setBlink(false)
          blinkLoop()
        }, 150)
      }, delay)
    }
    blinkLoop()
    return () => {
      clearTimeout(blinkTimerRef.current)
      clearTimeout(blinkCloseRef.current)
    }
  }, [])

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <FloatingBubbles count={mood === 'celebrate' ? 6 : 4} />

      {/* Glow ambiental detrás */}
      <motion.div
        className="absolute inset-0 rounded-full bg-accent-gold/20 blur-xl pointer-events-none"
        animate={{
          scale: [1, 1.2, 1],
          opacity: mood === 'celebrate' ? [0.3, 0.6, 0.3] : [0.15, 0.3, 0.15]
        }}
        transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
        style={{ margin: -8 }}
      />

      <motion.svg
        width={size} height={size} viewBox="0 0 72 72"
        className="relative z-10"
        animate={{
          y: [0, -5, 0],
          rotate: mood === 'celebrate' ? [0, -5, 5, 0] : mood === 'wave' ? [0, 3, -3, 0] : [0, 2, -2, 0],
          scaleX: squeeze ? [1, 1.08, 0.95, 1] : 1,
          scaleY: squeeze ? [1, 0.92, 1.05, 1] : 1,
        }}
        transition={{
          y: { repeat: Infinity, duration: 2.5, ease: 'easeInOut' },
          rotate: { repeat: Infinity, duration: 3.5, ease: 'easeInOut' },
          scaleX: { duration: 0.4 },
          scaleY: { duration: 0.4 }
        }}
      >
        <defs>
          <radialGradient id="bodyGrad" cx="40%" cy="35%">
            <stop offset="0%" stopColor="#f7dc6f" />
            <stop offset="100%" stopColor={baseColor} />
          </radialGradient>
          <radialGradient id="cheekGrad" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#ff9999" />
            <stop offset="100%" stopColor="#e74c3c" stopOpacity="0.3" />
          </radialGradient>
          <filter id="g-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Cuerpo de la esponja */}
        <rect x="10" y="10" width="52" height="52" rx="14" fill="url(#bodyGrad)" stroke={shadowColor} strokeWidth="2.5" filter="url(#g-glow)" />

        {/* Poros de la esponja */}
        <circle cx="20" cy="20" r="3.5" fill={shadowColor} opacity="0.25" />
        <circle cx="52" cy="24" r="3" fill={shadowColor} opacity="0.2" />
        <circle cx="18" cy="48" r="2.5" fill={shadowColor} opacity="0.15" />
        <circle cx="50" cy="50" r="3.5" fill={shadowColor} opacity="0.2" />
        <circle cx="32" cy="14" r="2" fill={shadowColor} opacity="0.15" />
        <circle cx="44" cy="16" r="1.5" fill={shadowColor} opacity="0.1" />

        {/* Ojo izquierdo */}
        <motion.g animate={blink ? { scaleY: 0.1 } : { scaleY: 1 }} transition={{ duration: 0.1 }} style={{ transformOrigin: '26px 30px' }}>
          <ellipse cx="26" cy="30" rx="6" ry="6.5" fill="white" stroke="#2c3e50" strokeWidth="1.5" />
          <motion.circle cx="26" cy="30" r="3" fill="#2c3e50" />
          <circle cx="27.5" cy="28" r="1.2" fill="white" />
        </motion.g>

        {/* Ojo derecho */}
        <motion.g animate={blink ? { scaleY: 0.1 } : { scaleY: 1 }} transition={{ duration: 0.1 }} style={{ transformOrigin: '46px 30px' }}>
          <ellipse cx="46" cy="30" rx="6" ry="6.5" fill="white" stroke="#2c3e50" strokeWidth="1.5" />
          <motion.circle cx="46" cy="30" r="3" fill="#2c3e50" />
          <circle cx="47.5" cy="28" r="1.2" fill="white" />
        </motion.g>

        {/* Cejas según mood */}
        {mood === 'warn' && (
          <motion.g animate={{ y: [0, -1, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
            <line x1="20" y1="22" x2="30" y2="25" stroke="#2c3e50" strokeWidth="2" strokeLinecap="round" />
            <line x1="42" y1="25" x2="52" y2="22" stroke="#2c3e50" strokeWidth="2" strokeLinecap="round" />
          </motion.g>
        )}
        {mood === 'celebrate' && (
          <motion.g animate={{ y: [0, -2, 0] }} transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}>
            <motion.line x1="20" y1="24" x2="30" y2="20" stroke="#2c3e50" strokeWidth="2" strokeLinecap="round" />
            <motion.line x1="42" y1="20" x2="52" y2="24" stroke="#2c3e50" strokeWidth="2" strokeLinecap="round" />
          </motion.g>
        )}

        {/* Boca */}
        <motion.path
          d={mood === 'celebrate' ? 'M 22 32 Q 32 40 42 32' : mood === 'warn' ? 'M 24 34 Q 32 30 40 34' : 'M 25 33 Q 32 38 39 33'}
          fill="none" stroke="#2c3e50" strokeWidth="2.5" strokeLinecap="round"
          animate={mood === 'celebrate' ? { d: ['M 22 32 Q 32 40 42 32', 'M 22 32 Q 32 42 42 32', 'M 22 32 Q 32 40 42 32'] } : {}}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
        />

        {/* Mejillas sonrojadas */}
        <motion.circle cx="18" cy="36" r="5" fill="url(#cheekGrad)"
          animate={mood === 'celebrate' ? { opacity: [0.3, 0.6, 0.3], scale: [1, 1.2, 1] } : { opacity: 0.12 }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        />
        <motion.circle cx="54" cy="36" r="5" fill="url(#cheekGrad)"
          animate={mood === 'celebrate' ? { opacity: [0.3, 0.6, 0.3], scale: [1, 1.2, 1] } : { opacity: 0.12 }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut', delay: 0.3 }}
        />

        {/* Confeti celebración */}
        {mood === 'celebrate' && (
          <>
            <motion.circle cx="58" cy="14" r="4" fill="#e74c3c"
              animate={{ y: [0, -6, 0], scale: [1, 1.3, 1], rotate: [0, 180, 360] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
            />
            <motion.circle cx="64" cy="18" r="2.5" fill="#3498db"
              animate={{ y: [0, -5, 0], x: [0, 3, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, delay: 0.3, ease: 'easeInOut' }}
            />
            <motion.circle cx="10" cy="14" r="3" fill="#2ecc71"
              animate={{ y: [0, -7, 0], scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1, delay: 0.5, ease: 'easeInOut' }}
            />
            <motion.circle cx="62" cy="8" r="2" fill="#f39c12"
              animate={{ y: [0, -4, 0], x: [0, -2, 0] }}
              transition={{ repeat: Infinity, duration: 1.8, delay: 0.7, ease: 'easeInOut' }}
            />
          </>
        )}

        {/* Dedo apuntando animado */}
        {mood === 'point' && (
          <motion.g
            animate={{ x: [0, 5, 0], y: [0, -2, 0] }}
            transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
          >
            <path d="M 62 30 L 70 26 L 68 34 Z" fill="#f39c12" stroke="#e67e22" strokeWidth="1.5" />
            <motion.circle cx="70" cy="28" r="1.5" fill="#fff" opacity="0.6"
              animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ repeat: Infinity, duration: 1 }}
            />
          </motion.g>
        )}

        {/* Pensando (burbujas de idea) */}
        {mood === 'think' && (
          <motion.g animate={{ opacity: [0, 1, 1, 0], y: [0, -5, -10, -15] }} transition={{ repeat: Infinity, duration: 2.5, ease: 'easeOut' }}>
            <circle cx="56" cy="18" r="2" fill="#3498db" opacity="0.6" />
            <circle cx="60" cy="12" r="3" fill="#3498db" opacity="0.5" />
            <circle cx="64" cy="6" r="4" fill="#3498db" opacity="0.4" />
          </motion.g>
        )}
      </motion.svg>
    </div>
  )
}
