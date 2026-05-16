const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const envPath = path.join(__dirname, '..', '.env.local')
const envRaw = fs.readFileSync(envPath, 'utf-8')
const env = Object.fromEntries(
  envRaw.split('\n').filter(l => l.trim() && !l.startsWith('#')).map(l => {
    const idx = l.indexOf('=')
    return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
  })
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

;(async () => {
  // 1. Delete all existing records
  console.log('Borrando todos los clientes...')
  const { error: delError } = await supabase.from('clientes').delete().neq('id', 0)
  if (delError) { console.error('Error:', delError); return }
  console.log('OK')

  // 2. Insert new data
  const list = [
    { nd: '10201171003', td: '6', nom: 'APAZA ROMERO ROBERTO WILFREDO', dir: '', notes: 'Precio barato' },
    { nd: '40452426', td: '1', nom: 'RAMOS DE LA CRUZ GUIDEN IVAN', dir: '', notes: '' },
    { nd: '20602935966', td: '6', nom: 'TAI PAPER SAC', dir: '', notes: 'Facturar a TAI PAPER SAC' },
    { nd: '20600400861', td: '6', nom: 'CORPORACIONES CAHUPER SRL', dir: '', notes: 'Para reparto' },
    { nd: '20481529531', td: '6', nom: 'INDUSTRIAS EL PRINCIPE', dir: '', notes: 'Factura a Industrias El Príncipe' },
    { nd: '20533307117', td: '6', nom: 'DIFMAR EIRL', dir: '', notes: 'Transporte Melariel para ILO' },
    { nd: '72427485', td: '1', nom: 'PEÑA ELITA', dir: 'AV. CULPON MZ A LOTE 5', notes: 'Boleta' },
    { nd: '48898278', td: '1', nom: 'CHOQUE CHOQUE LEANDRO', dir: 'CA. EL TRIUNFO #333 - JLO', notes: '' },
    { nd: '20440878394', td: '6', nom: 'COMERCIAL RICARDO Y MARILU EIRL', dir: 'ZONA IND. ANTIGUA MZ 227 LOTE 05', notes: '' },
    { nd: '10165330132', td: '6', nom: 'RAMOS MAQUERA ANGELICA', dir: '', notes: '' },
    { nd: '20487715302', td: '6', nom: 'COMERCIAL CEDICA EIRL', dir: '', notes: '' },
    { nd: '20608603787', td: '6', nom: 'MULTISERVICIO BETANIA EIRL', dir: '', notes: '' },
    { nd: '20612796964', td: '6', nom: 'LUKAT SAC', dir: '', notes: 'RUC para facturar y emitir guía' },
    { nd: '10737433540', td: '6', nom: 'EVARISTO LAMA JOSMAN ALEX', dir: '', notes: '' },
    { nd: '20603899785', td: '6', nom: 'PRODUCTOS E INVERSIONES SANCHEZ EIRL', dir: 'CALLE SALAS 215 3ER PISO JLO', notes: '' },
  ]
  console.log('Insertando...')

  // First try inserting with notes. If column doesn't exist, retry without.
  const rows = list.map(r => ({
    name: r.nom,
    num_documento: r.nd,
    dni: r.td === '1' ? r.nd : '',
    ruc: r.td === '6' ? r.nd : '',
    tipo_documento: r.td,
    address: r.dir,
  }))

  let res = await supabase.from('clientes').insert(rows)
  if (res.error) {
    console.error('Error:', res.error.message)
    return
  }
  console.log('OK')

  // Try adding notas per row (separate update, so if column missing it's not critical)
  console.log('Agregando notas donde hay...')
  for (const r of list) {
    if (!r.notes) continue
    const { error } = await supabase.from('clientes').update({ notas: r.notes }).eq('num_documento', r.nd)
    if (error && error.message?.includes('column')) {
      console.log('Columna notas no existe. Para agregarla, ejecuta en Supabase SQL Editor:')
      console.log("  alter table clientes add column if not exists notas text default '';")
      break
    }
  }

  const { count } = await supabase.from('clientes').select('*', { count: 'exact', head: true })
  console.log(`Total: ${count} clientes`)
})()
