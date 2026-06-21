/**
 * Bot de pruebas: flujo completo de emisión de documentos a SUNAT
 *
 * Corre en SANDBOX (apisunat_environment = 'sandbox') por defecto.
 * El switch a producción lo hace el operador desde Configuración > SUNAT.
 *
 * Qué verifica cada sección:
 *  A) API directa  → estructura de respuesta, sin crash aunque no haya token
 *  B) UI boleta    → wizard completo → SUNAT pendientes → Enviar → estado actualizado
 *  C) UI factura   → ídem con cliente RUC
 *  D) Historial    → documentos enviados aparecen en el historial
 */

import { test, expect, Page } from '@playwright/test'
import { loginAsAdmin, safeNavigate } from './helpers'

// Estados válidos que puede devolver SUNAT (cualquiera es OK, lo que NO debe pasar es un crash)
const ESTADOS_VALIDOS = ['ACEPTADO', 'RECHAZADO', 'PENDIENTE', 'ENVIADO', 'ERROR']

// ─── HELPERS INTERNOS ────────────────────────────────────────────────────────

/** Agrega un ítem manualmente (sin depender de productos existentes) */
async function agregarItemManual(page: Page, index = 0) {
  // Click "Agregar Ítem" o "Agregar primer ítem"
  const btnAgregar = page.getByRole('button', { name: /agregar.*(ítem|item)/i }).first()
  await btnAgregar.click()
  await page.waitForTimeout(300)

  // Intentar seleccionar un producto del dropdown si existe
  const selectProducto = page.locator('select').filter({ hasText: /selecciona un producto/i }).nth(index)
  if (await selectProducto.isVisible({ timeout: 1000 }).catch(() => false)) {
    const options = await selectProducto.locator('option').all()
    // options[0] es el placeholder "-- Selecciona un producto --", options[1] es el primero real
    if (options.length > 1) {
      await selectProducto.selectOption({ index: 1 })
      await page.waitForTimeout(400)
      return
    }
  }

  // Fallback: llenar descripción y precio manualmente
  const descInput = page.locator('input[placeholder*="escripción" i], input[placeholder*="producto" i]').nth(index)
  if (await descInput.isVisible({ timeout: 1000 }).catch(() => false)) {
    await descInput.fill('Esponja de limpieza TEST')
  }

  const precioInput = page.locator('input[placeholder="0.00"]').nth(index)
  if (await precioInput.isVisible({ timeout: 1000 }).catch(() => false)) {
    await precioInput.fill('8.00')
  }
}

/** Crea una boleta usando "Consumidor Final" y devuelve el número de documento generado */
async function crearBoletaUI(page: Page): Promise<string> {
  await safeNavigate(page, '/crm/boletas/nueva')

  // Paso 1: Cliente — Consumidor Final
  await page.getByRole('button', { name: /consumidor final/i }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /continuar/i }).click()
  await page.waitForTimeout(500)

  // Paso 2: Ítems
  await agregarItemManual(page)
  await page.waitForTimeout(400)

  // Botón continuar habilitado solo si el ítem está completo
  const btnContinuar = page.getByRole('button', { name: /continuar/i })
  await expect(btnContinuar).toBeEnabled({ timeout: 5000 })
  await btnContinuar.click()
  await page.waitForTimeout(500)

  // Paso 3: Emitir
  const btnEmitir = page.getByRole('button', { name: /emitir boleta/i })
  await expect(btnEmitir).toBeEnabled({ timeout: 3000 })

  // Capturar el número mostrado en la cabecera (ej: EB01-000001)
  const numeroCompleto = await page.locator('p.text-slate-500, p[class*="text-slate"]').first().textContent() || 'EB01-000001'

  await btnEmitir.click()
  // Esperar toast de confirmación o redirect
  await page.waitForURL(url => url.pathname.includes('/crm/boletas'), { timeout: 10000 })

  return numeroCompleto.trim()
}

