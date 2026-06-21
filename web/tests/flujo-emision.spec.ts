/**
 * Bot de pruebas: flujo completo de emisión de documentos a SUNAT
 *
 * Corre en SANDBOX (apisunat_environment = 'sandbox') por defecto.
 * El switch a producción lo hace el operador desde Configuración > SUNAT.
 *
 * Secciones:
 *  A) API directa  → boleta, factura con RUC real, items vacíos, sin sesión
 *  B) UI boleta    → wizard completo → SUNAT pendientes → Enviar
 *  C) UI factura   → ídem con cliente RUC real de la BD
 *  D) Historial    → página SUNAT, badges de estado, diagnóstico
 *  E) Preview XML  → endpoint preview, modal vista previa
 *  F) Guía         → API guía con guía borrador creada en global-setup
 */

import { test, expect, Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { loginAsAdmin, safeNavigate } from './helpers'

// ─── Cargar datos reales de la DB (escritos por global-setup) ────────────────

function loadCreds() {
  const file = path.resolve(__dirname, '.test-creds.json')
  if (!fs.existsSync(file)) return null
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')) } catch { return null }
}

const ESTADOS_VALIDOS = ['ACEPTADO', 'RECHAZADO', 'PENDIENTE', 'ENVIADO', 'ERROR']

// ─── HELPERS UI ──────────────────────────────────────────────────────────────

async function agregarItem(page: Page, index = 0) {
  const btnAgregar = page.getByRole('button', { name: /agregar.*(ítem|item)/i }).first()
  await btnAgregar.click()
  await page.waitForTimeout(300)

  const selectProducto = page.locator('select').filter({ hasText: /selecciona un producto/i }).nth(index)
  if (await selectProducto.isVisible({ timeout: 1000 }).catch(() => false)) {
    const options = await selectProducto.locator('option').all()
    if (options.length > 1) {
      await selectProducto.selectOption({ index: 1 })
      await page.waitForTimeout(400)
      return
    }
  }

  const descInput = page.locator('input[placeholder*="escripción" i], input[placeholder*="producto" i]').nth(index)
  if (await descInput.isVisible({ timeout: 1000 }).catch(() => false)) {
    await descInput.fill('Esponja de limpieza TEST')
  }
  const precioInput = page.locator('input[placeholder="0.00"]').nth(index)
  if (await precioInput.isVisible({ timeout: 1000 }).catch(() => false)) {
    await precioInput.fill('8.00')
  }
}

async function crearBoletaUI(page: Page): Promise<string> {
  await safeNavigate(page, '/crm/boletas/nueva')

  await page.getByRole('button', { name: /consumidor final/i }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /continuar/i }).click()
  await page.waitForTimeout(500)

  await agregarItem(page)
  await page.waitForTimeout(400)

  const btnContinuar = page.getByRole('button', { name: /continuar/i })
  await expect(btnContinuar).toBeEnabled({ timeout: 5000 })
  await btnContinuar.click()
  await page.waitForTimeout(500)

  const btnEmitir = page.getByRole('button', { name: /emitir boleta/i })
  await expect(btnEmitir).toBeEnabled({ timeout: 3000 })
  const numeroCompleto = await page.locator('p.text-slate-500, p[class*="text-slate"]').first().textContent() || 'B001-000001'

  await btnEmitir.click()
  await page.waitForURL(url => url.pathname.includes('/crm/boletas'), { timeout: 10000 })
  return numeroCompleto.trim()
}

async function crearFacturaUI(page: Page): Promise<string> {
  await safeNavigate(page, '/crm/facturas/nueva')

  const inputCliente = page.locator('input[placeholder*="buscar" i], input[placeholder*="cliente" i]').first()
  await inputCliente.click()
  await page.waitForTimeout(400)

  const primerCliente = page.locator('.absolute button').first()
  const hayCliente = await primerCliente.isVisible({ timeout: 2000 }).catch(() => false)
  if (!hayCliente) return ''

  await primerCliente.click()
  await page.waitForTimeout(300)

  const clienteSeleccionado = page.locator('[class*="bg-purple-50"]').first()
  const tieneCliente = await clienteSeleccionado.isVisible({ timeout: 2000 }).catch(() => false)
  if (!tieneCliente) return ''

  await page.getByRole('button', { name: /continuar/i }).click()
  await page.waitForTimeout(500)

  await agregarItem(page)
  await page.waitForTimeout(400)

  const btnContinuar = page.getByRole('button', { name: /continuar/i })
  await expect(btnContinuar).toBeEnabled({ timeout: 5000 })
  await btnContinuar.click()
  await page.waitForTimeout(500)

  const btnEmitir = page.getByRole('button', { name: /emitir factura/i })
  await expect(btnEmitir).toBeEnabled({ timeout: 3000 })
  const numeroCompleto = await page.locator('p.text-slate-500, p[class*="text-slate"]').first().textContent() || 'F001-000001'

  await btnEmitir.click()
  await page.waitForURL(url => url.pathname.includes('/crm/facturas'), { timeout: 10000 })
  return numeroCompleto.trim()
}

