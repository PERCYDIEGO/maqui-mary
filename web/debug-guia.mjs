import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const jsCode = fs.readFileSync('./src/lib/sunat/apisunat-client.ts', 'utf8')
const jsModule = { exports: {} }

// Hack para cargar módulo TS/JS: el archivo tiene sintaxis TS pero no types en runtime
// Lo ejecuto como script vanilla con vm
const vm = await import('vm')
const context = vm.createContext({
  console,
  exports: jsModule.exports,
  module: { exports: jsModule.exports },
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  JSON,
  Math,
  Date,
  String,
  Number,
  Boolean,
  Array,
  Object,
  Promise,
  parseInt,
  parseFloat,
  isNaN,
  isFinite,
  Infinity,
  NaN,
  undefined,
  null,
  Error,
  TypeError,
  RangeError,
  SyntaxError,
  RegExp,
  Map,
  Set,
  Proxy,
  Reflect,
  Symbol,
  BigInt,
  DataView,
  Int8Array,
  Uint8Array,
  Uint8ClampedArray,
  Int16Array,
  Uint16Array,
  Int32Array,
  Uint32Array,
  Float32Array,
  Float64Array,
  eval,
  encodeURI,
  decodeURI,
  encodeURIComponent,
  decodeURIComponent,
  fetch: async (...args) => {
    const res = await import('node-fetch').then(m => m.default || m).catch(() => ({}))
    if (res.default) return res.default(...args)
    return args
  },
})

const buildApiSunatGuiaRequestName = 'buildApiSunatGuiaRequest'
const sendToApiSunatName = 'sendToApiSunat'

const src = jsCode.replace('export async function sendToApiSunat', `function ${sendToApiSunatName}`).replace('export function buildApiSunatGuiaRequest', `function ${buildApiSunatGuiaRequestName}`)
vm.runInContext(src, context)

const buildApiSunatGuiaRequest = context[buildApiSunatGuiaRequestName]
const sendToApiSunat = context[sendToApiSunatName]

if (!buildApiSunatGuiaRequest || !sendToApiSunat) {
  console.error('Failed to load helpers from TS file')
  process.exit(1)
}

const button = await supabase.from('sunat_config').select('*').eq('id', 1).single()
const config = button.data
const clienteRes = await supabase.from('clientes').select('*').eq('tipo_documento', '6').not('num_documento', 'eq', '').limit(1).single()
const cliente = clienteRes.data
const prodRes = await supabase.from('productos').select('*').eq('activo', true).limit(1).single()
const producto = prodRes.data
const transRes = await supabase.from('transportistas').select('*').eq('activo', true).limit(1).single()
const transporte = transRes.data

const params = {
  tipoGuia: '09',
  serie: 'T001',
  numero: 10295,
  fechaEmision: '2026-06-21',
  horaEmision: '00:00:00',
  modalidadTraslado: transporte?.modalidad || 'publico',
  motivoTraslado: '01',
  descripcionMotivo: '',
  fechaInicioTraslado: '2026-06-21',
  fechaEntregaTransportista: '2026-06-21',
  destinatarioTipoDoc: '6',
  destinatarioNumDoc: cliente?.num_documento || '20509146668',
  destinatarioNombre: cliente?.name || 'FABARLI S.A.C.',
  destinatarioDireccion: cliente?.address || 'Lima',
  puntoPartidaUbigeo: config?.ubigeo || '150103',
  puntoPartida: config?.address || 'Lurigancho, Lima',
  puntoLlegadaUbigeo: '150101',
  puntoLlegada: cliente?.address || 'Lima',
  pesoTotal: 10,
  unidadPeso: 'KGM',
  numeroBultos: 1,
  observaciones: '',
  bienes: producto
    ? [{ descripcion: producto.name, cantidad: 2, unidadMedida: producto.unidad_de_medida || 'NIU' }]
    : [{ descripcion: 'test', cantidad: 1, unidadMedida: 'NIU' }],
  documentosRelacionados: [
    { tipo: 'factura', serie: 'F001', numero: '123', rucEmisor: config?.ruc || '20606218801' },
  ],
  transportista: transporte?.ruc
    ? {
        ruc: transporte.ruc,
        denominacion: transporte.nombre_completo,
        numeroRegistroMTC: transporte.numero_registro_mtc || '',
      }
    : undefined,
  conductores: [],
  vehiculos: [],
}

if (transporte?.modalidad !== 'publico' || !transporte.ruc) {
  params.modalidadTraslado = 'privado'
  if (transporte) {
    params.conductores = [{ tipoDoc: '1', numDoc: transporte.dni || '', nombres: (transporte.nombre_completo || '').split(', ')[1] || '', apellidos: (transporte.nombre_completo || '').split(', ')[0] || '', licencia: transporte.licencia_conducir || '' }]
    params.vehiculos = [{ placa: transporte.numero_placa || '' }]
  }
}

const request = buildApiSunatGuiaRequest(params)
console.log('REQUEST:', JSON.stringify(request, null, 2))

const result = await sendToApiSunat(request, config.apisunat_token.trim(), 'sandbox', true)
console.log('RESULT:', JSON.stringify(result, null, 2))
