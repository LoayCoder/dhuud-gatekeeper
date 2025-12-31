-- Add the missing enum value for incident Dept Rep review
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'pending_dept_rep_incident_review' AFTER 'pending_dept_rep_approval';

-- Update existing submitted observations to pending_dept_rep_approval
UPDATE incidents 
SET status = 'pending_dept_rep_approval'
WHERE event_type = 'observation' 
  AND status = 'submitted'
  AND deleted_at IS NULL;

-- Auto-assign department representatives where possible
WITH dept_reps AS (
  SELECT DISTINCT ON (p.assigned_department_id) 
    p.assigned_department_id,
    ura.user_id as dept_rep_id
  FROM user_role_assignments ura
  JOIN roles r ON r.id = ura.role_id
  JOIN profiles p ON p.id = ura.user_id
  WHERE r.code = 'department_representative'
    AND r.is_active = true
)
UPDATE incidents i
SET approval_manager_id = dr.dept_rep_id
FROM dept_reps dr
WHERE i.department_id = dr.assigned_department_id
  AND i.event_type = 'observation'
  AND i.status = 'pending_dept_rep_approval'
  AND i.approval_manager_id IS NULL
  AND i.deleted_at IS NULL;