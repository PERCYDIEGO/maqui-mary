import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'
import { verifyAuth } from '@/lib/api-auth'
import {
  buildApiSunatVoidRequest,
  buildApiSunatSummaryRequest,
  sendToApiSunat,
} from '@/lib/sunat/apisunat-client'

// Anula una factura (Comunicación de Baja, /api/v3/voided) o una boleta
// (Resumen Diario con acción "anular", /api/v3/daily-summary) ya aceptada por SUNAT.
// Las guías de remisión NO se pueden anular por este medio — APISUNAT.pe no expone
// un endpoint de anulación para GRE, así que este endpoint no las acepta.
export async function POST(req: NextRequest) {
  const user = await verifyAuth(req)
  if (!user) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { documento_id, tipo, motivo, ambiente_override } = body

    if (!documento_id || (tipo !== 'factura' && tipo !== 'boleta')) {
      return NextResponse.json({ ok: false, error: 'Faltan datos: documento_id o tipo inválido (solo factura/boleta)' }, { status: 400 })
    }
    if (!motivo || !String(motivo).trim()) {
      return NextResponse.json({ ok: false, error: 'El motivo de anulación es obligatorio' }, { status: 400 })
    }

    const { data: factura, error: facturaError } = await supabase
      .from('facturas')
      .select('id, series, number, estado_sunat, data_json')
      .eq('data_json->>id', documento_id)
      .maybeSingle()

    if (facturaError || !factura) {
      return NextResponse.json({ ok: false, error: 'No se encontró el documento a anular' }, { status: 404 })
    }
    if (factura.estado_sunat !== 'ACEPTADO') {
      return NextResponse.json({ ok: false, error: 'Solo se pueden anular documentos ya aceptados por SUNAT' }, { status: 409 })
    }

    const { data: configRows, error: configError } = await supabase
      .from('sunat_config')
      .select('*')
      .eq('id', 1)
      .single()

    if (configError || !configRows) {
      return NextResponse.json({ ok: false, error: 'Error accediendo a configuración SUNAT' }, { status: 500 })
    }

    const config = configRows as any
    const apisunatToken = config.apisunat_token?.trim()
    if (!apisunatToken) {
      return NextResponse.json({ ok: false, error: 'No hay token APISUNAT configurado' }, { status: 500 })
    }

    const apisunatEnv = ((ambiente_override || config.apisunat_environment || 'sandbox') === 'produccion') ? 'produccion' : 'sandbox'
    const esSandbox = apisunatEnv === 'sandbox'

    const serie = factura.series
    const numero = factura.number

    const apiSunatReq = tipo === 'factura'
      ? buildApiSunatVoidRequest({ serie, numero, motivo: String(motivo).trim() })
      : buildApiSunatSummaryRequest({ serie, numero })

    const apiResult = await sendToApiSunat(
      apiSunatReq,
      apisunatToken,
      apisunatEnv,
      tipo === 'factura' ? 'voided' : 'daily-summary',
    )

    // Si SUNAT ya confirmó la anulación en un intento anterior (asíncrono, sin que
    // nuestro sistema se haya enterado — no hay webhook/polling), un reintento
    // responde "ya ha sido anulada". A diferencia del bug de "ya fue emitido" (que
    // asumía ACEPTADO sin evidencia), acá el mensaje SÍ confirma sin ambigüedad que
    // está anulada — se usa como señal real para corregir nuestro estado atrasado.
    const yaAnulada = !apiResult.success &&
      typeof apiResult.message === 'string' &&
      /ya ha sido anulada|ya fue anulada/i.test(apiResult.message)

    if (!apiResult.success && !yaAnulada) {
      const detalle = apiResult.message
        || (apiResult.payload ? JSON.stringify(apiResult.payload) : '')
        || 'APISUNAT.pe no devolvió detalle del error'
      console.error('[APISUNAT VOID] Falló:', JSON.stringify({ request: apiSunatReq, response: apiResult }))
      return NextResponse.json({
        ok: false,
        es_sandbox: esSandbox,
        error: (esSandbox ? '[PRUEBA SANDBOX] ' : '') + detalle,
        // Volcado completo de lo que devolvió APISUNAT.pe, sin depender de ver logs
        // del servidor por separado — se muestra directo en el mensaje al usuario.
        debug_raw: JSON.stringify({ enviado: apiSunatReq, respuesta: apiResult }),
      }, { status: 400 })
    }

    if (yaAnulada && !esSandbox) {
      const dataJsonActualizado = { ...(factura.data_json as any), estado: 'anulado' }
      await supabase
        .from('facturas')
        .update({
          estado_sunat: 'ANULADO',
          motivo_anulacion: String(motivo).trim(),
          anulado_por: user.id,
          anulado_at: new Date().toISOString(),
          data_json: dataJsonActualizado,
        })
        .eq('id', factura.id)

      return NextResponse.json({
        ok: true,
        es_sandbox: esSandbox,
        estado_sunat: 'ANULADO',
        mensaje: 'Este documento ya estaba anulado ante SUNAT — se actualizó el estado en el sistema.',
      })
    }

    if (yaAnulada) {
      // Sandbox: informar sin persistir (aislamiento de pruebas).
      return NextResponse.json({
        ok: true,
        es_sandbox: esSandbox,
        estado_sunat: 'ANULADO',
        mensaje: '[PRUEBA SANDBOX] Este documento ya figura anulado en el ambiente de pruebas.',
      })
    }

    // La boleta se anula vía resumen diario, que SUNAT procesa de forma asíncrona —
    // igual que un envío normal, puede quedar PENDIENTE antes de confirmarse ACEPTADO.
    const estadoRespuesta = apiResult.payload?.estado || 'ACEPTADO'
    const anulacionConfirmada = estadoRespuesta === 'ACEPTADO'

    // Un intento en sandbox es solo una prueba: nunca debe marcar el documento real
    // como anulado (mismo criterio ya aplicado al resto del flujo de envío).
    if (!esSandbox && anulacionConfirmada) {
      const dataJsonActualizado = { ...(factura.data_json as any), estado: 'anulado' }
      await supabase
        .from('facturas')
        .update({
          estado_sunat: 'ANULADO',
          motivo_anulacion: String(motivo).trim(),
          anulado_por: user.id,
          anulado_at: new Date().toISOString(),
          data_json: dataJsonActualizado,
        })
        .eq('id', factura.id)
    } else if (!esSandbox) {
      // Resumen diario todavía procesando — se guarda el motivo pero el estado
      // definitivo se confirma en un envío posterior (no hay webhook/polling todavía).
      await supabase
        .from('facturas')
        .update({
          motivo_anulacion: String(motivo).trim(),
          anulado_por: user.id,
        })
        .eq('id', factura.id)
    }

    const prefijo = esSandbox ? '[PRUEBA SANDBOX] ' : ''
    const mensaje = anulacionConfirmada
      ? `${prefijo}Documento anulado correctamente ante SUNAT`
      : `${prefijo}Anulación enviada — SUNAT la está procesando (resumen diario), la confirmación puede demorar hasta el cierre del día`

    return NextResponse.json({
      ok: true,
      es_sandbox: esSandbox,
      estado_sunat: anulacionConfirmada ? 'ANULADO' : 'PENDIENTE',
      mensaje,
    })
  } catch (e: any) {
    console.error('Error en /api/sunat/void:', e)
    return NextResponse.json({ ok: false, error: e.message || 'Error interno' }, { status: 500 })
  }
}
