import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdmin } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 })
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const results: string[] = []
    const errors: string[] = []

    const { data: buckets } = await supabase.storage.listBuckets()

    const bucketConfigs = [
      { name: 'productos', mimeTypes: ['image/jpeg', 'image/png', 'image/webp'], sizeLimit: 5242880 },
      { name: 'payment-evidence', mimeTypes: ['image/jpeg', 'image/png', 'image/webp'], sizeLimit: 5242880 },
    ]

    for (const bc of bucketConfigs) {
      const exists = buckets?.some(b => b.name === bc.name)
      if (exists) {
        results.push(`Bucket "${bc.name}" ya existe`)
      } else {
        const { error } = await supabase.storage.createBucket(bc.name, {
          public: true,
          allowedMimeTypes: bc.mimeTypes,
          fileSizeLimit: bc.sizeLimit,
        })
        if (error) errors.push(`Bucket "${bc.name}": ${error.message}`)
        else results.push(`Bucket "${bc.name}" creado`)
      }
    }

    const migrationSQL = `-- ============================================
-- Migración SQL para Maqui Mary
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================

-- Columnas faltantes en productos
alter table productos add column if not exists codigo text default '';
alter table productos add column if not exists precio_original numeric(10,2);
alter table productos add column if not exists imagen text default '';

-- Tabla movimientos_stock
create table if not exists movimientos_stock (
  id bigint generated always as identity primary key,
  producto_id bigint not null,
  tipo text not null check (tipo in ('entrada','salida')),
  cantidad int not null default 0,
  motivo text default '',
  created_at timestamptz default now()
);
create index if not exists idx_movimientos_producto on movimientos_stock(producto_id);
create index if not exists idx_movimientos_fecha on movimientos_stock(created_at desc);

-- Columna comprobante en facturas
alter table facturas add column if not exists payment_evidence_url text default '';

-- Columnas para login con alias en profiles
alter table profiles add column if not exists alias text default '';
alter table profiles add column if not exists generated_password text default '';
alter table profiles add column if not exists force_password_change boolean default false;

-- Storage policies para payment-evidence
insert into storage.buckets (id, name, public)
values ('payment-evidence', 'payment-evidence', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Public can view payment evidence') then
    create policy "Public can view payment evidence"
    on storage.objects for select
    using ( bucket_id = 'payment-evidence' );
  end if;
end $$;

-- Tabla de configuración del sitio
create table if not exists app_config (
  id int primary key default 1,
  settings jsonb not null default '{}',
  updated_at timestamptz default now(),
  constraint single_row check (id = 1)
);

-- Insertar fila por defecto si no existe
insert into app_config (id, settings)
values (1, '{
  "cintillo_timer_minutos": 5,
  "cintillo_messages": [
    {"icon": "🔥", "text": "El más vendido: {bestseller} — desde S/ {precio}"},
    {"icon": "⏱️", "text": "Llevas {timer} explorando — ¡Calidad y precio justo!"},
    {"icon": "🇵🇪", "text": "Hecho en Perú · Fabricación propia — Calidad que tu hogar merece"},
    {"icon": "⭐", "text": "5.0 estrellas · Más de 12,800 clientes nos respaldan"},
    {"icon": "💪", "text": "La mejor relación calidad-precio — ¡Agrega al carrito!"}
  ],
  "audio_bg_volumen": 0.025,
  "audio_bg_activo": true
}')
on conflict (id) do nothing;`

    return NextResponse.json({
      success: true,
      message: 'Buckets verificados. Las migraciones SQL deben ejecutarse manualmente.',
      results,
      errors: errors.length > 0 ? errors : undefined,
      sql: migrationSQL,
      note: 'Copia el SQL de arriba y pégalo en Supabase Dashboard > SQL Editor para completar la migración.',
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
