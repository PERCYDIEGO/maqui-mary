/**
 * Seed tarifas de delivery desde Lurigancho (dirección RUC Maqui Mary)
 * Pro. Quinta Avenida Mza. J Lote 17-B — Lurigancho, Lima
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Zonas ordenadas por tarifa, partiendo desde Lurigancho (RUC Maqui Mary)
const ZONAS = [
  // ─── Recojo / Mismo sector ──────────────────────────────────
  { distrito: 'Lurigancho',              tarifa:  0.00, tiempo: 'Recojo en tienda' },
  { distrito: 'Lurigancho-Chosica',      tarifa:  3.00, tiempo: 'Mismo día' },
  { distrito: 'Chaclacayo',              tarifa:  5.00, tiempo: 'Mismo día' },

  // ─── Zona 1: Este Lima ──────────────────────────────────────
  { distrito: 'Ate',                     tarifa:  5.00, tiempo: 'Mismo día' },
  { distrito: 'Ate Vitarte',             tarifa:  5.00, tiempo: 'Mismo día' },
  { distrito: 'San Juan de Lurigancho',  tarifa:  7.00, tiempo: 'Mismo día' },
  { distrito: 'Santa Anita',             tarifa:  7.00, tiempo: 'Mismo día' },
  { distrito: 'Cieneguilla',             tarifa:  8.00, tiempo: '1 día hábil' },
  { distrito: 'El Agustino',             tarifa:  9.00, tiempo: '1 día hábil' },

  // ─── Zona 2: Centro Lima ────────────────────────────────────
  { distrito: 'Lima',                    tarifa: 10.00, tiempo: '1 día hábil' },
  { distrito: 'Cercado de Lima',         tarifa: 10.00, tiempo: '1 día hábil' },
  { distrito: 'Rímac',                   tarifa: 10.00, tiempo: '1 día hábil' },
  { distrito: 'La Victoria',             tarifa: 10.00, tiempo: '1 día hábil' },
  { distrito: 'San Luis',                tarifa: 10.00, tiempo: '1 día hábil' },
  { distrito: 'Breña',                   tarifa: 11.00, tiempo: '1 día hábil' },
  { distrito: 'Lince',                   tarifa: 12.00, tiempo: '1 día hábil' },
  { distrito: 'La Molina',               tarifa: 12.00, tiempo: '1 día hábil' },
  { distrito: 'San Borja',               tarifa: 12.00, tiempo: '1 día hábil' },
  { distrito: 'Surquillo',               tarifa: 12.00, tiempo: '1-2 días hábiles' },
  { distrito: 'Jesús María',             tarifa: 12.00, tiempo: '1-2 días hábiles' },
  { distrito: 'Magdalena del Mar',       tarifa: 12.00, tiempo: '1-2 días hábiles' },
  { distrito: 'Pueblo Libre',            tarifa: 12.00, tiempo: '1-2 días hábiles' },
  { distrito: 'San Miguel',              tarifa: 12.00, tiempo: '1-2 días hábiles' },

  // ─── Zona 3: Lima Norte ─────────────────────────────────────
  { distrito: 'Independencia',           tarifa: 12.00, tiempo: '1-2 días hábiles' },
  { distrito: 'San Martín de Porres',    tarifa: 13.00, tiempo: '1-2 días hábiles' },
  { distrito: 'Los Olivos',              tarifa: 13.00, tiempo: '1-2 días hábiles' },
  { distrito: 'Comas',                   tarifa: 14.00, tiempo: '1-2 días hábiles' },

  // ─── Zona 4: Lima Moderna / Callao ──────────────────────────
  { distrito: 'Miraflores',              tarifa: 15.00, tiempo: '1-2 días hábiles' },
  { distrito: 'San Isidro',              tarifa: 15.00, tiempo: '1-2 días hábiles' },
  { distrito: 'Santiago de Surco',       tarifa: 15.00, tiempo: '1-2 días hábiles' },
  { distrito: 'Barranco',                tarifa: 15.00, tiempo: '1-2 días hábiles' },
  { distrito: 'Callao',                  tarifa: 15.00, tiempo: '1-2 días hábiles' },

  // ─── Zona 5: Periferia Norte/Sur ────────────────────────────
  { distrito: 'Chorrillos',              tarifa: 18.00, tiempo: '2 días hábiles' },
  { distrito: 'San Juan de Miraflores',  tarifa: 18.00, tiempo: '2 días hábiles' },
  { distrito: 'Villa María del Triunfo', tarifa: 18.00, tiempo: '2 días hábiles' },
  { distrito: 'Carabayllo',              tarifa: 18.00, tiempo: '2 días hábiles' },
  { distrito: 'Puente Piedra',           tarifa: 18.00, tiempo: '2 días hábiles' },
  { distrito: 'Villa El Salvador',       tarifa: 20.00, tiempo: '2 días hábiles' },
  { distrito: 'Ventanilla',              tarifa: 20.00, tiempo: '2 días hábiles' },
  { distrito: 'Mi Perú',                 tarifa: 20.00, tiempo: '2 días hábiles' },

  // ─── Zona 6: Sur Lima Lejano ────────────────────────────────
  { distrito: 'Lurín',                   tarifa: 22.00, tiempo: '2-3 días hábiles' },
  { distrito: 'Pachacámac',              tarifa: 22.00, tiempo: '2-3 días hábiles' },
  { distrito: 'Ancón',                   tarifa: 22.00, tiempo: '2-3 días hábiles' },
  { distrito: 'Santa Rosa',              tarifa: 22.00, tiempo: '2-3 días hábiles' },
  { distrito: 'Punta Hermosa',           tarifa: 25.00, tiempo: '2-3 días hábiles' },
  { distrito: 'Punta Negra',             tarifa: 25.00, tiempo: '2-3 días hábiles' },
  { distrito: 'San Bartolo',             tarifa: 25.00, tiempo: '2-3 días hábiles' },
  { distrito: 'Santa María del Mar',     tarifa: 28.00, tiempo: '3 días hábiles' },
  { distrito: 'Pucusana',                tarifa: 28.00, tiempo: '3 días hábiles' },
]

async function main() {
  console.log('🚚 Seed de tarifas de delivery — desde Lurigancho (RUC Maqui Mary)\n')

  // Verificar conexión
  const { error: pingErr } = await supabase.from('zonas_delivery').select('id').limit(1)
  if (pingErr && pingErr.code === '42P01') {
    console.error('❌ La tabla zonas_delivery no existe aún.')
    console.error('   Ejecuta primero la migración SQL en:')
    console.error('   https://app.supabase.com/project/ofemdngaslpdexsqfcbb/sql/new')
    console.error('   Archivo: supabase/migration_delivery.sql\n')
    process.exit(1)
  }

  // Limpiar registros actuales
  const { error: delErr } = await supabase.from('zonas_delivery').delete().gte('id', 0)
  if (delErr) { console.error('❌ Error limpiando tabla:', delErr.message); process.exit(1) }
  console.log('🧹 Registros anteriores eliminados\n')

  // Insertar todas las zonas
  const rows = ZONAS.map(z => ({
    distrito: z.distrito,
    tarifa: z.tarifa,
    tiempo_estimado: z.tiempo,
    activo: true,
  }))

  const { data, error } = await supabase.from('zonas_delivery').insert(rows).select()

  if (error) {
    console.error('❌ Error insertando zonas:', error.message)
    process.exit(1)
  }

  // Mostrar resumen
  for (const z of ZONAS) {
    const tarifaStr = z.tarifa === 0 ? 'S/ 0.00 (recojo)' : `S/ ${z.tarifa.toFixed(2)}`
    console.log(`  ✓ ${z.distrito.padEnd(28)} ${tarifaStr.padEnd(22)} ${z.tiempo}`)
  }

  console.log(`\n✅ ${ZONAS.length} zonas cargadas correctamente`)
  console.log('📍 Origen: Lurigancho — Pro. Quinta Avenida Mza. J Lote 17-B')
  console.log('🌐 Ver en: https://maquimary.vercel.app/crm/configuracion\n')
}

main().catch(e => { console.error('❌ Error fatal:', e.message); process.exit(1) })
