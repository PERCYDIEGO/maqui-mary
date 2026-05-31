import { test, expect } from '@playwright/test'
import { loginAsAdmin, safeNavigate } from '../helpers'

type SectionInfo = { path: string; label: string };
const ALL_SECTIONS: SectionInfo[] = [
  { path: '/crm/clientes', label: 'Clientes' },
  { path: '/crm/productos', label: 'Productos' },
  { path: '/crm/inventario', label: 'Inventario' },
  { path: '/crm/facturas', label: 'Facturas' },
  { path: '/crm/boletas', label: 'Boletas' },
  { path: '/crm/guias', label: 'Guías' },
  { path: '/crm/pedidos', label: 'Pedidos' },
  { path: '/crm/documentos', label: 'Documentos' },
  { path: '/crm/transportistas', label: 'Transportistas' },
  { path: '/crm/usuarios', label: 'Usuarios' },
  { path: '/crm/sunat', label: 'SUNAT' },
  { path: '/crm/configuracion', label: 'Configuración' },
]

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('carga sin [object Object] ni Error 500', async ({ page }) => {
    await expect(page).toHaveURL(/\/crm/)
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').textContent() || ''
    expect(body).not.toMatch(/\[object Object\]/)
    expect(body).not.toMatch(/Error 500/)
  })

  test('sidebar contiene enlaces de navegacion', async ({ page }) => {
    for (const section of ALL_SECTIONS) {
      const link = page.locator(`a[href="${section.path}"]`).first()
      await expect(link).toBeVisible({ timeout: 5000 })
    }
  })
})

test.describe('Navegacion secciones', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  for (const section of ALL_SECTIONS) {
    test(`${section.label} carga sin error 500`, async ({ page }) => {
      await safeNavigate(page, section.path)
      const body = await page.locator('body').textContent() || ''
      expect(body).not.toMatch(/Error 500/)
      expect(body).not.toMatch(/\[object Object\]/)
    })
  }

  test('navegar por todas las secciones no genera toasts de error', async ({ page }) => {
    const erroresEncontrados: string[] = []
    const textoError = /No se pudo cargar|Error al cargar|infinite recursion/i

    for (const section of ALL_SECTIONS) {
      await safeNavigate(page, section.path)
      await page.waitForTimeout(1500)

      // Buscar toasts de error visibles (react-hot-toast renderiza en el body)
      const toasts = page.locator('[data-hot-toast], [role="status"], [class*="toast"]')
      const count = await toasts.count()
      for (let i = 0; i < count; i++) {
        const texto = await toasts.nth(i).textContent().catch(() => '')
        if (textoError.test(texto || '')) {
          erroresEncontrados.push(`${section.label}: "${texto?.trim().slice(0, 80)}"`)
        }
      }
    }

    expect(erroresEncontrados, 'Toasts de error detectados al navegar').toEqual([])
  })
})

test.describe('Clientes', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await safeNavigate(page, '/crm/clientes')
  })

  test('pagina carga sin error', async ({ page }) => {
    const body = await page.locator('body').textContent() || ''
    expect(body).not.toMatch(/Error 500/)
  })

  test('buscador filtra sin crash', async ({ page }) => {
    const buscador = page.locator('input[type="search"], input[placeholder*="buscar" i]').first()
    if (await buscador.isVisible()) {
      await buscador.fill('a')
      await page.waitForTimeout(500)
      const body = await page.locator('body').textContent() || ''
      expect(body).not.toMatch(/Error 500/)
    }
  })
})

test.describe('Productos', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await safeNavigate(page, '/crm/productos')
  })

  test('pagina carga sin error', async ({ page }) => {
    const body = await page.locator('body').textContent() || ''
    expect(body).not.toMatch(/Error 500/)
  })
})

test.describe('Factura formulario nueva (sin emitir)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('facturas/nueva carga sin crash', async ({ page }) => {
    await safeNavigate(page, '/crm/facturas/nueva')
    const body = await page.locator('body').textContent() || ''
    expect(body).not.toMatch(/Error 500/)
  })

  test('boletas/nueva carga sin crash', async ({ page }) => {
    await safeNavigate(page, '/crm/boletas/nueva')
    const body = await page.locator('body').textContent() || ''
    expect(body).not.toMatch(/Error 500/)
  })

  test('guias/nueva carga sin crash', async ({ page }) => {
    await safeNavigate(page, '/crm/guias/nueva')
    const body = await page.locator('body').textContent() || ''
    expect(body).not.toMatch(/Error 500/)
  })
})

test.describe('Consistencia cross-modulo', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('clientes a facturas sin error', async ({ page }) => {
    await safeNavigate(page, '/crm/clientes')
    await safeNavigate(page, '/crm/facturas')
    const body = await page.locator('body').textContent() || ''
    expect(body).not.toMatch(/Error 500/)
  })

  test('pedidos carga sin error', async ({ page }) => {
    await safeNavigate(page, '/crm/pedidos')
    const body = await page.locator('body').textContent() || ''
    expect(body).not.toMatch(/Error 500/)
  })

  test('inventario carga sin error', async ({ page }) => {
    await safeNavigate(page, '/crm/inventario')
    const body = await page.locator('body').textContent() || ''
    expect(body).not.toMatch(/Error 500/)
  })

  test('documentos carga sin error', async ({ page }) => {
    await safeNavigate(page, '/crm/documentos')
    const body = await page.locator('body').textContent() || ''
    expect(body).not.toMatch(/Error 500/)
  })
})

test.describe('RBAC rutas protegidas', () => {
  test('/crm/sunat sin sesion redirige a login', async ({ page }) => {
    await page.context().clearCookies()
    await safeNavigate(page, '/crm/sunat')
    await expect(page).toHaveURL(/login/, { timeout: 10000 })
  })

  test('/crm/configuracion sin sesion redirige a login', async ({ page }) => {
    await page.context().clearCookies()
    await safeNavigate(page, '/crm/configuracion')
    await expect(page).toHaveURL(/login/, { timeout: 10000 })
  })

  test('/crm/usuarios sin sesion redirige a login', async ({ page }) => {
    await page.context().clearCookies()
    await safeNavigate(page, '/crm/usuarios')
    await expect(page).toHaveURL(/login/, { timeout: 10000 })
  })
})

test.describe('Logout', () => {
  test('hacer logout redirige a /crm/login', async ({ page }) => {
    await loginAsAdmin(page)
    const btnLogout = page.locator('button[title="Cerrar sesion"], button', { hasText: /cerrar sesion|logout/i }).first()
    if (await btnLogout.isVisible()) {
      await btnLogout.click()
    }
    await page.waitForURL(/\/crm\/login/, { timeout: 10000 })
  })
})
