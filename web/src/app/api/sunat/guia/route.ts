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
    const apisunatEnv = (config.apisunat_environment || 'sandbox') === 'produccion' ? 'produccion' : 'sandbox'

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

    // Enviar a APISUNAT (endpoint /api/v3/dispatches para guías)
    const apiResult = await sendToApiSunat(apiSunatReq, apisunatToken, apisunatEnv, true)

    // Actualizar guía en la base de datos
    const updateData: any = {
      estado_sunat: apiResult.success ? (apiResult.payload?.estado || 'ACEPTADO') : 'RECHAZADO',
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

    if (!apiResult.success) {
      return NextResponse.json({
        ok: false,
        error: apiResult.message || 'Error al enviar guía a SUNAT',
        details: apiResult,
      }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      message: `Guía enviada a SUNAT: ${apiResult.payload?.estado || 'ACEPTADO'}`,
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
