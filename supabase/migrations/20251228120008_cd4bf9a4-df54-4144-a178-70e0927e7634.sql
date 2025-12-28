-- Create finding_sla_configs table for SLA thresholds per classification
CREATE TABLE public.finding_sla_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  classification TEXT NOT NULL, -- 'observation', 'minor_nc', 'major_nc', 'critical_nc'
  target_days INTEGER NOT NULL DEFAULT 14,
  warning_days_before INTEGER NOT NULL DEFAULT 3,
  escalation_days_after INTEGER NOT NULL DEFAULT 2,
  second_escalation_days_after INTEGER NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL,
  UNIQUE(tenant_id, classification)
);

-- Enable RLS
ALTER TABLE public.finding_sla_configs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view finding SLA configs for their tenant"
  ON public.finding_sla_configs FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "HSSE managers can manage finding SLA configs"
  ON public.finding_sla_configs FOR ALL
  USING (tenant_id = get_auth_tenant_id() AND has_asset_management_access(auth.uid()))
  WITH CHECK (tenant_id = get_auth_tenant_id() AND has_asset_management_access(auth.uid()));

-- Add due_date column to area_inspection_findings
ALTER TABLE public.area_inspection_findings 
  ADD COLUMN IF NOT EXISTS due_date DATE NULL;

-- Add warning_sent_at column for tracking
ALTER TABLE public.area_inspection_findings 
  ADD COLUMN IF NOT EXISTS warning_sent_at TIMESTAMPTZ NULL;

-- Create index for escalation queries
CREATE INDEX IF NOT EXISTS idx_area_inspection_findings_status_due_date 
  ON public.area_inspection_findings(status, due_date) 
  WHERE deleted_at IS NULL;

-- Create index for escalation level queries
CREATE INDEX IF NOT EXISTS idx_area_inspection_findings_escalation 
  ON public.area_inspection_findings(escalation_level, last_escalated_at) 
  WHERE deleted_at IS NULL AND status NOT IN ('closed', 'resolved');

-- Insert default SLA configs (will be per-tenant, but provide global defaults)
-- These will be created per-tenant when they first access the feature

-- Create function to auto-set due_date based on classification and SLA config
CREATE OR REPLACE FUNCTION public.set_finding_due_date()
RETURNS TRIGGER AS $$
DECLARE
  sla_config RECORD;
BEGIN
  -- Only set due_date if it's null and status is not closed
  IF NEW.due_date IS NULL AND NEW.status NOT IN ('closed', 'resolved') THEN
    -- Look up SLA config for this tenant and classification
    SELECT target_days INTO sla_config
    FROM public.finding_sla_configs
    WHERE tenant_id = NEW.tenant_id 
      AND classification = NEW.classification
      AND deleted_at IS NULL
    LIMIT 1;
    
    -- If config exists, set due_date
    IF sla_config IS NOT NULL THEN
      NEW.due_date := CURRENT_DATE + sla_config.target_days;
    ELSE
      -- Default due dates by classification if no config
      CASE NEW.classification
        WHEN 'critical_nc' THEN NEW.due_date := CURRENT_DATE + 3;
        WHEN 'major_nc' THEN NEW.due_date := CURRENT_DATE + 7;
        WHEN 'minor_nc' THEN NEW.due_date := CURRENT_DATE + 14;
        WHEN 'observation' THEN NEW.due_date := CURRENT_DATE + 30;
        ELSE NEW.due_date := CURRENT_DATE + 14;
      END CASE;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto-setting due_date
DROP TRIGGER IF EXISTS trigger_set_finding_due_date ON public.area_inspection_findings;
CREATE TRIGGER trigger_set_finding_due_date
  BEFORE INSERT ON public.area_inspection_findings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_finding_due_date();

-- Update trigger for updated_at on finding_sla_configs
CREATE TRIGGER update_finding_sla_configs_updated_at
  BEFORE UPDATE ON public.finding_sla_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();