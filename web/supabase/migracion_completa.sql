-- ============================================================
-- MIGRACIÓN COMPLETA — Maqui Mary
-- Consolidación de TODOS los archivos de migración que nunca
-- se ejecutaron contra Supabase.
--
-- Origen: migration_transportistas_modalidad.sql
--         migration_correctivo_v3.sql
--         migration_facturas_campos.sql / migration_add_sunat_fields.sql
--         migration_sunat_guias.sql
--         migration_apisunat_token.sql
--         migration_delivery.sql
--         migration_correctivo_v2.sql
--         migration.sql
--         migration_stock_auto.sql
--
-- PEGAR COMPLETO en: Supabase Dashboard > SQL Editor > New Query
-- Ejecutar UNA SOLA VEZ. Es seguro para re-ejecutar (todo IF NOT EXISTS).
-- ============================================================

-- ============================================================
-- 1. TRANSPORTISTAS: modalidad + RUC + registro MTC
-- ============================================================
ALTER TABLE transportistas
  ADD COLUMN IF NOT EXISTS modalidad text NOT NULL DEFAULT 'privado';

ALTER TABLE transportistas
  ADD COLUMN IF NOT EXISTS ruc text;

ALTER TABLE transportistas
  ADD COLUMN IF NOT EXISTS numero_registro_mtc text;

ALTER TABLE transportistas ALTER COLUMN dni SET DEFAULT '';
ALTER TABLE transportistas ALTER COLUMN numero_placa SET DEFAULT '';

DO $$
BEGIN
  ALTER TABLE transportistas ALTER COLUMN dni DROP NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

DROP INDEX IF EXISTS idx_transportistas_placa;
CREATE UNIQUE INDEX idx_transportistas_placa
  ON transportistas(numero_placa)
  WHERE activo = true
    AND modalidad = 'privado'
    AND numero_placa IS NOT NULL
    AND numero_placa <> '';

-- ============================================================
-- 2. FACTURAS: trazabilidad + delivery
-- ============================================================
ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS created_by uuid references auth.users(id) on delete set null;

ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS data_json jsonb default '{}';

ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS payment_evidence_url text default '';

ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS delivery_fee decimal(10,2) default 0;

ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS delivery_address text;

ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS delivery_distrito text;

ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS delivery_distancia_km decimal(6,2);

-- ============================================================
-- 3. PRODUCTOS: campos SUNAT + frecuencia de uso
-- ============================================================
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS usosFrecuentes int default 0;

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS codigoSunat text default '';

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS partidaArancelaria text default '';

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS gtin text default '';

-- ============================================================
-- 4. SUNAT_CONFIG: series guía + API token
-- ============================================================
ALTER TABLE sunat_config
  ADD COLUMN IF NOT EXISTS series_guia text default 'T001';

ALTER TABLE sunat_config
  ADD COLUMN IF NOT EXISTS next_number_guia bigint default 1;

ALTER TABLE sunat_config
  ADD COLUMN IF NOT EXISTS apisunat_token text default '';

ALTER TABLE sunat_config
  ADD COLUMN IF NOT EXISTS apisunat_environment text default 'sandbox'
    check (apisunat_environment in ('sandbox', 'produccion'));

UPDATE sunat_config
  SET series_guia = coalesce(series_guia, 'T001'),
      next_number_guia = coalesce(next_number_guia, 1),
      apisunat_environment = coalesce(apisunat_environment, 'sandbox')
  WHERE id = 1;

-- ============================================================
-- 5. PROFILES: actualizar roles
-- ============================================================
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role in ('admin', 'editor', 'viewer'));
UPDATE profiles SET role = 'editor' WHERE role = 'vendedor';
UPDATE profiles SET role = 'viewer' WHERE role = 'almacen';
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'editor';

-- ============================================================
-- 6. ZONAS_DELIVERY: tabla de tarifas por distancia
-- ============================================================
DROP TABLE IF EXISTS zonas_delivery;

CREATE TABLE zonas_delivery (
  id            serial PRIMARY KEY,
  nombre        text NOT NULL,
  distancia_min decimal(6,2) NOT NULL DEFAULT 0,
  distancia_max decimal(6,2),
  tarifa        decimal(10,2) NOT NULL DEFAULT 0,
  tiempo_estimado text DEFAULT '1-2 días hábiles',
  activo        boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

INSERT INTO zonas_delivery (nombre, distancia_min, distancia_max, tarifa, tiempo_estimado) VALUES
  ('Recojo en tienda',     0,    2.5,  0.00, 'Recojo en almacén — sin costo'),
  ('Zona 1 — Muy cercano', 2.5,  6.0,  7.00, 'Mismo día'),
  ('Zona 2 — Cercano',     6.0, 10.5, 12.00, 'Mismo día'),
  ('Zona 3 — Este Lima',  10.5, 14.5, 17.00, '1 día hábil'),
  ('Zona 4 — Centro Lima',14.5, 18.5, 22.00, '1 día hábil'),
  ('Zona 5 — Lima Norte/Moderna', 18.5, 23.5, 28.00, '1-2 días hábiles'),
  ('Zona 6 — Lima Sur/Callao',   23.5, 30.0, 33.00, '2 días hábiles'),
  ('Zona 7 — Periferia',  30.0, 37.5, 40.00, '2-3 días hábiles'),
  ('Zona 8 — Sur lejano', 37.5, NULL, 48.00, '3 días hábiles');

-- ============================================================
-- 7. STORAGE BUCKET: comprobantes de pago
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-evidence', 'payment-evidence', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view payment evidence') THEN
    CREATE POLICY "Public can view payment evidence"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'payment-evidence');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can upload payment evidence') THEN
    CREATE POLICY "Anyone can upload payment evidence"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'payment-evidence');
  END IF;
