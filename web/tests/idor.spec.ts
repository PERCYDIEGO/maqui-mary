import { test, expect } from '@playwright/test'
import { loginAsAdmin, loginAsVendedor, safeNavigate } from './helpers'

test.describe('IDOR — User Person Validation', () => {
  const adminOnlyRoutes = ['/crm/usuarios', '/crm/sunat', '/crm/configuracion']

  for (const route of adminOnlyRoutes) {
    test(`vendedor no accede a ${route} (admin only)`, async ({ page }) => {
      await loginAsVendedor(page)
      await safeNavigate(page, route)
      await expect(page).not.toHaveURL(route)
    })
  }

  test('vendedor no puede crear usuario via API', async ({ page }) => {
    await loginAsVendedor(page)
    const res = await page.request.post('/api/auth/admin', {
      data: { action: 'create_user', email: 'test@test.com', password: 'Test123!', role: 'vendedor' },
    })
    expect([401, 403, 404]).toContain(res.status())
  })

  test('admin accede a rutas admin sin problemas', async ({ page }) => {
    await loginAsAdmin(page)
    for (const route of adminOnlyRoutes) {
      await safeNavigate(page, route)
      await expect(page).not.toHaveURL(/\/login/)
    }
  })
})
