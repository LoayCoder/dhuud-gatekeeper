-- SLA Configuration Table
CREATE TABLE public.sla_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  first_response_hours INTEGER NOT NULL DEFAULT 24,
  resolution_hours INTEGER NOT NULL DEFAULT 72,
  escalation_hours INTEGER NOT NULL DEFAULT 48,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(priority)
);

-- Insert default SLA configurations
INSERT INTO public.sla_configs (priority, first_response_hours, resolution_hours, escalation_hours) VALUES
  ('low', 48, 168, 72),
  ('medium', 24, 72, 48),
  ('high', 8, 48, 24),
  ('urgent', 2, 24, 4);

-- Add SLA tracking columns to support_tickets
ALTER TABLE public.support_tickets
ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sla_first_response_due TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sla_resolution_due TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sla_first_response_breached BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sla_resolution_breached BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0;

-- Agent Performance Stats Table (computed aggregates)
CREATE TABLE public.agent_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  stats_date DATE NOT NULL DEFAULT CURRENT_DATE,
  tickets_assigned INTEGER DEFAULT 0,
  tickets_resolved INTEGER DEFAULT 0,
  tickets_closed INTEGER DEFAULT 0,
  avg_first_response_minutes INTEGER,
  avg_resolution_minutes INTEGER,
  sla_breaches INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id, stats_date)
);

-- Enable RLS on new tables
ALTER TABLE public.sla_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_stats ENABLE ROW LEVEL SECURITY;

-- SLA Configs policies (admin only)
CREATE POLICY "Admins can manage SLA configs" ON public.sla_configs
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view SLA configs" ON public.sla_configs
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Agent Stats policies (admin only view all, agents view own)
CREATE POLICY "Admins can manage agent stats" ON public.agent_stats
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agents can view own stats" ON public.agent_stats
FOR SELECT USING (agent_id = auth.uid());

-- Function to calculate SLA due dates when ticket is created
CREATE OR REPLACE FUNCTION public.calculate_sla_due_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sla_config RECORD;
BEGIN
  -- Get SLA config for the ticket priority
  SELECT * INTO v_sla_config 
  FROM sla_configs 
  WHERE priority = NEW.priority::text;
  
  IF v_sla_config IS NOT NULL THEN
    NEW.sla_first_response_due := NEW.created_at + (v_sla_config.first_response_hours || ' hours')::interval;
    NEW.sla_resolution_due := NEW.created_at + (v_sla_config.resolution_hours || ' hours')::interval;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to set SLA due dates on ticket creation
CREATE TRIGGER set_sla_due_dates
BEFORE INSERT ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION calculate_sla_due_dates();

-- Function to update SLA due dates when priority changes
CREATE OR REPLACE FUNCTION public.update_sla_on_priority_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sla_config RECORD;
BEGIN
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    SELECT * INTO v_sla_config 
    FROM sla_configs 
    WHERE priority = NEW.priority::text;
    
    IF v_sla_config IS NOT NULL THEN
      -- Recalculate from original creation time
      NEW.sla_first_response_due := NEW.created_at + (v_sla_config.first_response_hours || ' hours')::interval;
      NEW.sla_resolution_due := NEW.created_at + (v_sla_config.resolution_hours || ' hours')::interval;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for priority changes
CREATE TRIGGER update_sla_on_priority
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
WHEN (OLD.priority IS DISTINCT FROM NEW.priority)
EXECUTE FUNCTION update_sla_on_priority_change();

-- Function to check and mark SLA breaches
CREATE OR REPLACE FUNCTION public.check_sla_breaches()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark first response breaches
  UPDATE support_tickets
  SET sla_first_response_breached = true
  WHERE first_response_at IS NULL
    AND sla_first_response_due < NOW()
    AND sla_first_response_breached = false
    AND status NOT IN ('resolved', 'closed');
  
  -- Mark resolution breaches
  UPDATE support_tickets
  SET sla_resolution_breached = true
  WHERE sla_resolution_due < NOW()
    AND sla_resolution_breached = false
    AND status NOT IN ('resolved', 'closed');
END;
$$;

-- Function to get agent workload
CREATE OR REPLACE FUNCTION public.get_agent_workload()
RETURNS TABLE (
  agent_id UUID,
  agent_name TEXT,
  open_tickets BIGINT,
  in_progress_tickets BIGINT,
  total_active BIGINT,
  avg_resolution_hours NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id as agent_id,
    p.full_name as agent_name,
    COUNT(*) FILTER (WHERE st.status = 'open') as open_tickets,
    COUNT(*) FILTER (WHERE st.status = 'in_progress') as in_progress_tickets,
    COUNT(*) FILTER (WHERE st.status IN ('open', 'in_progress', 'waiting_customer')) as total_active,
    ROUND(AVG(EXTRACT(EPOCH FROM (st.resolved_at - st.created_at)) / 3600) FILTER (WHERE st.resolved_at IS NOT NULL), 1) as avg_resolution_hours
  FROM profiles p
  LEFT JOIN support_tickets st ON st.assigned_to = p.id AND st.status NOT IN ('closed')
  WHERE EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin'
  )
  GROUP BY p.id, p.full_name
  ORDER BY total_active DESC;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON public.support_tickets(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_tickets_sla_due ON public.support_tickets(sla_first_response_due, sla_resolution_due) WHERE status NOT IN ('resolved', 'closed');
CREATE INDEX IF NOT EXISTS idx_agent_stats_agent_date ON public.agent_stats(agent_id, stats_date);