'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { X, ChevronRight, Plus, Minus, Trash2, ShoppingCart, Check, MessageCircle, Heart } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

type CartItem = { id: number; name: string; price: number; quantity: number }

export default function CartDrawer({
  open, onClose, cart, setCart, productosLanding, total, itemsCount,
}: {
  open: boolean
  onClose: () => void
  cart: CartItem[]
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>
  productosLanding: any[]
  total: number
  itemsCount: number
}) {
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'form' | 'payment' | 'done'>('cart')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'yape' | 'plin'>('yape')
  const [submitting, setSubmitting] = useState(false)
  const [lastOrderId, setLastOrderId] = useState<number | null>(null)
  const [paymentEvidenceUrl, setPaymentEvidenceUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [bgMusic, setBgMusic] = useState(true)
  const [landingTrack, setLandingTrack] = useState('')
  const audioRef = useRef<any>(null)

  useEffect(() => {
    import('@/lib/audio').then(mod => { audioRef.current = mod.audio })
  }, [])

  const checkoutProgress = checkoutStep === 'cart' ? 1 : checkoutStep === 'form' ? 2 : checkoutStep === 'payment' ? 3 : 4
  const totalSteps = 4

  function addToCart(id: number, name: string, price: number) {
    audioRef.current?.addToCart?.()
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
    audioRef.current?.removeFromCart?.()
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
        origen: 'web',
        notes: cart.map(i => `${i.name} x${i.quantity} = S/ ${(i.price * i.quantity).toFixed(2)}`).join('\n'),
      }).select('id').single()
      if (error) throw error
      setLastOrderId(data.id)
      setCheckoutStep('payment')
      audioRef.current?.checkout?.()
    } catch (e: any) {
      audioRef.current?.error?.()
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
    setLastOrderId(null); setPaymentEvidenceUrl(''); setCheckoutStep('cart'); onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-accent-cream shadow-2xl h-full overflow-y-auto animate-fade-up">
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 border-b border-ink-200 p-3 sm:p-4 flex items-center justify-between">
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
          <button onClick={onClose}><X size={20} className="text-ink-500 hover:text-ink-700 transition-colors" /></button>
        </div>

        {checkoutStep === 'cart' && (
          <div className="p-4">
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
          <div className="p-4 space-y-4">
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
                    <Image src="/medio-de-pagos/yape.png" alt="Yape" width={120} height={64} className="mx-auto object-contain" style={{ maxHeight: 64 }} />
                    <span className="block text-xs font-medium text-ink-600 mt-1">Yape</span>
                  </button>
                  <button onClick={() => setPaymentMethod('plin')} className={`p-3 rounded-2xl border-2 text-center transition-all bg-white ${paymentMethod === 'plin' ? 'border-blue-500 shadow-md ring-1 ring-blue-500/30' : 'border-ink-200 hover:border-ink-300'}`}>
                    <Image src="/medio-de-pagos/plin.png" alt="Plin" width={100} height={56} className="mx-auto object-contain" style={{ maxHeight: 56 }} />
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
          <div className="p-4 text-center">
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
                      <Image src="/img/yape-qr.jpeg" alt="Código QR Yape" width={160} height={160} className="object-contain mx-auto" />
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
                      <Image src={paymentEvidenceUrl} alt="Comprobante" width={400} height={400} className="w-full max-w-[200px] mx-auto rounded-2xl border-2 border-accent-sage shadow-md h-auto" unoptimized />
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
  )
}
