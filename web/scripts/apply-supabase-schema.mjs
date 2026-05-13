import pg from 'pg'

const { Client } = pg

const CONNECTION_STRING = 'postgresql://postgres:1rkddYkZ1B5nNZS0@db.ofemdngaslpdexsqfcbb.supabase.co:5432/postgres'

async function run(client, sql, label) {
  try {
    await client.query(sql)
    if (label) console.log(`   ✅ ${label}`)
  } catch (err) {
    const msg = err.message.toLowerCase()
    const ok = msg.includes('already exists') || msg.includes('duplicate key') || msg.includes('does not affect') || msg.includes('nothing was affected')
    if (ok) {
      console.log(`   ℹ️  ${label} — ya existe`)
    } else {
      console.error(`   ❌ ${label}:`, err.message.split('\n')[0])
      throw err
    }
  }
}

async function main() {
  const client = new Client({ connectionString: CONNECTION_STRING })

  try {
    console.log('🔌 Conectando a Supabase PostgreSQL...')
    await client.connect()
    console.log('✅ Conectado.\n')

    console.log('📦 Creando/actualizando tablas y columnas...\n')

    // PRODUCTOS
    await run(client, `CREATE TABLE IF NOT EXISTS productos (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name text NOT NULL,
      description text DEFAULT '',
      price numeric(10,2) NOT NULL,
      category text NOT NULL,
      color_info text DEFAULT '',
      unidad_de_medida text DEFAULT 'NIU',
      is_active boolean DEFAULT true,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );`, 'Tabla productos')
    await run(client, `ALTER TABLE productos ADD COLUMN IF NOT EXISTS codigo text DEFAULT '';`, 'productos.codigo')
    await run(client, `ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_original numeric(10,2);`, 'productos.precio_original')
    await run(client, `ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagen text DEFAULT '';`, 'productos.imagen')
    await run(client, `ALTER TABLE productos ADD COLUMN IF NOT EXISTS unidad_de_medida text DEFAULT 'NIU';`, 'productos.unidad_de_medida')

    // CLIENTES
    await run(client, `CREATE TABLE IF NOT EXISTS clientes (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name text NOT NULL,
      tipo_documento text DEFAULT '6' NOT NULL CHECK (tipo_documento IN ('0','1','6','7')),
      num_documento text DEFAULT '',
      dni text DEFAULT '',
      address text DEFAULT '',
      phone text DEFAULT '',
      email text DEFAULT '',
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );`, 'Tabla clientes')
    await run(client, `ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tipo_documento text DEFAULT '6' CHECK (tipo_documento IN ('0','1','6','7'));`, 'clientes.tipo_documento')
    await run(client, `ALTER TABLE clientes ADD COLUMN IF NOT EXISTS num_documento text DEFAULT '';`, 'clientes.num_documento')
    await run(client, `ALTER TABLE clientes ADD COLUMN IF NOT EXISTS dni text DEFAULT '';`, 'clientes.dni')

    // FACTURAS
    await run(client, `CREATE TABLE IF NOT EXISTS facturas (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      series text DEFAULT 'F001',
      number bigint NOT NULL,
      cliente_id bigint REFERENCES clientes(id) ON DELETE SET NULL,
      cliente_nombre text NOT NULL,
      cliente_ruc text DEFAULT '',
      cliente_direccion text DEFAULT '',
      date_millis bigint DEFAULT extract(epoch from now())::bigint * 1000,
      subtotal numeric(10,2) DEFAULT 0,
      igv numeric(10,2) DEFAULT 0,
      total numeric(10,2) DEFAULT 0,
      notes text DEFAULT '',
      tipo_comprobante text DEFAULT '01' CHECK (tipo_comprobante IN ('01', '03', '07', '08')),
      origen text DEFAULT 'crm' CHECK (origen IN ('crm', 'mobile')),
      estado_sunat text DEFAULT 'PENDIENTE' CHECK (estado_sunat IN ('PENDIENTE', 'ENVIADO', 'ACEPTADO', 'RECHAZADO', 'ERROR')),
      sunat_response text DEFAULT '',
      ticket_sunat text DEFAULT '',
      tipo_operacion text DEFAULT '0101',
      moneda text DEFAULT 'PEN',
      cdr_xml text DEFAULT '',
      pdf_url text DEFAULT '',
      xml_url text DEFAULT '',
      enviado_at timestamptz,
      created_at timestamptz DEFAULT now()
    );`, 'Tabla facturas')
    await run(client, `ALTER TABLE facturas ADD COLUMN IF NOT EXISTS tipo_comprobante text DEFAULT '01' CHECK (tipo_comprobante IN ('01', '03', '07', '08'));`, 'facturas.tipo_comprobante')
    await run(client, `ALTER TABLE facturas ADD COLUMN IF NOT EXISTS origen text DEFAULT 'crm' CHECK (origen IN ('crm', 'mobile'));`, 'facturas.origen')
    await run(client, `ALTER TABLE facturas ADD COLUMN IF NOT EXISTS estado_sunat text DEFAULT 'PENDIENTE' CHECK (estado_sunat IN ('PENDIENTE', 'ENVIADO', 'ACEPTADO', 'RECHAZADO', 'ERROR'));`, 'facturas.estado_sunat')
    await run(client, `ALTER TABLE facturas ADD COLUMN IF NOT EXISTS sunat_response text DEFAULT '';`, 'facturas.sunat_response')
    await run(client, `ALTER TABLE facturas ADD COLUMN IF NOT EXISTS ticket_sunat text DEFAULT '';`, 'facturas.ticket_sunat')
    await run(client, `ALTER TABLE facturas ADD COLUMN IF NOT EXISTS tipo_operacion text DEFAULT '0101';`, 'facturas.tipo_operacion')
    await run(client, `ALTER TABLE facturas ADD COLUMN IF NOT EXISTS moneda text DEFAULT 'PEN';`, 'facturas.moneda')
    await run(client, `ALTER TABLE facturas ADD COLUMN IF NOT EXISTS cdr_xml text DEFAULT '';`, 'facturas.cdr_xml')
    await run(client, `ALTER TABLE facturas ADD COLUMN IF NOT EXISTS pdf_url text DEFAULT '';`, 'facturas.pdf_url')
    await run(client, `ALTER TABLE facturas ADD COLUMN IF NOT EXISTS xml_url text DEFAULT '';`, 'facturas.xml_url')
    await run(client, `ALTER TABLE facturas ADD COLUMN IF NOT EXISTS enviado_at timestamptz;`, 'facturas.enviado_at')
    await run(client, `ALTER TABLE facturas ADD COLUMN IF NOT EXISTS payment_evidence_url text DEFAULT '';`, 'facturas.payment_evidence_url')

    // FACTURA ITEMS
    await run(client, `CREATE TABLE IF NOT EXISTS factura_items (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      factura_id bigint REFERENCES facturas(id) ON DELETE CASCADE,
      producto_id bigint REFERENCES productos(id) ON DELETE SET NULL,
      description text NOT NULL,
      quantity int DEFAULT 1,
      unit_price numeric(10,2) DEFAULT 0,
      total numeric(10,2) DEFAULT 0
    );`, 'Tabla factura_items')

    // CONFIGURACION
    await run(client, `CREATE TABLE IF NOT EXISTS configuracion (
      id int PRIMARY KEY DEFAULT 1,
      company_name text DEFAULT 'ES PONJAS MAQUI MARY',
      ruc text DEFAULT '10456789012',
      address text DEFAULT 'Calle Las Quebradas Mz E Lote 10, Ate Vitarte',
      phone text DEFAULT '(51) 949 446 676',
      series text DEFAULT 'F001',
      next_number bigint DEFAULT 1,
      updated_at timestamptz DEFAULT now()
    );`, 'Tabla configuracion')

    // SUNAT_CONFIG (LA IMPORTANTE)
    await run(client, `CREATE TABLE IF NOT EXISTS sunat_config (
      id int PRIMARY KEY DEFAULT 1,
      environment text DEFAULT 'demo' CHECK (environment IN ('demo', 'beta', 'produccion')),
      ruc text DEFAULT '',
      razon_social text DEFAULT '',
      nombre_comercial text DEFAULT '',
      address text DEFAULT '',
      urbanizacion text DEFAULT '',
      provincia text DEFAULT '',
      departamento text DEFAULT '',
      distrito text DEFAULT '',
      ubigeo text DEFAULT '',
      sol_user text DEFAULT '',
      sol_password text DEFAULT '',
      cert_base64 text DEFAULT '',
      cert_password text DEFAULT '',
      ose_token text DEFAULT '',
      ose_url text DEFAULT 'https://api.nubefact.com/api/v1/',
      ose_endpoint text DEFAULT '',
      series_factura text DEFAULT 'F001',
      series_boleta text DEFAULT 'B001',
      series_nc text DEFAULT 'FC01',
      series_nd text DEFAULT 'FD01',
      next_number_factura bigint DEFAULT 1,
      next_number_boleta bigint DEFAULT 1,
      updated_at timestamptz DEFAULT now()
    );`, 'Tabla sunat_config ⭐')

    // MOVIMIENTOS STOCK
    await run(client, `CREATE TABLE IF NOT EXISTS movimientos_stock (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      producto_id bigint NOT NULL,
      tipo text NOT NULL CHECK (tipo IN ('entrada','salida')),
      cantidad int NOT NULL DEFAULT 0,
      motivo text DEFAULT '',
      created_at timestamptz DEFAULT now()
    );`, 'Tabla movimientos_stock')

    console.log('\n🔧 Creando índices...')
    await run(client, `CREATE INDEX IF NOT EXISTS idx_facturas_cliente ON facturas(cliente_id);`, 'idx_facturas_cliente')
    await run(client, `CREATE INDEX IF NOT EXISTS idx_facturas_fecha ON facturas(created_at DESC);`, 'idx_facturas_fecha')
    await run(client, `CREATE INDEX IF NOT EXISTS idx_facturas_origen ON facturas(origen);`, 'idx_facturas_origen')
    await run(client, `CREATE INDEX IF NOT EXISTS idx_facturas_estado_sunat ON facturas(estado_sunat);`, 'idx_facturas_estado_sunat')
    await run(client, `CREATE INDEX IF NOT EXISTS idx_factura_items_factura ON factura_items(factura_id);`, 'idx_factura_items_factura')
    await run(client, `CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(category);`, 'idx_productos_categoria')
    await run(client, `CREATE INDEX IF NOT EXISTS idx_movimientos_producto ON movimientos_stock(producto_id);`, 'idx_movimientos_producto')
    await run(client, `CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos_stock(created_at DESC);`, 'idx_movimientos_fecha')

    console.log('\n📝 Insertando datos por defecto...')
    await run(client, `INSERT INTO configuracion (id, company_name, ruc, address, phone, series, next_number)
      VALUES (1, 'ES PONJAS MAQUI MARY', '10456789012', 'Calle Las Quebradas Mz E Lote 10, Ate Vitarte', '(51) 949 446 676', 'F001', 1)
      ON CONFLICT (id) DO NOTHING;`, 'configuracion default')

    await run(client, `INSERT INTO sunat_config (id, ruc, razon_social, nombre_comercial, address, provincia, departamento, distrito, ubigeo, series_factura, series_boleta)
      VALUES (1, '10456789012', 'ES PONJAS MAQUI MARY', 'MAQUI MARY', 'Calle Las Quebradas Mz E Lote 10, Ate Vitarte', 'LIMA', 'LIMA', 'ATE', '150103', 'F001', 'B001')
      ON CONFLICT (id) DO NOTHING;`, 'sunat_config default ⭐')

    console.log('\n🌱 Seed de productos (solo si la tabla está vacía)...')
    const { rows: [{ count }] } = await client.query(`SELECT count(*) as count FROM productos`)
    if (parseInt(count, 10) === 0) {
      await run(client, `INSERT INTO productos (name, description, price, category, color_info, unidad_de_medida) VALUES
        ('Esponja Multiuso Amarilla', 'Esponja suave para vajilla y superficies', 1.50, 'Colores', 'Amarillo', 'NIU'),
        ('Esponja Multiuso Verde', 'Esponja suave para vajilla y superficies', 1.50, 'Colores', 'Verde', 'NIU'),
        ('Esponja Multiuso Roja', 'Esponja suave para vajilla y superficies', 1.50, 'Colores', 'Rojo', 'NIU'),
        ('Esponja Multiuso Azul', 'Esponja suave para vajilla y superficies', 1.50, 'Colores', 'Azul', 'NIU'),
        ('Esponja Multiuso Celeste', 'Esponja suave para vajilla y superficies', 1.50, 'Colores', 'Celeste', 'NIU'),
        ('Esponja Multiuso Naranja', 'Esponja suave para vajilla y superficies', 1.50, 'Colores', 'Naranja', 'NIU'),
        ('Esponja Multiuso Rosada', 'Esponja suave para vajilla y superficies', 1.50, 'Colores', 'Rosado', 'NIU'),
        ('Esponja Multiuso Blanca', 'Esponja suave para vajilla y superficies', 1.50, 'Colores', 'Blanco', 'NIU'),
        ('Esponja de Acero Fino', 'Fibra de acero para limpieza profunda', 2.00, 'Acero', 'Gris', 'NIU'),
        ('Esponja de Acero Grueso', 'Fibra de acero resistente para superficies duras', 2.50, 'Acero', 'Gris', 'NIU'),
        ('Esponja Doble Uso Amarilla', 'Cara suave + cara abrasiva', 2.50, 'Doble Uso', 'Amarillo', 'NIU'),
        ('Esponja Doble Uso Verde', 'Cara suave + cara abrasiva', 2.50, 'Doble Uso', 'Verde', 'NIU'),
        ('Esponja Doble Uso Roja', 'Cara suave + cara abrasiva', 2.50, 'Doble Uso', 'Rojo', 'NIU'),
        ('Esponja Doble Uso Azul', 'Cara suave + cara abrasiva', 2.50, 'Doble Uso', 'Azul', 'NIU'),
        ('Mix x10 Esponjas Colores', 'Paquete variado de 10 esponjas multiuso', 12.00, 'Paquetes', 'Variado', 'NIU'),
        ('Pack x6 Doble Uso', 'Pack de 6 esponjas doble uso variadas', 13.00, 'Paquetes', 'Variado', 'NIU'),
        ('Pack x12 Esponjas Acero', 'Pack de 12 esponjas de acero', 20.00, 'Paquetes', 'Gris', 'NIU')
      ON CONFLICT DO NOTHING;`, 'seed productos')
    } else {
      console.log('   ℹ️  productos ya tiene datos, skip seed.')
    }

    // Verificación final
    console.log('\n📋 Verificando tablas:')
    const { rows: tables } = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`
    )
    tables.forEach((t) => console.log(`   ✓ ${t.table_name}`))

    const { rows: sunatRows } = await client.query(`SELECT ruc, razon_social, series_factura, series_boleta FROM sunat_config WHERE id = 1`)
    if (sunatRows.length) {
      const s = sunatRows[0]
      console.log(`\n⭐ sunat_config OK:`)
      console.log(`   RUC: ${s.ruc}`)
      console.log(`   Razón Social: ${s.razon_social}`)
      console.log(`   Series: Factura ${s.series_factura} / Boleta ${s.series_boleta}`)
    }

    const { rows: [{ total }] } = await client.query(`SELECT count(*)::int as total FROM productos`)
    console.log(`\n📦 Productos: ${total}`)

    console.log('\n🎉 ¡Base de datos lista! Recarga la web:')
    console.log('   https://maquimary.vercel.app/crm/configuracion')
  } catch (err) {
    console.error('\n❌ Error fatal:', err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
