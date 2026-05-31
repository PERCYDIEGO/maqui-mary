import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function main() {
  console.log('🔧 Aplicando fixes pendientes de Supabase...\n')

  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  // ── Bucket payment-evidence → privado ────────────────────────────────────
  console.log('🪣  Configurando bucket payment-evidence como privado...')
  const { error: bucketError } = await supabase.storage.updateBucket('payment-evidence', {
    public: false,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    fileSizeLimit: 5242880,
  })

  if (bucketError) {
    console.error('  ❌ Error:', bucketError.message)
  } else {
    console.log('  ✅ Bucket payment-evidence → PRIVADO')
  }

  // ── Verificar existencia de generated_password (via query anon) ───────────
  console.log('\n📋 Verificando columna generated_password en profiles...')
  const { data: cols } = await supabase
    .from('profiles')
    .select('generated_password')
    .limit(1)

  if (cols !== null) {
    console.log('  ⚠️  Columna generated_password AÚN EXISTE — ejecuta el SQL del paso 2 abajo')
  } else {
    console.log('  ✅ Columna generated_password no existe (ok)')
  }

  console.log('\n✅ Bucket actualizado.')
  console.log('\n─────────────────────────────────────────────────────────────────')
  console.log('📌 PASO 2 — Ejecuta este SQL en Supabase Dashboard → SQL Editor:')
  console.log('─────────────────────────────────────────────────────────────────')
  console.log(`
-- 1. Eliminar columna sensible
ALTER TABLE profiles DROP COLUMN IF EXISTS generated_password;

-- 2. Verificar RLS en tablas críticas (habilita las que falten)
ALTER TABLE productos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE factura_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_stock  ENABLE ROW LEVEL SECURITY;
ALTER TABLE transportistas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion      ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sunat_config       ENABLE ROW LEVEL SECURITY;

-- 3. Confirmar estado final
SELECT relname AS tabla, relrowsecurity AS rls_activo
FROM pg_class JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
WHERE nspname = 'public' AND relkind = 'r'
  AND relname IN ('productos','clientes','facturas','factura_items',
                  'movimientos_stock','transportistas','profiles',
                  'configuracion','app_config','sunat_config')
ORDER BY relname;
  `)
}

main().catch(e => { console.error(e); process.exit(1) })
