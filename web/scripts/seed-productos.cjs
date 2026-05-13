const { createClient } = require('@supabase/supabase-js')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

async function seed() {
  console.log('🌱 Sembrando productos...')
  const sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Primero limpia todo
  const { error: delErr } = await sb.from('productos').delete().neq('id', 0)
  if (delErr) console.error('❌ Error limpiando:', delErr.message)
  else console.log('✅ Productos anteriores eliminados')

  const productos = [
    {
      name: 'Mix x10 Esponjas Colores',
      description: 'Paquete variado de 10 esponjas multiuso de colores',
      price: 12.00,
      category: 'Paquetes',
      color_info: 'Variado',
      stock: 200,
    },
    {
      name: 'Esponja Doble Uso',
      description: 'Esponja con cara suave para vajilla y cara abrasiva para limpieza profunda',
      price: 2.50,
      category: 'Doble Uso',
      color_info: 'Amarillo',
      stock: 300,
    },
    {
      name: 'Paños Amarillos x10',
      description: 'Paños absorbentes multiuso, ideales para cocina y superficies',
      price: 12.00,
      category: 'Paños',
      color_info: 'Amarillo',
      stock: 150,
    },
  ]

  for (const p of productos) {
    const { error } = await sb.from('productos').insert(p)
    if (error) console.error(`❌ Error insertando ${p.name}:`, error.message)
    else console.log(`✅ ${p.name}`)
  }

  // Verificar
  const { data } = await sb.from('productos').select('*').order('codigo')
  if (data) {
    console.log(`\n📦 ${data.length} productos registrados:`)
    data.forEach(p => console.log(`   ${p.name} — S/ ${p.price} — ${p.stock} uds`))
  }
}

seed().catch(console.error)
