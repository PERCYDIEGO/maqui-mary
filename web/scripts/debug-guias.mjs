import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltan variables NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('guias')
    .select('id, created_at, estado, serie, numero, data_json');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('=== GUÍAS EN DB (' + data.length + ' registros) ===\n');

  for (const g of data) {
    const dj = g.data_json || {};
    console.log('ID:', g.id);
    console.log('  created_at (columna):', g.created_at, '| typeof:', typeof g.created_at);
    console.log('  estado:', g.estado);
    console.log('  serie/numero:', g.serie, '-', g.numero);

    // Verificar created_at
    if (g.created_at === null || g.created_at === undefined) {
      console.log('  *** CRASH: created_at es', g.created_at);
    } else {
      try {
        const d = new Date(g.created_at);
        d.toLocaleDateString();
        console.log('  ✓ created_at fecha válida');
      } catch (e) {
        console.log('  *** CRASH: new Date(created_at) lanza:', e.message);
      }
    }

    // Verificar fechaEmision en data_json
    const fe = dj.fechaEmision;
    console.log('  data_json.fechaEmision:', fe, '| typeof:', typeof fe);
    if (fe !== undefined && fe !== null) {
      // Podría ser string (ISO) o Date (si reviveDates ya fue aplicado)
      if (typeof fe === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(fe)) {
        console.log('  ✓ fechaEmision string ISO válida');
      } else if (typeof fe === 'object') {
        // Si es objeto, podría ser Date o algo más
        console.log('  ⚠ fechaEmision es objeto:', fe.constructor.name);
      } else {
        console.log('  *** fechaEmision formato inesperado:', typeof fe, fe);
      }
    } else {
      console.log('  ⚠ fechaEmision ausente en data_json (no crash en list page, sí en sunat/PDF)');
    }

    // Verificar fechaInicioTraslado
    const fit = dj.fechaInicioTraslado;
    if (!fit) {
      console.log('  ⚠ fechaInicioTraslado ausente en data_json');
    }

    // Verificar destinatarioNombre
    if (!dj.destinatarioNombre) {
      console.log('  ⚠ destinatarioNombre ausente en data_json');
    }

    // Verificar bienes
    if (!dj.bienes || !Array.isArray(dj.bienes)) {
      console.log('  ⚠ bienes ausente/no-array en data_json');
    }

    console.log('');
  }

  console.log('=== VERIFICACIÓN DE TODOS created_at ===');
  const todosValidos = data.every(g => {
    if (!g.created_at) return false;
    try { new Date(g.created_at).toISOString(); return true; }
    catch { return false; }
  });
  console.log('¿Todos los created_at son válidos?', todosValidos ? 'SÍ ✅' : 'NO ❌');
}

main().catch(console.error);
