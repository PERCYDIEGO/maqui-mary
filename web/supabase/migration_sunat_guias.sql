-- Agrega campos de Guía de Remisión a sunat_config
-- Copiar y pegar en Supabase Dashboard > SQL Editor > New Query

alter table sunat_config
  add column if not exists series_guia text default 'T001',
  add column if not exists next_number_guia bigint default 1;

-- Actualizar la fila existente si ya hay valores NULL
update sunat_config
set series_guia = coalesce(series_guia, 'T001'),
    next_number_guia = coalesce(next_number_guia, 1)
where id = 1;
