-- Fix RLS Visibility Logic
-- 1. Create Helper Function
-- 2. Update Corrective Actions Policy

-- Helper function to check if user is an Admin or Manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean AS $$
BEGIN
  -- 1. Check for Super Admin flag on profile
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_super_admin = true
  ) THEN
    RETURN TRUE;
  END IF;

  -- 2. Check for specific roles in user_role_assignments
  -- Roles: admin, super_admin (if used as code), hsse_manager, facility_manager
  RETURN EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    JOIN public.roles r ON ura.role_id = r.id
    WHERE ura.user_id = auth.uid()
    AND r.code IN ('admin', 'super_admin', 'hsse_manager', 'facility_manager')
    AND r.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the existing policy to replace it
DROP POLICY IF EXISTS "Branch-isolated view corrective_actions" ON public.corrective_actions;

-- Create the State-Aware Policy
CREATE POLICY "Branch-isolated view corrective_actions"
ON public.corrective_actions FOR SELECT TO authenticated
USING (
  -- 1. Standard Tenant Check (and deletion check)
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND deleted_at IS NULL
  AND (
    -- 2. Creator Override: The person who made it can always see it (even if pending)
    created_by = auth.uid()
    OR
    -- 3. Assignee Visibility Gate: Can only see if parent incident is RELEASED/APPROVED
    -- We cast status to text to avoid enum errors if 'released' is not yet in the enum
    (
      assigned_to = auth.uid()
      AND EXISTS (
        SELECT 1 FROM incidents i
        WHERE i.id = corrective_actions.incident_id
        AND i.status::text IN ('released', 'closed', 'approved', 'investigation_closed', 'contractor_violation_enforced', 'pending_final_closure')
      )
    )
    OR
    -- 4. Managers/Admins can always see
    public.is_admin_or_manager()
  )
);
