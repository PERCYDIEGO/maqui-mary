import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
if (!url || !key) { console.error('Faltan credenciales'); process.exit(1) }
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

const { data, error } = await supabase
  .from('guias')
  .delete()
  .neq('id', '00000000-0000-0000-0000-000000000000')
  .select('id')

if (error) {
  console.error('Error al borrar guías:', error.message)
  process.exit(1)
}

console.log(`✓ Guías de remisión eliminadas: ${data?.length || 0} registros`)
