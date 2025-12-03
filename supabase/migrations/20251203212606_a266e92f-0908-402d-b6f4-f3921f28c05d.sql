-- Create trusted_devices table for MFA trust management
CREATE TABLE public.trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  device_token TEXT NOT NULL UNIQUE,
  device_name TEXT,
  trusted_until TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- Index for fast lookups
CREATE INDEX idx_trusted_devices_user_id ON public.trusted_devices(user_id);
CREATE INDEX idx_trusted_devices_token ON public.trusted_devices(device_token);

-- Enable RLS
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

-- Users can only see their own trusted devices
CREATE POLICY "Users can view own trusted devices" 
ON public.trusted_devices 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trusted devices" 
ON public.trusted_devices 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trusted devices" 
ON public.trusted_devices 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trusted devices" 
ON public.trusted_devices 
FOR DELETE 
USING (auth.uid() = user_id);