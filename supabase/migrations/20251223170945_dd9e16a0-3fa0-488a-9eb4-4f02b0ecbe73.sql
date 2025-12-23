-- Drop the existing policy first
DROP POLICY IF EXISTS "Admins can manage notification matrix" 
  ON incident_notification_matrix;

-- Create updated policy that handles both NULL and matching tenant_id
CREATE POLICY "Admins can manage notification matrix" 
  ON incident_notification_matrix
  FOR ALL
  TO authenticated
  USING (
    (tenant_id IS NULL OR tenant_id = get_auth_tenant_id())
    AND is_admin(auth.uid())
  )
  WITH CHECK (
    (tenant_id IS NULL OR tenant_id = get_auth_tenant_id())
    AND is_admin(auth.uid())
  );