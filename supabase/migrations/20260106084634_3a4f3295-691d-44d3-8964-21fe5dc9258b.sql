-- Create verified_devices table for invitation verification persistence
CREATE TABLE public.verified_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL,
  device_name TEXT,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  verified_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ, -- NULL = never expires
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ -- Soft delete support
);

-- Enable RLS
ALTER TABLE public.verified_devices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own verified devices"
  ON public.verified_devices FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can insert own verified devices"
  ON public.verified_devices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own verified devices"
  ON public.verified_devices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own verified devices"
  ON public.verified_devices FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_verified_devices_user_token ON public.verified_devices(user_id, device_token) WHERE deleted_at IS NULL;
CREATE INDEX idx_verified_devices_tenant ON public.verified_devices(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_verified_devices_device_token ON public.verified_devices(device_token) WHERE deleted_at IS NULL;