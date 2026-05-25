import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Cargar .env.local manualmente porque dotenv no lee .env.local por defecto
import { readFileSync } from 'fs'
const envPath = resolve(__dirname, '../.env.local')
const envContent = readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx === -1) continue
  const key = trimmed.slice(0, eqIdx).trim()
  const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '')
  if (!process.env[key]) process.env[key] = val
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const TOKEN = '734.h7nyPXKDWC5RNbR1dhTZgHzbHXYxzIWNkB0vOoSpJzvM9XChfaUPgUFKmI93VgXCbTGoDY1xzJ9VBD1jPC0nfafTz495gb28w31m0xHRq9xRnzpweTqjlncO'

async function runSQL(sql) {
  // Intentar via RPC (si existe la función exec_sql)
  const { error: rpcError } = await supabase.rpc('exec_sql', { sql })
  if (!rpcError) return true
  
  // Fallback: SQL via REST endpoint con service role
  const res = await fetch(`${supabaseUrl}/rest/v1/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ query: sql }),
  })
  if (res.ok) return true
  
  const text = await res.text()
  console.log('⚠️ No se pudo ejecutar SQL directo:', text.slice(0, 200))
  return false
}

async function main() {
  console.log('🚀 Configurando APISUNAT.pe...\n')

  // 1. Agregar columnas si no existen
  const sql = `
    alter table sunat_config
      add column if not exists apisunat_token text default '',
      add column if not exists apisunat_environment text default 'sandbox';
  `
  const sqlOk = await runSQL(sql)
  if (sqlOk) {
    console.log('✅ Columnas aseguradas en sunat_config')
  } else {
    console.log('ℹ️ Intentando update directo (las columnas quizás ya existen)...')
  }

  // 2. Insertar token
  const { error: updateError } = await supabase
    .from('sunat_config')
    .update({
      apisunat_token: TOKEN,
      apisunat_environment: 'produccion',
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)

  if (updateError) {
    console.error('❌ Error actualizando token:', updateError.message)
    console.log('\n👉 Ejecuta esto en el SQL Editor de Supabase:')
    console.log('   https://app.supabase.com/project/ofemdngaslpdexsqfcbb/sql/new')
    console.log('\n' + '='.repeat(60))
    console.log(sql)
    console.log(`\nupdate sunat_config set`)
    console.log(`  apisunat_token = '${TOKEN.slice(0, 10)}...',`)
    console.log(`  apisunat_environment = 'produccion',`)
    console.log(`  updated_at = now()`)
    console.log(`where id = 1;`)
    console.log('='.repeat(60))
    process.exit(1)
  }

  // 3. Verificar
  const { data, error: getError } = await supabase
    .from('sunat_config')
    .select('id, apisunat_token, apisunat_environment')
    .eq('id', 1)
    .single()

  if (getError) {
    console.error('❌ Error verificando:', getError.message)
  } else {
    const masked = data.apisunat_token
      ? data.apisunat_token.slice(0, 6) + '...' + data.apisunat_token.slice(-4)
      : '(vacio)'
    console.log(`\n✅ Token APISUNAT.pe configurado:`)
    console.log(`   Token: ${masked}`)
    console.log(`   Ambiente: ${data.apisunat_environment}`)
    console.log(`\n🎯 Listo para emitir comprobantes vía APISUNAT.pe en PRODUCCIÓN`)
  }
}

main().catch(console.error)
