-- ============================================================
-- MIGRACIÓN: Modalidad Privada / Pública para Transportistas
-- SUNAT exige distinguir entre transporte propio y contratado
-- ============================================================

-- 1. Agregar columna de modalidad (default 'privado' para no romper existentes)
ALTER TABLE transportistas
  ADD COLUMN IF NOT EXISTS modalidad text NOT NULL DEFAULT 'privado';

-- 2. Agregar campos para modalidad pública
ALTER TABLE transportistas
  ADD COLUMN IF NOT EXISTS ruc text,               -- RUC del transportista externo
  ADD COLUMN IF NOT EXISTS numero_registro_mtc text; -- Ej: 15117368CNG

-- 3. Hacer dni y numero_placa opcionales (públicos no tienen conductor propio)
ALTER TABLE transportistas ALTER COLUMN dni SET DEFAULT '';
ALTER TABLE transportistas ALTER COLUMN numero_placa SET DEFAULT '';

-- Si hay constraint NOT NULL en dni, relajarla
-- (safe: si no existe, no falla)
DO $$
BEGIN
  ALTER TABLE transportistas ALTER COLUMN dni DROP NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

-- 4. Actualizar índice único de placa — solo aplica a privados con placa no vacía
DROP INDEX IF EXISTS idx_transportistas_placa;
CREATE UNIQUE INDEX idx_transportistas_placa
  ON transportistas(numero_placa)
  WHERE activo = true
    AND modalidad = 'privado'
    AND numero_placa IS NOT NULL
    AND numero_placa <> '';
