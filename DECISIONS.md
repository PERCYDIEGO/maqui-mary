# DECISIONS.md — Maqui Mary

## Arquitectura
- [2026-05-25] Next.js 14 App Router elegido sobre Pages Router por mejor soporte SSR y layouts anidados
- [2026-05-25] Supabase como backend único (auth + DB + storage) para reducir dependencias externas
- [2026-05-25] Firma digital SUNAT implementada localmente con xml-crypto (no terceros) para mayor control sobre el proceso
- [2026-05-25] Context API para estado global en lugar de Redux/Zustand — proyecto de tamaño manejable

## Páginas y rutas
- [2026-05-25] /login y /crm/login coexisten — /login es intencional para uso futuro o landing público
- [2026-05-25] Rutas admin-only: /crm/usuarios, /crm/sunat/*, /crm/configuracion

## Reglas de negocio
- [2026-05-25] IGV: 18% sobre valor unitario de cada ítem
- [2026-05-25] Flujo de pedidos: pendiente → pagado → aprobado → entregado
- [2026-05-25] Roles: admin (acceso total), vendedor (emitir docs, clientes, productos), almacen (inventario, pedidos lectura)
- [2026-05-25] SUNAT RUC: 20606218801. Tipos: 01=Factura, 03=Boleta, 09=Guía de Remisión
- [2026-05-25] Stock se descuenta automáticamente al aprobar pedido o emitir comprobante

## Seguridad
- [2026-05-25] CORREGIDO: Guards de rol implementados en middleware.ts para rutas admin-only
  Antes: solo se ocultaban en el menú (cualquier usuario autenticado podía acceder por URL)
  Ahora: middleware verifica role='admin' en tabla profiles antes de permitir acceso

## Contratos de interfaz (NO romper sin avisar)
- middleware.ts: lee session de Supabase Auth + consulta profiles.role para rutas admin
- verifyAuth(req): extrae JWT de Authorization header o cookie sb-access-token, retorna User|null
- verifyAdmin(req): llama verifyAuth + consulta profiles con service role key, retorna User|null
- AppContext: provee estado global de documentos, clientes y productos

## Deuda técnica pendiente
- [2026-05-25] Sin tests de ningún tipo — lógica de SUNAT (xml-builder, xml-signer) es crítica y no tiene cobertura
- [2026-05-25] BUG-18: URL hardcodeada en CSP del next.config.js — debe venir de NEXT_PUBLIC_APP_URL
- [2026-05-25] Múltiples archivos SQL de migración correctiva (v2, v3, emergency) — esquema inestable sin herramienta de migraciones versionadas
- [2026-05-25] Sin página 403 personalizada — usuarios redirigidos al dashboard con toast
- [2026-05-25] Sin página 500 personalizada
- [2026-05-25] Sin error boundary global en la app
- [2026-05-25] Flujo de reseteo de contraseña por email: pendiente verificar si SMTP está configurado en Supabase
- [2026-05-25] RESUELTO: web/.env.production y web/.env.vercel sacados del tracking de git (git rm --cached). Los valores sensibles estaban vacíos (generados por vercel env pull como plantillas), pero el VERCEL_OIDC_TOKEN estaba expuesto — token ya expirado, riesgo bajo. Ambos .gitignore actualizados.
