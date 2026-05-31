-- ============================================
-- MIGRACIÓN: Habilitar RLS en todas las tablas
-- ============================================

-- PRODUCTOS: público puede leer, solo autenticados pueden escribir
alter table productos enable row level security;

create policy "Productos lectura pública"
  on productos for select
  using (true);

create policy "Productos escritura autenticados"
  on productos for insert
  with check (auth.role() = 'authenticated');

create policy "Productos actualización autenticados"
  on productos for update
  using (auth.role() = 'authenticated');

create policy "Productos eliminación autenticados"
  on productos for delete
  using (auth.role() = 'authenticated');

-- CLIENTES: solo autenticados
alter table clientes enable row level security;

create policy "Clientes solo autenticados"
  on clientes for all
  using (auth.role() = 'authenticated');

-- FACTURAS: solo autenticados
alter table facturas enable row level security;

create policy "Facturas solo autenticados"
  on facturas for all
  using (auth.role() = 'authenticated');

-- FACTURA ITEMS: solo autenticados
alter table factura_items enable row level security;

create policy "Factura items solo autenticados"
  on factura_items for all
  using (auth.role() = 'authenticated');

-- MOVIMIENTOS STOCK: solo autenticados
alter table movimientos_stock enable row level security;

create policy "Movimientos stock solo autenticados"
  on movimientos_stock for all
  using (auth.role() = 'authenticated');

-- TRANSPORTISTAS: solo autenticados
alter table transportistas enable row level security;

create policy "Transportistas solo autenticados"
  on transportistas for all
  using (auth.role() = 'authenticated');

-- PROFILES: lectura pública (para resolver alias/nombre), escritura solo propio perfil o admin
alter table profiles enable row level security;

create policy "Profiles lectura pública"
  on profiles for select
  using (true);

create policy "Profiles solo propio usuario o admin"
  on profiles for all
  using (
    auth.uid() = id
    or
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- APP_CONFIG: solo autenticados
alter table app_config enable row level security;

create policy "App config solo autenticados"
  on app_config for all
  using (auth.role() = 'authenticated');

-- CONFIGURACION: lectura pública, escritura admin
alter table configuracion enable row level security;

create policy "Config lectura pública"
  on configuracion for select
  using (true);

create policy "Config escritura admin"
  on configuracion for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- SUNAT_CONFIG: solo admin
alter table sunat_config enable row level security;

create policy "Sunat config solo admin"
  on sunat_config for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- STORAGE: bucket productos
update storage.buckets set public = true where name = 'productos';

create policy "Productos storage lectura pública"
  on storage.objects for select
  using (bucket_id = 'productos');

create policy "Productos storage escritura autenticados"
  on storage.objects for insert
  with check (
    bucket_id = 'productos'
    and auth.role() = 'authenticated'
  );
