# Convenciones de Nomenclatura — Maqui Mary

## TypeScript / JavaScript (Web)

### Variables y funciones
- **camelCase:** variables locales, funciones, hooks (`crearFactura`, `totalConIgv`)
- **PascalCase:** componentes React, interfaces, tipos, clases (`CrearFacturaPage`, `FacturaType`)
- **SCREAMING_SNAKE_CASE:** constantes globales, env vars (`IGV_TASA`, `NEXT_PUBLIC_SUPABASE_URL`)

### Archivos
- **Páginas Next.js:** `page.tsx` dentro de carpeta con kebab-case (`facturas/nueva/page.tsx`)
- **Layouts:** `layout.tsx`
- **API Routes:** `route.ts`
- **Componentes React:** PascalCase (`CrearFacturaForm.tsx`)
- **Hooks:** `use` + descripción (`useAuth`, `useFacturas`)
- **Utilidades:** camelCase descriptivo (`calcularTotal.ts`, `formatearFecha.ts`)
- **Tipos:** PascalCase + `Type` o sin sufijo (`FacturaType.ts`)

### Base de datos (Supabase / PostgreSQL)
- **Tablas:** plural, snake_case (`facturas`, `clientes`, `productos`)
- **Columnas:** snake_case (`created_at`, `numero_documento`, `precio_unitario`)
- **Claves foráneas:** `tabla_id` (`cliente_id`, `producto_id`, `usuario_id`)
- **Índices:** `idx_tabla_columna`

## Kotlin (Android)

### Variables y funciones
- **camelCase:** variables locales, funciones (`crearFactura`, `totalIgv`)
- **PascalCase:** clases, interfaces, composables (`CrearFacturaScreen`, `FacturaRepository`)

### Archivos
- **Composables:** PascalCase descriptivo (`HomeScreen.kt`, `CrearFacturaScreen.kt`)
- **ViewModels / Repositories:** PascalCase + sufijo (`FacturaViewModel.kt`, `FacturaRepository.kt`)
- **Entidades:** PascalCase (`FacturaEntity.kt`)
- **DAOs:** PascalCase + `Dao` (`FacturaDao.kt`)

## Assets e imágenes
- **kebab-case:** nombres de archivo (`esponjas-colores.png`, `yape-logo.svg`)
- **Extensiones:** minúsculas (`.png`, `.jpg`, `.svg`)

## Commits (Conventional Commits)
```
feat: nueva funcionalidad
fix: corrección de bug
docs: documentación
style: formato, CSS, sin cambio de lógica
refactor: reestructuración de código
test: tests
chore: tareas de mantenimiento
```
