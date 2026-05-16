const { Pool } = require('pg')

const pool = new Pool({
  host: 'db.ofemdngaslpdexsqfcbb.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Ee8XlosM9R504n1u',
  max: 1,
  ssl: { rejectUnauthorized: false },
})

const sql = [
  "alter table clientes add column if not exists ciudad text default '';",
  "alter table clientes add column if not exists notas text default '';",
  "update clientes set notas = 'Precio barato' where num_documento = '10201171003';",
  "update clientes set notas = 'Facturar a TAI PAPER SAC' where num_documento = '20602935966';",
  "update clientes set notas = 'Para reparto' where num_documento = '20600400861';",
  "update clientes set notas = 'Factura a Industrias El Principe' where num_documento = '20481529531';",
  "update clientes set notas = 'Transporte Melariel para ILO' where num_documento = '20533307117';",
  "update clientes set notas = 'Boleta' where num_documento = '72427485';",
  "update clientes set notas = 'RUC para facturar y emitir guia' where num_documento = '20612796964';",
  "update clientes set ciudad = 'Huancayo' where num_documento = '10201171003';",
  "update clientes set ciudad = 'Chiclayo' where num_documento = '48898278';",
  "update clientes set ciudad = 'Piura' where num_documento = '20440878394';",
  "update clientes set ciudad = 'Chiclayo' where num_documento = '20603899785';",
]

;(async () => {
  const c = await pool.connect()
  try {
    for (const s of sql) {
      await c.query(s)
    }
    console.log('OK - columnas agregadas y datos actualizados')
  } catch (err) {
    console.error('Error:', err.message)
  } finally {
    c.release()
    await pool.end()
  }
})()
