-- Create audit log table for menu access changes
CREATE TABLE public.menu_access_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id),
  action text NOT NULL, -- 'grant' or 'revoke'
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.menu_access_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view audit logs in their tenant
CREATE POLICY "Admins can view menu access audit logs"
  ON public.menu_access_audit_logs
  FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND has_role(auth.uid(), 'admin'::app_role));

-- System can insert audit logs
CREATE POLICY "System can insert menu access audit logs"
  ON public.menu_access_audit_logs
  FOR INSERT
  WITH CHECK (tenant_id = get_auth_tenant_id());

-- Create index for faster queries
CREATE INDEX idx_menu_access_audit_tenant_created 
  ON public.menu_access_audit_logs(tenant_id, created_at DESC);

CREATE INDEX idx_menu_access_audit_role 
  ON public.menu_access_audit_logs(role_id);