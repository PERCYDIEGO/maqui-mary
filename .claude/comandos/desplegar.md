---
name: desplegar
description: Prepara y despliega la aplicación web a producción.
usage: "/desplegar"
---

## Protocolo de Deploy para Maqui Mary (Vercel)

### Paso 1 — Preparación
1. Confirmar que estás en la rama `main`.
2. Hacer `git pull` para traer cambios remotos.
3. Revisar `git status` → no debe haber cambios sin commitear.

### Paso 2 — Build local
1. Ir a `web/`.
2. Ejecutar `npm run build`.
3. Si falla → **arreglar todos los errores antes de continuar**. No deploy con build rojo.
4. Revisar warnings de TypeScript (no deben ser críticos, pero anotar los nuevos).

### Paso 3 — Verificar secrets
1. Revisar que `web/.env.local` y `web/.env.vercel` **NO** están en stage.
2. Confirmar que no hay claves API o tokens hardcodeados en el código fuente.
3. Verificar que Supabase URL y anon key son las de producción (no localhost).

### Paso 4 — Commit final
1. Si hay cambios de último momento, commitear con `chore: pre-deploy checks`.
2. Push a `origin/main`.

### Paso 5 — Deploy
1. Ejecutar `vercel --prod` (o desde dashboard de Vercel).
2. Esperar confirmación de deploy exitoso.
3. Copiar la URL de producción.

### Paso 6 — Smoke test post-deploy
1. Abrir la URL de producción.
2. Verificar: landing page carga, login funciona, catálogo se ve.
3. Verificar una operación crítica: crear un pedido o emitir una boleta (en modo test).
4. Revisar Vercel Analytics / Logs por errores 5xx.

### Excepciones (no deploy automático)
- Build falla → arreglar primero.
- Cambio cosmético sin impacto funcional → deploy opcional.
- Cambio en documentación → no necesita deploy.
- Fix crítico de autenticación o pagos → deploy con monitoreo extra (30 min).
