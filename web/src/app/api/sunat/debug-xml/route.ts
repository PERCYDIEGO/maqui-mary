import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'
import { generateInvoiceXML } from '@/lib/sunat/xml-builder'
import { extractFromPfx, signXml } from '@/lib/sunat/xml-signer'

/**
 * GET /api/sunat/debug-xml
 * Genera y firma un XML de prueba, lo retorna sin enviarlo a SUNAT.
 * Solo para debugging — REMOVER antes de producción real.
 */
export async function GET(req: NextRequest) {
  try {
    const { data: config } = await supabase.from('sunat_config').select('*').eq('id', 1).single()

    if (!config?.cert_base64 || !config?.cert_password) {
      return NextResponse.json({ error: 'No hay certificado configurado en sunat_config' }, { status: 400 })
    }

    const emisorConfig = {
      environment: config.environment || 'demo',
      ruc: config.ruc || '20606218801',
      razonSocial: config.razon_social || 'TEST EMPRESA',
      nombreComercial: config.nombre_comercial || '',
      address: config.address || 'Av. Test 123',
      urbanizacion: '',
      provincia: config.provincia || 'LIMA',
      departamento: config.departamento || 'LIMA',
      distrito: config.distrito || 'LIMA',
      codigoPais: 'PE',
      ubigeo: config.ubigeo || '150101',
      solUser: config.sol_user || '',
      solPassword: config.sol_password || '',
      certPath: '',
      certPassword: '',
      seriesFactura: 'F001',
      seriesBoleta: 'B001',
      seriesNC: 'FC01',
      seriesND: 'FD01',
    }

    const invoiceXml = generateInvoiceXML({
      tipoComprobante: '03',
      serie: 'B001',
      numero: 99999,
      fechaEmision: '2026-05-18',
      horaEmision: '10:00:00',
      cliente: { tipoDoc: '1' as any, numDoc: '00000000', nombre: 'CLIENTES VARIOS', direccion: '' },
      productos: [{
        codigo: 'TEST01',
        descripcion: 'PRODUCTO DE PRUEBA DEBUG',
        cantidad: 1,
        precioUnitario: 10.00,
        precioConIgv: 11.80,
        total: 10.00,
      }],
      subtotal: 10.00,
      igv: 1.80,
      total: 11.80,
      totalLetras: 'SON ONCE CON 80/100 SOLES',
      nota: '',
      moneda: 'PEN',
      emisor: emisorConfig,
    })

    // Firmar
    const certInfo = extractFromPfx(config.cert_base64, config.cert_password)
    const signedXml = signXml(invoiceXml, certInfo)

    // Retornar como JSON para inspección fácil
    return NextResponse.json({
      unsigned_start: invoiceXml.slice(0, 600),
      signed_start: signedXml.slice(0, 800),
      signed_length: signedXml.length,
      has_xml_declaration: signedXml.startsWith('<?xml'),
      has_ublversion: signedXml.includes('<cbc:UBLVersionID>2.0</cbc:UBLVersionID>'),
      has_signature: signedXml.includes('<ds:Signature'),
      has_extension_content: signedXml.includes('<ext:ExtensionContent>'),
      note_position: signedXml.indexOf('<cbc:Note>'),
      ublversion_position: signedXml.indexOf('<cbc:UBLVersionID>'),
      full_signed_xml: signedXml,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack?.slice(0, 500) }, { status: 500 })
  }
}
