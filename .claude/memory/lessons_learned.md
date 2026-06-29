# Lessons Learned — Maqui-Mary

_Archivo creado automáticamente. Agregar lecciones a medida que se resuelven bugs._

### [2026-06-28] TypeError al cambiar a pestaña Guías de Remisión en Documentos
- **CONTEXTO**: `web/src/context/AppContext.tsx` (`loadDocuments`), `web/src/app/crm/(app)/guias/page.tsx`, `web/src/app/crm/(app)/documentos/page.tsx`. Ocurre al cargar guías guardadas con datos corruptos en `data_json`.
- **ERROR**: "⚠️ Error inesperado — Algo falló en esta sección" al cambiar a la pestaña "Guías de Remisión" en `/crm/documentos`. El error boundary genérico de `(app)/error.tsx` captura un TypeError síncrono durante el render.
- **CAUSA**: Doble problema:
  1. `reviveDates()` en `AppContext.tsx:361` convierte **cualquier string** que coincide con el regex ISO date (`/^\d{4}-\d{2}-\d{2}T.../`) a un objeto `Date`. Si un campo no-fecha (como `destinatarioNombre`, `motivoTraslado`, `observaciones`) contenía accidentalmente un string con formato ISO, `reviveDates` lo transforma a `Date`, rompiendo el type contract.
  2. `loadDocuments()` hace `...dataJson` (spread) ANTES de los overrides específicos (línea 363–382). Esto permite que campos con tipos incorrectos desde `data_json` inunden el objeto guía y sobrescriban valores esperados. Aunque los overrides corrigen algunos campos, `doc.cliente` y otros anidados pueden venir del spread crudo sin coerción.
  3. En `documentos/page.tsx:46`, `clienteNombre.toLowerCase()` (y similar en `guias/page.tsx:49-50`) asume que `clienteNombre` y `destinatarioNombre` son strings — si son `Date` u objeto, lanza `TypeError`.
- **CORRECCIÓN**: (pendiente de implementar)
  1. Envolver con `String()` todos los accesos a campos de guía en renders y filtros.
  2. En `loadDocuments`, mover el spread `...dataJson` DESPUÉS de los overrides específicos, o usar `String()` en los fallbacks.
  3. Considerar limitar `reviveDates` a solo campos-fecha conocidos en vez de aplicar regex a todo string.
- **REGLA**: Nunca hacer spread completo de `data_json` de Supabase — los tipos no están garantizados. Siempre extraer campos específicos con coerción explícita de tipo (`String()`, `Number()`, `Date()`). `reviveDates` no debe mutar strings arbitrarios a Date — usar whitelist de campos fecha.

### [2026-06-28] TypeError en filter/sort de guías por tipo incorrecto en spread
- **CONTEXTO**: `web/src/app/crm/(app)/guias/page.tsx` líneas 48–50, `web/src/context/AppContext.tsx` líneas 360–383.
- **ERROR**: `.toLowerCase()` lanza TypeError cuando el valor no es string (ej: `Date`, `Array`, `Object`).
- **CAUSA**: `guiasFiltradas.filter()` accede a `g.destinatarioNombre` que, tras el spread `...dataJson`, puede ser un `Date` si `reviveDates` transformó el string original. El operador `||` no protege porque un `Date` es truthy.
- **CORRECCIÓN**: (pendiente) Usar `String(g.destinatarioNombre || '')` antes de `.toLowerCase()` en todos los filtros. Aplicar mismo patrón en `documentos/page.tsx`.
- **REGLA**: El operador `|| ''` solo protege contra null/undefined, no contra tipos incorrectos. Usar `String(valor || '')` para garantizar string en operaciones que llaman `.toLowerCase()`, `.replace()`, `.substring()`.
