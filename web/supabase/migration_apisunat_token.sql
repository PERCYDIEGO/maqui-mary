-- Agrega columnas para token APISUNAT.pe
-- Ejecutar en: https://app.supabase.com/project/ofemdngaslpdexsqfcbb/sql/new

alter table sunat_config
  add column if not exists apisunat_token text default '',
  add column if not exists apisunat_environment text default 'sandbox' check (apisunat_environment in ('sandbox', 'produccion'));

update sunat_config
set apisunat_environment = coalesce(apisunat_environment, 'sandbox')
where id = 1;
