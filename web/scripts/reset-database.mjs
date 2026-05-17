#!/usr/bin/env node
/**
 * Resetea datos operativos de Maqui Mary
 * Borra: facturas, factura_items, movimientos_stock
 * Conserva: productos, clientes, transportistas, profiles, configuracion, app_config, sunat_config
 *
 * Uso:
 *   node scripts/reset-database.mjs          ← solo vista previa
 *   node scripts/reset-database.mjs --confirm ← ejecuta
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) config()

const S = {
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', reset: '\x1b[0m',
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !supabaseKey) {
  console.error(`${S.red}❌ Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY${S.reset}`)
  process.exit(1)
}

const sb = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const TABLES = [
  { name: 'factura_items', label: 'Items de facturas' },
  { name: 'movimientos_stock', label: 'Movimientos de stock' },
  { name: 'facturas', label: 'Facturas / pedidos' },
]

const KEEP = ['productos', 'clientes', 'transportistas', 'profiles', 'configuracion', 'app_config', 'sunat_config']

async function count(table) {
  const { count, error } = await sb.from(table).select('*', { count: 'exact', head: true })
  return error ? null : count
}

async function deleteAll(table) {
  const { error } = await sb.from(table).delete().neq('id', 0)
  return error
}

async function main() {
  const args = process.argv.slice(2)
  const confirmed = args.includes('--confirm') || args.includes('-y')

  console.log(`\n${'='.repeat(56)}`)
  console.log(` 🧹  RESETEAR DATOS OPERATIVOS — Maqui Mary`)
  console.log(`${'='.repeat(56)}\n`)

  // Vista previa: contar registros
  console.log(`📊  Registros actuales:\n`)
  for (const t of TABLES) {
    const c = await count(t.name)
    console.log(`   ${t.label.padEnd(28)} ${c !== null ? `${c} registros` : `${S.yellow}⚠️  no accesible${S.reset}`}`)
  }
  console.log(`\n   ${S.green}✔${S.reset} Se conservan: ${KEEP.join(', ')}\n`)

  if (!confirmed) {
    console.log(`${S.red}⚠️  Para ejecutar:  node scripts/reset-database.mjs --confirm${S.reset}\n`)
    process.exit(0)
  }

  // Ejecutar
  console.log(`${S.yellow}🚀  Eliminando datos...${S.reset}\n`)
  for (const t of TABLES) {
    const err = await deleteAll(t.name)
    if (err) {
      console.log(`   ${S.red}❌ ${t.label}: ${err.message}${S.reset}`)
    } else {
      const restante = await count(t.name)
      if (restante === 0) {
        console.log(`   ${S.green}✅ ${t.label} — vacío${S.reset}`)
      } else {
        console.log(`   ${S.yellow}⚠️  ${t.label}: ${restante} restantes${S.reset}`)
      }
    }
  }

  // Resetear contadores de series
  console.log(`\n${S.blue}🔄  Reseteando contadores de series...${S.reset}`)
  const { error: resetErr } = await sb
    .from('sunat_config')
    .update({ next_number_factura: 1, next_number_boleta: 1 })
    .eq('id', 1)
  if (resetErr) {
    console.log(`   ${S.red}❌ Error reseteando contadores: ${resetErr.message}${S.reset}`)
  } else {
    console.log(`   ${S.green}✅  Contadores reiniciados (next_number_factura=1, next_number_boleta=1)${S.reset}`)
  }

  console.log(`\n${S.green}✨  Listo. Base de datos operativa lista desde cero.${S.reset}\n`)
}

main().catch(e => { console.error(`\n${S.red}❌ Error:${S.reset}`, e); process.exit(1) })
