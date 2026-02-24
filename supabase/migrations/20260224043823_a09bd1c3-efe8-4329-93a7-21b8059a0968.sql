DO $$
DECLARE
  v_obs RECORD;
  v_consultant_id UUID;
  v_effective_branch UUID;
  v_updated_count INT := 0;
BEGIN
  FOR v_obs IN 
    SELECT i.id, i.reference_id, i.tenant_id, i.branch_id, i.site_id
    FROM incidents i
    WHERE i.event_type = 'observation' 
      AND i.related_contractor_company_id IS NOT NULL
      AND i.status IN ('submitted', 'pending_consultant_screening', 'expert_screening', 'pending_hsse_validation')
      AND (i.approval_manager_id IS NULL OR i.status != 'pending_consultant_screening') 
  LOOP
    v_effective_branch := COALESCE(v_obs.branch_id, (SELECT branch_id FROM sites WHERE id = v_obs.site_id));
    
    SELECT ura.user_id INTO v_consultant_id
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    JOIN profiles p ON p.id = ura.user_id
    WHERE ura.tenant_id = v_obs.tenant_id
      AND (ura.branch_id = v_effective_branch OR ura.branch_id IS NULL)
      AND r.code = 'contractor_consultant'
      AND r.is_active = true
      AND p.deleted_at IS NULL
    ORDER BY
      CASE WHEN ura.branch_id = v_effective_branch THEN 0 ELSE 1 END,
      ura.assigned_at
    LIMIT 1;
    
    IF v_consultant_id IS NOT NULL THEN
      UPDATE incidents
      SET approval_manager_id = v_consultant_id,
          status = 'pending_consultant_screening'
      WHERE id = v_obs.id;
      
      v_updated_count := v_updated_count + 1;
      RAISE NOTICE 'Fixed % (Assigned to consultant ID: %)', v_obs.reference_id, v_consultant_id;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Retroactively assigned % contractor observations to consultants.', v_updated_count;
END;
$$;