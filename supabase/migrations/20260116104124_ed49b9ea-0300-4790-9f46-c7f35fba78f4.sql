-- =====================================================
-- OBSERVATION & VIOLATION MANAGEMENT WORKFLOW
-- Phase 1: Add new roles to app_role enum
-- =====================================================

-- Add new contractor workflow roles to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'contractor_consultant';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'contractor_site_representative';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'contract_controller';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'hsse_expert';