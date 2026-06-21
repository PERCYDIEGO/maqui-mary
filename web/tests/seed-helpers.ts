import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ofemdngaslpdexsqfcbb.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export const TEST_PREFIX = 'TEST_' + Date.now()

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

export async function seedTestData() {
  const { data: clientes, error: err1 } = await supabase
    .from('clientes')
    .insert([
      { name: `${TEST_PREFIX}_Cliente_A`, tipo_documento: '1', num_documento: '12345678', phone: '999888777', address: 'Av Test 123' },
      { name: `${TEST_PREFIX}_Cliente_B`, tipo_documento: '6', num_documento: '20123456789', phone: '999888776', address: 'Jr Test 456' },
    ])
    .select()
  if (err1) throw new Error(`Error al crear clientes: ${err1.message}`)

  const { data: transportistas, error: err2 } = await supabase
    .from('transportistas')
    .insert([
      { nombres: 'Juan', apellidos: 'Perez', dni: '87654321', licencia_conducir: 'Q12345678', numero_placa: `ABC${String(Date.now()).slice(-3)}` },
    ])
    .select()
  if (err2) throw new Error(`Error al crear transportista: ${err2.message}`)

  const { data: productos, error: err3 } = await supabase
    .from('productos')
    .insert([
      { name: `${TEST_PREFIX}_Producto_Test`, description: 'Producto para tests', price: 10.00, category: 'Colores', stock: 100 },
    ])
    .select()
  if (err3) throw new Error(`Error al crear producto: ${err3.message}`)

  return { clientes, transportistas, productos }
}

async function deleteByColumn(table: string, column: string, value: string) {
  const { error } = await supabase.from(table).delete().ilike(column, `${value}%`)
  if (error) console.warn(`Cleanup warning en ${table}.${column}: ${error.message}`)
}

export async function cleanupTestData() {
  await deleteByColumn('clientes', 'name', TEST_PREFIX)
  await deleteByColumn('productos', 'name', TEST_PREFIX)
  await deleteByColumn('transportistas', 'nombres', 'Juan')
}
