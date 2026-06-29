import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Blog de Esponjas de Limpieza | Maqui Mary - Tips y Guías',
  description: 'Artículos sobre esponjas de limpieza, cómo limpiar ollas quemadas, beneficios de la esponja doble uso y más. Fabricantes peruanos en Lurigancho, Lima.',
  alternates: {
    canonical: 'https://maquimary.com.pe/blog',
  },
  openGraph: {
    title: 'Blog de Esponjas de Limpieza | Maqui Mary - Tips y Guías',
    description: 'Artículos sobre esponjas de limpieza, cómo limpiar ollas quemadas, beneficios de la esponja doble uso y más. Fabricantes peruanos en Lurigancho, Lima.',
    url: 'https://maquimary.com.pe/blog',
    siteName: 'Maqui Mary',
    locale: 'es_PE',
    type: 'website',
    images: [{
      url: 'https://maquimary.com.pe/img/logo_oficial.png',
      width: 1200,
      height: 630,
      alt: 'Blog de Esponjas de Limpieza | Maqui Mary',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog de Esponjas de Limpieza | Maqui Mary - Tips y Guías',
    description: 'Artículos sobre esponjas de limpieza, cómo limpiar ollas quemadas, beneficios de la esponja doble uso y más. Fabricantes peruanos en Lurigancho, Lima.',
    images: ['https://maquimary.com.pe/img/logo_oficial.png'],
  },
}

const POSTS = [
  { slug: 'tipos-esponjas-limpieza-cual-elegir', title: 'Tipos de Esponjas de Limpieza y Cuál Elegir para tu Hogar', desc: 'Guía práctica para elegir entre esponjas de colores, doble uso, de acero y paños absorbentes.', category: 'Guías' },
  { slug: 'como-limpiar-ollas-quemadas', title: 'Cómo Limpiar Ollas Quemadas: Guía Paso a Paso', desc: 'Elimina la grasa quemada con esponjas de acero y doble uso. Técnicas probadas.', category: 'Tips' },
  { slug: 'donde-comprar-esponjas-por-mayor-lima', title: 'Dónde Comprar Esponjas al Por Mayor en Lima', desc: 'Encuentra precios mayoristas competitivos para bodegas y distribuidores.', category: 'Negocios' },
  { slug: 'esponjas-acero-vs-colores-duracion', title: 'Esponjas de Acero vs Esponjas de Colores: ¿Cuál Dura Más?', desc: 'Comparativa honesta de durabilidad y relación calidad-precio.', category: 'Comparativas' },
  { slug: 'usos-pano-absorbente-amarillo', title: 'Paño Absorbente Amarillo: 10 Usos que No Conocías', desc: 'Más allá de secar platos. Descubre usos prácticos para tu hogar.', category: 'Tips' },
  { slug: 'precio-esponjas-limpieza-lima-2026', title: 'Precio de Esponjas de Limpieza en Lima 2026', desc: 'Guía de referencia sobre precios de esponjas en Lima. Comparativa al por mayor y menor.', category: 'Precios' },
  { slug: 'fabricantes-esponjas-peru', title: 'Fabricantes de Esponjas de Limpieza en el Perú', desc: 'Conoce a los fabricantes locales y las ventajas de comprar producto peruano.', category: 'Industria' },
  { slug: 'delivery-esponjas-todo-lima', title: 'Delivery de Esponjas a Todo Lima: Zonas y Costos', desc: 'Descubre si hacemos delivery a tu distrito. Costos y tiempos de entrega.', category: 'Envío' },
  { slug: 'esponja-doble-uso-beneficios', title: 'Beneficios de la Esponja Doble Uso para la Cocina', desc: 'Dos productos en uno: cara suave + cara abrasiva. Ahorro y versatilidad.', category: 'Guías' },
  { slug: 'como-desinfectar-esponjas-cocina', title: 'Cómo Desinfectar Esponjas de Cocina Correctamente', desc: 'Elimina bacterias con métodos simples y seguros. Higiene en la cocina.', category: 'Higiene' },
  { slug: 'venta-esponjas-bodegas-negocios', title: 'Venta de Esponjas para Bodegas y Negocios en Lima', desc: 'Margen de utilidad, rotación y cómo empezar a vender esponjas.', category: 'Negocios' },
  { slug: 'esponjas-ecologicas-vs-tradicionales', title: 'Esponjas Ecológicas vs Tradicionales: ¿Vale la Pena?', desc: 'Comparativa completa: precio, durabilidad e impacto ambiental.', category: 'Comparativas' },
]

export default function BlogIndex() {
  return (
    <div className="min-h-screen bg-accent-cream">
      <header className="bg-ink-900 text-white py-4">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between">
          <Link href="/" className="font-display text-xl text-accent-gold hover:text-white transition-colors">
            ← Maqui Mary
          </Link>
          <span className="text-sm text-ink-300">Blog de Limpieza</span>
        </div>
      </header>

      <section className="bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 text-white py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Blog de Esponjas de Limpieza
          </h1>
          <p className="text-ink-300 text-lg max-w-2xl mx-auto">
            Tips, guías y consejos para mantener tu hogar limpio con productos peruanos de calidad.
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {POSTS.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 border border-ink-100 group"
            >
              <span className="inline-block bg-accent-gold/15 text-accent-gold text-xs font-bold px-2 py-1 rounded-lg mb-3">
                {post.category}
              </span>
              <h2 className="font-heading font-bold text-ink-800 text-lg mb-2 group-hover:text-accent-terracotta transition-colors">
                {post.title}
              </h2>
              <p className="text-ink-500 text-sm">{post.desc}</p>
              <span className="inline-flex items-center gap-1 text-accent-terracotta text-sm font-medium mt-4 group-hover:gap-2 transition-all">
                Leer artículo →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-ink-100 py-12">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-display text-2xl font-bold text-ink-800 mb-4">
            ¿Necesitas esponjas de limpieza?
          </h2>
          <p className="text-ink-500 mb-6">Delivery a todo Lima. Consulta precios por WhatsApp.</p>
          <a
            href="https://wa.me/51916165543?text=¡Hola!%20Quiero%20comprar%20esponjas%20de%20limpieza"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-xl font-heading font-bold inline-flex items-center gap-2 transition-all hover:scale-105"
          >
            💬 Comprar por WhatsApp
          </a>
        </div>
      </section>

      <footer className="bg-ink-900 text-ink-400 py-8 text-center text-sm">
        <p>© {new Date().getFullYear()} Maqui Mary - INVERSIONES MAQUI MARY PERU E.I.R.L.</p>
        <p className="mt-1">RUC: 20606218801</p>
      </footer>
    </div>
  )
}
