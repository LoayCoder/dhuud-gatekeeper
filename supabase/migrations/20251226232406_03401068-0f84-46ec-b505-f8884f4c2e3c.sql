-- Phase 2: Database Security Hardening
-- Add performance indexes for HSSE queries

-- Index for dashboard queries filtering by severity and status
CREATE INDEX IF NOT EXISTS idx_incidents_tenant_severity_status 
ON incidents (tenant_id, severity, status) 
WHERE deleted_at IS NULL;

-- Index for event type filtering
CREATE INDEX IF NOT EXISTS idx_incidents_tenant_event_type 
ON incidents (tenant_id, event_type) 
WHERE deleted_at IS NULL;

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_incidents_tenant_occurred_at 
ON incidents (tenant_id, occurred_at DESC) 
WHERE deleted_at IS NULL;

-- Phase 3: Tighten RLS Policies

-- Drop overly permissive policies on profiles if they exist
DROP POLICY IF EXISTS "Users can view profiles in their tenant" ON profiles;

-- Create tighter profile access policy
CREATE POLICY "profiles_tenant_scoped_access" ON profiles
FOR SELECT TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND (
    -- Own profile
    id = auth.uid()
    -- Or admin/HSSE manager can see all tenant profiles
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role_by_code(auth.uid(), 'hsse_manager')
    -- Or manager can see department members
    OR (
      has_role_by_code(auth.uid(), 'manager')
      AND assigned_department_id IN (
        SELECT assigned_department_id FROM profiles WHERE id = auth.uid()
      )
    )
  )
);

-- Tighten visitors table access - only security roles and admins
DROP POLICY IF EXISTS "Users can view visitors in their tenant" ON visitors;

CREATE POLICY "visitors_security_role_access" ON visitors
FOR SELECT TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND (
    -- Admin access
    has_role(auth.uid(), 'admin'::app_role)
    -- Security roles
    OR has_security_access(auth.uid())
  )
);

-- Add comment for documentation
COMMENT ON INDEX idx_incidents_tenant_severity_status IS 'Performance index for HSSE dashboard severity/status filtering';
COMMENT ON INDEX idx_incidents_tenant_event_type IS 'Performance index for HSSE event type filtering';
COMMENT ON INDEX idx_incidents_tenant_occurred_at IS 'Performance index for HSSE date-based queries';