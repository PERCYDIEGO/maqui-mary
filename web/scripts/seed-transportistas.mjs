import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ofemdngaslpdexsqfcbb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mZW1kbmdhc2xwZGV4c3FmY2JiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQzMTI4NSwiZXhwIjoyMDk0MDA3Mjg1fQ.Fc-LpbvWlkYJlrOT69IhaXsYoZlgKExDbq3EAoZPITM'
);

const transportistas = [
  {
    nombres: 'CARLOS ALBERTO',
    apellidos: 'QUISPE MAMANI',
    dni: '42315678',
    licencia_conducir: 'Q42315678',
    numero_placa: 'ABC-123',
    activo: true,
  },
  {
    nombres: 'JUAN PEDRO',
    apellidos: 'FLORES HUANCA',
    dni: '47823156',
    licencia_conducir: 'F47823156',
    numero_placa: 'DEF-456',
    activo: true,
  },
  {
    nombres: 'ROBERTO MIGUEL',
    apellidos: 'SALINAS VEGA',
    dni: '31245987',
    licencia_conducir: 'S31245987',
    numero_placa: 'GHI-789',
    activo: true,
  },
  {
    nombres: 'EDGAR RAUL',
    apellidos: 'MENDOZA CCARI',
    dni: '46012345',
    licencia_conducir: 'M46012345',
    numero_placa: 'JKL-321',
    activo: true,
  },
  {
    nombres: 'LUIS ENRIQUE',
    apellidos: 'TAPIA CONDORI',
    dni: '29876543',
    licencia_conducir: 'T29876543',
    numero_placa: 'MNO-654',
    activo: false,
  },
];

async function seed() {
  console.log('Verificando transportistas existentes...');
  const { data: existentes } = await supabase.from('transportistas').select('numero_placa');
  const placasExistentes = new Set((existentes || []).map(t => t.numero_placa));

  const nuevos = transportistas.filter(t => !placasExistentes.has(t.numero_placa));

  if (nuevos.length === 0) {
    console.log('Todos los transportistas ya existen. Nada que insertar.');
    return;
  }

  console.log(`Insertando ${nuevos.length} transportistas...`);
  const { data, error } = await supabase.from('transportistas').insert(nuevos).select();

  if (error) {
    console.error('Error al insertar:', error.message);
    process.exit(1);
  }

  console.log(`✓ ${data.length} transportistas insertados:`);
  data.forEach(t => console.log(`  - ${t.nombre_completo} | ${t.numero_placa}`));
}

seed();
