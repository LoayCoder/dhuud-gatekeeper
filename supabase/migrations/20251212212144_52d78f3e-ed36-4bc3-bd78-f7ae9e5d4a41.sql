-- Email Delivery Tracking Table
CREATE TABLE public.email_delivery_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  function_name TEXT NOT NULL,
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'permanently_failed')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  provider_message_id TEXT,
  related_entity_type TEXT,
  related_entity_id UUID,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ
);

-- Indexes for efficient querying
CREATE INDEX idx_email_delivery_logs_tenant_id ON public.email_delivery_logs(tenant_id);
CREATE INDEX idx_email_delivery_logs_status ON public.email_delivery_logs(status);
CREATE INDEX idx_email_delivery_logs_next_retry ON public.email_delivery_logs(status, next_retry_at) WHERE status = 'failed';
CREATE INDEX idx_email_delivery_logs_related ON public.email_delivery_logs(related_entity_type, related_entity_id);
CREATE INDEX idx_email_delivery_logs_created ON public.email_delivery_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.email_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Admin can view logs for their tenant
CREATE POLICY "Admins can view email logs for their tenant"
ON public.email_delivery_logs
FOR SELECT
USING (
  tenant_id = get_auth_tenant_id() 
  AND is_admin(auth.uid())
);

-- Service role can insert/update (edge functions use service role)
CREATE POLICY "Service role can manage email logs"
ON public.email_delivery_logs
FOR ALL
USING (true)
WITH CHECK (true);

-- Updated_at trigger
CREATE TRIGGER update_email_delivery_logs_updated_at
BEFORE UPDATE ON public.email_delivery_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.email_delivery_logs IS 'Tracks email delivery status with retry logic for workflow notifications';