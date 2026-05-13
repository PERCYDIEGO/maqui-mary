-- ============================================
-- Migración: columnas codigo, precio_original + tabla movimientos_stock
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================

-- 1. Agregar columnas faltantes a productos
alter table productos 
add column if not exists codigo text default '';
alter table productos 
add column if not exists precio_original numeric(10,2);
alter table productos 
add column if not exists imagen text default '';

-- 3. Crear tabla de movimientos de stock
create table if not exists movimientos_stock (
  id bigint generated always as identity primary key,
  producto_id bigint not null,
  tipo text not null check (tipo in ('entrada','salida')),
  cantidad int not null default 0,
  motivo text default '',
  created_at timestamptz default now()
);

-- 4. Índices para consultas rápidas
create index if not exists idx_movimientos_producto 
  on movimientos_stock(producto_id);

create index if not exists idx_movimientos_fecha 
  on movimientos_stock(created_at desc);

-- 6. Columna para forzar cambio de contraseña en primer login
alter table profiles 
add column if not exists force_password_change boolean default false;

-- 5. Unique constraint en codigo para poder usar on conflict
alter table productos add constraint productos_codigo_key unique (codigo);

-- 6. Seed: productos iniciales con imágenes del catálogo
insert into productos (codigo, name, description, price, category, color_info, stock, imagen) values
  ('PRO-001', 'Mix x10 Esponjas Colores', 'Paquete variado de 10 esponjas multiuso de colores', 12.00, 'Paquetes', 'Variado', 200, '/img/esponjas-colores.png'),
  ('PRO-002', 'Esponja Doble Uso', 'Esponja con cara suave para vajilla y cara abrasiva para limpieza profunda', 2.50, 'Doble Uso', 'Amarillo', 300, '/img/doble-uso.png'),
  ('PRO-003', 'Paños Amarillos x10', 'Paños absorbentes multiuso, ideales para cocina y superficies', 12.00, 'Paños', 'Amarillo', 150, '/img/panos-amarillos.png')
on conflict (codigo) do nothing;

-- 7. Actualizar códigos correlativos para productos existentes
do $$
declare
  r record;
  counter int := 0;
begin
  for r in select id from productos where codigo is null or codigo = '' order by id
  loop
    counter := counter + 1;
    update productos set codigo = 'PRO-' || lpad(counter::text, 3, '0')
    where id = r.id;
  end loop;
end $$;

-- ============================================
-- Migración: columna payment_evidence_url + bucket storage
-- ============================================

alter table facturas
add column if not exists payment_evidence_url text default '';

-- Bucket storage para comprobantes de pago
insert into storage.buckets (id, name, public)
values ('payment-evidence', 'payment-evidence', true)
on conflict (id) do nothing;

-- Políticas de acceso público al bucket
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Public can view payment evidence') then
    create policy "Public can view payment evidence"
    on storage.objects for select
    using ( bucket_id = 'payment-evidence' );
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Anyone can upload payment evidence') then
    create policy "Anyone can upload payment evidence"
    on storage.objects for insert
    with check ( bucket_id = 'payment-evidence' );
  end if;
end $$;

-- ============================================
-- Migración: alias y generated_password en profiles
-- ============================================

alter table profiles
add column if not exists alias text default '';

alter table profiles
add column if not exists generated_password text default '';

-- Unidad de medida para productos
alter table productos add column if not exists unidad_de_medida text default 'NIU';

-- ============================================
-- Migración: campos de cliente para SUNAT
-- ============================================

alter table clientes
add column if not exists tipo_documento text default '6' check (tipo_documento in ('0','1','6','7'));

alter table clientes
add column if not exists num_documento text default '';

alter table clientes
add column if not exists dni text default '';

-- Migrar RUCs existentes a num_documento
update clientes set num_documento = ruc where num_documento = '' and ruc <> '';

-- Migrar RUCs existentes a tipo_documento = 6
update clientes set tipo_documento = '6' where tipo_documento is null or tipo_documento = '';

-- ============================================
-- Migración: campos para emisión electrónica SUNAT + origen
-- ============================================

-- Origen de emisión: 'crm' o 'mobile'
alter table facturas
add column if not exists origen text default 'crm' check (origen in ('crm', 'mobile'));

-- Tipo de comprobante: '01'=Factura, '03'=Boleta, '07'=Nota Crédito, '08'=Nota Débito
alter table facturas
add column if not exists tipo_comprobante text default '01' check (tipo_comprobante in ('01', '03', '07', '08'));

-- Estado de envío a SUNAT
alter table facturas
add column if not exists estado_sunat text default 'PENDIENTE' check (estado_sunat in ('PENDIENTE', 'ENVIADO', 'ACEPTADO', 'RECHAZADO', 'ERROR'));

-- Respuesta de SUNAT / OSE
alter table facturas
add column if not exists sunat_response text default '';
alter table facturas
add column if not exists ticket_sunat text default '';
alter table facturas
add column if not exists cdr_xml text default '';
alter table facturas
add column if not exists pdf_url text default '';
alter table facturas
add column if not exists xml_url text default '';
alter table facturas
add column if not exists enviado_at timestamptz;

-- Tipo de operación SUNAT (0101=venta interna, 0200=exportación, etc.)
alter table facturas add column if not exists tipo_operacion text default '0101';

-- Moneda (PEN=soles, USD=dólares)
alter table facturas add column if not exists moneda text default 'PEN';

-- Índice para filtrar por origen
create index if not exists idx_facturas_origen on facturas(origen);
create index if not exists idx_facturas_estado_sunat on facturas(estado_sunat);

-- Tabla de configuración SUNAT / OSE
-- Almacena el token del OSE (ej: Nubefact) y datos del emisor
-- En fase 2 se puede agregar certificado digital para emisión directa SUNAT

-- Tabla de items de factura (si no existe en Supabase aún, la app la tiene en Room)
-- Nota: la tabla factura_items ya existe en schema.sql

-- Tabla de configuración SUNAT (por emisor / empresa)
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
  -- Token del OSE (Nubefact o similar) — modo intermediario
  ose_token text default '',
  ose_url text default 'https://api.nubefact.com/api/v1/',
  ose_endpoint text default '',
  -- Series
  series_factura text default 'F001',
  series_boleta text default 'B001',
  series_nc text default 'FC01',
  series_nd text default 'FD01',
  -- Numeración actual
  next_number_factura bigint default 1,
  next_number_boleta bigint default 1,
  updated_at timestamptz default now()
);

-- Insertar config por defecto si no existe
insert into sunat_config (id, ruc, razon_social, nombre_comercial, address, provincia, departamento, distrito, ubigeo, series_factura, series_boleta)
values (1, '10456789012', 'ES PONJAS MAQUI MARY', 'MAQUI MARY', 'Calle Las Quebradas Mz E Lote 10, Ate Vitarte', 'LIMA', 'LIMA', 'ATE', '150103', 'F001', 'B001')
on conflict (id) do nothing;
