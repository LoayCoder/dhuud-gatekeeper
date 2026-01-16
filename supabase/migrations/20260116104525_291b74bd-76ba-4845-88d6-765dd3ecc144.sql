-- =====================================================
-- OBSERVATION & VIOLATION MANAGEMENT WORKFLOW
-- Phase 3: Additional RPC Functions
-- =====================================================

-- Function for contractor rep to complete action with evidence
CREATE OR REPLACE FUNCTION public.contractor_complete_action(
  p_action_id UUID,
  p_evidence JSONB DEFAULT '[]'::jsonb,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_action RECORD;
  v_incident RECORD;
  v_all_complete BOOLEAN;
BEGIN
  SELECT * INTO v_action FROM public.corrective_actions WHERE id = p_action_id AND implementation_assigned_to = auth.uid() AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Action not found or not assigned to you'); END IF;
  
  UPDATE public.corrective_actions SET implementation_completed_at = now(), implementation_evidence = p_evidence, implementation_notes = p_notes, consultant_verification_status = 'pending', status = 'pending_verification', updated_at = now() WHERE id = p_action_id;
  
  SELECT * INTO v_incident FROM public.incidents WHERE id = v_action.incident_id;
  SELECT NOT EXISTS (SELECT 1 FROM public.corrective_actions WHERE incident_id = v_action.incident_id AND implementation_completed_at IS NULL AND deleted_at IS NULL) INTO v_all_complete;
  
  IF v_all_complete THEN
    UPDATE public.incidents SET status = 'pending_consultant_verification', contractor_implementation_completed_at = now(), updated_at = now() WHERE id = v_action.incident_id;
  END IF;
  
  INSERT INTO public.observation_workflow_logs (tenant_id, branch_id, incident_id, action_id, actor_id, workflow_step, notes, evidence) VALUES (v_incident.tenant_id, v_incident.branch_id, v_action.incident_id, p_action_id, auth.uid(), 'action_completed', p_notes, p_evidence);
  RETURN jsonb_build_object('success', true, 'all_complete', v_all_complete);
END;
$$;

-- Function for consultant to verify action
CREATE OR REPLACE FUNCTION public.consultant_verify_action(
  p_action_id UUID,
  p_decision TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_action RECORD;
  v_all_verified BOOLEAN;
BEGIN
  SELECT ca.*, i.consultant_assigned_id, i.tenant_id, i.branch_id, i.id as inc_id INTO v_action
  FROM public.corrective_actions ca JOIN public.incidents i ON i.id = ca.incident_id
  WHERE ca.id = p_action_id AND i.consultant_assigned_id = auth.uid() AND ca.deleted_at IS NULL;
  
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Not authorized'); END IF;
  
  UPDATE public.corrective_actions SET consultant_verified_by = auth.uid(), consultant_verified_at = now(), consultant_verification_status = p_decision, consultant_verification_notes = p_notes, status = CASE WHEN p_decision = 'accepted' THEN 'verified' ELSE 'rejected' END, updated_at = now() WHERE id = p_action_id;
  
  IF p_decision = 'rejected' THEN
    UPDATE public.incidents SET status = 'pending_contractor_implementation', updated_at = now() WHERE id = v_action.inc_id;
  ELSE
    SELECT NOT EXISTS (SELECT 1 FROM public.corrective_actions WHERE incident_id = v_action.inc_id AND (consultant_verification_status IS NULL OR consultant_verification_status != 'accepted') AND deleted_at IS NULL) INTO v_all_verified;
    IF v_all_verified THEN
      UPDATE public.incidents SET status = 'pending_closure', consultant_verification_decision = 'accepted', consultant_verified_at = now(), updated_at = now() WHERE id = v_action.inc_id;
    END IF;
  END IF;
  
  INSERT INTO public.observation_workflow_logs (tenant_id, branch_id, incident_id, action_id, actor_id, workflow_step, decision, notes) VALUES (v_action.tenant_id, v_action.branch_id, v_action.inc_id, p_action_id, auth.uid(), 'action_verified', p_decision, p_notes);
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Function for consultant to identify violation
CREATE OR REPLACE FUNCTION public.consultant_identify_violation(
  p_incident_id UUID,
  p_violation_type TEXT,
  p_violation_description TEXT,
  p_recommended_fine NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_incident RECORD;
  v_violation_id UUID;
BEGIN
  SELECT * INTO v_incident FROM public.incidents WHERE id = p_incident_id AND consultant_assigned_id = auth.uid() AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Not authorized'); END IF;
  
  INSERT INTO public.incident_violation_lifecycle (tenant_id, branch_id, incident_id, violation_type, current_status, violation_description, recommended_fine_amount, identified_by, identified_at)
  VALUES (v_incident.tenant_id, v_incident.branch_id, p_incident_id, p_violation_type, 'pending_site_client_approval', p_violation_description, p_recommended_fine, auth.uid(), now())
  RETURNING id INTO v_violation_id;
  
  UPDATE public.incidents SET has_violation = true, updated_at = now() WHERE id = p_incident_id;
  
  INSERT INTO public.observation_workflow_logs (tenant_id, branch_id, incident_id, actor_id, workflow_step, notes, metadata)
  VALUES (v_incident.tenant_id, v_incident.branch_id, p_incident_id, auth.uid(), 'violation_identified', p_violation_description, jsonb_build_object('violation_id', v_violation_id, 'type', p_violation_type));
  RETURN jsonb_build_object('success', true, 'violation_id', v_violation_id);
END;
$$;

-- Function for site client to approve violation
CREATE OR REPLACE FUNCTION public.site_client_approve_violation(
  p_violation_id UUID,
  p_decision TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_violation RECORD;
  v_new_status TEXT;
BEGIN
  IF NOT public.is_client_site_rep(auth.uid()) THEN RETURN jsonb_build_object('success', false, 'error', 'Not authorized'); END IF;
  
  SELECT * INTO v_violation FROM public.incident_violation_lifecycle WHERE id = p_violation_id AND current_status = 'pending_site_client_approval' AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Violation not found'); END IF;
  
  v_new_status := CASE WHEN p_decision = 'approved' THEN 'pending_controller_approval' ELSE 'dropped' END;
  
  UPDATE public.incident_violation_lifecycle SET current_status = v_new_status, site_client_approved_by = auth.uid(), site_client_approved_at = now(), site_client_notes = p_notes, updated_at = now() WHERE id = p_violation_id;
  
  INSERT INTO public.observation_workflow_logs (tenant_id, branch_id, incident_id, actor_id, workflow_step, decision, notes)
  VALUES (v_violation.tenant_id, v_violation.branch_id, v_violation.incident_id, auth.uid(), 'violation_site_client_decision', p_decision, p_notes);
  RETURN jsonb_build_object('success', true, 'new_status', v_new_status);
END;
$$;

-- Function for contract controller to approve violation
CREATE OR REPLACE FUNCTION public.controller_approve_violation(
  p_violation_id UUID,
  p_decision TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_violation RECORD;
  v_new_status TEXT;
BEGIN
  IF NOT public.is_contract_controller(auth.uid()) THEN RETURN jsonb_build_object('success', false, 'error', 'Not authorized'); END IF;
  
  SELECT * INTO v_violation FROM public.incident_violation_lifecycle WHERE id = p_violation_id AND current_status = 'pending_controller_approval' AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Violation not found'); END IF;
  
  v_new_status := CASE WHEN p_decision = 'approved' THEN 'pending_contractor_acknowledgement' ELSE 'dropped' END;
  
  UPDATE public.incident_violation_lifecycle SET current_status = v_new_status, controller_approved_by = auth.uid(), controller_approved_at = now(), controller_notes = p_notes, updated_at = now() WHERE id = p_violation_id;
  
  INSERT INTO public.observation_workflow_logs (tenant_id, branch_id, incident_id, actor_id, workflow_step, decision, notes)
  VALUES (v_violation.tenant_id, v_violation.branch_id, v_violation.incident_id, auth.uid(), 'violation_controller_decision', p_decision, p_notes);
  RETURN jsonb_build_object('success', true, 'new_status', v_new_status);
END;
$$;

-- Function for contractor rep to acknowledge/dispute violation
CREATE OR REPLACE FUNCTION public.contractor_acknowledge_violation(
  p_violation_id UUID,
  p_acknowledged BOOLEAN,
  p_dispute_reason TEXT DEFAULT NULL,
  p_dispute_evidence JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_violation RECORD;
  v_new_status TEXT;
BEGIN
  SELECT * INTO v_violation FROM public.incident_violation_lifecycle WHERE id = p_violation_id AND current_status = 'pending_contractor_acknowledgement' AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Violation not found'); END IF;
  
  IF p_acknowledged THEN
    v_new_status := 'finalized';
    UPDATE public.incident_violation_lifecycle SET current_status = v_new_status, contractor_acknowledged = true, contractor_acknowledged_at = now(), contractor_acknowledged_by = auth.uid(), updated_at = now() WHERE id = p_violation_id;
  ELSE
    v_new_status := 'pending_dispute_review';
    UPDATE public.incident_violation_lifecycle SET current_status = v_new_status, contractor_acknowledged = false, dispute_reason = p_dispute_reason, dispute_evidence = p_dispute_evidence, dispute_submitted_at = now(), dispute_submitted_by = auth.uid(), updated_at = now() WHERE id = p_violation_id;
  END IF;
  
  INSERT INTO public.observation_workflow_logs (tenant_id, branch_id, incident_id, actor_id, workflow_step, decision, notes, evidence)
  VALUES (v_violation.tenant_id, v_violation.branch_id, v_violation.incident_id, auth.uid(), CASE WHEN p_acknowledged THEN 'violation_acknowledged' ELSE 'violation_disputed' END, CASE WHEN p_acknowledged THEN 'acknowledged' ELSE 'disputed' END, p_dispute_reason, p_dispute_evidence);
  RETURN jsonb_build_object('success', true, 'new_status', v_new_status);
END;
$$;

-- Function for controller to review dispute
CREATE OR REPLACE FUNCTION public.controller_review_dispute(
  p_violation_id UUID,
  p_decision TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_violation RECORD;
  v_new_status TEXT;
BEGIN
  IF NOT public.is_contract_controller(auth.uid()) THEN RETURN jsonb_build_object('success', false, 'error', 'Not authorized'); END IF;
  
  SELECT * INTO v_violation FROM public.incident_violation_lifecycle WHERE id = p_violation_id AND current_status = 'pending_dispute_review' AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Violation not found'); END IF;
  
  v_new_status := CASE WHEN p_decision = 'upheld' THEN 'finalized' ELSE 'dropped' END;
  
  UPDATE public.incident_violation_lifecycle SET current_status = v_new_status, dispute_reviewed_by = auth.uid(), dispute_reviewed_at = now(), dispute_decision = p_decision, dispute_decision_notes = p_notes, updated_at = now() WHERE id = p_violation_id;
  
  INSERT INTO public.observation_workflow_logs (tenant_id, branch_id, incident_id, actor_id, workflow_step, decision, notes)
  VALUES (v_violation.tenant_id, v_violation.branch_id, v_violation.incident_id, auth.uid(), 'dispute_reviewed', p_decision, p_notes);
  RETURN jsonb_build_object('success', true, 'new_status', v_new_status);
END;
$$;

-- Function for HSSE expert review (Level 3+)
CREATE OR REPLACE FUNCTION public.hsse_expert_review_observation(
  p_incident_id UUID,
  p_decision TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_incident RECORD;
BEGIN
  IF NOT public.is_hsse_expert(auth.uid()) THEN RETURN jsonb_build_object('success', false, 'error', 'Not authorized'); END IF;
  
  SELECT * INTO v_incident FROM public.incidents WHERE id = p_incident_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Not found'); END IF;
  
  UPDATE public.incidents SET hsse_reviewed_by = auth.uid(), hsse_reviewed_at = now(), hsse_review_notes = p_notes, hsse_review_decision = p_decision, updated_at = now() WHERE id = p_incident_id;
  
  INSERT INTO public.observation_workflow_logs (tenant_id, branch_id, incident_id, actor_id, workflow_step, decision, notes)
  VALUES (v_incident.tenant_id, v_incident.branch_id, p_incident_id, auth.uid(), 'hsse_expert_review', p_decision, p_notes);
  RETURN jsonb_build_object('success', true);
END;
$$;