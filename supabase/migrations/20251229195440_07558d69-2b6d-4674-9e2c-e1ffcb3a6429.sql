-- Enhancement 1: Automatic Mobilization Percentage Sync
-- Create trigger function to auto-calculate mobilization percentage

CREATE OR REPLACE FUNCTION public.update_project_mobilization_percentage()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id uuid;
  v_total_count integer;
  v_approved_count integer;
  v_mandatory_total integer;
  v_mandatory_approved integer;
  v_new_percentage integer;
  v_new_status text;
BEGIN
  -- Get the project_id from NEW or OLD record
  v_project_id := COALESCE(NEW.project_id, OLD.project_id);
  
  -- Count total and approved clearance checks
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'approved'),
    COUNT(*) FILTER (WHERE is_mandatory = true),
    COUNT(*) FILTER (WHERE is_mandatory = true AND status = 'approved')
  INTO v_total_count, v_approved_count, v_mandatory_total, v_mandatory_approved
  FROM ptw_clearance_checks
  WHERE project_id = v_project_id
    AND deleted_at IS NULL;
  
  -- Calculate percentage (avoid division by zero)
  IF v_total_count > 0 THEN
    v_new_percentage := ROUND((v_approved_count::numeric / v_total_count::numeric) * 100)::integer;
  ELSE
    v_new_percentage := 0;
  END IF;
  
  -- Determine status: active only if ALL mandatory items are approved
  IF v_mandatory_total > 0 AND v_mandatory_approved = v_mandatory_total THEN
    v_new_status := 'active';
  ELSE
    v_new_status := 'mobilization';
  END IF;
  
  -- Update the project
  UPDATE ptw_projects
  SET 
    mobilization_percentage = v_new_percentage,
    status = CASE 
      WHEN status IN ('mobilization', 'pending') THEN v_new_status
      ELSE status -- Don't change if already active, completed, suspended, etc.
    END,
    updated_at = NOW()
  WHERE id = v_project_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on ptw_clearance_checks
DROP TRIGGER IF EXISTS trg_update_mobilization ON ptw_clearance_checks;

CREATE TRIGGER trg_update_mobilization
  AFTER INSERT OR UPDATE OF status OR DELETE
  ON ptw_clearance_checks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_project_mobilization_percentage();

-- Add comment for documentation
COMMENT ON FUNCTION public.update_project_mobilization_percentage() IS 
  'Automatically updates ptw_projects.mobilization_percentage when clearance check status changes';