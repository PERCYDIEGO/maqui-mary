-- Columnas faltantes en tabla facturas para emisión SUNAT completa
-- Ejecutar en: https://app.supabase.com/project/ofemdngaslpdexsqfcbb/sql/new

ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS codigo_qr    text    DEFAULT '',
  ADD COLUMN IF NOT EXISTS hash_cpe     text    DEFAULT '',
  ADD COLUMN IF NOT EXISTS cdr_codigo   text    DEFAULT '',
  ADD COLUMN IF NOT EXISTS cdr_descripcion text DEFAULT '',
  ADD COLUMN IF NOT EXISTS firma_digest text    DEFAULT '',
  ADD COLUMN IF NOT EXISTS forma_pago   text    DEFAULT 'contado',
  ADD COLUMN IF NOT EXISTS tipo_cambio  numeric(10,3) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS guia_remision text   DEFAULT '',
  ADD COLUMN IF NOT EXISTS orden_compra text    DEFAULT '';

-- Columnas para guías de remisión
ALTER TABLE sunat_config
  ADD COLUMN IF NOT EXISTS series_guia       text   DEFAULT 'T001',
  ADD COLUMN IF NOT EXISTS next_number_guia  bigint DEFAULT 1;

UPDATE sunat_config
  SET series_guia = 'T001', next_number_guia = 1
  WHERE id = 1 AND series_guia IS NULL;
