-- Add device_type and browser_name columns to push_subscriptions
ALTER TABLE public.push_subscriptions 
ADD COLUMN IF NOT EXISTS device_type text DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS browser_name text DEFAULT 'unknown';