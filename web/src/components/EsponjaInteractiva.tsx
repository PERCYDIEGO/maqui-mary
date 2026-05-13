'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, ChevronDown, Sparkles } from 'lucide-react'

type SectionKey = 'hero' | 'productos' | 'nosotros' | 'testimonios' | 'contacto' | 'footer'

const GUIDE: Record<SectionKey, { icon: string; tip: string }> = {
  hero: { icon: '👋', tip: '¡Bienvenido! Somos Maqui Mary, esponjas de calidad hechas en Perú' },
  productos: { icon: '🧼', tip: 'Colores, acero, doble uso... explora nuestra variedad de esponjas' },
  nosotros: { icon: '🇵🇪', tip: 'Fabricación propia en Ate Vitarte — calidad peruana para tu hogar' },
  testimonios: { icon: '⭐', tip: 'Más de 12,800 clientes ya confiaron en nosotros' },
  contacto: { icon: '💬', tip: '¿Listo? Escríbenos al WhatsApp o compra directo desde la web' },
  footer: { icon: '🧼', tip: 'Gracias por visitarnos — llevamos calidad a tu hogar' },
}

const SECTIONS: { id: SectionKey; selector: string }[] = [
  { id: 'hero', selector: 'section:first-of-type' },
  { id: 'productos', selector: '#productos' },
  { id: 'nosotros', selector: '#nosotros' },
  { id: 'testimonios', selector: '#testimonios' },
  { id: 'contacto', selector: '#contacto' },
  { id: 'footer', selector: 'footer' },
]

export default function EsponjaInteractiva() {
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [current, setCurrent] = useState<SectionKey>('hero')
  const [dragging, setDragging] = useState(false)
  const [pos, setPos] = useState({ x: 16, y: 0 })
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [startMouse, setStartMouse] = useState({ x: 0, y: 0 })
  const elRef = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)

  useEffect(() => {
    setPos({ x: 16, y: window.innerHeight - 220 })
    initialized.current = true
  }, [])

  useEffect(() => {
    if (dismissed || !initialized.current) return
    const obs = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const found = SECTIONS.find(s => entry.target.matches(s.selector))
          if (found && found.id !== current) {
            setCurrent(found.id)
            setOpen(true)
          }
          break
        }
      }
    }, { threshold: 0.25 })

    const targets = SECTIONS.map(s => document.querySelector(s.selector)).filter(Boolean)
    targets.forEach(t => obs.observe(t!))
    return () => obs.disconnect()
  }, [dismissed, current])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setDragging(true)
    setStartMouse({ x: e.clientX, y: e.clientY })
    setStartPos({ x: pos.x, y: pos.y })
  }, [pos])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setDragging(true)
    setStartMouse({ x: e.touches[0].clientX, y: e.touches[0].clientY })
    setStartPos({ x: pos.x, y: pos.y })
  }, [pos])

  useEffect(() => {
    if (!dragging) return
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const cx = 'touches' in e ? e.touches[0].clientX : e.clientX
      const cy = 'touches' in e ? e.touches[0].clientY : e.clientY
      const dx = cx - startMouse.x
      const dy = cy - startMouse.y
      const newX = Math.max(8, Math.min(window.innerWidth - 180, startPos.x + dx))
      const newY = Math.max(80, Math.min(window.innerHeight - 160, startPos.y + dy))
      setPos({ x: newX, y: newY })
    }
    const handleUp = () => setDragging(false)
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    window.addEventListener('touchmove', handleMove, { passive: true })
    window.addEventListener('touchend', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleUp)
    }
  }, [dragging, startMouse, startPos])

  if (dismissed) return null

  const guide = GUIDE[current]
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  return (
    <div
      ref={elRef}
      className="fixed z-30 select-none"
      style={{
        left: pos.x,
        top: pos.y,
        cursor: dragging ? 'grabbing' : 'grab',
        touchAction: 'none',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {open ? (
        <div className="flex flex-col items-start gap-2">
          <div className="relative bg-white rounded-2xl shadow-xl border border-ink-200 p-3.5 max-w-[220px]">
            <button
              onClick={(e) => { e.stopPropagation(); setDismissed(true) }}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-ink-200 text-ink-600 hover:bg-ink-300 flex items-center justify-center"
            >
              <X size={12} />
            </button>
            <div className="flex items-start gap-2.5">
              <span className="text-xl shrink-0 mt-0.5">{guide.icon}</span>
              <p className="text-xs text-ink-700 leading-relaxed">{guide.tip}</p>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-ink-100">
              <button
                onClick={(e) => { e.stopPropagation(); setDismissed(true) }}
                className="text-[10px] text-ink-400 hover:text-ink-600 transition-colors"
              >
                No mostrar más
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setOpen(false) }}
                className="text-[10px] text-ink-400 hover:text-ink-600 flex items-center gap-0.5 transition-colors"
              >
                <ChevronDown size={12} /> Minimizar
              </button>
            </div>
          </div>
          <div className="ml-3 w-3 h-3 bg-white border-l border-b border-ink-200 -mt-1.5 rotate-[-45deg]" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
          <div
            className="ml-1 w-10 h-10 rounded-xl bg-accent-gold shadow-lg flex items-center justify-center text-lg hover:scale-105 transition-transform active:scale-95"
            style={{ cursor: dragging ? 'grabbing' : 'grab' }}
          >
            🧼
          </div>
        </div>
      ) : (
        <div
          className="relative group"
          onClick={() => setOpen(true)}
        >
          <div className="w-12 h-12 rounded-2xl bg-accent-gold shadow-lg flex items-center justify-center text-xl hover:shadow-xl transition-all hover:scale-105 active:scale-95 motion-safe:animate-sponge-float">
            🧼
          </div>
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent-terracotta rounded-full animate-pulse-bubble" />
        </div>
      )}
    </div>
  )
}
