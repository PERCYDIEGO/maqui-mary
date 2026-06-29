/**
 * Elimina el usuario admin temporal creado en global-setup.ts
 */
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CREDS_FILE = path.resolve(__dirname, '.test-creds.json')

export default async function globalTeardown() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return

  try {
    const creds = JSON.parse(fs.readFileSync(CREDS_FILE, 'utf-8'))
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Eliminar guía de prueba
    if (creds.guia?.id) {
      await supabase.from('guias').delete().eq('id', creds.guia.id)
    }

    // Eliminar factura de prueba (y sus items)
    if (creds.factura?.id) {
      await supabase.from('factura_items').delete().eq('factura_id', creds.factura.id)
      await supabase.from('facturas').delete().eq('id', creds.factura.id)
    }

    await supabase.from('profiles').delete().eq('id', creds.userId)
    await supabase.auth.admin.deleteUser(creds.userId)
    fs.unlinkSync(CREDS_FILE)

    console.log(`✓ Usuario de prueba eliminado: ${creds.email}`)
  } catch (e) {
    console.warn('Teardown: no se pudo limpiar usuario de prueba', e)
  }
}
