-- Fix: permitir lectura pública de profiles
-- Necesario para que las políticas RLS de otras tablas (sunat_config, configuracion)
-- puedan verificar el rol del usuario via subquery a profiles.
-- Ejecutar en: Supabase Dashboard → SQL Editor

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'profiles_public_read'
  ) THEN
    CREATE POLICY "profiles_public_read"
    ON profiles FOR SELECT
    USING (true);
  END IF;
END $$;
