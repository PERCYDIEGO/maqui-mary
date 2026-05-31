-- Limpiar políticas duplicadas/más permisivas que reemplazan a las nuevas

-- sunat_config: cualquier auth puede leer → solo admin (ya creada en migration_rls)
drop policy if exists "sunat_config_auth_all" on sunat_config;

-- configuracion: cualquier auth puede escribir → solo admin
drop policy if exists "configuracion_auth_write" on configuracion;

-- productos: cualquier auth puede escribir → solo autenticados (ya existe, limpiar duplicado)
drop policy if exists "productos_auth_write" on productos;

-- facturas: anon insert ok, auth all redundante con nuestra policy
drop policy if exists "facturas_auth_all" on facturas;

-- factura_items: anon insert ok, auth all redundante
drop policy if exists "factura_items_auth_all" on factura_items;

-- clientes: policy duplicada
drop policy if exists "clientes_auth_all" on clientes;

-- movimientos: policy duplicada
drop policy if exists "movimientos_auth_all" on movimientos_stock;

-- transportistas: policy duplicada
drop policy if exists "transportistas_auth_all" on transportistas;

-- app_config: policy duplicada
drop policy if exists "app_config_auth_write" on app_config;
drop policy if exists "app_config_public_read" on app_config;

-- profiles: policies duplicadas (más restrictivas que las nuevas)
drop policy if exists "profiles_select" on profiles;
drop policy if exists "profiles_update" on profiles;
