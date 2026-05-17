'use client'

import { MessageCircle, X, Send, Sparkles, ChevronRight } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Producto } from '@/types'

type QuickReply = { label: string; value: string }

type ChatMessage = {
  role: 'bot' | 'user'
  text: string
  quickReplies?: QuickReply[]
}

type ProductContext = { productos: Producto[] }

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

function words_some(q: string, words: string[]): boolean {
  return words.some(w => q.includes(w))
}

const MENU_QR: QuickReply[] = [
  { label: '🛒 Comprar', value: 'a' },
  { label: '🔍 Productos', value: 'b' },
  { label: '👤 Asesor', value: 'c' },
  { label: '📦 Seguimiento', value: 'd' },
  { label: '💡 Top ventas', value: 'e' },
]

const BACK_QR: QuickReply[] = [
  { label: '← Menú', value: 'menu' },
  { label: '👤 Asesor', value: 'c' },
]

function menuPrincipal(nombre?: string): ChatMessage {
  const saludo = nombre ? `¡Hola ${nombre}!` : '¡Hola!'
  return {
    role: 'bot',
    text: `${saludo} 🧼 Soy **MaryBot**, asistente de **Maqui Mary**.\n\n¿En qué te ayudo hoy?`,
    quickReplies: MENU_QR,
  }
}

