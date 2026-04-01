
-- Re-add the dropped policy with correct column names
CREATE POLICY "incident_rca_restricted_select" ON public.incident_rca
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_auth_tenant_id()
    AND (
      has_hsse_incident_access(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.incidents i
        WHERE i.id = incident_rca.incident_id
          AND i.approval_manager_id = auth.uid()
          AND i.deleted_at IS NULL
      )
      OR EXISTS (
        SELECT 1 FROM public.investigations inv
        WHERE inv.incident_id = incident_rca.incident_id
          AND inv.investigator_id = auth.uid()
          AND inv.deleted_at IS NULL
      )
    )
  );
