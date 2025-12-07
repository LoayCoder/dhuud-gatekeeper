-- Function to check if an area session can be closed
CREATE OR REPLACE FUNCTION public.can_close_area_session(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_session RECORD;
  v_total_items INTEGER;
  v_responded_items INTEGER;
  v_total_findings INTEGER;
  v_open_findings INTEGER;
  v_pending_actions jsonb;
BEGIN
  -- Get session info
  SELECT * INTO v_session 
  FROM inspection_sessions 
  WHERE id = p_session_id AND deleted_at IS NULL;
  
  IF v_session IS NULL THEN
    RETURN jsonb_build_object('error', 'Session not found');
  END IF;

  -- Count total template items for this session's template
  SELECT COUNT(*) INTO v_total_items
  FROM inspection_template_items iti
  WHERE iti.template_id = v_session.template_id 
    AND iti.deleted_at IS NULL 
    AND iti.is_active = true;

  -- Count responded items
  SELECT COUNT(*) INTO v_responded_items
  FROM area_inspection_responses air
  WHERE air.session_id = p_session_id 
    AND air.result IS NOT NULL;

  -- Count total findings for this session
  SELECT COUNT(*) INTO v_total_findings
  FROM area_inspection_findings aif
  WHERE aif.session_id = p_session_id 
    AND aif.deleted_at IS NULL;

  -- Count open findings (not closed and no verified action)
  SELECT COUNT(*) INTO v_open_findings
  FROM area_inspection_findings aif
  LEFT JOIN corrective_actions ca ON ca.id = aif.corrective_action_id
  WHERE aif.session_id = p_session_id 
    AND aif.deleted_at IS NULL
    AND aif.status != 'closed'
    AND (ca.id IS NULL OR ca.status NOT IN ('verified', 'closed'));

  -- Get list of pending actions blocking closure
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
$function$;