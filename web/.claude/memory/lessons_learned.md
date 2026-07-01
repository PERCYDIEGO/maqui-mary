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

### [2026-06-21] Bot E2E — tests usaban datos hardcodeados inventados en vez de datos reales de BD

- **CONTEXTO**: `tests/flujo-emision.spec.ts`, secciones A (API factura) y C (UI factura), plus ausencia de tests de guías
- **SITUACIÓN**: El bot usaba RUC falso "20123456789" y nombre "EMPRESA TEST SAC" inventados. La sección C siempre hacía skip porque no había clientes con RUC según el campo `ruc` (que está vacío — el RUC real está en `num_documento` con `tipo_documento='6'`).
- **CORRECCIÓN**: `global-setup.ts` consulta clientes reales (`tipo_documento='6'`), productos activos, transportistas y crea una guía borrador T001-9990. Todo se guarda en `.test-creds.json`. Los tests cargan el archivo con `loadCreds()` y usan los datos reales. Se añadió sección F de guías (3 tests).
- **REGLA**: En tests E2E, cargar datos reales de la BD en global-setup y pasarlos a los tests. No inventar RUCs/nombres — las validaciones SUNAT pueden rechazar datos que no existen en SUNAT Consulta. El schema de clientes usa `num_documento` para el número de documento y `tipo_documento='6'` para RUC, no la columna `ruc` (que está vacía).

---

### [2026-06-21] Bot E2E — loginAs() fallaba silencioso: localStorage no viaja al middleware

- **CONTEXTO**: `tests/helpers.ts`, función `loginAs()`, tests E2E de emisión SUNAT (flujo-emision.spec.ts)
- **ERROR**: Login via formulario UI timing out; luego login via localStorage timeout en tests UI (secciones B, C, D) — middleware redirigía a `/crm/login` pese a la sesión inyectada
- **CAUSA 1**: UI login fallaba porque la contraseña real de admin no era conocida (tests de bot necesitan credenciales propias)
- **CAUSA 2**: Inyectar sesión en localStorage funciona para el browser client pero NO para el middleware `@supabase/ssr`. El middleware lee la sesión de cookies con el nombre `sb-{projectRef}-auth-token` (JSON completo de la sesión). Para `api-auth.ts` (API routes) se necesita la cookie `sb-access-token` (solo el access_token string).
- **CORRECCIÓN**: `loginAs()` llama `supabase.auth.signInWithPassword()` en Node, luego inyecta tres cosas en el browser: (1) cookie `sb-{projectRef}-auth-token` = JSON del objeto session (para middleware @supabase/ssr), (2) cookie `sb-access-token` = access_token string (para api-auth.ts), (3) localStorage `sb-{projectRef}-auth-token` = JSON de session (para el cliente browser). El projectRef se extrae del SUPABASE_URL.
- **REGLA**: Para tests E2E contra Next.js + Supabase SSR, nunca usar UI login. Usar `signInWithPassword()` en Node y propagar sesión vía cookies con los nombres exactos que usa `@supabase/ssr`. Sin cookie `sb-{ref}-auth-token`, el middleware ignora la sesión y redirige a login aunque localStorage esté seteado.

---

### [2026-06-21] APISUNAT ignora fecha_de_entrega_a_transportista — nombre de campo incorrecto en la interfaz TypeScript

- **CONTEXTO**: `src/lib/sunat/apisunat-client.ts`, interfaz `ApiSunatGuiaRequest`, builder `buildApiSunatGuiaRequest`
- **ERROR**: APISUNAT sandbox retornaba "El campo fecha entrega a transportista es requerido." incluso con el campo explícitamente seteado en el JSON. Se podía verificar con `JSON.stringify` que el campo SÍ estaba presente.
- **CAUSA**: La interfaz TypeScript definía `fecha_de_entrega_a_transportista` (con `_de_`). APISUNAT espera `fecha_entrega_a_transportista` (sin `_de_`). Al serializar con `JSON.stringify`, el JSON incluía la clave con `_de_` — APISUNAT la ignoraba por nombre incorrecto y reportaba el campo como faltante.
- **CORRECCIÓN**: Cambiar en la interfaz y en el builder: `fecha_de_entrega_a_transportista` → `fecha_entrega_a_transportista`. Verificado enviando ambas variantes directamente a `sandbox.apisunat.pe/api/v3/dispatches`.
- **REGLA**: Cuando APISUNAT dice "campo X requerido" pero el JSON SÍ lo tiene, el campo puede estar con nombre incorrecto. Probar variantes del nombre (con/sin `_de_`, con/sin guiones) enviando directamente al endpoint con `fetch` antes de buscar el bug en otro lugar. El nombre correcto en APISUNAT para guías es `fecha_entrega_a_transportista` (sin `_de_`).

---

### [2026-06-21] APISUNAT rechazaba guía con "El campo fecha entrega a transportista es requerido" — campo no extraído en la ruta

- **CONTEXTO**: `src/app/api/sunat/guia/route.ts`, builder `buildApiSunatGuiaRequest`, tests sección F de `tests/flujo-emision.spec.ts`
- **ERROR**: APISUNAT sandbox devolvía `{"success":false,"message":"El campo fecha entrega a transportista es requerido."}` aunque el test enviaba `fecha_entrega_a_transportista: hoy` y el builder tenía fallback `params.fechaEntregaTransportista || params.fechaInicioTraslado`
- **CAUSA**: La ruta destructuraba el body del request pero NO incluía `fecha_entrega_a_transportista` en el destructuring. Solo extraía `fecha_inicio_traslado`. Por lo tanto, `fecha_entrega_a_transportista` quedaba `undefined` en el scope de la ruta. El builder recibía `fechaEntregaTransportista: undefined`. El fallback era `undefined || fecha_inicio_traslado`, pero `fecha_inicio_traslado` también era `undefined` si no se pasaba explícitamente — resultando en `fecha_de_entrega_a_transportista: undefined`, que `JSON.stringify` OMITE del JSON enviado a APISUNAT.
- **CORRECCIÓN**: Agregar `fecha_entrega_a_transportista` al destructuring en la ruta y pasarlo explícitamente al builder: `fechaEntregaTransportista: fecha_entrega_a_transportista || fecha_inicio_traslado`
- **REGLA**: En rutas Next.js, todo campo del request body que se quiera usar DEBE estar en el destructuring. Si se omite, el valor es `undefined` aunque el cliente lo envíe. `JSON.stringify` omite propiedades `undefined`, lo que hace que APISUNAT (u otras APIs) las detecten como "campo requerido faltante". Usar `?dry_run=1` (si el endpoint lo soporta) para ver el JSON construido antes de enviarlo a la API externa.

