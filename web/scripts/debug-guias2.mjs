import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Cargar .env.local manualmente
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env.local');
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  try {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim();
          if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = val;
          if (key === 'SUPABASE_SERVICE_ROLE_KEY') supabaseKey = val;
        }
      }
    }
  } catch (e) {
    console.error('No se pudo leer .env.local:', e.message);
    process.exit(1);
  }
}

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltan variables SUPABASE. Asegúrate de tener .env.local con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: guiasRaw, error } = await supabase
    .from('guias')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) { console.error('Error:', error); return; }

  console.log(`=== ${guiasRaw.length} guías en total ===\n`);

  for (const g of guiasRaw) {
    console.log('---');
    console.log('ID:', g.id);
    console.log('created_at:', g.created_at, '| updated_at:', g.updated_at, '| tipo_dato:', typeof g.updated_at);
    console.log('serie:', g.serie, '| numero:', g.numero);
    console.log('estado:', g.estado, '| estado_sunat:', g.estado_sunat);
    console.log('destinatario_nombre (col):', g.destinatario_nombre);
    console.log('punto_llegada (col):', g.punto_llegada);
    console.log('motivo_traslado (col):', g.motivo_traslado);
    console.log('punto_partida (col):', g.punto_partida);
    
    const dj = g.data_json || {};
    const djKeys = Object.keys(dj);
    console.log('data_json keys:', djKeys.length > 0 ? djKeys.join(', ') : '(VACÍO)');
    
    if (djKeys.length > 0) {
      for (const key of ['createdAt', 'destinatarioNombre', 'numeroCompleto', 'bienes', 'fechaEmision']) {
        if (key in dj) {
          console.log(`  data_json.${key}:`, typeof dj[key], Array.isArray(dj[key]) ? `[${dj[key].length} items]` : String(dj[key]).slice(0, 80));
        } else {
          console.log(`  data_json.${key}: AUSENTE`);
        }
      }
    }

    console.log('');
  }

  const sinData = guiasRaw.filter(g => !g.data_json || Object.keys(g.data_json).length < 3);
  console.log(`\n=== ${sinData.length} guías con data_json casi vacío ===`);
  
  console.log('\n=== VALORES null/undefined en columnas clave ===');
  const cols = ['serie', 'numero', 'created_at', 'updated_at', 'estado', 'destinatario_nombre', 'punto_llegada', 'motivo_traslado', 'data_json'];
  for (const col of cols) {
    const nulos = guiasRaw.filter(g => g[col] === null || g[col] === undefined);
    if (nulos.length > 0) {
      console.log(`⚠️ ${col}: ${nulos.length} guías con valor null/undefined`);
      for (const g of nulos) {
        console.log(`   - ${g.id.slice(0,8)}: ${col}=${JSON.stringify(g[col])}`);
      }
    } else {
      console.log(`✅ ${col}: todas las guías tienen valor`);
    }
  }
}

main().catch(console.error);
