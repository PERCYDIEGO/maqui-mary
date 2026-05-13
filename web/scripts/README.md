# 🧹 Limpieza de Base de Datos - Maqui Mary CRM

Scripts para limpiar/borrar todas las facturas y pedidos de la base de datos.

## ⚠️ ADVERTENCIA IMPORTANTE

**Esta acción elimina permanentemente:**
- ❌ TODAS las facturas
- ❌ TODOS los items de facturas
- ❌ TODOS los pedidos
- ❌ TODOS los items de pedidos
- ❌ TODAS las facturas pendientes de aprobación

**NO se eliminan:**
- ✅ Productos
- ✅ Clientes
- ✅ Configuración
- ✅ Usuarios
- ✅ Perfiles

## 📋 Requisitos

1. Tener el archivo `.env.local` configurado con:
   ```
   NEXT_PUBLIC_SUPABASE_URL=tu-url-de-supabase
   SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
   # o
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
   ```

2. Node.js instalado (v18+)

## 🚀 Comandos Disponibles

### 1. Verificar estado actual
```bash
npm run db:status
```
Muestra un resumen de todas las tablas y cuántos registros tienen.

### 2. Limpiar base de datos (modo seguro)
```bash
npm run db:clean:dry
```
Muestra qué se eliminaría sin hacer cambios.

### 3. Limpiar base de datos (REAL)
```bash
npm run db:clean
```
⚠️ **ELIMINA TODAS las facturas y pedidos permanentemente**

### 4. Vaciar tablas rápidamente (modo seguro)
```bash
npm run db:truncate:dry
```
Muestra qué tablas se vaciarían.

### 5. Vaciar tablas rápidamente (REAL)
```bash
npm run db:truncate
```
⚠️ **VACÍA TODAS las tablas de facturas y pedidos**

## 📊 Ejemplo de Uso

### Paso 1: Verificar estado
```bash
npm run db:status
```

Salida esperada:
```
📊 ESTADO DE LA BASE DE DATOS - Maqui Mary CRM

📄 FACTURAS:
   • Facturas: 150 registros
   • Items de Facturas: 320 registros
   • Facturas Pendientes: 5 registros

🛒 PEDIDOS:
   • Pedidos: 23 registros
   • Items de Pedidos: 45 registros
```

### Paso 2: Limpiar (si es necesario)
```bash
npm run db:truncate
```

El script pedirá confirmación antes de proceder.

### Paso 3: Verificar limpieza
```bash
npm run db:status
```

Salida esperada:
```
✨ La base de datos está LIMPIA
   No hay facturas ni pedidos registrados
```

## 🔧 Scripts Individuales

Si prefieres ejecutar directamente:

### Verificar estado
```bash
node scripts/check-db-status.mjs
```

### Limpiar con confirmación
```bash
node scripts/clean-database.mjs --confirm
```

### Vaciar tablas
```bash
node scripts/truncate-facturas-pedidos.mjs --confirm
```

## 🗄️ SQL Directo (Opcional)

Si tienes acceso directo a PostgreSQL (pgAdmin, psql, etc.), puedes ejecutar:

```sql
-- Desde el archivo scripts/clean-database.sql
\i scripts/clean-database.sql
```

O ejecutar manualmente:

```sql
-- Borrar en orden correcto (items primero)
DELETE FROM factura_items;
DELETE FROM pedido_items;
DELETE FROM facturas_pendientes; -- si existe
DELETE FROM facturas;
DELETE FROM pedidos;
```

## 🔒 Seguridad

1. **Siempre verifica primero** con `npm run db:status`
2. **Usa el modo dry-run** antes de ejecutar comandos reales
3. **Asegúrate de estar en el ambiente correcto** (no producción si no es necesario)
4. **Haz backup** si hay datos importantes:
   ```bash
   # Desde Supabase Dashboard → Database → Backups
   # O usar: supabase db dump
   ```

## 🐛 Solución de Problemas

### Error: "Variables de entorno no configuradas"
```bash
# Verifica que existe .env.local
cat .env.local

# Si no existe, créalo:
echo "NEXT_PUBLIC_SUPABASE_URL=tu-url" > .env.local
echo "SUPABASE_SERVICE_ROLE_KEY=tu-key" >> .env.local
```

### Error: "Foreign key violation"
El script automáticamente maneja el orden de eliminación (items primero, luego padres).
Si persiste el error, puede haber tablas relacionadas adicionales.

### Error: "Permission denied"
Asegúrate de usar el `SUPABASE_SERVICE_ROLE_KEY` (no el anon key) para operaciones de eliminación.

## 📞 Soporte

Si tienes problemas:
1. Verifica que las credenciales sean correctas
2. Revisa los logs de error detalladamente
3. Contacta al administrador de la base de datos

---

**Última actualización:** 2026-05-13
