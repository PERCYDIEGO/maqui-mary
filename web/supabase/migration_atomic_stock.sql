-- Función atómica para descontar stock y registrar movimiento en una sola operación
-- Elimina la race condition BUG-04 del patrón read-then-write en emit/route.ts
--
-- Uso: supabase.rpc('decrement_stock', { p_producto_id, p_cantidad, p_motivo, p_factura_id })
--
-- Para ejecutar: pega este SQL en el SQL Editor de Supabase Dashboard → Run

CREATE OR REPLACE FUNCTION decrement_stock(
  p_producto_id UUID,
  p_cantidad     INTEGER,
  p_motivo       TEXT,
  p_factura_id   UUID
) RETURNS VOID
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
BEGIN
  -- Una sola sentencia UPDATE lee y escribe atomicamente — no hay ventana entre SELECT y UPDATE
  UPDATE productos
  SET stock = GREATEST(0, stock - p_cantidad)
  WHERE id = p_producto_id;

  INSERT INTO movimientos_stock (producto_id, tipo, cantidad, motivo, factura_id)
  VALUES (p_producto_id, 'salida', p_cantidad, p_motivo, p_factura_id);
END;
$$;
