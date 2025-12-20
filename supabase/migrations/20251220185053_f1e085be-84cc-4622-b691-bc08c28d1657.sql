-- =============================================
-- NOTIFICATION LOGS TABLE
-- Unified table for all notification delivery tracking
-- =============================================
CREATE TABLE public.notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Channel & Provider (extensible for SMS)
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'sms')),
  provider TEXT NOT NULL CHECK (provider IN ('twilio', 'resend', 'twilio_sms')),
  
  -- Message Details
  provider_message_id TEXT,
  to_address TEXT NOT NULL,
  from_address TEXT,
  template_name TEXT,
  subject TEXT, -- For email
  
  -- DHUUD Unified Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'sent', 'delivered', 'read', 'failed', 'bounced', 'complained'
  )),
  is_final BOOLEAN DEFAULT FALSE,
  
  -- Error Details
  error_code TEXT,
  error_message TEXT,
  
  -- Context linking
  related_entity_type TEXT, -- 'incident', 'gate_entry', 'inspection', etc.
  related_entity_id UUID,
  
  -- Metadata (for fallback logic, etc.)
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- Indexes for efficient querying
CREATE INDEX idx_notification_logs_tenant ON notification_logs(tenant_id);
CREATE INDEX idx_notification_logs_tenant_status ON notification_logs(tenant_id, status);
CREATE INDEX idx_notification_logs_provider_msg ON notification_logs(provider_message_id) WHERE provider_message_id IS NOT NULL;
CREATE INDEX idx_notification_logs_channel ON notification_logs(channel);
CREATE INDEX idx_notification_logs_created ON notification_logs(created_at DESC);
CREATE INDEX idx_notification_logs_related ON notification_logs(related_entity_type, related_entity_id) WHERE related_entity_id IS NOT NULL;

-- Enable RLS
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view notification logs for their tenant
CREATE POLICY "Admins can view notification logs"
ON notification_logs FOR SELECT USING (
  tenant_id = get_auth_tenant_id() AND is_admin(auth.uid())
);

-- HSSE users can view notification logs for their tenant
CREATE POLICY "HSSE users can view notification logs"
ON notification_logs FOR SELECT USING (
  tenant_id = get_auth_tenant_id() AND has_hsse_incident_access(auth.uid())
);

-- Enable realtime for live status updates
ALTER PUBLICATION supabase_realtime ADD TABLE notification_logs;

-- Update trigger
CREATE TRIGGER update_notification_logs_updated_at
BEFORE UPDATE ON notification_logs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- WEBHOOK REQUEST LOGS TABLE
-- Audit log for all incoming webhook requests
-- =============================================
CREATE TABLE public.webhook_request_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT NOT NULL,
  provider TEXT NOT NULL,
  request_body JSONB,
  request_headers JSONB,
  response_status INTEGER,
  processing_result TEXT,
  ip_address TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_webhook_logs_created ON webhook_request_logs(created_at DESC);
CREATE INDEX idx_webhook_logs_provider ON webhook_request_logs(provider);

-- Enable RLS
ALTER TABLE webhook_request_logs ENABLE ROW LEVEL SECURITY;

-- Only super admins can view webhook logs
CREATE POLICY "Super admins can view webhook logs"
ON webhook_request_logs FOR SELECT USING (
  is_admin(auth.uid())
);