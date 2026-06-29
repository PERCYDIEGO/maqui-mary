import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import * as dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const BASE = 'http://localhost:3000'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let email = 'test-bot@maquimary.test'
let password = 'TestBot2026!'

async function ensureTestUser() {
  const credsPath = path.resolve(__dirname, '.test-creds.json')
  if (fs.existsSync(credsPath)) {
    const c = JSON.parse(fs.readFileSync(credsPath, 'utf-8'))
    email = c.email
    password = c.password
    return
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('No SUPABASE_SERVICE_ROLE_KEY')
  const admin = createClient(SUPABASE_URL, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: users } = await admin.auth.admin.listUsers()
  const existing = users?.users?.find(u => u.email === email)
  if (existing) {
    try { await admin.auth.admin.deleteUser(existing.id) } catch {}
    try { await admin.from('profiles').delete().eq('id', existing.id) } catch {}
  }
  const { data: created, error: createErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (createErr) throw new Error(`Create test user: ${createErr.message}`)
  await admin.from('profiles').upsert({ id: created.user.id, full_name: 'Bot de Pruebas', alias: 'test-bot', role: 'admin', force_password_change: false })
  console.log('Created test user:', email)
}

async function main() {
  await ensureTestUser()
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Login: ${error.message}`)

  const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0]
  const storageKey = `sb-${projectRef}-auth-token`

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()
  const errors = []

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`[CONSOLE ${msg.type()}] ${msg.text()}`)
  })
  page.on('pageerror', err => errors.push(`[PAGE_ERROR] ${err.message}\n${err.stack}`))
  page.on('response', resp => {
    if (resp.status() >= 400) errors.push(`[HTTP ${resp.status()}] ${resp.url()}`)
  })

  await context.addCookies([
    { name: storageKey, value: JSON.stringify(data.session), domain: 'localhost', path: '/', httpOnly: false, secure: false, sameSite: 'Lax' },
    { name: 'sb-access-token', value: data.session.access_token, domain: 'localhost', path: '/', httpOnly: false, secure: false, sameSite: 'Lax' },
  ])

  await page.goto(`${BASE}/crm/login`, { waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.waitForLoadState('networkidle')
  await page.evaluate(({ key, session }) => { localStorage.setItem(key, JSON.stringify(session)) }, { key: storageKey, session: data.session })
  console.log('Home page loaded, checking cookies...')
  const cookiesAfter = await context.cookies()
  const authCookie = cookiesAfter.find(c => c.name.includes('auth-token'))
  console.log('Auth cookie found:', !!authCookie, 'domain:', authCookie?.domain, 'port?', authCookie?.sameSite)

  // Go to documentos directly
  console.log('\n=== Going to /crm/documentos ===')
  const response = await page.goto(`${BASE}/crm/documentos`, { waitUntil: 'networkidle' })
  console.log('Final URL:', page.url())
  console.log('Status:', response?.status())
  console.log('Page title:', await page.title())

  // Wait for CRM to hydrate
  try {
    await page.waitForSelector('text=Documentos Electrónicos', { timeout: 20000 })
    console.log('CRM content found!')
  } catch {
    console.log('CRM content NOT found after waiting')
  }
  console.log('Errors during load:')
  errors.forEach(e => console.log('  -', e))
  errors.length = 0

  // Print HTML head and body
  const html = await page.content()
  console.log('HTML length:', html.length)

  const bodyContent = await page.locator('body').textContent()
  console.log('\nBody length:', bodyContent?.length)
  // Check for specific elements
  console.log('Has CRM sidebar/menu text:', bodyContent?.includes('Menú') || bodyContent?.includes('Dashboard') || bodyContent?.includes('Panel'))
  console.log('Has login form:', bodyContent?.includes('Iniciar sesión') || bodyContent?.includes('Correo'))
  // Check for the CRM header
  console.log('Has "Documentos Electrónicos":', bodyContent?.includes('Documentos Electrónicos'))
  // Check for empty state
  console.log('Has "No hay boletas":', bodyContent?.includes('No hay'))

  // Take screenshot immediately
  await page.screenshot({ path: 'debug-doc-before.png', fullPage: true })

  // Dump all button texts to find the guías tab
  const allButtons = await page.locator('button').allTextContents()
  console.log('\nALL BUTTONS:', JSON.stringify(allButtons))

  const allText = await page.locator('body').textContent()
  console.log('\nHas "Error inesperado":', allText.includes('Error inesperado'))
  console.log('Has "Guías":', allText.includes('Guías'))
  console.log('Has "Boletas":', allText.includes('Boletas'))

  // Try clicking the guías tab
  const guiasBtn = page.locator('button', { hasText: 'Guías' })
  const count = await guiasBtn.count()
  console.log('Buttons with "Guías" text:', count)

  if (count > 0) {
    await guiasBtn.first().click()
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'debug-guias-after.png', fullPage: true })
    console.log('\nAFTER CLICK:')
    const postBody = await page.locator('body').textContent()
    console.log('Has "Error inesperado":', postBody.includes('Error inesperado'))
    console.log('Errors:', JSON.stringify(errors, null, 2))
    // Print relevant section
    if (postBody.includes('Error inesperado')) {
      const idx = postBody.indexOf('Error inesperado')
      console.log('ERROR CONTEXT:', postBody.substring(Math.max(0, idx - 200), idx + 500))
    }
  }

  await browser.close()
}

main().catch(e => { console.error('FATAL:', e); process.exit(1) })
