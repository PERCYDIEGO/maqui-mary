'use client'

import { MessageCircle, X, Send, Sparkles, ChevronRight, Package, Search, Clock, Heart } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Producto } from '@/types'

type ChatMessage = {
  role: 'bot' | 'user'
  text: string
}

type ProductContext = {
  productos: Producto[]
}

function buildContext(productos: Producto[]): ProductContext {
  return { productos }
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

function words_some(q: string, words: string[]): boolean {
  return words.some(w => q.includes(w))
}

function menuPrincipal(nombre?: string): ChatMessage {
  const saludo = nombre ? `¡Hola ${nombre}!` : '¡Hola!'
  return {
    role: 'bot',
    text: `${saludo} 🧼 Soy **MaryBot** de **Maqui Mary** — ¿En qué te ayudo?\n\n**A)** 🛒 Comprar ahora\n**B)** 🔍 Consultar productos y precios\n**C)** 👤 Hablar con un asesor\n**D)** 📦 Seguimiento de pedido\n**E)** 💡 Recomendaciones para ti\n\nResponde con la **letra** de la opción que quieras 😊`,
  }
}

function matchKeywords(input: string, ctx: ProductContext): ChatMessage {
  const q = normalize(input)
  const prods = ctx.productos.filter(p => p.stock > 0)

  // Opción por letra
  const letra = q.trim().toLowerCase()

  if (letra === 'a') {
    if (prods.length === 0) return { role: 'bot', text: '🛒 No tenemos productos disponibles ahorita. Escríbenos a WhatsApp para más info.' }
    const opts = prods.slice(0, 6).map((p, i) => `**${i + 1})** ${p.name} — S/ ${Number(p.price).toFixed(2)}`).join('\n')
    const extra = prods.length > 6 ? `\n\n*Y ${prods.length - 6} productos más...*` : ''
    return {
      role: 'bot',
      text: `🛒 **¡A comprar!** Elige un producto:\n\n${opts}${extra}\n\n📝 Responde el **número** del producto que quieras.\n\n⚡ Tip: Entre más compras, más ahorras — pregunta por precios al por mayor.`,
    }
  }

  if (letra === 'b') {
    if (prods.length === 0) return { role: 'bot', text: '🔍 No hay productos registrados todavía.' }
    const lines = prods.map((p, i) => {
      const promo = p.precio_original ? ` ~~S/${Number(p.precio_original).toFixed(2)}~~ → **S/${Number(p.price).toFixed(2)}** 🔥` : ` **S/${Number(p.price).toFixed(2)}**`
      return `**${i + 1})** ${p.name}${promo} — Stock: ${p.stock}`
    }).join('\n')
    return {
      role: 'bot',
      text: `🔍 **Catálogo completo:**\n\n${lines}\n\n📌 *Más de ${prods.length} opciones disponibles.*\nResponde el **número** del producto para ver detalle.\n\n❗ ¿Sabías que nuestros clientes vuelven a comprar? **9 de cada 10** nos recomiendan.`,
    }
  }

  if (letra === 'c') {
    return {
      role: 'bot',
      text: `👤 ¡Claro! Te conecto con un asesor directo por WhatsApp.\n\n💰 **¿Eres distribuidor?** Pregunta por nuestros precios al por mayor.\n🚚 Hacemos delivery en Lima.\n\n👇 Haz clic abajo para abrir WhatsApp.`,
    }
  }

  if (letra === 'd') {
    return {
      role: 'bot',
      text: `📦 **Seguimiento de pedido**\n\nEscribe el **número de pedido** que te dimos al comprar y te diré en qué estado está.\n\n¿No tienes tu número a la mano? Escríbenos a WhatsApp y te ayudamos.`,
    }
  }

  if (letra === 'e') {
    if (prods.length === 0) return { role: 'bot', text: '💡 Aún no tenemos productos para recomendar, pero escríbenos a WhatsApp y te asesoramos.' }
    const top = prods.sort((a, b) => b.stock - a.stock).slice(0, 3)
    const recs = top.map((p, i) => `**${i + 1})** ${p.name} — S/ ${Number(p.price).toFixed(2)}`).join('\n')
    return {
      role: 'bot',
      text: `💡 **Recomendaciones para ti**\n\nBasado en lo que más venden nuestros clientes:\n\n${recs}\n\n⭐ *Estos son los 3 más populares del mes.*\n\nResponde el **número** para ver detalle o escribe **A** para ver todos.`,
    }
  }

  // Número de producto
  if (/^\d+$/.test(q.trim())) {
    const num = parseInt(q.trim(), 10)
    if (prods.length > 0 && num >= 1 && num <= prods.length) {
      const p = prods[num - 1]
      const promo = p.precio_original
        ? `💰 ~~S/ ${Number(p.precio_original).toFixed(2)}~~ → **S/ ${Number(p.price).toFixed(2)}** 🔥`
        : `💰 Precio: **S/ ${Number(p.price).toFixed(2)}**`
      const stockMsg = p.stock < 20 ? `\n⚠️ **Solo quedan ${p.stock} unidades** — ¡Están volando!` : `\n📦 Stock disponible: ${p.stock}`
      return {
        role: 'bot',
        text: `**${p.name}** 🧽${promo}${stockMsg}\n📋 ${p.description || 'Producto de limpieza de alta calidad.'}\n\n**¿Te interesa?** Agrégalo al carrito desde nuestra web 🛒\n\n¿Quieres ver más? Escribe **A** para el catálogo o **C** para hablar con un asesor.`,
      }
    }
    return { role: 'bot', text: `Ese número no es válido 🙈\n\nResponde **A**, **B**, **C**, **D** o **E** para el menú principal.` }
  }

  // Número de pedido (dígitos largos)
  if (/^\d{5,}$/.test(q.trim())) {
    return {
      role: 'bot',
      text: `🔍 Buscando pedido **#${q.trim()}**...\n\nPor ahora, escríbenos a WhatsApp para consultar el estado exacto de tu pedido. Pronto podrás tracking en tiempo real 🚀`,
    }
  }

  // Palabras clave
  if (words_some(q, ['hola', 'buenas', 'hey', 'saludos', 'ayuda', 'menu', 'opcion', 'inicio', 'empezar', 'menu'])) {
    return menuPrincipal()
  }

  if (words_some(q, ['comprar', 'pedir', 'quiero', 'orden', 'llevar', 'necesito', 'compro'])) {
    return matchKeywords('a', ctx)
  }

  if (words_some(q, ['producto', 'vende', 'tiene', 'ofrece', 'catalogo', 'venden', 'precio', 'cuesta', 'sale', 'list', 'todo', 'catalogo'])) {
    return matchKeywords('b', ctx)
  }

  if (words_some(q, ['contacto', 'asesor', 'hablar', 'persona', 'whatsapp', 'ayuda real', 'humano', 'atencion'])) {
    return matchKeywords('c', ctx)
  }

  if (words_some(q, ['pedido', 'seguimiento', 'track', 'rastrear', 'orden', 'estado', 'llegada'])) {
    return matchKeywords('d', ctx)
  }

  if (words_some(q, ['recomienda', 'sugiere', 'popular', 'mas vendido', 'top', 'mejor', 'favorito'])) {
    return matchKeywords('e', ctx)
  }

  if (words_some(q, ['yape', 'plin', 'pago', 'pagar', 'qr', 'transferencia'])) {
    return {
      role: 'bot',
      text: `💳 **Métodos de pago:**\n\nAceptamos **Yape** y **Plin** — los más usados en Perú 🇵🇪\n\n**¿Cómo pagar?**\n1️⃣ Agrega productos al carrito en la web\n2️⃣ Elige Yape o Plin\n3️⃣ Confirma el pedido\n4️⃣ Escanea el QR o sube tu comprobante\n\n**¿Sabías que?** El 85% de nuestros clientes paga con Yape. Es rápido y seguro.`,
    }
  }

  if (words_some(q, ['empresa', 'quienes', 'maqui', 'mary', 'historia', 'donde', 'ubicacion', 'ate', 'vitarte'])) {
    return {
      role: 'bot',
      text: `🧼 **Maqui Mary** — Empresa peruana fabricante de esponjas de limpieza 🇵🇪\n📍 Ate Vitarte, Lima\n📅 +4 años de experiencia\n\n🏆 **Nuestro diferencial:**\n• Fabricación propia — calidad garantizada\n• Precios justos — del fabricante a tu hogar\n• +12,800 clientes satisfechos\n\n**¿Quieres comprar?** Responde **A** 🛒\n**¿Ver productos?** Responde **B** 🔍\n**¿Hablar con asesor?** Responde **C** 👤`,
    }
  }

  if (words_some(q, ['stock', 'disponible', 'hay', 'queda', 'disponibles'])) {
    const disponibles = prods.length
    const totalUds = prods.reduce((s, p) => s + p.stock, 0)
    return {
      role: 'bot',
      text: `📦 Tenemos **${disponibles} productos** con stock (**${totalUds} unidades** en total).\n\nResponde **B** para ver el catálogo completo con precios.\n\n⚡ Algunos productos tienen stock limitado. ¡No te quedes sin el tuyo!`,
    }
  }

  if (words_some(q, ['delivery', 'envio', 'entrega', 'llegan', 'reparto'])) {
    return {
      role: 'bot',
      text: '🚚 **Delivery en Lima** — Coordinamos la entrega en tu zona.\n\n💡 Escríbenos a WhatsApp con tu dirección y te confirmamos si llegamos.\n\nResponde **C** para hablar con un asesor.',
    }
  }

  if (words_some(q, ['mayor', 'distribuidor', 'bodega', 'volumen', 'wholesale', 'cantidad'])) {
    return {
      role: 'bot',
      text: '🏪 **Venta al por mayor** — Precios especiales para distribuidores y bodegueros.\n\n✅ Descuentos por volumen\n✅ Entrega en tu local\n✅ Atención personalizada\n\nResponde **C** para hablar con un asesor por WhatsApp y recibir una cotización.',
    }
  }

  if (words_some(q, ['gracias', 'thanks', 'ok', 'vale', 'bueno', 'listo'])) {
    return {
      role: 'bot',
      text: '¡Por nada! 😊 Estoy aquí para ayudarte.\n\nRecuerda que puedes:\n🛒 **A)** Comprar\n🔍 **B)** Ver productos\n👤 **C)** Hablar con asesor\n📦 **D)** Seguimiento\n💡 **E)** Recomendaciones',
    }
  }

  // Fallback
  return menuPrincipal()
}

export default function MaryBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [ctx, setCtx] = useState<ProductContext | null>(null)
  const [thinking, setThinking] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.from('productos').select('*').then(({ data }) => {
      if (data) setCtx(buildContext(data))
    })
  }, [])

  useEffect(() => {
    if (open && messages.length === 0 && ctx) {
      setMessages([menuPrincipal()])
    }
  }, [open, ctx])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend(e?: React.FormEvent) {
    e?.preventDefault()
    const text = input.trim()
    if (!text || !ctx) return
    setMessages(prev => [...prev, { role: 'user', text }])
    setInput('')
    setThinking(true)

    // Respuesta con delay natural
    const delay = 400 + Math.random() * 300
    setTimeout(() => {
      setMessages(prev => [...prev, matchKeywords(text, ctx)])
      setThinking(false)
    }, delay)
  }

  function renderText(text: string): React.ReactNode {
    const lines = text.split('\n')
    return lines.map((line, i) => {
      if (line.startsWith('• ') || line.startsWith('- ')) {
        return <p key={i} className="text-sm leading-relaxed ml-2">{line}</p>
      }
      const parts = line.split(/(\*\*.*?\*\*|~~.*?~~)/g)
      const rendered = parts.map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>
        if (part.startsWith('~~') && part.endsWith('~~')) return <span key={j} className="line-through text-ink-400">{part.slice(2, -2)}</span>
        return part
      })
      return <p key={i} className="text-sm leading-relaxed">{rendered}</p>
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 left-6 z-50 bg-gradient-to-br from-ink-700 to-ink-900 text-accent-cream p-4 rounded-full shadow-xl hover:shadow-2xl hover:scale-110 active:scale-95 transition-all duration-200"
        title="MaryBot - Atención al cliente"
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {open && (
        <div className="fixed bottom-24 left-6 z-50 w-80 sm:w-96 bg-accent-cream rounded-3xl shadow-2xl border border-ink-200 overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 180px)' }}>
          <div className="bg-gradient-to-r from-ink-700 to-ink-900 text-white p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles size={20} className="text-accent-gold" />
              </div>
              <div>
                <p className="font-heading font-bold text-sm">MaryBot 🧼</p>
                <p className="text-ink-300 text-xs">Asistente Maqui Mary</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-ink-50/50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-3 ${
                  msg.role === 'user'
                    ? 'bg-ink-700 text-white rounded-br-md'
                    : 'bg-white text-ink-800 shadow-sm rounded-bl-md border border-ink-100'
                }`}>
                  {renderText(msg.text)}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl p-3 shadow-sm border border-ink-100 rounded-bl-md">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-ink-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-ink-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-ink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSend} className="border-t border-ink-200 p-3 flex gap-2 bg-white">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Escribe A, B, C, D, E o un #..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-ink-300 text-sm text-ink-800 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-accent-gold focus:border-transparent"
              disabled={thinking}
            />
            <button type="submit" disabled={!input.trim() || thinking} className="bg-ink-700 hover:bg-ink-800 text-white p-2.5 rounded-xl transition-colors disabled:opacity-40">
              <Send size={18} />
            </button>
          </form>

          <a
            href="/api/contact/whatsapp?text=¡Hola!%20Quiero%20hacer%20una%20consulta"
            target="_blank"
            className="flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 text-xs py-2.5 border-t border-green-200 transition-colors font-medium"
          >
            <MessageCircle size={14} />
            Hablar con un asesor real
            <ChevronRight size={14} />
          </a>
        </div>
      )}
    </>
  )
}
