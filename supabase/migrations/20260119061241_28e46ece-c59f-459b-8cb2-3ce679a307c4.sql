-- =================================================================
-- PHASE 2: Add branch_id to ptw_permits with proper RLS
-- =================================================================

-- Add branch_id column to ptw_permits
ALTER TABLE ptw_permits 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);

-- Create index for branch_id lookups
CREATE INDEX IF NOT EXISTS idx_ptw_permits_branch_id ON ptw_permits(branch_id);

-- Populate branch_id from site's branch_id for existing records
UPDATE ptw_permits p
SET branch_id = s.branch_id
FROM sites s
WHERE p.site_id = s.id 
AND p.branch_id IS NULL
AND s.branch_id IS NOT NULL;

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Branch-isolated view ptw_permits" ON ptw_permits;
DROP POLICY IF EXISTS "Branch-isolated insert ptw_permits" ON ptw_permits;
DROP POLICY IF EXISTS "Branch-isolated update ptw_permits" ON ptw_permits;
DROP POLICY IF EXISTS "Users can view permits in their tenant" ON ptw_permits;
DROP POLICY IF EXISTS "Users can create permits in their tenant" ON ptw_permits;
DROP POLICY IF EXISTS "Users can update permits in their tenant" ON ptw_permits;

-- Create new branch-isolated RLS policies for ptw_permits
CREATE POLICY "Branch-isolated view ptw_permits" ON ptw_permits
FOR SELECT USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
  AND (branch_id IS NULL OR can_access_branch(auth.uid(), branch_id))
);

CREATE POLICY "Branch-isolated insert ptw_permits" ON ptw_permits
FOR INSERT WITH CHECK (
  tenant_id = get_auth_tenant_id()
  AND (branch_id IS NULL OR can_access_branch(auth.uid(), branch_id))
);

CREATE POLICY "Branch-isolated update ptw_permits" ON ptw_permits
FOR UPDATE USING (
  tenant_id = get_auth_tenant_id()
  AND (branch_id IS NULL OR can_access_branch(auth.uid(), branch_id))
);

-- =================================================================
-- PHASE 3: Add branch-isolated RLS to other operational tables
-- =================================================================

-- contractor_projects - Drop old policies and add branch-isolated
DROP POLICY IF EXISTS "Users can view contractor projects in their tenant" ON contractor_projects;
DROP POLICY IF EXISTS "Branch-isolated view contractor_projects" ON contractor_projects;

CREATE POLICY "Branch-isolated view contractor_projects" ON contractor_projects
FOR SELECT USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
  AND (branch_id IS NULL OR can_access_branch(auth.uid(), branch_id))
);

-- visitors - Drop old policies and add branch-isolated
DROP POLICY IF EXISTS "Users can view visitors in their tenant" ON visitors;
DROP POLICY IF EXISTS "Branch-isolated view visitors" ON visitors;

CREATE POLICY "Branch-isolated view visitors" ON visitors
FOR SELECT USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
  AND (branch_id IS NULL OR can_access_branch(auth.uid(), branch_id))
);

-- visit_requests - Drop old policies and add branch-isolated
DROP POLICY IF EXISTS "Users can view visit requests in their tenant" ON visit_requests;
DROP POLICY IF EXISTS "Branch-isolated view visit_requests" ON visit_requests;

CREATE POLICY "Branch-isolated view visit_requests" ON visit_requests
FOR SELECT USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
  AND (branch_id IS NULL OR can_access_branch(auth.uid(), branch_id))
);