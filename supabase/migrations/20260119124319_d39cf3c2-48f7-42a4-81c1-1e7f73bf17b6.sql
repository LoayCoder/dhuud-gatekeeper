-- Part 2: Remaining workflow functions with correct schema
CREATE OR REPLACE FUNCTION public.dept_rep_reject_observation(p_incident_id uuid, p_rejection_reason text, p_notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ DECLARE v_user_id uuid; v_tenant_id uuid; v_current_status text; v_is_dept_rep boolean;
BEGIN v_user_id := auth.uid(); IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
SELECT tenant_id, status INTO v_tenant_id, v_current_status FROM incidents WHERE id = p_incident_id AND event_type = 'observation';
IF v_tenant_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Observation not found'); END IF;
IF v_current_status != 'pending_dept_rep_approval' THEN RETURN jsonb_build_object('success', false, 'error', 'Not pending approval'); END IF;
SELECT EXISTS (SELECT 1 FROM user_role_assignments ura JOIN roles r ON r.id = ura.role_id JOIN profiles p ON p.id = ura.user_id WHERE ura.user_id = v_user_id AND ura.tenant_id = v_tenant_id AND r.code = 'department_representative' AND r.is_active = true AND p.deleted_at IS NULL) INTO v_is_dept_rep;
IF NOT v_is_dept_rep THEN RETURN jsonb_build_object('success', false, 'error', 'Not authorized'); END IF;
UPDATE incidents SET status = 'rejected_by_dept_rep', rejection_reason = p_rejection_reason, rejection_notes = p_notes, rejected_by = v_user_id, rejected_at = now(), updated_at = now() WHERE id = p_incident_id;
RETURN jsonb_build_object('success', true, 'new_status', 'rejected_by_dept_rep'); END; $$;

CREATE OR REPLACE FUNCTION public.hsse_validate_observation_closure(p_incident_id uuid, p_decision text, p_notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ DECLARE v_user_id uuid; v_tenant_id uuid; v_is_hsse boolean;
BEGIN v_user_id := auth.uid(); IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
SELECT tenant_id INTO v_tenant_id FROM incidents WHERE id = p_incident_id AND event_type = 'observation';
IF v_tenant_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Observation not found'); END IF;
SELECT EXISTS (SELECT 1 FROM user_role_assignments ura JOIN roles r ON r.id = ura.role_id JOIN profiles p ON p.id = ura.user_id WHERE ura.user_id = v_user_id AND ura.tenant_id = v_tenant_id AND r.code IN ('hsse_manager', 'hsse_officer', 'hsse_expert') AND r.is_active = true AND p.deleted_at IS NULL) INTO v_is_hsse;
IF NOT v_is_hsse THEN RETURN jsonb_build_object('success', false, 'error', 'Not authorized'); END IF;
IF p_decision = 'approve' THEN UPDATE incidents SET status = 'closed', closed_at = now(), closed_by = v_user_id, hsse_closure_notes = p_notes, updated_at = now() WHERE id = p_incident_id; RETURN jsonb_build_object('success', true, 'new_status', 'closed');
ELSIF p_decision = 'reject' THEN UPDATE incidents SET status = 'closure_rejected_by_hsse', hsse_closure_notes = p_notes, updated_at = now() WHERE id = p_incident_id; RETURN jsonb_build_object('success', true, 'new_status', 'closure_rejected_by_hsse');
ELSE RETURN jsonb_build_object('success', false, 'error', 'Invalid decision'); END IF; END; $$;

CREATE OR REPLACE FUNCTION public.process_dept_manager_incident_approval(p_incident_id uuid, p_decision text, p_notes text DEFAULT NULL, p_updated_title text DEFAULT NULL, p_updated_description text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ DECLARE v_user_id uuid; v_tenant_id uuid; v_current_status text; v_can_approve boolean; v_new_status text;
BEGIN v_user_id := auth.uid(); IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
SELECT tenant_id, status INTO v_tenant_id, v_current_status FROM incidents WHERE id = p_incident_id;
IF v_tenant_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Incident not found'); END IF;
IF v_current_status != 'pending_dept_manager_approval' THEN RETURN jsonb_build_object('success', false, 'error', 'Not pending approval'); END IF;
SELECT EXISTS (SELECT 1 FROM user_role_assignments ura JOIN roles r ON r.id = ura.role_id JOIN profiles p ON p.id = ura.user_id WHERE ura.user_id = v_user_id AND ura.tenant_id = v_tenant_id AND r.code IN ('department_manager', 'security_manager', 'admin', 'super_admin') AND r.is_active = true AND p.deleted_at IS NULL) INTO v_can_approve;
IF NOT v_can_approve THEN RETURN jsonb_build_object('success', false, 'error', 'Not authorized'); END IF;
IF p_decision = 'approved' THEN v_new_status := 'pending_hsse_review'; ELSIF p_decision = 'rejected' THEN v_new_status := 'rejected_by_dept_manager'; ELSE RETURN jsonb_build_object('success', false, 'error', 'Invalid decision'); END IF;
UPDATE incidents SET status = v_new_status, title = COALESCE(p_updated_title, title), description = COALESCE(p_updated_description, description), dept_manager_decision = p_decision, dept_manager_notes = p_notes, dept_manager_id = v_user_id, dept_manager_decision_at = now(), updated_at = now() WHERE id = p_incident_id;
RETURN jsonb_build_object('success', true, 'new_status', v_new_status); END; $$;