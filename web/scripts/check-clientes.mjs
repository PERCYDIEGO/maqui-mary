import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Faltan env vars')
  process.exit(1)
}

const supabase = createClient(url, key)

const { data, error } = await supabase.from('clientes').select('*').limit(1)

if (error) {
  console.error('ERROR:', error)
} else if (data?.length) {
  console.log('Columnas:', Object.keys(data[0]).join(', '))
  console.log('Muestra:', JSON.stringify(data[0], null, 2))
} else {
  console.log('Tabla vacia o no existe')
}
