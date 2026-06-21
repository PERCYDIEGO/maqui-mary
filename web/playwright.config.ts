import { defineConfig } from '@playwright/test'
import dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config({ path: '.env.local' })

// Cargar credenciales del bot de prueba si existen (generadas por global-setup)
const credsFile = path.resolve(__dirname, 'tests/.test-creds.json')
if (fs.existsSync(credsFile)) {
  const creds = JSON.parse(fs.readFileSync(credsFile, 'utf-8'))
  process.env.TEST_ADMIN_EMAIL = creds.email
  process.env.TEST_ADMIN_PASSWORD = creds.password
}

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  globalSetup: './tests/global-setup.ts',
  globalTeardown: './tests/global-teardown.ts',
  use: {
    baseURL: 'http://localhost:3000',
    browserName: 'chromium',
    headless: true,
  },
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: true,
    timeout: 60000,
  },
})
