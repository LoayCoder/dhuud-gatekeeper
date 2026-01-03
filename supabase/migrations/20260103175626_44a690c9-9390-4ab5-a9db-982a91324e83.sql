-- Create table for HSSE notification delivery logs
CREATE TABLE public.hsse_notification_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  notification_id UUID NOT NULL REFERENCES hsse_notifications(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'push', 'whatsapp')),
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('employee', 'worker', 'visitor')),
  recipient_id UUID,
  recipient_address TEXT NOT NULL,
  recipient_name TEXT,
  recipient_language TEXT DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  provider TEXT,
  provider_message_id TEXT,
  error_code TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_hsse_delivery_tenant ON hsse_notification_delivery_logs(tenant_id);
CREATE INDEX idx_hsse_delivery_notification ON hsse_notification_delivery_logs(notification_id);
CREATE INDEX idx_hsse_delivery_status ON hsse_notification_delivery_logs(status);
CREATE INDEX idx_hsse_delivery_channel ON hsse_notification_delivery_logs(channel);
CREATE INDEX idx_hsse_delivery_created ON hsse_notification_delivery_logs(created_at DESC);

-- RLS Policy
ALTER TABLE hsse_notification_delivery_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for HSSE delivery logs"
ON hsse_notification_delivery_logs
FOR ALL
USING (
  tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  )
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE hsse_notification_delivery_logs;

-- Add updated_at trigger
CREATE TRIGGER update_hsse_notification_delivery_logs_updated_at
  BEFORE UPDATE ON hsse_notification_delivery_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();