---

### [2026-06-28] Sección Guías crasheaba con TypeError en render Y en filtro — campos undefined de data_json

- **CONTEXTO**: `crm/(app)/guias/page.tsx` y `crm/(app)/documentos/page.tsx`; guías cargadas desde tabla `guias` en Supabase via spread de `data_json`; AppContext `loadDocuments`
- **ERROR**: Error boundary mostraba "⚠️ Error inesperado — Algo falló en esta sección." al entrar a `/crm/guias` y al hacer clic en el tab "Guías de Remisión" en `/crm/documentos`
- **CAUSA**: Dos puntos de falla distintos con la misma raíz:
  1. `guias/page.tsx`: campos como `puntoLlegada`, `motivoTraslado`, `numeroCompleto`, `destinatarioNombre` llegaban `undefined` desde `data_json = null` en BD. El render los usaba sin null guard.
  2. `documentos/page.tsx` línea 46: el filtro siempre ejecuta `doc.numeroCompleto.toLowerCase()` aunque `busqueda` esté vacío. Con `doc.numeroCompleto = undefined` (guías sin data_json), crasheaba en el momento de cambiar al tab de Guías.
  Origen de los datos corruptos: el script `emitir-guias.mjs` crea guías directamente en BD (`INSERT INTO guias`) sin poblar la columna `data_json`. En AppContext, el spread `{ ...reviveDates(row.data_json || {}), ... }` produce un objeto con solo id/estado/fechas; los demás campos son `undefined`.
- **CORRECCIÓN**:
  - `guias/page.tsx`: null guards en filtro y render: `(campo || '').method()`. Commit `df30a85`.
  - `documentos/page.tsx`: `(doc.numeroCompleto || '').toLowerCase()`. Commit `2b26ab0`.
  - `AppContext.tsx loadDocuments`: tras el spread de `dataJson`, agregar fallbacks desde columnas individuales de BD: `numeroCompleto: dataJson.numeroCompleto || \`${row.serie}-${String(row.numero).padStart(8, '0')}\``, `destinatarioNombre: dataJson.destinatarioNombre || row.destinatario_nombre`, `puntoLlegada`, `motivoTraslado`, `bienes: dataJson.bienes || []`. Commit `2b26ab0`.
- **REGLA**: Todo componente que filtre o renderice guías DEBE usar `(campo || '')` antes de `.toLowerCase()`, `.substring()`, `.replace()`. Más importante aún: `AppContext.loadDocuments` debe ser la única fuente de verdad y nunca dejar `undefined` en campos críticos — usar fallbacks de columnas individuales para documentos creados por scripts o vías alternativas sin `data_json`.

---

### [2026-06-21] Campo precio en documentos no tenía indicador visual de modificación

- **CONTEXTO**: Formularios `facturas/nueva/page.tsx` y `boletas/nueva/page.tsx`, paso 2 (ítems)
- **SITUACIÓN**: El campo de precio unitario ya era editable al seleccionar un producto, pero no había ningún indicador de que el vendedor había cambiado el precio respecto al catálogo.
- **CORRECCIÓN**: Agregar `precioCatalogo?: number` en `ItemDocumento`. Al seleccionar producto se guarda `precioCatalogo: producto.precioUnitario`. Cuando `valorUnitario !== precioCatalogo`: badge ámbar "· Precio especial" en el label, borde ámbar en el input, link "Base: S/ X.XX · Restaurar" debajo.
- **REGLA**: Cuando un campo tiene un valor "base" que puede ser sobreescrito, siempre mostrar el valor original como referencia y un indicador visual del cambio. Guardar el valor base en el estado desde el momento de la selección, no recalcularlo después.

---

### [2026-06-29] Crash en páginas de documentos (guías/boletas/facturas) en producción — SSR con html2canvas/jsPDF

- **CONTEXTO**: Páginas `guias/page.tsx`, `documentos/page.tsx`, `boletas/page.tsx`, `facturas/page.tsx` en Next.js 14 App Router, Vercel producción.
- **ERROR**: Error boundary `(app)/error.tsx` se activaba al abrir la sección de guías/documentos en producción pero NO en desarrollo local.
- **CAUSA**: `PDFGenerator` importa estáticamente `html2canvas` y `jsPDF` (`import html2canvas from 'html2canvas'`). En Next.js producción, los componentes `'use client'` se renderizan en el servidor (SSR) para generar el HTML inicial. Si esas librerías acceden a APIs del browser (`window`, `document`, canvas, Blob, etc.) durante la inicialización del módulo, el render SSR falla y lanza un error que la error boundary captura. En desarrollo, Next.js maneja esto de forma más permisiva con HMR y modo dev.
- **CORRECCIÓN**: Cambiar el import estático a dynamic import con `ssr: false` en todos los archivos que usan PDFGenerator. Commit `09f7edb`.
  ```tsx
  // ANTES (crash en SSR producción):
  import PDFGenerator from '@/components/pdf/PDFGenerator';
  // DESPUÉS (carga solo en cliente):
  import dynamic from 'next/dynamic';
  const PDFGenerator = dynamic(() => import('@/components/pdf/PDFGenerator'), { ssr: false });
  ```
- **REGLA**: En Next.js App Router, cualquier componente que importe librerías que usen APIs del browser (`html2canvas`, `jsPDF`, `konva`, `recharts`, etc.) DEBE usar `dynamic(() => import(...), { ssr: false })`. El import estático funciona en dev pero crashea en producción SSR. Afecta a boletas, facturas, guías y cualquier página futura que use PDFGenerator.

---

### [2026-06-29] Dashboard mostraba "ventas" cuando no había ventas — teardown E2E no limpiaba facturas

- **CONTEXTO**: Dashboard mostraba ingresos del mes y documentos cuando el usuario no había emitido ninguna venta real. Solo había corrido los tests E2E.
- **ERROR**: La consulta del dashboard `.from('facturas').or('origen.neq.web,origen.is.null')` devolvía 4 filas con totales reales.
- **CAUSA**: `global-setup.ts` crea una factura de prueba para vincular la guía de test (línea 130: `supabase.from('facturas').insert(facturaPayload)`), pero `global-teardown.ts` solo eliminaba la guía y el usuario, no la factura. Cada corrida de tests acumulaba una factura nueva en la BD (misma serie/número porque el contador SUNAT no avanzaba).
- **CORRECCIÓN**: Agregar en teardown (antes de delete profiles):
  ```ts
  if (creds.factura?.id) {
    await supabase.from('factura_items').delete().eq('factura_id', creds.factura.id)
    await supabase.from('facturas').delete().eq('id', creds.factura.id)
  }
  ```
  Commit `dda70a1`.
