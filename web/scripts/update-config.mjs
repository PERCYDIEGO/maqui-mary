import pg from 'pg'
const { Client } = pg
const c = new Client({ connectionString: 'postgresql://postgres:1rkddYkZ1B5nNZS0@db.ofemdngaslpdexsqfcbb.supabase.co:5432/postgres' })
await c.connect()
const rucReal = '20606218801'
const rzReal = 'INVERSIONES MAQUI MARY PERU E.I.R.L.'
await c.query(
  'UPDATE configuracion SET ruc = $1, company_name = $2, updated_at = now() WHERE id = 1',
  [rucReal, rzReal]
)
console.log('configuracion actualizada con RUC real:', rucReal)
await c.end()
