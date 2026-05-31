-- Transportistas: modalidad + RUC + registro MTC
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

-- Facturas: trazabilidad + delivery
ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS created_by uuid references auth.users(id) on delete set null;

ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS data_json jsonb default '{}';

ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS delivery_fee decimal(10,2) default 0;

ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS delivery_address text;

ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS delivery_distrito text;

ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS delivery_distancia_km decimal(6,2);

-- Productos: campos SUNAT + frecuencia de uso
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS usosFrecuentes int default 0;

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS codigoSunat text default '';

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS partidaArancelaria text default '';

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS gtin text default '';

-- SUNAT config: series guía + API token
ALTER TABLE sunat_config
  ADD COLUMN IF NOT EXISTS series_guia text default 'T001';

ALTER TABLE sunat_config
  ADD COLUMN IF NOT EXISTS next_number_guia bigint default 1;

ALTER TABLE sunat_config
  ADD COLUMN IF NOT EXISTS apisunat_token text default '';

ALTER TABLE sunat_config
  ADD COLUMN IF NOT EXISTS apisunat_environment text default 'sandbox'
    check (apisunat_environment in ('sandbox', 'produccion'));

-- Zonas de delivery
CREATE TABLE IF NOT EXISTS zonas_delivery (
  id            serial PRIMARY KEY,
  nombre        text NOT NULL,
  distancia_min decimal(6,2) NOT NULL DEFAULT 0,
  distancia_max decimal(6,2),
  tarifa        decimal(10,2) NOT NULL DEFAULT 0,
  tiempo_estimado text DEFAULT '1-2 días hábiles',
  activo        boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- Índices adicionales
CREATE INDEX IF NOT EXISTS idx_facturas_status_origen ON facturas(status, origen);
CREATE INDEX IF NOT EXISTS idx_movimientos_created_by ON movimientos_stock(created_by);
