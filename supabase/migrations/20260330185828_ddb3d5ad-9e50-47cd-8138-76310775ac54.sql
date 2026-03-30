
DROP FUNCTION IF EXISTS public.can_close_area_session(uuid);

CREATE OR REPLACE FUNCTION public.can_close_area_session(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_total_items INTEGER;
  v_responded_items INTEGER;
  v_total_findings INTEGER;
  v_open_findings INTEGER;
  v_pending_actions jsonb;
  v_execution_mode TEXT;
BEGIN
  -- Get session info
  SELECT * INTO v_session 
  FROM inspection_sessions 
  WHERE id = p_session_id AND deleted_at IS NULL;
  
  IF v_session IS NULL THEN
    RETURN jsonb_build_object('error', 'Session not found');
  END IF;

  v_execution_mode := COALESCE(v_session.execution_mode, 'area');

  IF v_execution_mode = 'asset' THEN
    -- ASSET MODE: count from inspection_session_assets
    SELECT COUNT(*) INTO v_total_items
    FROM inspection_session_assets isa
    WHERE isa.session_id = p_session_id;

    SELECT COUNT(*) INTO v_responded_items
    FROM inspection_session_assets isa
    WHERE isa.session_id = p_session_id
      AND isa.quick_result IS NOT NULL;

    -- Count findings from corrective_actions linked to this session
    SELECT COUNT(*) INTO v_total_findings
    FROM corrective_actions ca
    WHERE ca.session_id = p_session_id
      AND ca.deleted_at IS NULL;

    SELECT COUNT(*) INTO v_open_findings
    FROM corrective_actions ca
    WHERE ca.session_id = p_session_id
      AND ca.deleted_at IS NULL
      AND ca.status NOT IN ('verified', 'closed');

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'finding_id', ca.id,
      'finding_ref', ca.reference_id,
      'action_id', ca.id,
      'action_title', ca.title,
      'action_status', ca.status
    )), '[]'::jsonb)
    INTO v_pending_actions
    FROM corrective_actions ca
    WHERE ca.session_id = p_session_id
      AND ca.deleted_at IS NULL
      AND ca.status NOT IN ('verified', 'closed');

  ELSE
    -- AREA MODE: original logic using area_inspection_responses
    SELECT COUNT(*) INTO v_total_items
    FROM inspection_template_items iti
    WHERE iti.template_id = v_session.template_id 
      AND iti.deleted_at IS NULL 
      AND iti.is_active = true;

    SELECT COUNT(*) INTO v_responded_items
    FROM area_inspection_responses air
    WHERE air.session_id = p_session_id 
      AND air.result IS NOT NULL;

    SELECT COUNT(*) INTO v_total_findings
    FROM area_inspection_findings aif
    WHERE aif.session_id = p_session_id 
      AND aif.deleted_at IS NULL;

    SELECT COUNT(*) INTO v_open_findings
    FROM area_inspection_findings aif
    LEFT JOIN corrective_actions ca ON ca.id = aif.corrective_action_id
    WHERE aif.session_id = p_session_id 
      AND aif.deleted_at IS NULL
      AND aif.status != 'closed'
      AND (ca.id IS NULL OR ca.status NOT IN ('verified', 'closed'));

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'finding_id', aif.id,
      'finding_ref', aif.reference_id,
      'action_id', ca.id,
      'action_title', ca.title,
      'action_status', ca.status
    )), '[]'::jsonb)
    INTO v_pending_actions
    FROM area_inspection_findings aif
    LEFT JOIN corrective_actions ca ON ca.id = aif.corrective_action_id
    WHERE aif.session_id = p_session_id 
      AND aif.deleted_at IS NULL
      AND aif.status != 'closed'
      AND (ca.id IS NULL OR ca.status NOT IN ('verified', 'closed'));
  END IF;

  RETURN jsonb_build_object(
    'can_close', v_responded_items >= v_total_items AND v_open_findings = 0,
    'all_items_responded', v_responded_items >= v_total_items,
    'all_findings_resolved', v_open_findings = 0,
    'total_items', v_total_items,
    'responded_items', v_responded_items,
    'total_findings', v_total_findings,
    'open_findings', v_open_findings,
    'pending_actions', v_pending_actions
  );
END;
$$;
