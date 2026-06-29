import type { Metadata } from 'next'
import Link from 'next/link'

// ============================================================
// BLOG SEO: 12 artículos estratégicos para posicionar en Google
// ============================================================

const POSTS = [
  {
    slug: 'tipos-esponjas-limpieza-cual-elegir',
    title: 'Tipos de Esponjas de Limpieza y Cuál Elegir para tu Hogar',
    desc: 'Descubre las diferencias entre esponjas de colores, doble uso, de acero y paños absorbentes. Guía práctica para elegir la ideal.',
    keywords: ['tipos de esponjas', 'cómo elegir esponja', 'esponjas de limpieza perú'],
  },
  {
    slug: 'como-limpiar-ollas-quemadas',
    title: 'Cómo Limpiar Ollas Quemadas: Guía Paso a Paso',
    desc: 'Aprende a eliminar la grasa quemada de tus ollas con esponjas de acero y doble uso. Técnicas probadas por Maqui Mary.',
    keywords: ['limpiar ollas quemadas', 'quitar grasa quemada', 'esponja para ollas'],
  },
  {
    slug: 'donde-comprar-esponjas-por-mayor-lima',
    title: 'Dónde Comprar Esponjas al Por Mayor en Lima',
    desc: 'Encuentra los mejores precios para comprar esponjas de limpieza al por mayor en Lima. Descuentos desde 15% por volumen.',
    keywords: ['esponjas al por mayor lima', 'distribuidor esponjas', 'precio mayorista esponjas'],
  },
  {
    slug: 'esponjas-acero-vs-colores-duracion',
    title: 'Esponjas de Acero vs Esponjas de Colores: ¿Cuál Dura Más?',
    desc: 'Comparativa honesta entre esponjas metálicas y esponjas de fibra. Durabilidad, uso recomendado y relación calidad-precio.',
    keywords: ['esponja de acero duración', 'esponja de colores vs acero', 'qué esponja dura más'],
  },
  {
    slug: 'usos-pano-absorbente-amarillo',
    title: 'Paño Absorbente Amarillo: 10 Usos que No Conocías',
    desc: 'Más allá de secar platos. Descubre 10 usos prácticos del paño absorbente amarillo para tu hogar y negocio.',
    keywords: ['usos paño absorbente', 'paño amarillo limpieza', 'para qué sirve paño absorbente'],
  },
  {
    slug: 'precio-esponjas-limpieza-lima-2026',
    title: 'Precio de Esponjas de Limpieza en Lima 2026',
    desc: 'Conoce los precios actualizados de esponjas de limpieza en Lima. Desde S/2.50 la unidad. Comparativa de precios al por mayor y menor.',
    keywords: ['precio esponjas lima', 'cuánto cuesta esponja de limpieza', 'esponjas baratas lima'],
  },
  {
    slug: 'fabricantes-esponjas-peru',
    title: 'Fabricantes de Esponjas de Limpieza en el Perú',
    desc: 'Conoce a los principales fabricantes de esponjas de limpieza en Perú. Por qué elegir producto nacional sobre importado.',
    keywords: ['fabricantes esponjas perú', 'esponjas peruanas', 'fábrica de esponjas lima'],
  },
  {
    slug: 'delivery-esponjas-todo-lima',
    title: 'Delivery de Esponjas a Todo Lima: Zonas y Costos',
    desc: 'Descubre si hacemos delivery a tu distrito en Lima. Costos de envío, tiempo de entrega y zonas de cobertura.',
    keywords: ['delivery esponjas lima', 'envío esponjas lima', 'esponjas delivery'],
  },
  {
    slug: 'esponja-doble-uso-beneficios',
    title: 'Beneficios de la Esponja Doble Uso para la Cocina',
    desc: 'Una cara suave para cristalería, otra cara abrasiva para ollas. Conoce por qué la esponja doble uso es la favorita de las cocinas peruanas.',
    keywords: ['esponja doble uso beneficios', 'esponja para cocina', 'limpieza ollas esponja'],
  },
  {
    slug: 'como-desinfectar-esponjas-cocina',
    title: 'Cómo Desinfectar Esponjas de Cocina Correctamente',
    desc: 'Las esponjas acumulan bacterias. Aprende a desinfectarlas correctamente para mantener tu cocina higiénica y segura.',
    keywords: ['desinfectar esponja cocina', 'higiene esponja', 'limpiar esponja'],
  },
  {
    slug: 'venta-esponjas-bodegas-negocios',
    title: 'Venta de Esponjas para Bodegas y Negocios en Lima',
    desc: 'Si tienes una bodega o minimarket, descubre cómo vender esponjas de limpieza con buena utilidad. Margen y rotación.',
    keywords: ['venta esponjas bodega', 'esponjas para negocio', 'distribuir esponjas lima'],
  },
  {
    slug: 'esponjas-ecologicas-vs-tradicionales',
    title: 'Esponjas Ecológicas vs Tradicionales: ¿Vale la Pena?',
    desc: 'Comparativa entre esponjas biodegradables y esponjas tradicionales. Precio, durabilidad y impacto ambiental.',
    keywords: ['esponjas ecológicas', 'esponjas biodegradables', 'esponjas amigables ambiente'],
  },
];

