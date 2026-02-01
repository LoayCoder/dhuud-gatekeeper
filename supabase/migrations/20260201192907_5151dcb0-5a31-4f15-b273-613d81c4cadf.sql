-- Create function to validate gate pass exit (vehicle/driver matching for in_out passes)
CREATE OR REPLACE FUNCTION validate_gate_pass_exit(
  p_gate_pass_id UUID,
  p_exit_vehicle_plate TEXT DEFAULT NULL,
  p_exit_driver_name TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pass RECORD;
BEGIN
  -- Fetch the gate pass
  SELECT pass_type, vehicle_plate, driver_name, entry_time, exit_time
  INTO v_pass
  FROM material_gate_passes
  WHERE id = p_gate_pass_id AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Gate pass not found');
  END IF;
  
  -- Check if already has exit time
  IF v_pass.exit_time IS NOT NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Exit already recorded');
  END IF;
  
  -- For in_out passes, validate matching vehicle and driver
  IF v_pass.pass_type = 'in_out' OR v_pass.pass_type ILIKE '%in%out%' OR v_pass.pass_type ILIKE '%entry%exit%' THEN
    -- Must have entry recorded first
    IF v_pass.entry_time IS NULL THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'Entry not yet recorded - cannot process exit');
    END IF;
    
    -- Validate vehicle plate (case-insensitive, trim whitespace)
    IF v_pass.vehicle_plate IS NOT NULL AND 
       TRIM(UPPER(v_pass.vehicle_plate)) != TRIM(UPPER(COALESCE(p_exit_vehicle_plate, ''))) THEN
      RETURN jsonb_build_object(
        'allowed', false, 
        'reason', 'Vehicle plate mismatch - expected: ' || v_pass.vehicle_plate,
        'expected_vehicle', v_pass.vehicle_plate,
        'provided_vehicle', p_exit_vehicle_plate,
        'mismatch_type', 'vehicle'
      );
    END IF;
    
    -- Validate driver name (case-insensitive, trim whitespace)
    IF v_pass.driver_name IS NOT NULL AND 
       TRIM(UPPER(v_pass.driver_name)) != TRIM(UPPER(COALESCE(p_exit_driver_name, ''))) THEN
      RETURN jsonb_build_object(
        'allowed', false, 
        'reason', 'Driver name mismatch - expected: ' || v_pass.driver_name,
        'expected_driver', v_pass.driver_name,
        'provided_driver', p_exit_driver_name,
        'mismatch_type', 'driver'
      );
    END IF;
  END IF;
  
  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION validate_gate_pass_exit(UUID, TEXT, TEXT) TO authenticated;