- **REGLA**: El teardown E2E debe eliminar TODOS los registros creados en setup, incluyendo facturas e ítems. El `.test-creds.json` ya guarda `creds.factura` — usarlo. Revisar global-setup al agregar nuevas entidades y reflejarlas en teardown.

---

### [2026-06-30] Editar/Eliminar no aparecían en Documentos (mobile ni desktop) + fecha de traslado mostraba un día antes

- **CONTEXTO**: `src/app/crm/(app)/documentos/page.tsx` — vista unificada de Boletas/Facturas/Guías, única ruta de listado enlazada en el sidebar (`/crm/documentos`). `src/components/pdf/PDFGenerator.tsx` — generador de PDF de comprobantes.
- **ERROR 1**: El usuario reportó que no podía editar ni eliminar documentos, ni en mobile ni en desktop.
- **CAUSA 1**: La tabla en `documentos/page.tsx` solo tenía el botón de descarga de PDF en "Acciones". Existía una página dedicada `guias/page.tsx` con editar/eliminar completos, pero esa ruta no está enlazada en el sidebar — el usuario nunca la veía.
- **ERROR 2**: Al elegir el día 29 como fecha de inicio de traslado (guía de remisión), el PDF mostraba 28.
- **CAUSA 2**: Los formularios crean fechas "solo fecha" con `new Date("YYYY-MM-DD")`, que JS parsea como medianoche UTC. `PDFGenerator.tsx` las mostraba con `toLocaleDateString('es-PE')` sin especificar zona horaria — en un navegador en Perú (UTC-5) medianoche UTC del día 29 cae en las 19:00 del día 28 hora local.
- **CORRECCIÓN** (commit `c7f86b8`):
  - `documentos/page.tsx`: se agregan botones Editar (lápiz, solo si `estado === 'borrador'`) y Eliminar (basura + confirmación inline "¿Eliminar?", **también gateado a `estado === 'borrador'`**) — mismo patrón de `guias/page.tsx`.
  - `guias/page.tsx`: se agrega el mismo guard `estado === 'borrador'` a Eliminar (antes solo lo tenía Editar) — evita borrar guías ya enviadas/aprobadas por SUNAT desde el CRM.
  - `PDFGenerator.tsx` líneas 369, 370, 431, 432: se agrega `{ timeZone: 'UTC' }` a `toLocaleDateString('es-PE', ...)` para `fechaInicioTraslado`, `fechaEntregaTransportista`, `fechaEmision` y `fechaVencimiento` de boletas/facturas (todos campos "solo fecha"). **No** se tocó `fechaEmision` de guías (línea 338) porque ese campo se crea con `new Date()` completo (con hora real), no con el patrón "solo fecha" — no tenía el bug.
  - Verificado con evidencia (no solo supuesto) que el envío real a SUNAT (`apisunat-client.ts` / `api/sunat/guia/route.ts`) usa el string crudo `"YYYY-MM-DD"` del formulario, no el objeto `Date`, así que el documento que llega a SUNAT nunca tuvo este bug — solo afectaba la vista/PDF en el CRM.
- **REGLA**: (1) Cualquier ruta de listado "reachable" desde el sidebar debe tener el mismo conjunto de acciones (editar/eliminar) que las rutas dedicadas equivalentes — no asumir que una página "hermana" no enlazada cubre la funcionalidad. (2) Un botón Eliminar debe llevar el mismo guard de estado (`borrador`) que Editar; sin ese guard se puede borrar del CRM un documento que SUNAT ya aprobó, rompiendo la correlatividad/trazabilidad local. (3) Al construir un `Date` desde un string "solo fecha" (`new Date("YYYY-MM-DD")`), siempre formatear después con `{ timeZone: 'UTC' }` — nunca con hora local del navegador/servidor.

---

### [2026-06-30] Deploy `vercel --prod` desde la raíz fue al proyecto equivocado — dominio maquimary.com.pe no recibió el fix

