import pg from 'pg'
const { Client } = pg
const c = new Client({ connectionString: 'postgresql://postgres:1rkddYkZ1B5nNZS0@db.ofemdngaslpdexsqfcbb.supabase.co:5432/postgres' })
await c.connect()
const rucReal = '20606218801'
const rzReal = 'INVERSIONES MAQUI MARY PERU E.I.R.L.'
await c.query(
  'UPDATE sunat_config SET ruc = $1, razon_social = $2, nombre_comercial = $3, updated_at = now() WHERE id = 1',
  [rucReal, rzReal, 'MAQUI MARY']
)
console.log('sunat_config actualizado:')
console.log('  RUC:', rucReal)
console.log('  Razon Social:', rzReal)
await c.end()
