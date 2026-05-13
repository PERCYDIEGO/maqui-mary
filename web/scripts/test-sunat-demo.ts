import pg from 'pg'
import { generateInvoiceXML, getSunatFilename } from '../src/lib/sunat/xml-builder'
import { extractFromPfx, signXml } from '../src/lib/sunat/xml-signer'
import { zipXml, sendToSunat } from '../src/lib/sunat/soap-client'

const { Client } = pg
const CONN = 'postgresql://postgres:1rkddYkZ1B5nNZS0@db.ofemdngaslpdexsqfcbb.supabase.co:5432/postgres'

async function main() {
  const client = new Client({ connectionString: CONN })
  await client.connect()

  console.log('═══════════════════════════════════════════════════════════')
  console.log('   EMISION DE PRUEBA SUNAT - AMBIENTE DEMO (BETA)')
  console.log('═══════════════════════════════════════════════════════════\n')

  // 1. CARGAR CONFIG
  const { rows } = await client.query('SELECT * FROM sunat_config WHERE id = 1')
  const cfg = rows[0]

  console.log('CONFIGURACION ACTUAL:')
  console.log('  Environment :', cfg.environment)
  console.log('  RUC Emisor  :', cfg.ruc)
  console.log('  Razón Social:', cfg.razon_social)
  console.log('  SOL User    :', cfg.sol_user)
  console.log('  Endpoint    :', cfg.environment === 'produccion' ? 'PRODUCCION (REAL)' : 'BETA/PRUEBAS (DEMO)')
  console.log()

  if (cfg.environment === 'produccion') {
    console.error('❌ ERROR DE SEGURIDAD: El ambiente es PRODUCCION. Abortando.')
    console.error('   Cambia environment a "demo" en sunat_config para pruebas.')
    await client.end()
    process.exit(1)
  }

  // 2. DATOS DE PRUEBA (no reales)
  const FACTURA_PRUEBA = {
    tipoComprobante: '01' as any,
    serie: cfg.series_factura || 'F001',
    numero: 9999, // número alto de prueba
    fechaEmision: new Date().toISOString().slice(0, 10),
    horaEmision: new Date().toTimeString().slice(0, 8),
    cliente: {
      tipoDoc: '6' as any,
      numDoc: '20000000001', // RUC de prueba estándar SUNAT
      nombre: 'CLIENTE DE PRUEBA SAC',
      direccion: 'Av. Ficticia 123, Lima',
    },
    productos: [
      {
        codigo: 'TEST-001',
        descripcion: 'Producto de prueba - NO VALIDO',
        cantidad: 1,
        precioUnitario: 10.00,
        precioConIgv: 10.00,
        total: 10.00,
      },
    ],
    subtotal: 8.47,
    igv: 1.53,
    total: 10.00,
    emisor: {
      environment: cfg.environment || 'demo',
      ruc: cfg.ruc,
      razonSocial: cfg.razon_social,
      nombreComercial: cfg.nombre_comercial || 'MAQUI MARY',
      address: cfg.address || '',
      urbanizacion: cfg.urbanizacion || '',
      provincia: cfg.provincia || 'LIMA',
      departamento: cfg.departamento || 'LIMA',
      distrito: cfg.distrito || 'ATE',
      codigoPais: 'PE',
      ubigeo: cfg.ubigeo || '150103',
      solUser: cfg.sol_user || '',
      solPassword: '',
      certPath: '',
      certPassword: '',
      seriesFactura: cfg.series_factura || 'F001',
      seriesBoleta: cfg.series_boleta || 'B001',
      seriesNC: cfg.series_nc || 'FC01',
      seriesND: cfg.series_nd || 'FD01',
    },
  }

  console.log('DATOS DE LA FACTURA DE PRUEBA:')
  console.log('  Tipo        : Factura (01)')
  console.log('  Serie-Numero:', `${FACTURA_PRUEBA.serie}-${String(FACTURA_PRUEBA.numero).padStart(4, '0')}`)
  console.log('  Cliente     :', FACTURA_PRUEBA.cliente.nombre)
  console.log('  Cliente RUC :', FACTURA_PRUEBA.cliente.numDoc, '(RUC DE PRUEBA)')
  console.log('  Total       : S/', FACTURA_PRUEBA.total.toFixed(2))
  console.log()

  // 3. EXTRAER CERTIFICADO
  console.log('🔐 Extrayendo certificado .pfx...')
  const certInfo = extractFromPfx(cfg.cert_base64, cfg.cert_password)
  console.log('✅ Certificado extraído (no se envió nada aún).\n')

  // 4. GENERAR XML
  console.log('📄 Generando XML UBL 2.1...')
  const xml = generateInvoiceXML(FACTURA_PRUEBA)
  console.log('✅ XML generado. Length:', xml.length, 'chars')
  console.log('\n--- PRIMEROS 800 CARACTERES DEL XML ---')
  console.log(xml.substring(0, 800))
  console.log('... (truncado)')
  console.log('-----------------------------------------\n')

  // 5. FIRMAR XML
  console.log('✍️  Firmando XML con XAdES-EPES...')
  const signedXml = signXml(xml, certInfo)
  console.log('✅ XML firmado. Length:', signedXml.length, 'chars')
  const hasSignature = signedXml.includes('ds:Signature')
  console.log('   Contiene firma digital:', hasSignature ? 'SÍ ✅' : 'NO ❌')
  console.log()

  // 6. COMPRIMIR ZIP
  console.log('🗜️  Comprimiendo XML en ZIP...')
  const filename = getSunatFilename(cfg.ruc, '01', FACTURA_PRUEBA.serie, FACTURA_PRUEBA.numero)
  const zipBase64 = await zipXml(filename, signedXml)
  console.log('✅ ZIP generado. Base64 length:', zipBase64.length, 'chars\n')

  // 7. ENVIAR A SUNAT DEMO
  const ENDPOINT_DEMO = 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService'
  console.log('🌐 ENVÍO A SUNAT (AMBIENTE DEMO):')
  console.log('   Endpoint:', ENDPOINT_DEMO)
  console.log('   Archivo :', filename + '.zip')
  console.log('   SOL User:', cfg.sol_user)
  console.log('   Esperando respuesta...\n')

  const result = await sendToSunat(filename, zipBase64, cfg.sol_user, cfg.sol_password, ENDPOINT_DEMO)

  console.log('═══════════════════════════════════════════════════════════')
  console.log('   RESPUESTA DE SUNAT (DEMO)')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('Success      :', result.success ? 'SÍ ✅' : 'NO ❌')
  console.log('Response Code:', result.responseCode || 'N/A')
  console.log('Description  :', result.description || 'N/A')
  if (result.error) console.log('Error        :', result.error)
  if (result.cdrXml) {
    console.log('\n--- CDR XML (primeros 600 chars) ---')
    console.log(result.cdrXml.substring(0, 600))
    console.log('... (truncado)')
  }
  console.log('═══════════════════════════════════════════════════════════\n')

  console.log('NOTA: Esta factura de prueba NO se guardó en la base de datos.')
  console.log('      Solo fue una prueba de conectividad y firma con SUNAT demo.')

  await client.end()
}

main().catch((e: any) => {
  console.error('\n❌ Error en prueba:', e.message)
  if (e.stack) console.error(e.stack)
  process.exit(1)
})
