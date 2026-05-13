'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft, Minimize2, Sparkles, MessageCircle, EyeOff, HelpCircle } from 'lucide-react'
import type { OnboardingStep } from './steps'

interface EsponjaGuiaProps {
  steps: OnboardingStep[]
  currentStepIndex: number
  isOpen: boolean
  isMinimized: boolean
  permanentlyClosed: boolean
  onNext: () => void
  onPrev: () => void
  onClose: () => void
  onMinimize: () => void
  onOpen: () => void
  onClosePermanently: () => void
}

// Burbujas flotantes animadas
function FloatingBubbles() {
  const bubbles = Array.from({ length: 5 }, (_, i) => ({
    id: i,
    size: 4 + Math.random() * 6,
    left: 10 + Math.random() * 60,
    delay: i * 0.6,
    duration: 2 + Math.random() * 2,
  }))
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {bubbles.map((b) => (
        <motion.div
          key={b.id}
          className="absolute rounded-full bg-white/40 border border-white/20"
          style={{
            width: b.size,
            height: b.size,
            left: `${b.left}%`,
            bottom: -10,
          }}
          animate={{
            y: [0, -80, -120],
            x: [0, (b.id % 2 === 0 ? 10 : -10), 0],
            opacity: [0, 0.6, 0],
            scale: [0.5, 1, 0.3],
          }}
          transition={{
            duration: b.duration,
            repeat: Infinity,
            delay: b.delay,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  )
}

// SVG Esponja Mascot — Animated with bubbles
function EsponjaSVG({ mood }: { mood: OnboardingStep['icon'] }) {
  const baseColor = '#f4d03f'
  const shadowColor = '#d4ac0d'
  
  const eyeOffset = mood === 'point' ? 2 : mood === 'think' ? -1 : 0
  const mouthPath = mood === 'celebrate' 
    ? 'M 22 32 Q 32 38 42 32'
    : mood === 'warn'
    ? 'M 24 34 Q 32 30 40 34'
    : 'M 25 33 Q 32 37 39 33'
  
  return (
    <div className="relative">
      {/* Bubbles behind */}
      <FloatingBubbles />
      
      <motion.svg 
        width="72" 
        height="72" 
        viewBox="0 0 72 72"
        className="relative z-10"
        animate={{ 
          y: [0, -4, 0],
          rotate: mood === 'celebrate' ? [0, -3, 3, 0] : [0, 1, -1, 0]
        }}
        transition={{ 
          y: { repeat: Infinity, duration: 3, ease: 'easeInOut' },
          rotate: { repeat: Infinity, duration: 4, ease: 'easeInOut' }
        }}
      >
        {/* Glow effect */}
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Body with rounded sponge shape */}
        <rect x="10" y="10" width="52" height="52" rx="14" fill={baseColor} stroke={shadowColor} strokeWidth="2.5" filter="url(#glow)"/>
        
        {/* Sponge pores - more organic */}
        <circle cx="20" cy="20" r="3.5" fill={shadowColor} opacity="0.25"/>
        <circle cx="52" cy="24" r="3" fill={shadowColor} opacity="0.2"/>
        <circle cx="18" cy="48" r="2.5" fill={shadowColor} opacity="0.15"/>
        <circle cx="50" cy="50" r="3.5" fill={shadowColor} opacity="0.2"/>
        <circle cx="32" cy="14" r="2" fill={shadowColor} opacity="0.15"/>
        <circle cx="44" cy="16" r="1.5" fill={shadowColor} opacity="0.1"/>
        <circle cx="24" cy="54" r="2" fill={shadowColor} opacity="0.1"/>
        
        {/* Eyes with more expression */}
        <motion.g animate={{ x: eyeOffset }} transition={{ duration: 0.3 }}>
          <ellipse cx="26" cy="30" rx="6" ry="6.5" fill="white" stroke="#2c3e50" strokeWidth="1.5"/>
          <circle cx="26" cy="30" r="3" fill="#2c3e50"/>
          <circle cx="27.5" cy="28" r="1.2" fill="white"/>
          
          <ellipse cx="46" cy="30" rx="6" ry="6.5" fill="white" stroke="#2c3e50" strokeWidth="1.5"/>
          <circle cx="46" cy="30" r="3" fill="#2c3e50"/>
          <circle cx="47.5" cy="28" r="1.2" fill="white"/>
        </motion.g>
        
        {/* Eyebrows */}
        {mood === 'warn' && (
          <>
            <line x1="20" y1="22" x2="30" y2="25" stroke="#2c3e50" strokeWidth="2" strokeLinecap="round"/>
            <line x1="42" y1="25" x2="52" y2="22" stroke="#2c3e50" strokeWidth="2" strokeLinecap="round"/>
          </>
        )}
        {mood === 'celebrate' && (
          <>
            <motion.line x1="20" y1="24" x2="30" y2="20" stroke="#2c3e50" strokeWidth="2" strokeLinecap="round"
              animate={{ y: [0, -1, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}/>
            <motion.line x1="42" y1="20" x2="52" y2="24" stroke="#2c3e50" strokeWidth="2" strokeLinecap="round"
              animate={{ y: [0, -1, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}/>
          </>
        )}
        
        {/* Mouth */}
        <motion.path 
          d={mouthPath} 
          fill="none" 
          stroke="#2c3e50" 
          strokeWidth="2.5" 
          strokeLinecap="round"
          animate={{ d: mouthPath }}
          transition={{ duration: 0.3 }}
        />
        
        {/* Cheeks */}
        <circle cx="18" cy="36" r="4" fill="#e74c3c" opacity="0.12"/>
        <circle cx="54" cy="36" r="4" fill="#e74c3c" opacity="0.12"/>
        
        {/* Accessories by mood */}
        {mood === 'celebrate' && (
          <>
            <motion.circle cx="58" cy="14" r="4" fill="#e74c3c" 
              animate={{ y: [0, -5, 0], scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            />
            <motion.circle cx="64" cy="18" r="2.5" fill="#3498db"
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }}
            />
            <motion.circle cx="8" cy="16" r="3" fill="#2ecc71"
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 1, delay: 0.5 }}
            />
            <motion.circle cx="12" cy="10" r="2" fill="#f39c12"
              animate={{ y: [0, -3, 0] }}
              transition={{ repeat: Infinity, duration: 1.3, delay: 0.7 }}
            />
          </>
        )}
        
        {mood === 'warn' && (
          <>
            <motion.path d="M 58 10 L 64 20 L 52 20 Z" fill="#e74c3c"
              animate={{ y: [0, -2, 0], opacity: [1, 0.7, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
            <text x="56" y="18" fontSize="11" fill="white" fontWeight="bold">!</text>
          </>
        )}
        
        {mood === 'think' && (
          <motion.g 
            animate={{ x: [0, 2, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2.5 }}
          >
            <circle cx="62" cy="18" r="3.5" fill="#95a5a6" opacity="0.5"/>
            <circle cx="66" cy="12" r="2.5" fill="#95a5a6" opacity="0.3"/>
          </motion.g>
        )}
        
        {mood === 'point' && (
          <motion.g 
            animate={{ x: [0, 3, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <path d="M 62 30 L 70 26 L 68 34 Z" fill="#f39c12" stroke="#e67e22" strokeWidth="1.5"/>
          </motion.g>
        )}
      </motion.svg>
    </div>
  )
}

export default function EsponjaGuia({
  steps,
  currentStepIndex,
  isOpen,
  isMinimized,
  permanentlyClosed,
  onNext,
  onPrev,
  onClose,
  onMinimize,
  onOpen,
  onClosePermanently,
}: EsponjaGuiaProps) {
  const [showPulse, setShowPulse] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  
  // Pulse animation cuando hay pasos nuevos
  useEffect(() => {
    if (steps.length > 0 && !isOpen && !isMinimized && !permanentlyClosed) {
      setShowPulse(true)
      const t = setTimeout(() => setShowPulse(false), 3000)
      return () => clearTimeout(t)
    }
  }, [steps.length, isOpen, isMinimized, permanentlyClosed])
  
  if (permanentlyClosed || steps.length === 0) return null
  
  const currentStep = steps[currentStepIndex]
  const isLastStep = currentStepIndex === steps.length - 1
  const isFirstStep = currentStepIndex === 0
  const progress = ((currentStepIndex + 1) / steps.length) * 100
  
  const positionClasses: Record<string, string> = {
    'top-left': 'top-24 left-4',
    'top-right': 'top-24 right-4',
    'bottom-left': 'bottom-24 left-4',
    'bottom-right': 'bottom-24 right-4',
    'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  }
  
  const arrowClasses: Record<string, string> = {
    'top-left': '-bottom-2 left-8',
    'top-right': '-bottom-2 right-8',
    'bottom-left': '-top-2 left-8 rotate-180',
    'bottom-right': '-top-2 right-8 rotate-180',
    'center': '-bottom-2 left-1/2 -translate-x-1/2',
  }
  
  // Minimized icon
  if (isMinimized) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onOpen}
        className={`fixed bottom-6 right-6 z-[60] p-3 rounded-full shadow-lg bg-accent-gold text-ink-900 hover:bg-accent-gold/90 transition-colors ${
          showPulse ? 'ring-4 ring-accent-gold/30 animate-pulse' : ''
        }`}
        title="Guía interactiva"
      >
        <Sparkles size={24} />
      </motion.button>
    )
  }
  
  // Closed state (floating esponja with bubbles)
  if (!isOpen) {
    return (
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onOpen}
        className={`fixed bottom-6 right-6 z-[60] ${
          showPulse ? 'animate-bounce' : ''
        }`}
        title="Haz clic para la guía"
      >
        <div className="relative">
          <EsponjaSVG mood="wave" />
          {showPulse && (
            <motion.span 
              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full"
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
            />
          )}
        </div>
      </motion.button>
    )
  }
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className={`fixed ${positionClasses[currentStep?.position || 'bottom-right']} z-[60] max-w-sm`}
      >
        {/* Speech bubble */}
        <div className="bg-white rounded-2xl shadow-xl border border-ink-200 overflow-hidden">
          {/* Header with progress */}
          <div className="bg-gradient-to-r from-accent-gold/20 to-accent-cream px-4 py-3 flex items-center justify-between border-b border-ink-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ink-600">
                Guía {currentStepIndex + 1} de {steps.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onMinimize}
                className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-400 transition-colors"
                title="Minimizar"
              >
                <Minimize2 size={14} />
              </button>
              <button
                onClick={() => setShowCloseConfirm(true)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-ink-400 hover:text-red-500 transition-colors"
                title="Cerrar permanentemente"
              >
                <EyeOff size={14} />
              </button>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-full h-1 bg-ink-100">
            <motion.div 
              className="h-full bg-accent-gold"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          
          {/* Close confirmation dialog */}
          <AnimatePresence>
            {showCloseConfirm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-50 border-b border-red-100 px-4 py-3"
              >
                <p className="text-xs text-red-700 mb-2">
                  ¿Seguro que no quieres que te guíe nunca más? Puedes reactivarme desde el menú más tarde.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCloseConfirm(false)}
                    className="px-3 py-1.5 rounded-lg text-xs bg-white border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    No, continuar
                  </button>
                  <button
                    onClick={() => {
                      setShowCloseConfirm(false)
                      onClosePermanently()
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs bg-red-500 text-white hover:bg-red-600 transition-colors"
                  >
                    Sí, cerrar
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Content */}
          <div className="p-4">
            <div className="flex gap-3 mb-3">
              <div className="shrink-0">
                <EsponjaSVG mood={currentStep?.icon || 'wave'} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-heading font-bold text-ink-800 text-sm mb-1">
                  {currentStep?.title}
                </h3>
                <p className="text-ink-600 text-xs leading-relaxed whitespace-pre-line">
                  {currentStep?.message}
                </p>
              </div>
            </div>
            
            {/* Dots navigation */}
            <div className="flex justify-center gap-1.5 mb-3">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (idx < currentStepIndex) onPrev?.()
                    else if (idx > currentStepIndex) {
                      const diff = idx - currentStepIndex
                      for (let i = 0; i < diff; i++) onNext()
                    }
                  }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentStepIndex
                      ? 'bg-accent-gold w-4'
                      : idx < currentStepIndex
                      ? 'bg-accent-gold/40'
                      : 'bg-ink-200'
                  }`}
                />
              ))}
            </div>
            
            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={onClose}
                className="text-xs text-ink-400 hover:text-ink-600 transition-colors"
              >
                Saltar tour
              </button>
              
              <div className="flex gap-2">
                {!isFirstStep && (
                  <button
                    onClick={onPrev}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-ink-600 hover:bg-ink-100 transition-colors"
                  >
                    <ChevronLeft size={14} />
                    Anterior
                  </button>
                )}
                
                <button
                  onClick={onNext}
                  className={`flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:shadow-md active:scale-95 ${
                    isLastStep
                      ? 'bg-accent-sage hover:bg-accent-sage/90'
                      : 'bg-accent-gold hover:bg-accent-gold/90'
                  }`}
                >
                  {isLastStep ? (
                    <>
                      <MessageCircle size={14} />
                      ¡Listo!
                    </>
                  ) : (
                    <>
                      Siguiente
                      <ChevronRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Arrow pointer */}
        <div className={`absolute w-4 h-4 bg-white border-l border-b border-ink-200 transform rotate-45 ${arrowClasses[currentStep?.position || 'bottom-right']}`} />
      </motion.div>
    </AnimatePresence>
  )
}
