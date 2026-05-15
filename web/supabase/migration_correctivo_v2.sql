-- ============================================================
-- MIGRACIÓN CORRECTIVA v2 — Maqui Mary
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query
-- Corrige inconsistencias entre schema.sql y el código de la app
-- ============================================================

-- ============================================================
-- 1. PRODUCTOS: renombrar is_active → activo
-- Todo el código de la app usa `activo`, el schema tenía `is_active`
-- ============================================================
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'productos' and column_name = 'is_active'
  ) and not exists (
    select 1 from information_schema.columns
    where table_name = 'productos' and column_name = 'activo'
  ) then
    alter table productos rename column is_active to activo;
  elsif not exists (
    select 1 from information_schema.columns
    where table_name = 'productos' and column_name = 'activo'
  ) then
    alter table productos add column activo boolean default true;
  end if;
end $$;

-- ============================================================
-- 2. FACTURAS: columnas para pedidos web (landing page)
-- ============================================================
alter table facturas add column if not exists customer_phone text default '';
alter table facturas add column if not exists status text default 'confirmed'
  check (status in ('pending', 'confirmed', 'cancelled'));
alter table facturas add column if not exists payment_method text default ''
  check (payment_method in ('', 'yape', 'plin', 'efectivo', 'transferencia'));
alter table facturas add column if not exists codigo_qr text default '';

-- Índice para consultas de pedidos pendientes
create index if not exists idx_facturas_status on facturas(status);
create index if not exists idx_facturas_payment_method on facturas(payment_method);

-- Registros existentes sin status quedan como 'confirmed' (ya son documentos emitidos)
update facturas set status = 'confirmed' where status is null or status = '';

-- ============================================================
-- 3. TRANSPORTISTAS: tabla faltante (datos solo estaban en memoria)
-- ============================================================
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

create unique index if not exists idx_transportistas_placa on transportistas(numero_placa) where activo = true;
create index if not exists idx_transportistas_activo on transportistas(activo);

-- ============================================================
-- 4. MOVIMIENTOS_STOCK: asegurar columnas FK
-- ============================================================
alter table movimientos_stock add column if not exists factura_id bigint references facturas(id) on delete set null;
alter table movimientos_stock add column if not exists pedido_id bigint references facturas(id) on delete set null;

-- ============================================================
-- 5. FACTURAS: corregir constraint origen para incluir 'web'
-- ============================================================
do $$
begin
  -- Eliminar constraint viejo si existe y no incluye 'web'
  if exists (
    select 1 from information_schema.table_constraints
    where table_name = 'facturas' and constraint_name = 'facturas_origen_check'
  ) then
    alter table facturas drop constraint facturas_origen_check;
  end if;
end $$;

alter table facturas add constraint facturas_origen_check
  check (origen in ('crm', 'mobile', 'web'));

-- ============================================================
-- 6. APP_CONFIG: tabla para configuración del sitio web
-- ============================================================
create table if not exists app_config (
  id int primary key default 1,
  settings jsonb not null default '{}',
  updated_at timestamptz default now(),
  constraint app_config_single_row check (id = 1)
);

insert into app_config (id, settings) values (1, '{
  "cintillo_timer_minutos": 5,
  "audio_bg_volumen": 0.025,
  "audio_bg_activo": true,
  "cintillo_messages": [
    {"icon": "🔥", "text": "El más vendido: Mix x10 Esponjas — desde S/ 12.00"},
    {"icon": "🇵🇪", "text": "Hecho en Perú · Fabricación propia"},
    {"icon": "⭐", "text": "5.0 estrellas · Más de 12,800 clientes"}
  ]
}') on conflict (id) do nothing;

-- ============================================================
-- 7. PROFILES: asegurar columnas personalizadas
-- (Supabase crea auth.users, profiles es tabla propia)
-- ============================================================
alter table profiles add column if not exists alias text default '';
alter table profiles add column if not exists force_password_change boolean default false;
alter table profiles add column if not exists role text default 'vendedor'
  check (role in ('admin', 'vendedor', 'almacen'));

-- Eliminar columna insegura si existe
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'profiles' and column_name = 'generated_password'
  ) then
    alter table profiles drop column generated_password;
  end if;
end $$;

-- ============================================================
-- 8. MOVIMIENTOS_STOCK: agregar trazabilidad de usuario
-- ============================================================
alter table movimientos_stock add column if not exists created_by uuid references auth.users(id) on delete set null;

