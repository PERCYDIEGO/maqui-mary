import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers'

async function waitForServer(pathname, page) {
  // Wait for navigation to specific pathname
  try {
    await page.waitForFunction(p => window.location.pathname === p, pathname, { timeout: 8000 })
  } catch {
    // timeout ok
  }
}

test('session persists on reload - step by step', async ({ page }) => {
  // Capture all network requests to /crm paths
  const requests = []
  page.on('request', req => {
    const u = new URL(req.url())
    if (u.pathname.startsWith('/crm') && !u.pathname.includes('_next')) {
      requests.push({ type: 'req', method: req.method(), url: u.pathname, ts: Date.now() })
    }
  })
  page.on('response', resp => {
    const u = new URL(resp.url())
    if (u.pathname.startsWith('/crm') && !u.pathname.includes('_next')) {
      requests.push({ type: 'res', status: resp.status(), url: u.pathname, ts: Date.now() })
    }
  })
  page.on('requestfailed', req => {
    const u = new URL(req.url())
    if (u.pathname.startsWith('/crm')) {
      requests.push({ type: 'fail', url: u.pathname, error: req.failure()?.errorText, ts: Date.now() })
    }
  })

  // STEP 1: Login
  await page.goto('/crm/login', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  await page.fill('input[inputMode="email"], input[placeholder*="Correo"]', process.env.TEST_ADMIN_EMAIL || 'admin@maquimary.com')
  await page.fill('input[type="password"]', process.env.TEST_ADMIN_PASSWORD || 'Admin123!')
  await page.click('button[type="submit"]')

  // Wait for navigation to /crm
  await page.waitForFunction(() => window.location.pathname === '/crm', { timeout: 10000 })
  await page.waitForLoadState('networkidle').catch(() => {})
  
  const url1 = page.url()
  const cookies1 = await page.context().cookies()
  const cookie1 = cookies1.find(c => c.name.includes('sb-'))
  const docCookie1 = await page.evaluate(() => document.cookie)

  console.log('=== AFTER LOGIN ===')
  console.log('URL:', url1)
  console.log('Cookie present in context:', !!cookie1)
  console.log('Cookie in document.cookie:', docCookie1.includes('sb-'))
  if (cookie1) {
    console.log('Cookie name:', cookie1.name)
    console.log('Cookie path:', cookie1.path)
    console.log('Cookie domain:', cookie1.domain)
    console.log('Cookie secure:', cookie1.secure)
    console.log('Cookie value starts with:', cookie1.value.substring(0, 30))
  }
  console.log('Context cookies count:', cookies1.length)
  
  // Save for comparison
  const cookieValue1 = cookie1?.value

  // STEP 2: Reload
  console.log('\n=== RELOADING ===')
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1000) // Let middleware process

  const url2 = page.url()
  const cookies2 = await page.context().cookies()
  const cookie2 = cookies2.find(c => c.name.includes('sb-'))
  const docCookie2 = await page.evaluate(() => document.cookie)

  console.log('\n=== AFTER RELOAD ===')
  console.log('URL:', url2)
  console.log('Cookie present in context:', !!cookie2)
  console.log('Cookie in document.cookie:', docCookie2.includes('sb-'))
  if (cookie2) {
    console.log('Cookie name:', cookie2.name)
    console.log('Cookie path:', cookie2.path)
    console.log('Cookie value starts with:', cookie2.value.substring(0, 30))
    console.log('Cookie value SAME as before:', cookie2.value === cookieValue1)
  }
  
  console.log('\n=== NETWORK REQUESTS ===')
  for (const r of requests) {
    const type = r.type === 'req' ? '→' : r.type === 'res' ? '←' : '✗'
    const extra = r.status ? ` ${r.status}` : r.error ? ` ${r.error}` : ''
    console.log(`  ${type} ${r.url}${extra}`)
  }

  // Assert
  expect(url2).not.toContain('/crm/login')
  expect(cookie2).toBeDefined()
})
