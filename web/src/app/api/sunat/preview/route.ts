import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateInvoiceXML, getSunatFilename } from '@/lib/sunat/xml-builder'
import { extractFromPfx, signXml } from '@/lib/sunat/xml-signer'
import { zipXml } from '@/lib/sunat/soap-client'
import QRCode from 'qrcode'

/**
 * Genera XML, firma y ZIP para previsualización / validación local.
 * NO envía a SUNAT. Devuelve el XML original, firmado y ZIP en base64.
 * POST /api/sunat/preview
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      cliente_id,
      cliente_nombre,
      cliente_ruc,
      cliente_tipo_doc,
      cliente_direccion,
      tipo_comprobante = '01',
      sin_identificar = false,
      forma_pago = 'contado',
      moneda = 'PEN',
      tipo_cambio = '',
      guia_remision = '',
      orden_compra = '',
      items,
      notes = '',
    } = body

    const isFactura = tipo_comprobante === '01'
    const isBoletaSinId = !isFactura && sin_identificar

    if ((!cliente_nombre && !isBoletaSinId) || !items || items.length === 0) {
      return NextResponse.json({ ok: false, error: 'Faltan datos: cliente o items' }, { status: 400 })
    }

    // ─── Config SUNAT ───
    const { data: configRows, error: configError } = await supabase
      .from('sunat_config')
      .select('*')
      .eq('id', 1)
      .single()

    if (configError || !configRows) {
      return NextResponse.json({ ok: false, error: 'No hay configuración SUNAT' }, { status: 400 })
    }

    const config = configRows as any

    const serie = isFactura ? (config.series_factura || 'F001') : (config.series_boleta || 'B001')
    const numero = isFactura ? (config.next_number_factura || 1) : (config.next_number_boleta || 1)

    const subtotal = items.reduce((s: number, it: any) => s + (it.quantity * it.unit_price), 0)
    const igv = subtotal * 0.18
    const total = subtotal + igv

    const now = new Date()
    const peruNow = new Date(now.getTime() - 5 * 60 * 60 * 1000)
    const fechaEmision = peruNow.toISOString().slice(0, 10)  // YYYY-MM-DD en hora Perú
    const horaEmision  = peruNow.toISOString().slice(11, 19) // HH:MM:SS en hora Perú

    // ─── Validar certificado ───
    const hasCert = config.cert_base64?.trim() && config.cert_password?.trim()
    if (!hasCert) {
      return NextResponse.json({ ok: false, error: 'No hay certificado digital configurado. Súbelo en Configuración > Certificado Digital.' }, { status: 400 })
    }

    // ─── Extraer certificado ───
    let certInfo
    try {
      certInfo = extractFromPfx(config.cert_base64, config.cert_password)
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: 'Error extrayendo certificado: ' + e.message }, { status: 400 })
    }

    // ─── Generar XML UBL 2.1 ───
    // Catálogo SUNAT 06: 0=SinRUC, 1=DNI, 6=RUC, 7=Pasaporte
    const tipoDocCliente = isFactura ? '6' : (isBoletaSinId ? '0' : (cliente_tipo_doc || '1'))
    const emisorConfig = {
      environment: config.environment || 'demo',
      ruc: config.ruc || '',
      razonSocial: config.razon_social || '',
      nombreComercial: config.nombre_comercial || '',
      address: config.address || '',
      urbanizacion: config.urbanizacion || '',
      provincia: config.provincia || '',
      departamento: config.departamento || '',
      distrito: config.distrito || '',
      codigoPais: 'PE',
      ubigeo: config.ubigeo || '',
      solUser: config.sol_user || '',
      solPassword: '',
      certPath: '',
      certPassword: '',
      seriesFactura: config.series_factura || 'F001',
      seriesBoleta: config.series_boleta || 'B001',
      seriesNC: config.series_nc || 'FC01',
      seriesND: config.series_nd || 'FD01',
    }

    const invoiceXml = generateInvoiceXML({
      tipoComprobante: tipo_comprobante,
      serie,
      numero,
      fechaEmision,
      horaEmision,
      cliente: {
        tipoDoc: tipoDocCliente as any,
        numDoc: isBoletaSinId ? '00000000' : (cliente_ruc || '-'),
        nombre: isBoletaSinId ? 'CLIENTES VARIOS' : (cliente_nombre || 'CLIENTES VARIOS'),
        direccion: isBoletaSinId ? '' : (cliente_direccion || ''),
      },
      productos: items.map((it: any) => ({
        codigo: it.codigo || '',
        descripcion: it.description,
        cantidad: it.quantity,
        precioUnitario: it.unit_price,
        precioConIgv: it.unit_price,
        total: it.quantity * it.unit_price,
      })),
      subtotal,
      igv,
      total,
      nota: notes,
      emisor: emisorConfig,
    })

    // ─── Firmar XML ───
    let signedXml
    try {
      signedXml = signXml(invoiceXml, certInfo)
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: 'Error firmando XML: ' + e.message }, { status: 500 })
    }

    // ─── Comprimir ZIP ───
    const filename = getSunatFilename(config.ruc || '', tipo_comprobante, serie, numero)
    const zipBase64 = await zipXml(filename, signedXml)

    // ─── Validaciones de estructura ───
    const checks = {
      hasXmlDeclaration: signedXml.includes('<?xml'),
      hasInvoiceRoot: signedXml.includes('<Invoice'),
      hasSignature: signedXml.includes('ds:Signature') || signedXml.includes('Signature'),
      hasExtensionContent: signedXml.includes('ext:ExtensionContent>'),
      hasKeyInfo: signedXml.includes('X509Certificate'),
      rucEmisorMatch: signedXml.includes(config.ruc || ''),
      serieNumero: `${serie}-${String(numero).padStart(4, '0')}`,
    }

    // ─── Extraer hash / digest de la firma si existe ───
    let firmaDigest = ''
    const digestMatch = signedXml.match(/<(ds:)?DigestValue>([^<]+)<\/\1?DigestValue>/)
    if (digestMatch) firmaDigest = digestMatch[2].slice(0, 32) + '...'

    // ─── Generar QR SUNAT Perú ───
    // El QR apunta a la URL de consulta pública de Maqui Mary
    // Así los clientes pueden escanear y ver los datos del comprobante
    const qrUrl = `https://maquimary.vercel.app/crm/facturas/consulta?ruc=${encodeURIComponent(config.ruc || '')}&tipo=${tipo_comprobante}&serie=${serie}&numero=${String(numero).padStart(4, '0')}&fecha=${fechaEmision}&total=${total.toFixed(2)}&moneda=${moneda}&emisor=${encodeURIComponent(config.razon_social || '')}&cliente=${encodeURIComponent(cliente_nombre)}&hash=${encodeURIComponent(firmaDigest || 'preview')}`

    let qrBase64 = ''
    try {
      qrBase64 = await QRCode.toDataURL(qrUrl, { width: 300, margin: 2, errorCorrectionLevel: 'M' })
    } catch (qrErr: any) {
      console.error('Error generando QR:', qrErr.message)
    }

    // También generamos el QR en formato pipe SUNAT (estándar tributario) para el XML/impresión
    const qrDataSunat = [
      config.ruc || '',
      tipo_comprobante,
      serie,
      String(numero).padStart(8, '0'),
      igv.toFixed(2),
      total.toFixed(2),
      fechaEmision,
      tipoDocCliente,
      cliente_ruc || '0',
      '',
    ].join('|')

    return NextResponse.json({
      ok: true,
      preview: {
        xmlOriginal: invoiceXml,
        xmlFirmado: signedXml,
        zipBase64,
        filename: filename + '.zip',
        serie,
        numero,
        tipo_comprobante,
        sin_identificar: isBoletaSinId,
        subtotal,
        igv,
        total,
        cliente_nombre: isBoletaSinId ? '' : cliente_nombre,
        cliente_ruc: isBoletaSinId ? '' : cliente_ruc,
        cliente_direccion: isBoletaSinId ? '' : (cliente_direccion || ''),
        cliente_tipo_doc: tipoDocCliente,
        items,
        emisor: {
          ruc: config.ruc || '',
          razonSocial: config.razon_social || '',
          nombreComercial: config.nombre_comercial || '',
          address: config.address || '',
          distrito: config.distrito || '',
          provincia: config.provincia || '',
          departamento: config.departamento || '',
          ubigeo: config.ubigeo || '',
        },
        moneda,
        tipo_cambio,
        forma_pago,
        guia_remision,
        orden_compra,
        descuento_global: 0,
        otros_cargos: 0,
        hash: firmaDigest,
        firma_digest: firmaDigest,
        qr_base64: qrBase64,
        qr_url: qrUrl,
        qr_data_sunat: qrDataSunat,
        checks,
      },
      mensaje: 'XML generado y firmado correctamente. Descarga el ZIP para validar con herramientas externas, o envía a SUNAT desde el CRM.',
    })

  } catch (e: any) {
    console.error('Error en /api/sunat/preview:', e)
    return NextResponse.json({ ok: false, error: e.message || 'Error interno' }, { status: 500 })
  }
}
