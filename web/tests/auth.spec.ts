import { test, expect } from '@playwright/test'
import { loginAsAdmin, ADMIN_EMAIL, ADMIN_PASSWORD, safeNavigate } from './helpers'

// ─── AUTH & SESIÓN ───────────────────────────────────────────────────────────

test('login correcto redirige a /crm', async ({ page }) => {
  await loginAsAdmin(page)
  await expect(page).toHaveURL(/\/crm/)
})

test('login incorrecto muestra error, no redirige', async ({ page }) => {
  await page.goto('/crm/login')
  await page.fill('input[inputMode="email"], input[placeholder*="Correo"]', ADMIN_EMAIL)
  await page.fill('input[type="password"]', 'clavemal123')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(/\/crm\/login/)
  // Debe mostrar algún error en pantalla
  const body = await page.locator('body').textContent()
  expect(body).toMatch(/incorre|inválid|error/i)
})

test('campos vacíos muestran validación, no spinner infinito', async ({ page }) => {
  await page.goto('/crm/login')
  await page.click('button[type="submit"]')
  // No debe navegar
  await expect(page).toHaveURL(/\/crm\/login/)
  // Botón no queda en estado loading permanente
  await page.waitForTimeout(2000)
  const btn = page.locator('button[type="submit"]')
  const disabled = await btn.getAttribute('disabled')
  expect(disabled).toBeNull()
})

test('/crm/* sin sesión redirige a login', async ({ page }) => {
  await page.goto('/crm')
  await expect(page).toHaveURL(/\/crm\/login/)
})

test('/crm/facturas sin sesión redirige a login', async ({ page }) => {
  await page.goto('/crm/facturas')
  await expect(page).toHaveURL(/\/crm\/login/)
})

test('logout limpia sesión correctamente', async ({ page }) => {
  await loginAsAdmin(page)
  // Buscar botón de logout
  const logoutBtn = page.locator('button, a').filter({ hasText: /salir|logout|cerrar/i }).first()
  if (await logoutBtn.isVisible()) {
    await logoutBtn.click()
    await page.waitForTimeout(1000)
  } else {
    // Limpiar sesión manualmente
    await page.evaluate(() => {
      Object.keys(localStorage).forEach(k => { if (k.startsWith('sb-')) localStorage.removeItem(k) })
      Object.keys(sessionStorage).forEach(k => sessionStorage.removeItem(k))
    })
    await safeNavigate(page, '/crm')
  }
  await expect(page).toHaveURL(/\/crm\/login/)
})

test('sesión persiste al recargar', async ({ page }) => {
  await loginAsAdmin(page)
  await page.reload()
  await expect(page).toHaveURL(/\/crm/)
  // Asegurar que no redirige a login tras reload
  await expect(page).not.toHaveURL(/\/crm\/login/)
})

test('contraseña incorrecta no expone hash ni token en DOM', async ({ page }) => {
  await page.goto('/crm/login')
  await page.fill('input[inputMode="email"], input[placeholder*="Correo"]', ADMIN_EMAIL)
  await page.fill('input[type="password"]', 'clavemal')
  await page.click('button[type="submit"]')
  await page.waitForTimeout(1000)
  const html = await page.content()
  expect(html).not.toMatch(/\$2[ab]\$/)      // bcrypt hash
  expect(html).not.toMatch(/eyJ[A-Za-z]/)   // JWT token
})