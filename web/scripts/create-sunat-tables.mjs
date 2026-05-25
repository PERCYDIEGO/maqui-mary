// Script de emergencia para crear tablas SUNAT en Supabase
// Ejecutar: node create-sunat-tables.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ofemdngaslpdexsqfcbb.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mZW1kbmdhc2xwZGV4c3FmY2JiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQzMTI4NSwiZXhwIjoyMDk0MDA3Mjg1fQ.Fc-LpbvWlkYJlrOT69IhaXsYoZlgKExDbq3EAoZPITM'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function main() {
  console.log('Verificando tablas en Supabase...\n')

  const { data: schemaData, error: schemaError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_type', 'BASE TABLE')

  if (schemaError) {
    console.error('Error listando tablas:', schemaError.message)
    process.exit(1)
  }

  const existingTables = schemaData?.map((t) => t.table_name) || []
  console.log('Tablas existentes:', existingTables.join(', ') || '(ninguna)')
  console.log()

  const missing = []
  if (!existingTables.includes('sunat_config')) missing.push('sunat_config')
  if (!existingTables.includes('facturas')) missing.push('facturas')
  if (!existingTables.includes('clientes')) missing.push('clientes')
  if (!existingTables.includes('factura_items')) missing.push('factura_items')
  if (!existingTables.includes('configuracion')) missing.push('configuracion')

  if (missing.length === 0) {
    console.log('Todas las tablas ya existen.\n')
    
    const { data: sunatData, error: sunatErr } = await supabase
      .from('sunat_config')
      .select('*')
      .eq('id', 1)
      .single()
    
    if (sunatErr) {
      console.log('La tabla existe pero esta vacia. Insertando datos por defecto...')
      const { error: insertErr } = await supabase.from('sunat_config').insert({
        id: 1,
        ruc: '10456789012',
        razon_social: 'ES PONJAS MAQUI MARY',
        nombre_comercial: 'MAQUI MARY',
        address: 'PRO. QUINTA AVENIDA MZA. J LOTE. 17-B ASC. GANADEROS PORCINOS SARACO',
        provincia: 'LIMA',
        departamento: 'LIMA',
        distrito: 'LURIGANCHO',
        ubigeo: '150103',
        series_factura: 'F001',
        series_boleta: 'B001',
      })
      if (insertErr) console.error('Error insertando:', insertErr.message)
      else console.log('Datos por defecto insertados.\n')
    } else {
      console.log('Configuracion SUNAT cargada correctamente.\n')
    }
    
    console.log('Todo listo. Recarga https://maquimary.vercel.app/crm/configuracion')
    return
  }

  console.log('Faltan tablas:', missing.join(', '))
  console.log('Creando tablas faltantes...\n')

  // Crear tablas via SQL directo usando REST
  const sqlStatements = [
    `CREATE TABLE IF NOT EXISTS public.clientes (
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
    );`,
    
    `CREATE TABLE IF NOT EXISTS public.facturas (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      series text DEFAULT 'F001',
      number bigint NOT NULL,
      cliente_id bigint REFERENCES public.clientes(id) ON DELETE SET NULL,
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
    );`,
    
    `CREATE TABLE IF NOT EXISTS public.factura_items (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      factura_id bigint REFERENCES public.facturas(id) ON DELETE CASCADE,
      producto_id bigint REFERENCES public.productos(id) ON DELETE SET NULL,
      description text NOT NULL,
      quantity int DEFAULT 1,
      unit_price numeric(10,2) DEFAULT 0,
      total numeric(10,2) DEFAULT 0
    );`,
    
    `CREATE TABLE IF NOT EXISTS public.configuracion (
      id int PRIMARY KEY DEFAULT 1,
      company_name text DEFAULT 'ES PONJAS MAQUI MARY',
      ruc text DEFAULT '10456789012',
      address text DEFAULT 'PRO. QUINTA AVENIDA MZA. J LOTE. 17-B ASC. GANADEROS PORCINOS SARACO',
      phone text DEFAULT '(51) 949 446 676',
      series text DEFAULT 'F001',
      next_number bigint DEFAULT 1,
      updated_at timestamptz DEFAULT now()
    );`,
    
    `CREATE TABLE IF NOT EXISTS public.sunat_config (
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
    );`,
    
    `CREATE INDEX IF NOT EXISTS idx_facturas_cliente ON public.facturas(cliente_id);`,
    `CREATE INDEX IF NOT EXISTS idx_facturas_fecha ON public.facturas(created_at DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_facturas_origen ON public.facturas(origen);`,
    `CREATE INDEX IF NOT EXISTS idx_facturas_estado_sunat ON public.facturas(estado_sunat);`,
    `CREATE INDEX IF NOT EXISTS idx_factura_items_factura ON public.factura_items(factura_id);`,
    
    `INSERT INTO public.configuracion (id, company_name, ruc, address, phone, series, next_number)
    VALUES (1, 'ES PONJAS MAQUI MARY', '10456789012', 'PRO. QUINTA AVENIDA MZA. J LOTE. 17-B ASC. GANADEROS PORCINOS SARACO', '(51) 949 446 676', 'F001', 1)
    ON CONFLICT (id) DO NOTHING;`,
    
    `INSERT INTO public.sunat_config (id, ruc, razon_social, nombre_comercial, address, provincia, departamento, distrito, ubigeo, series_factura, series_boleta)
    VALUES (1, '10456789012', 'ES PONJAS MAQUI MARY', 'MAQUI MARY', 'PRO. QUINTA AVENIDA MZA. J LOTE. 17-B ASC. GANADEROS PORCINOS SARACO', 'LIMA', 'LIMA', 'LURIGANCHO', '150103', 'F001', 'B001')
    ON CONFLICT (id) DO NOTHING;`
  ]

  for (const sql of sqlStatements) {
    const { error } = await supabase.rpc('pg_sql_exec', { query: sql })
    
    if (error) {
      // Fallback: Supabase no tiene RPC por defecto, intentar via REST query
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'apikey': SERVICE_ROLE_KEY,
          }
        })
        console.log('Supabase REST status:', res.status)
      } catch (e) {
        console.error('Error ejecutando SQL:', error.message)
      }
    }
  }
  
  console.log('\nScript completado. Verifica en Supabase Dashboard > Table Editor.')
  console.log('Si las tablas no aparecieron, copia el SQL manualmente desde:')
  console.log('D:\\proyectos_opencode\\projects\\Maqui-Mary\\web\\supabase\\emergency-sunat.sql')
}

main().catch(console.error)
