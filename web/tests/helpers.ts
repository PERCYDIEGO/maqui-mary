import { Page, expect } from '@playwright/test'

export const ADMIN_EMAIL    = process.env.TEST_ADMIN_EMAIL    || 'admin@maquimary.com'
export const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Admin123!'
export const VENDEDOR_EMAIL    = process.env.TEST_VENDEDOR_EMAIL    || 'vendedor@maquimary.com'
export const VENDEDOR_PASSWORD = process.env.TEST_VENDEDOR_PASSWORD || 'Vendedor123!'

export async function loginAs(page: Page, email: string, password: string) {
  await clearSession(page)
  await page.goto('/crm/login', { waitUntil: 'commit' })
  await page.waitForTimeout(1500) // wait for formReady guard

  await page.fill('input[inputMode="email"], input[placeholder*="Correo"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')

  await page.waitForURL(url => url.pathname === '/crm', { timeout: 15000 })
  await page.waitForLoadState('networkidle')
}

export async function loginAsAdmin(page: Page) {
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD)
}

export async function loginAsVendedor(page: Page) {
  await loginAs(page, VENDEDOR_EMAIL, VENDEDOR_PASSWORD)
}

// Navigate handling ERR_ABORTED from middleware redirects during page.goto
export async function safeNavigate(page: Page, url: string) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' })
  } catch {
    // Middleware redirect aborts navigation — page lands on login
  }
  try {
    await page.waitForLoadState('networkidle')
  } catch {
    // ignore timeout
  }
}

// Clear session: limpia storage y cookies sin depender de una ruta /logout inexistente
export async function clearSession(page: Page) {
  await page.context().clearCookies()
  await page.goto('/crm/login', { waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  }).catch(() => {})
}
