-- ============================================================
-- MIGRACIÓN FINAL — Maqui Mary
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Fecha: 2026-05-31
-- ============================================================
-- Agrupa todo lo pendiente. Es idempotente (se puede re-ejecutar sin riesgo).
-- ============================================================

-- 1. Permitir que usuarios autenticados actualicen su propio perfil
--    (necesario para cambiar force_password_change después de update de contraseña)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'profiles_update_self'
  ) THEN
    CREATE POLICY "profiles_update_self"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);
  END IF;
END $$;

-- 2. Tabla de zonas de delivery (para la sección Configuración)
CREATE TABLE IF NOT EXISTS zonas_delivery (
  id              serial PRIMARY KEY,
  nombre          text NOT NULL,
  distancia_min   decimal(6,2) NOT NULL DEFAULT 0,
  distancia_max   decimal(6,2),
  tarifa          decimal(10,2) NOT NULL DEFAULT 0,
  tiempo_estimado text DEFAULT '1-2 días hábiles',
  activo          boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);

-- 3. Datos iniciales de zonas (solo si la tabla está vacía)
INSERT INTO zonas_delivery (nombre, distancia_min, distancia_max, tarifa, tiempo_estimado)
SELECT * FROM (VALUES
  ('Recojo en tienda',              0,    2.5,  0.00, 'Recojo en almacén — sin costo'),
  ('Zona 1 — Muy cercano',          2.5,  6.0,  7.00, 'Mismo día'),
  ('Zona 2 — Cercano',              6.0, 10.5, 12.00, 'Mismo día'),
  ('Zona 3 — Este Lima',           10.5, 14.5, 17.00, '1 día hábil'),
  ('Zona 4 — Centro Lima',         14.5, 18.5, 22.00, '1 día hábil'),
  ('Zona 5 — Lima Norte/Moderna',  18.5, 23.5, 28.00, '1-2 días hábiles'),
  ('Zona 6 — Lima Sur/Callao',     23.5, 30.0, 33.00, '2 días hábiles'),
  ('Zona 7 — Periferia',           30.0, 37.5, 40.00, '2-3 días hábiles'),
  ('Zona 8 — Sur lejano',          37.5, NULL, 48.00, '3 días hábiles')
) AS v(nombre, distancia_min, distancia_max, tarifa, tiempo_estimado)
WHERE NOT EXISTS (SELECT 1 FROM zonas_delivery LIMIT 1);

-- 4. RLS para zonas_delivery
ALTER TABLE zonas_delivery ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'zonas_delivery' AND policyname = 'zonas_delivery_public_read'
  ) THEN
    CREATE POLICY "zonas_delivery_public_read"
    ON zonas_delivery FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'zonas_delivery' AND policyname = 'zonas_delivery_auth_write'
  ) THEN
    CREATE POLICY "zonas_delivery_auth_write"
    ON zonas_delivery FOR ALL
    TO authenticated
    USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- 5. Columnas de delivery en facturas (si no existen)
ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS delivery_fee          decimal(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_address      text,
  ADD COLUMN IF NOT EXISTS delivery_distrito     text,
  ADD COLUMN IF NOT EXISTS delivery_distancia_km decimal(6,2);

-- Verificación final
SELECT 'profiles_update_self' AS policy,
  EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_update_self') AS ok
UNION ALL
SELECT 'zonas_delivery table',
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='zonas_delivery') AS ok
UNION ALL
SELECT 'zonas_delivery rows',
  (SELECT count(*)::text FROM zonas_delivery) || ' zonas' AS ok;
