-- ============================================
-- KPI AUDIT LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.kpi_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kpi_target_id UUID REFERENCES public.kpi_targets(id) ON DELETE SET NULL,
  kpi_code TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('created', 'updated', 'deleted')),
  old_value JSONB,
  new_value JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  notes TEXT,
  deleted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.kpi_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kpi_audit_logs
CREATE POLICY "Users can view their tenant's KPI audit logs"
  ON public.kpi_audit_logs
  FOR SELECT
  USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "Users can insert audit logs for their tenant"
  ON public.kpi_audit_logs
  FOR INSERT
  WITH CHECK (tenant_id = get_auth_tenant_id());

-- Index for performance
CREATE INDEX idx_kpi_audit_logs_tenant_id ON public.kpi_audit_logs(tenant_id);
CREATE INDEX idx_kpi_audit_logs_kpi_code ON public.kpi_audit_logs(kpi_code);
CREATE INDEX idx_kpi_audit_logs_changed_at ON public.kpi_audit_logs(changed_at DESC);

-- ============================================
-- SEED DEFAULT KPI TARGETS (if empty)
-- ============================================
-- Note: This uses a DO block to conditionally insert only if no targets exist
-- We'll insert for a placeholder tenant - actual tenant assignment happens via app logic

-- Add is_active column to kpi_targets if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'kpi_targets' 
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.kpi_targets ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Add description column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'kpi_targets' 
    AND column_name = 'description'
  ) THEN
    ALTER TABLE public.kpi_targets ADD COLUMN description TEXT;
  END IF;
END $$;

-- Add comparison_type column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'kpi_targets' 
    AND column_name = 'comparison_type'
  ) THEN
    ALTER TABLE public.kpi_targets ADD COLUMN comparison_type TEXT DEFAULT 'less_than' CHECK (comparison_type IN ('less_than', 'greater_than'));
  END IF;
END $$;

-- Function to seed default KPI targets for a tenant
CREATE OR REPLACE FUNCTION public.seed_default_kpi_targets(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only seed if tenant has no KPI targets
  IF NOT EXISTS (SELECT 1 FROM kpi_targets WHERE tenant_id = p_tenant_id AND deleted_at IS NULL) THEN
    INSERT INTO kpi_targets (tenant_id, kpi_code, target_value, warning_threshold, critical_threshold, comparison_type, description, is_active) VALUES
      (p_tenant_id, 'trir', 2.0, 1.5, 2.5, 'less_than', 'Total Recordable Incident Rate per 200,000 man-hours', true),
      (p_tenant_id, 'ltifr', 1.0, 0.8, 1.5, 'less_than', 'Lost Time Injury Frequency Rate per 1,000,000 man-hours', true),
      (p_tenant_id, 'dart_rate', 1.5, 1.0, 2.0, 'less_than', 'Days Away, Restricted, or Transferred rate per 200,000 man-hours', true),
      (p_tenant_id, 'fatality_rate', 0, 0, 0.01, 'less_than', 'Fatalities per 200,000 man-hours - target is always zero', true),
      (p_tenant_id, 'severity_rate', 10, 8, 15, 'less_than', 'Average lost days per recordable incident', true),
      (p_tenant_id, 'near_miss_rate', 50, 30, 20, 'greater_than', 'Near miss reporting rate - higher indicates better safety culture', true),
      (p_tenant_id, 'action_closure_pct', 90, 80, 70, 'greater_than', 'Percentage of corrective actions closed on time', true),
      (p_tenant_id, 'observation_completion_pct', 85, 75, 60, 'greater_than', 'Percentage of safety observations resolved', true);
  END IF;
END;
$$;

-- Create trigger function to auto-log KPI changes
CREATE OR REPLACE FUNCTION public.log_kpi_target_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO kpi_audit_logs (tenant_id, kpi_target_id, kpi_code, action_type, new_value, changed_by)
    VALUES (
      NEW.tenant_id,
      NEW.id,
      NEW.kpi_code,
      'created',
      jsonb_build_object(
        'target_value', NEW.target_value,
        'warning_threshold', NEW.warning_threshold,
        'critical_threshold', NEW.critical_threshold
      ),
      auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only log if actual values changed
    IF OLD.target_value IS DISTINCT FROM NEW.target_value 
       OR OLD.warning_threshold IS DISTINCT FROM NEW.warning_threshold
       OR OLD.critical_threshold IS DISTINCT FROM NEW.critical_threshold
       OR OLD.is_active IS DISTINCT FROM NEW.is_active THEN
      INSERT INTO kpi_audit_logs (tenant_id, kpi_target_id, kpi_code, action_type, old_value, new_value, changed_by)
      VALUES (
        NEW.tenant_id,
        NEW.id,
        NEW.kpi_code,
        CASE WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN 'deleted' ELSE 'updated' END,
        jsonb_build_object(
          'target_value', OLD.target_value,
          'warning_threshold', OLD.warning_threshold,
          'critical_threshold', OLD.critical_threshold,
          'is_active', OLD.is_active
        ),
        jsonb_build_object(
          'target_value', NEW.target_value,
          'warning_threshold', NEW.warning_threshold,
          'critical_threshold', NEW.critical_threshold,
          'is_active', NEW.is_active
        ),
        auth.uid()
      );
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for automatic audit logging
DROP TRIGGER IF EXISTS trg_kpi_target_audit ON public.kpi_targets;
CREATE TRIGGER trg_kpi_target_audit
  AFTER INSERT OR UPDATE ON public.kpi_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.log_kpi_target_changes();