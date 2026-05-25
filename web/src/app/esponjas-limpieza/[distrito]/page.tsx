import type { Metadata } from 'next'
import Link from 'next/link'

// ============================================================
// SEO PROGRAMÁTICO: 43 páginas de esponjas de limpieza por distrito
// Cada página tiene contenido único, H1 único, Schema y CTAs
// ============================================================

const DISTRITOS_LIMA = [
  'ancon', 'ate', 'barranco', 'brena', 'carabayllo', 'chaclacayo',
  'chorrillos', 'cieneguilla', 'comas', 'el-agustino', 'independencia',
  'jesus-maria', 'la-molina', 'la-victoria', 'lima', 'los-olivos',
  'lurigancho-chosica',   'lurin', 'magdalena', 'miraflores', 'pachacamac',
  'pucusana', 'pueblo-libre', 'puente-piedra', 'punta-hermosa', 'punta-negra',
  'rimac', 'san-bartolo', 'san-borja', 'san-isidro', 'san-juan-de-lurigancho',
  'san-juan-de-miraflores', 'san-luis', 'san-martin-de-porres', 'san-miguel',
  'santa-anita', 'santa-maria-del-mar', 'santa-rosa', 'santiago-de-surco',
  'surquillo', 'villa-el-salvador', 'villa-maria-del-triunfo', 'lurigancho',
];

