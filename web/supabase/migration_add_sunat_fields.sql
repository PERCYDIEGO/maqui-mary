-- Migración: Campos adicionales para emisión electrónica SUNAT
-- Ejecutar en SQL Editor de Supabase

alter table if exists facturas
  add column if not exists forma_pago text default 'contado' check (forma_pago in ('contado', 'credito')),
  add column if not exists moneda text default 'PEN' check (moneda in ('PEN', 'USD')),
  add column if not exists tipo_cambio numeric(10,3) default null,
  add column if not exists guia_remision text default '',
  add column if not exists orden_compra text default '',
  add column if not exists hash text default '',
  add column if not exists cdr_codigo text default '',
  add column if not exists cdr_descripcion text default '',
  add column if not exists firma_digest text default '';