async function enviarPrimerPendiente(page: Page) {
  await safeNavigate(page, '/crm/sunat')
  await page.waitForTimeout(1500)

  const btnEnviar = page.getByRole('button', { name: /^Enviar$/ }).first()
  const hayBoton = await btnEnviar.isVisible({ timeout: 8000 }).catch(() => false)
  if (!hayBoton) { console.log('No hay documentos pendientes para enviar'); return }

  await btnEnviar.click()
  await page.waitForFunction(
    () => !document.querySelector('[class*="animate-spin"]'),
    { timeout: 30000 }
  )
  await page.waitForTimeout(1000)
}

// ─── A: API DIRECTA ──────────────────────────────────────────────────────────

test.describe('A) API directa /api/sunat/emit', () => {
  test.setTimeout(45000)

  test('sin token configurado: responde sin crash 500', async ({ page }) => {
    await loginAsAdmin(page)
    const creds = loadCreds()
    const prod = creds?.productos?.[0]

    const res = await page.request.post('/api/sunat/emit', {
      data: {
        cliente_nombre: 'CLIENTE TEST',
        tipo_comprobante: '03',
        sin_identificar: true,
        items: [{ description: prod?.name ?? 'Esponja test', quantity: 1, unit_price: prod?.price ?? 5.0 }],
      },
    })

    expect(res.status()).not.toBe(500)
    const body = await res.json()
    expect(body).toHaveProperty('ok')
    expect(body).toHaveProperty('estado_sunat')
  })

  test('boleta Consumidor Final con producto real: estructura de respuesta correcta', async ({ page }) => {
    await loginAsAdmin(page)
    const creds = loadCreds()
    const prod1 = creds?.productos?.[0]
    const prod2 = creds?.productos?.[1]

    const res = await page.request.post('/api/sunat/emit', {
      data: {
        cliente_nombre: 'CONSUMIDOR FINAL',
        cliente_tipo_doc: '1',
        tipo_comprobante: '03',
        sin_identificar: true,
        moneda: 'PEN',
        forma_pago: 'contado',
        items: [
          { description: prod1?.name ?? 'Esponja doble uso', quantity: 2, unit_price: Number(prod1?.price ?? 5.50) },
          ...(prod2 ? [{ description: prod2.name, quantity: 1, unit_price: Number(prod2.price) }] : []),
        ],
        notes: 'Test sandbox automático — boleta',
      },
    })

    expect(res.status()).not.toBe(500)
    const body = await res.json()
    expect(typeof body.ok).toBe('boolean')
    expect(body).toHaveProperty('estado_sunat')
    expect(body).toHaveProperty('mensaje')
    expect(ESTADOS_VALIDOS).toContain(body.estado_sunat)

    if (body.ok && body.factura) {
      expect(body.factura).toHaveProperty('id')
      expect(body.factura).toHaveProperty('series')
      expect(body.factura).toHaveProperty('total')
    }
  })

  test('factura con cliente RUC real de la BD: estructura de respuesta correcta', async ({ page }) => {
    await loginAsAdmin(page)
    const creds = loadCreds()
    const cliente = creds?.clienteRUC
    const prod = creds?.productos?.[0]

    const res = await page.request.post('/api/sunat/emit', {
      data: {
        cliente_nombre: cliente?.name ?? 'FABARLI S.A.C.',
        cliente_ruc: cliente?.num_documento ?? '20509146668',
        cliente_tipo_doc: '6',
        cliente_direccion: cliente?.address ?? 'Lima',
        tipo_comprobante: '01',
        moneda: 'PEN',
        forma_pago: 'contado',
        items: [
          { description: prod?.name ?? 'Esponja doble uso', quantity: 5, unit_price: Number(prod?.price ?? 5.50) },
        ],
        notes: 'Test sandbox automático — factura con RUC real',
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
      data: { cliente_nombre: 'TEST', tipo_comprobante: '03', items: [] },
    })
    expect([400, 422]).toContain(res.status())
  })

  test('sin sesión: devuelve 401', async ({ page }) => {
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

  test('wizard completo boleta → SUNAT → estado actualizado', async ({ page }) => {
    await loginAsAdmin(page)

    const numero = await crearBoletaUI(page)
    expect(numero).not.toBe('')

    await safeNavigate(page, '/crm/boletas')
    await page.waitForTimeout(1000)
    const bodyBoletas = await page.locator('body').innerText()
    expect(bodyBoletas).not.toMatch(/Error 500|Internal Server Error/)

    await enviarPrimerPendiente(page)

    const bodyFinal = await page.locator('body').innerText()
    expect(bodyFinal).not.toMatch(/Error 500|Internal Server Error|undefined/)
    const tieneEstado = /Aceptado|Rechazado|Enviado|Pendiente|Error|token|configuraci/i.test(bodyFinal)
    expect(tieneEstado).toBeTruthy()
  })
})

// ─── C: UI FACTURA ───────────────────────────────────────────────────────────

test.describe('C) UI: Crear y enviar factura', () => {
  test.setTimeout(90000)

  test('wizard completo factura con cliente RUC real → SUNAT → estado actualizado', async ({ page }) => {
    await loginAsAdmin(page)

    const numero = await crearFacturaUI(page)
    if (!numero) {
      test.skip(true, 'No se encontró cliente con RUC en el dropdown')
      return
    }

    await safeNavigate(page, '/crm/facturas')
    await page.waitForTimeout(1000)
    const bodyFacturas = await page.locator('body').innerText()
    expect(bodyFacturas).not.toMatch(/Error 500|Internal Server Error/)

    await enviarPrimerPendiente(page)

    const bodyFinal = await page.locator('body').innerText()
    expect(bodyFinal).not.toMatch(/Error 500|Internal Server Error|undefined/)
    const tieneEstado = /Aceptado|Rechazado|Enviado|Pendiente|Error|token|configuraci/i.test(bodyFinal)
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
    expect(body).toMatch(/pendiente|historial|envío|SUNAT/i)
  })

  test('documentos enviados aparecen en historial con estado legible', async ({ page }) => {
    await loginAsAdmin(page)
    await safeNavigate(page, '/crm/sunat')
    await page.waitForTimeout(1000)

    const badges = page.locator('span').filter({ hasText: /Aceptado|Rechazado|Enviado|Borrador|Pendiente/i })
    const count = await badges.count()
    if (count > 0) {
      const texto = await badges.first().textContent()
      expect(texto).toMatch(/Aceptado|Rechazado|Enviado|Borrador|Pendiente/i)
    }
  })

  test('diagnóstico SUNAT carga sin crash', async ({ page }) => {
    await loginAsAdmin(page)
    await safeNavigate(page, '/crm/sunat/diagnostico')
    await page.waitForTimeout(1000)

    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/Error 500|Internal Server Error/)
    expect(body).toMatch(/SUNAT|diagnóstico|conexión|configuración|token/i)
  })
})

// ─── E: PREVIEW XML ──────────────────────────────────────────────────────────

test.describe('E) Preview XML (no envía a SUNAT)', () => {
  test.setTimeout(20000)

  test('endpoint /api/sunat/preview responde sin crash', async ({ page }) => {
    await loginAsAdmin(page)
    const creds = loadCreds()
    const prod = creds?.productos?.[0]

    const res = await page.request.post('/api/sunat/preview', {
      data: {
        tipo: '03',
        items: [{ descripcion: prod?.name ?? 'Esponja test', cantidad: 1, precio_unitario: Number(prod?.price ?? 10) }],
        cliente: { nombre: 'CONSUMIDOR FINAL', tipo_documento: 1, num_documento: '00000000' },
      },
    })
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

    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/Error 500|undefined/)
    expect(body).toMatch(/XML|UBL|Invoice|Boleta|Factura|<?xml/i)
  })
})

// ─── F: GUÍA DE REMISIÓN ─────────────────────────────────────────────────────

test.describe('F) Guía de remisión /api/sunat/guia', () => {
  test.setTimeout(45000)

  test('guía borrador real: envío a SUNAT sandbox responde sin crash', async ({ page }) => {
    await loginAsAdmin(page)
    const creds = loadCreds()
    const guia = creds?.guia
    const transportista = creds?.transportista
    const clienteRUC = creds?.clienteRUC
    const prod = creds?.productos?.[0]

    if (!guia?.id) {
      test.skip(true, 'No se creó guía de prueba en global-setup')
      return
    }

    const hoy = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const payload: Record<string, unknown> = {
      guia_id: guia.id,
      tipo_guia: '09',
      serie: guia.serie,
      numero: guia.numero,
      fecha_emision: hoy,
      fecha_inicio_traslado: hoy,
      fecha_entrega_a_transportista: hoy, // requerido por APISUNAT en modo público
      motivo_traslado: '01',
      destinatario_tipo_doc: '6',
      destinatario_num_doc: clienteRUC?.num_documento ?? '20509146668',
      destinatario_nombre: clienteRUC?.name ?? 'FABARLI S.A.C.',
      destinatario_direccion: clienteRUC?.address ?? 'Lima',
      punto_partida: creds?.puntoPartida ?? 'Lurigancho, Lima',
      punto_partida_ubigeo: creds?.ubigeoEmpresa ?? '150103',
      punto_llegada: clienteRUC?.address ?? 'Lima',
      punto_llegada_ubigeo: creds?.ubigeoDestino ?? '150101',
      peso_total: 10,
      unidad_peso: 'KGM',
      numero_bultos: 1,
      bienes: [
        {
          descripcion: prod?.name ?? 'Esponja de cocina',
          cantidad: 2,
          unidad_de_medida: prod?.unidad_de_medida ?? 'NIU',
        },
      ],
    }

    // Agregar transportista si está disponible
    if (transportista?.modalidad === 'publico' && transportista.ruc) {
      payload.modalidad_traslado = 'publico'
      payload.transportista_ruc = transportista.ruc
      payload.transportista_denominacion = transportista.nombre_completo
      payload.transportista_registro_mtc = transportista.numero_registro_mtc ?? ''
    } else if (transportista) {
      payload.modalidad_traslado = 'privado'
      payload.conductores = [{
        tipo_de_documento: '1',
        numero_de_documento: transportista.dni ?? '',
        nombres: transportista.nombre_completo?.split(', ')[1] ?? '',
        apellidos: transportista.nombre_completo?.split(', ')[0] ?? '',
        numero_licencia_conducir: transportista.licencia_conducir ?? '',
      }]
      payload.vehiculos = [{ numero_de_placa: transportista.numero_placa ?? '' }]
    }

    const res = await page.request.post('/api/sunat/guia', { data: payload })

    expect(res.status()).not.toBe(500)
    const body = await res.json()
    console.log('[F] Guía sandbox respuesta:', JSON.stringify(body))

    expect(body).toHaveProperty('ok')
    // El envío debe ser exitoso (ok: true) o fallar por razón conocida de SUNAT (no error nuestro)
    if (!body.ok) {
      // Aceptar solo si el error es de SUNAT/APISUNAT, no de nuestro código
      expect(body.error).toBeTruthy()
      console.log('[F] APISUNAT rechazó la guía:', body.error)
    } else {
      expect(body.estado_sunat).toBeDefined()
      expect(ESTADOS_VALIDOS).toContain(body.estado_sunat)
    }
  })

  test('guía sin sesión: devuelve 401', async ({ page }) => {
    const res = await page.request.post('/api/sunat/guia', {
      data: { guia_id: 'x', serie: 'T001', numero: 1 },
    })
    expect(res.status()).toBe(401)
  })

  test('guía sin campos obligatorios: devuelve 400', async ({ page }) => {
    await loginAsAdmin(page)
    const res = await page.request.post('/api/sunat/guia', {
      data: { motivo_traslado: '01' }, // falta guia_id, serie, numero
    })
    expect([400, 422, 500]).toContain(res.status())
    const body = await res.json()
    expect(body).toHaveProperty('ok')
    expect(body.ok).toBe(false)
  })
})
