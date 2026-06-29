-- Direcciones de referencia por cliente
-- La dirección fiscal sigue en clientes.address (no se mueve)
-- Esta tabla guarda direcciones adicionales (almacenes, sucursales, etc.)

CREATE TABLE IF NOT EXISTS cliente_direcciones (
  id bigint generated always as identity primary key,
  cliente_id bigint references clientes(id) on delete cascade not null,
  etiqueta text not null default 'Sucursal',
  direccion text not null,
  created_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_cliente_direcciones_cliente_id
  ON cliente_direcciones (cliente_id);

ALTER TABLE cliente_direcciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cliente_direcciones_authenticated"
  ON cliente_direcciones FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