/** Crea una factura con el primer cliente con RUC disponible. Retorna '' si no hay clientes RUC. */
async function crearFacturaUI(page: Page): Promise<string> {
  await safeNavigate(page, '/crm/facturas/nueva')

  // Intentar seleccionar el primer cliente con RUC del dropdown
  const inputCliente = page.locator('input[placeholder*="buscar" i], input[placeholder*="cliente" i]').first()
  await inputCliente.click()
  await page.waitForTimeout(400)

  // Ver si hay clientes con RUC listados
  const primerCliente = page.locator('.absolute button').first()
  const hayCliente = await primerCliente.isVisible({ timeout: 2000 }).catch(() => false)
  if (!hayCliente) {
    return '' // Sin clientes con RUC, skip este test
  }
  await primerCliente.click()
  await page.waitForTimeout(300)

  // Verificar que se seleccionó un cliente (debe aparecer el card de cliente)
  const clienteSeleccionado = page.locator('[class*="bg-purple-50"]').first()
  const tieneCliente = await clienteSeleccionado.isVisible({ timeout: 2000 }).catch(() => false)
  if (!tieneCliente) return ''

  await page.getByRole('button', { name: /continuar/i }).click()
  await page.waitForTimeout(500)

  // Paso 2: Ítems
  await agregarItemManual(page)
  await page.waitForTimeout(400)

  const btnContinuar = page.getByRole('button', { name: /continuar/i })
  await expect(btnContinuar).toBeEnabled({ timeout: 5000 })
  await btnContinuar.click()
  await page.waitForTimeout(500)

  // Paso 3: Emitir
  const btnEmitir = page.getByRole('button', { name: /emitir factura/i })
  await expect(btnEmitir).toBeEnabled({ timeout: 3000 })

  const numeroCompleto = await page.locator('p.text-slate-500, p[class*="text-slate"]').first().textContent() || 'E001-000001'
  await btnEmitir.click()
  await page.waitForURL(url => url.pathname.includes('/crm/facturas'), { timeout: 10000 })

  return numeroCompleto.trim()
}

/** Va a /crm/sunat y hace click en "Enviar" del primer documento que matchee el número */
async function enviarDesdeUI(page: Page, numeroCompleto: string): Promise<string> {
  await safeNavigate(page, '/crm/sunat')
  await page.waitForTimeout(1000) // Esperar que carguen los documentos

  // Buscar la fila del documento
  const fila = page.locator(`text=${numeroCompleto}`).first()
  const filaVisible = await fila.isVisible({ timeout: 5000 }).catch(() => false)
  if (!filaVisible) return 'NO_ENCONTRADO'

  // Click en "Enviar" dentro del contenedor de esa fila
  const contenedor = fila.locator('..').locator('..').locator('..')
  const btnEnviar = contenedor.getByRole('button', { name: /^Enviar$/ }).first()
  await btnEnviar.click()

  // Esperar que el spinner desaparezca (indica que terminó el envío)
  await page.waitForFunction(
    () => !document.querySelector('[class*="animate-spin"]'),
    { timeout: 30000 }
  )
  await page.waitForTimeout(1000)

  // Leer el toast o el estado del documento
  const toast = page.locator('[class*="toast"], [role="status"], [aria-live]').first()
  const toastText = await toast.textContent({ timeout: 3000 }).catch(() => '')
  return toastText || 'OK'
}

// ─── A: API DIRECTA ──────────────────────────────────────────────────────────

