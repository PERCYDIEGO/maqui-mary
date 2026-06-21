/**
 * Emite guías de remisión reales vinculadas a facturas ACEPTADAS en SUNAT.
 * Corre siempre en SANDBOX — el switch a producción lo hace Percy manualmente.
 *
 * Uso: node scripts/emitir-guias.mjs
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ─── Ubigeos Lima (SUNAT) ────────────────────────────────────────────────────
const UBIGEO = {
  lurigancho:     '150103', // sede empresa
  sjl:            '150132', // San Juan de Lurigancho
  lima:           '150101', // Lima Cercado
  surquillo:      '150134',
  lince:          '150113',
}

function hoyPeru() {
  return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function cleanName(nombre) {
  // Limpia prefijo "-, " de algunos transportistas
  return nombre.replace(/^-,\s*/, '').trim()
}

// ─── Builder guía APISUNAT ───────────────────────────────────────────────────

function buildGuiaRequest({ serie, numero, factura, transportista, config, bienes, hoy }) {
  return {
    documento: 'guia_remision_remitente',
    serie,
    numero: String(numero),
    fecha_de_emision: hoy,
    hora_de_emision: '08:00:00',
    modalidad_de_transporte: '01', // 01=Público
    motivo_de_traslado: '01',       // 01=Venta
    fecha_inicio_de_traslado: hoy,
    fecha_entrega_a_transportista: hoy,
    destinatario_tipo_de_documento: '6',
    destinatario_numero_de_documento: factura.cliente_ruc,
    destinatario_denominacion: factura.cliente_nombre,
    destinatario_direccion: factura.cliente_direccion || 'Lima',
    punto_de_partida_ubigeo: config.ubigeo || UBIGEO.lurigancho,
    punto_de_partida_direccion: config.address,
    punto_de_llegada_ubigeo: UBIGEO.sjl,
    punto_de_llegada_direccion: factura.cliente_direccion || 'San Juan de Lurigancho, Lima',
    peso_bruto_total: '10.000',
    peso_bruto_unidad_de_medida: 'KGM',
    numero_de_bultos: 1,
    documentos_relacionados: [{
      documento: 'factura',
      serie: factura.series,
      numero: String(factura.number),
      ruc_emisor: config.ruc,
    }],
    transportista: {
      ruc: transportista.ruc,
      denominacion: cleanName(transportista.nombre_completo),
      numero_registro_MTC: transportista.numero_registro_mtc || '',
    },
    items: bienes.map(b => ({
      codigo_interno: '0001',
      descripcion: b.name,
      unidad_de_medida: (b.unidad_de_medida || 'UN').substring(0, 2),
      cantidad: 2,
    })),
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const hoy = hoyPeru()
  console.log(`\n🗓  Fecha Perú: ${hoy}`)
  console.log('🌐 Ambiente: SANDBOX\n')

  // 1. Cargar datos
  const [configRes, facturasRes, transportistaRes, productosRes] = await Promise.all([
    sb.from('sunat_config').select('*').eq('id', 1).single(),
    sb.from('facturas')
      .select('id,series,number,cliente_nombre,cliente_ruc,cliente_direccion,total')
      .eq('tipo_comprobante', '01')
      .in('estado_sunat', ['ACEPTADO', 'PENDIENTE'])
      .not('cliente_ruc', 'eq', '')
      .not('cliente_ruc', 'is', null)
      .order('created_at', { ascending: false })
      .limit(3),
    sb.from('transportistas')
      .select('id,nombre_completo,ruc,modalidad,numero_registro_mtc')
      .eq('activo', true)
      .not('ruc', 'is', null)
      .eq('modalidad', 'publico')
      .limit(1),
    sb.from('productos').select('name,unidad_de_medida').eq('activo', true).limit(2),
  ])

  if (configRes.error) throw new Error('No se pudo cargar sunat_config: ' + configRes.error.message)
  if (!facturasRes.data?.length) throw new Error('No hay facturas ACEPTADAS con RUC')
  if (!transportistaRes.data?.length) throw new Error('No hay transportistas públicos activos')

  const config = configRes.data
  const facturas = facturasRes.data
  const transportista = transportistaRes.data[0]
  const productos = productosRes.data || [{ name: 'Esponja de limpieza', unidad_de_medida: 'NIU' }]

  const token = config.apisunat_token?.trim()
  const env = (config.apisunat_environment || 'sandbox') === 'produccion' ? 'produccion' : 'sandbox'
  const baseUrl = env === 'produccion' ? 'https://app.apisunat.pe' : 'https://sandbox.apisunat.pe'

  console.log(`🚚 Transportista: ${cleanName(transportista.nombre_completo)} (RUC ${transportista.ruc})`)
  console.log(`📦 Facturas a procesar: ${facturas.map(f => `${f.series}-${f.number}`).join(', ')}\n`)

  // 2. Número inicial — siempre mayor que el máximo actual
  const { data: maxGuia } = await sb.from('guias').select('numero').eq('serie', config.series_guia).order('numero', { ascending: false }).limit(1)
  let nextNumero = Math.max(
    (maxGuia?.[0]?.numero ?? 0) + 1,
    (config.next_number_guia ?? 295) + 1
  )

  // 3. Emitir guía por cada factura
  const resultados = []

  for (const factura of facturas) {
    const guiaSerie = config.series_guia || 'T001'
    const guiaNumero = nextNumero++

    console.log(`\n── Procesando ${guiaSerie}-${guiaNumero} → ${factura.series}-${factura.number} (${factura.cliente_nombre}) ──`)

    // 3a. Crear registro guía en BD
    const guiaPayload = {
      serie: guiaSerie,
      numero: guiaNumero,
      tipo_guia: '09',
      fecha_emision: hoy,
      fecha_inicio_traslado: hoy,
      motivo_traslado: '01',
      destinatario_nombre: factura.cliente_nombre,
      destinatario_tipo_doc: '6',
      destinatario_num_doc: factura.cliente_ruc,
      destinatario_direccion: factura.cliente_direccion || 'Lima',
      punto_partida: config.address,
      punto_llegada: factura.cliente_direccion || 'San Juan de Lurigancho, Lima',
      modalidad_traslado: 'publico',
      peso_total: 10,
      unidad_peso: 'KGM',
      numero_bultos: 1,
      estado: 'borrador',
      transportista_nombre: cleanName(transportista.nombre_completo),
      transportista_tipo_doc: '6',
      transportista_num_doc: transportista.ruc,
      transportista_registro_mtc: transportista.numero_registro_mtc || '',
      documentos_relacionados: JSON.stringify([{
        tipo: 'factura',
        serie: factura.series,
        numero: String(factura.number),
        ruc_emisor: config.ruc,
      }]),
      bienes: JSON.stringify(productos.map(p => ({
        descripcion: p.name,
        cantidad: 2,
        unidad_de_medida: p.unidad_de_medida || 'NIU',
      }))),
    }

    const { data: guiaCreada, error: guiaErr } = await sb.from('guias').insert(guiaPayload).select('id').single()
    if (guiaErr) {
      console.error(`  ❌ Error creando guía en BD: ${guiaErr.message}`)
      continue
    }
    console.log(`  ✓ Guía creada en BD (id: ${guiaCreada.id})`)

    // 3b. Construir request y enviar a APISUNAT
    const apiReq = buildGuiaRequest({ serie: guiaSerie, numero: guiaNumero, factura, transportista, config, bienes: productos, hoy })

    console.log(`  → Enviando a APISUNAT sandbox...`)
    let apiResult
    try {
      const res = await fetch(`${baseUrl}/api/v3/dispatches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(apiReq),
      })
      apiResult = await res.json()
    } catch (e) {
      console.error(`  ❌ Error HTTP APISUNAT: ${e.message}`)
      continue
    }

    const yaEmitido = !apiResult.success && /emitido anteriormente/i.test(apiResult.message || '')
    const ok = apiResult.success || yaEmitido

    console.log(`  APISUNAT: ${ok ? '✅' : '❌'} ${apiResult.message || JSON.stringify(apiResult)}`)

    // 3c. Actualizar guía con respuesta SUNAT
    const update = {
      estado_sunat: ok ? (apiResult.payload?.estado || 'ACEPTADO') : 'RECHAZADO',
      ticket_sunat: apiResult.payload?.hash || '',
      cdr_sunat: apiResult.payload?.cdr || null,
      xml_sunat: apiResult.payload?.xml || null,
      pdf_ticket_sunat: apiResult.payload?.pdf?.ticket || null,
      pdf_a4_sunat: apiResult.payload?.pdf?.a4 || null,
      enviado_at: new Date().toISOString(),
      error_sunat: ok ? null : (apiResult.message || 'Error APISUNAT'),
    }
    await sb.from('guias').update(update).eq('id', guiaCreada.id)

    resultados.push({
      guia: `${guiaSerie}-${guiaNumero}`,
      factura: `${factura.series}-${factura.number}`,
      cliente: factura.cliente_nombre,
      ok,
      estado: update.estado_sunat,
      mensaje: apiResult.message || '',
    })
  }

  // 4. Actualizar next_number_guia en sunat_config
  await sb.from('sunat_config').update({ next_number_guia: nextNumero - 1 }).eq('id', 1)

  // 5. Resumen
  console.log('\n═══════════════════════════════════════')
  console.log('RESUMEN DE EMISIÓN')
  console.log('═══════════════════════════════════════')
  for (const r of resultados) {
    const icon = r.ok ? '✅' : '❌'
    console.log(`${icon} ${r.guia} → ${r.factura} | ${r.cliente} | ${r.estado}`)
    if (!r.ok) console.log(`   Error: ${r.mensaje}`)
  }
  console.log(`\n✓ next_number_guia actualizado a: ${nextNumero - 1}`)
}

main().catch(e => {
  console.error('Error fatal:', e)
  process.exit(1)
})
