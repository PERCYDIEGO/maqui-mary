---
name: refactor
description: Refactoriza código manteniendo el comportamiento exacto.
usage: "/refactor [archivo o funcion]"
---

## Protocolo de Refactor para Maqui Mary

### Paso 1 — Entender
1. Leer completamente el código objetivo.
2. Identificar el problema: duplicación, nombre pobre, complejidad, magic numbers, etc.
3. Documentar el comportamiento actual (entradas/salidas esperadas).

### Paso 2 — Planificar
1. Definir el objetivo del refactor (¿qué mejora?).
2. Planificar cambios sin alterar comportamiento externo.
3. Identificar tests que deben seguir pasando.

### Paso 3 — Baseline
1. Ejecutar `npm run build` y confirmar que pasa ANTES del refactor.
2. Ejecutar tests relacionados si existen.
3. Si no hay tests, crear un test mínimo de smoke para la función antes de refactorizar.

### Paso 4 — Ejecutar
1. Aplicar el refactor paso a paso (un cambio a la vez).
2. Si el refactor toca más de 3 archivos, dividirlo en sesiones separadas.
3. Preferir extracción de funciones, renombrado, o eliminación de duplicación.

### Paso 5 — Verificar
1. Ejecutar `npm run build` → debe pasar.
2. Ejecutar tests → deben pasar.
3. Verificar manualmente el flujo afectado en la UI.

### Paso 6 — Commit
1. Commit con prefijo `refactor:` y descripción clara de la mejora.
2. No mezclar con fixes de bug (commit separado).

### Anti-patrones a evitar
- No cambiar lógica de negocio durante un refactor.
- No modificar comportamiento de autenticación o facturación sin testear exhaustivamente.
- No eliminar comentarios útiles solo porque "queda más limpio".