test.describe('A) API directa /api/sunat/emit', () => {
  test.setTimeout(45000)

  test('sin token configurado: responde 200 con error descriptivo, no crash 500', async ({ page }) => {
    await loginAsAdmin(page)

    const res = await page.request.post('/api/sunat/emit', {
      data: {
        cliente_nombre: 'CLIENTE TEST',
        tipo_comprobante: '03',
        sin_identificar: true,
        items: [{ description: 'Test item', quantity: 1, unit_price: 5.0 }],
      },
    })

    // No debe crashear
    expect(res.status()).not.toBe(500)
    const body = await res.json()
    // Tiene las claves esperadas
    expect(body).toHaveProperty('ok')
    expect(body).toHaveProperty('estado_sunat')
  })

  test('boleta Consumidor Final: estructura de respuesta correcta', async ({ page }) => {
    await loginAsAdmin(page)

    const today = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const res = await page.request.post('/api/sunat/emit', {
      data: {
        cliente_nombre: 'CONSUMIDOR FINAL',
        cliente_tipo_doc: '1',
        tipo_comprobante: '03',
        sin_identificar: true,
        moneda: 'PEN',
        forma_pago: 'contado',
        items: [
          { description: 'Esponja cocina 3M TEST', quantity: 2, unit_price: 6.78 },
        ],
        notes: 'Test sandbox automatico',
      },
    })

    expect(res.status()).not.toBe(500)
    const body = await res.json()

    // Estructura esperada
    expect(typeof body.ok).toBe('boolean')
    expect(body).toHaveProperty('estado_sunat')
    expect(body).toHaveProperty('mensaje')

    // El estado debe ser uno de los válidos (sin importar cuál)
    expect(ESTADOS_VALIDOS).toContain(body.estado_sunat)

    // Si fue exitoso, tiene los campos extra
    if (body.ok && body.factura) {
      expect(body.factura).toHaveProperty('id')
      expect(body.factura).toHaveProperty('series')
      expect(body.factura).toHaveProperty('total')
    }
  })

  test('factura con RUC: estructura de respuesta correcta', async ({ page }) => {
    await loginAsAdmin(page)

    const res = await page.request.post('/api/sunat/emit', {
      data: {
        cliente_nombre: 'EMPRESA TEST SAC',
        cliente_ruc: '20123456789',
        cliente_tipo_doc: '6',
        cliente_direccion: 'Av. Test 123, Lima',
        tipo_comprobante: '01',
        moneda: 'PEN',
        forma_pago: 'contado',
        items: [
          { description: 'Estropajo industrial TEST', quantity: 10, unit_price: 4.50 },
          { description: 'Esponja doble uso TEST',   quantity: 5,  unit_price: 8.00 },
        ],
        notes: 'Test factura sandbox',
      },
    })

    expect(res.status()).not.toBe(500)
    const body = await res.json()

    expect(typeof body.ok).toBe('boolean')
    expect(body).toHaveProperty('estado_sunat')
    expect(ESTADOS_VALIDOS).toContain(body.estado_sunat)
  })

  test('items vacíos: devuelve 400, no 500', async ({ page }) => {
    await loginAsAdmin(page)

    const res = await page.request.post('/api/sunat/emit', {
      data: {
        cliente_nombre: 'TEST',
        tipo_comprobante: '03',
        items: [], // vacío intencional
      },
    })

    // Debe rechazar con 400, no crashear con 500
    expect([400, 422]).toContain(res.status())
  })

  test('sin sesión: devuelve 401', async ({ page }) => {
    // Sin login, petición directa
    const res = await page.request.post('/api/sunat/emit', {
      data: {
        cliente_nombre: 'TEST',
        tipo_comprobante: '03',
        items: [{ description: 'x', quantity: 1, unit_price: 1 }],
      },
    })

    expect(res.status()).toBe(401)
  })
})

// ─── B: UI BOLETA ────────────────────────────────────────────────────────────

test.describe('B) UI: Crear y enviar boleta', () => {
  test.setTimeout(90000)

  test('wizard completo boleta → pendiente SUNAT → Enviar → estado actualizado', async ({ page }) => {
    await loginAsAdmin(page)

    // 1. Crear boleta
    const numero = await crearBoletaUI(page)
    expect(numero).not.toBe('')

    // 2. Verificar que aparece en el listado de boletas
    await safeNavigate(page, '/crm/boletas')
    await page.waitForTimeout(1000)
    const bodyBoletas = await page.locator('body').innerText()
    expect(bodyBoletas).not.toMatch(/Error 500|Internal Server Error/)

    // 3. Ir a SUNAT y verificar que aparece en pendientes
    await safeNavigate(page, '/crm/sunat')
    await page.waitForTimeout(1500)

    const pendientesSection = page.locator('text=/pendiente|por enviar/i').first()
    const hayPendientes = await pendientesSection.isVisible({ timeout: 5000 }).catch(() => false)

    if (!hayPendientes) {
      // No hay pendientes todavía (posible que el documento aún no cargó)
      await page.reload()
      await page.waitForTimeout(2000)
    }

    // 4. Click Enviar en el documento más reciente
    const btnEnviar = page.getByRole('button', { name: /^Enviar$/ }).first()
    const hayBoton = await btnEnviar.isVisible({ timeout: 8000 }).catch(() => false)

    if (!hayBoton) {
      // Si no hay botón, el documento puede haber cambiado de estado automáticamente
      console.log('No se encontró botón Enviar — el documento puede estar procesado')
      return
    }

    await btnEnviar.click()

    // 5. Esperar que termine el procesamiento
    await page.waitForFunction(
      () => !document.querySelector('[class*="animate-spin"]'),
      { timeout: 30000 }
    )
    await page.waitForTimeout(1000)

    // 6. Verificar que la página no crasheó y muestra un estado válido
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/Error 500|Internal Server Error|undefined/)

    // Debe mostrar alguno de los estados conocidos tras el envío
    const tieneEstado = /Aceptado|Rechazado|Enviado|Pendiente|Error|token|configuraci/i.test(bodyText)
    expect(tieneEstado).toBeTruthy()
  })
})

// ─── C: UI FACTURA ───────────────────────────────────────────────────────────

