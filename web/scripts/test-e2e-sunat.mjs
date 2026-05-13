// Script de prueba end-to-end para emisión electrónica
// Prueba: Factura con RUC, Boleta con DNI, Boleta sin identificar

const BASE_URL = 'https://maquimary.vercel.app'
// const BASE_URL = 'http://localhost:3000'

const CLIENTE_RUC = {
  id: 2,
  name: 'SUPERMERCADOS LA ECONOMICA E.I.R.L.',
  num_documento: '20567890123',
  tipo_documento: '6',
  address: 'Jr. de la Unión 456, Centro de Lima',
}

const CLIENTE_DNI = {
  id: 3,
  name: 'JUAN CARLOS PEREZ GARCIA',
  num_documento: '45678912',
  tipo_documento: '1',
  address: 'Calle Los Pinos 789, Miraflores',
}

const ITEMS = [
  { producto_id: 1, codigo: 'ESP-AMA-001', description: 'Esponja Multiuso Amarilla', quantity: 10, unit_price: 1.50 },
  { producto_id: 9, codigo: 'ESP-ACF-001', description: 'Esponja de Acero Fino', quantity: 5, unit_price: 2.00 },
]

async function testPreview(label, payload) {
  console.log(`\n🧪 ${label}`)
  try {
    const res = await fetch(`${BASE_URL}/api/sunat/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (data.ok) {
      console.log(`   ✅ Preview OK`)
      console.log(`   📄 Serie-Numero: ${data.preview.serie}-${String(data.preview.numero).padStart(4, '0')}`)
      console.log(`   👤 Cliente: ${data.preview.cliente_nombre || 'PÚBLICO EN GENERAL'}`)
      console.log(`   📋 TipoDoc: ${data.preview.cliente_tipo_doc}`)
      console.log(`   💰 Total: S/ ${data.preview.total}`)
      console.log(`   🔐 Firma: ${data.preview.firma_digest ? 'OK' : 'FALTA'}`)
      console.log(`   📦 ZIP: ${data.preview.filename}`)
      // Validaciones
      const checks = data.preview.checks || {}
      const allOk = Object.values(checks).every(v => v === true || typeof v === 'string')
      if (allOk) console.log(`   ✔️  Checks estructurales: PASS`)
      else console.log(`   ⚠️  Checks:`, checks)
      return data.preview
    } else {
      console.log(`   ❌ Error:`, data.error)
      return null
    }
  } catch (e) {
    console.log(`   ❌ Excepción:`, e.message)
    return null
  }
}

async function main() {
  console.log('🚀 INICIANDO PRUEBAS END-TO-END MAQUI MARY SUNAT')
  console.log('URL:', BASE_URL)

  // Prueba 1: Factura con RUC
  await testPreview('FACTURA con RUC', {
    cliente_id: CLIENTE_RUC.id,
    cliente_nombre: CLIENTE_RUC.name,
    cliente_ruc: CLIENTE_RUC.num_documento,
    cliente_tipo_doc: CLIENTE_RUC.tipo_documento,
    cliente_direccion: CLIENTE_RUC.address,
    tipo_comprobante: '01',
    forma_pago: 'contado',
    moneda: 'PEN',
    items: ITEMS,
    notes: 'Prueba factura con RUC',
  })

  // Prueba 2: Boleta con DNI
  await testPreview('BOLETA con DNI', {
    cliente_id: CLIENTE_DNI.id,
    cliente_nombre: CLIENTE_DNI.name,
    cliente_ruc: CLIENTE_DNI.num_documento,
    cliente_tipo_doc: CLIENTE_DNI.tipo_documento,
    cliente_direccion: CLIENTE_DNI.address,
    tipo_comprobante: '03',
    forma_pago: 'contado',
    moneda: 'PEN',
    items: ITEMS,
    notes: 'Prueba boleta con DNI',
  })

  // Prueba 3: Boleta sin identificar
  await testPreview('BOLETA sin identificar', {
    cliente_id: null,
    cliente_nombre: '',
    cliente_ruc: '',
    cliente_tipo_doc: '',
    cliente_direccion: '',
    tipo_comprobante: '03',
    sin_identificar: true,
    forma_pago: 'contado',
    moneda: 'PEN',
    items: ITEMS,
    notes: 'Prueba boleta sin identificar',
  })

  // Prueba 4: Factura con USD y tipo de cambio
  await testPreview('FACTURA en USD con TC', {
    cliente_id: CLIENTE_RUC.id,
    cliente_nombre: CLIENTE_RUC.name,
    cliente_ruc: CLIENTE_RUC.num_documento,
    cliente_tipo_doc: CLIENTE_RUC.tipo_documento,
    cliente_direccion: CLIENTE_RUC.address,
    tipo_comprobante: '01',
    forma_pago: 'credito',
    moneda: 'USD',
    tipo_cambio: '3.750',
    guia_remision: 'T001-00000001',
    orden_compra: 'OC-2025-001',
    items: ITEMS,
    notes: 'Prueba factura en dólares',
  })

  // Prueba 5: Boleta con item único (caso borde)
  await testPreview('BOLETA item único', {
    cliente_id: CLIENTE_DNI.id,
    cliente_nombre: CLIENTE_DNI.name,
    cliente_ruc: CLIENTE_DNI.num_documento,
    cliente_tipo_doc: CLIENTE_DNI.tipo_documento,
    cliente_direccion: CLIENTE_DNI.address,
    tipo_comprobante: '03',
    forma_pago: 'contado',
    moneda: 'PEN',
    items: [{ producto_id: 1, codigo: 'ESP-AMA-001', description: 'Esponja Multiuso Amarilla', quantity: 1, unit_price: 1.50 }],
    notes: '',
  })

  console.log('\n✅ PRUEBAS COMPLETADAS')
}

main().catch(e => { console.error(e); process.exit(1) })
