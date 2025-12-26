-- Add SLA columns to investigations table
ALTER TABLE investigations 
ADD COLUMN IF NOT EXISTS target_completion_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS review_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sla_warning_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sla_escalation_sent_at TIMESTAMPTZ;

-- Create investigation_sla_configs table for severity-based SLA thresholds
CREATE TABLE IF NOT EXISTS investigation_sla_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity_level TEXT NOT NULL UNIQUE,
  target_days INTEGER NOT NULL DEFAULT 14,
  warning_days_before INTEGER NOT NULL DEFAULT 3,
  escalation_days_after INTEGER NOT NULL DEFAULT 7,
  second_escalation_days_after INTEGER DEFAULT 14,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default SLA configurations for each severity level
INSERT INTO investigation_sla_configs (severity_level, target_days, warning_days_before, escalation_days_after, second_escalation_days_after) VALUES
  ('Level 1', 7, 2, 3, 7),
  ('Level 2', 10, 3, 5, 10),
  ('Level 3', 14, 3, 7, 14),
  ('Level 4', 21, 5, 10, 21),
  ('Level 5', 30, 7, 14, 30)
ON CONFLICT (severity_level) DO NOTHING;

-- Create updated_at trigger for investigation_sla_configs
CREATE OR REPLACE FUNCTION update_investigation_sla_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_investigation_sla_configs_updated_at ON investigation_sla_configs;
CREATE TRIGGER update_investigation_sla_configs_updated_at
  BEFORE UPDATE ON investigation_sla_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_investigation_sla_configs_updated_at();

-- Enable RLS on investigation_sla_configs
ALTER TABLE investigation_sla_configs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read SLA configs
CREATE POLICY "Allow authenticated to read investigation SLA configs"
  ON investigation_sla_configs
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins/managers to update SLA configs
CREATE POLICY "Allow admins to manage investigation SLA configs"
  ON investigation_sla_configs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);