-- =====================================================
-- SECURITY WORKFORCE COMMAND - ADD SECURITY ROLES
-- =====================================================

-- 1. Add security roles to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'security_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'security_supervisor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'security_guard';