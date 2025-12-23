-- =====================================================
-- SECURITY ENHANCEMENT MIGRATION
-- 1. Fix incident_notification_matrix RLS policies
-- 2. Add audit logging trigger for notification matrix
-- 3. Add tenant-configurable session timeout
-- =====================================================

-- =====================================================
-- PART 1: Fix Notification Matrix RLS Policies
-- Drop overly permissive policies and restrict to HSSE + Admin
-- =====================================================

-- Drop existing overly permissive SELECT policies
DROP POLICY IF EXISTS "Tenant users can view notification matrix" ON incident_notification_matrix;
DROP POLICY IF EXISTS "Users can view their tenant notification matrix" ON incident_notification_matrix;
DROP POLICY IF EXISTS "Tenant users can view their notification matrix" ON incident_notification_matrix;

-- Create HSSE-restricted SELECT policy
CREATE POLICY "HSSE personnel can view notification matrix" 
ON incident_notification_matrix FOR SELECT 
TO authenticated
USING (
  (tenant_id = get_auth_tenant_id() OR tenant_id IS NULL)
  AND (
    has_hsse_incident_access(auth.uid()) 
    OR is_admin(auth.uid())
  )
);

-- =====================================================
-- PART 2: Add Audit Logging Trigger
-- Log all changes to notification matrix for security audit
-- =====================================================

-- Create trigger function to log notification matrix changes
CREATE OR REPLACE FUNCTION log_notification_matrix_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO security_audit_logs (
    tenant_id, 
    actor_id, 
    action, 
    table_name, 
    record_id, 
    old_value, 
    new_value,
    created_at
  ) VALUES (
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    auth.uid(),
    TG_OP,
    'incident_notification_matrix',
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
    now()
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if any and create new one
DROP TRIGGER IF EXISTS audit_notification_matrix_changes ON incident_notification_matrix;

CREATE TRIGGER audit_notification_matrix_changes
AFTER INSERT OR UPDATE OR DELETE ON incident_notification_matrix
FOR EACH ROW EXECUTE FUNCTION log_notification_matrix_changes();

-- =====================================================
-- PART 3: Add Tenant-Configurable Session Timeout
-- Add session_timeout_minutes column to tenants table
-- =====================================================

-- Add session timeout configuration column to tenants
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS session_timeout_minutes INTEGER DEFAULT 15;

-- Add constraint for valid timeout range (5 minutes to 8 hours)
ALTER TABLE tenants 
DROP CONSTRAINT IF EXISTS valid_session_timeout;

ALTER TABLE tenants 
ADD CONSTRAINT valid_session_timeout 
CHECK (session_timeout_minutes IS NULL OR (session_timeout_minutes >= 5 AND session_timeout_minutes <= 480));

-- Add comment for documentation
COMMENT ON COLUMN tenants.session_timeout_minutes IS 'Configurable session idle timeout in minutes (5-480). Default is 15 minutes.';

-- =====================================================
-- PART 4: Ensure security_audit_logs has proper structure
-- =====================================================

-- Add table_name column if not exists (for tracking which table was modified)
ALTER TABLE security_audit_logs 
ADD COLUMN IF NOT EXISTS table_name TEXT;

-- Add index for faster querying
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_table_name 
ON security_audit_logs(table_name) 
WHERE table_name IS NOT NULL;