- **CONTEXTO**: Repo raíz `D:\proyectos_opencode\projects\Maqui-Mary\` (contiene `deploy.ps1` y su propio `.vercel/project.json`) vs. `web/` (la app Next.js real, con su propio `.vercel/project.json`).
- **ERROR**: Corrí `vercel --prod` desde la raíz del repo (no desde `web/`). El deploy salió "Ready" sin errores, pero el dominio custom `maquimary.com.pe` seguía sirviendo la versión vieja — el fix no llegó a producción real.
- **CAUSA**: Existían DOS proyectos Vercel distintos vinculados al mismo repo: la raíz estaba vinculada a un proyecto huérfano llamado `maqui-mary` (`prj_mLWzHZrY165eFdD7P8c7ah8kCpmz`, sin dominio custom, solo con su propio alias `.vercel.app`), mientras que `web/` está vinculado al proyecto real `web` (`prj_iWMCRVhuq85yZPUfzEDyqQemXiop`), que es el único con `maquimary.com.pe` conectado. Ambos `.vercel/project.json` son válidos y el CLI no avisa que hay ambigüedad — simplemente deploya al proyecto que esté linkeado en el directorio actual.
- **CORRECCIÓN**: Se eliminó `D:\proyectos_opencode\projects\Maqui-Mary\.vercel\` (carpeta local, gitignored, sin impacto en git). Ahora un `vercel --prod` corrido por error desde la raíz obligará a re-linkear en vez de deployar silenciosamente al proyecto huérfano. Se corrigió también el texto de `deploy.ps1` que mostraba la URL vieja `maquimary.vercel.app` en vez de `maquimary.com.pe`. Se re-deployó correctamente desde `web/` y se confirmó "Aliased: https://maquimary.com.pe".
- **REGLA**: El deploy a producción de Maqui Mary SIEMPRE se hace desde `web/` (ya sea con `.\deploy.ps1 -Action deploy` desde la raíz, que internamente hace `cd web`, o manualmente con `cd web && vercel --prod`). NUNCA correr `vercel --prod` desde la raíz del repo. Si en el futuro aparece de nuevo un `.vercel/project.json` en la raíz, borrarlo — no debe existir un proyecto Vercel vinculado ahí.

---

### [2026-06-30] "Error guardando: infinite recursion detected in policy for relation profiles" al guardar config SUNAT / poner ambiente en producción

- **CONTEXTO**: `/crm/configuracion` → sección SUNAT → cambiar `apisunat_environment` a `producción` y guardar (`handleSaveSunat` en `configuracion/page.tsx:259`, hace `supabase.from('sunat_config').upsert(...)` directo desde el cliente).
- **ERROR**: Toast "Error guardando: infinite recursion detected in policy for relation \"profiles\"". El cambio a producción nunca se guardaba (`sunat_config.apisunat_environment` seguía en `sandbox` con `updated_at` de 9 días atrás).
- **CAUSA**: La policy RLS `"Profiles solo propio usuario o admin"` en la tabla `profiles` seguía viva en la base de datos de producción (Supabase project `ofemdngaslpdexsqfcbb`), a pesar de que la entrada de memoria del 2026-05-31 decía que ya se había hecho `DROP` de esa policy — el DROP nunca llegó a producción (o la policy se recreó después). Esa policy hacía `EXISTS (SELECT 1 FROM profiles profiles_1 WHERE profiles_1.id = auth.uid() AND profiles_1.role = 'admin')` **dentro de una policy sobre la propia tabla `profiles`** → Postgres detecta recursión al evaluarla. Cualquier tabla cuya policy verifica admin vía `EXISTS (SELECT 1 FROM profiles WHERE ...)` (`sunat_config`, `configuracion`, `guias.guias_delete`) dispara esa recursión en cascada porque el subquery a `profiles` reactiva la policy rota.
- **CORRECCIÓN**: `DROP POLICY "Profiles solo propio usuario o admin" ON public.profiles;` ejecutado directo vía Supabase MCP (`apply_migration`) sobre el proyecto `ofemdngaslpdexsqfcbb`. Las policies restantes (`Profiles lectura pública` / `profiles_public_read`, ambas `SELECT true`, y `profiles_update_self`, `UPDATE` solo `auth.uid() = id`) cubren el acceso real sin recursión.
- **REGLA**: Nunca crear una policy RLS sobre `profiles` que haga `SELECT`/`EXISTS` contra la propia tabla `profiles` — usar en su lugar una función `SECURITY DEFINER` (bypassa RLS internamente) si se necesita chequear el rol del usuario dentro de una policy de `profiles` mismo. Verificar con `SELECT * FROM pg_policies WHERE tablename='profiles'` después de cualquier migración de RLS para confirmar que el DROP realmente se aplicó en producción, no asumir por la memoria de una sesión anterior.

---

### [2026-06-30] "Error en el envío a SUNAT" genérico al enviar factura — el motivo real se perdía

- **CONTEXTO**: `enviarDocumentoSUNAT` en `AppContext.tsx:669-670`, llamada a `POST /api/sunat/emit`.
- **ERROR**: Al fallar el envío de una factura a SUNAT, el usuario solo veía el toast genérico "Error en el envío a SUNAT", sin ninguna pista de la causa real (RUC inválido, token vencido, rechazo del XML, etc).
- **CAUSA**: `api/sunat/emit/route.ts` (líneas 241-248), cuando `sunatStatus === 'ERROR'`, devuelve `{ ok: false, mensaje: "Error: ${sunatError}", ... }` — **nunca** incluye un campo `error`. El frontend en `AppContext.tsx:670` solo leía `result.error` para armar el mensaje del toast, así que siempre caía al fallback genérico y el `mensaje` real (que sí traía el detalle) se descartaba.
- **CORRECCIÓN** (commit `8c3adff`): `const errorMsg = result.error || result.mensaje || 'Error en el envío a SUNAT';`
- **REGLA**: Cuando una API route puede devolver el detalle del error en distintos campos según el path de error (`error` vs `mensaje`), el consumidor debe leer todos los campos posibles en orden de prioridad, no solo uno. Antes de asumir que un mensaje de error genérico es "el error real", revisar el código fuente de la API que lo generó.

---

### [2026-06-30] "El formato del campo serie no es válido" (E001) + filas duplicadas + stock nunca se descontaba

Cadena de 3 bugs descubiertos al diagnosticar por qué una factura real (CORPORACION MIRIAM INC S.A.C., números 883/884) era rechazada por APISUNAT.pe una y otra vez.

1. **Serie inválida "E001"/"EB01"**: `AppContext.tsx:168` tenía hardcodeado `{ tipo: 'factura', serie: 'E001', ... }` y `boletas/nueva/page.tsx:140` usaba fallback `'EB01'` — ambos formatos inválidos para SUNAT (debe ser `F001`/`B001`, 4 caracteres empezando con la letra del tipo de comprobante). Existe un `loadSeries()` (BUG-14) que sincroniza desde `sunat_config` pero el HARDCODED inicial ya estaba mal, y los documentos creados antes de que `loadSeries()` resolviera (o antes de que existiera el fix) quedaron con la serie mala grabada en su `data_json`. **Corrección**: hardcode a `F001`/`B001` en ambos archivos + `UPDATE facturas SET series='F001', data_json=jsonb_set(...)  WHERE id IN (171,172)` directo en Supabase para los 2 documentos reales ya creados (sin recrearlos).
2. **Filas duplicadas en cada reintento**: `api/sunat/emit/route.ts` hacía `INSERT` sin condición en cada llamada — cada click de "Enviar SUNAT" (incluidos reintentos tras rechazo) creaba una fila NUEVA en `facturas` con la misma serie+número, sin `data_json` (huérfana, invisible en la UI porque `loadDocuments()` filtra `if (!doc.id) continue`, pero sí contamina la tabla). Se detectaron 4 filas huérfanas (ids 173-176) para 2 documentos reales. **Corrección**: la ruta ahora recibe `documento_id` (el `data_json->>'id'` del documento ya creado por `addFactura`/`addBoleta`) y hace `UPDATE` sobre esa fila en vez de `INSERT` cuando ya existe; borra los `factura_items` previos antes de reinsertar para no duplicarlos.
3. **`decrement_stock` nunca funcionó — type mismatch silencioso**: la función RPC `decrement_stock(p_producto_id uuid, ..., p_factura_id uuid)` esperaba `uuid`, pero `productos.id`, `facturas.id` y `factura_items.producto_id` son **bigint** en toda la app. Cada llamada fallaba en Postgres por cast inválido, pero `route.ts` nunca capturaba `{ error }` del `.rpc()` — la falla era 100% silenciosa. Confirmado con evidencia: `movimientos_stock` no tenía NINGÚN registro para el producto de prueba pese a múltiples "ventas". **Impacto real**: el stock mostrado en el CRM nunca reflejó las ventas reales — la regla de negocio "Descontar automáticamente al aprobar" (CLAUDE.md) llevaba fallando desde siempre. **Corrección**: `DROP FUNCTION` + recrear con `bigint` en vez de `uuid`; verificado con una llamada de prueba (`p_cantidad=0`) sin error. Además, en `route.ts` ahora se captura y loguea el error del RPC (antes silenciado), y el descuento solo ocurre en el primer intento real (`estado_sunat` previo == `'PENDIENTE'`), no en cada reintento.
- **REGLA**: (a) Nunca dejar un `await supabase.rpc(...)` sin capturar `{ error }` — un fallo de tipo de dato en una función SECURITY DEFINER es invisible sin eso. (b) Verificar tipos de parámetros de funciones RPC contra las columnas reales de la tabla (`information_schema.columns`) cuando se sospeche de un fallo silencioso — no asumir que porque la función "existe" los tipos coinciden. (c) Cualquier ruta API que se llama repetidamente por reintentos del usuario debe ser idempotente por diseño (upsert por id de negocio), no un `INSERT` ciego.

---

### [2026-06-30] Selector Sandbox/Producción por documento (feature, no bug)

Percy pidió poder elegir sandbox vs. producción real en el momento de enviar cada documento a SUNAT, en vez de depender solo del toggle global en Configuración (que ya había causado confusión: quedó en sandbox semanas sin que se notara por el bug de RLS de arriba). Diseño pasado por Council (2 críticos: UX + UI), veredicto APPROVE con diseño híbrido: un solo trigger tipo dropdown (no dos botones — rompía el layout) con 2 opciones fuertemente diferenciadas por color/ícono/texto (sandbox neutro, producción roja con `AlertTriangle`), modal de confirmación obligatorio solo para producción ("No se puede deshacer"), y un badge persistente en el header mostrando el ambiente default. Implementado en `sunat/page.tsx` (componente local `EnviarSunatMenu`), con `ambiente_override` threading completo: `AppContext.enviarDocumentoSUNAT/enviarGuiaSUNAT` → `api/sunat/emit` y `api/sunat/guia` routes → `apisunatEnv` en la llamada real a APISUNAT.pe.
- **REGLA**: Para acciones irreversibles con impacto legal/tributario, nunca ejecutar directo desde un solo click — exigir confirmación explícita con el detalle de lo que se va a hacer, y diferenciar visualmente (color, ícono, texto) del camino "seguro"/reversible.

---

### [2026-06-30] Un envío de PRUEBA a sandbox dejaba el documento como aceptado real — se "perdía" de la cola

Percy señaló el riesgo justo después de que se implementó el selector sandbox/producción: "quiero poder probar en sandbox y que no se pierda, y una vez que estoy seguro poder mandarlo a SUNAT". Al revisar el flujo, el selector recién construido tenía exactamente ese bug.
- **CAUSA**: `api/sunat/emit/route.ts` y `api/sunat/guia/route.ts` persistían el resultado de la llamada a APISUNAT.pe tal cual, sin distinguir si el ambiente usado era sandbox o producción. Si el sandbox respondía "ACEPTADO" (típico en un ambiente de pruebas), el documento pasaba a `estado: 'aprobado'` — y las listas de "pendientes de envío" en `sunat/page.tsx` filtran `estado === 'borrador' || estado === 'pendiente_envio'`, así que el documento **desaparecía de la cola** y ya no había forma de mandarlo de verdad a producción sin recrearlo.
- **CORRECCIÓN** (commit `7866ee2`):
  - `emit/route.ts`: nueva variable `esSandbox`. El campo persistido `estado_sunat` en sandbox siempre queda forzado a `'PENDIENTE'` (nunca ACEPTADO/RECHAZADO/ERROR real), independientemente del resultado real de la prueba. El resultado real sigue viajando en la respuesta HTTP (`estado_sunat`, `mensaje` con prefijo `[PRUEBA SANDBOX]`) para que el toast informe correctamente al usuario. Stock nunca se descuenta en sandbox (antes solo estaba protegido por `esPrimerIntento`, ahora también por `!esSandbox` explícito).
  - `guia/route.ts`: en sandbox, directamente **no se escribe nada** en la fila de la guía (ni `estado_sunat`, ni CDR/XML/tickets) — se devuelve el resultado solo en la respuesta.
  - `AppContext.tsx` (`enviarDocumentoSUNAT`/`enviarGuiaSUNAT`): cuando la respuesta trae `es_sandbox: true`, se salta TODA mutación de estado local (`setFacturasState`/`setGuiasState`) y el propio `.update()` a Supabase que hacía el frontend después del fetch — antes esto sobreescribía lo que la ruta ya había protegido.
- **REGLA**: Un "modo de prueba" (sandbox/dry-run) en cualquier flujo de envío a un sistema externo NUNCA debe mutar el estado persistido del recurso de negocio real. El resultado de la prueba se comunica solo en la respuesta de la llamada (para feedback inmediato al usuario), nunca se escribe en la fuente de verdad. Si un flujo tiene múltiples puntos de escritura (ruta API + frontend), verificar que TODOS respeten el aislamiento del modo de prueba, no solo el primero que se identifique.

---

### [2026-07-01] Autorización de producción en APISUNAT.pe — no es un bug de código, es un trámite externo

- **CONTEXTO**: Al enviar facturas 883/884 a producción real, error persistente: `"Esta empresa no tiene autorización para emitir documentos en el entorno de producción."` (de APISUNAT.pe, el OSE/PSE usado).
- **DIAGNÓSTICO** (con evidencia, no supuesto): se verificó contra la documentación oficial (`docs.apisunat.pe/integracion/facturacion-electronica/configuracion-api`) que nuestro código ya usa el endpoint correcto de producción (`https://app.apisunat.pe`, mismo token que sandbox, mismo path `/api/v3/documents`) — **no había ningún bug de código**. El bloqueo era 100% un trámite pendiente: Percy ya había dado de alta a Lucode como PSE en SUNAT (RUC GIOR TECHNOLOGY 20515809822 + VIDA SOFTWARE 20600337832, autorización desde 20/05/2026, según manual que Lucode le envió por WhatsApp), pero la activación de producción en la plataforma de APISUNAT.pe requería un paso adicional de su lado (botón "Autorizar en SUNAT" en `app.apisunat.pe` → Organizaciones) que se resolvió contactando a su soporte directamente.
- **Verificación oficial usada para confirmar que las facturas SÍ quedaron aceptadas**: `https://e-consulta.sunat.gob.pe/ol-ti-itconsvalicpe/ConsValiCpe.htm` (Consulta de Validez del CPE) — pública, no requiere Clave SOL, solo RUC emisor + tipo de comprobante + serie + número + fecha + monto. **Ojo**: esta herramienta NO sirve para guías de remisión normales (su desplegable de "Guía de Remisión" es solo para bienes fiscalizados) — las guías normales requieren Clave SOL propia: SUNAT SOL → Empresas → Guía de Remisión Electrónica → Consulta GREE.
- **Dato clave para reproducir la fecha correcta al validar**: la `fecha_de_emision` que se envía a SUNAT es la fecha en hora Perú (UTC-5) al momento del envío, no necesariamente la fecha de creación original del documento — para calcular con certeza, convertir `date_millis`/timestamp UTC del envío real restando 5 horas (nunca asumir a ojo).
- **REGLA**: Ante un error de "no autorizado" o similar de un proveedor externo (OSE/PSE), primero verificar el código contra la documentación oficial del proveedor (endpoints, headers, formato) antes de asumir que es un bug propio — si coincide exactamente, es un problema de cuenta/trámite del lado del proveedor, no de la integración. Para SUNAT específicamente, un PSE de terceros SIEMPRE requiere autorización explícita vía Clave SOL (Comunicación de Tercerización con PSE → Alta PSE) además de cualquier activación en la plataforma del proveedor — son dos pasos independientes.

