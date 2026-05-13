-- ============================================================
-- SCRIPT DE LIMPIEZA COMPLETA - Maqui Mary CRM
-- Borra TODAS las facturas y pedidos de la base de datos
-- ⚠️ ADVERTENCIA: Esta acción NO se puede deshacer
-- ============================================================

-- Desactivar triggers temporalmente (si existen)
ALTER TABLE facturas DISABLE TRIGGER ALL;
ALTER TABLE pedidos DISABLE TRIGGER ALL;
ALTER TABLE factura_items DISABLE TRIGGER ALL;
ALTER TABLE pedido_items DISABLE TRIGGER ALL;

-- ============================================================
-- 1. BORRAR FACTURAS Y RELACIONADOS
-- ============================================================

-- Borrar items de facturas primero (foreign key)
DELETE FROM factura_items;

-- Borrar historial de estados de facturas
DELETE FROM factura_estados WHERE factura_id IN (SELECT id FROM facturas);

-- Borrar sincronizaciones de facturas
DELETE FROM facturas_sync WHERE factura_id IN (SELECT id FROM facturas);

-- Borrar facturas pendientes (si existe tabla)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'facturas_pendientes') THEN
        DELETE FROM facturas_pendientes;
    END IF;
END $$;

-- Borrar facturas
DELETE FROM facturas;

-- Resetear secuencia de IDs de facturas (opcional)
-- ALTER SEQUENCE facturas_id_seq RESTART WITH 1;

-- ============================================================
-- 2. BORRAR PEDIDOS Y RELACIONADOS
-- ============================================================

-- Borrar items de pedidos primero (foreign key)
DELETE FROM pedido_items;

-- Borrar historial de estados de pedidos
DELETE FROM pedido_estados WHERE pedido_id IN (SELECT id FROM pedidos);

-- Borrar pedidos
DELETE FROM pedidos;

-- Resetear secuencia de IDs de pedidos (opcional)
-- ALTER SEQUENCE pedidos_id_seq RESTART WITH 1;

-- ============================================================
-- 3. LIMPIAR TABLAS AUXILIARES (opcional)
-- ============================================================

-- Borrar logs de sincronización
DELETE FROM sync_logs WHERE tabla IN ('facturas', 'pedidos');

-- Borrar notificaciones relacionadas
DELETE FROM notificaciones WHERE tipo IN ('factura', 'pedido');

-- ============================================================
-- 4. REACTIVAR TRIGGERS
-- ============================================================

ALTER TABLE facturas ENABLE TRIGGER ALL;
ALTER TABLE pedidos ENABLE TRIGGER ALL;
ALTER TABLE factura_items ENABLE TRIGGER ALL;
ALTER TABLE pedido_items ENABLE TRIGGER ALL;

-- ============================================================
-- 5. VERIFICACIÓN
-- ============================================================

-- Contar registros restantes (deberían ser 0)
SELECT 
    'facturas' as tabla, 
    COUNT(*) as registros 
FROM facturas
UNION ALL
SELECT 
    'factura_items' as tabla, 
    COUNT(*) as registros 
FROM factura_items
UNION ALL
SELECT 
    'pedidos' as tabla, 
    COUNT(*) as registros 
FROM pedidos
UNION ALL
SELECT 
    'pedido_items' as tabla, 
    COUNT(*) as registros 
FROM pedido_items;

-- ============================================================
-- LIMPIEZA COMPLETADA
-- ============================================================
