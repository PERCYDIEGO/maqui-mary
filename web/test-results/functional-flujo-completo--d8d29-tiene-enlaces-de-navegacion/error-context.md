# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: functional\flujo-completo.spec.ts >> Dashboard >> sidebar contiene enlaces de navegacion
- Location: tests\functional\flujo-completo.spec.ts:33:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('a[href="/crm/clientes"]').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('a[href="/crm/clientes"]').first()

```

```yaml
- heading "404" [level=1]
- heading "This page could not be found." [level=2]
- alert
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | import { loginAsAdmin, safeNavigate } from '../helpers'
  3   | 
  4   | type SectionInfo = { path: string; label: string };
  5   | const ALL_SECTIONS: SectionInfo[] = [
  6   |   { path: '/crm/clientes', label: 'Clientes' },
  7   |   { path: '/crm/productos', label: 'Productos' },
  8   |   { path: '/crm/inventario', label: 'Inventario' },
  9   |   { path: '/crm/facturas', label: 'Facturas' },
  10  |   { path: '/crm/boletas', label: 'Boletas' },
  11  |   { path: '/crm/guias', label: 'Guías' },
  12  |   { path: '/crm/pedidos', label: 'Pedidos' },
  13  |   { path: '/crm/documentos', label: 'Documentos' },
  14  |   { path: '/crm/transportistas', label: 'Transportistas' },
  15  |   { path: '/crm/usuarios', label: 'Usuarios' },
  16  |   { path: '/crm/sunat', label: 'SUNAT' },
  17  |   { path: '/crm/configuracion', label: 'Configuración' },
  18  | ]
  19  | 
  20  | test.describe('Dashboard', () => {
  21  |   test.beforeEach(async ({ page }) => {
  22  |     await loginAsAdmin(page)
  23  |   })
  24  | 
  25  |   test('carga sin [object Object] ni Error 500', async ({ page }) => {
  26  |     await expect(page).toHaveURL(/\/crm/)
  27  |     await page.waitForLoadState('networkidle')
  28  |     const body = await page.locator('body').textContent() || ''
  29  |     expect(body).not.toMatch(/\[object Object\]/)
  30  |     expect(body).not.toMatch(/Error 500/)
  31  |   })
  32  | 
  33  |   test('sidebar contiene enlaces de navegacion', async ({ page }) => {
  34  |     for (const section of ALL_SECTIONS) {
  35  |       const link = page.locator(`a[href="${section.path}"]`).first()
> 36  |       await expect(link).toBeVisible({ timeout: 5000 })
      |                          ^ Error: expect(locator).toBeVisible() failed
  37  |     }
  38  |   })
  39  | })
  40  | 
  41  | test.describe('Navegacion secciones', () => {
  42  |   test.beforeEach(async ({ page }) => {
  43  |     await loginAsAdmin(page)
  44  |   })
  45  | 
  46  |   for (const section of ALL_SECTIONS) {
  47  |     test(`${section.label} carga sin error 500`, async ({ page }) => {
  48  |       await safeNavigate(page, section.path)
  49  |       const body = await page.locator('body').textContent() || ''
  50  |       expect(body).not.toMatch(/Error 500/)
  51  |       expect(body).not.toMatch(/\[object Object\]/)
  52  |     })
  53  |   }
  54  | 
  55  |   test('navegar por todas las secciones no genera toasts de error', async ({ page }) => {
  56  |     const erroresEncontrados: string[] = []
  57  |     const textoError = /No se pudo cargar|Error al cargar|infinite recursion/i
  58  | 
  59  |     for (const section of ALL_SECTIONS) {
  60  |       await safeNavigate(page, section.path)
  61  |       await page.waitForTimeout(1500)
  62  | 
  63  |       // Buscar toasts de error visibles (react-hot-toast renderiza en el body)
  64  |       const toasts = page.locator('[data-hot-toast], [role="status"], [class*="toast"]')
  65  |       const count = await toasts.count()
  66  |       for (let i = 0; i < count; i++) {
  67  |         const texto = await toasts.nth(i).textContent().catch(() => '')
  68  |         if (textoError.test(texto || '')) {
  69  |           erroresEncontrados.push(`${section.label}: "${texto?.trim().slice(0, 80)}"`)
  70  |         }
  71  |       }
  72  |     }
  73  | 
  74  |     expect(erroresEncontrados, 'Toasts de error detectados al navegar').toEqual([])
  75  |   })
  76  | })
  77  | 
  78  | test.describe('Clientes', () => {
  79  |   test.beforeEach(async ({ page }) => {
  80  |     await loginAsAdmin(page)
  81  |     await safeNavigate(page, '/crm/clientes')
  82  |   })
  83  | 
  84  |   test('pagina carga sin error', async ({ page }) => {
  85  |     const body = await page.locator('body').textContent() || ''
  86  |     expect(body).not.toMatch(/Error 500/)
  87  |   })
  88  | 
  89  |   test('buscador filtra sin crash', async ({ page }) => {
  90  |     const buscador = page.locator('input[type="search"], input[placeholder*="buscar" i]').first()
  91  |     if (await buscador.isVisible()) {
  92  |       await buscador.fill('a')
  93  |       await page.waitForTimeout(500)
  94  |       const body = await page.locator('body').textContent() || ''
  95  |       expect(body).not.toMatch(/Error 500/)
  96  |     }
  97  |   })
  98  | })
  99  | 
  100 | test.describe('Productos', () => {
  101 |   test.beforeEach(async ({ page }) => {
  102 |     await loginAsAdmin(page)
  103 |     await safeNavigate(page, '/crm/productos')
  104 |   })
  105 | 
  106 |   test('pagina carga sin error', async ({ page }) => {
  107 |     const body = await page.locator('body').textContent() || ''
  108 |     expect(body).not.toMatch(/Error 500/)
  109 |   })
  110 | })
  111 | 
  112 | test.describe('Factura formulario nueva (sin emitir)', () => {
  113 |   test.beforeEach(async ({ page }) => {
  114 |     await loginAsAdmin(page)
  115 |   })
  116 | 
  117 |   test('facturas/nueva carga sin crash', async ({ page }) => {
  118 |     await safeNavigate(page, '/crm/facturas/nueva')
  119 |     const body = await page.locator('body').textContent() || ''
  120 |     expect(body).not.toMatch(/Error 500/)
  121 |   })
  122 | 
  123 |   test('boletas/nueva carga sin crash', async ({ page }) => {
  124 |     await safeNavigate(page, '/crm/boletas/nueva')
  125 |     const body = await page.locator('body').textContent() || ''
  126 |     expect(body).not.toMatch(/Error 500/)
  127 |   })
  128 | 
  129 |   test('guias/nueva carga sin crash', async ({ page }) => {
  130 |     await safeNavigate(page, '/crm/guias/nueva')
  131 |     const body = await page.locator('body').textContent() || ''
  132 |     expect(body).not.toMatch(/Error 500/)
  133 |   })
  134 | })
  135 | 
  136 | test.describe('Consistencia cross-modulo', () => {
```