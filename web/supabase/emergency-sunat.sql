-- ============================================================
-- SQL DE EMERGENCIA: Crear tablas faltantes para emisión SUNAT
-- Copiar TODO y pegar en Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- 1. CLIENTES (con campos SUNAT)
create table if not exists clientes (
  id bigint generated always as identity primary key,
  name text not null,
  tipo_documento text default '6' not null check (tipo_documento in ('0','1','6','7')),
  num_documento text default '',
  dni text default '',
  address text default '',
  phone text default '',
  email text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. FACTURAS (con campos SUNAT)
create table if not exists facturas (
  id bigint generated always as identity primary key,
  series text default 'F001',
  number bigint not null,
  cliente_id bigint references clientes(id) on delete set null,
  cliente_nombre text not null,
  cliente_ruc text default '',
  cliente_direccion text default '',
  date_millis bigint default extract(epoch from now())::bigint * 1000,
  subtotal numeric(10,2) default 0,
  igv numeric(10,2) default 0,
  total numeric(10,2) default 0,
  notes text default '',
  tipo_comprobante text default '01' check (tipo_comprobante in ('01', '03', '07', '08')),
  origen text default 'crm' check (origen in ('crm', 'mobile', 'web')),
  estado_sunat text default 'PENDIENTE' check (estado_sunat in ('PENDIENTE', 'ENVIADO', 'ACEPTADO', 'RECHAZADO', 'ERROR')),
  sunat_response text default '',
  ticket_sunat text default '',
  tipo_operacion text default '0101',
  moneda text default 'PEN',
  cdr_xml text default '',
  pdf_url text default '',
  xml_url text default '',
  enviado_at timestamptz,
  created_at timestamptz default now()
);

-- 3. ITEMS DE FACTURA
create table if not exists factura_items (
  id bigint generated always as identity primary key,
  factura_id bigint references facturas(id) on delete cascade,
  producto_id bigint references productos(id) on delete set null,
  description text not null,
  quantity int default 1,
  unit_price numeric(10,2) default 0,
  total numeric(10,2) default 0
);

-- 4. CONFIGURACION EMPRESA
create table if not exists configuracion (
  id int primary key default 1,
  company_name text default 'ES PONJAS MAQUI MARY',
  ruc text default '10456789012',
  address text default 'Calle Las Quebradas Mz E Lote 10, Ate Vitarte',
  phone text default '(51) 949 446 676',
  series text default 'F001',
  next_number bigint default 1,
  updated_at timestamptz default now()
);

-- 5. CONFIGURACION SUNAT / OSE (esta es la que falta!)
create table if not exists sunat_config (
  id int primary key default 1,
  environment text default 'demo' check (environment in ('demo', 'beta', 'produccion')),
  ruc text default '',
  razon_social text default '',
  nombre_comercial text default '',
  address text default '',
  urbanizacion text default '',
  provincia text default '',
  departamento text default '',
  distrito text default '',
  ubigeo text default '',
  sol_user text default '',
  sol_password text default '',
  cert_base64 text default '',
  cert_password text default '',
  ose_token text default '',
  ose_url text default 'https://api.nubefact.com/api/v1/',
  ose_endpoint text default '',
  series_factura text default 'F001',
  series_boleta text default 'B001',
  series_nc text default 'FC01',
  series_nd text default 'FD01',
  next_number_factura bigint default 1,
  next_number_boleta bigint default 1,
  updated_at timestamptz default now()
);

-- INSERTS POR DEFECTO
insert into configuracion (id, company_name, ruc, address, phone, series, next_number)
values (1, 'ES PONJAS MAQUI MARY', '10456789012', 'Calle Las Quebradas Mz E Lote 10, Ate Vitarte', '(51) 949 446 676', 'F001', 1)
on conflict (id) do nothing;

insert into sunat_config (id, ruc, razon_social, nombre_comercial, address, provincia, departamento, distrito, ubigeo, series_factura, series_boleta)
values (1, '10456789012', 'ES PONJAS MAQUI MARY', 'MAQUI MARY', 'Calle Las Quebradas Mz E Lote 10, Ate Vitarte', 'LIMA', 'LIMA', 'ATE', '150103', 'F001', 'B001')
on conflict (id) do nothing;

-- INDICES
create index if not exists idx_facturas_cliente on facturas(cliente_id);
create index if not exists idx_facturas_fecha on facturas(created_at desc);
create index if not exists idx_facturas_origen on facturas(origen);
create index if not exists idx_facturas_estado_sunat on facturas(estado_sunat);
create index if not exists idx_factura_items_factura on factura_items(factura_id);

-- ============================================================
-- ¡LISTO! Una vez ejecutado, recarga la página de configuración
-- y podrás guardar tu certificado digital.
-- ============================================================
