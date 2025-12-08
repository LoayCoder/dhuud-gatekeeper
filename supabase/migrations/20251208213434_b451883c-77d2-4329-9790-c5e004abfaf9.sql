-- Add new incident status enum values for HSSE workflow
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'expert_screening';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'returned_to_reporter';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'expert_rejected';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'no_investigation_required';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'pending_manager_approval';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'manager_rejected';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'hsse_manager_escalation';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'investigation_pending';

-- Add new columns to incidents table for HSSE workflow

-- Expert Screening Fields
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS expert_screened_by UUID REFERENCES profiles(id);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS expert_screened_at TIMESTAMPTZ;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS expert_screening_notes TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS expert_recommendation TEXT;

-- Return to Reporter Fields
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS returned_by UUID REFERENCES profiles(id);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS return_reason TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS return_instructions TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS resubmission_count INTEGER DEFAULT 0;

-- Report Rejection Fields
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS expert_rejected_by UUID REFERENCES profiles(id);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS expert_rejected_at TIMESTAMPTZ;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS expert_rejection_reason TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS reporter_rejection_confirmed_at TIMESTAMPTZ;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS reporter_disputes_rejection BOOLEAN DEFAULT false;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS reporter_dispute_notes TEXT;

-- No Investigation Fields
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS no_investigation_justification TEXT;

-- Manager Approval Fields
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS approval_manager_id UUID REFERENCES profiles(id);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS manager_decision TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS manager_decision_at TIMESTAMPTZ;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS manager_rejection_reason TEXT;

-- HSSE Manager Escalation Fields
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS escalated_to_hsse_manager_at TIMESTAMPTZ;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS hsse_manager_decision TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS hsse_manager_decision_by UUID REFERENCES profiles(id);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS hsse_manager_justification TEXT;

-- Add comments for documentation
COMMENT ON COLUMN incidents.expert_recommendation IS 'investigate | no_investigation | return | reject';
COMMENT ON COLUMN incidents.manager_decision IS 'approved | rejected';
COMMENT ON COLUMN incidents.hsse_manager_decision IS 'override | maintain';

-- Create function to get department manager for an incident
CREATE OR REPLACE FUNCTION get_incident_department_manager(p_incident_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_reporter_id UUID;
  v_department_id UUID;
  v_manager_id UUID;
BEGIN
  -- Get reporter's department
  SELECT i.reporter_id, p.assigned_department_id
  INTO v_reporter_id, v_department_id
  FROM incidents i
  JOIN profiles p ON p.id = i.reporter_id
  WHERE i.id = p_incident_id;
  
  IF v_department_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Find a user with manager role in that department
  SELECT p.id INTO v_manager_id
  FROM profiles p
  JOIN user_role_assignments ura ON ura.user_id = p.id
  JOIN roles r ON r.id = ura.role_id
  WHERE p.assigned_department_id = v_department_id
    AND r.code = 'manager'
    AND p.is_active = true
    AND (p.is_deleted IS NULL OR p.is_deleted = false)
  LIMIT 1;
  
  RETURN v_manager_id;
END;
$$;

-- Create function to check if user can perform expert screening
CREATE OR REPLACE FUNCTION can_perform_expert_screening(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT has_role(_user_id, 'admin'::app_role) 
    OR has_role_by_code(_user_id, 'hsse_officer')
    OR has_role_by_code(_user_id, 'hsse_expert')
    OR has_role_by_code(_user_id, 'hsse_manager')
$$;

-- Create function to check if user can approve investigation (manager of reporter's department)
CREATE OR REPLACE FUNCTION can_approve_investigation(_user_id UUID, _incident_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_reporter_department_id UUID;
  v_user_department_id UUID;
  v_is_manager BOOLEAN;
BEGIN
  -- Admins and HSSE Managers can always approve
  IF has_role(_user_id, 'admin'::app_role) OR has_role_by_code(_user_id, 'hsse_manager') THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is a manager
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = _user_id AND r.code = 'manager'
  ) INTO v_is_manager;
  
  IF NOT v_is_manager THEN
    RETURN FALSE;
  END IF;
  
  -- Get reporter's department
  SELECT p.assigned_department_id INTO v_reporter_department_id
  FROM incidents i
  JOIN profiles p ON p.id = i.reporter_id
  WHERE i.id = _incident_id;
  
  -- Get user's department
  SELECT assigned_department_id INTO v_user_department_id
  FROM profiles WHERE id = _user_id;
  
  -- Manager must be in same department as reporter
  RETURN v_reporter_department_id IS NOT NULL 
    AND v_user_department_id IS NOT NULL 
    AND v_reporter_department_id = v_user_department_id;
END;
$$;