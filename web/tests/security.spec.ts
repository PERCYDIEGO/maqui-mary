import { test, expect } from '@playwright/test'
import { loginAsAdmin, loginAsVendedor, safeNavigate } from './helpers'

// ─── SQL INJECTION ───────────────────────────────────────────────────────────

const SQL_PAYLOADS = [
  "' OR '1'='1",
  "'; DROP TABLE clientes;--",
  "' UNION SELECT * FROM profiles--",
  "1; SELECT pg_sleep(5)--",
]

test('SQL injection en login → rechaza con error, no expone datos', async ({ page }) => {
  for (const payload of SQL_PAYLOADS) {
    await page.goto('/crm/login')
    await page.fill('input[inputMode="email"], input[placeholder*="Correo"]', payload)
    await page.fill('input[type="password"]', payload)
    await page.click('button[type="submit"]')
    await page.waitForTimeout(800)
    // No debe navegar a /crm dashboard
    await expect(page).toHaveURL(/\/crm\/login/)
    // No debe mostrar datos de DB
    const body = await page.locator('body').textContent()
    expect(body).not.toMatch(/20606218801|profiles|pg_sleep/i)
  }
})

test('SQL injection en búsqueda de clientes → retorna vacío sin crash', async ({ page }) => {
  await loginAsAdmin(page)
  await safeNavigate(page, '/crm/clientes')
  // Buscar campo de search
  const search = page.locator('input[type="search"], input[placeholder*="buscar" i], input[placeholder*="search" i]').first()
  if (await search.isVisible()) {
    await search.fill("'; DROP TABLE clientes;--")
    await page.waitForTimeout(1000)
    // Página no debe crashear
    await expect(page.locator('body')).not.toContainText('Error 500')
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
  }
})

test('SQL injection en num_documento de cliente → error de validación', async ({ page }) => {
  const res = await page.request.post('/api/clientes', {
    data: {
      nombre: "Test",
      tipo_documento: 6,
      num_documento: "'; DROP TABLE clientes;--",
    },
    headers: { 'Content-Type': 'application/json' }
  })
  // Debe retornar error (4xx), nunca 200 ni 500
  expect(res.status()).toBeGreaterThanOrEqual(400)
  expect(res.status()).toBeLessThan(500)
})

test('ID inválido en /doc/[id] → 404, no expone datos de factura', async ({ page }) => {
  await page.goto("/doc/1' OR '1'='1")
  const body = await page.locator('body').textContent() || ''
  // La página devuelve 404 (NEXT_NOT_FOUND)
  expect(body).toMatch(/404/)
  expect(body).toMatch(/Página no encontrada/)
  // No debe mostrar datos de factura real como RUC o detalles de emisión
  expect(body).not.toMatch(/F[0-9]{3}-[0-9]+/)
  expect(body).not.toMatch(/Serie/)
})

// ─── RBAC — CONTROL DE ACCESO POR ROL ────────────────────────────────────────

test('sin auth: /crm/usuarios → redirige a login', async ({ page }) => {
  await page.goto('/crm/usuarios')
  await expect(page).toHaveURL(/\/crm\/login/)
})

test('sin auth: /crm/sunat → redirige a login', async ({ page }) => {
  await page.goto('/crm/sunat')
  await expect(page).toHaveURL(/\/crm\/login/)
})

test('sin auth: /crm/configuracion → redirige a login', async ({ page }) => {
  await page.goto('/crm/configuracion')
  await expect(page).toHaveURL(/\/crm\/login/)
})

test('API admin rechaza request sin token', async ({ page }) => {
  const res = await page.request.post('/api/auth/admin', {
    data: { action: 'test' },
    headers: { 'Content-Type': 'application/json' }
  })
  expect([401, 403]).toContain(res.status())
})

test('API leads rechaza request sin token', async ({ page }) => {
  const res = await page.request.get('/api/leads')
  // Debe rechazar (4xx)
  expect(res.status()).toBeGreaterThanOrEqual(400)
  expect(res.status()).toBeLessThan(500)
})

// ─── XSS ─────────────────────────────────────────────────────────────────────

test('XSS en nombre de cliente no ejecuta script', async ({ page }) => {
  await loginAsAdmin(page)
  let xssExecuted = false
  await page.exposeFunction('xssAlert', () => { xssExecuted = true })
  await safeNavigate(page, '/crm/clientes/nueva')
  const input = page.locator('input[name="nombre"], input[placeholder*="nombre" i]').first()
  if (await input.isVisible()) {
    await input.fill('<img src=x onerror="window.xssAlert()">')
    await page.waitForTimeout(500)
    expect(xssExecuted).toBe(false)
  }
})

// ─── IDOR ─────────────────────────────────────────────────────────────────────

test('/doc/ con UUID inexistente → no expone datos de factura', async ({ page }) => {
  await page.goto('/doc/00000000-0000-0000-0000-000000000000')
  const body = await page.locator('body').textContent() || ''
  expect(body).toMatch(/404/)
  expect(body).toMatch(/Página no encontrada/)
  // No debe mostrar datos de factura (serie, numero, montos)
  expect(body).not.toMatch(/F[0-9]{3}-[0-9]+/)
  expect(body).not.toMatch(/Serie/)
})

test('JWT expirado es rechazado', async ({ page }) => {
  const expiredToken = 'eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjF9.invalid'
  const res = await page.request.get('/api/config', {
    headers: { Authorization: `Bearer ${expiredToken}` }
  })
  // No debe retornar 200
  expect(res.status()).not.toBe(200)
})