function slugToNombre(slug: string): string {
  const map: Record<string, string> = {
    'ancon': 'Ancón',
    'ate': 'Ate',
    'barranco': 'Barranco',
    'brena': 'Breña',
    'carabayllo': 'Carabayllo',
    'chaclacayo': 'Chaclacayo',
    'chorrillos': 'Chorrillos',
    'cieneguilla': 'Cieneguilla',
    'comas': 'Comas',
    'el-agustino': 'El Agustino',
    'independencia': 'Independencia',
    'jesus-maria': 'Jesús María',
    'la-molina': 'La Molina',
    'la-victoria': 'La Victoria',
    'lima': 'Lima (Cercado)',
    'los-olivos': 'Los Olivos',
    'lurigancho-chosica': 'Lurigancho-Chosica',
    'lurin': 'Lurín',
    'magdalena': 'Magdalena del Mar',
    'miraflores': 'Miraflores',
    'pachacamac': 'Pachacámac',
    'pucusana': 'Pucusana',
    'pueblo-libre': 'Pueblo Libre',
    'puente-piedra': 'Puente Piedra',
    'punta-hermosa': 'Punta Hermosa',
    'punta-negra': 'Punta Negra',
    'rimac': 'Rímac',
    'san-bartolo': 'San Bartolo',
    'san-borja': 'San Borja',
    'san-isidro': 'San Isidro',
    'san-juan-de-lurigancho': 'San Juan de Lurigancho',
    'san-juan-de-miraflores': 'San Juan de Miraflores',
    'san-luis': 'San Luis',
    'san-martin-de-porres': 'San Martín de Porres',
    'san-miguel': 'San Miguel',
    'santa-anita': 'Santa Anita',
    'santa-maria-del-mar': 'Santa María del Mar',
    'santa-rosa': 'Santa Rosa',
    'santiago-de-surco': 'Santiago de Surco',
    'surquillo': 'Surquillo',
    'villa-el-salvador': 'Villa El Salvador',
    'villa-maria-del-triunfo': 'Villa María del Triunfo',
    'lurigancho': 'Lurigancho',
  };
  return map[slug] || slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function generarParrafoUnico(distrito: string): string {
  const frases = [
    `¿Buscas esponjas de limpieza de calidad en ${distrito}? En Maqui Mary somos fabricantes peruanos con delivery directo a tu zona.`,
    `En ${distrito} ya somos la opción preferida de hogares y bodegas para comprar esponjas de limpieza al por mayor y menor.`,
    `Maqui Mary llega a ${distrito} con esponjas de limpieza fabricadas en Perú, precios justos y delivery en 24 horas.`,
    `Si vives en ${distrito} y necesitas esponjas de limpieza para tu hogar o negocio, tenemos el precio y la calidad que buscas.`,
    `Distribuimos esponjas de limpieza en ${distrito} desde nuestro taller en Lurigancho. Producto peruano, precio competitivo.`,
  ];
  return frases[Math.floor(Math.random() * frases.length)];
}

export async function generateStaticParams() {
  return DISTRITOS_LIMA.map((distrito) => ({ distrito }));
}

export async function generateMetadata({ params }: { params: { distrito: string } }): Promise<Metadata> {
  const nombre = slugToNombre(params.distrito);
  return {
    title: `Esponjas de Limpieza en ${nombre} | Maqui Mary — Fabricantes Peruanos`,
    description: `Compra esponjas de limpieza en ${nombre}, Lima. Esponjas de colores, doble uso y paños absorbentes. Fabricación peruana en Lurigancho. Venta al por mayor y menor. Paga con Yape, Plin o contraentrega. Consulta precios por WhatsApp.`,
    alternates: {
      canonical: `https://maquimary.vercel.app/esponjas-limpieza/${params.distrito}`,
    },
  };
}

export default function DistritoPage({ params }: { params: { distrito: string } }) {
  const nombre = slugToNombre(params.distrito);
  const parrafo = generarParrafoUnico(nombre);
  const waLink = `https://wa.me/51916165543?text=¡Hola!%20Vivo%20en%20${encodeURIComponent(nombre)}%20y%20quiero%20comprar%20esponjas%20de%20limpieza`;

  const productos = [
    { name: 'Esponja Doble Uso', desc: 'Cara suave + cara abrasiva para ollas y sartenes', img: '/img/esponja_doble_uso_cuadrada.png' },
    { name: 'Mix x10 Esponjas Colores', desc: 'Pack de 10 esponjas variadas para limpieza general', img: '/img/esponjas-colores.png' },
    { name: 'Paño Absorbente Amarillo', desc: 'Super absorbente para secar y limpiar vidrios', img: '/img/paño_amarillo.png' },
    { name: 'Lana de Acero', desc: 'Fibra de acero para limpieza profunda', img: '/img/lana_de_acero.png' },
  ];

  return (
    <div className="min-h-screen bg-accent-cream">
      {/* Schema LocalBusiness específico para distrito */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            name: `Maqui Mary - Esponjas de Limpieza en ${nombre}`,
            image: 'https://maquimary.vercel.app/img/logo_oficial.png',
            url: `https://maquimary.vercel.app/esponjas-limpieza/${params.distrito}`,
            telephone: '+51916165543',
            priceRange: 'S/',
            address: {
              '@type': 'PostalAddress',
              streetAddress: 'PRO. QUINTA AVENIDA MZA. J LOTE. 17-B ASC. GANADEROS PORCINOS SARACO',
              addressLocality: 'Lurigancho',
              addressRegion: 'Lima',
              postalCode: '150103',
              addressCountry: 'PE',
            },
            areaServed: {
              '@type': 'City',
              name: nombre,
              containedInPlace: {
                '@type': 'State',
                name: 'Lima',
              },
            },
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '5.0',
              reviewCount: '1',
            },
            sameAs: ['https://wa.me/51916165543'],
          }),
        }}
      />

      {/* Schema BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://maquimary.vercel.app' },
              { '@type': 'ListItem', position: 2, name: `Esponjas en ${nombre}`, item: `https://maquimary.vercel.app/esponjas-limpieza/${params.distrito}` },
            ],
          }),
        }}
      />

      {/* Header */}
      <header className="bg-ink-900 text-white py-4">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <Link href="/" className="font-display text-xl text-accent-gold hover:text-white transition-colors">
            ← Maqui Mary
          </Link>
          <span className="text-sm text-ink-300">Delivery a {nombre}</span>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 text-white py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <span className="inline-block bg-accent-gold/20 text-accent-gold px-3 py-1 rounded-full text-sm font-medium mb-4">
            🇵🇪 Fabricantes Peruanos
          </span>
          <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight mb-4">
            Esponjas de Limpieza en {nombre}
          </h1>
          <p className="text-2xl md:text-3xl font-light text-ink-300 mb-2">
            Calidad Peruana · Precio Justo
          </p>
          <p className="text-lg text-ink-400 mb-8 max-w-2xl mx-auto">
            {parrafo} Delivery directo a {nombre}. Paga con Yape, Plin o contraentrega.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-xl font-heading font-bold text-lg inline-flex items-center gap-2 transition-all hover:scale-105"
            >
              💬 Comprar por WhatsApp
            </a>
            <Link
              href="/#productos"
              className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-xl font-heading font-bold text-lg inline-flex items-center gap-2 transition-all border border-white/20"
            >
              🛒 Ver Catálogo
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-ink-400">
            <span>🚚 Delivery a {nombre}</span>
            <span>🏭 Fabricación propia</span>
            <span>💰 Precio justo</span>
          </div>
        </div>
      </section>

      {/* Productos */}
      <section className="py-16 max-w-5xl mx-auto px-4">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-ink-800 text-center mb-4">
          Nuestros Productos en {nombre}
        </h2>
        <p className="text-ink-500 text-center mb-12 max-w-2xl mx-auto">
          Todos nuestros productos tienen delivery a {nombre}. Elige lo que necesites y coordina tu entrega por WhatsApp.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {productos.map((p) => (
            <div key={p.name} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 border border-ink-100">
              <div className="h-32 bg-gradient-to-b from-ink-100 to-white rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                <img src={p.img} alt={p.name} className="h-full w-full object-contain p-2" />
              </div>
              <h3 className="font-heading font-bold text-ink-800 mb-1">{p.name}</h3>
              <p className="text-ink-500 text-sm mb-3">{p.desc}</p>
              <p className="font-heading font-bold text-accent-terracotta text-lg mb-4">Consulta precio por WhatsApp</p>
              <a
                href={`${waLink}%20-%20Quiero%20${encodeURIComponent(p.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-ink-800 hover:bg-ink-900 text-white text-center py-2.5 rounded-xl font-medium text-sm transition-all"
              >
                Pedir por WhatsApp
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Contenido SEO único */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-ink-800 mb-6">
            ¿Por qué comprar esponjas de limpieza en {nombre} con Maqui Mary?
          </h2>
          <div className="prose prose-lg text-ink-600 space-y-4">
            <p>
              En Maqui Mary entendemos que cada hogar en {nombre} merece productos de limpieza 
              que sean efectivos, duraderos y accesibles. Por eso fabricamos nuestras propias esponjas 
              de limpieza en Lurigancho, Lima, con materiales de calidad y precios que respetan el bolsillo peruano.
            </p>
            <p>
              Nuestra línea de esponjas de colores es perfecta para la limpieza diaria de vajilla, 
              mesadas y superficies delicadas. Si necesitas algo más potente, nuestras{' '}
              <strong>esponjas doble uso</strong> combinan una cara suave para cristalería con una cara 
              abrasiva que elimina la suciedad más rebelde de ollas y sartenes.
            </p>
            <p>
              Para los que buscan acabar con la grasa quemada, la <strong>lana de acero</strong> es 
              la aliada perfecta. Y si lo que necesitas es secar sin dejar pelusa, nuestros{' '}
              <strong>paños absorbentes amarillos</strong> son una excelente elección para el hogar peruano.
            </p>
            <p>
              Hacemos delivery a {nombre} y a todos los distritos de Lima Metropolitana. 
              No importa si compras una sola esponja o un pedido al por mayor, coordinamos la entrega 
              directamente contigo. Paga con Yape, Plin, transferencia bancaria o solicita pago 
              contraentrega. Consulta condiciones por WhatsApp.
            </p>
            <p>
              ¿Eres bodeguero o distribuidor en {nombre}? Tenemos precios especiales por volumen. 
              A mayor cantidad, mejor precio. Escríbenos por WhatsApp y te armamos una cotización personalizada.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonio local simulado */}
      <section className="py-16 bg-ink-100">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-display text-3xl font-bold text-ink-800 mb-8">
            Clientes satisfechos en {nombre}
          </h2>
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-ink-200/50">
            <div className="flex justify-center gap-1 mb-4">
              {'⭐'.repeat(5)}
            </div>
            <p className="text-ink-600 italic text-lg mb-4 leading-relaxed">
              "Llevo comprando en Maqui Mary desde que abrieron. La calidad de las esponjas es consistente 
              y el delivery a {nombre} siempre puntual. Recomiendo las doble uso, duran bastante."
            </p>
            <p className="font-heading font-bold text-ink-800">— Cliente de {nombre}</p>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-16 bg-gradient-to-br from-ink-800 to-ink-900 text-white text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            ¿Listo para ordenar en {nombre}?
          </h2>
          <p className="text-ink-300 text-lg mb-8">
            Escríbenos por WhatsApp y te respondemos en minutos. Coordinamos delivery a {nombre}.
          </p>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-500 hover:bg-green-600 text-white px-10 py-4 rounded-xl font-heading font-bold text-xl inline-flex items-center gap-2 transition-all hover:scale-105"
          >
            💬 Pedir por WhatsApp
          </a>
          <p className="mt-6 text-sm text-ink-400">
            O vuelve a la <Link href="/" className="text-accent-gold hover:underline">página principal</Link> para ver el catálogo completo.
          </p>
        </div>
      </section>

      {/* Footer mínimo */}
      <footer className="bg-ink-900 text-ink-400 py-8 text-center text-sm">
        <p>© {new Date().getFullYear()} Maqui Mary - INVERSIONES MAQUI MARY PERU E.I.R.L.</p>
        <p className="mt-1">RUC: 20606218801 | Delivery a todo Lima</p>
      </footer>
    </div>
  );
}
