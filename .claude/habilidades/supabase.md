---
name: supabase-local
description: Skill local para operar con Supabase en Maqui Mary.
---

## Cliente Supabase
- Siempre usar el cliente ya configurado en `web/src/lib/supabase.ts`.
- Existen dos clientes:
  - **Cliente del navegador:** para operaciones del frontend (RLS protege).
  - **Cliente del servidor:** para API routes (usa `service_role_key`, ignora RLS).

## Migraciones SQL
- Las migraciones van en `web/supabase/`.
- Nombres descriptivos: `migration_add_sunat_fields.sql`, `migration_stock_auto.sql`.
- Ejecutar migraciones con `npm run db:status` para verificar estado.

## RLS (Row Level Security)
- Todas las tablas deben tener RLS habilitado.
- Las políticas deben permitir:
  - `SELECT` para usuarios autenticados según rol.
  - `INSERT/UPDATE/DELETE` solo para `admin` o el dueño del registro.
- Nunca desactivar RLS en producción.

## Tipos de datos comunes
```typescript
// Cliente
interface Cliente {
  id: number;
  nombre: string;
  tipo_documento: 'DNI' | 'RUC';
  numero_documento: string;
  telefono?: string;
  direccion?: string;
  created_at: string;
}

// Producto
interface Producto {
  id: number;
  nombre: string;
  descripcion?: string;
  precio_unitario: number;
  stock: number;
  imagen_url?: string;
  activo: boolean;
}

// Pedido
interface Pedido {
  id: number;
  cliente_id: number;
  estado: 'pendiente' | 'pagado' | 'aprobado' | 'entregado';
  total: number;
  igv: number;
  subtotal: number;
  created_at: string;
}
```

## Reglas de operación
- Para queries complejas, preferir RPC (Stored Procedures) en Supabase.
- Nunca exponer `service_role_key` en el frontend.
- Para operaciones masivas (bulk insert), usar `supabase.from().insert([...])` con batch.
- Siempre manejar errores de Supabase con try-catch.
