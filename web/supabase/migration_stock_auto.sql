-- Migración: Asegurar columna stock en productos y descuento automático
alter table productos add column if not exists stock int default 0;

-- Asegurar índice en productos para stock bajo
CREATE INDEX IF NOT EXISTS idx_productos_stock ON productos(stock);

-- Migración: Agregar referencia a factura en movimientos_stock
alter table movimientos_stock add column if not exists factura_id bigint references facturas(id) on delete set null;
alter table movimientos_stock add column if not exists pedido_id bigint references facturas(id) on delete set null;
