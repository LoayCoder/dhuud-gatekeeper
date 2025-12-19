-- Create login_history table for detailed login tracking
CREATE TABLE IF NOT EXISTS public.login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT,
  ip_address TEXT,
  country_code TEXT,
  country_name TEXT,
  city TEXT,
  region TEXT,
  isp TEXT,
  is_vpn BOOLEAN DEFAULT false,
  is_proxy BOOLEAN DEFAULT false,
  device_fingerprint TEXT,
  user_agent TEXT,
  platform TEXT,
  browser TEXT,
  risk_score INTEGER DEFAULT 0,
  risk_factors JSONB DEFAULT '[]'::jsonb,
  is_suspicious BOOLEAN DEFAULT false,
  is_new_device BOOLEAN DEFAULT false,
  is_new_location BOOLEAN DEFAULT false,
  login_success BOOLEAN DEFAULT true,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Create index for efficient queries
CREATE INDEX idx_login_history_user_id ON public.login_history(user_id);
CREATE INDEX idx_login_history_created_at ON public.login_history(created_at DESC);
CREATE INDEX idx_login_history_is_suspicious ON public.login_history(is_suspicious) WHERE is_suspicious = true;
CREATE INDEX idx_login_history_tenant_id ON public.login_history(tenant_id);
CREATE INDEX idx_login_history_ip_address ON public.login_history(ip_address);

-- Enable RLS
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- Admins can view all login history for their tenant
CREATE POLICY "Admins can view tenant login history" ON public.login_history
  FOR SELECT USING (
    is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_role_assignments ura
      JOIN public.roles r ON r.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND r.code IN ('security_officer', 'security_supervisor', 'security_manager')
    )
  );

-- Users can view their own login history
CREATE POLICY "Users can view own login history" ON public.login_history
  FOR SELECT USING (user_id = auth.uid());

-- Service role can insert login history (edge function uses service role)
CREATE POLICY "Service role can insert login history" ON public.login_history
  FOR INSERT WITH CHECK (true);

-- Enable realtime for login_history
ALTER PUBLICATION supabase_realtime ADD TABLE public.login_history;