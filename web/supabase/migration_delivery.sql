-- ============================================================
-- MIGRACIÓN: Delivery por distancia en km desde almacén
-- Origen: Cajamarquilla/Saracoto, Lurigancho
-- RUC 20606218801 — INVERSIONES MAQUI MARY PERU E.I.R.L.
-- ============================================================
-- CÓMO FUNCIONA:
--   1. Cliente pone pin en el mapa
--   2. Sistema calcula km (línea recta) desde Cajamarquilla
--   3. Se busca la zona por distancia → tarifa automática
--   Factor vial Lima ≈ 1.35x la distancia en línea recta
-- ============================================================

-- 1. Eliminar tabla anterior si existe
DROP TABLE IF EXISTS zonas_delivery;

-- 2. Nueva tabla con rangos de distancia
CREATE TABLE zonas_delivery (
  id            serial PRIMARY KEY,
  nombre        text NOT NULL,
  distancia_min decimal(6,2) NOT NULL DEFAULT 0,
  distancia_max decimal(6,2),              -- NULL = sin límite superior
  tarifa        decimal(10,2) NOT NULL DEFAULT 0,
  tiempo_estimado text DEFAULT '1-2 días hábiles',
  activo        boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- 3. Zonas de distancia desde Cajamarquilla/Saracoto
--    km_lineal × 1.35 ≈ km_real_por_carretera
--
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

-- 4. Columnas de delivery en facturas (si no existen)
ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS delivery_fee      decimal(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_address  text,
  ADD COLUMN IF NOT EXISTS delivery_distrito text,
  ADD COLUMN IF NOT EXISTS delivery_distancia_km decimal(6,2);

-- 5. Verificar
SELECT id, nombre, distancia_min,
       COALESCE(distancia_max::text, '∞') AS distancia_max,
       tarifa, tiempo_estimado
FROM zonas_delivery ORDER BY distancia_min;