function matchKeywords(input: string, ctx: ProductContext): ChatMessage {
  const q = normalize(input)
  const prods = ctx.productos.filter(p => p.stock > 0)
  const letra = q.trim().toLowerCase()

  if (letra === 'menu' || letra === 'inicio') return menuPrincipal()

  if (letra === 'a') {
    if (prods.length === 0) return { role: 'bot', text: '🛒 No tenemos productos disponibles ahora. Escríbenos a WhatsApp.', quickReplies: BACK_QR }
    const opts = prods.slice(0, 6).map((p, i) => `**${i + 1})** ${p.name} — S/ ${Number(p.price).toFixed(2)}`).join('\n')
    const extra = prods.length > 6 ? `\n\n_Y ${prods.length - 6} productos más..._` : ''
    return {
      role: 'bot',
      text: `🛒 **¡Elige un producto!**\n\n${opts}${extra}\n\nEscribe el **número** del que quieres.`,
      quickReplies: BACK_QR,
    }
  }

  if (letra === 'b') {
    if (prods.length === 0) return { role: 'bot', text: '🔍 No hay productos registrados todavía.', quickReplies: BACK_QR }
    const lines = prods.map((p, i) => {
      const promo = p.precio_original
        ? ` ~~S/${Number(p.precio_original).toFixed(2)}~~ → **S/${Number(p.price).toFixed(2)}** 🔥`
        : ` **S/${Number(p.price).toFixed(2)}**`
      return `**${i + 1})** ${p.name}${promo}`
    }).join('\n')
    return {
      role: 'bot',
      text: `🔍 **Catálogo completo:**\n\n${lines}\n\nEscribe el **número** para ver detalle.`,
      quickReplies: BACK_QR,
    }
  }

  if (letra === 'c') {
    return {
      role: 'bot',
      text: `👤 ¡Te conecto con un asesor!\n\n💰 ¿Eres distribuidor? Pregunta por precios al por mayor.\n🚚 Delivery en Lima.\n\nToca el botón de WhatsApp abajo 👇`,
      quickReplies: [{ label: '← Menú', value: 'menu' }],
    }
  }

  if (letra === 'd') {
    return {
      role: 'bot',
      text: `📦 **Seguimiento de pedido**\n\nEscribe tu **número de pedido** y te digo el estado.\n\n¿No lo tienes a mano? Escríbenos por WhatsApp.`,
      quickReplies: BACK_QR,
    }
  }

  if (letra === 'e') {
    if (prods.length === 0) return { role: 'bot', text: '💡 Escríbenos a WhatsApp para recibir recomendaciones personalizadas.', quickReplies: BACK_QR }
    const top = [...prods].sort((a, b) => b.stock - a.stock).slice(0, 3)
    const recs = top.map((p, i) => `**${i + 1})** ${p.name} — S/ ${Number(p.price).toFixed(2)}`).join('\n')
    return {
      role: 'bot',
      text: `💡 **Los más pedidos del mes:**\n\n${recs}\n\nEscribe el **número** para ver detalle.`,
      quickReplies: [{ label: '🛒 Ver todos', value: 'a' }, { label: '← Menú', value: 'menu' }],
    }
  }

  // Número de producto
  if (/^\d+$/.test(q.trim())) {
    const num = parseInt(q.trim(), 10)
    if (prods.length > 0 && num >= 1 && num <= prods.length) {
      const p = prods[num - 1]
      const promo = p.precio_original
        ? `~~S/ ${Number(p.precio_original).toFixed(2)}~~ → **S/ ${Number(p.price).toFixed(2)}** 🔥`
        : `**S/ ${Number(p.price).toFixed(2)}**`
      const stockMsg = p.stock < 20 ? `⚠️ **Solo ${p.stock} unidades** — ¡volando!` : `📦 Stock: ${p.stock}`
      return {
        role: 'bot',
        text: `**${p.name}** 🧽\n💰 ${promo}\n${stockMsg}\n\n${p.description || 'Producto de limpieza de alta calidad.'}\n\nAgrégalo al carrito desde nuestra web 🛒`,
        quickReplies: [{ label: '🛒 Ver catálogo', value: 'a' }, { label: '👤 Asesor', value: 'c' }, { label: '← Menú', value: 'menu' }],
      }
    }
    return { role: 'bot', text: `Ese número no es válido 🙈`, quickReplies: MENU_QR }
  }

  // Palabras clave
  if (words_some(q, ['hola', 'buenas', 'hey', 'ayuda', 'menu', 'inicio', 'empezar'])) return menuPrincipal()
  if (words_some(q, ['comprar', 'pedir', 'quiero', 'llevar', 'necesito'])) return matchKeywords('a', ctx)
  if (words_some(q, ['producto', 'precio', 'cuesta', 'catalogo', 'todo', 'lista'])) return matchKeywords('b', ctx)
  if (words_some(q, ['contacto', 'asesor', 'hablar', 'whatsapp', 'humano'])) return matchKeywords('c', ctx)
  if (words_some(q, ['pedido', 'seguimiento', 'rastrear', 'estado'])) return matchKeywords('d', ctx)
  if (words_some(q, ['recomienda', 'popular', 'vendido', 'top', 'mejor'])) return matchKeywords('e', ctx)

  if (words_some(q, ['yape', 'plin', 'pago', 'pagar', 'qr'])) {
    return {
      role: 'bot',
      text: `💳 **Métodos de pago:**\n\nAceptamos **Yape** y **Plin** 🇵🇪\n\n1️⃣ Agrega al carrito → 2️⃣ Elige método → 3️⃣ Escanea QR → 4️⃣ Sube comprobante`,
      quickReplies: [{ label: '🛒 Comprar ahora', value: 'a' }, { label: '← Menú', value: 'menu' }],
    }
  }

  if (words_some(q, ['delivery', 'envio', 'entrega', 'llegan'])) {
    return {
      role: 'bot',
      text: `🚚 **Delivery en Lima** — Calculamos el costo según tu dirección al hacer el pedido.\n\nEl costo varía entre S/ 0 (recojo) y S/ 48 según la distancia.`,
      quickReplies: [{ label: '🛒 Pedir ahora', value: 'a' }, { label: '👤 Consultar', value: 'c' }],
    }
  }

  if (words_some(q, ['mayor', 'distribuidor', 'bodega', 'volumen'])) {
    return {
      role: 'bot',
      text: `🏪 **Venta al por mayor** — Precios especiales para distribuidores.\n\n✅ Descuentos por volumen\n✅ Entrega a tu local\n✅ Atención personalizada`,
      quickReplies: [{ label: '👤 Cotizar', value: 'c' }, { label: '← Menú', value: 'menu' }],
    }
  }

  if (words_some(q, ['empresa', 'quienes', 'maqui', 'donde', 'ubicacion'])) {
    return {
      role: 'bot',
      text: `🧼 **Maqui Mary** — Fabricantes peruanos de esponjas 🇵🇪\n📍 Ate Vitarte, Lima\n⭐ +12,800 clientes · 4 años de experiencia\n\nDel fabricante a tu hogar — calidad garantizada.`,
      quickReplies: [{ label: '🛒 Comprar', value: 'a' }, { label: '← Menú', value: 'menu' }],
    }
  }

  if (words_some(q, ['gracias', 'thanks', 'ok', 'listo', 'bueno'])) {
    return { role: 'bot', text: '¡Con gusto! 😊 Aquí estoy para lo que necesites.', quickReplies: MENU_QR }
  }

  return menuPrincipal()
}

