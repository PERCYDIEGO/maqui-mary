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

---

### [2026-05-31] Toast "No se pudo cargar config SUNAT" en CADA navegación

- **CONTEXTO**: Página `/crm/configuracion`, useEffect que carga `sunat_config` al montar
- **ERROR**: Toast de error aparecía cada vez que el usuario visitaba la sección Configuración mientras la policy RLS recursiva estuviera activa
- **CAUSA**: El catch de `loadSunatConfig` hacía `toast.error('No se pudo cargar config SUNAT: ' + e.message)` para CUALQUIER error, incluyendo el de recursión infinita de RLS. El usuario veía el toast en cada visita a esa sección.
- **CORRECCIÓN**: Distinguir errores de RLS (`e.message.includes('infinite recursion') || e.message.includes('policy')`) y silenciarlos — son errores de configuración de BD, no errores de la app. Errores reales (red, DB caída) siguen mostrando toast.
- **REGLA**: Los errores de RLS son errores de infraestructura/configuración, no errores de usuario. Detectar con `message.includes('infinite recursion')` y no mostrar toast al usuario. Loguear en console para debug pero no interrumpir la UX.

---

### [2026-05-31] E2E test debe detectar toasts de error al navegar entre secciones

- **CONTEXTO**: Test E2E `tests/functional/flujo-completo.spec.ts`
- **ERROR**: Los tests verificaban que las páginas cargaban (sin Error 500) pero no verificaban que no aparecieran toasts de error durante la navegación
- **CORRECCIÓN**: Agregar test que navega por TODAS las secciones y verifica que ningún toast de error con patrones `/No se pudo cargar|Error al cargar|infinite recursion/i` sea visible
- **REGLA**: Los tests E2E deben verificar ausencia de toasts de error además de ausencia de errores HTTP. Una página puede cargar con código 200 pero mostrar toasts de error visibles al usuario.

---

### [2026-05-31] clearSession en helpers.ts usaba ruta /crm/logout inexistente

- **CONTEXTO**: `tests/helpers.ts`, función `clearSession` llamada por `loginAs` antes de cada login
- **ERROR**: `page.goto('/crm/logout')` navegaba a una ruta que no existe en Next.js → 404 silencioso. Los errores estaban en `.catch(() => {})` así que no rompía tests pero causaba lentitud y confusión.
- **CAUSA**: La función asumía que existía una ruta `/crm/logout` cuando el logout real es client-side via `supabase.auth.signOut()` en el layout.
- **CORRECCIÓN**: Reemplazar por `page.context().clearCookies()` + `page.goto('/crm/login')` + `localStorage/sessionStorage.clear()`. No depender de rutas de la app para limpiar sesión.
- **REGLA**: En tests E2E, limpiar sesión directamente con `clearCookies()` y `localStorage.clear()`, no navegando a una ruta de logout que puede no existir. Es más rápido y confiable.

---

### [2026-05-31] console.log en middleware filtra info de requests en producción

- **CONTEXTO**: `middleware.ts`, logs de debug para rastrear sesiones
- **ERROR**: 3 `console.log` exponían paths de requests y nombres de cookies en los logs de producción (Vercel). ESLint `no-console` lo detectó como warning.
- **CAUSA**: Se agregaron durante debugging de la autenticación SSR y nunca se eliminaron
- **CORRECCIÓN**: Eliminar los console.log. El fallback `getSession → getUser` se mantuvo por robustez.
- **REGLA**: NUNCA dejar `console.log` con datos de requests en middleware o API routes. Usar solo en desarrollo local con guard `if (process.env.NODE_ENV === 'development')`. En producción filtran paths y cookies a los logs.

---

### [2026-05-31] El patrón anti-RLS de supabase.from('profiles') estaba replicado en 3+ páginas

- **CONTEXTO**: Auditoría completa del proyecto — `sunat/diagnostico/page.tsx` aún tenía el mismo bug
- **ERROR**: `sunat/diagnostico/page.tsx` tenía el mismo `supabase.from('profiles').select('role')` con redirect si null — misma causa raíz que ya fue corregida en `sunat/page.tsx` y `usuarios/page.tsx`
- **CAUSA**: El patrón fue copiado en varias páginas al momento de crearlas y no se auditaron todas al hacer el fix inicial.
- **CORRECCIÓN**: Al corregir un patrón anti-pattern en una página, hacer **grep del patrón en todo el proyecto** para encontrar todas las instancias. No asumir que solo existe en los archivos reportados.
- **REGLA**: Al hacer fix de un bug con patrón replicable, siempre correr `grep -r "patron" src/` para encontrar todas las instancias antes de cerrar el fix.

---

### [2026-05-31] cambiar-contrasena: UPDATE profiles bloqueado por RLS — force_password_change no se actualizaba

