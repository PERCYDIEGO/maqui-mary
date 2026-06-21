/**
 * Crea usuario admin temporal + consulta datos reales de DB para los tests E2E.
 * Se elimina en global-teardown.ts al finalizar la suite.
 */
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!
const TEST_EMAIL        = 'test-bot@maquimary.test'
const TEST_PASSWORD     = 'TestBot2026!'
const CREDS_FILE        = path.resolve(__dirname, '.test-creds.json')

export default async function globalSetup() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── 1. Crear usuario de prueba ────────────────────────────────────────────

  const { data: existing } = await supabase.auth.admin.listUsers()
  const prev = existing?.users?.find(u => u.email === TEST_EMAIL)
  if (prev) {
    await supabase.auth.admin.deleteUser(prev.id)
    await supabase.from('profiles').delete().eq('id', prev.id)
  }

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  })
  if (createErr || !created.user) {
    throw new Error(`No se pudo crear usuario de prueba: ${createErr?.message}`)
  }
  const userId = created.user.id

  const { error: profileErr } = await supabase.from('profiles').upsert({
    id: userId,
    full_name: 'Bot de Pruebas',
    alias: 'test-bot',
    role: 'admin',
    force_password_change: false,
  })
  if (profileErr) {
    await supabase.auth.admin.deleteUser(userId)
    throw new Error(`No se pudo crear perfil de prueba: ${profileErr.message}`)
  }

  // ── 2. Consultar datos reales de la DB ────────────────────────────────────

  // Cliente con RUC para facturas (tipo_documento='6')
  const { data: clientesRUC } = await supabase
    .from('clientes')
    .select('id, name, tipo_documento, num_documento, address')
    .eq('tipo_documento', '6')
    .not('num_documento', 'eq', '')
    .limit(1)

  // Cliente consumidor final (cualquiera sin RUC, o usar "CONSUMIDOR FINAL" directo)
  const { data: clientesDNI } = await supabase
    .from('clientes')
    .select('id, name, tipo_documento, num_documento, dni')
    .neq('tipo_documento', '6')
    .limit(1)

  // Productos activos
  const { data: productos } = await supabase
    .from('productos')
    .select('id, name, price, unidad_de_medida')
    .eq('activo', true)
    .limit(2)

  // Transportista activo para guías
  const { data: transportistas } = await supabase
    .from('transportistas')
    .select('id, nombre_completo, ruc, dni, licencia_conducir, numero_placa, modalidad, numero_registro_mtc')
    .eq('activo', true)
    .limit(1)

  // Configuración SUNAT completa (series + ubigeo)
  const { data: sunatConfig } = await supabase
    .from('sunat_config')
    .select('ruc, ubigeo, address, series_factura, next_number_factura, series_guia, next_number_guia')
    .eq('id', 1)
    .single()

  // ── 3. Crear factura de prueba para vincular la guía ──────────────────────

  const hoy = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const transportista = transportistas?.[0]
  const clienteRUC = clientesRUC?.[0]
  const producto1 = productos?.[0]

  const ubigeoEmpresa = sunatConfig?.ubigeo || '150103' // Lurigancho, Lima
  const ubigeoDestino = '150101'                        // Lima Cercado (fallback genérico)
  const rucEmpresa = sunatConfig?.ruc || '20606218801'
  const seriesFactura = sunatConfig?.series_factura || 'F001'
  const siguienteFactura = Number(sunatConfig?.next_number_factura || 9999) + 1000

  const primerProducto = producto1 ?? { name: 'Esponja test', price: 5.5, unidad_de_medida: 'NIU' }
  const subtotal = Number(primerProducto.price || 5.5)
  const igv = Number((subtotal * 0.18).toFixed(2))
  const total = Number((subtotal + igv).toFixed(2))

  const facturaPayload = {
    series: seriesFactura,
    number: siguienteFactura,
    cliente_id: clienteRUC?.id ?? null,
    cliente_nombre: clienteRUC?.name ?? 'FABARLI S.A.C.',
    cliente_ruc: clienteRUC?.num_documento ?? '20509146668',
    cliente_direccion: clienteRUC?.address ?? 'Lima',
    subtotal,
    igv,
    total,
    tipo_comprobante: '01',
    status: 'confirmed',
    estado_sunat: 'ACEPTADO' as const,
    origen: 'crm',
  }

  const { data: facturaCreada, error: facturaErr } = await supabase
    .from('facturas')
    .insert(facturaPayload)
    .select('id, series, number')
    .single()

  if (facturaErr) {
    console.warn('⚠ No se pudo crear factura de prueba para guía:', facturaErr.message)
  }

  // ── 4. Crear guía de prueba en borrador, vinculada a la factura ────────────

  const numeroGuiaTest = Number(sunatConfig?.next_number_guia || 9990) + 10000

  // Eliminar guías de test anteriores si existen (limpieza por si hubo corridas previas)
  await supabase.from('guias').delete().eq('serie', 'T001').gte('numero', 9990)

  const guiaPayload: Record<string, unknown> = {
    serie: 'T001',
    numero: numeroGuiaTest, // número de test secuenciado para evitar duplicados en sandbox
    tipo_guia: '09',
    fecha_emision: hoy,
    fecha_inicio_traslado: hoy,
    motivo_traslado: '01', // 01 = Venta
    destinatario_nombre: clienteRUC?.name ?? 'FABARLI S.A.C.',
    destinatario_tipo_doc: '6',
    destinatario_num_doc: clienteRUC?.num_documento ?? '20509146668',
    destinatario_direccion: clienteRUC?.address ?? 'Lima',
    punto_partida: sunatConfig?.address ?? 'Lurigancho, Lima',
    punto_llegada: clienteRUC?.address ?? 'Lima',
    modalidad_traslado: transportista?.modalidad ?? 'publico',
    peso_total: 10,
    unidad_peso: 'KGM',
    numero_bultos: 1,
    estado: 'borrador',
    created_by: userId,
    documentos_relacionados: facturaCreada
      ? JSON.stringify([{ tipo: 'factura', serie: facturaCreada.series, numero: String(facturaCreada.number), ruc_emisor: rucEmpresa }])
      : JSON.stringify([]),
    bienes: producto1
      ? JSON.stringify([{ descripcion: producto1.name, cantidad: 2, unidad_de_medida: producto1.unidad_de_medida || 'NIU' }])
      : JSON.stringify([{ descripcion: 'Esponja de cocina', cantidad: 2, unidad_de_medida: 'NIU' }]),
  }

  if (transportista?.modalidad === 'publico') {
    Object.assign(guiaPayload, {
      transportista_nombre: transportista.nombre_completo,
      transportista_tipo_doc: transportista.ruc ? '6' : '1',
      transportista_num_doc: transportista.ruc ?? transportista.dni ?? '',
    })
  } else if (transportista) {
    Object.assign(guiaPayload, {
      transportista_nombre: transportista.nombre_completo,
      transportista_tipo_doc: '1',
      transportista_num_doc: transportista.dni ?? '',
      transportista_licencia: transportista.licencia_conducir ?? '',
      transportista_placa: transportista.numero_placa ?? '',
      transportista_registro_mtc: transportista.numero_registro_mtc ?? '',
    })
  }

  const { data: guiaCreada, error: guiaErr } = await supabase
    .from('guias')
    .insert(guiaPayload)
    .select('id, serie, numero')
    .single()

  if (guiaErr) {
    console.warn('⚠ No se pudo crear guía de prueba:', guiaErr.message)
  }

  // ── 5. Guardar todo en .test-creds.json ───────────────────────────────────

  fs.writeFileSync(CREDS_FILE, JSON.stringify({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    userId,
    // Datos reales de DB
    clienteRUC: clienteRUC ?? { name: 'FABARLI S.A.C.', num_documento: '20509146668', tipo_documento: '6', address: 'Lima' },
    productos: productos ?? [],
    transportista: transportista ?? null,
    factura: facturaCreada ?? null,
    guia: guiaCreada ?? null,
    rucEmpresa,
    ubigeoEmpresa,
    ubigeoDestino,
    puntoPartida: sunatConfig?.address ?? 'Lurigancho, Lima',
  }, null, 2))

  console.log(`✓ Usuario de prueba creado: ${TEST_EMAIL}`)
  if (clienteRUC) console.log(`✓ Cliente RUC: ${clienteRUC.name} (${clienteRUC.num_documento})`)
  if (productos?.length) console.log(`✓ Productos: ${productos.map(p => p.name).join(', ')}`)
  if (facturaCreada) console.log(`✓ Factura de prueba creada: ${facturaCreada.series}-${String(facturaCreada.number)} (id: ${facturaCreada.id})`)
  if (guiaCreada) console.log(`✓ Guía de prueba creada: ${guiaCreada.serie}-${guiaCreada.numero} (id: ${guiaCreada.id})`)
}
