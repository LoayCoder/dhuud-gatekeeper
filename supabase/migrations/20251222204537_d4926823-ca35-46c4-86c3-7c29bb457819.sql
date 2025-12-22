-- Add optional user_id column to incident_notification_matrix for user-specific notifications
ALTER TABLE incident_notification_matrix 
ADD COLUMN user_id UUID REFERENCES profiles(id);

-- Create index for faster lookups
CREATE INDEX idx_notification_matrix_user_id ON incident_notification_matrix(user_id) WHERE user_id IS NOT NULL;

-- Add unique constraint for tenant + role + severity + user combination
CREATE UNIQUE INDEX idx_notification_matrix_unique_rule ON incident_notification_matrix(tenant_id, stakeholder_role, severity_level, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'));

-- Update RLS policy to allow authenticated users to manage their tenant's matrix
CREATE POLICY "Users can view their tenant notification matrix"
ON incident_notification_matrix FOR SELECT
TO authenticated
USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "Admins can manage their tenant notification matrix"
ON incident_notification_matrix FOR ALL
TO authenticated
USING (tenant_id = get_auth_tenant_id() AND is_admin(auth.uid()))
WITH CHECK (tenant_id = get_auth_tenant_id() AND is_admin(auth.uid()));

-- Create function to reset notification matrix to defaults
CREATE OR REPLACE FUNCTION reset_notification_matrix_to_defaults(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Delete all tenant-specific rules
  DELETE FROM incident_notification_matrix WHERE tenant_id = p_tenant_id;
  
  -- Insert default rules for the tenant
  INSERT INTO incident_notification_matrix (
    tenant_id, stakeholder_role, severity_level, 
    notify_push, notify_email, notify_whatsapp, 
    condition_type, is_default
  )
  SELECT 
    p_tenant_id, stakeholder_role, severity_level,
    notify_push, notify_email, notify_whatsapp,
    condition_type, true
  FROM incident_notification_matrix
  WHERE tenant_id IS NULL; -- Copy from system defaults
END;
$$;