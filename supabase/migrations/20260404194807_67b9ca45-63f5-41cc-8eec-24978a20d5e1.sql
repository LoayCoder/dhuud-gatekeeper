
-- Fix contractor_companies RLS policies to use assigned_branch_id

DROP POLICY IF EXISTS "Branch-isolated insert contractor_companies" ON contractor_companies;
CREATE POLICY "Branch-isolated insert contractor_companies"
ON contractor_companies
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = get_auth_tenant_id()
  AND (
    (assigned_branch_id IS NULL) OR can_access_branch(auth.uid(), assigned_branch_id)
  )
);

DROP POLICY IF EXISTS "Branch-isolated update contractor_companies" ON contractor_companies;
CREATE POLICY "Branch-isolated update contractor_companies"
ON contractor_companies
FOR UPDATE
TO authenticated
USING (
  tenant_id = get_auth_tenant_id()
  AND (
    (assigned_branch_id IS NULL) OR can_access_branch(auth.uid(), assigned_branch_id)
  )
)
WITH CHECK (
  tenant_id = get_auth_tenant_id()
  AND (
    (assigned_branch_id IS NULL) OR can_access_branch(auth.uid(), assigned_branch_id)
  )
);

DROP POLICY IF EXISTS "Branch-isolated view contractor_companies" ON contractor_companies;
CREATE POLICY "Branch-isolated view contractor_companies"
ON contractor_companies
FOR SELECT
TO authenticated
USING (
  tenant_id = get_auth_tenant_id()
  AND (
    (assigned_branch_id IS NULL) OR can_access_branch(auth.uid(), assigned_branch_id)
  )
  AND deleted_at IS NULL
);

-- Fix contractor_workers RLS policies to check company's assigned_branch_id

DROP POLICY IF EXISTS "Branch-isolated insert contractor_workers" ON contractor_workers;
CREATE POLICY "Branch-isolated insert contractor_workers"
ON contractor_workers
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = get_auth_tenant_id()
  AND (
    NOT EXISTS (
      SELECT 1 FROM contractor_companies cc
      WHERE cc.id = contractor_workers.company_id
      AND cc.assigned_branch_id IS NOT NULL
    )
    OR EXISTS (
      SELECT 1 FROM contractor_companies cc
      WHERE cc.id = contractor_workers.company_id
      AND can_access_branch(auth.uid(), cc.assigned_branch_id)
    )
  )
);

DROP POLICY IF EXISTS "Branch-isolated update contractor_workers" ON contractor_workers;
CREATE POLICY "Branch-isolated update contractor_workers"
ON contractor_workers
FOR UPDATE
TO authenticated
USING (
  tenant_id = get_auth_tenant_id()
  AND (
    NOT EXISTS (
      SELECT 1 FROM contractor_companies cc
      WHERE cc.id = contractor_workers.company_id
      AND cc.assigned_branch_id IS NOT NULL
    )
    OR EXISTS (
      SELECT 1 FROM contractor_companies cc
      WHERE cc.id = contractor_workers.company_id
      AND can_access_branch(auth.uid(), cc.assigned_branch_id)
    )
  )
)
WITH CHECK (
  tenant_id = get_auth_tenant_id()
  AND (
    NOT EXISTS (
      SELECT 1 FROM contractor_companies cc
      WHERE cc.id = contractor_workers.company_id
      AND cc.assigned_branch_id IS NOT NULL
    )
    OR EXISTS (
      SELECT 1 FROM contractor_companies cc
      WHERE cc.id = contractor_workers.company_id
      AND can_access_branch(auth.uid(), cc.assigned_branch_id)
    )
  )
);

DROP POLICY IF EXISTS "Branch-isolated view contractor_workers" ON contractor_workers;
CREATE POLICY "Branch-isolated view contractor_workers"
ON contractor_workers
FOR SELECT
TO authenticated
USING (
  tenant_id = get_auth_tenant_id()
  AND (
    NOT EXISTS (
      SELECT 1 FROM contractor_companies cc
      WHERE cc.id = contractor_workers.company_id
      AND cc.assigned_branch_id IS NOT NULL
    )
    OR EXISTS (
      SELECT 1 FROM contractor_companies cc
      WHERE cc.id = contractor_workers.company_id
      AND can_access_branch(auth.uid(), cc.assigned_branch_id)
    )
  )
  AND deleted_at IS NULL
);
