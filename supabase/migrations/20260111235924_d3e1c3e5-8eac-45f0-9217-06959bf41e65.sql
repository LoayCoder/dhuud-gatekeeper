-- Create SECURITY DEFINER function for guard tracking inserts
CREATE OR REPLACE FUNCTION insert_guard_tracking(
  p_guard_id uuid,
  p_tenant_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy double precision DEFAULT NULL,
  p_battery_level integer DEFAULT NULL,
  p_roster_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO guard_tracking_history (
    guard_id, tenant_id, latitude, longitude, 
    accuracy, battery_level, roster_id, recorded_at
  ) VALUES (
    p_guard_id, p_tenant_id, p_latitude, p_longitude,
    p_accuracy, p_battery_level, p_roster_id, now()
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Add missing columns to geofence_alerts if they don't exist
ALTER TABLE geofence_alerts 
ADD COLUMN IF NOT EXISTS guard_lat double precision,
ADD COLUMN IF NOT EXISTS guard_lng double precision,
ADD COLUMN IF NOT EXISTS roster_id uuid REFERENCES shift_roster(id);