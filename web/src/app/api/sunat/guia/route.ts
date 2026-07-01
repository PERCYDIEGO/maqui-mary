import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'
import { verifyAuth } from '@/lib/api-auth'
import { buildApiSunatGuiaRequest, sendToApiSunat } from '@/lib/sunat/apisunat-client'

export async function POST(req: NextRequest) {
  const user = await verifyAuth(req)
  if (!user) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const dryRun = url.searchParams.get('dry_run') === '1'
    const body = await req.json()
    const {
      guia_id,
      tipo_guia = '09', // 09 = GRE Remitente, 31 = GRE Transportista
      serie,
      numero,
      fecha_emision,
      hora_emision,
      moneda = 'PEN',
      modalidad_traslado = 'privado',
      motivo_traslado,
      descripcion_motivo = '',
      fecha_inicio_traslado,
      fecha_entrega_a_transportista, // puede ser distinto a fecha_inicio_traslado
      // Destinatario
      destinatario_tipo_doc,
      destinatario_num_doc,
      destinatario_nombre,
      destinatario_direccion,
      // Puntos
      punto_partida_ubigeo,
      punto_partida,
      punto_llegada_ubigeo,
      punto_llegada,
      // Transporte
      peso_total = 0,
      unidad_peso = 'KGM',
      numero_bultos,
      observaciones = '',
      // Transportista (solo público)
      transportista_ruc,
      transportista_denominacion,
      transportista_registro_mtc,
      // Conductores (solo privado)
      conductores = [],
      // Vehículos (solo privado)
      vehiculos = [],
      // Bienes
      bienes = [],
      // Documentos relacionados
      documentos_relacionados = [],
      // Override puntual del ambiente SUNAT (sandbox|produccion) elegido al momento de enviar
      ambiente_override,
    } = body

    if (!guia_id || !serie || !numero) {
      return NextResponse.json({ ok: false, error: 'Faltan datos: guia_id, serie o numero' }, { status: 400 })
    }

    let { data: configRows, error: configError } = await supabase
      .from('sunat_config')
      .select('*')
      .eq('id', 1)
      .single()

    if (configError || !configRows) {
      return NextResponse.json({ ok: false, error: 'Error accediendo a configuración SUNAT' }, { status: 500 })
    }

    const config = configRows as any
    const hasApiSunat = config.apisunat_token?.trim()

    if (!hasApiSunat) {
      return NextResponse.json({ ok: false, error: 'No hay token APISUNAT configurado' }, { status: 500 })
    }

    const apisunatToken = config.apisunat_token.trim()
    const apisunatEnv = ((ambiente_override || config.apisunat_environment || 'sandbox') === 'produccion') ? 'produccion' : 'sandbox'
    const esSandbox = apisunatEnv === 'sandbox'

    // Construir request para APISUNAT con la estructura correcta
    const apiSunatReq = buildApiSunatGuiaRequest({
      tipoGuia: tipo_guia as '09' | '31',
      serie,
      numero: Number(numero),
      fechaEmision: fecha_emision,
      horaEmision: hora_emision,
      moneda,
      modalidadTraslado: modalidad_traslado as 'privado' | 'publico',
      motivoTraslado: motivo_traslado,
      descripcionMotivo: descripcion_motivo,
      fechaInicioTraslado: fecha_inicio_traslado,
      fechaEntregaTransportista: fecha_entrega_a_transportista || fecha_inicio_traslado,
      destinatarioTipoDoc: destinatario_tipo_doc || '6',
      destinatarioNumDoc: destinatario_num_doc || '',
      destinatarioNombre: destinatario_nombre || '',
      destinatarioDireccion: destinatario_direccion || '-',
      puntoPartidaUbigeo: punto_partida_ubigeo,
      puntoPartida: punto_partida || '',
      puntoLlegadaUbigeo: punto_llegada_ubigeo,
      puntoLlegada: punto_llegada || '',
      pesoTotal: Number(peso_total) || 0,
      unidadPeso: unidad_peso,
      numeroBultos: numero_bultos ? Number(numero_bultos) : undefined,
      observaciones: observaciones || undefined,
      transportista: transportista_ruc ? {
        ruc: transportista_ruc,
        denominacion: transportista_denominacion || '',
        numeroRegistroMTC: transportista_registro_mtc || '',
      } : undefined,
      conductores: conductores.map((c: any) => ({
        tipoDoc: c.tipo_de_documento || '1',
        numDoc: c.numero_de_documento || '',
        nombres: c.nombres || '',
        apellidos: c.apellidos || '',
        licencia: c.numero_licencia_conducir || '',
      })),
      vehiculos: vehiculos.map((v: any) => ({
        placa: v.numero_de_placa || '',
      })),
      bienes: bienes.map((b: any) => ({
        descripcion: b.descripcion || b.nombre || '',
        cantidad: Number(b.cantidad) || 1,
        unidadMedida: b.unidad_de_medida || b.unidadMedida || 'NIU',
        codigo: b.codigo_interno || b.codigo || b.productoId || undefined,
      })),
      documentosRelacionados: documentos_relacionados.map((d: any) => ({
        tipo: d.tipo || d.documento || 'factura',
        serie: d.serie || '',
        numero: d.numero || '',
        rucEmisor: d.ruc_emisor || d.rucEmisor || '20606218801',
      })),
    })

    if (dryRun) {
      return NextResponse.json({ ok: true, dryRun: true, request: apiSunatReq })
    }

    // Enviar a APISUNAT (endpoint /api/v3/dispatches para guías)
    const apiResult = await sendToApiSunat(apiSunatReq, apisunatToken, apisunatEnv, true)

    // Detectar si SUNAT ya tenía el comprobante registrado (doble envío)
    const yaEmitido = !apiResult.success &&
      typeof apiResult.message === 'string' &&
      /emitido anteriormente/i.test(apiResult.message)

    const prefijoYaEmitido = esSandbox ? '[PRUEBA SANDBOX] ' : ''

    // "Ya fue emitido anteriormente" NO significa que esa emisión previa haya sido
    // aceptada -- pudo haber sido rechazada. Asumir ACEPTADO acá era un bug real: dejaba
    // documentos rechazados marcados como aprobados sin verificación real. No se toca el
    // registro (se deja el estado que ya tenía) y se le pide al usuario verificar directo
    // en SUNAT/APISUNAT.pe.
    if (yaEmitido) {
      return NextResponse.json({
        ok: false,
        es_sandbox: esSandbox,
        error: prefijoYaEmitido + 'SUNAT indica que este documento ya fue registrado anteriormente. No se puede confirmar automáticamente si fue aceptado o rechazado — verifica el estado real en SUNAT (Consulta GREE con Clave SOL) o en el panel de APISUNAT.pe antes de reintentar.',
      }, { status: 409 })
    }

    const estadoSunat: string = apiResult.success ? (apiResult.payload?.estado || 'ACEPTADO') : 'RECHAZADO'
    // La columna `estado` (no `estado_sunat`) es la que usa la UI del CRM para decidir
    // en qué lista mostrar la guía y qué badge pintar — sin esto, la guía se quedaba
    // como "Borrador" para siempre aunque SUNAT ya hubiera respondido.
    const estadoCrm = estadoSunat === 'ACEPTADO' ? 'aprobado'
      : estadoSunat === 'RECHAZADO' ? 'rechazado'
      : 'enviado' // PENDIENTE/ENVIADO: SUNAT todavía está procesando de forma asíncrona

    // Un envío a sandbox es solo una prueba: no se persiste nada en la guía real (ni
    // estado_sunat, ni CDR/XML) para no perder ni ensuciar el registro real cuando
    // después se envíe de verdad a producción. El resultado real igual viaja en la
    // respuesta (estado_sunat) para que el toast informe correctamente.
    if (!esSandbox) {
      const updateData: any = {
        estado: estadoCrm,
        estado_sunat: estadoSunat,
        ticket_sunat: apiResult.payload?.hash || '',
        cdr_sunat: apiResult.payload?.cdr || null,
        xml_sunat: apiResult.payload?.xml || null,
        pdf_ticket_sunat: apiResult.payload?.pdf?.ticket || null,
        pdf_a4_sunat: apiResult.payload?.pdf?.a4 || null,
        enviado_por: null,
        enviado_at: new Date().toISOString(),
        error_sunat: apiResult.success ? null : (apiResult.message || 'Error desconocido'),
      }

      await supabase.from('guias').update(updateData).eq('id', guia_id)
    }

    const prefijo = esSandbox ? '[PRUEBA SANDBOX] ' : ''

    if (!apiResult.success) {
      return NextResponse.json({
        ok: false,
        es_sandbox: esSandbox,
        estado_sunat: estadoSunat,
        error: prefijo + (apiResult.message || 'Error al enviar guía a SUNAT'),
        details: apiResult,
      }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      es_sandbox: esSandbox,
      estado_sunat: estadoSunat,
      message: prefijo + `Guía enviada a SUNAT: ${apiResult.payload?.estado || 'ACEPTADO'}`,
      hash: apiResult.payload?.hash,
      cdr: apiResult.payload?.cdr,
      xml: apiResult.payload?.xml,
      pdf: apiResult.payload?.pdf,
    })

  } catch (error: any) {
    console.error('[API GUÍA SUNAT] Error:', error)
    return NextResponse.json({
      ok: false,
      error: error.message || 'Error interno al procesar guía',
    }, { status: 500 })
  }
}
