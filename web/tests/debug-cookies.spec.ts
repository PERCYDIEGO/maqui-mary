import { test, expect } from '@playwright/test'
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './helpers'

test('login reliability', async ({ page }) => {
  const navs: string[] = []

  page.on('request', req => {
    const u = new URL(req.url())
    if (u.pathname.startsWith('/crm') && !u.pathname.includes('_next')) {
      navs.push(`REQ ${req.method()} ${u.pathname}`)
    }
  })

  page.on('response', resp => {
    const u = new URL(resp.url())
    if (u.pathname.startsWith('/crm') && !u.pathname.includes('_next')) {
      const rd = resp.request().redirectedFrom()
      navs.push(`RES ${resp.status()} ${u.pathname}${rd ? ` (from ${rd.url()})` : ''}`)
    }
  })

  // Step by step
  await page.goto('/crm/login')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)

  console.log('Step 1: login page loaded at', page.url())

  await page.fill('input[inputMode="email"], input[placeholder*="Correo"]', ADMIN_EMAIL)
  await page.fill('input[type="password"]', ADMIN_PASSWORD)

  console.log('Step 2: form filled')

  // Track the auth response
  const authResp = page.waitForResponse(r => r.url().includes('/auth/v1/token') && r.request().method() === 'POST')
  
  // Click submit and track navigation
  await page.click('button[type="submit"]')
  
  console.log('Step 3: clicked submit, waiting for navigation...')
  
  // Wait up to 10 seconds
  try {
    await page.waitForURL(url => !url.pathname.includes('/crm/login'), { timeout: 10000 })
  } catch (e) {
    console.log('waitForURL timed out! URL is', page.url())
  }

  const authRespData = await authResp
  const authStatus = authRespData.status()
  console.log(`Auth response: ${authStatus}`)

  const finalUrl = page.url()
  console.log('Final URL:', finalUrl)

  console.log('\nNavigation log:')
  for (const n of navs) console.log('  ' + n)

  const cookie = await page.evaluate(() => document.cookie)
  console.log('\ndocument.cookie:', cookie.substring(0, 80) + '... (present:', cookie.includes('sb-') + ')')

  // Additional: check what the browser thinks about the cookie
  // Check if we're on the login page and can see an error
  if (finalUrl.includes('/crm/login')) {
    const errText = await page.locator('.text-red-500').first().innerText().catch(() => '(no error visible)')
    console.log('Error on screen:', errText)
  }
})