---

### [2026-07-01] Guías nunca actualizaban su estado real — se quedaban "Borrador" para siempre

- **CONTEXTO**: Después de enviar una guía a SUNAT (aceptada o rechazada, confirmado en el panel de APISUNAT.pe), en el CRM (`/crm/sunat`, `/crm/guias`) seguía apareciendo como "Borrador", sin reflejar el resultado real.
- **CAUSA**: `api/sunat/guia/route.ts` solo actualizaba la columna `estado_sunat` (interna, usada para el CDR/XML/tickets), pero **nunca** la columna `estado` — que es la que usan `guiasPendientes`/`guiasEnviadas` en `sunat/page.tsx` y el badge de `guias/page.tsx` para decidir qué mostrar. Facturas/boletas no tenían este bug porque su `AppContext.tsx` sí mapea `estado_sunat` → `estado` (`data_json.estado`) en el mismo `.update()`.
- **CORRECCIÓN** (commit `788b0e1`): `guia/route.ts` ahora calcula `estadoCrm` (ACEPTADO→`aprobado`, RECHAZADO→`rechazado`, PENDIENTE/ENVIADO→`enviado`) y lo incluye en el `UPDATE` de la guía, además de devolverlo en la respuesta HTTP (`estado_sunat`) para que `AppContext.enviarGuiaSUNAT` también deje de asumir `'aprobado'` siempre y use el resultado real. Se corrigieron a mano las 2 guías ya existentes (T001-296 rechazada, T001-298 aprobada) usando el resultado real visto en el panel de APISUNAT.pe.
- **REGLA**: Cuando dos entidades del dominio (facturas/boletas vs guías) comparten el mismo concepto (estado de envío SUNAT) pero se implementaron en momentos distintos, verificar que AMBAS apliquen el mismo patrón de sincronización — no asumir que porque un tipo de documento funciona bien, todos los demás siguen la misma lógica.

