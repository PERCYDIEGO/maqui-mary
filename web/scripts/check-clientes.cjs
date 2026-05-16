const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const envPath = path.join(__dirname, '..', '.env.local')
const envRaw = fs.readFileSync(envPath, 'utf-8')
const env = Object.fromEntries(
  envRaw.split('\n').filter(l => l.trim() && !l.startsWith('#')).map(l => {
    const idx = l.indexOf('=')
    return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
  })
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

;(async () => {
  const { data, error } = await supabase.from('clientes').select('*').limit(1)
  if (error) { console.error('ERROR:', error); return }
  if (data?.length) {
    console.log('Columnas:', Object.keys(data[0]).join(', '))
    console.log('Muestra:', JSON.stringify(data[0], null, 2))
  } else {
    console.log('Tabla vacia')
  }
})()
