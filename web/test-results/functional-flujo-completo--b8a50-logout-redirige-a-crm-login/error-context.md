# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: functional\flujo-completo.spec.ts >> Logout >> hacer logout redirige a /crm/login
- Location: tests\functional\flujo-completo.spec.ts:188:7

# Error details

```
TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - heading "404" [level=1] [ref=e5]
    - heading "This page could not be found." [level=2] [ref=e7]
  - alert [ref=e8]
```

# Test source

```ts
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
  137 |   test.beforeEach(async ({ page }) => {
  138 |     await loginAsAdmin(page)
  139 |   })
  140 | 
  141 |   test('clientes a facturas sin error', async ({ page }) => {
  142 |     await safeNavigate(page, '/crm/clientes')
  143 |     await safeNavigate(page, '/crm/facturas')
  144 |     const body = await page.locator('body').textContent() || ''
  145 |     expect(body).not.toMatch(/Error 500/)
  146 |   })
  147 | 
  148 |   test('pedidos carga sin error', async ({ page }) => {
  149 |     await safeNavigate(page, '/crm/pedidos')
  150 |     const body = await page.locator('body').textContent() || ''
  151 |     expect(body).not.toMatch(/Error 500/)
  152 |   })
  153 | 
  154 |   test('inventario carga sin error', async ({ page }) => {
  155 |     await safeNavigate(page, '/crm/inventario')
  156 |     const body = await page.locator('body').textContent() || ''
  157 |     expect(body).not.toMatch(/Error 500/)
  158 |   })
  159 | 
  160 |   test('documentos carga sin error', async ({ page }) => {
  161 |     await safeNavigate(page, '/crm/documentos')
  162 |     const body = await page.locator('body').textContent() || ''
  163 |     expect(body).not.toMatch(/Error 500/)
  164 |   })
  165 | })
  166 | 
  167 | test.describe('RBAC rutas protegidas', () => {
  168 |   test('/crm/sunat sin sesion redirige a login', async ({ page }) => {
  169 |     await page.context().clearCookies()
  170 |     await safeNavigate(page, '/crm/sunat')
  171 |     await expect(page).toHaveURL(/login/, { timeout: 10000 })
  172 |   })
  173 | 
  174 |   test('/crm/configuracion sin sesion redirige a login', async ({ page }) => {
  175 |     await page.context().clearCookies()
  176 |     await safeNavigate(page, '/crm/configuracion')
  177 |     await expect(page).toHaveURL(/login/, { timeout: 10000 })
  178 |   })
  179 | 
  180 |   test('/crm/usuarios sin sesion redirige a login', async ({ page }) => {
  181 |     await page.context().clearCookies()
  182 |     await safeNavigate(page, '/crm/usuarios')
  183 |     await expect(page).toHaveURL(/login/, { timeout: 10000 })
  184 |   })
  185 | })
  186 | 
  187 | test.describe('Logout', () => {
  188 |   test('hacer logout redirige a /crm/login', async ({ page }) => {
  189 |     await loginAsAdmin(page)
  190 |     const btnLogout = page.locator('button[title="Cerrar sesion"], button', { hasText: /cerrar sesion|logout/i }).first()
  191 |     if (await btnLogout.isVisible()) {
  192 |       await btnLogout.click()
  193 |     }
> 194 |     await page.waitForURL(/\/crm\/login/, { timeout: 10000 })
      |                ^ TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
  195 |   })
  196 | })
  197 | 
```