---

### [2026-07-01] Bug grave: "ya fue emitido anteriormente" se marcaba como ACEPTADO sin verificar — un documento RECHAZADO apareció como "Aprobado"

- **CONTEXTO**: T001-296 (guía) fue rechazada originalmente por SUNAT (confirmado en el panel de APISUNAT.pe). Tras un reintento posterior, el CRM la mostró como "Aprobado" — Percy preguntó directamente "¿REALMENTE FUERON APROBADOS POR SUNAT?" al notar la inconsistencia.
- **CAUSA**: tanto `api/sunat/emit/route.ts` como `api/sunat/guia/route.ts` detectaban la respuesta "emitido anteriormente" de APISUNAT.pe (reintento de un documento ya registrado) y **asumían automáticamente `ACEPTADO`**, sin verificar si esa emisión previa había sido realmente aceptada o rechazada. Un reintento sobre un documento previamente RECHAZADO disparaba ese mensaje → el sistema lo marcaba como aprobado sin ninguna evidencia real.
- **CORRECCIÓN** (commit `b1a1025`): en ambas rutas, cuando se detecta "ya emitido anteriormente", ya NO se asume ningún estado — se devuelve `ok:false` con un mensaje pidiendo verificación manual (Consulta de Validez del CPE para facturas/boletas, Consulta GREE con Clave SOL para guías) y **no se toca el registro existente en la base de datos** (se deja tal cual estaba). Se corrigieron a mano los 2 registros afectados (T001-296 de vuelta a rechazado, `numeroCompleto` de facturas 883/884 que también había quedado con la serie vieja "E001" en un campo de texto separado que nunca se sincronizó al corregir `serie`).
- **REGLA CRÍTICA**: Nunca asumir un resultado positivo (aceptado/aprobado/exitoso) a partir de una respuesta ambigua o de "ya existe/ya se hizo" — sin evidencia directa del resultado real, la única respuesta segura es "no se sabe, verificar manualmente". Esto aplica especialmente a documentos tributarios donde una etiqueta falsa de "Aprobado" puede llevar a decisiones de negocio equivocadas (ej. no reintentar corregir un documento realmente rechazado).
- **Lección secundaria**: cuando un campo se corrige con `jsonb_set`/`UPDATE` directo en producción (ej. `serie`), revisar si hay OTROS campos derivados/precalculados del mismo dato (ej. `numeroCompleto`, que combina serie+número pero se guarda como string separado) que también necesiten corregirse — corregir solo el campo "fuente" no siempre actualiza los campos "derivados" ya persistidos.

---

### [2026-07-01] Dropdown de "Enviar SUNAT" se recortaba al abrir — overflow-hidden en el contenedor padre

- **CONTEXTO**: `/crm/sunat`, componente `EnviarSunatMenu` (dropdown con opciones Sandbox/Producción). Percy reportó que al abrir el menú "se ocultan, no se aprecian bien".
- **CAUSA**: el dropdown es `position: absolute` dentro de cada fila de documento, pero los contenedores de las secciones "Documentos Pendientes de Envío" e "Historial de Envíos" tenían `overflow-hidden` (para recortar las esquinas del card a `rounded-xl`). `overflow-hidden` en un ancestro SIEMPRE recorta a los descendientes `position:absolute`, sin importar el z-index.
- **Revisado con Council** (2 críticos: UX recomendó Portal para blindar contra recurrencia en otros lugares del CRM; UI recomendó la solución más simple y de menor riesgo). Se optó por la opción simple dado el alcance ya extenso de la sesión y menor riesgo de introducir bugs de posicionamiento nuevos.
- **CORRECCIÓN** (commit `b1a1025`): se quitó `overflow-hidden` de los 2 contenedores; las esquinas redondeadas se lograron aplicando `rounded-t-xl` al header (fondo sólido) y `rounded-b-xl` condicionalmente al último elemento de la lista (o al estado vacío) en su lugar — sin necesidad de recortar todo el contenedor.
- **REGLA**: si un componente necesita `position: absolute`/`fixed` para "salirse" visualmente de su contenedor (dropdown, popover, tooltip), verificar que NINGÚN ancestro tenga `overflow-hidden`. Si el `overflow-hidden` existe solo para lograr esquinas redondeadas, preferir aplicar el `rounded-*` directamente a los hijos con fondo sólido en vez de recortar el contenedor completo.

