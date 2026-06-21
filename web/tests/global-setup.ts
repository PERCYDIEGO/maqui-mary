/**
 * Crea un usuario admin temporal para los tests E2E.
 * Se elimina en global-teardown.ts al finalizar la suite.
 */
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const TEST_EMAIL = 'test-bot@maquimary.test'
const TEST_PASSWORD = 'TestBot2026!'
const CREDS_FILE = path.resolve(__dirname, '.test-creds.json')

export default async function globalSetup() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1. Eliminar si ya existía de una corrida anterior
  const { data: existing } = await supabase.auth.admin.listUsers()
  const prev = existing?.users?.find(u => u.email === TEST_EMAIL)
  if (prev) {
    await supabase.auth.admin.deleteUser(prev.id)
    await supabase.from('profiles').delete().eq('id', prev.id)
  }

  // 2. Crear usuario con email ya confirmado
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  })

  if (createErr || !created.user) {
    throw new Error(`No se pudo crear usuario de prueba: ${createErr?.message}`)
  }

  const userId = created.user.id

  // 3. Insertar perfil con rol admin
  const { error: profileErr } = await supabase.from('profiles').upsert({
    id: userId,
    full_name: 'Bot de Pruebas',
    alias: 'test-bot',
    role: 'admin',
    force_password_change: false,
  })

  if (profileErr) {
    // Si falla el perfil, eliminar el usuario para no dejar basura
    await supabase.auth.admin.deleteUser(userId)
    throw new Error(`No se pudo crear perfil de prueba: ${profileErr.message}`)
  }

  // 4. Guardar credenciales en archivo temporal para que los tests las lean
  fs.writeFileSync(CREDS_FILE, JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD, userId }))

  console.log(`✓ Usuario de prueba creado: ${TEST_EMAIL}`)
}
