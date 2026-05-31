-- Storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('productos', 'productos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-evidence', 'payment-evidence', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Productos storage lectura pública"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'productos');

CREATE POLICY "Productos storage escritura autenticados"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'productos'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Public can view payment evidence"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-evidence');

CREATE POLICY "Anyone can upload payment evidence"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'payment-evidence');

-- Row Level Security
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE factura_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE transportistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE sunat_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE zonas_delivery ENABLE ROW LEVEL SECURITY;

-- Productos: público lee, autenticados escriben
CREATE POLICY "Productos lectura pública"
  on productos for select
  using (true);

CREATE POLICY "Productos escritura autenticados"
  on productos for insert
  with check (auth.role() = 'authenticated');

CREATE POLICY "Productos actualización autenticados"
  on productos for update
  using (auth.role() = 'authenticated');

CREATE POLICY "Productos eliminación autenticados"
  on productos for delete
  using (auth.role() = 'authenticated');

-- Clientes: solo autenticados
CREATE POLICY "Clientes solo autenticados"
  on clientes for all
  using (auth.role() = 'authenticated');

-- Facturas: solo autenticados
CREATE POLICY "Facturas solo autenticados"
  on facturas for all
  using (auth.role() = 'authenticated');

CREATE POLICY "facturas_anon_web_insert"
  on facturas for insert
  with check (origen = 'web');

-- Factura items: solo autenticados
CREATE POLICY "Factura items solo autenticados"
  on factura_items for all
  using (auth.role() = 'authenticated');

CREATE POLICY "factura_items_anon_insert"
  on factura_items for insert
  with check (true);

-- Movimientos stock: solo autenticados
CREATE POLICY "Movimientos stock solo autenticados"
  on movimientos_stock for all
  using (auth.role() = 'authenticated');

-- Transportistas: solo autenticados
CREATE POLICY "Transportistas solo autenticados"
  on transportistas for all
  using (auth.role() = 'authenticated');

-- Profiles: lectura pública, escritura propio usuario o admin
CREATE POLICY "Profiles lectura pública"
  on profiles for select
  using (true);

CREATE POLICY "Profiles solo propio usuario o admin"
  on profiles for all
  using (
    auth.uid() = id
    or
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- App config: solo autenticados
CREATE POLICY "App config solo autenticados"
  on app_config for all
  using (auth.role() = 'authenticated');

-- Configuracion: lectura pública, escritura admin
CREATE POLICY "Config lectura pública"
  on configuracion for select
  using (true);

CREATE POLICY "Config escritura admin"
  on configuracion for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- SUNAT config: solo admin
CREATE POLICY "Sunat config solo admin"
  on sunat_config for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Zonas delivery: lectura pública, escritura autenticados
CREATE POLICY "Zonas delivery lectura pública"
  on zonas_delivery for select
  using (true);

CREATE POLICY "Zonas delivery escritura autenticados"
  on zonas_delivery for all
  using (auth.role() = 'authenticated');
