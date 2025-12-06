
-- Create function to check if incident is still editable (not closed)
CREATE OR REPLACE FUNCTION public.is_incident_editable(p_incident_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM incidents 
    WHERE id = p_incident_id 
    AND status != 'closed'
    AND deleted_at IS NULL
  )
$$;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can delete evidence" ON evidence_items;
DROP POLICY IF EXISTS "HSSE users can update evidence" ON evidence_items;
DROP POLICY IF EXISTS "HSSE users can create evidence" ON evidence_items;

-- New INSERT policy: HSSE can create ONLY if incident is NOT closed
CREATE POLICY "HSSE users can create evidence during investigation"
ON evidence_items FOR INSERT
WITH CHECK (
  tenant_id = get_auth_tenant_id()
  AND has_hsse_incident_access(auth.uid())
  AND is_incident_editable(incident_id)
);

-- New UPDATE policy: HSSE can update/soft-delete ONLY if incident is NOT closed
CREATE POLICY "HSSE users can update evidence during investigation"
ON evidence_items FOR UPDATE USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
  AND has_hsse_incident_access(auth.uid())
  AND is_incident_editable(incident_id)
);
