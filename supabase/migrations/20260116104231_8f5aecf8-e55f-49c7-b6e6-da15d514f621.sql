-- =====================================================
-- OBSERVATION & VIOLATION MANAGEMENT WORKFLOW
-- Phase 2: RPC Functions for Workflow
-- =====================================================

-- Function to check if user is a Contractor Consultant
CREATE OR REPLACE FUNCTION public.is_contractor_consultant(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p_user_id
    AND ur.role = 'contractor_consultant'::app_role
  );
$$;

-- Function to check if user is a Client Site Representative
CREATE OR REPLACE FUNCTION public.is_client_site_rep(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p_user_id
    AND ur.role = 'client_site_representative'::app_role
  );
$$;

-- Function to check if user is a Contractor Site Representative
CREATE OR REPLACE FUNCTION public.is_contractor_site_rep(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p_user_id
    AND ur.role = 'contractor_site_representative'::app_role
  );
$$;

-- Function to check if user is a Contract Controller
CREATE OR REPLACE FUNCTION public.is_contract_controller(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p_user_id
    AND ur.role = 'contract_controller'::app_role
  );
$$;

-- Function to check if user is an HSSE Expert
CREATE OR REPLACE FUNCTION public.is_hsse_expert(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p_user_id
    AND ur.role = 'hsse_expert'::app_role
  );
$$;

-- Function to route observation to contractor consultant
CREATE OR REPLACE FUNCTION public.route_observation_to_consultant(
  p_incident_id UUID,
  p_consultant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_incident RECORD;
BEGIN
  SELECT * INTO v_incident
  FROM public.incidents
  WHERE id = p_incident_id AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incident not found');
  END IF;
  
  IF NOT public.is_contractor_consultant(p_consultant_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is not a Contractor Consultant');
  END IF;
  
  UPDATE public.incidents
  SET consultant_assigned_id = p_consultant_id, consultant_assigned_at = now(),
      status = 'pending_consultant_review', updated_at = now()
  WHERE id = p_incident_id;
  
  INSERT INTO public.observation_workflow_logs (tenant_id, branch_id, incident_id, actor_id, workflow_step, previous_status, new_status, notes)
  VALUES (v_incident.tenant_id, v_incident.branch_id, p_incident_id, auth.uid(), 'route_to_consultant', v_incident.status, 'pending_consultant_review', 'Routed to Consultant');
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Function for consultant to submit actions for site client approval
CREATE OR REPLACE FUNCTION public.consultant_submit_for_approval(p_incident_id UUID, p_notes TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_incident RECORD; v_action_count INT;
BEGIN
  SELECT * INTO v_incident FROM public.incidents WHERE id = p_incident_id AND consultant_assigned_id = auth.uid() AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Not authorized'); END IF;
  SELECT COUNT(*) INTO v_action_count FROM public.corrective_actions WHERE incident_id = p_incident_id AND deleted_at IS NULL;
  IF v_action_count = 0 THEN RETURN jsonb_build_object('success', false, 'error', 'No corrective actions'); END IF;
  UPDATE public.incidents SET status = 'pending_site_client_approval', consultant_reviewed_at = now(), consultant_review_notes = COALESCE(p_notes, consultant_review_notes), updated_at = now() WHERE id = p_incident_id;
  INSERT INTO public.observation_workflow_logs (tenant_id, branch_id, incident_id, actor_id, workflow_step, previous_status, new_status, notes) VALUES (v_incident.tenant_id, v_incident.branch_id, p_incident_id, auth.uid(), 'submit_for_approval', v_incident.status, 'pending_site_client_approval', p_notes);
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Function for site client to approve/reject actions
CREATE OR REPLACE FUNCTION public.site_client_approve_actions(p_incident_id UUID, p_decision TEXT, p_notes TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_incident RECORD; v_new_status TEXT;
BEGIN
  IF NOT public.is_client_site_rep(auth.uid()) THEN RETURN jsonb_build_object('success', false, 'error', 'Not authorized'); END IF;
  SELECT * INTO v_incident FROM public.incidents WHERE id = p_incident_id AND status = 'pending_site_client_approval' AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Not found'); END IF;
  v_new_status := CASE WHEN p_decision = 'approved' THEN 'pending_contractor_implementation' ELSE 'pending_consultant_review' END;
  UPDATE public.incidents SET status = v_new_status, site_client_action_decision = p_decision, site_client_action_approved_at = now(), site_client_action_approved_by = auth.uid(), site_client_action_notes = p_notes, updated_at = now() WHERE id = p_incident_id;
  INSERT INTO public.observation_workflow_logs (tenant_id, branch_id, incident_id, actor_id, workflow_step, decision, notes) VALUES (v_incident.tenant_id, v_incident.branch_id, p_incident_id, auth.uid(), 'site_client_decision', p_decision, p_notes);
  RETURN jsonb_build_object('success', true, 'new_status', v_new_status);
END;
$$;

-- Function to close observation with gate checks
CREATE OR REPLACE FUNCTION public.close_contractor_observation(p_incident_id UUID, p_closure_notes TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_incident RECORD; v_unverified INT; v_pending_violations INT;
BEGIN
  SELECT * INTO v_incident FROM public.incidents WHERE id = p_incident_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Not found'); END IF;
  SELECT COUNT(*) INTO v_unverified FROM public.corrective_actions WHERE incident_id = p_incident_id AND consultant_verification_status != 'accepted' AND deleted_at IS NULL;
  IF v_unverified > 0 THEN RETURN jsonb_build_object('success', false, 'error', 'All actions must be verified'); END IF;
  SELECT COUNT(*) INTO v_pending_violations FROM public.incident_violation_lifecycle WHERE incident_id = p_incident_id AND current_status NOT IN ('acknowledged', 'dropped', 'finalized') AND deleted_at IS NULL;
  IF v_pending_violations > 0 THEN RETURN jsonb_build_object('success', false, 'error', 'All violations must be finalized'); END IF;
  UPDATE public.incidents SET status = 'closed', closed_at = now(), closed_by = auth.uid(), closure_notes = p_closure_notes, updated_at = now() WHERE id = p_incident_id;
  INSERT INTO public.observation_workflow_logs (tenant_id, branch_id, incident_id, actor_id, workflow_step, new_status, notes) VALUES (v_incident.tenant_id, v_incident.branch_id, p_incident_id, auth.uid(), 'observation_closed', 'closed', p_closure_notes);
  RETURN jsonb_build_object('success', true);
END;
$$;