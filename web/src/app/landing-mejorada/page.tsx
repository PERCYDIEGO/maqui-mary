'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'

const GuiaAnimada = dynamic(() => import('@/components/GuiaAnimada'), { ssr: false })
const MaryBot = dynamic(() => import('@/components/MaryBot'), { ssr: false })


export default function LandingMejorada() {
  const [openMenu, setOpenMenu] = useState(false)

  const scrollTo = (id: string) => {
    setOpenMenu(false)
    const el = document.getElementById(id)
    el?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-[#F9F4EB] text-ink-900">
      {/* Topbar */}
      <header className="sticky top-0 z-40 bg-[#F9F4EB]/90 backdrop-blur border-b border-ink-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧽</span>
            <span className="text-lg font-bold tracking-tight">Maqui Mary</span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            <button onClick={() => scrollTo('productos')} className="hover:text-accent-gold transition-colors">Productos</button>
            <button onClick={() => scrollTo('nosotros')} className="hover:text-accent-gold transition-colors">Nosotros</button>
            <button onClick={() => scrollTo('influencers')} className="hover:text-accent-gold transition-colors">Comunidad</button>
            <button onClick={() => scrollTo('preguntas')} className="hover:text-accent-gold transition-colors">Preguntas frecuentes</button>
            <button onClick={() => scrollTo('contacto')} className="hover:text-accent-gold transition-colors">Contacto</button>
          </nav>

          <div className="flex items-center gap-3">
            <a href="/crm/login" className="hidden md:inline-flex items-center gap-2 text-sm border border-ink-300 rounded-lg px-3 py-1.5 hover:border-accent-gold transition-colors">
              Área empleados
            </a>
            <button className="md:hidden" onClick={() => setOpenMenu(!openMenu)}>
              {openMenu ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {openMenu && (
          <div className="md:hidden border-t border-ink-200 bg-[#F9F4EB] px-4 py-3 flex flex-col gap-3 text-sm">
            <button onClick={() => scrollTo('productos')}>Productos</button>
            <button onClick={() => scrollTo('nosotros')}>Nosotros</button>
            <button onClick={() => scrollTo('influencers')}>Comunidad</button>
            <button onClick={() => scrollTo('preguntas')}>Preguntas frecuentes</button>
            <button onClick={() => scrollTo('contacto')}>Contacto</button>
            <a href="/crm/login" className="text-accent-gold font-medium">Área empleados</a>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[#EFE7D5]" />
        <div className="absolute -top-24 right-0 w-[500px] h-[500px] bg-accent-gold/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent-terracotta/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="inline-block bg-white/80 border border-ink-200 text-ink-600 text-xs font-semibold px-3 py-1 rounded-full">
              Fabricación peruana · Lurigancho, Lima
            </span>

            <h1 className="text-4xl md:text-6xl font-bold leading-[1.1] tracking-tight">
              Esponjas y accesorios de limpieza para tu hogar y tu negocio
            </h1>

            <p className="text-ink-600 text-lg leading-relaxed max-w-xl">
              Desde nuestra fábrica en Lurigancho llevamos productos de limpieza duraderos, económicos y listos para usar.
            </p>

            <div className="flex flex-wrap gap-3">
              <button onClick={() => scrollTo('productos')} className="inline-flex items-center gap-2 bg-ink-900 text-[#F9F4EB] px-5 py-3 rounded-xl hover:bg-ink-800 transition-colors">
                Ver productos
              </button>
              <a href="https://wa.me/51916165543" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border border-ink-300 bg-white/60 px-5 py-3 rounded-xl hover:border-accent-gold transition-colors">
                Cotizar por mayor
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-ink-500">
              <span>Delivery en Lima</span>
              <span>·</span>
              <span>Precios al por mayor y menor</span>
              <span>·</span>
              <span>Atención por WhatsApp</span>
            </div>
          </div>

          <div className="relative">
            <div className="bg-white/80 border border-ink-200 rounded-3xl p-6 shadow-sm">
              <div className="aspect-[4/5] w-full bg-[#EFE7D5] rounded-2xl flex items-center justify-center">
                <span className="text-6xl">🧽</span>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 bg-white border border-ink-200 rounded-2xl px-4 py-3 shadow-sm">
              <p className="text-sm font-semibold">Hecho en Perú</p>
              <p className="text-xs text-ink-500">Fabricación propia</p>
            </div>
          </div>
        </div>
      </section>

      {/* Productos */}
      <section id="productos" className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-2xl mb-10">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Productos</h2>
            <p className="text-ink-600 mt-2">Conocé nuestras líneas principales y elegí la opción ideal para tu uso.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                name: 'Esponjas de colores',
                desc: 'Limpieza general del hogar',
                price: 'Desde S/ 3.50',
                emoji: '🎨',
              },
              {
                name: 'Esponja doble uso',
                desc: 'Cara suave + cara abrasiva',
                price: 'S/ 6.90',
                emoji: '🧼',
              },
              {
                name: 'Paños absorbentes',
                desc: 'Multiuso y secado rápido',
                price: 'Desde S/ 3.00',
                emoji: '🧹',
              },
              {
                name: 'Lana de acero',
                desc: 'Limpieza profunda sin rayar',
                price: 'S/ 7.50',
                emoji: '✨',
              },
            ].map((item) => (
              <div key={item.name} className="group bg-white border border-ink-200 rounded-2xl p-5 hover:border-accent-gold hover:shadow-md transition-all">
                <div className="aspect-square bg-[#EFE7D5] rounded-xl mb-4 flex items-center justify-center text-5xl">
                  {item.emoji}
                </div>
                <h3 className="font-semibold text-lg">{item.name}</h3>
                <p className="text-ink-500 text-sm mt-1">{item.desc}</p>
                <p className="mt-3 text-sm font-semibold">{item.price}</p>
                <button className="mt-4 w-full bg-ink-900 text-[#F9F4EB] rounded-xl py-2.5 text-sm hover:bg-ink-800 transition-colors">
                  Consultar
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Nosotros */}
      <section id="nosotros" className="py-20 bg-white border-y border-ink-200">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Fabricamos con foco en durabilidad y precio</h2>
            <p className="text-ink-600 leading-relaxed">
              Somos una empresa peruana dedicada a la fabricación y comercialización de productos de limpieza. Trabajamos para que clientes mayoristas y minoristas encuentren en Maqui Mary stock constante, buena presentación y precio confiable.
            </p>
            <p className="text-ink-600 leading-relaxed">
              Nuestra planta está en Lurigancho, Lima.controlamos fabricación, packaging y despacho, lo que nos permite responder rápido cuando el cliente lo necesita.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="border border-ink-200 rounded-xl p-4">
                <p className="text-2xl font-bold">+8</p>
                <p className="text-sm text-ink-500">productos activos</p>
              </div>
              <div className="border border-ink-200 rounded-xl p-4">
                <p className="text-2xl font-bold">Delivery</p>
                <p className="text-sm text-ink-500">coordinado por pedido</p>
              </div>
            </div>
          </div>

          <div className="bg-[#EFE7D5] rounded-3xl p-6 border border-ink-200">
            <div className="aspect-video rounded-2xl bg-white/80 flex items-center justify-center text-5xl">🏭</div>
          </div>
        </div>
      </section>

      {/* Comunidad / uso real */}
      <section id="influencers" className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-2xl mb-10">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Así se usa en hogares, bodegas y emprendimientos</h2>
            <p className="text-ink-600 mt-2">Contenido basado en usos reales: cocina, baño, limpieza rápida y packing para ventas.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'Cocina diaria',
                desc: 'La doble uso soporta grasa y residuos sin rayar ollas ni sartenes en el uso cotidiano.',
                tag: 'Hogar',
              },
              {
                title: 'Bodegas y distribuidores',
                desc: 'Presentación sencilla, precio unitario bajo y pack flexible para rotación rápida.',
                tag: 'Negocios',
              },
              {
                title: 'Emprendedores',
                desc: 'Buena opción para preparar kits de limpieza o combos junto a otros productos del hogar.',
                tag: 'Emprendimiento',
              },
            ].map((item) => (
              <div key={item.title} className="bg-white border border-ink-200 rounded-2xl p-5 hover:border-accent-gold hover:shadow-md transition-all">
                <span className="text-xs font-semibold bg-ink-100 text-ink-700 px-2 py-1 rounded-md">{item.tag}</span>
                <h3 className="mt-3 font-semibold text-lg">{item.title}</h3>
                <p className="text-ink-600 text-sm mt-2 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Precios al por mayor */}
      <section className="py-20 bg-[#EFE7D5]">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Precios al por mayor</h2>
          <p className="text-ink-600 mt-2 max-w-2xl mx-auto">Si sos bodeguero, distribuidor o emprendedor, podemos armar precios por volumen y despachos programados.</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10 text-left">
            {[
              {
                title: 'Pedido base',
                price: 'S/ 150+',
                include: ['Precio por volumen', 'Delivery en Lima', 'Soporte por WhatsApp'],
              },
              {
                title: 'Distribuidor',
                price: 'S/ 350+',
                include: ['Precio preferencial', 'Pedidos recurrentes', 'Prioridad en despacho'],
              },
              {
                title: 'Proyecto a medida',
                price: 'A convenir',
                include: ['Combos custom', 'Packaging propio', 'Entrega programada'],
              },
            ].map((plan) => (
              <div key={plan.title} className="bg-white border border-ink-200 rounded-2xl p-5">
                <h3 className="font-semibold text-lg">{plan.title}</h3>
                <p className="mt-2 text-2xl font-bold">{plan.price}</p>
                <ul className="mt-4 space-y-2 text-sm text-ink-600">
                  {plan.include.map((line) => (
                    <li key={line} className="flex items-center gap-2">
                      <span className="text-green-700">✓</span>
                      {line}
                    </li>
                  ))}
                </ul>
                <button className="mt-5 w-full border border-ink-300 rounded-xl py-2.5 text-sm hover:border-accent-gold transition-colors">
                  Consultar
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Preguntas frecuentes */}
      <section id="preguntas" className="py-20 bg-white border-y border-ink-200">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Preguntas frecuentes</h2>
            <p className="text-ink-600 mt-2">Resolvé las dudas más comunes antes de hacer tu pedido.</p>
          </div>

          <div className="space-y-3">
            {[
              {
                q: '¿Hacen delivery a todo Lima?',
                a: 'Sí. El costo y tiempo dependen del distrito. Coordinamos por WhatsApp después del pedido.',
              },
              {
                q: '¿Puedo comprar desde una sola unidad?',
                a: 'Sí. No hay pedido mínimo para venta minorista. Para mayoristas consultá rangos por cantidad.',
              },
              {
                q: '¿Qué métodos de pago aceptan?',
                a: 'Yape, Plin, transferencia bancaria y contraentrega con recargo según la zona.',
              },
              {
                q: '¿Los precios cambian según cantidad?',
                a: 'Sí, tenemos precios diferenciados para compras por mayor. A mayor volumen, mejor precio final.',
              },
            ].map((item) => (
              <details key={item.q} className="group border border-ink-200 rounded-xl px-5 py-4 open:border-accent-gold transition-colors">
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <span className="font-semibold">{item.q}</span>
                  <span className="text-ink-400 group-open:rotate-180 transition-transform">↓</span>
                </summary>
                <p className="mt-3 text-sm text-ink-600 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Contacto */}
      <section id="contacto" className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-ink-900 text-[#F9F4EB] rounded-3xl px-8 py-12 md:px-14 md:py-16">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">¿Querés hacer un pedido?</h2>
                <p className="text-ink-200">Escribinos por WhatsApp para saber precios actualizados, stock y costo de envío a tu zona.</p>
                <div className="flex flex-wrap gap-3">
                  <a href="https://wa.me/51916165543" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-[#F9F4EB] text-ink-900 px-5 py-3 rounded-xl hover:bg-white transition-colors">
                    WhatsApp
                  </a>
                  <button onClick={() => scrollTo('productos')} className="inline-flex items-center gap-2 border border-ink-300 px-5 py-3 rounded-xl hover:border-[#F9F4EB] transition-colors">
                    Ver productos
                  </button>
                </div>
              </div>

              <div className="bg-white/10 border border-white/15 rounded-2xl p-5 text-sm space-y-3">
                <p>📍 Lurigancho, Lima</p>
                <p>📞 +51 916 165 543</p>
                <p>🕐 Lun a Sáb: 8:00 a. m. – 6:00 p. m.</p>
                <p>💳 Yape / Plin / Transferencia</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <GuiaAnimada mode="landing" />
      <MaryBot />
    </div>
  )
}
