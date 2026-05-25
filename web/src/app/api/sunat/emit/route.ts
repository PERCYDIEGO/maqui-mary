import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'
import { verifyAuth } from '@/lib/api-auth'
import { buildApiSunatRequest, sendToApiSunat } from '@/lib/sunat/apisunat-client'

export async function POST(req: NextRequest) {
  // BUG-03: verificar sesión antes de emitir comprobantes
  const user = await verifyAuth(req)
  if (!user) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

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
      // BUG-01: serie y número provistos por el frontend (del documento ya creado)
      serie_override,
      numero_override,
      // BUG-07: flag para no descontar stock cuando ya fue descontado al confirmar pedido web
      stock_ya_descontado = false,
    } = body

    const isFactura = tipo_comprobante === '01'
    const isBoletaSinId = !isFactura && sin_identificar

    if ((!cliente_nombre && !isBoletaSinId) || !items || items.length === 0) {
      return NextResponse.json({ ok: false, error: 'Faltan datos: cliente o items' }, { status: 400 })
    }

    let { data: configRows, error: configError } = await supabase
      .from('sunat_config')
      .select('*')
      .eq('id', 1)
      .single()

    if (configError?.code === 'PGRST116' || (!configError && !configRows)) {
      await supabase.from('sunat_config').upsert({
        id: 1, environment: 'demo', ruc: '', razon_social: '', series_factura: 'F001',
        series_boleta: 'B001', next_number_factura: 1, next_number_boleta: 1,
      })
      const { data: retryData } = await supabase.from('sunat_config').select('*').eq('id', 1).single()
      configRows = retryData
    }

    if (configError && configError.code !== 'PGRST116') {
      return NextResponse.json({ ok: false, error: 'Error accediendo a configuración SUNAT: ' + configError.message }, { status: 500 })
    }

    const config = (configRows || { id: 1, environment: 'demo', ruc: '', series_factura: 'F001', series_boleta: 'B001', next_number_factura: 1, next_number_boleta: 1 }) as any

    // BUG-01: usar serie/número del documento frontend si se proveen; si no, auto-asignar desde config
    const configSerie = isFactura ? (config.series_factura || 'F001') : (config.series_boleta || 'B001')
    const nextField = isFactura ? 'next_number_factura' : 'next_number_boleta'
    const configNumero = isFactura ? (config.next_number_factura || 1) : (config.next_number_boleta || 1)

    const serie = (serie_override && String(serie_override).trim()) ? String(serie_override).trim() : configSerie
    const numero = (numero_override && Number(numero_override) > 0) ? Number(numero_override) : configNumero

    const subtotalRaw = items.reduce((s: number, it: any) => s + (it.quantity * it.unit_price), 0)
    const subtotal = Math.round(subtotalRaw * 100) / 100
    const igv      = Math.round(subtotal * 0.18 * 100) / 100
    const total    = Math.round((subtotal + igv) * 100) / 100

    const now = new Date()
    const fechaEmision = now.toISOString().slice(0, 10)
    const horaEmision = now.toTimeString().slice(0, 8)

    let sunatStatus = 'PENDIENTE'
    let sunatError = ''
    let hash = ''
    let codigoQR = ''

    const hasApiSunat = config.apisunat_token?.trim()

    if (hasApiSunat) {
      try {
        const apisunatToken = config.apisunat_token.trim()
        const apisunatEnv = (config.apisunat_environment || 'sandbox') === 'produccion' ? 'produccion' : 'sandbox'

        const apiSunatReq = buildApiSunatRequest({
          tipoComprobante: tipo_comprobante,
          serie,
          numero,
          fechaEmision,
          horaEmision,
          moneda,
          clienteTipoDoc: isFactura ? '6' : (isBoletaSinId ? '1' : (cliente_tipo_doc || '1')),
          clienteNumDoc: isBoletaSinId ? '99999999' : (cliente_ruc || '99999999'),
          clienteNombre: isBoletaSinId ? 'CLIENTE VARIOS' : (cliente_nombre || 'CLIENTE VARIOS'),
          clienteDireccion: isBoletaSinId ? '-' : (cliente_direccion || '-'),
          items: items.map((it: any) => ({
            descripcion: it.description,
            cantidad: it.quantity,
            valorUnitario: it.unit_price,
          })),
          total,
          nota: notes,
        })

        const apiResult = await sendToApiSunat(apiSunatReq, apisunatToken, apisunatEnv)

        if (apiResult.success && apiResult.payload) {
          const estado = apiResult.payload.estado
          sunatStatus = estado === 'ACEPTADO' ? 'ACEPTADO' : estado === 'RECHAZADO' ? 'RECHAZADO' : 'PENDIENTE'
          hash = apiResult.payload.hash

          if (estado === 'ACEPTADO') {
            sunatError = ''
          } else if (estado === 'RECHAZADO') {
            sunatError = apiResult.message || 'Rechazado por SUNAT'
          } else {
            sunatStatus = 'ENVIADO'
            sunatError = apiResult.message || 'Pendiente de aceptación SUNAT'
          }
        } else {
          sunatStatus = 'ERROR'
          sunatError = JSON.stringify({
            msg: apiResult.message || 'Error en APISUNAT.pe',
            sent: apiSunatReq,
          })
        }
      } catch (e: any) {
        sunatStatus = 'ERROR'
        sunatError = e.message || 'Error de conexión con APISUNAT.pe'
      }
    } else {
      sunatError = 'No hay token APISUNAT.pe configurado. Ve a Configuración > SUNAT.'
    }

    const numPadded = String(numero).padStart(8, '0')
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://maquimary.vercel.app').replace(/\/$/, '')
    codigoQR = `${appUrl}/doc/${serie}-${numPadded}`

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
      date_millis: now.getTime(),
      codigo_qr: codigoQR,
      hash_cpe: hash,
      forma_pago: forma_pago || 'contado',
      tipo_cambio: tipo_cambio ? parseFloat(tipo_cambio) : null,
      guia_remision: guia_remision || '',
      orden_compra: orden_compra || '',
    }

    const { data: facturaInsert, error: facturaError } = await supabase
      .from('facturas')
      .insert(facturaData)
      .select()
      .single()

    if (facturaError) {
      return NextResponse.json({ ok: false, error: 'Error guardando factura: ' + facturaError.message }, { status: 500 })
    }

    const facturaId = facturaInsert.id
    const itemsToInsert = items.map((it: any) => ({
      factura_id: facturaId,
      producto_id: it.producto_id || null,
      description: it.description,
      quantity: it.quantity,
      unit_price: it.unit_price,
      total: it.quantity * it.unit_price,
    }))

    // BUG-08: propagar error de items en lugar de ignorarlo silenciosamente
    const { error: itemsError } = await supabase.from('factura_items').insert(itemsToInsert)
    if (itemsError) {
      // Revertir la factura huérfana
      await supabase.from('facturas').delete().eq('id', facturaId)
      return NextResponse.json({ ok: false, error: 'Error guardando items de la factura: ' + itemsError.message }, { status: 500 })
    }

    // BUG-07: no descontar stock si el pedido web ya lo hizo al confirmarse
    // BUG-04: TODO — reemplazar con RPC atómica (decrement_stock) para evitar race condition bajo concurrencia
    if (!stock_ya_descontado) {
      for (const it of items) {
        if (it.producto_id) {
          await supabase.from('movimientos_stock').insert({
            producto_id: it.producto_id,
            tipo: 'salida',
            cantidad: it.quantity,
            motivo: `Venta ${tipo_comprobante === '01' ? 'Factura' : 'Boleta'} ${serie}-${String(numero).padStart(4, '0')}`,
            factura_id: facturaId,
          })

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
    }

    // Solo incrementar el contador de sunat_config cuando se usó la numeración automática
    if (!serie_override && !numero_override) {
      await supabase.from('sunat_config').update({
        [nextField]: numero + 1,
        updated_at: now.toISOString(),
      }).eq('id', 1)
    }

    const mensaje = sunatStatus === 'ACEPTADO'
      ? 'Comprobante aceptado por SUNAT vía APISUNAT.pe'
      : sunatStatus === 'ENVIADO'
      ? 'Comprobante enviado a SUNAT vía APISUNAT.pe (pendiente)'
      : `Error: ${sunatError}`

    return NextResponse.json({
      ok: sunatStatus === 'ACEPTADO' || sunatStatus === 'ENVIADO',
      factura: facturaInsert,
      estado_sunat: sunatStatus,
      mensaje,
      codigo_qr: codigoQR,
      hash_cpe: hash,
    })

  } catch (e: any) {
    console.error('Error en /api/sunat/emit:', e)
    return NextResponse.json({ ok: false, error: e.message || 'Error interno' }, { status: 500 })
  }
}
