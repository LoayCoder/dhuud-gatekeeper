
-- =============================================
-- Phase 1: Create project_mobilizations table
-- =============================================
CREATE TABLE public.project_mobilizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  project_id UUID NOT NULL REFERENCES contractor_projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  mobilization_percentage INTEGER NOT NULL DEFAULT 0,
  pre_checks_completed BOOLEAN NOT NULL DEFAULT false,
  site_clearance_approved BOOLEAN NOT NULL DEFAULT false,
  risk_assessment_required BOOLEAN NOT NULL DEFAULT true,
  ptw_enabled BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_mobilization_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'in_progress', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid mobilization status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_mobilization_status
  BEFORE INSERT OR UPDATE ON public.project_mobilizations
  FOR EACH ROW EXECUTE FUNCTION public.validate_mobilization_status();

-- Unique constraint: one mobilization per project (soft-delete aware)
CREATE UNIQUE INDEX uq_project_mobilizations_project 
  ON public.project_mobilizations (project_id) 
  WHERE deleted_at IS NULL;

-- Indexes
CREATE INDEX idx_project_mobilizations_tenant ON public.project_mobilizations(tenant_id);
CREATE INDEX idx_project_mobilizations_project ON public.project_mobilizations(project_id);
CREATE INDEX idx_project_mobilizations_status ON public.project_mobilizations(status);

-- RLS
ALTER TABLE public.project_mobilizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for project_mobilizations"
  ON public.project_mobilizations
  FOR ALL
  TO authenticated
  USING (tenant_id = get_auth_tenant_id())
  WITH CHECK (tenant_id = get_auth_tenant_id());

-- Updated_at trigger
CREATE TRIGGER update_project_mobilizations_updated_at
  BEFORE UPDATE ON public.project_mobilizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Phase 2: Add mobilization_id to dependent tables
-- =============================================

-- ptw_clearance_checks: add mobilization_id
ALTER TABLE public.ptw_clearance_checks 
  ADD COLUMN mobilization_id UUID REFERENCES project_mobilizations(id) ON DELETE CASCADE;

CREATE INDEX idx_ptw_clearance_checks_mobilization ON public.ptw_clearance_checks(mobilization_id);

-- project_clearance_execution: add mobilization_id
ALTER TABLE public.project_clearance_execution
  ADD COLUMN mobilization_id UUID REFERENCES project_mobilizations(id) ON DELETE CASCADE;

CREATE INDEX idx_project_clearance_exec_mobilization ON public.project_clearance_execution(mobilization_id);

-- ptw_permits: add mobilization_id + contractor_project_id
ALTER TABLE public.ptw_permits
  ADD COLUMN mobilization_id UUID REFERENCES project_mobilizations(id),
  ADD COLUMN contractor_project_id UUID REFERENCES contractor_projects(id);

CREATE INDEX idx_ptw_permits_mobilization ON public.ptw_permits(mobilization_id);
CREATE INDEX idx_ptw_permits_contractor_project ON public.ptw_permits(contractor_project_id);

-- =============================================
-- Phase 3: Clean up orphaned data
-- The existing ptw_project has no linked contractor_project,
-- so we soft-delete the orphaned clearance checks
-- =============================================
UPDATE public.ptw_clearance_checks 
SET deleted_at = now() 
WHERE project_id = '8439b57f-075b-41f0-b2a1-ba999ae96205' 
AND deleted_at IS NULL;

-- =============================================
-- Phase 4: Drop old FK constraints (make project_id nullable for transition)
-- We keep the columns but remove the FK to ptw_projects
-- =============================================

-- ptw_clearance_checks: drop FK to ptw_projects
ALTER TABLE public.ptw_clearance_checks 
  DROP CONSTRAINT IF EXISTS ptw_clearance_checks_project_id_fkey;

-- ptw_permits: drop FK to ptw_projects
ALTER TABLE public.ptw_permits
  DROP CONSTRAINT IF EXISTS ptw_permits_project_id_fkey;

-- ptw_audit_logs: drop FK to ptw_projects
ALTER TABLE public.ptw_audit_logs
  DROP CONSTRAINT IF EXISTS ptw_audit_logs_project_id_fkey;

-- project_clearance_execution: drop FK to ptw_projects
ALTER TABLE public.project_clearance_execution
  DROP CONSTRAINT IF EXISTS project_clearance_execution_project_id_fkey;

-- Make old project_id columns nullable since they're now orphaned
ALTER TABLE public.ptw_clearance_checks ALTER COLUMN project_id DROP NOT NULL;
ALTER TABLE public.ptw_permits ALTER COLUMN project_id DROP NOT NULL;