END $$;

-- ============================================================
-- 8. CONFIG: semilla si no existe
-- ============================================================
INSERT INTO configuracion (id, company_name, ruc, address, phone, series, next_number)
VALUES (1, 'ES PONJAS MAQUI MARY', '10456789012', 'PRO. QUINTA AVENIDA MZA. J LOTE. 17-B ASC. GANADEROS PORCINOS SARACO', '(51) 949 446 676', 'F001', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO sunat_config (id, ruc, razon_social, nombre_comercial, address, provincia, departamento, distrito, ubigeo, series_factura, series_boleta)
VALUES (1, '10456789012', 'ES PONJAS MAQUI MARY', 'MAQUI MARY', 'PRO. QUINTA AVENIDA MZA. J LOTE. 17-B ASC. GANADEROS PORCINOS SARACO', 'LIMA', 'LIMA', 'LURIGANCHO', '150103', 'F001', 'B001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO app_config (id, settings) VALUES (1, '{
  "cintillo_timer_minutos": 5,
  "audio_bg_volumen": 0.025,
  "audio_bg_activo": true,
  "cintillo_messages": [
    {"icon": "🔥", "text": "El más vendido: Mix x10 Esponjas — desde S/ 12.00"},
    {"icon": "🇵🇪", "text": "Hecho en Perú · Fabricación propia"},
    {"icon": "⭐", "text": "5.0 estrellas · Más de 12,800 clientes"}
  ]
}') ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 9. RLS POLICIES (Row Level Security)
-- ============================================================
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE factura_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE transportistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE sunat_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "productos_public_read" ON productos;
CREATE POLICY "productos_public_read" ON productos FOR SELECT USING (true);

DROP POLICY IF EXISTS "productos_auth_write" ON productos;
CREATE POLICY "productos_auth_write" ON productos FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "clientes_auth_all" ON clientes;
CREATE POLICY "clientes_auth_all" ON clientes FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "facturas_auth_all" ON facturas;
CREATE POLICY "facturas_auth_all" ON facturas FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "facturas_anon_web_insert" ON facturas;
CREATE POLICY "facturas_anon_web_insert" ON facturas FOR INSERT WITH CHECK (origen = 'web');

DROP POLICY IF EXISTS "factura_items_auth_all" ON factura_items;
CREATE POLICY "factura_items_auth_all" ON factura_items FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "factura_items_anon_insert" ON factura_items;
CREATE POLICY "factura_items_anon_insert" ON factura_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "movimientos_auth_all" ON movimientos_stock;
CREATE POLICY "movimientos_auth_all" ON movimientos_stock FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "transportistas_auth_all" ON transportistas;
CREATE POLICY "transportistas_auth_all" ON transportistas FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "configuracion_public_read" ON configuracion;
CREATE POLICY "configuracion_public_read" ON configuracion FOR SELECT USING (true);

DROP POLICY IF EXISTS "configuracion_auth_write" ON configuracion;
CREATE POLICY "configuracion_auth_write" ON configuracion FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "sunat_config_auth_all" ON sunat_config;
CREATE POLICY "sunat_config_auth_all" ON sunat_config FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "app_config_public_read" ON app_config;
CREATE POLICY "app_config_public_read" ON app_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "app_config_auth_write" ON app_config;
CREATE POLICY "app_config_auth_write" ON app_config FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- 10. ÍNDICES ADICIONALES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_facturas_status_origen ON facturas(status, origen);
CREATE INDEX IF NOT EXISTS idx_movimientos_created_by ON movimientos_stock(created_by);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(category);
CREATE INDEX IF NOT EXISTS idx_facturas_cliente ON facturas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_facturas_fecha ON facturas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_facturas_origen ON facturas(origen);
CREATE INDEX IF NOT EXISTS idx_facturas_estado_sunat ON facturas(estado_sunat);
CREATE INDEX IF NOT EXISTS idx_facturas_status ON facturas(status);
CREATE INDEX IF NOT EXISTS idx_facturas_payment_method ON facturas(payment_method);
CREATE INDEX IF NOT EXISTS idx_factura_items_factura ON factura_items(factura_id);
CREATE INDEX IF NOT EXISTS idx_productos_stock ON productos(stock);
CREATE INDEX IF NOT EXISTS idx_movimientos_producto ON movimientos_stock(producto_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos_stock(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON movimientos_stock(tipo);
CREATE INDEX IF NOT EXISTS idx_transportistas_activo ON transportistas(activo);

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
-- Ejecutar estas consultas después para confirmar:
--
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'transportistas' ORDER BY ordinal_position;
--
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'facturas' ORDER BY ordinal_position;
--
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'productos' ORDER BY ordinal_position;
--
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'sunat_config' ORDER BY ordinal_position;
-- ============================================================
-- FIN — ¡Listo!
-- ============================================================
