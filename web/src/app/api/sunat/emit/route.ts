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
      // id del documento ya creado en el CRM (data_json->>'id') — si viene, se actualiza
      // ese registro en vez de insertar uno nuevo en cada reintento
      documento_id,
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
      // Override puntual del ambiente SUNAT (sandbox|produccion) elegido al momento de enviar,
      // sin depender del toggle global de sunat_config
      ambiente_override,
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
    // Perú es UTC-5 sin horario de verano. El servidor Vercel corre en UTC,
    // por lo que toISOString() devolvería la fecha UTC incorrecta tras las 7 PM Perú.
    const peruNow = new Date(now.getTime() - 5 * 60 * 60 * 1000)
    const fechaEmision = peruNow.toISOString().slice(0, 10)  // YYYY-MM-DD en hora Perú
    const horaEmision  = peruNow.toISOString().slice(11, 19) // HH:MM:SS en hora Perú

    let sunatStatus = 'PENDIENTE'
    let sunatError = ''
    let hash = ''
    let codigoQR = ''
    let esSandbox = false

    const hasApiSunat = config.apisunat_token?.trim()

    if (hasApiSunat) {
      try {
        const apisunatToken = config.apisunat_token.trim()
        const apisunatEnv = ((ambiente_override || config.apisunat_environment || 'sandbox') === 'produccion') ? 'produccion' : 'sandbox'
        esSandbox = apisunatEnv === 'sandbox'

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
          // Detectar si SUNAT ya tenía el comprobante registrado (doble envío)
          const yaEmitido = typeof apiResult.message === 'string' && /emitido anteriormente/i.test(apiResult.message)
          if (yaEmitido) {
            sunatStatus = 'ACEPTADO'
            sunatError = ''
          } else {
            sunatStatus = 'ERROR'
            sunatError = JSON.stringify({
              msg: apiResult.message || 'Error en APISUNAT.pe',
              sent: apiSunatReq,
            })
          }
        }
      } catch (e: any) {
        sunatStatus = 'ERROR'
        sunatError = e.message || 'Error de conexión con APISUNAT.pe'
      }
    } else {
      sunatError = 'No hay token APISUNAT.pe configurado. Ve a Configuración > SUNAT.'
    }

    const numPadded = String(numero).padStart(8, '0')
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://maquimary.com.pe').replace(/\/$/, '')
    codigoQR = `${appUrl}/doc/${serie}-${numPadded}`

    // Un envío a sandbox es solo una prueba: nunca debe dejar el documento como
    // ACEPTADO/ENVIADO de verdad (eso lo sacaría de la cola de pendientes y ya no se
    // podría enviar a producción). El resultado real de la prueba se devuelve en la
    // respuesta (mensaje/estado_sunat) para el toast, pero lo que se persiste queda
    // en PENDIENTE.
    const estadoParaGuardar = esSandbox ? 'PENDIENTE' : sunatStatus

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
      estado_sunat: estadoParaGuardar,
      sunat_response: esSandbox ? `[PRUEBA SANDBOX] ${sunatError || 'OK'}` : (sunatError || 'OK'),
      date_millis: now.getTime(),
      codigo_qr: codigoQR,
      hash_cpe: hash,
      forma_pago: forma_pago || 'contado',
      tipo_cambio: tipo_cambio ? parseFloat(tipo_cambio) : null,
      guia_remision: guia_remision || '',
      orden_compra: orden_compra || '',
    }

    // Si documento_id viene informado, ya existe una fila (creada al guardar el borrador en
    // el CRM) para este mismo documento — se actualiza esa fila en vez de insertar una nueva
    // en cada click de "Enviar SUNAT" / reintento, para no acumular filas duplicadas.
    let facturaExistente: any = null
    if (documento_id) {
      const { data } = await supabase
        .from('facturas')
        .select('id, estado_sunat')
        .eq('data_json->>id', documento_id)
        .maybeSingle()
      facturaExistente = data
    }

    const esReintento = !!facturaExistente
    // Solo se descuenta stock en el primer intento real (fila recién creada, o fila existente
    // que aún estaba en PENDIENTE — nunca se había llegado a intentar el envío). Reintentos
    // posteriores a un ERROR/RECHAZADO no vuelven a descontar.
    const esPrimerIntento = !esReintento || facturaExistente.estado_sunat === 'PENDIENTE'

    const { data: facturaInsert, error: facturaError } = esReintento
      ? await supabase.from('facturas').update(facturaData).eq('id', facturaExistente.id).select().single()
      : await supabase.from('facturas').insert(facturaData).select().single()

    if (facturaError) {
      return NextResponse.json({ ok: false, error: 'Error guardando factura: ' + facturaError.message }, { status: 500 })
    }

    const facturaId = facturaInsert.id

    // En un reintento, borrar los items previos para no duplicarlos al reinsertar
    if (esReintento) {
      await supabase.from('factura_items').delete().eq('factura_id', facturaId)
    }

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
      // Revertir la factura huérfana (solo si fue creada en este request, no si ya existía)
      if (!esReintento) await supabase.from('facturas').delete().eq('id', facturaId)
      return NextResponse.json({ ok: false, error: 'Error guardando items de la factura: ' + itemsError.message }, { status: 500 })
    }

    // BUG-07: no descontar stock si el pedido web ya lo hizo al confirmarse
    // BUG-04: RPC atómica — UPDATE en una sola sentencia, sin race condition bajo concurrencia
    // No volver a descontar en un reintento (ya se descontó — o se intentó — la primera vez).
    // Un envío a sandbox nunca descuenta stock real: es solo una prueba.
    if (!stock_ya_descontado && esPrimerIntento && !esSandbox) {
      for (const it of items) {
        if (it.producto_id) {
          const { error: stockError } = await supabase.rpc('decrement_stock', {
            p_producto_id: it.producto_id,
            p_cantidad: it.quantity,
            p_motivo: `Venta ${tipo_comprobante === '01' ? 'Factura' : 'Boleta'} ${serie}-${String(numero).padStart(4, '0')}`,
            p_factura_id: facturaId,
          })
          if (stockError) console.error('Error descontando stock:', stockError)
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

    const prefijo = esSandbox ? '[PRUEBA SANDBOX] ' : ''
    const mensaje = sunatStatus === 'ACEPTADO'
      ? `${prefijo}Comprobante aceptado por SUNAT vía APISUNAT.pe`
      : sunatStatus === 'ENVIADO'
      ? `${prefijo}Comprobante enviado a SUNAT vía APISUNAT.pe (pendiente)`
      : `${prefijo}Error: ${sunatError}`

    return NextResponse.json({
      ok: sunatStatus === 'ACEPTADO' || sunatStatus === 'ENVIADO',
      es_sandbox: esSandbox,
      factura: facturaInsert,
      // estado_sunat: resultado REAL de la prueba (para el toast) — puede diferir de lo
      // persistido en la fila (estadoParaGuardar), que en sandbox siempre queda PENDIENTE
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
