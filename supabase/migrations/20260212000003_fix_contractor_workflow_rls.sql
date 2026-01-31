-- Fix Corrective Actions RLS for Contractor Workflow
-- Allows Incident Approvers (Site Client) and Contractor Reps to view actions during workflow

DROP POLICY IF EXISTS "Branch-isolated view corrective_actions" ON public.corrective_actions;

CREATE POLICY "Branch-isolated view corrective_actions"
ON public.corrective_actions FOR SELECT TO authenticated
USING (
  -- 1. Standard Tenant Check (and deletion check)
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND deleted_at IS NULL
  AND (
    -- 2. Creator Override: The person who made it can always see it
    created_by = auth.uid()
    OR
    -- 3. Assignee Visibility Gate: Can only see if parent incident is in allowed status
    (
      assigned_to = auth.uid()
      AND EXISTS (
        SELECT 1 FROM incidents i
        WHERE i.id = corrective_actions.incident_id
        AND i.status::text IN (
          'released', 'closed', 'approved', 'investigation_closed',
          'contractor_violation_enforced', 'pending_final_closure',
          -- Contractor Workflow Statuses
          'pending_site_client_approval',
          'pending_contractor_implementation',
          'pending_consultant_verification',
          'pending_action_dispute_review'
        )
      )
    )
    OR
    -- 4. Managers/Admins can always see
    public.is_admin_or_manager()
    OR
    -- 5. Incident Approver Visibility: The current approver of the incident can see actions
    -- This covers Site Client during pending_site_client_approval
    EXISTS (
        SELECT 1 FROM incidents i
        WHERE i.id = corrective_actions.incident_id
        AND i.approval_manager_id = auth.uid()
    )
  )
);
