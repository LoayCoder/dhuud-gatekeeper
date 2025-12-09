-- Fix function search paths for SECURITY DEFINER functions
-- This prevents schema confusion attacks by explicitly setting search_path

-- Functions that already have search_path set are skipped
-- Adding explicit search_path to functions without it

-- update_updated_at_column needs search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- All other SECURITY DEFINER functions already have SET search_path = 'public' in this project
-- Based on the db-functions list, most functions are already secured

-- Note: This migration adds security hardening to the update_updated_at_column trigger function