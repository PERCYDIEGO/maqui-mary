import { Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const CREDS_FILE = path.resolve(__dirname, '.test-creds.json')
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/** Lee las creds del bot en tiempo de ejecución (global-setup ya las escribió) */
function getBotCreds(): { email: string; password: string } | null {
  if (fs.existsSync(CREDS_FILE)) {
    try { return JSON.parse(fs.readFileSync(CREDS_FILE, 'utf-8')) } catch { /* ignore */ }
  }
  return null
}

export const VENDEDOR_EMAIL    = process.env.TEST_VENDEDOR_EMAIL    || 'vendedor@maquimary.com'
export const VENDEDOR_PASSWORD = process.env.TEST_VENDEDOR_PASSWORD || 'Vendedor123!'

/**
 * Login vía API de Supabase — inyecta la sesión en localStorage y navega a /crm.
 * Más confiable que el UI: no depende del formulario ni de redirects del browser.
 */
export async function loginAs(page: Page, email: string, password: string) {
  await clearSession(page)

  // 1. Autenticar en Node.js con el cliente anon
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.session) {
    throw new Error(`loginAs: Supabase auth falló para ${email}: ${error?.message}`)
  }

  const { access_token, refresh_token } = data.session
  const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0]
  const storageKey = `sb-${projectRef}-auth-token`

  // 2. Cookie para @supabase/ssr (middleware): sb-{ref}-auth-token con JSON de la sesión
  //    También sb-access-token para las API routes (api-auth.ts usa ese nombre)
  const sessionJson = JSON.stringify(data.session)
  await page.context().addCookies([
    {
      name: storageKey,            // sb-{projectRef}-auth-token — para middleware @supabase/ssr
      value: sessionJson,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
    {
      name: 'sb-access-token',     // para api-auth.ts (API routes)
      value: access_token,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ])

  // 3. Navegar a / para poder escribir en localStorage
  await page.goto('/', { waitUntil: 'domcontentloaded' }).catch(() => {})

  // 4. Inyectar sesión en localStorage (para el cliente browser de Supabase)
  await page.evaluate(
    ({ key, session }) => { localStorage.setItem(key, JSON.stringify(session)) },
    { key: storageKey, session: data.session }
  )

  // 5. Navegar al CRM
  await page.goto('/crm', { waitUntil: 'domcontentloaded' })
  await page.waitForURL(url => url.pathname.startsWith('/crm'), { timeout: 15000 })
  await page.waitForLoadState('networkidle')
}

export async function loginAsAdmin(page: Page) {
  const bot = getBotCreds()
  const email    = bot?.email    || process.env.TEST_ADMIN_EMAIL    || 'admin@maquimary.com'
  const password = bot?.password || process.env.TEST_ADMIN_PASSWORD || 'Admin123!'
  await loginAs(page, email, password)
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