---

### [2026-07-01] Guía rechazada por fecha de traslado anterior a la fecha de emisión — regla de negocio SUNAT, no bug

- **CONTEXTO**: T001-296 rechazada por SUNAT. Percy sugirió la hipótesis correcta: `fecha_de_emision: "2026-06-30"` vs `fecha_inicio_de_traslado: "2026-06-29"` (un día antes).
- **CAUSA**: SUNAT rechaza cualquier guía donde el traslado comience antes de la fecha de emisión del documento — regla de validación normal, no relacionada a ningún bug del sistema. La guía de prueba tenía una fecha de traslado elegida arbitrariamente en el pasado.
- **CORRECCIÓN** (commit `b1a1025`): `guias/nueva/page.tsx` — se agregó `min` (fecha de hoy en hora Perú) al input de fecha de inicio de traslado, más una validación dura en `handleSubmit` (por si el navegador permite saltarse el `min` tipeando manualmente) que bloquea el guardado con un toast explicando la regla de SUNAT.
- **REGLA**: Validar en el frontend las reglas de negocio de SUNAT que son conocidas y verificables (fechas, formatos de campos) antes de intentar el envío — evita rechazos evitables y confunde menos al usuario que descubrirlo recién en la respuesta de SUNAT.

---

### [2026-07-01] Falta PDF/Imprimir en zona Envío SUNAT + confirmación: documentos aceptados no desaparecen de Documentos/Guías

- **CONTEXTO**: Percy pidió (1) que un documento aceptado no desaparezca de `/crm/documentos` ni `/crm/guias`, y (2) que en `/crm/sunat` los documentos tengan opción de descargar PDF e imprimir, igual que en sus páginas dedicadas.
- **Punto 1 — verificado, ya funcionaba bien**: `documentos/page.tsx` y `guias/page.tsx` no filtran por `estado`, solo por término de búsqueda — un documento `aprobado` sigue apareciendo normalmente. No requirió cambio de código.
- **Punto 2 — gap real, corregido** (commit `b4d3d36`, revisado con Council UX+UI): `sunat/page.tsx` solo tenía "Vista previa" (modal con datos + XML técnico), sin PDF real ni impresión. Se agregó el componente ya existente `PDFGenerator` (mismo que usan `/crm/documentos` y `/crm/guias`, con botones Descargar/Imprimir ya integrados) en ambas secciones ("Documentos Pendientes de Envío" e "Historial de Envíos"), junto al botón "Vista previa".
- **Detalle técnico**: `PDFGenerator` espera el objeto completo (`Boleta | Factura | GuiaRemision`), pero `sunat/page.tsx` solo tiene una interfaz local simplificada (`DocumentoPendiente`). Se resolvió con un `.find()` por id sobre los arrays `boletas`/`facturas`/`guias` ya disponibles vía `useApp()` (opción evaluada y aprobada por el crítico de UI del Council, en vez de modificar la interfaz `DocumentoPendiente` y las 4 funciones que la construyen — menos código, sin tocar tipos existentes).
- **Recordatorio aplicado**: `PDFGenerator` se importó con `dynamic(..., { ssr: false })`, igual que en el resto del proyecto (regla ya documentada: html2canvas/jsPDF crashean en SSR si se importan estáticamente).
- **REGLA**: Antes de decir "no funciona" o pedir un fix, verificar primero si el comportamiento reportado es realmente un bug (revisar el código) — en este caso el punto 1 ya estaba bien y no necesitaba ningún cambio, evitando tocar código que no tenía el problema.

---

### [2026-07-01] Percy cambió de opinión sobre "Documentos Electrónicos" — ahora sí debe ocultar aprobados

- **CONTEXTO**: Minutos antes, Percy pidió explícitamente que un documento aprobado **no desaparezca** de `/crm/documentos`. Después de ver el fix de PDF en `/crm/sunat` funcionando, pidió lo contrario: que los aprobados **sí se oculten** de `/crm/documentos`, dejando esa pantalla solo para lo que requiere acción (borrador/enviado/rechazado).
- **Antes de implementar**, se le hizo notar la contradicción explícita con AskUserQuestion en vez de asumir cuál pedido era el vigente — confirmó que quería el nuevo comportamiento (ocultar aprobados).
- **CORRECCIÓN** (commit `755d755`): `documentos/page.tsx` — nuevo `.filter(doc => doc.estado !== 'aprobado')` antes del filtro de búsqueda. El contador de cada tab (badge con el número) también se ajustó para excluir aprobados, evitando que diga "5" en el tab pero la lista muestre solo 3.
- **REGLA**: Cuando un pedido nuevo contradice directamente uno anterior en la misma sesión, señalarlo explícitamente y pedir confirmación antes de implementar — no asumir que el usuario "cambió de opinión" sin decirlo, ni implementar en silencio algo que revierte una decisión reciente. Los usuarios sí cambian de opinión legítimamente después de ver el resultado de un cambio anterior (acá, ver el PDF funcionando en `/crm/sunat` habilitó a Percy a pedir con confianza que se saquen los aprobados de la otra pantalla) — la señal de alerta no es "prohibir cambios de opinión", es "no asumir en silencio cuál pedido es el vigente".

---

### [2026-07-01] Fila de botones sin flex-wrap — riesgo real de desborde en mobile no verificado visualmente

- **CONTEXTO**: Percy preguntó si los cambios de la sesión aplicaban bien tanto en desktop como en mobile. No hay forma de abrir un navegador real en este entorno para verificar visualmente.
- **Revisión honesta del código en vez de afirmar sin evidencia**: la fila de acciones en `sunat/page.tsx` (precio + Vista previa + PDF/Imprimir + Enviar) usaba `flex items-center gap-3` sin `flex-wrap` — al agregar el botón de PDF (sesión previa) se sumó un elemento más a una fila que ya podía quedar apretada en pantallas angostas, sin posibilidad de pasar a una segunda línea.
- **CORRECCIÓN** (commit `587a870`): se agregó `flex-wrap justify-end` a las 2 filas de acciones (Documentos Pendientes e Historial de Envíos) — NO al header del modal de Vista Previa (mismo patrón de clases pero con propósito distinto: ahí es un ícono+título, no botones de acción, así que no debía tocarse; se verificó con `grep` que el `replace_all` no lo afectó por diferencia de indentación).
- **REGLA**: Cuando no se puede verificar visualmente un cambio de UI (sin navegador disponible), decirlo explícitamente en vez de afirmar que "se ve bien" — y en su lugar, revisar el código en busca de riesgos concretos (ausencia de `flex-wrap`, `overflow-x-auto`, breakpoints responsive) y corregirlos preventivamente cuando sea barato y de bajo riesgo hacerlo, en vez de solo prometer "debería funcionar".

