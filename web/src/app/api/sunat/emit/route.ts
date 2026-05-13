import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateInvoiceXML, getSunatFilename } from '@/lib/sunat/xml-builder'
import { extractFromPfx, signXml } from '@/lib/sunat/xml-signer'
import { zipXml, sendToSunat } from '@/lib/sunat/soap-client'

/**
 * Emite una factura o boleta electrónica.
 * Detecta automáticamente si usar certificado digital (SUNAT directo)
 * o token OSE (Nubefact).
 * POST /api/sunat/emit
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
      items,
      notes = '',
      origen = 'crm',
      forma_pago = 'contado',
      moneda = 'PEN',
      tipo_cambio = '',
      guia_remision = '',
      orden_compra = '',
    } = body

    const isFactura = tipo_comprobante === '01'
    const isBoletaSinId = !isFactura && sin_identificar

    // ─── Validaciones ───
    if ((!cliente_nombre && !isBoletaSinId) || !items || items.length === 0) {
      return NextResponse.json({ ok: false, error: 'Faltan datos: cliente o items' }, { status: 400 })
    }

    // ─── Obtener configuración SUNAT desde Supabase ───
    const { data: configRows, error: configError } = await supabase
      .from('sunat_config')
      .select('*')
      .eq('id', 1)
      .single()

    if (configError || !configRows) {
      return NextResponse.json({ ok: false, error: 'No hay configuración SUNAT' }, { status: 400 })
    }

    const config = configRows as any

    // ─── Determinar modo de emisión ───
    const hasCert = config.cert_base64?.trim() && config.cert_password?.trim() && config.sol_user?.trim() && config.sol_password?.trim()
    const hasOse = config.ose_token?.trim() && config.ose_endpoint?.trim()
    const modo = hasCert ? 'sunat_directo' : hasOse ? 'ose' : 'ninguno'

    // ─── Determinar serie y número ───
    const serie = isFactura ? (config.series_factura || 'F001') : (config.series_boleta || 'B001')
    const nextField = isFactura ? 'next_number_factura' : 'next_number_boleta'
    const numero = isFactura ? (config.next_number_factura || 1) : (config.next_number_boleta || 1)

    // ─── Calcular totales ───
    const subtotal = items.reduce((s: number, it: any) => s + (it.quantity * it.unit_price), 0)
    const igv = subtotal * 0.18
    const total = subtotal + igv

    const now = new Date()
    const fechaEmision = now.toISOString().slice(0, 10)
    const horaEmision = now.toTimeString().slice(0, 8)

    // ─── Variables de resultado ───
    let sunatStatus = 'PENDIENTE'
    let sunatError = ''
    let cdrXml = ''
    let cdrBase64 = ''
    let pdfUrl = ''
    let xmlUrl = ''
    let ticketSunat = ''
    let cdrCodigo = ''
    let cdrDescripcion = ''
    let hash = ''
    let firmaDigest = ''

    // ═══════════════════════════════════════════
    // MODO 1: EMISIÓN DIRECTA SUNAT (certificado digital)
    // ═══════════════════════════════════════════
    if (modo === 'sunat_directo') {
      try {
        // 1. Generar XML UBL 2.1 con datos reales del emisor desde Supabase
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
          solPassword: config.sol_password || '',
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
            numDoc: isBoletaSinId ? '-' : (cliente_ruc || '-'),
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

        // 2. Extraer certificado del .pfx
        const certInfo = extractFromPfx(config.cert_base64, config.cert_password)

        // 3. Firmar XML
        const signedXml = signXml(invoiceXml, certInfo)

        // 4. Comprimir en ZIP
        const filename = getSunatFilename(config.ruc || '', tipo_comprobante, serie, numero)
        const zipBase64 = await zipXml(filename, signedXml)

        // 5. Enviar a SUNAT por SOAP (endpoint según environment configurado en Supabase)
        const endpoint = config.environment === 'produccion'
          ? 'https://e-gw.sunat.gob.pe/ol-ti-itcpfegem/billService'
          : 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService'

        const sunatResult = await sendToSunat(
          filename,
          zipBase64,
          config.sol_user,
          config.sol_password,
          endpoint
        )

        if (sunatResult.success) {
          sunatStatus = 'ACEPTADO'
          cdrXml = sunatResult.cdrXml || ''
          cdrBase64 = sunatResult.cdrBase64 || ''
          ticketSunat = sunatResult.responseCode || '0'
          cdrCodigo = sunatResult.responseCode || ''
          cdrDescripcion = sunatResult.description || ''
        } else {
          sunatStatus = sunatResult.responseCode ? 'RECHAZADO' : 'ERROR'
          sunatError = sunatResult.error || 'Error en envío a SUNAT'
          cdrCodigo = sunatResult.responseCode || ''
          cdrDescripcion = sunatResult.description || ''
        }
      } catch (e: any) {
        sunatStatus = 'ERROR'
        sunatError = `Error en emisión directa: ${e.message}`
      }
    }

    // ═══════════════════════════════════════════
    // MODO 2: EMISIÓN VÍA OSE (Nubefact)
    // ═══════════════════════════════════════════
    else if (modo === 'ose') {
      try {
        const oseToken = config.ose_token.trim()
        const oseUrl = (config.ose_url || 'https://api.nubefact.com/api/v1/').trim()
        const oseEndpoint = config.ose_endpoint?.trim() || ''

        const issueDate = now.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')

        const oseItems = items.map((it: any) => {
          const unitValue = it.unit_price / 1.18
          const itemSubtotal = unitValue * it.quantity
          const itemIgv = itemSubtotal * 0.18
          return {
            unidad_de_medida: 'NIU',
            codigo: it.codigo || '',
            descripcion: it.description,
            cantidad: it.quantity,
            valor_unitario: parseFloat(unitValue.toFixed(4)),
            precio_unitario: parseFloat(it.unit_price.toFixed(2)),
            descuento: '',
            subtotal: parseFloat(itemSubtotal.toFixed(2)),
            tipo_de_igv: 1,
            igv: parseFloat(itemIgv.toFixed(2)),
            total: parseFloat((it.quantity * it.unit_price).toFixed(2)),
            anticipo_regularizacion: '',
            anticipo_documento_serie: '',
            anticipo_documento_numero: ''
          }
        })

        const oseRequest = {
          operacion: 'generar_comprobante',
          tipo_de_comprobante: isFactura ? 1 : 2,
          serie,
          numero,
          sunat_transaction: 1,
          cliente_tipo_de_documento: isFactura ? '6' : '1',
          cliente_numero_de_documento: (cliente_ruc || '').toString(),
          cliente_denominacion: cliente_nombre,
          cliente_direccion: (cliente_direccion || '').toString(),
          cliente_email: '',
          cliente_telefono: '',
          fecha_de_emision: issueDate,
          fecha_de_vencimiento: '',
          moneda: 1,
          tipo_de_cambio: '',
          porcentaje_de_igv: 18.0,
          descuento_global: '',
          total_descuento: '',
          total_anticipo: '',
          total_gravada: parseFloat(subtotal.toFixed(2)),
          total_inafecta: '',
          total_exonerada: '',
          total_igv: parseFloat(igv.toFixed(2)),
          total_gratuita: '',
          total_otros_cargos: '',
          total: parseFloat(total.toFixed(2)),
          percepcion_tipo: '',
          percepcion_base_imponible: '',
          total_percepcion: '',
          total_incluido_percepcion: '',
          detraccion: false,
          observaciones: notes,
          documento_que_se_modifica_tipo: '',
          documento_que_se_modifica_serie: '',
          documento_que_se_modifica_numero: '',
          enviar_automaticamente_a_la_sunat: true,
          enviar_automaticamente_al_cliente: false,
          codigo_unico: '',
          condiciones_de_pago: '',
          medio_de_pago: '',
          placa_vehiculo: '',
          orden_compra_servicio: '',
          tabla_personalizada_codigo: '',
          formato_de_pdf: '',
          items: oseItems
        }

        const cleanEndpoint = oseEndpoint.startsWith('/') ? oseEndpoint.slice(1) : oseEndpoint
        const url = `${oseUrl}${cleanEndpoint}`.replace(/\/+/g, '/').replace(':/', '://')

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': oseToken },
          body: JSON.stringify(oseRequest),
        })

        const resBody = await res.text()
        let parsed: any = null
        try { parsed = JSON.parse(resBody) } catch { /* no es JSON */ }

        if (res.ok && parsed) {
          const aceptada = parsed.aceptada_por_sunat === true
          sunatStatus = aceptada ? 'ACEPTADO' : (parsed.enlace ? 'ENVIADO' : 'ERROR')
          sunatError = parsed.sunat_description || parsed.errors || ''
          ticketSunat = parsed.numero?.toString() || ''
          pdfUrl = parsed.enlace_del_pdf || parsed.enlace || ''
          xmlUrl = parsed.enlace_del_xml || ''
          cdrXml = parsed.enlace_del_cdr || ''
          cdrCodigo = parsed.sunat_responsecode?.toString() || ''
          cdrDescripcion = parsed.sunat_description || ''
        } else {
          sunatStatus = 'ERROR'
          sunatError = resBody || `HTTP ${res.status}`
        }
      } catch (e: any) {
        sunatStatus = 'ERROR'
        sunatError = e.message || 'Error de red al OSE'
      }
    }

    // ═══════════════════════════════════════════
    // MODO 3: SIN CONFIGURACIÓN
    // ═══════════════════════════════════════════
    else {
      sunatStatus = 'PENDIENTE'
      sunatError = 'No hay certificado digital ni token OSE configurado. Ve a Configuración > SUNAT.'
    }

    // ─── Guardar factura en Supabase ───
    // Usamos SOLO columnas que existen en la BD actual
    const facturaData: any = {
      series: serie,
      number: numero,
      cliente_id: isBoletaSinId ? null : (cliente_id || null),
      cliente_nombre: isBoletaSinId ? 'CLIENTES VARIOS' : cliente_nombre,
      cliente_ruc: isBoletaSinId ? '' : (cliente_ruc || ''),
      cliente_direccion: isBoletaSinId ? '' : (cliente_direccion || ''),
      tipo_comprobante,
      origen,
      moneda,
      subtotal,
      igv,
      total,
      notes,
      estado_sunat: sunatStatus,
      sunat_response: sunatError || 'OK',
      ticket_sunat: ticketSunat,
      date_millis: now.getTime(),
    }

    const { data: facturaInsert, error: facturaError } = await supabase
      .from('facturas')
      .insert(facturaData)
      .select()
      .single()

    if (facturaError) {
      return NextResponse.json({ ok: false, error: 'Error guardando factura: ' + facturaError.message }, { status: 500 })
    }

    // ─── Guardar items ───
    const facturaId = facturaInsert.id
    const itemsToInsert = items.map((it: any) => ({
      factura_id: facturaId,
      producto_id: it.producto_id || null,
      description: it.description,
      quantity: it.quantity,
      unit_price: it.unit_price,
      total: it.quantity * it.unit_price,
    }))

    const { error: itemsError } = await supabase.from('factura_items').insert(itemsToInsert)
    if (itemsError) console.error('Error insertando items:', itemsError)

    // ─── Descontar stock automáticamente ───
    for (const it of items) {
      if (it.producto_id) {
        // Registrar salida en movimientos_stock
        await supabase.from('movimientos_stock').insert({
          producto_id: it.producto_id,
          tipo: 'salida',
          cantidad: it.quantity,
          motivo: `Venta ${tipo_comprobante === '01' ? 'Factura' : 'Boleta'} ${serie}-${String(numero).padStart(4, '0')}`,
          factura_id: facturaId,
        })

        // Descontar stock del producto (directo, no RPC)
        const { data: prodData } = await supabase
          .from('productos')
          .select('stock')
          .eq('id', it.producto_id)
          .single()

        const stockActual = (prodData?.stock || 0)
        const nuevoStock = Math.max(0, stockActual - it.quantity)

        await supabase
          .from('productos')
          .update({ stock: nuevoStock })
          .eq('id', it.producto_id)
      }
    }

    // ─── Incrementar siguiente número ───
    await supabase.from('sunat_config').update({
      [nextField]: numero + 1,
      updated_at: now.toISOString(),
    }).eq('id', 1)

    // ─── Mensaje según modo ───
    let mensaje = ''
    if (modo === 'sunat_directo') {
      mensaje = sunatStatus === 'ACEPTADO'
        ? 'Comprobante aceptado por SUNAT (emisión directa con certificado digital)'
        : sunatStatus === 'RECHAZADO'
        ? 'Comprobante rechazado por SUNAT'
        : 'Error en emisión directa a SUNAT'
    } else if (modo === 'ose') {
      mensaje = sunatStatus === 'ACEPTADO'
        ? 'Comprobante aceptado por SUNAT vía OSE'
        : sunatStatus === 'ENVIADO'
        ? 'Comprobante enviado a SUNAT vía OSE'
        : 'Comprobante guardado. Error en envío a OSE.'
    } else {
      mensaje = 'Comprobante guardado como PENDIENTE. Configura certificado digital o token OSE.'
    }

    return NextResponse.json({
      ok: true,
      factura: facturaInsert,
      estado_sunat: sunatStatus,
      modo,
      mensaje,
      error_ose: sunatError || undefined,
    })

  } catch (e: any) {
    console.error('Error en /api/sunat/emit:', e)
    return NextResponse.json({ ok: false, error: e.message || 'Error interno' }, { status: 500 })
  }
}