-- ============================================================
-- 9. ÍNDICES adicionales útiles
-- ============================================================
create index if not exists idx_facturas_status_origen on facturas(status, origen);
create index if not exists idx_movimientos_tipo on movimientos_stock(tipo);
create index if not exists idx_movimientos_created_by on movimientos_stock(created_by);

-- ============================================================
-- 10. RLS (Row Level Security)
-- Permite acceso completo a usuarios autenticados (CRM).
-- El landing público puede leer productos e insertar pedidos web.
-- ============================================================

-- Habilitar RLS en todas las tablas
alter table productos enable row level security;
alter table clientes enable row level security;
alter table facturas enable row level security;
alter table factura_items enable row level security;
alter table movimientos_stock enable row level security;
alter table transportistas enable row level security;
alter table configuracion enable row level security;
alter table sunat_config enable row level security;
alter table app_config enable row level security;

-- -------------------------------------------------------
-- PRODUCTOS: lectura pública (landing page necesita precios),
-- escritura solo autenticados (CRM)
-- -------------------------------------------------------
drop policy if exists "productos_public_read" on productos;
create policy "productos_public_read" on productos
  for select using (true);

drop policy if exists "productos_auth_write" on productos;
create policy "productos_auth_write" on productos
  for all using (auth.role() = 'authenticated');

-- -------------------------------------------------------
-- CLIENTES: solo autenticados
-- -------------------------------------------------------
drop policy if exists "clientes_auth_all" on clientes;
create policy "clientes_auth_all" on clientes
  for all using (auth.role() = 'authenticated');

-- -------------------------------------------------------
-- FACTURAS: autenticados leen/escriben todo;
-- anónimos pueden INSERT solo con origen='web' (pedidos landing)
-- -------------------------------------------------------
drop policy if exists "facturas_auth_all" on facturas;
create policy "facturas_auth_all" on facturas
  for all using (auth.role() = 'authenticated');

drop policy if exists "facturas_anon_web_insert" on facturas;
create policy "facturas_anon_web_insert" on facturas
  for insert with check (origen = 'web');

-- -------------------------------------------------------
-- FACTURA_ITEMS: autenticados leen/escriben todo;
-- anónimos pueden INSERT (para pedidos web)
-- -------------------------------------------------------
drop policy if exists "factura_items_auth_all" on factura_items;
create policy "factura_items_auth_all" on factura_items
  for all using (auth.role() = 'authenticated');

drop policy if exists "factura_items_anon_insert" on factura_items;
create policy "factura_items_anon_insert" on factura_items
  for insert with check (true);

-- -------------------------------------------------------
-- MOVIMIENTOS_STOCK: solo autenticados
-- -------------------------------------------------------
drop policy if exists "movimientos_auth_all" on movimientos_stock;
create policy "movimientos_auth_all" on movimientos_stock
  for all using (auth.role() = 'authenticated');

-- -------------------------------------------------------
-- TRANSPORTISTAS: solo autenticados
-- -------------------------------------------------------
drop policy if exists "transportistas_auth_all" on transportistas;
create policy "transportistas_auth_all" on transportistas
  for all using (auth.role() = 'authenticated');

-- -------------------------------------------------------
-- CONFIGURACION: autenticados leen/escriben;
-- anónimos pueden leer (landing necesita datos de empresa)
-- -------------------------------------------------------
drop policy if exists "configuracion_public_read" on configuracion;
create policy "configuracion_public_read" on configuracion
  for select using (true);

drop policy if exists "configuracion_auth_write" on configuracion;
create policy "configuracion_auth_write" on configuracion
  for all using (auth.role() = 'authenticated');

-- -------------------------------------------------------
-- SUNAT_CONFIG: solo autenticados (datos sensibles)
-- -------------------------------------------------------
drop policy if exists "sunat_config_auth_all" on sunat_config;
create policy "sunat_config_auth_all" on sunat_config
  for all using (auth.role() = 'authenticated');

-- -------------------------------------------------------
-- APP_CONFIG: lectura pública (cintillo del landing),
-- escritura solo autenticados
-- -------------------------------------------------------
drop policy if exists "app_config_public_read" on app_config;
create policy "app_config_public_read" on app_config
  for select using (true);

drop policy if exists "app_config_auth_write" on app_config;
create policy "app_config_auth_write" on app_config
  for all using (auth.role() = 'authenticated');

-- ============================================================
-- FIN — Verificar con:
-- select column_name, data_type from information_schema.columns
--   where table_name = 'productos' order by ordinal_position;
-- select column_name, data_type from information_schema.columns
--   where table_name = 'facturas' order by ordinal_position;
-- ============================================================