export default function MaryBot() {
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [ctx, setCtx] = useState<ProductContext | null>(null)
  const [thinking, setThinking] = useState(false)
  const [waPhone, setWaPhone] = useState('51949324254')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.from('productos').select('*').then(({ data }) => {
      if (data) setCtx({ productos: data })
    })
    fetch('/api/empresa').then(r => r.json()).then(d => {
      if (d.whatsapp_clientes) setWaPhone(d.whatsapp_clientes)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (open) {
      setUnread(false)
      if (messages.length === 0 && ctx) setMessages([menuPrincipal()])
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, ctx])

  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      const last = messages[messages.length - 1]
      if (last.role === 'bot' && !open) setUnread(true)
    }
  }, [messages])

  function sendMessage(text: string) {
    if (!text.trim() || !ctx) return
    setMessages(prev => [...prev, { role: 'user', text: text.trim() }])
    setInput('')
    setThinking(true)
    setTimeout(() => {
      setMessages(prev => [...prev, matchKeywords(text.trim(), ctx!)])
      setThinking(false)
    }, 350 + Math.random() * 300)
  }

  function handleSend(e?: React.FormEvent) {
    e?.preventDefault()
    sendMessage(input)
  }

  function renderText(text: string): React.ReactNode {
    return text.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*.*?\*\*|~~.*?~~|_.*?_)/g)
      const rendered = parts.map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={j}>{part.slice(2, -2)}</strong>
        if (part.startsWith('~~') && part.endsWith('~~')) return <span key={j} className="line-through opacity-60">{part.slice(2, -2)}</span>
        if (part.startsWith('_') && part.endsWith('_')) return <em key={j} className="opacity-70">{part.slice(1, -1)}</em>
        return part
      })
      return <p key={i} className="text-sm leading-relaxed">{rendered}</p>
    })
  }

  const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent('¡Hola! Quiero hacer una consulta sobre productos Maqui Mary')}`

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 left-6 z-50 bg-gradient-to-br from-ink-700 to-ink-900 text-accent-cream p-4 rounded-full shadow-xl hover:shadow-2xl hover:scale-110 active:scale-95 transition-all duration-200"
        title="MaryBot — Atención al cliente"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {unread && !open && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-terracotta rounded-full border-2 border-white animate-pulse" />
        )}
      </button>

      {open && (
        <div
          className="fixed bottom-24 left-6 z-50 flex flex-col rounded-3xl shadow-2xl border border-ink-200 overflow-hidden animate-fade-up"
          style={{ width: 'min(22rem, calc(100vw - 3rem))', maxHeight: 'calc(100vh - 180px)' }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-ink-800 to-ink-900 text-white px-4 py-3 flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-full bg-accent-gold/20 flex items-center justify-center text-lg shrink-0">
              🧼
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-heading font-bold text-sm leading-tight">MaryBot</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[11px] text-ink-300">En línea · Maqui Mary</span>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1.5 rounded-xl hover:bg-white/10 transition-colors shrink-0">
              <X size={16} />
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-ink-50/60 scrollbar-hide">
            {messages.map((msg, i) => {
              const isLast = i === messages.length - 1
              return (
                <div key={i}>
                  <div className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'bot' && (
                      <div className="w-6 h-6 rounded-full bg-ink-700 flex items-center justify-center text-[10px] shrink-0 mb-0.5">
                        🧼
                      </div>
                    )}
                    <div className={`max-w-[82%] rounded-2xl px-3 py-2.5 ${
                      msg.role === 'user'
                        ? 'bg-accent-terracotta text-white rounded-br-sm'
                        : 'bg-white text-ink-800 shadow-sm rounded-bl-sm border border-ink-100'
                    }`}>
                      {renderText(msg.text)}
                    </div>
                  </div>

                  {/* Quick-reply chips — solo en el último mensaje del bot */}
                  {msg.role === 'bot' && msg.quickReplies && isLast && !thinking && (
                    <div className="flex flex-wrap gap-1.5 mt-2 ml-8">
                      {msg.quickReplies.map((qr, qi) => (
                        <button
                          key={qi}
                          onClick={() => sendMessage(qr.value)}
                          className="text-[11px] px-2.5 py-1 rounded-full border border-accent-terracotta/40 text-accent-terracotta bg-white hover:bg-accent-terracotta hover:text-white transition-all font-medium"
                        >
                          {qr.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {thinking && (
              <div className="flex items-end gap-2">
                <div className="w-6 h-6 rounded-full bg-ink-700 flex items-center justify-center text-[10px] shrink-0">🧼</div>
                <div className="bg-white rounded-2xl rounded-bl-sm px-3 py-2.5 shadow-sm border border-ink-100">
                  <div className="flex gap-1">
                    {[0, 150, 300].map(d => (
                      <span key={d} className="w-1.5 h-1.5 bg-ink-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="border-t border-ink-100 p-2.5 flex gap-2 bg-white shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Escribe o elige una opción..."
              className="flex-1 px-3.5 py-2 rounded-xl border border-ink-200 text-sm text-ink-800 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-accent-terracotta/30 focus:border-accent-terracotta/50 transition-all"
              disabled={thinking}
            />
            <button
              type="submit"
              disabled={!input.trim() || thinking}
              className="bg-accent-terracotta hover:bg-ink-700 text-white p-2 rounded-xl transition-colors disabled:opacity-40 shrink-0"
            >
              <Send size={16} />
            </button>
          </form>

          {/* WhatsApp CTA */}
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 text-xs py-2.5 border-t border-green-100 transition-colors font-medium shrink-0"
          >
            <MessageCircle size={13} />
            Hablar con un asesor real
            <ChevronRight size={13} />
          </a>
        </div>
      )}
    </>
  )
}
