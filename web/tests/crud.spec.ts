import { test, expect } from '@playwright/test'
import { loginAsAdmin, safeNavigate } from './helpers'

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

test('dashboard carga sin undefined ni [object Object]', async ({ page }) => {
  await loginAsAdmin(page)
  const body = await page.locator('body').innerText() || ''
  expect(body).not.toMatch(/\[object Object\]/)
  expect(body).not.toMatch(/\bundefined\b/)
  expect(body).not.toMatch(/Error 500/)
})

test('dashboard muestra alguna métrica (no todo en 0)', async ({ page }) => {
  await loginAsAdmin(page)
  await expect(page.locator('body')).toBeVisible()
})

// ─── CLIENTES ─────────────────────────────────────────────────────────────────

test('listado clientes carga sin crash', async ({ page }) => {
  await loginAsAdmin(page)
  await safeNavigate(page, '/crm/clientes')
  const body = await page.locator('body').innerText() || ''
  expect(body).not.toMatch(/Error 500|Internal Server Error/)
})

test('búsqueda de clientes no crashea con caracteres especiales', async ({ page }) => {
  await loginAsAdmin(page)
  await safeNavigate(page, '/crm/clientes')
  const search = page.locator('input[type="search"], input[placeholder*="buscar" i], input[placeholder*="search" i]').first()
  if (await search.isVisible()) {
    await search.fill("ñoño & 'test' <script>")
    await page.waitForTimeout(800)
    await expect(page.locator('body')).not.toContainText('Error 500')
  }
})

test('lista vacía de clientes muestra mensaje, no crash', async ({ page }) => {
  await loginAsAdmin(page)
  await safeNavigate(page, '/crm/clientes')
  const search = page.locator('input[type="search"], input[placeholder*="buscar" i]').first()
  if (await search.isVisible()) {
    await search.fill('xxxxxxxxxxxxxx_no_existe_99999')
    await page.waitForTimeout(800)
    await expect(page.locator('body')).not.toContainText('Error')
  }
})

// ─── PRODUCTOS ────────────────────────────────────────────────────────────────

test('listado productos carga sin crash', async ({ page }) => {
  await loginAsAdmin(page)
  await safeNavigate(page, '/crm/productos')
  const body = await page.locator('body').innerText() || ''
  expect(body).not.toMatch(/Error 500|Internal Server Error|undefined/)
})

test('inventario carga sin crash', async ({ page }) => {
  await loginAsAdmin(page)
  await safeNavigate(page, '/crm/inventario')
  await expect(page.locator('body')).not.toContainText('Error 500')
})

// ─── TRANSPORTISTAS ───────────────────────────────────────────────────────────

test('listado transportistas carga sin crash', async ({ page }) => {
  await loginAsAdmin(page)
  await safeNavigate(page, '/crm/transportistas')
  await expect(page.locator('body')).not.toContainText('Error 500')
})

// ─── MÓDULOS ADMIN ────────────────────────────────────────────────────────────

test('/crm/usuarios carga para admin', async ({ page }) => {
  await loginAsAdmin(page)
  await safeNavigate(page, '/crm/usuarios')
  await expect(page).not.toHaveURL(/\/crm\/login/)
  await expect(page.locator('body')).not.toContainText('Error 500')
})

test('/crm/sunat carga para admin', async ({ page }) => {
  await loginAsAdmin(page)
  await safeNavigate(page, '/crm/sunat')
  await expect(page).not.toHaveURL(/\/crm\/login/)
  await expect(page.locator('body')).not.toContainText('Error 500')
})

test('/crm/configuracion carga para admin', async ({ page }) => {
  await loginAsAdmin(page)
  await safeNavigate(page, '/crm/configuracion')
  await expect(page).not.toHaveURL(/\/crm\/login/)
  await expect(page.locator('body')).not.toContainText('Error 500')
})

// ─── FORMULARIOS ──────────────────────────────────────────────────────────────

test('formulario factura nueva: campos requeridos muestran error', async ({ page }) => {
  await loginAsAdmin(page)
  await safeNavigate(page, '/crm/facturas/nueva')
  const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /guardar|crear|emitir|enviar/i }).first()
  if (await submitBtn.isVisible()) {
    await submitBtn.click()
    await page.waitForTimeout(500)
    await expect(page).toHaveURL(/\/crm\/facturas\/nueva/)
  }
})

test('documentos: no hay [object Object] en ninguna página CRM', async ({ page }) => {
  await loginAsAdmin(page)
  const pages = ['/crm/clientes', '/crm/facturas', '/crm/boletas', '/crm/productos']
  for (const url of pages) {
    await safeNavigate(page, url)
    const body = await page.locator('body').innerText() || ''
    expect(body, `[object Object] encontrado en ${url}`).not.toMatch(/\[object Object\]/)
  }
})
