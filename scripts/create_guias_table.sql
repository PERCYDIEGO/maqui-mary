-- Crear tabla guias si no existe
CREATE TABLE IF NOT EXISTS guias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serie TEXT NOT NULL DEFAULT 'T001',
  numero INTEGER NOT NULL,
  tipo_guia TEXT NOT NULL DEFAULT '09', -- 09 = Remitente, 31 = Transportista
  fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_inicio_traslado DATE NOT NULL DEFAULT CURRENT_DATE,
  motivo_traslado TEXT NOT NULL DEFAULT '01',
  
  -- Destinatario
  destinatario_id TEXT,
  destinatario_nombre TEXT NOT NULL,
  destinatario_tipo_doc TEXT DEFAULT '6',
  destinatario_num_doc TEXT,
  destinatario_direccion TEXT,
  
  -- Puntos
  punto_partida TEXT NOT NULL,
  punto_llegada TEXT NOT NULL,
  
  -- Transporte
  modalidad_traslado TEXT NOT NULL DEFAULT 'privado', -- privado | publico
  peso_total NUMERIC(10,2) DEFAULT 0,
  unidad_peso TEXT DEFAULT 'KGM',
  numero_bultos INTEGER DEFAULT 0,
  transbordo_programado BOOLEAN DEFAULT false,
  retorno_envases_vacios BOOLEAN DEFAULT false,
  retorno_vehiculo_vacio BOOLEAN DEFAULT false,
  traslado_vehiculo_m1l BOOLEAN DEFAULT false,
  
  -- Transportista
  transportista_id TEXT,
  transportista_nombre TEXT,
  transportista_tipo_doc TEXT,
  transportista_num_doc TEXT,
  transportista_placa TEXT,
  transportista_licencia TEXT,
  transportista_registro_mtc TEXT,
  
  -- Bienes (JSON array)
  bienes JSONB DEFAULT '[]'::jsonb,
  
  -- Documentos relacionados (JSON array)
  documentos_relacionados JSONB DEFAULT '[]'::jsonb,
  
  -- Estado SUNAT
  estado TEXT NOT NULL DEFAULT 'borrador', -- borrador, pendiente_envio, enviado, aprobado, rechazado
  estado_sunat TEXT,
  ticket_sunat TEXT,
  cdr_sunat TEXT,
  xml_sunat TEXT,
  pdf_ticket_sunat TEXT,
  pdf_a4_sunat TEXT,
  error_sunat TEXT,
  enviado_por UUID REFERENCES auth.users(id),
  enviado_at TIMESTAMPTZ,
  
  -- Metadata
  observacion TEXT,
  data_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_guias_estado ON guias(estado);
CREATE INDEX IF NOT EXISTS idx_guias_serie_numero ON guias(serie, numero);
CREATE INDEX IF NOT EXISTS idx_guias_created_at ON guias(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guias_destinatario ON guias(destinatario_num_doc);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_guias_updated_at ON guias;
CREATE TRIGGER update_guias_updated_at
  BEFORE UPDATE ON guias
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS
ALTER TABLE guias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS guias_select ON guias;
CREATE POLICY guias_select ON guias
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS guias_insert ON guias;
CREATE POLICY guias_insert ON guias
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS guias_update ON guias;
CREATE POLICY guias_update ON guias
  FOR UPDATE TO authenticated
  USING (true);

DROP POLICY IF EXISTS guias_delete ON guias;
CREATE POLICY guias_delete ON guias
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));
