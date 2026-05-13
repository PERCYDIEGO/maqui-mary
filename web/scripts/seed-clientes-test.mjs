import pg from 'pg'

const { Client } = pg

const CONNECTION_STRING = 'postgresql://postgres:1rkddYkZ1B5nNZS0@db.ofemdngaslpdexsqfcbb.supabase.co:5432/postgres'

const clientes = [
  { name: 'DISTRIBUCIONES LIMPIEZA TOTAL S.A.C.', tipo_documento: '6', num_documento: '20123456789', dni: '', address: 'Av. Javier Prado Este 1234, San Isidro, Lima', phone: '987654321', email: 'compras@limpiezatotal.pe' },
  { name: 'SUPERMERCADOS LA ECONOMICA E.I.R.L.', tipo_documento: '6', num_documento: '20567890123', dni: '', address: 'Jr. de la Unión 456, Centro de Lima', phone: '912345678', email: 'admin@laeconomica.pe' },
  { name: 'JUAN CARLOS PEREZ GARCIA', tipo_documento: '1', num_documento: '45678912', dni: '45678912', address: 'Calle Los Pinos 789, Miraflores', phone: '934567891', email: 'jperez@gmail.com' },
  { name: 'MERCADO MAYORISTA SANTA ANITA S.A.', tipo_documento: '6', num_documento: '20345678901', dni: '', address: 'Av. Nicolás Ayllón 5678, Ate Vitarte', phone: '945678912', email: 'santaanita@mercado.pe' },
  { name: 'MARIA DEL CARMEN ROJAS VELASQUEZ', tipo_documento: '1', num_documento: '72345678', dni: '72345678', address: 'Urb. El Molino Mz A Lote 3, Ate Vitarte', phone: '956789123', email: 'mrojas@hotmail.com' },
  { name: 'BODEGAS Y ALMACENES EL PUENTE S.R.L.', tipo_documento: '6', num_documento: '20678901234', dni: '', address: 'Av. Universitaria 3456, San Miguel', phone: '967891234', email: 'elpuente@bodegas.pe' },
  { name: 'CARLOS ALBERTO QUISPE MAMANI', tipo_documento: '1', num_documento: '47890123', dni: '47890123', address: 'Psj. Santa Rosa 45, La Victoria', phone: '978912345', email: 'cquispe@yahoo.com' },
  { name: 'COMERCIALIZADORA DEL SUR S.A.C.', tipo_documento: '6', num_documento: '20456789012', dni: '', address: 'Av. Angamos Este 2345, Surquillo', phone: '989123456', email: 'ventas@comersur.pe' },
  { name: 'FERNANDO DIAZ LOPEZ', tipo_documento: '1', num_documento: '51234567', dni: '51234567', address: 'Calle Las Flores 123, Barranco', phone: '990123456', email: 'fdiaz@gmail.com' },
  { name: 'TIENDAS POR DEPARTAMENTO EL SOL S.A.', tipo_documento: '6', num_documento: '20198765432', dni: '', address: 'Av. Garcilaso de la Vega 890, Lima', phone: '901234567', email: 'proveedores@elsol.pe' },
]

async function main() {
  const client = new Client({ connectionString: CONNECTION_STRING })
  try {
    await client.connect()
    console.log('🔌 Conectado a Supabase\n')

    for (const c of clientes) {
      try {
        await client.query(
          `INSERT INTO clientes (name, tipo_documento, num_documento, dni, address, phone, email)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT DO NOTHING`,
          [c.name, c.tipo_documento, c.num_documento, c.dni, c.address, c.phone, c.email]
        )
        console.log(`   ✅ ${c.name} (${c.num_documento})`)
      } catch (err) {
        console.error(`   ❌ ${c.name}:`, err.message.split('\n')[0])
      }
    }

    // Verificar conteo
    const count = await client.query('SELECT COUNT(*) FROM clientes')
    console.log(`\n📊 Total clientes en BD: ${count.rows[0].count}`)

  } finally {
    await client.end()
  }
}

main().catch(e => { console.error(e); process.exit(1) })
