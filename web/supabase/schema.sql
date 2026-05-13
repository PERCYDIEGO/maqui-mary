-- Schema compartido entre Android app y Web CRM
-- Ejecutar en SQL Editor de Supabase

-- HABILITAR EXTENSIONES
create extension if not exists "uuid-ossp";

-- PRODUCTOS
create table if not exists productos (
  id bigint generated always as identity primary key,
  name text not null,
  description text default '',
  price numeric(10,2) not null,
  category text not null,
  color_info text default '',
  unidad_de_medida text default 'NIU',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CLIENTES
create table if not exists clientes (
  id bigint generated always as identity primary key,
  name text not null,
  tipo_documento text default '6' not null check (tipo_documento in ('0','1','6','7')), -- 6=RUC, 1=DNI, 7=Pasaporte, 0=Otros
  num_documento text default '', -- Número del documento principal (RUC o DNI según tipo)
  dni text default '', -- DNI del representante legal (para casos donde el cliente es empresa con RUC)
  address text default '',
  phone text default '',
  email text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- FACTURAS
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
  -- Campos para emisión electrónica SUNAT
  tipo_comprobante text default '01' check (tipo_comprobante in ('01', '03', '07', '08')),
  origen text default 'crm' check (origen in ('crm', 'mobile')),
  estado_sunat text default 'PENDIENTE' check (estado_sunat in ('PENDIENTE', 'ENVIADO', 'ACEPTADO', 'RECHAZADO', 'ERROR')),
  sunat_response text default '',
  ticket_sunat text default '',
  tipo_operacion text default '0101',
  moneda text default 'PEN',
  forma_pago text default 'contado' check (forma_pago in ('contado', 'credito')),
  tipo_cambio numeric(10,3) default null,
  guia_remision text default '',
  orden_compra text default '',
  cdr_xml text default '',
  cdr_codigo text default '',
  cdr_descripcion text default '',
  hash text default '',
  firma_digest text default '',
  pdf_url text default '',
  xml_url text default '',
  enviado_at timestamptz,
  created_at timestamptz default now()
);

-- ITEMS DE FACTURA
create table if not exists factura_items (
  id bigint generated always as identity primary key,
  factura_id bigint references facturas(id) on delete cascade,
  producto_id bigint references productos(id) on delete set null,
  description text not null,
  quantity int default 1,
  unit_price numeric(10,2) default 0,
  total numeric(10,2) default 0
);

-- CONFIGURACION (empresa)
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

-- CONFIGURACION SUNAT / OSE (emisión electrónica)
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
  -- Certificado digital (.pfx en base64) + contraseña — modo SUNAT directo
  cert_base64 text default '',
  cert_password text default '',
  -- Token del OSE (Nubefact o similar)
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

-- INSERTAR CONFIG POR DEFECTO
insert into configuracion (id, company_name, ruc, address, phone, series, next_number)
values (1, 'ES PONJAS MAQUI MARY', '10456789012', 'Calle Las Quebradas Mz E Lote 10, Ate Vitarte', '(51) 949 446 676', 'F001', 1)
on conflict (id) do nothing;

-- INSERTAR SUNAT CONFIG POR DEFECTO
insert into sunat_config (id, ruc, razon_social, nombre_comercial, address, provincia, departamento, distrito, ubigeo, series_factura, series_boleta)
values (1, '10456789012', 'ES PONJAS MAQUI MARY', 'MAQUI MARY', 'Calle Las Quebradas Mz E Lote 10, Ate Vitarte', 'LIMA', 'LIMA', 'ATE', '150103', 'F001', 'B001')
on conflict (id) do nothing;

-- SEED DE PRODUCTOS
insert into productos (name, description, price, category, color_info) values
  ('Esponja Multiuso Amarilla', 'Esponja suave para vajilla y superficies', 1.50, 'Colores', 'Amarillo'),
  ('Esponja Multiuso Verde', 'Esponja suave para vajilla y superficies', 1.50, 'Colores', 'Verde'),
  ('Esponja Multiuso Roja', 'Esponja suave para vajilla y superficies', 1.50, 'Colores', 'Rojo'),
  ('Esponja Multiuso Azul', 'Esponja suave para vajilla y superficies', 1.50, 'Colores', 'Azul'),
  ('Esponja Multiuso Celeste', 'Esponja suave para vajilla y superficies', 1.50, 'Colores', 'Celeste'),
  ('Esponja Multiuso Naranja', 'Esponja suave para vajilla y superficies', 1.50, 'Colores', 'Naranja'),
  ('Esponja Multiuso Rosada', 'Esponja suave para vajilla y superficies', 1.50, 'Colores', 'Rosado'),
  ('Esponja Multiuso Blanca', 'Esponja suave para vajilla y superficies', 1.50, 'Colores', 'Blanco'),
  ('Esponja de Acero Fino', 'Fibra de acero para limpieza profunda', 2.00, 'Acero', 'Gris'),
  ('Esponja de Acero Grueso', 'Fibra de acero resistente para superficies duras', 2.50, 'Acero', 'Gris'),
  ('Esponja Doble Uso Amarilla', 'Cara suave + cara abrasiva', 2.50, 'Doble Uso', 'Amarillo'),
  ('Esponja Doble Uso Verde', 'Cara suave + cara abrasiva', 2.50, 'Doble Uso', 'Verde'),
  ('Esponja Doble Uso Roja', 'Cara suave + cara abrasiva', 2.50, 'Doble Uso', 'Rojo'),
  ('Esponja Doble Uso Azul', 'Cara suave + cara abrasiva', 2.50, 'Doble Uso', 'Azul'),
  ('Mix x10 Esponjas Colores', 'Paquete variado de 10 esponjas multiuso', 12.00, 'Paquetes', 'Variado'),
  ('Pack x6 Doble Uso', 'Pack de 6 esponjas doble uso variadas', 13.00, 'Paquetes', 'Variado'),
  ('Pack x12 Esponjas Acero', 'Pack de 12 esponjas de acero', 20.00, 'Paquetes', 'Gris')
on conflict do nothing;

-- INDICES
create index if not exists idx_facturas_cliente on facturas(cliente_id);
create index if not exists idx_facturas_fecha on facturas(created_at desc);
create index if not exists idx_facturas_origen on facturas(origen);
create index if not exists idx_facturas_estado_sunat on facturas(estado_sunat);
create index if not exists idx_factura_items_factura on factura_items(factura_id);
create index if not exists idx_productos_categoria on productos(category);

-- RLS (Row Level Security) - Opcional, habilitar cuando se configure auth
-- alter table productos enable row level security;
-- alter table clientes enable row level security;
-- alter table facturas enable row level security;
-- alter table factura_items enable row level security;
