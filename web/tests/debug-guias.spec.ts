import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

async function loginAsTestUser(page: Page) {
  const creds = JSON.parse(fs.readFileSync(path.resolve(__dirname, '.test-creds.json'), 'utf-8'))
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error } = await supabase.auth.signInWithPassword({ email: creds.email, password: creds.password })
  if (error || !data.session) throw new Error(`Login failed: ${error?.message}`)
  const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0]
  const storageKey = `sb-${projectRef}-auth-token`
  const sessionJson = JSON.stringify(data.session)
  await page.context().addCookies([
    { name: storageKey, value: sessionJson, domain: 'localhost', path: '/', httpOnly: false, secure: false, sameSite: 'Lax' },
    { name: 'sb-access-token', value: data.session.access_token, domain: 'localhost', path: '/', httpOnly: false, secure: false, sameSite: 'Lax' },
  ])
  await page.goto('http://localhost:3001/', { waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.evaluate(({ key, session }) => { localStorage.setItem(key, JSON.stringify(session)) }, { key: storageKey, session: data.session })
  await page.goto('http://localhost:3001/crm', { waitUntil: 'domcontentloaded' })
  await page.waitForURL(url => url.pathname.startsWith('/crm'), { timeout: 15000 })
  await page.waitForLoadState('networkidle')
}

test.describe('Debug guías tab crash', () => {
  test('click guías tab and capture error', async ({ page }) => {
    test.setTimeout(60000)
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
        console.log('CONSOLE ERROR:', msg.text())
      }
    })
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message, err.stack))

    await loginAsAdmin(page)
    await page.goto('/crm/documentos', { waitUntil: 'networkidle' })

    const guiasTab = page.locator('button', { hasText: 'Guías' })
    await expect(guiasTab).toBeVisible()
    await guiasTab.click()
    await page.waitForTimeout(2000)

    const body = await page.locator('body').textContent() || ''
    const hasError = body.includes('Error inesperado')
    console.log('GUIAS TAB STATE:', hasError ? 'ERROR VISIBLE' : 'OK')
    console.log('Errors captured:', JSON.stringify(errors))
    expect(hasError).toBe(false)
  })
})
