-- Create notification_recipients table for automated notification routing
CREATE TABLE public.notification_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'incident_created', 'incident_critical', 'visitor_registered', 'visitor_checked_in'
  role_code TEXT, -- 'hsse_manager', 'security_manager', 'manager', 'area_manager'
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL, -- NULL = all branches
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- Specific user override
  channel TEXT NOT NULL DEFAULT 'whatsapp', -- 'whatsapp', 'sms', 'push', 'email'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT valid_recipient CHECK (role_code IS NOT NULL OR user_id IS NOT NULL)
);

-- Create index for efficient lookups
CREATE INDEX idx_notification_recipients_lookup ON notification_recipients(tenant_id, event_type, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_notification_recipients_role ON notification_recipients(role_code) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage notification recipients"
ON notification_recipients FOR ALL
USING (tenant_id = get_auth_tenant_id() AND is_admin(auth.uid()));

CREATE POLICY "Users can view notification recipients in their tenant"
ON notification_recipients FOR SELECT
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

-- Trigger for updated_at
CREATE TRIGGER update_notification_recipients_updated_at
BEFORE UPDATE ON notification_recipients
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create notification_logs table to track sent notifications
CREATE TABLE public.auto_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_id UUID NOT NULL, -- incident_id, visitor_id, etc.
  recipient_id UUID REFERENCES profiles(id),
  recipient_phone TEXT,
  channel TEXT NOT NULL,
  message_content TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
  provider_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

-- Create index for lookups
CREATE INDEX idx_auto_notification_logs_event ON auto_notification_logs(tenant_id, event_type, event_id);

-- Enable RLS
ALTER TABLE public.auto_notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for logs
CREATE POLICY "Admins can view notification logs"
ON auto_notification_logs FOR SELECT
USING (tenant_id = get_auth_tenant_id() AND is_admin(auth.uid()));

CREATE POLICY "System can insert notification logs"
ON auto_notification_logs FOR INSERT
WITH CHECK (tenant_id = get_auth_tenant_id());