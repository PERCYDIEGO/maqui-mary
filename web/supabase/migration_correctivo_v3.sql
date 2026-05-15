-- ============================================================
-- MIGRACIÓN v3: Roles + trazabilidad de documentos
-- ============================================================

-- ============================================================
-- 1. CORREGIR ROLES: alinear frontend con BD
-- ============================================================

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('admin', 'editor', 'viewer'));
update profiles set role = 'editor' where role = 'vendedor';
update profiles set role = 'viewer' where role = 'almacen';
alter table profiles alter column role set default 'editor';

-- ============================================================
-- 2. TRAZABILIDAD: creador + datos completos del documento
-- ============================================================

alter table facturas add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table facturas add column if not exists data_json jsonb default '{}';