export async function generateStaticParams() {
  return POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = POSTS.find((p) => p.slug === params.slug);
  if (!post) {
    return { title: 'Blog Maqui Mary' };
  }
  const title = `${post.title} | Maqui Mary`;
  const url = `https://maquimary.com.pe/blog/${post.slug}`;
  return {
    title,
    description: post.desc,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: post.desc,
      url,
      siteName: 'Maqui Mary',
      locale: 'es_PE',
      type: 'article',
      publishedTime: '2026-05-24',
      authors: ['Maqui Mary'],
      images: [{
        url: 'https://maquimary.com.pe/img/logo_oficial.png',
        width: 1200,
        height: 630,
        alt: post.title,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: post.desc,
      images: ['https://maquimary.com.pe/img/logo_oficial.png'],
    },
  };
}

function generarContenido(slug: string): { html: string; faq: { q: string; a: string }[] } {
  const faqs: Record<string, { q: string; a: string }[]> = {
    'tipos-esponjas-limpieza-cual-elegir': [
      { q: '¿Qué esponja es mejor para lavar platos?', a: 'La esponja de colores es ideal para platos y cristalería porque es suave y no raye. Para ollas con grasa quemada, usa la doble uso o lana de acero.' },
      { q: '¿Cuánto dura una esponja de limpieza?', a: 'Con uso diario, una esponja de buena calidad dura entre 2 y 4 semanas. Las de acero duran más para limpieza profunda.' },
      { q: '¿Es mejor la esponja natural o sintética?', a: 'Las sintéticas son más duraderas y económicas. Las naturales son biodegradables pero se desgastan más rápido.' },
    ],
    'como-limpiar-ollas-quemadas': [
      { q: '¿Cómo quitar la grasa quemada de una olla?', a: 'Usa una esponja de acero o la cara abrasiva de una esponja doble uso con agua caliente y jabón. Frota en círculos.' },
      { q: '¿La lana de acero raya las ollas?', a: 'En ollas de acero inoxidable no raya si se usa correctamente. Evítala en teflón o superficies antiadherentes.' },
      { q: '¿Qué producto usar con la esponja para ollas quemadas?', a: 'Jabón líquido para platos es suficiente. Para casos difíciles, bicarbonato de sodio es un excelente aliado.' },
    ],
    'donde-comprar-esponjas-por-mayor-lima': [
      { q: '¿Dónde compro esponjas al por mayor en Lima?', a: 'Maqui Mary ofrece precios mayoristas para compras por volumen con delivery a todo Lima. Escríbenos por WhatsApp para una cotización.' },
      { q: '¿Cuál es el precio al por mayor de esponjas?', a: 'Consulta precios actualizados por WhatsApp. A mayor volumen, mejor precio.' },
    ],
    'esponjas-acero-vs-colores-duracion': [
      { q: '¿Cuál dura más: esponja de acero o de colores?', a: 'La de acero dura más para limpieza pesada, pero no es versátil. La de colores dura 2-4 semanas y es más suave.' },
      { q: '¿La esponja de acero es mejor?', a: 'Depende del uso. Para grasa quemada, sí. Para platos delicados, no. Cada una tiene su propósito.' },
    ],
    'usos-pano-absorbente-amarillo': [
      { q: '¿Para qué sirve el paño absorbente amarillo?', a: 'Secar platos, limpiar vidrios sin pelusa, pulir muebles, absorber derrames y limpiar superficies de cocina.' },
      { q: '¿El paño amarillo deja pelusa?', a: 'Un paño absorbente de calidad no deja pelusa. Los de microfibra son especialmente buenos para vidrios y espejos.' },
    ],
    'precio-esponjas-limpieza-lima-2026': [
      { q: '¿Cuánto cuesta una esponja de limpieza en Lima?', a: 'Los precios varían según el tipo, la calidad y el canal de compra. En Maqui Mary consulta precios actualizados por WhatsApp.' },
      { q: '¿Dónde encuentro esponjas con buen precio en Lima?', a: 'Comprando directo al fabricante. Maqui Mary es fabricante en Lurigancho, Lima, sin intermediarios.' },
    ],
    'fabricantes-esponjas-peru': [
      { q: '¿Existen fábricas de esponjas en Perú?', a: 'Sí, Maqui Mary es una de ellas. Fabricamos en Lurigancho, Lima, con materiales de calidad y mano de obra peruana.' },
      { q: '¿Por qué comprar esponjas peruanas?', a: 'Apoyas la economía local, obtienes mejor precio al eliminar importación y recibes productos adaptados al uso peruano.' },
    ],
    'delivery-esponjas-todo-lima': [
      { q: '¿Hacen delivery de esponjas a mi distrito?', a: 'Sí, hacemos delivery a todos los distritos de Lima. El costo varía según la zona. Consulta tu tarifa por WhatsApp.' },
      { q: '¿Cuánto tarda el delivery de esponjas en Lima?', a: 'Coordinamos el tiempo de entrega según tu ubicación y la disponibilidad. Para pedidos grandes, acordamos día y hora.' },
    ],
    'esponja-doble-uso-beneficios': [
      { q: '¿Qué es una esponja doble uso?', a: 'Tiene una cara suave para cristalería y superficies delicadas, y una cara abrasiva para ollas y grasa difícil.' },
      { q: '¿Por qué la esponja doble uso es la más vendida?', a: 'Porque reemplaza a dos esponjas en una. Es versátil, ahorra dinero y espacio en la cocina.' },
    ],
    'como-desinfectar-esponjas-cocina': [
      { q: '¿Cómo desinfectar una esponja de cocina?', a: 'Mójala y ponla en el microondas 1-2 minutos, o sumérgela en agua con cloro por 5 minutos. Deja secar completamente entre usos.' },
      { q: '¿Cuándo debo cambiar la esponja de cocina?', a: 'Cada 2-4 semanas, o antes si huele mal, cambia de color o se desintegra.' },
    ],
    'venta-esponjas-bodegas-negocios': [
      { q: '¿Es rentable vender esponjas en una bodega?', a: 'Sí, las esponjas son un producto de consumo masivo con alta rotación. El margen es bueno si compras al por mayor.' },
      { q: '¿Cuánto puedo ganar vendiendo esponjas?', a: 'Depende del precio de compra y de venta. Comprando al por mayor en Maqui Mary obtienes precio directo de fábrica.' },
    ],
    'esponjas-ecologicas-vs-tradicionales': [
      { q: '¿Las esponjas ecológicas son mejores?', a: 'Son biodegradables y amigables con el ambiente, pero suelen durar menos y costar más. La elección depende de tus prioridades.' },
      { q: '¿Hay esponjas biodegradables en Perú?', a: 'Sí, aunque el mercado es limitado. Maqui Mary está evaluando alternativas sostenibles para su línea de productos.' },
    ],
  };

  const contenidos: Record<string, string> = {
    'tipos-esponjas-limpieza-cual-elegir': `
      <p>En el mercado peruano existe una gran variedad de esponjas de limpieza, y elegir la correcta puede marcar la diferencia entre una limpieza eficiente y una que raye tus superficies. En Maqui Mary fabricamos cuatro tipos principales adaptados a las necesidades del hogar peruano.</p>
      <h3>Esponjas de Colores</h3>
      <p>Las esponjas de colores son las más versátiles para el uso diario. Su textura suave las hace perfectas para lavar platos, vasos, cristalería y superficies delicadas sin dejar rayas. Consulta precios de nuestros packs por WhatsApp.</p>
      <h3>Esponjas Doble Uso</h3>
      <p>La estrella de la cocina peruana. Una cara suave para cristalería y otra cara abrasiva para eliminar la grasa quemada de las ollas. Consulta precio por WhatsApp.</p>
      <h3>Lana de Acero</h3>
      <p>Para la limpieza profunda que la grasa exige. Indispensable en cocinas donde se cocina a diario con mucho aceite. Consulta precio por WhatsApp.</p>
      <h3>Paños Absorbentes Amarillos</h3>
      <p>No son esponjas propiamente dichas, pero complementan perfectamente el kit de limpieza. Super absorbentes para secar platos y limpiar vidrios sin dejar pelusa. Consulta precio por WhatsApp.</p>
    `,
    'como-limpiar-ollas-quemadas': `
      <p>La grasa quemada es el enemigo número uno de cualquier cocina peruana. Con los adobos, saltados y frituras constantes, las ollas inevitablemente acumulan capas de grasa carbonizada. Aquí te enseñamos cómo eliminarla eficazmente.</p>
      <h3>Paso 1: Remoja la olla</h3>
      <p>Llena la olla con agua caliente y jabón. Déjala reposar 30 minutos para ablandar la grasa.</p>
      <h3>Paso 2: Usa la esponja correcta</h3>
      <p>Toma una <strong>esponja doble uso</strong> de Maqui Mary y usa la cara abrasiva. Frota en círculos sobre la zona afectada. La combinación de la fibra abrasiva con el jabón desintegra la grasa.</p>
      <h3>Paso 3: Para casos extremos, lana de acero</h3>
      <p>Si la grasa está carbonizada y no sale con la esponja doble uso, usa <strong>lana de acero</strong>. Es más agresiva pero eficaz. Aplica presión moderada para no dañar el acero inoxidable.</p>
      <h3>Paso 4: Enjuaga y seca</h3>
      <p>Lava con agua tibia y seca la olla con un <strong>paño absorbente amarillo</strong> para evitar manchas de agua.</p>
    `,
    'donde-comprar-esponjas-por-mayor-lima': `
      <p>Si tienes una bodega, minimarket o eres distribuidor, comprar esponjas al por mayor en Lima es una excelente oportunidad de negocio. Te explicamos por qué Maqui Mary es tu mejor opción.</p>
      <h3>Precios mayoristas competitivos</h3>
      <p>Al ser fabricantes en Lurigancho, Lima, eliminamos intermediarios. Esto nos permite ofrecer mejores precios para compras por volumen. Consulta descuentos por cantidad por WhatsApp.</p>
      <h3>Delivery a todo Lima</h3>
      <p>No necesitas ir a la fábrica. Coordinamos el delivery de tu pedido al por mayor a cualquier distrito de Lima.</p>
      <h3>Calidad consistente</h3>
      <p>Todas nuestras esponjas pasan control de calidad. Tus clientes recibirán siempre el mismo producto confiable.</p>
    `,
    'esponjas-acero-vs-colores-duracion': `
      <p>Una de las preguntas más frecuentes entre nuestros clientes es cuál esponja dura más. La respuesta depende del uso que le des.</p>
      <h3>Durabilidad de la esponja de colores</h3>
      <p>Con uso diario para platos y superficies delicadas, dura de 2 a 4 semanas. Se desgasta principalmente por el roce y la acumulación de jabón.</p>
      <h3>Durabilidad de la lana de acero</h3>
      <p>La lana de acero no se "desgasta" como tal, pero se oxida y pierde fibras con el uso. En limpieza ocasional de ollas puede durar varios meses. En uso diario, 1-2 meses.</p>
      <h3>Veredicto</h3>
      <p>Para limpieza general diaria, la esponja de colores es más económica a largo plazo. Para limpieza pesada ocasional, la lana de acero rinde más.</p>
    `,
    'usos-pano-absorbente-amarillo': `
      <p>El paño absorbente amarillo es uno de los productos más subestimados del hogar. Más allá de secar platos, tiene decenas de aplicaciones prácticas.</p>
      <h3>1. Secar platos y cristalería</h3>
      <p>Su función principal. No deja pelusa ni marcas de agua en vasos y copas.</p>
      <h3>2. Limpiar vidrios y espejos</h3>
      <p>Humedece el paño con agua y vinagre blanco. Limpia vidrios dejando un brillo impecable.</p>
      <h3>3. Absorber derrames</h3>
      <p>Derramaste jugo o agua? El paño absorbente amarillo retiene varias veces su peso en líquido.</p>
      <h3>4. Limpiar superficies de cocina</h3>
      <p>Perfecto para mesadas, azulejos y el área de cocina después de preparar comida.</p>
      <h3>5. Pulir muebles</h3>
      <p>Para muebles de madera, un paño ligeramente humedecido elimina el polvo sin dañar el acabado.</p>
    `,
    'precio-esponjas-limpieza-lima-2026': `
      <p>En 2026, el precio de las esponjas de limpieza en Lima varía según la calidad y el canal de compra. Te presentamos una guía de referencia.</p>
      <h3>Factores que influyen en el precio</h3>
      <ul><li>Tipo de esponja (colores, doble uso, acero)</li><li>Cantidad (por mayor es más económico)</li><li>Calidad de los materiales</li><li>Si compras al fabricante o a un intermediario</li></ul>
      <h3>Precios al por mayor</h3>
      <p>Comprando directo al fabricante como Maqui Mary, los precios son más competitivos porque eliminas intermediarios. Consulta nuestra lista de precios por WhatsApp.</p>
      <h3>Consejo</h3>
      <p>Evita comprar esponjas importadas de dudosa calidad. El producto peruano de fabricantes locales como Maqui Mary ofrece mejor relación calidad-precio.</p>
    `,
    'fabricantes-esponjas-peru': `
      <p>Perú cuenta con fabricantes locales de esponjas de limpieza que compiten en calidad con productos importados. Conocerlos te ayuda a tomar mejores decisiones de compra.</p>
      <h3>Maqui Mary: Fabricantes en Lurigancho</h3>
      <p>Ubicados en Lurigancho, Lima, producimos esponjas de colores, doble uso, lana de acero y paños absorbentes. Usamos materiales que cumplen estándares de calidad y ofrecemos precio directo de fábrica.</p>
      <h3>Ventajas de comprar nacional</h3>
      <ul><li>Mejor precio al eliminar costos de importación</li><li>Delivery más rápido dentro de Lima</li><li>Apoyo a la economía y empleo peruano</li><li>Productos adaptados al uso local</li></ul>
    `,
    'delivery-esponjas-todo-lima': `
      <p>Una de las mayores ventajas de comprar con Maqui Mary es que hacemos delivery de esponjas a cualquier distrito de Lima Metropolitana.</p>
      <h3>Zonas de cobertura</h3>
      <p>Cubrimos los 43 distritos de Lima, desde Ancón hasta Villa María del Triunfo, incluyendo distritos del cono norte, sur, este y oeste.</p>
      <h3>Costos de envío</h3>
      <p>El costo de delivery varía según la zona de entrega. Consulta tu tarifa exacta por WhatsApp. Tenemos precios especiales por volumen para bodegueros y distribuidores.</p>
      <h3>Tiempos de entrega</h3>
      <p>Coordinamos el tiempo de entrega según tu ubicación y la disponibilidad. Para pedidos al por mayor, acordamos día y hora.</p>
    `,
    'esponja-doble-uso-beneficios': `
      <p>La esponja doble uso es nuestro producto estrella y el favorito de las cocinas peruanas. Descubre por qué.</p>
      <h3>Dos productos en uno</h3>
      <p>La cara suave lava platos, vasos y superficies delicadas. La cara abrasiva ataca la grasa quemada de ollas y sartenes. No necesitas tener dos esponjas separadas.</p>
      <h3>Ahorro real</h3>
      <p>Con la esponja doble uso reemplazas a una esponja suave y un estropajo en un solo producto. En el mes ahorras espacio y dinero.</p>
      <h3>Durabilidad</h3>
      <p>Con uso moderado dura de 2 a 4 semanas. La cara abrasiva se desgasta primero, pero la cara suave sigue funcionando.</p>
    `,
    'como-desinfectar-esponjas-cocina': `
      <p>Las esponjas de cocina son un caldo de cultivo para bacterias si no se cuidan. Aprende a desinfectarlas correctamente.</p>
      <h3>Método 1: Microondas</h3>
      <p>Moja bien la esponja (debe estar húmeda, no seca) y ponla en el microondas por 1-2 minutos a máxima potencia. Elimina hasta el 99% de bacterias.</p>
      <h3>Método 2: Agua con cloro</h3>
      <p>Prepara una solución de una cucharada de cloro por litro de agua. Sumerge la esponja 5 minutos. Enjuaga bien después.</p>
      <h3>Método 3: Lavavajillas</h3>
      <p>Si tienes lavavajillas, pon la esponja en el ciclo de lavado. El agua caliente y el detergente la desinfectan.</p>
      <h3>Consejos de prevención</h3>
      <p>No dejes la esponja encharcada. Exprímela después de cada uso y ponla en un lugar ventilado. Cámbiala cada 2-4 semanas.</p>
    `,
    'venta-esponjas-bodegas-negocios': `
      <p>Las esponjas de limpieza son un producto de consumo masivo con rotación constante. Si tienes una bodega o negocio en Lima, venderlas puede ser una buena fuente de ingresos.</p>
      <h3>Margen de utilidad</h3>
      <p>Comprando al por mayor en Maqui Mary, tu margen mejora porque compras a precio directo de fábrica sin intermediarios.</p>
      <h3>Rotación</h3>
      <p>Las esponjas son de consumo recurrente. Un cliente que compra una hoy, volverá en 2-4 semanas por otra. Esto garantiza ventas repetidas.</p>
      <h3>Cómo empezar</h3>
      <p>Escríbenos por WhatsApp con la cantidad que quieres. Te enviamos la lista de precios mayoristas y coordinamos el primer delivery.</p>
    `,
    'esponjas-ecologicas-vs-tradicionales': `
      <p>La tendencia ecológica ha llegado al mundo de las esponjas. Te explicamos las diferencias entre esponjas tradicionales y biodegradables.</p>
      <h3>Esponjas tradicionales</h3>
      <p>Hechas de poliuretano y abrasivos sintéticos. Duran más, cuestan menos, pero no son biodegradables y pueden liberar microplásticos.</p>
      <h3>Esponjas ecológicas</h3>
      <p>Fabricadas con celulosa natural, fibras de coco o algodón orgánico. Se degradan en meses, pero duran menos y cuestan más.</p>
      <h3>Comparativa</h3>
      <table style="width:100%;border-collapse:collapse;margin:1rem 0;"><tr style="background:#f3f4f6"><th style="padding:8px;border:1px solid #ddd">Característica</th><th style="padding:8px;border:1px solid #ddd">Tradicional</th><th style="padding:8px;border:1px solid #ddd">Ecológica</th></tr><tr><td style="padding:8px;border:1px solid #ddd">Precio</td><td style="padding:8px;border:1px solid #ddd">Bajo</td><td style="padding:8px;border:1px solid #ddd">Alto</td></tr><tr><td style="padding:8px;border:1px solid #ddd">Durabilidad</td><td style="padding:8px;border:1px solid #ddd">2-4 semanas</td><td style="padding:8px;border:1px solid #ddd">1-2 semanas</td></tr><tr><td style="padding:8px;border:1px solid #ddd">Biodegradable</td><td style="padding:8px;border:1px solid #ddd">No</td><td style="padding:8px;border:1px solid #ddd">Sí</td></tr></table>
    `,
  };

  return {
    html: contenidos[slug] || '<p>Contenido del artículo.</p>',
    faq: faqs[slug] || [],
  };
}

export default function BlogPost({ params }: { params: { slug: string } }) {
  const post = POSTS.find((p) => p.slug === params.slug);
  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Artículo no encontrado</p>
      </div>
    );
  }

  const { html, faq } = generarContenido(params.slug);
  const waLink = `https://wa.me/51916165543?text=¡Hola!%20Leí%20tu%20artículo%20${encodeURIComponent(post.title)}`;

  return (
    <div className="min-h-screen bg-accent-cream">
      {/* Schema Article + FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: post.title,
            description: post.desc,
            author: {
              '@type': 'Organization',
              name: 'Maqui Mary',
            },
            publisher: {
              '@type': 'Organization',
              name: 'Maqui Mary',
              logo: {
                '@type': 'ImageObject',
                url: 'https://maquimary.com.pe/img/logo_oficial.png',
              },
            },
            url: `https://maquimary.com.pe/blog/${post.slug}`,
            datePublished: '2026-05-24',
            dateModified: '2026-05-24',
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': `https://maquimary.com.pe/blog/${post.slug}`,
            },
          }),
        }}
      />

      {faq.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: faq.map((f) => ({
                '@type': 'Question',
                name: f.q,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: f.a,
                },
              })),
            }),
          }}
        />
      )}

      <header className="bg-ink-900 text-white py-4">
        <div className="max-w-3xl mx-auto px-4">
          <Link href="/" className="font-display text-xl text-accent-gold hover:text-white transition-colors">
            ← Maqui Mary
          </Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-4 py-12">
        <span className="inline-block bg-accent-gold/20 text-accent-gold px-3 py-1 rounded-full text-sm font-medium mb-4">
          Blog Maqui Mary
        </span>
        <h1 className="font-display text-3xl md:text-5xl font-bold text-ink-800 mb-4 leading-tight">
          {post.title}
        </h1>
        <p className="text-ink-500 text-lg mb-8">{post.desc}</p>

        <div
          className="prose prose-lg prose-headings:font-display prose-headings:text-ink-800 prose-p:text-ink-600 prose-strong:text-ink-800 prose-ul:text-ink-600 prose-li:marker:text-accent-terracotta max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* CTA */}
        <div className="mt-12 bg-gradient-to-br from-ink-800 to-ink-900 rounded-2xl p-8 text-white text-center">
          <h3 className="font-display text-2xl font-bold mb-3">¿Quieres comprar esponjas de calidad?</h3>
          <p className="text-ink-300 mb-6">Delivery a todo Lima. Consulta precios por WhatsApp.</p>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-xl font-heading font-bold inline-flex items-center gap-2 transition-all hover:scale-105"
          >
            💬 Comprar por WhatsApp
          </a>
        </div>

        {/* FAQ Section visible */}
        {faq.length > 0 && (
          <div className="mt-12">
            <h2 className="font-display text-2xl font-bold text-ink-800 mb-6">Preguntas Frecuentes</h2>
            <div className="space-y-4">
              {faq.map((f, idx) => (
                <div key={idx} className="bg-white rounded-xl p-6 border border-ink-200 shadow-sm">
                  <h3 className="font-heading font-bold text-ink-800 mb-2">{f.q}</h3>
                  <p className="text-ink-600">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </article>

      <footer className="bg-ink-900 text-ink-400 py-8 text-center text-sm">
        <p>© {new Date().getFullYear()} Maqui Mary - INVERSIONES MAQUI MARY PERU E.I.R.L.</p>
        <p className="mt-1">RUC: 20606218801</p>
      </footer>
    </div>
  );
}
