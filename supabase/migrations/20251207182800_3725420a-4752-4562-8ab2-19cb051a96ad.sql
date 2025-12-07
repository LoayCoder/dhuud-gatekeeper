-- Add verification columns to corrective_actions if not exists
ALTER TABLE public.corrective_actions
ADD COLUMN IF NOT EXISTS source_finding_id UUID REFERENCES public.area_inspection_findings(id) ON DELETE SET NULL;

-- Add action reference to area_inspection_findings if not exists
ALTER TABLE public.area_inspection_findings
ADD COLUMN IF NOT EXISTS corrective_action_id UUID REFERENCES public.corrective_actions(id) ON DELETE SET NULL;

-- Create indexes for the new foreign keys
CREATE INDEX IF NOT EXISTS idx_corrective_actions_source_finding ON public.corrective_actions(source_finding_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_area_inspection_findings_action ON public.area_inspection_findings(corrective_action_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_corrective_actions_session ON public.corrective_actions(session_id) WHERE deleted_at IS NULL;

-- Function to check if session can be closed (all actions verified)
CREATE OR REPLACE FUNCTION public.can_close_area_session(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
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
$$;

-- Trigger to auto-close finding when action is verified
CREATE OR REPLACE FUNCTION public.auto_close_finding_on_action_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When action status changes to verified or closed, update finding status
  IF NEW.status IN ('verified', 'closed') AND OLD.status NOT IN ('verified', 'closed') THEN
    UPDATE area_inspection_findings
    SET status = 'closed',
        closed_at = now(),
        closed_by = NEW.verified_by
    WHERE corrective_action_id = NEW.id
      AND deleted_at IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS trigger_auto_close_finding ON public.corrective_actions;
CREATE TRIGGER trigger_auto_close_finding
  AFTER UPDATE ON public.corrective_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_close_finding_on_action_verified();