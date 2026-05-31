create extension if not exists "uuid-ossp";

create table if not exists productos (
  id bigint generated always as identity primary key,
  codigo text default '',
  name text not null,
  description text default '',
  price numeric(10,2) not null,
  category text not null,
  color_info text default '',
  unidad_de_medida text default 'NIU',
  stock int default 0,
  imagen text default '',
  precio_original numeric(10,2),
  activo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint productos_codigo_key unique (codigo)
);

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
  customer_phone text default '',
  status text default 'confirmed' check (status in ('pending', 'confirmed', 'cancelled')),
  payment_method text default '' check (payment_method in ('', 'yape', 'plin', 'efectivo', 'transferencia')),
  payment_evidence_url text default '',
  tipo_comprobante text default '01' check (tipo_comprobante in ('01', '03', '07', '08')),
  origen text default 'crm' check (origen in ('crm', 'mobile', 'web')),
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
  codigo_qr text default '',
  hash text default '',
  firma_digest text default '',
  pdf_url text default '',
  xml_url text default '',
  enviado_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists factura_items (
  id bigint generated always as identity primary key,
  factura_id bigint references facturas(id) on delete cascade,
  producto_id bigint references productos(id) on delete set null,
  description text not null,
  quantity int default 1,
  unit_price numeric(10,2) default 0,
  total numeric(10,2) default 0
);

create table if not exists movimientos_stock (
  id bigint generated always as identity primary key,
  producto_id bigint not null references productos(id) on delete cascade,
  tipo text not null check (tipo in ('entrada', 'salida')),
  cantidad int not null default 0,
  motivo text default '',
  factura_id bigint references facturas(id) on delete set null,
  pedido_id bigint references facturas(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists transportistas (
  id bigint generated always as identity primary key,
  nombres text not null,
  apellidos text not null,
  nombre_completo text generated always as (apellidos || ', ' || nombres) stored,
  dni text not null check (length(dni) = 8),
  licencia_conducir text not null default '',
  numero_placa text not null default '',
  activo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text default '',
  alias text default '',
  role text default 'vendedor' check (role in ('admin', 'vendedor', 'almacen')),
  force_password_change boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists app_config (
  id int primary key default 1,
  settings jsonb not null default '{}',
  updated_at timestamptz default now(),
  constraint app_config_single_row check (id = 1)
);

create table if not exists configuracion (
  id int primary key default 1,
  company_name text default 'ES PONJAS MAQUI MARY',
  ruc text default '10456789012',
  address text default 'PRO. QUINTA AVENIDA MZA. J LOTE. 17-B ASC. GANADEROS PORCINOS SARACO',
  phone text default '(51) 949 446 676',
  series text default 'F001',
  next_number bigint default 1,
  updated_at timestamptz default now()
);

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

create index if not exists idx_facturas_cliente on facturas(cliente_id);
create index if not exists idx_facturas_fecha on facturas(created_at desc);
create index if not exists idx_facturas_origen on facturas(origen);
create index if not exists idx_facturas_estado_sunat on facturas(estado_sunat);
create index if not exists idx_facturas_status on facturas(status);
create index if not exists idx_facturas_payment_method on facturas(payment_method);
create index if not exists idx_factura_items_factura on factura_items(factura_id);
create index if not exists idx_productos_categoria on productos(category);
create index if not exists idx_productos_stock on productos(stock);
create index if not exists idx_movimientos_producto on movimientos_stock(producto_id);
create index if not exists idx_movimientos_fecha on movimientos_stock(created_at desc);
create index if not exists idx_movimientos_tipo on movimientos_stock(tipo);
create unique index if not exists idx_transportistas_placa on transportistas(numero_placa) where activo = true;
create index if not exists idx_transportistas_activo on transportistas(activo);
