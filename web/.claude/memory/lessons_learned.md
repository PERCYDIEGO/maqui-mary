# Lessons Learned — maqui-mary-web

_Archivo inicial creado por project init._

---

### [2026-05-30] Login no redirigía al CRM — sesión en localStorage vs cookies

- **CONTEXTO**: Flujo de login en `/crm/login`, middleware de Next.js 14, cliente Supabase
- **ERROR**: Al hacer login exitoso, el usuario volvía a la pantalla de login en vez de entrar al CRM
- **CAUSA**: `lib/supabase.ts` usaba `createClient` de `@supabase/supabase-js` que guarda la sesión en **localStorage**. El middleware usa `createServerClient` de `@supabase/ssr` que lee la sesión de **cookies**. Al navegar al CRM, el middleware no encontraba sesión (localStorage no viaja al servidor) y redirigía de vuelta al login.
- **CORRECCIÓN**: Cambiar `lib/supabase.ts` a `createBrowserClient` de `@supabase/ssr`, que sincroniza la sesión a cookies del browser. Además, en `login/page.tsx` reemplazar `router.replace('/crm') + router.refresh()` con `window.location.href = '/crm'` para forzar una navegación completa con cookies.
- **REGLA**: En proyectos Next.js + Supabase SSR con middleware de auth, el cliente browser SIEMPRE debe usar `createBrowserClient` de `@supabase/ssr`, no `createClient` de `@supabase/supabase-js`. El `createClient` estándar NO pone la sesión en cookies y rompe cualquier verificación server-side.

---

### [2026-05-30] Admin bloqueado de ruta /crm/sunat — check duplicado con null unsafe

- **CONTEXTO**: Página `/crm/(app)/sunat/page.tsx`, check de rol admin del lado del cliente
- **ERROR**: El usuario admin era redirigido a `/crm` al intentar acceder a "Envío SUNAT"
- **CAUSA**: La página tenía un `useEffect` que verificaba `profile?.role !== 'admin'` y redirigía si era falso. Si el query a `profiles` fallaba o devolvía `null` (error de red, RLS, perfil no existe), `null?.role` es `undefined`, y `undefined !== 'admin'` es `true` → admin bloqueado. Además era un check redundante porque el middleware ya protege `/crm/sunat`.
- **CORRECCIÓN**: Eliminar el check client-side por completo. El middleware es la fuente de verdad para autorización de rutas admin. No duplicar lógica de auth en el cliente cuando el middleware ya la maneja.
- **REGLA**: No duplicar guards de autorización en el cliente si el middleware ya los tiene. Si se duplica, siempre validar con `profile && profile.role !== 'admin'` (no `profile?.role !== 'admin'`) para no bloquear en caso de error del query.

---

### [2026-05-30] Admin bloqueado de rutas protegidas — query profiles con anon key falla por RLS

- **CONTEXTO**: Middleware Next.js 14 verificando rol en `/crm/sunat`, `/crm/configuracion`, `/crm/usuarios`
- **ERROR**: Usuario con `role = 'admin'` en la tabla `profiles` era redirigido a `/crm/sin-permiso`
- **CAUSA**: El middleware usaba `createServerClient` con el `ANON_KEY` para consultar `profiles`. Si las políticas RLS no permiten `SELECT` con el anon key autenticado (o el perfil no existe), el query retorna `null` y `null?.role !== 'admin'` evalúa como `true` → admin bloqueado.
- **CORRECCIÓN**: Reemplazar el query de Supabase client por un fetch directo usando `SUPABASE_SERVICE_ROLE_KEY` que bypassa RLS completamente. El service role siempre puede leer cualquier fila.
- **REGLA**: En el middleware de Next.js, para queries que determinan autorización, usar `SUPABASE_SERVICE_ROLE_KEY` vía fetch directo a la REST API de Supabase. El anon key puede fallar por RLS y bloquear usuarios legítimos. El service role es seguro en middleware porque es server-side y nunca llega al cliente.

---

### [2026-05-30] Sidebar mostraba secciones que el middleware bloqueaba — incoherencia de roles

- **CONTEXTO**: Sidebar del CRM mostrando ítems de menú basado en `adminOnly: boolean`
- **ERROR**: Configuración aparecía en el sidebar para todos los roles pero el middleware la bloqueaba para no-admins. Almacén veía Documentos, Clientes, Transportistas que no debería.
- **CAUSA**: El campo `adminOnly` en los menu items solo tenía dos estados (admin / no-admin), sin granularidad para el rol `almacen`. Configuración tenía `adminOnly: false` pero estaba en `ADMIN_ONLY_ROUTES` del middleware.
- **CORRECCIÓN**: Reemplazar `adminOnly: boolean` por `allowedRoles: RoleKey[]` en cada item del menú. Middleware actualizado con `VENDEDOR_ROUTES` para bloquear almacen de documentos/clientes/transportistas. Sidebar filtra con `item.allowedRoles.includes(userRole)`.
- **REGLA**: La visibilidad del sidebar y las restricciones del middleware deben ser la misma fuente de verdad. Usar `allowedRoles: string[]` en los items del menú para poder expresar reglas granulares por rol sin duplicar lógica.

