---
name: fix-bug
description: Corrige un bug siguiendo el protocolo de debug estructurado.
usage: "/fix-bug [descripcion del bug]"
---

## Protocolo de Debug para Maqui Mary

### Paso 1 — Reproducir
1. Identificar los pasos exactos para reproducir el bug.
2. Confirmar que el bug existe en el entorno local (`npm run dev`).
3. Revisar si existe en producción también.

### Paso 2 — Identificar causa raíz
1. Leer los archivos relacionados (componentes, API routes, lib).
2. Revisar logs del servidor (`npm run dev`) y consola del navegador.
3. Si involucra DB, revisar estado con `npm run db:status`.
4. Si involucra SUNAT, revisar XML generado en `src/lib/sunat/`.

### Paso 3 — Aplicar fix mínimo
1. Hacer el cambio más pequeño posible que resuelva el bug.
2. Preferir un solo archivo modificado.
3. No refactorizar aprovechando (eso va en otro comando).

### Paso 4 — Verificar
1. Reproducir los pasos del bug → confirmar que ya no ocurre.
2. Ejecutar `npm run build` → debe pasar sin errores.
3. Si hay tests relacionados → ejecutar y confirmar que pasan.
4. Verificar flujos principales: login, crear pedido, emitir boleta.

### Paso 5 — Commit y deploy
1. Commit con prefijo `fix:` y descripción clara.
2. Si build pasa → deploy automático con `vercel --prod`.
3. Verificar en producción que el bug está resuelto.

### Reglas específicas de Maqui Mary
- Si el bug es de cálculos (totales, IGV, stock), verificar con múltiples casos de prueba.
- Si el bug es de SUNAT, revisar que el XML generado siga siendo válido contra el esquema UBL 2.1.
- Si el bug afecta autenticación, verificar todos los roles (admin, vendedor, cliente).