- **CONTEXTO**: `crm/cambiar-contrasena/page.tsx`, flujo de primer login forzado
- **ERROR**: `supabase.from('profiles').update({ force_password_change: false })` falló silencioso por RLS. El usuario cambiaba contraseña pero volvía a ser forzado a cambiarla en cada login.
- **CAUSA**: Sin policy `profiles_update_self` (`FOR UPDATE USING (auth.uid() = id)`), el anon key no puede UPDATE en la tabla profiles aunque sea el propio usuario.
- **CORRECCIÓN**: Reemplazar el UPDATE directo con `PATCH /api/auth/me` que usa service role para garantizar el update. Handler PATCH con whitelist explícita (`force_password_change` únicamente) para evitar escalada de privilegios.
- **REGLA**: Para operaciones de UPDATE/INSERT en tablas con RLS desde el cliente, verificar que exista la policy correspondiente O usar un API endpoint con service role. Nunca asumir que un UPDATE del propio registro funciona sin la policy explícita `FOR UPDATE USING (auth.uid() = id)`.

---

### [2026-05-31] zonas_delivery no existía en BD — sección Configuración mostraba vacío sin error visible

- **CONTEXTO**: Página `configuracion`, sección de zonas de delivery
- **ERROR**: La tabla `zonas_delivery` no existía en producción. La query fallaba pero el código ya manejaba el error silenciosamente (`if (!error && data) setZonas(data)`). El usuario veía la sección vacía sin saber por qué.
- **CAUSA**: La migración `migration_delivery.sql` existía en el repo pero nunca fue ejecutada en la BD de producción.
- **CORRECCIÓN**: Crear `migration_final_pendientes.sql` con `CREATE TABLE IF NOT EXISTS zonas_delivery` + datos iniciales + RLS policies.
- **REGLA**: Mantener un archivo `migration_pendientes.sql` actualizado con todo lo que falta ejecutar en producción. Al hacer auditoría, verificar qué tablas usa el código y cuáles existen realmente en la BD.

---

### [2026-05-31] payment/evidence bloqueaba a clientes del landing con "No autorizado"

- **CONTEXTO**: `api/payment/evidence/route.ts`, flujo de pago del carrito en el landing
- **ERROR**: Clientes recibían "No autorizado" al intentar subir su comprobante de pago (Yape/Plin). El flujo completo de compra quedaba roto.
- **CAUSA**: La auditoría de seguridad agregó `verifyAuth` a este endpoint asumiendo que solo el CRM lo usaba. Pero es una ruta **pública** — clientes anónimos del landing la llaman sin sesión CRM.
- **CORRECCIÓN**: Eliminar `verifyAuth`. La ruta ya está en `PUBLIC_API_ROUTES` del middleware. La validación de tipo/tamaño de archivo permanece como protección anti-abuso.
- **REGLA**: Al agregar auth a endpoints de API, verificar SIEMPRE quién llama la ruta: ¿CRM interno o clientes públicos del landing? Los endpoints en `PUBLIC_API_ROUTES` son públicos por diseño — no agregar `verifyAuth` en ellos. Hacer grep de dónde se llama el endpoint antes de protegerlo.

---

### [2026-06-21] formatearMoneda no mostraba separador de miles

- **CONTEXTO**: `lib/calculos.ts`, función `formatearMoneda`, usada en toda la app (facturas, boletas, guías, totales)
- **ERROR**: Montos grandes como 2200.00 se mostraban sin separador: `S/ 2200.00` en vez de `S/ 2,200.00`
- **CAUSA**: La función usaba `valor.toFixed(2)` directo, sin separador de miles.
- **CORRECCIÓN**: Reemplazar por regex que agrega coma cada 3 dígitos antes del punto decimal: `parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')`. Solución explícita sin depender de `toLocaleString` (que varía por entorno).
- **REGLA**: Nunca usar `toFixed(2)` directamente para mostrar montos en UI. Siempre usar `formatearMoneda()` que incluye separador de miles. Si se necesita formato numérico sin símbolo, usar la misma regex.

---

### [2026-06-21] Campo precio en documentos no tenía indicador visual de modificación

- **CONTEXTO**: Formularios `facturas/nueva/page.tsx` y `boletas/nueva/page.tsx`, paso 2 (ítems)
- **SITUACIÓN**: El campo de precio unitario ya era editable al seleccionar un producto, pero no había ningún indicador de que el vendedor había cambiado el precio respecto al catálogo.
- **CORRECCIÓN**: Agregar `precioCatalogo?: number` en `ItemDocumento`. Al seleccionar producto se guarda `precioCatalogo: producto.precioUnitario`. Cuando `valorUnitario !== precioCatalogo`: badge ámbar "· Precio especial" en el label, borde ámbar en el input, link "Base: S/ X.XX · Restaurar" debajo.
- **REGLA**: Cuando un campo tiene un valor "base" que puede ser sobreescrito, siempre mostrar el valor original como referencia y un indicador visual del cambio. Guardar el valor base en el estado desde el momento de la selección, no recalcularlo después.
