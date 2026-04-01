
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
  v_failed_assets INTEGER;
  v_actions_count INTEGER;
  v_pending_actions jsonb;
  v_execution_mode TEXT;
BEGIN
  SELECT * INTO v_session 
  FROM inspection_sessions 
  WHERE id = p_session_id AND deleted_at IS NULL;
  
  IF v_session IS NULL THEN
    RETURN jsonb_build_object('error', 'Session not found');
  END IF;

  v_execution_mode := COALESCE(v_session.execution_mode, 'area');

  IF v_execution_mode = 'asset' THEN
    -- ASSET MODE
    SELECT COUNT(*), 
           COUNT(*) FILTER (WHERE quick_result IS NOT NULL),
           COUNT(*) FILTER (WHERE quick_result IN ('not_good', 'partial'))
    INTO v_total_items, v_responded_items, v_failed_assets
    FROM inspection_session_assets
    WHERE session_id = p_session_id;

    -- Count corrective actions for this session
    SELECT COUNT(*) INTO v_actions_count
    FROM corrective_actions ca
    WHERE ca.session_id = p_session_id AND ca.deleted_at IS NULL;

    -- Open findings = failed assets not yet covered by actions + open actions
    SELECT COUNT(*) INTO v_open_findings
    FROM corrective_actions ca
    WHERE ca.session_id = p_session_id
      AND ca.deleted_at IS NULL
      AND ca.status NOT IN ('verified', 'closed');

    -- If there are failed assets but no actions created yet, those count as open
    IF v_failed_assets > 0 AND v_actions_count = 0 THEN
      v_open_findings := v_failed_assets;
    END IF;

    v_total_findings := GREATEST(v_failed_assets, v_actions_count);

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

    -- If no actions yet but failures exist, return empty array (UI will show "create action" button)
    IF v_failed_assets > 0 AND v_actions_count = 0 THEN
      v_pending_actions := '[]'::jsonb;
    END IF;

  ELSE
    -- AREA MODE: original logic
    SELECT COUNT(*) INTO v_total_items
    FROM inspection_template_items iti
    WHERE iti.template_id = v_session.template_id 
      AND iti.deleted_at IS NULL AND iti.is_active = true;

    SELECT COUNT(*) INTO v_responded_items
    FROM area_inspection_responses air
    WHERE air.session_id = p_session_id AND air.result IS NOT NULL;

    v_failed_assets := 0;

    SELECT COUNT(*) INTO v_total_findings
    FROM area_inspection_findings aif
    WHERE aif.session_id = p_session_id AND aif.deleted_at IS NULL;

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

-- Data repair: revert incorrectly closed asset-mode sessions back to completed_with_open_actions
UPDATE inspection_sessions s
SET status = 'completed_with_open_actions',
    closed_at = NULL,
    updated_at = now()
WHERE s.status = 'closed'
  AND s.execution_mode = 'asset'
  AND s.deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM inspection_session_assets isa
    WHERE isa.session_id = s.id
      AND isa.quick_result IN ('not_good', 'partial')
  )
  AND NOT EXISTS (
    SELECT 1 FROM corrective_actions ca
    WHERE ca.session_id = s.id AND ca.deleted_at IS NULL
  );