---

### [2026-07-01] El QR de nuestro PDF no seguía el formato oficial de SUNAT — usábamos un PDF propio en vez del oficial de APISUNAT.pe

- **CONTEXTO**: Percy preguntó si el QR que aparece al imprimir los documentos era "oficial". Se investigó con evidencia (búsqueda del reglamento SUNAT) en vez de asumir.
- **HALLAZGO**: SUNAT exige (obligatorio desde Resolución 193-2020/SUNAT) que el QR contenga el texto `RUC|TIPO DOC|SERIE|NUMERO|IGV|TOTAL|FECHA|TIPO DOC CLIENTE|NUM DOC CLIENTE|RESUMEN` separado por `|`. Nuestro `PDFGenerator` (armado con html2canvas/jsPDF) generaba un QR que apuntaba a una URL propia (`maquimary.com.pe/doc/F001-00000883`), no al formato de datos que exige SUNAT.
- **Lo que ya existía sin usar**: APISUNAT.pe (el OSE certificado) genera y devuelve un PDF 100% oficial y conforme (`payload.pdf.a4` / `payload.pdf.ticket`) en cada envío aceptado — con el QR correcto. Para guías, la columna `pdf_a4_sunat`/`pdf_ticket_sunat` ya se guardaba en la BD pero nunca se mostraba en ningún lado de la UI. Para facturas/boletas, existía la columna `pdf_url` en la tabla `facturas` (usada solo en una página legacy `facturas/[id]/page.tsx`) pero la ruta activa (`emit/route.ts`) nunca la llenaba.
- **CORRECCIÓN** (commit `929b459`): se guarda `pdf_url`/`pdf_a4_sunat` con el PDF oficial de APISUNAT.pe en cada envío real (nunca en sandbox). Nuevo componente `DocumentoPdfLink`: si el documento tiene `pdfUrl` (ya enviado y aceptado), muestra el link directo al PDF oficial; si no (borrador, aún no enviado), cae al `PDFGenerator` propio como vista previa. Reemplazó el uso directo de `PDFGenerator` en 5 páginas (`documentos`, `guias`, `sunat`, `boletas`, `facturas`).
- **REGLA**: Cuando se genera un documento "representación impresa" de un comprobante fiscal, verificar si el proveedor/OSE certificado ya entrega una versión oficial en su respuesta antes de construir una propia desde cero — reconstruir manualmente (QR, formato, hash) introduce riesgo de no cumplir exactamente la normativa, mientras que el proveedor certificado ya está obligado a cumplirla. Preferir "oficial cuando exista, propio como fallback" en vez de "siempre propio".

---

### [2026-07-01] Feature nueva: Anular factura/boleta ante SUNAT (Comunicación de Baja / Resumen Diario)

- **CONTEXTO**: Percy preguntó si había opción de anular un comprobante ya aceptado. No existía ninguna funcionalidad de anulación en el sistema.
- **Investigación previa (con evidencia, no supuesto)**: se confirmó contra la documentación oficial de APISUNAT.pe que:
  - **Facturas**: se anulan vía `POST /api/v3/voided`, body `{"documento": "comunicacion_baja", "motivo": "...", "documento_afectado": {"documento": "factura", "serie": "F001", "numero": "192"}}` — proceso inmediato.
  - **Boletas**: se anulan vía `POST /api/v3/daily-summary`, body `{"documento": "resumen_diario", "documentos_afectados": [{"accion_resumen": "anular", "documento": "boleta", "serie": "B001", "numero": "1"}]}` — proceso asíncrono (puede tardar hasta el cierre del día).
  - **Guías de remisión**: NO tienen endpoint de anulación en APISUNAT.pe — SUNAT no lo permite para GRE por este medio. El feature se excluyó explícitamente para guías.
- **Diseño pasado por Council** (UX + UI, ambos APPROVE): motivo en catálogo predefinido + "Otro" con texto libre (reduce riesgo de motivos vagos ante una fiscalización), checkbox explícito de confirmación de irreversibilidad (no basta un solo botón), mensajes diferenciados según si la confirmación es inmediata (factura) o puede demorar (boleta, resumen diario), y restricción a rol admin — resuelta aprovechando que `/crm/sunat` YA es una ruta admin-only vía `middleware.ts`, sin necesidad de código de roles nuevo.
- **IMPLEMENTACIÓN** (commit `d729acd`):
  - `apisunat-client.ts`: `sendToApiSunat()` cambió su 4to parámetro de `isGuia: boolean` a `endpoint: 'documents'|'dispatches'|'voided'|'daily-summary'` (con 4 endpoints posibles, un booleano ya no alcanzaba — recomendación del crítico de UI). Se actualizaron los 2 call-sites existentes (`emit/route.ts` sigue con el default `'documents'`, `guia/route.ts` pasa `'dispatches'` explícito).
  - Nueva ruta `api/sunat/void/route.ts`: valida que el documento esté `ACEPTADO` antes de permitir anular (409 si no), arma el request según tipo, respeta el aislamiento sandbox (mismo patrón ya establecido: nunca marca `estado='anulado'` real en modo prueba), y para boletas con resultado `PENDIENTE` no marca el estado definitivo hasta que un envío posterior confirme `ACEPTADO` (no hay webhook/polling, es una limitación conocida).
  - Migración SQL: columnas `motivo_anulacion`, `anulado_at`, `anulado_por` agregadas a `facturas` (no existían).
  - `types/documentos.ts`: el valor `'anulado'` en `EstadoDocumento` ya existía sin usar — se activó agregando `motivoAnulacion`/`anuladoPor`/`anuladoAt` a `DocumentoBase`.
- **REGLA**: Antes de construir una integración con una acción tributaria irreversible, buscar el formato EXACTO documentado por el proveedor (no inferir por analogía con el endpoint de emisión) — facturas y boletas usan mecanismos y endpoints completamente distintos para lo que conceptualmente es "la misma acción" (anular). Verificar también qué tipos de documento NO soportan la acción (acá, guías) para no ofrecer una opción que fallará siempre.
