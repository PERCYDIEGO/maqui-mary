import { Page } from '@playwright/test'

export const ADMIN_EMAIL    = process.env.TEST_ADMIN_EMAIL    || 'admin@maquimary.com'
export const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Admin123!'
export const VENDEDOR_EMAIL    = process.env.TEST_VENDEDOR_EMAIL    || 'vendedor@maquimary.com'
export const VENDEDOR_PASSWORD = process.env.TEST_VENDEDOR_PASSWORD || 'Vendedor123!'

export async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/crm/login')
  await page.waitForLoadState('networkidle')
  await page.fill('input[type="email"], input[name="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/crm/, { timeout: 10000 })
}

export async function loginAsAdmin(page: Page) {
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD)
}

export async function loginAsVendedor(page: Page) {
  await loginAs(page, VENDEDOR_EMAIL, VENDEDOR_PASSWORD)
}
