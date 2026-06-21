import { test, expect } from '@playwright/test'

const PUBLIC_PAGES = ['/', '/login']
const ADMIN_PAGES = ['/admin', '/admin/clientes', '/admin/facturas']

for (const path of PUBLIC_PAGES) {
  test(`screenshot desktop ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto(path, { waitUntil: 'networkidle' })
    await expect(page).toHaveScreenshot(`desktop${path.replace(/\//g, '-') || '-home'}.png`, {
      maxDiffPixelRatio: 0.05,
    })
  })

  test(`screenshot mobile ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(path, { waitUntil: 'networkidle' })
    await expect(page).toHaveScreenshot(`mobile${path.replace(/\//g, '-') || '-home'}.png`, {
      maxDiffPixelRatio: 0.05,
    })
  })
}

// Admin — solo desktop, requiere auth (redirige a login si no autenticado)
for (const path of ADMIN_PAGES) {
  test(`screenshot admin ${path} sin auth → login`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto(path, { waitUntil: 'networkidle' })
    await expect(page).toHaveScreenshot(`admin-noauth${path.replace(/\//g, '-')}.png`, {
      maxDiffPixelRatio: 0.05,
    })
  })
}
