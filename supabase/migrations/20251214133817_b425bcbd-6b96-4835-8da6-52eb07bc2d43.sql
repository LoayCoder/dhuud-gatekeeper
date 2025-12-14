-- Create push_subscriptions table for Web Push notifications
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  device_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT unique_user_endpoint UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only manage their own subscriptions
CREATE POLICY "Users can view own subscriptions"
ON public.push_subscriptions FOR SELECT
USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can create own subscriptions"
ON public.push_subscriptions FOR INSERT
WITH CHECK (user_id = auth.uid() AND tenant_id = get_auth_tenant_id());

CREATE POLICY "Users can update own subscriptions"
ON public.push_subscriptions FOR UPDATE
USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can delete own subscriptions"
ON public.push_subscriptions FOR DELETE
USING (user_id = auth.uid());

-- Service role can manage all subscriptions (for edge functions)
CREATE POLICY "Service role can manage all subscriptions"
ON public.push_subscriptions FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Indexes for efficient lookups
CREATE INDEX idx_push_subscriptions_user_active 
ON public.push_subscriptions(user_id) 
WHERE is_active = true AND deleted_at IS NULL;

CREATE INDEX idx_push_subscriptions_tenant_active 
ON public.push_subscriptions(tenant_id) 
WHERE is_active = true AND deleted_at IS NULL;

CREATE INDEX idx_push_subscriptions_expires 
ON public.push_subscriptions(expires_at) 
WHERE is_active = true AND expires_at IS NOT NULL;

-- Add comment
COMMENT ON TABLE public.push_subscriptions IS 'Stores Web Push notification subscription data for users';