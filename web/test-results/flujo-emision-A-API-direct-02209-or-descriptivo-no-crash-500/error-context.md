# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: flujo-emision.spec.ts >> A) API directa /api/sunat/emit >> sin token configurado: responde 200 con error descriptivo, no crash 500
- Location: tests\flujo-emision.spec.ts:166:7

# Error details

```
TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e6]:
    - generic [ref=e8]:
      - img [ref=e9]
      - text: Acceso Restringido
    - generic [ref=e12]:
      - generic [ref=e13]:
        - img "Maqui Mary" [ref=e15]
        - heading "Área de Empleados" [level=1] [ref=e16]
        - paragraph [ref=e17]: Ingresa tus credenciales para acceder
        - paragraph [ref=e18]: Sistema interno Maqui Mary
      - generic [ref=e19]:
        - generic [ref=e20]:
          - img [ref=e21]
          - textbox "Correo o alias" [ref=e24]: admin@maquimary.com
        - generic [ref=e25]:
          - textbox "Contraseña" [ref=e26]: Admin123!
          - button [ref=e27] [cursor=pointer]:
            - img [ref=e28]
        - generic [ref=e31] [cursor=pointer]:
          - img [ref=e32]
          - text: Recordar correo
        - button "Ingresar" [active] [ref=e34] [cursor=pointer]:
          - img [ref=e35]
          - text: Ingresar
      - link "Volver a la tienda →" [ref=e39] [cursor=pointer]:
        - /url: /
        - generic [ref=e40]: Volver a la tienda
        - generic [ref=e41]: →
    - paragraph [ref=e42]:
      - img [ref=e43]
      - text: ESPONJAS MAQUI MARY — Lurigancho, Lima
  - alert [ref=e45]
```

# Test source

```ts
  1  | import { Page, expect } from '@playwright/test'
  2  | 
  3  | export const ADMIN_EMAIL    = process.env.TEST_ADMIN_EMAIL    || 'admin@maquimary.com'
  4  | export const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Admin123!'
  5  | export const VENDEDOR_EMAIL    = process.env.TEST_VENDEDOR_EMAIL    || 'vendedor@maquimary.com'
  6  | export const VENDEDOR_PASSWORD = process.env.TEST_VENDEDOR_PASSWORD || 'Vendedor123!'
  7  | 
  8  | export async function loginAs(page: Page, email: string, password: string) {
  9  |   await clearSession(page)
  10 |   await page.goto('/crm/login', { waitUntil: 'commit' })
  11 |   await page.waitForTimeout(1500) // wait for formReady guard
  12 | 
  13 |   await page.fill('input[inputMode="email"], input[placeholder*="Correo"]', email)
  14 |   await page.fill('input[type="password"]', password)
  15 |   await page.click('button[type="submit"]')
  16 | 
> 17 |   await page.waitForURL(url => url.pathname === '/crm', { timeout: 15000 })
     |              ^ TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
  18 |   await page.waitForLoadState('networkidle')
  19 | }
  20 | 
  21 | export async function loginAsAdmin(page: Page) {
  22 |   await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD)
  23 | }
  24 | 
  25 | export async function loginAsVendedor(page: Page) {
  26 |   await loginAs(page, VENDEDOR_EMAIL, VENDEDOR_PASSWORD)
  27 | }
  28 | 
  29 | // Navigate handling ERR_ABORTED from middleware redirects during page.goto
  30 | export async function safeNavigate(page: Page, url: string) {
  31 |   try {
  32 |     await page.goto(url, { waitUntil: 'domcontentloaded' })
  33 |   } catch {
  34 |     // Middleware redirect aborts navigation — page lands on login
  35 |   }
  36 |   try {
  37 |     await page.waitForLoadState('networkidle')
  38 |   } catch {
  39 |     // ignore timeout
  40 |   }
  41 | }
  42 | 
  43 | // Clear session: limpia storage y cookies sin depender de una ruta /logout inexistente
  44 | export async function clearSession(page: Page) {
  45 |   await page.context().clearCookies()
  46 |   await page.goto('/crm/login', { waitUntil: 'domcontentloaded' }).catch(() => {})
  47 |   await page.evaluate(() => {
  48 |     localStorage.clear()
  49 |     sessionStorage.clear()
  50 |   }).catch(() => {})
  51 | }
  52 | 
```