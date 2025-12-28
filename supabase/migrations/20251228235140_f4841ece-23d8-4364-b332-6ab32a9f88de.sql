-- Create geofence_escalation_rules table for automated escalation configuration
CREATE TABLE IF NOT EXISTS public.geofence_escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  zone_id UUID REFERENCES security_zones(id),
  rule_name TEXT NOT NULL,
  zone_type TEXT,
  breach_count_threshold INTEGER NOT NULL DEFAULT 3,
  time_window_minutes INTEGER NOT NULL DEFAULT 60,
  escalation_level INTEGER NOT NULL DEFAULT 1,
  notify_roles TEXT[] DEFAULT '{}',
  notify_user_ids UUID[],
  auto_escalate BOOLEAN DEFAULT true,
  escalation_delay_minutes INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Add escalation columns to geofence_alerts if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'geofence_alerts' AND column_name = 'escalation_level') THEN
    ALTER TABLE public.geofence_alerts ADD COLUMN escalation_level INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'geofence_alerts' AND column_name = 'escalated_at') THEN
    ALTER TABLE public.geofence_alerts ADD COLUMN escalated_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'geofence_alerts' AND column_name = 'escalated_by') THEN
    ALTER TABLE public.geofence_alerts ADD COLUMN escalated_by UUID REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'geofence_alerts' AND column_name = 'escalation_notes') THEN
    ALTER TABLE public.geofence_alerts ADD COLUMN escalation_notes TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'geofence_alerts' AND column_name = 'auto_escalated') THEN
    ALTER TABLE public.geofence_alerts ADD COLUMN auto_escalated BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Enable RLS on geofence_escalation_rules
ALTER TABLE public.geofence_escalation_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for geofence_escalation_rules
CREATE POLICY "Tenant isolation for geofence_escalation_rules"
ON public.geofence_escalation_rules
FOR ALL
USING (tenant_id = get_user_tenant_id_secure(auth.uid()))
WITH CHECK (tenant_id = get_user_tenant_id_secure(auth.uid()));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_geofence_escalation_rules_tenant 
ON public.geofence_escalation_rules(tenant_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_geofence_escalation_rules_zone 
ON public.geofence_escalation_rules(zone_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_geofence_alerts_escalation 
ON public.geofence_alerts(escalation_level, escalated_at) WHERE resolved_at IS NULL;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_geofence_escalation_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_geofence_escalation_rules_updated_at ON public.geofence_escalation_rules;
CREATE TRIGGER update_geofence_escalation_rules_updated_at
  BEFORE UPDATE ON public.geofence_escalation_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_geofence_escalation_rules_updated_at();