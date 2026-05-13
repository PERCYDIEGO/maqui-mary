import pg from 'pg'

const { Client } = pg
const CONN = 'postgresql://postgres:1rkddYkZ1B5nNZS0@db.ofemdngaslpdexsqfcbb.supabase.co:5432/postgres'

async function main() {
  const client = new Client({ connectionString: CONN })
  await client.connect()
  
  try {
    await client.query(`
      alter table productos add column if not exists stock int default 0;
      alter table movimientos_stock add column if not exists factura_id bigint references facturas(id) on delete set null;
      alter table movimientos_stock add column if not exists pedido_id bigint references facturas(id) on delete set null;
    `)
    console.log('✅ Migración stock aplicada')
  } catch (e) {
    console.error('❌ Error:', e.message)
  }
  
  await client.end()
}

main().catch(e => { console.error(e); process.exit(1) })
