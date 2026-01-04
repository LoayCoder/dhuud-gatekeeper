-- =====================================================
-- INCIDENT REPORTING MODULE: DATABASE SCHEMA (Session 1)
-- =====================================================

-- Task 1.1: Add Investigation-Contractor Violation Columns
ALTER TABLE public.investigations
ADD COLUMN IF NOT EXISTS violation_identified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS violation_type_id UUID REFERENCES public.violation_types(id),
ADD COLUMN IF NOT EXISTS violation_occurrence INTEGER,
ADD COLUMN IF NOT EXISTS violation_evidence_summary TEXT,
ADD COLUMN IF NOT EXISTS violation_submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS violation_submitted_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS root_cause_contractor_related BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS contractor_contribution_percentage INTEGER;

-- Add check constraint for contribution percentage
ALTER TABLE public.investigations
ADD CONSTRAINT investigations_contractor_contribution_percentage_check 
CHECK (contractor_contribution_percentage IS NULL OR (contractor_contribution_percentage >= 0 AND contractor_contribution_percentage <= 100));

-- Task 1.2: Add Incident Closure Prerequisites Columns
ALTER TABLE public.incidents
ADD COLUMN IF NOT EXISTS investigation_complete BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS investigation_approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS investigation_approved_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS all_actions_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ready_for_closure BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS closure_prerequisites_met_at TIMESTAMPTZ;

-- Task 1.3: Create incident_violation_lifecycle Table
CREATE TABLE IF NOT EXISTS public.incident_violation_lifecycle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  incident_id UUID NOT NULL REFERENCES public.incidents(id),
  investigation_id UUID NOT NULL REFERENCES public.investigations(id),
  contractor_company_id UUID NOT NULL REFERENCES public.contractor_companies(id),
  
  -- Violation Details
  violation_type_id UUID REFERENCES public.violation_types(id),
  violation_occurrence INTEGER NOT NULL DEFAULT 1,
  violation_evidence_summary TEXT,
  root_cause_summary TEXT,
  contractor_contribution_percentage INTEGER CHECK (contractor_contribution_percentage >= 0 AND contractor_contribution_percentage <= 100),
  
  -- Identification Phase (by Investigator)
  identified_at TIMESTAMPTZ,
  identified_by UUID REFERENCES public.profiles(id),
  
  -- Submission Phase
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES public.profiles(id),
  
  -- Department Manager Approval
  dept_manager_status TEXT DEFAULT 'pending' CHECK (dept_manager_status IN ('pending', 'approved', 'rejected', 'escalated')),
  dept_manager_id UUID REFERENCES public.profiles(id),
  dept_manager_decision_at TIMESTAMPTZ,
  dept_manager_notes TEXT,
  
  -- Contract Controller Approval
  contract_controller_status TEXT DEFAULT 'pending' CHECK (contract_controller_status IN ('pending', 'approved', 'rejected', 'escalated')),
  contract_controller_id UUID REFERENCES public.profiles(id),
  contract_controller_decision_at TIMESTAMPTZ,
  contract_controller_notes TEXT,
  
  -- Contractor Representative Response
  contractor_rep_status TEXT DEFAULT 'pending' CHECK (contractor_rep_status IN ('pending', 'acknowledged', 'disputed')),
  contractor_rep_id UUID REFERENCES public.profiles(id),
  contractor_rep_response_at TIMESTAMPTZ,
  contractor_rep_notes TEXT,
  dispute_reason TEXT,
  
  -- HSSE Manager Final Review (for disputes or escalations)
  hsse_manager_status TEXT DEFAULT 'pending' CHECK (hsse_manager_status IN ('pending', 'approved', 'rejected', 'returned')),
  hsse_manager_id UUID REFERENCES public.profiles(id),
  hsse_manager_decision_at TIMESTAMPTZ,
  hsse_manager_notes TEXT,
  
  -- Escalation Tracking
  escalation_level INTEGER DEFAULT 0,
  escalated_at TIMESTAMPTZ,
  escalation_reason TEXT,
  
  -- Final Status
  final_status TEXT DEFAULT 'pending' CHECK (final_status IN ('pending', 'in_progress', 'finalized', 'cancelled', 'disputed')),
  finalized_at TIMESTAMPTZ,
  finalized_by UUID REFERENCES public.profiles(id),
  
  -- Penalty Applied
  penalty_applied BOOLEAN DEFAULT FALSE,
  penalty_percentage NUMERIC(5,2),
  penalty_amount NUMERIC(12,2),
  penalty_currency TEXT DEFAULT 'SAR',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Create indexes for incident_violation_lifecycle
CREATE INDEX IF NOT EXISTS idx_incident_violation_lifecycle_tenant ON public.incident_violation_lifecycle(tenant_id);
CREATE INDEX IF NOT EXISTS idx_incident_violation_lifecycle_incident ON public.incident_violation_lifecycle(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_violation_lifecycle_investigation ON public.incident_violation_lifecycle(investigation_id);
CREATE INDEX IF NOT EXISTS idx_incident_violation_lifecycle_contractor ON public.incident_violation_lifecycle(contractor_company_id);
CREATE INDEX IF NOT EXISTS idx_incident_violation_lifecycle_status ON public.incident_violation_lifecycle(final_status);
CREATE INDEX IF NOT EXISTS idx_incident_violation_lifecycle_deleted ON public.incident_violation_lifecycle(deleted_at) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE public.incident_violation_lifecycle ENABLE ROW LEVEL SECURITY;

-- RLS Policies for incident_violation_lifecycle
CREATE POLICY "Users can view incident violations in their tenant"
ON public.incident_violation_lifecycle
FOR SELECT
USING (
  deleted_at IS NULL AND
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Authenticated users can insert incident violations in their tenant"
ON public.incident_violation_lifecycle
FOR INSERT
WITH CHECK (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can update incident violations in their tenant"
ON public.incident_violation_lifecycle
FOR UPDATE
USING (
  deleted_at IS NULL AND
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- Trigger for updated_at
CREATE TRIGGER update_incident_violation_lifecycle_updated_at
BEFORE UPDATE ON public.incident_violation_lifecycle
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.incident_violation_lifecycle IS 'Tracks contractor violations identified during incident investigations, separate from observation violations';
COMMENT ON COLUMN public.incident_violation_lifecycle.contractor_contribution_percentage IS 'Percentage of contractor contribution to root cause (0-100)';
COMMENT ON COLUMN public.incident_violation_lifecycle.violation_occurrence IS 'Nth occurrence of this violation type for this contractor';