---

### [2026-05-30] Rol del usuario queda como 'vendedor' aunque sea admin — query directo a profiles bloqueado por RLS

- **CONTEXTO**: Layout del CRM (`crm/(app)/layout.tsx`) cargando perfil del usuario para determinar rol visible en el sidebar
- **ERROR**: Admin ingresaba al CRM pero no veía las secciones "Envío SUNAT", "Configuración" ni "Usuarios" — el sidebar mostraba solo opciones de vendedor
- **CAUSA**: El layout consultaba `profiles` directamente desde el cliente usando `createBrowserClient` (anon key + JWT del usuario). Si las políticas RLS de la tabla `profiles` no incluyen un SELECT permisivo para usuarios autenticados, el query devuelve null. Con `profile = null`, la función `applyProfile` caía al `else` y llamaba `setUserRole('vendedor')`, ocultando las secciones admin del sidebar.
- **CORRECCIÓN**: Crear endpoint `GET /api/auth/me` que lee la sesión vía `createServerClient` (cookies SSR) y consulta profiles con `SUPABASE_SERVICE_ROLE_KEY` (bypass total de RLS). El layout ahora llama `fetch('/api/auth/me')` en vez del query directo.
- **REGLA**: Nunca cargar datos críticos de autorización (roles, permisos) desde el cliente con anon key. Siempre usar un endpoint server-side con service role. El service role en API routes es seguro porque el código corre en el servidor y nunca llega al browser.

---

### [2026-05-30] Dos esquemas de roles mezclados rompen permisos — editor/viewer no reconocidos

- **CONTEXTO**: Middleware y layout del CRM con roles `admin/vendedor/almacen` (nuevo) vs BD con `admin/editor/visor/viewer` (viejo)
- **ERROR**: Usuarios con `role='editor'` en BD eran bloqueados de rutas de vendedor (documentos, clientes, etc.) porque el middleware solo reconocía `'vendedor'` explícito. Usuarios con `role='viewer'` veían el sidebar de vendedor en vez de almacen.
- **CAUSA**: Al migrar el esquema de roles de `editor/visor` a `vendedor/almacen`, los usuarios existentes en BD mantuvieron los roles viejos. El middleware y el layout no mapeaban los alias antiguos.
- **CORRECCIÓN**: `isVendedor = ['vendedor', 'editor'].includes(userRole)` en middleware. `['almacen', 'visor', 'viewer'].includes(rol)` en layout applyProfile. Mapeo backwards-compatible sin necesidad de migrar datos.
- **REGLA**: Al cambiar el esquema de roles, SIEMPRE mantener backwards-compatibility en el código para los roles viejos. Usar arrays de alias en las comparaciones (`['vendedor', 'editor'].includes(rol)`) en vez de igualdad estricta.

---

### [2026-05-30] RLS en cascade: sunat_config falla porque su policy depende de profiles sin SELECT público

- **CONTEXTO**: Página de configuración, tabla `sunat_config`, política RLS con subquery a `profiles`
- **ERROR**: Toast "No se pudo cargar config SUNAT" aunque el usuario era admin
- **CAUSA**: La policy de `sunat_config` hace `exists (select 1 from profiles where id = auth.uid() and role = 'admin')`. Si `profiles` tiene RLS sin policy SELECT pública, ese subquery también falla → sunat_config inaccesible aunque el usuario sea admin.
- **CORRECCIÓN**: Crear policy `profiles_public_read` con `using (true)` en profiles. Esto rompe el cascade RLS. Archivo: `supabase/migration_fix_profiles_rls.sql`.
- **REGLA**: Si una tabla usa RLS con subquery a otra tabla, esa tabla referenciada DEBE tener policy SELECT permisiva o `SECURITY DEFINER`. De lo contrario el cascade RLS bloquea accesos legítimos. En Supabase, documentar dependencias RLS entre tablas antes de habilitar RLS.

---

### [2026-05-30] Páginas admin con redirect client-side basado en profile query — misma causa raíz en múltiples páginas

- **CONTEXTO**: `usuarios/page.tsx`, `configuracion/page.tsx`, `sunat/page.tsx` — todas con check de rol al montar
- **ERROR**: Admin veía error o era redirigido en páginas protegidas incluso después del fix del layout
- **CAUSA**: Cada página tenía su propio `useEffect` con `supabase.from('profiles')` para verificar el rol. Todos fallaban por RLS. Este patrón estaba replicado en al menos 3 páginas.
- **CORRECCIÓN**: En todas las páginas admin: (1) eliminar el redirect client-side (middleware ya protege), (2) usar `/api/auth/me` si se necesita el rol para UI condicional (ej: `isAdmin` state para mostrar botones).
- **REGLA**: Hacer grep de `supabase.from('profiles')` en páginas del CRM al inicio de sesión para detectar este patrón anti-RLS. El middleware es el único guard que necesita verificar rol para acceso — las páginas solo necesitan el rol para UI condicional, no para redirect.

