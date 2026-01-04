-- Phase 1: Database Schema Enhancements for Observation Reporting Module

-- 1.1: Add escalation & closure columns to incidents table
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS requires_escalation BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS escalation_reason TEXT,
  ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escalation_triggered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closure_notes TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_incidents_requires_escalation ON public.incidents(requires_escalation) WHERE requires_escalation = TRUE AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_incidents_violation_final_status ON public.incidents(violation_final_status) WHERE deleted_at IS NULL;

-- 1.2: Create contractor_violation_summary table for audit trail
CREATE TABLE IF NOT EXISTS public.contractor_violation_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  contractor_company_id UUID REFERENCES public.contractor_companies(id),
  violation_type_id UUID REFERENCES public.violation_types(id),
  
  -- Submission tracking
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES public.profiles(id),
  
  -- Dept Manager decision
  dept_manager_decision TEXT, -- 'approved', 'rejected', 'pending'
  dept_manager_decision_at TIMESTAMPTZ,
  dept_manager_decision_by UUID REFERENCES public.profiles(id),
  dept_manager_notes TEXT,
  
  -- Contract Controller decision
  contract_controller_decision TEXT,
  contract_controller_decision_at TIMESTAMPTZ,
  contract_controller_decision_by UUID REFERENCES public.profiles(id),
  contract_controller_notes TEXT,
  
  -- Contractor Rep acknowledgment
  contractor_rep_decision TEXT, -- 'acknowledged', 'disputed', 'pending'
  contractor_rep_decision_at TIMESTAMPTZ,
  contractor_rep_decision_by UUID REFERENCES public.profiles(id),
  contractor_rep_notes TEXT,
  
  -- HSSE decision
  hsse_decision TEXT,
  hsse_decision_at TIMESTAMPTZ,
  hsse_decision_by UUID REFERENCES public.profiles(id),
  hsse_notes TEXT,
  
  -- HSSE Validation (before closure)
  hsse_validated_at TIMESTAMPTZ,
  hsse_validated_by UUID REFERENCES public.profiles(id),
  hsse_validation_notes TEXT,
  
  -- Final status
  final_status TEXT, -- 'pending', 'approved', 'rejected', 'disputed', 'closed'
  was_escalated BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for contractor_violation_summary
CREATE INDEX IF NOT EXISTS idx_cvs_tenant ON public.contractor_violation_summary(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cvs_incident ON public.contractor_violation_summary(incident_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cvs_contractor ON public.contractor_violation_summary(contractor_company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cvs_final_status ON public.contractor_violation_summary(final_status) WHERE deleted_at IS NULL;

-- RLS for contractor_violation_summary
ALTER TABLE public.contractor_violation_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for contractor_violation_summary"
  ON public.contractor_violation_summary
  FOR ALL
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::UUID);

-- 1.3: Create system_alerts table for escalation notifications
CREATE TABLE IF NOT EXISTS public.system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  
  -- Alert classification
  alert_type TEXT NOT NULL, -- 'repeated_contractor_violations', 'sla_breach', 'pending_approval', etc.
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  
  -- Alert content
  title TEXT NOT NULL,
  description TEXT,
  
  -- Related entities
  related_contractor_id UUID REFERENCES public.contractor_companies(id),
  related_incident_id UUID REFERENCES public.incidents(id),
  related_user_id UUID REFERENCES public.profiles(id),
  
  -- Target audience
  target_role TEXT, -- 'hsse_manager', 'admin', etc.
  target_user_id UUID REFERENCES public.profiles(id),
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'acknowledged', 'resolved', 'dismissed'
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  resolution_notes TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for system_alerts
CREATE INDEX IF NOT EXISTS idx_alerts_tenant ON public.system_alerts(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.system_alerts(status) WHERE deleted_at IS NULL AND status = 'open';
CREATE INDEX IF NOT EXISTS idx_alerts_type ON public.system_alerts(alert_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_alerts_target_role ON public.system_alerts(target_role) WHERE deleted_at IS NULL AND status = 'open';
CREATE INDEX IF NOT EXISTS idx_alerts_target_user ON public.system_alerts(target_user_id) WHERE deleted_at IS NULL AND status = 'open';

-- RLS for system_alerts
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for system_alerts"
  ON public.system_alerts
  FOR ALL
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::UUID);

-- Trigger for updated_at on contractor_violation_summary
CREATE TRIGGER update_contractor_violation_summary_updated_at
  BEFORE UPDATE ON public.contractor_violation_summary
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on system_alerts
CREATE TRIGGER update_system_alerts_updated_at
  BEFORE UPDATE ON public.system_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();