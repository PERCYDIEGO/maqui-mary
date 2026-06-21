import { test, expect } from '@playwright/test'

// ─── LANDING PÚBLICA ─────────────────────────────────────────────────────────

test('homepage carga sin error', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const body = await page.locator('body').textContent() || ''
  expect(body).not.toMatch(/Error 500|Internal Server Error/)
})

test('homepage tiene h1 con contenido', async ({ page }) => {
  await page.goto('/')
  const h1 = page.locator('h1').first()
  await expect(h1).toBeVisible()
  const text = await h1.textContent()
  expect(text?.trim().length).toBeGreaterThan(3)
})

test('botón WhatsApp tiene número real (no 000)', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const waLinks = page.locator('a[href*="wa.me"], a[href*="whatsapp"]')
  const count = await waLinks.count()
  if (count > 0) {
    const href = await waLinks.first().getAttribute('href') || ''
    expect(href).not.toMatch(/wa\.me\/0{9,}/)
    expect(href).toMatch(/wa\.me\/\d{10,}/)
  }
})

test('página /crm/login carga correctamente', async ({ page }) => {
  await page.goto('/crm/login')
  await page.waitForLoadState('networkidle')
  // Debe tener campo de email/usuario y password
  const emailInput = page.locator('input[inputMode="email"], input[type="email"], input[name="email"]')
  const passInput  = page.locator('input[type="password"]')
  await expect(emailInput.first()).toBeVisible()
  await expect(passInput.first()).toBeVisible()
})

test('favicon existe y no da 404', async ({ page }) => {
  const res = await page.request.get('/favicon.ico')
  expect([200, 204, 304]).toContain(res.status())
})

test('meta title y description presentes en homepage', async ({ page }) => {
  await page.goto('/')
  const title = await page.title()
  expect(title.trim().length).toBeGreaterThan(3)
  const metaDesc = page.locator('meta[name="description"]')
  const count = await metaDesc.count()
  if (count > 0) {
    const content = await metaDesc.getAttribute('content')
    expect(content?.trim().length).toBeGreaterThan(10)
  }
})

// ─── DOCUMENTO PÚBLICO ───────────────────────────────────────────────────────

test('/doc/[id] con UUID inválido retorna página, no crash', async ({ page }) => {
  await page.goto('/doc/id-invalido-000')
  await page.waitForLoadState('networkidle')
  // No debe dar 500
  const body = await page.locator('body').textContent() || ''
  expect(body).not.toMatch(/Error 500|Internal Server Error/)
})

// ─── RESPONSIVE ──────────────────────────────────────────────────────────────

test('mobile 390px — homepage sin overflow horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const overflow = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth)
  expect(overflow).toBe(false)
})

test('mobile 390px — /crm/login sin overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/crm/login')
  await page.waitForLoadState('networkidle')
  const overflow = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth)
  expect(overflow).toBe(false)
})

test('sin console errors críticos en homepage', async ({ page }) => {
  const errors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  // Filtrar errores de recursos externos que no controlamos
  const criticalErrors = errors.filter(e =>
    !e.includes('favicon') &&
    !e.includes('fonts.google') &&
    !e.includes('analytics')
  )
  expect(criticalErrors).toHaveLength(0)
})

// ─── EDGE CASES ──────────────────────────────────────────────────────────────

test('404 page personalizada funciona', async ({ page }) => {
  await page.goto('/ruta-que-no-existe-xyz')
  await page.waitForLoadState('networkidle')
  const body = await page.locator('body').textContent() || ''
  // Debe mostrar algo personalizado, no el error por defecto de Next.js
  expect(body.length).toBeGreaterThan(50)
})

test('sin "[object Object]" en homepage', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const body = await page.locator('body').innerText() || ''
  expect(body).not.toMatch(/\[object Object\]/)
  expect(body).not.toMatch(/\bundefined\b/)
})