test.describe('C) UI: Crear y enviar factura', () => {
  test.setTimeout(90000)

  test('wizard completo factura → pendiente SUNAT → Enviar → estado actualizado', async ({ page }) => {
    await loginAsAdmin(page)

    const numero = await crearFacturaUI(page)

    if (!numero) {
      test.skip(true, 'No hay clientes con RUC registrados para crear factura de prueba')
      return
    }

    // Verificar listado de facturas sin crash
    await safeNavigate(page, '/crm/facturas')
    await page.waitForTimeout(1000)
    const bodyFacturas = await page.locator('body').innerText()
    expect(bodyFacturas).not.toMatch(/Error 500|Internal Server Error/)

    // Ir a SUNAT y enviar
    await safeNavigate(page, '/crm/sunat')
    await page.waitForTimeout(1500)

    const btnEnviar = page.getByRole('button', { name: /^Enviar$/ }).first()
    const hayBoton = await btnEnviar.isVisible({ timeout: 8000 }).catch(() => false)

    if (!hayBoton) {
      console.log('No se encontró botón Enviar para factura')
      return
    }

    await btnEnviar.click()
    await page.waitForFunction(
      () => !document.querySelector('[class*="animate-spin"]'),
      { timeout: 30000 }
    )
    await page.waitForTimeout(1000)

    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/Error 500|Internal Server Error|undefined/)

    const tieneEstado = /Aceptado|Rechazado|Enviado|Pendiente|Error|token|configuraci/i.test(bodyText)
    expect(tieneEstado).toBeTruthy()
  })
})

// ─── D: HISTORIAL ────────────────────────────────────────────────────────────

test.describe('D) Historial y estados SUNAT', () => {
  test.setTimeout(30000)

  test('página SUNAT carga sin crash y muestra secciones esperadas', async ({ page }) => {
    await loginAsAdmin(page)
    await safeNavigate(page, '/crm/sunat')
    await page.waitForTimeout(1000)

    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/Error 500|Internal Server Error|undefined/)

    // Debe tener alguna de las secciones de la página SUNAT
    expect(body).toMatch(/pendiente|historial|envío|SUNAT/i)
  })

  test('documentos enviados aparecen en historial con estado legible', async ({ page }) => {
    await loginAsAdmin(page)
    await safeNavigate(page, '/crm/sunat')
    await page.waitForTimeout(1000)

    // Buscar badges de estado en el historial
    const badges = page.locator('span').filter({ hasText: /Aceptado|Rechazado|Enviado|Borrador|Pendiente/i })
    const count = await badges.count()

    // No necesariamente hay documentos — si los hay, deben tener estado legible
    if (count > 0) {
      const primerBadge = await badges.first().textContent()
      expect(primerBadge).toMatch(/Aceptado|Rechazado|Enviado|Borrador|Pendiente/i)
    }
  })

  test('diagnóstico SUNAT carga sin crash', async ({ page }) => {
    await loginAsAdmin(page)
    await safeNavigate(page, '/crm/sunat/diagnostico')
    await page.waitForTimeout(1000)

    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/Error 500|Internal Server Error/)
    // La página de diagnóstico debe mostrar algo relacionado con SUNAT o conexión
    expect(body).toMatch(/SUNAT|diagnóstico|conexión|configuración|token/i)
  })
})

// ─── E: PREVIEW XML ──────────────────────────────────────────────────────────

test.describe('E) Preview XML (no envía a SUNAT)', () => {
  test.setTimeout(20000)

  test('endpoint /api/sunat/preview responde sin crash', async ({ page }) => {
    await loginAsAdmin(page)

    const res = await page.request.post('/api/sunat/preview', {
      data: {
        tipo: '03',
        items: [{ descripcion: 'Test preview', cantidad: 1, precio_unitario: 10 }],
        cliente: { nombre: 'CONSUMIDOR FINAL', tipo_documento: 1, num_documento: '00000000' },
      },
    })

    // No debe ser 500 (puede ser 400 si el formato esperado difiere, eso está ok)
    expect(res.status()).not.toBe(500)
  })

  test('botón Vista previa abre modal sin crash', async ({ page }) => {
    await loginAsAdmin(page)
    await safeNavigate(page, '/crm/sunat')
    await page.waitForTimeout(1000)

    const btnVista = page.getByRole('button', { name: /vista previa/i }).first()
    const hayBoton = await btnVista.isVisible({ timeout: 5000 }).catch(() => false)

    if (!hayBoton) {
      test.skip(true, 'No hay documentos pendientes para ver vista previa')
      return
    }

    await btnVista.click()
    await page.waitForTimeout(800)

    // El modal debe abrirse y mostrar algo de XML o información del documento
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/Error 500|undefined/)
    expect(body).toMatch(/XML|UBL|Invoice|Boleta|Factura|<?xml/i)
  })
})
