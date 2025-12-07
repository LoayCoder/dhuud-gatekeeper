-- Add SLA tracking columns to corrective_actions
ALTER TABLE corrective_actions ADD COLUMN IF NOT EXISTS sla_warning_sent_at TIMESTAMPTZ;
ALTER TABLE corrective_actions ADD COLUMN IF NOT EXISTS sla_escalation_sent_at TIMESTAMPTZ;
ALTER TABLE corrective_actions ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0;

-- Create action SLA configuration table
CREATE TABLE IF NOT EXISTS action_sla_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  priority TEXT NOT NULL UNIQUE,
  warning_days_before INTEGER NOT NULL DEFAULT 3,
  escalation_days_after INTEGER NOT NULL DEFAULT 2,
  second_escalation_days_after INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for SLA queries
CREATE INDEX IF NOT EXISTS idx_corrective_actions_escalation ON corrective_actions(escalation_level) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_corrective_actions_due_date_status ON corrective_actions(due_date, status) WHERE deleted_at IS NULL;

-- Seed default configurations
INSERT INTO action_sla_configs (priority, warning_days_before, escalation_days_after, second_escalation_days_after)
VALUES 
  ('critical', 1, 1, 2),
  ('high', 2, 1, 3),
  ('medium', 3, 2, 5),
  ('low', 5, 3, 7)
ON CONFLICT (priority) DO NOTHING;

-- Enable RLS
ALTER TABLE action_sla_configs ENABLE ROW LEVEL SECURITY;

-- RLS policies for action_sla_configs
CREATE POLICY "Admins can manage action SLA configs" ON action_sla_configs
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view action SLA configs" ON action_sla_configs
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Update trigger for updated_at
CREATE TRIGGER update_action_sla_configs_updated_at
  BEFORE UPDATE ON action_sla_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();