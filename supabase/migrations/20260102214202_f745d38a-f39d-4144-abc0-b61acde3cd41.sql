-- Add status column to emergency_alerts
ALTER TABLE emergency_alerts 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' NOT NULL;

-- Add check constraint for valid values
ALTER TABLE emergency_alerts
DROP CONSTRAINT IF EXISTS emergency_alerts_status_check;

ALTER TABLE emergency_alerts
ADD CONSTRAINT emergency_alerts_status_check 
CHECK (status IN ('pending', 'acknowledged', 'resolved'));

-- Update existing records based on current timestamps
UPDATE emergency_alerts 
SET status = CASE
  WHEN resolved_at IS NOT NULL THEN 'resolved'
  WHEN acknowledged_at IS NOT NULL THEN 'acknowledged'
  ELSE 'pending'
END
WHERE status = 'pending';

-- Create or replace trigger function to auto-sync status
CREATE OR REPLACE FUNCTION sync_emergency_alert_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.resolved_at IS NOT NULL THEN
    NEW.status := 'resolved';
  ELSIF NEW.acknowledged_at IS NOT NULL THEN
    NEW.status := 'acknowledged';
  ELSE
    NEW.status := 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS emergency_alert_status_sync ON emergency_alerts;

-- Create trigger
CREATE TRIGGER emergency_alert_status_sync
BEFORE INSERT OR UPDATE ON emergency_alerts
FOR EACH ROW EXECUTE FUNCTION sync_emergency_alert_status();