-- Function for guards to check in to their own shift
CREATE OR REPLACE FUNCTION guard_check_in(
  p_roster_id uuid,
  p_lat double precision,
  p_lng double precision
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_tenant_id uuid;
  v_roster_guard_id uuid;
BEGIN
  v_user_id := auth.uid();
  v_tenant_id := get_profile_tenant_id_bypass(v_user_id);
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User tenant not found';
  END IF;
  
  -- Verify the roster belongs to this guard and their tenant
  SELECT guard_id INTO v_roster_guard_id
  FROM shift_roster
  WHERE id = p_roster_id 
    AND tenant_id = v_tenant_id
    AND deleted_at IS NULL;
  
  IF v_roster_guard_id IS NULL THEN
    RAISE EXCEPTION 'Roster assignment not found';
  END IF;
  
  IF v_roster_guard_id != v_user_id THEN
    RAISE EXCEPTION 'Not authorized to check in to this roster';
  END IF;
  
  UPDATE shift_roster
  SET status = 'checked_in',
      check_in_time = now(),
      check_in_lat = p_lat,
      check_in_lng = p_lng
  WHERE id = p_roster_id AND tenant_id = v_tenant_id;
END;
$$;

-- Function for guards to check out from their own shift
CREATE OR REPLACE FUNCTION guard_check_out(
  p_roster_id uuid,
  p_lat double precision,
  p_lng double precision
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_tenant_id uuid;
  v_roster_guard_id uuid;
BEGIN
  v_user_id := auth.uid();
  v_tenant_id := get_profile_tenant_id_bypass(v_user_id);
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User tenant not found';
  END IF;
  
  SELECT guard_id INTO v_roster_guard_id
  FROM shift_roster
  WHERE id = p_roster_id 
    AND tenant_id = v_tenant_id
    AND deleted_at IS NULL;
  
  IF v_roster_guard_id IS NULL THEN
    RAISE EXCEPTION 'Roster assignment not found';
  END IF;
  
  IF v_roster_guard_id != v_user_id THEN
    RAISE EXCEPTION 'Not authorized to check out from this roster';
  END IF;
  
  UPDATE shift_roster
  SET status = 'completed',
      check_out_time = now(),
      check_out_lat = p_lat,
      check_out_lng = p_lng
  WHERE id = p_roster_id AND tenant_id = v_tenant_id;
END;
$$;