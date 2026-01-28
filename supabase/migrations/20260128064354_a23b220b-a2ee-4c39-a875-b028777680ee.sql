-- Update consultant_complete_screening: ALL severity levels go to Site Client
-- HSSE Expert is ONLY via explicit escalation button
CREATE OR REPLACE FUNCTION public.consultant_complete_screening(
  p_incident_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_old_status text;
  v_new_status text;
  v_user_id uuid;
  v_site_client_id uuid;
  v_branch_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  SELECT tenant_id, status, branch_id INTO v_tenant_id, v_old_status, v_branch_id
  FROM incidents
  WHERE id = p_incident_id AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incident not found');
  END IF;
  
  -- Accept both statuses for consultant screening stage
  IF v_old_status NOT IN ('pending_consultant_screening', 'expert_screening') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Observation not in consultant screening stage');
  END IF;
  
  -- Find Site Client for the branch
  SELECT ura.user_id INTO v_site_client_id
  FROM user_role_assignments ura
  JOIN roles r ON r.id = ura.role_id
  JOIN profiles p ON p.id = ura.user_id
  WHERE ura.tenant_id = v_tenant_id
    AND (ura.branch_id = v_branch_id OR ura.branch_id IS NULL)
    AND r.code = 'site_client'
    AND r.is_active = true
    AND p.deleted_at IS NULL
  ORDER BY 
    CASE WHEN ura.branch_id = v_branch_id THEN 0 ELSE 1 END,
    ura.created_at
  LIMIT 1;
  
  -- ALL severity levels go to Site Client
  -- HSSE Expert is ONLY via explicit escalation
  v_new_status := 'pending_site_client_approval';
  
  UPDATE incidents
  SET 
    status = v_new_status,
    approval_manager_id = COALESCE(v_site_client_id, approval_manager_id),
    consultant_screened_at = now(),
    consultant_screening_notes = p_notes,
    updated_at = now()
  WHERE id = p_incident_id;
  
  INSERT INTO incident_audit_logs (incident_id, tenant_id, actor_id, action, new_value)
  VALUES (
    p_incident_id, 
    v_tenant_id, 
    v_user_id, 
    'consultant_screening_complete',
    jsonb_build_object(
      'previous_status', v_old_status,
      'new_status', v_new_status,
      'routed_to', 'site_client',
      'notes', p_notes
    )
  );
  
  RETURN jsonb_build_object('success', true, 'new_status', v_new_status, 'routed_to', 'site_client');
END;
$$;