const { createClient } = require('@supabase/supabase-js')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

const sql = `
alter table productos add column if not exists codigo text default '';
alter table productos add column if not exists precio_original numeric(10,2);
create table if not exists movimientos_stock (
  id bigint generated always as identity primary key,
  producto_id bigint not null,
  tipo text not null check (tipo in ('entrada','salida')),
  cantidad int not null default 0,
  motivo text default '',
  created_at timestamptz default now()
);
create index if not exists idx_movimientos_producto on movimientos_stock(producto_id);
create index if not exists idx_movimientos_fecha on movimientos_stock(created_at desc);
`

async function main() {
  console.log('📦 Conectando a Supabase...')
  const sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Try creating bucket first
  const { data: buckets } = await sb.storage.listBuckets()
  if (!buckets?.some(b => b.name === 'productos')) {
    const { error } = await sb.storage.createBucket('productos', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      fileSizeLimit: 5242880,
    })
    if (error) console.error('❌ Bucket error:', error.message)
    else console.log('✅ Bucket productos creado')
  } else {
    console.log('✅ Bucket productos ya existe')
  }

  // Try executing SQL via raw fetch to Supabase
  // We'll use the /rest/v1/ endpoint with a custom approach
  const responses = []
  const queries = sql.split(';').filter(q => q.trim())

  // Alternative: try using the pg_dump endpoint
  for (const query of queries) {
    const trimmed = query.trim()
    if (!trimmed) continue
    
    console.log(`\n📝 Ejecutando: ${trimmed.substring(0, 80)}...`)
    
    try {
      const res = await fetch(url + '/rest/v1/rpc/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': key,
          'Authorization': 'Bearer ' + key,
        },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      responses.push({ query: trimmed, status: res.status, data })
      console.log(`  Status: ${res.status}`)
    } catch (e) {
      console.log(`  Error: ${e.message}`)
    }
  }

  // Verify - check if columns exist now
  console.log('\n🔍 Verificando...')
  try {
    const res = await fetch(url + '/rest/v1/productos?select=id,codigo,precio_original&limit=1', {
      headers: {
        'apikey': key,
        'Authorization': 'Bearer ' + key,
      },
    })
    if (res.ok) {
      const data = await res.json()
      console.log('✅ Columnas codigo y precio_original existen!')
    } else {
      const err = await res.json()
      console.log('❌ Columnas aun no existen:', JSON.stringify(err))
    }
  } catch (e) {
    console.log('Error verificando:', e.message)
  }

  // Check movimientos_stock
  try {
    const res = await fetch(url + '/rest/v1/movimientos_stock?select=id&limit=1', {
      headers: {
        'apikey': key,
        'Authorization': 'Bearer ' + key,
      },
    })
    if (res.ok) {
      console.log('✅ Tabla movimientos_stock existe!')
    } else {
      const err = await res.json()
      console.log('❌ Tabla movimientos_stock aun no existe:', JSON.stringify(err))
    }
  } catch (e) {
    console.log('Error verificando:', e.message)
  }
}

main().catch(console.error)
