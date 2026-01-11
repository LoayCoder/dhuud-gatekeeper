-- ================================================================
-- CONTRACTOR GOVERNANCE MIGRATION
-- Phase 1: Roles + Phase 2-4: Approval Workflow Columns
-- ================================================================

-- ----------------------------------------------------------------
-- PHASE 1: Create Missing Roles
-- ----------------------------------------------------------------

-- Create contractor_consultant role
INSERT INTO roles (id, code, name, category, description, module_access, is_active, sort_order)
VALUES (
  gen_random_uuid(),
  'contractor_consultant',
  'Contractor Consultant',
  'contractor',
  'Can create companies/projects, request and approve gate passes for assigned companies',
  ARRAY['contractors', 'contractor_companies', 'contractor_projects', 'contractor_gate_passes'],
  true,
  15
)
ON CONFLICT (code) DO NOTHING;

-- Create client_site_rep role
INSERT INTO roles (id, code, name, category, description, module_access, is_active, sort_order)
VALUES (
  gen_random_uuid(),
  'client_site_rep',
  'Client Site Representative',
  'contractor',
  'View-only access to assigned contractor companies, projects, workers, and gate passes',
  ARRAY['contractors'],
  true,
  16
)
ON CONFLICT (code) DO NOTHING;

-- Create contractor_admin role if not exists
INSERT INTO roles (id, code, name, category, description, module_access, is_active, sort_order)
VALUES (
  gen_random_uuid(),
  'contractor_admin',
  'Contractor Admin',
  'contractor',
  'Full CRUD on contractor module, can approve workers and manage all contractor operations',
  ARRAY['contractors', 'contractor_companies', 'contractor_projects', 'contractor_workers', 'contractor_gate_passes', 'contractor_settings'],
  true,
  14
)
ON CONFLICT (code) DO NOTHING;

-- ----------------------------------------------------------------
-- PHASE 2: Company Approval Workflow Columns
-- ----------------------------------------------------------------

-- Add approval columns to contractor_companies
ALTER TABLE contractor_companies 
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending_approval',
ADD COLUMN IF NOT EXISTS approval_requested_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Update existing companies to 'approved' status (grandfathering)
UPDATE contractor_companies 
SET approval_status = 'approved', approved_at = created_at
WHERE approval_status IS NULL OR approval_status = 'pending_approval';

-- ----------------------------------------------------------------
-- PHASE 3: Worker Security Approval Stage
-- ----------------------------------------------------------------

-- Add security approval columns to contractor_workers
ALTER TABLE contractor_workers
ADD COLUMN IF NOT EXISTS security_approval_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS security_approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS security_approved_at timestamptz,
ADD COLUMN IF NOT EXISTS security_rejection_reason text;

-- Update existing approved workers to have security approval
UPDATE contractor_workers 
SET security_approval_status = 'approved', security_approved_at = approved_at
WHERE approval_status = 'approved' AND security_approval_status = 'pending';

-- ----------------------------------------------------------------
-- PHASE 4: Gate Pass Dual Path Columns
-- ----------------------------------------------------------------

-- Add dual approval path columns to material_gate_passes
ALTER TABLE material_gate_passes
ADD COLUMN IF NOT EXISTS is_internal_request boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS contractor_approval_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS contractor_approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS contractor_approved_at timestamptz,
ADD COLUMN IF NOT EXISTS contractor_approval_notes text,
ADD COLUMN IF NOT EXISTS security_approval_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS security_approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS security_approved_at timestamptz,
ADD COLUMN IF NOT EXISTS security_approval_notes text;

-- Update existing gate passes based on current status
UPDATE material_gate_passes
SET 
  contractor_approval_status = CASE 
    WHEN status IN ('pending_safety_approval', 'approved', 'completed') THEN 'approved'
    WHEN status = 'rejected' THEN 'rejected'
    ELSE 'pending'
  END,
  security_approval_status = CASE 
    WHEN status IN ('approved', 'completed') THEN 'approved'
    ELSE 'pending'
  END
WHERE contractor_approval_status = 'pending';

-- ----------------------------------------------------------------
-- Create helper functions for role checking (no deleted_at check)
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.has_contractor_consultant_access(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = p_user_id
      AND r.code = 'contractor_consultant'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_contractor_admin_access(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = p_user_id
      AND r.code = 'contractor_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_client_site_rep_access(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM contractor_companies cc
    WHERE cc.client_site_rep_id = p_user_id
      AND cc.deleted_at IS NULL
  );
$$;