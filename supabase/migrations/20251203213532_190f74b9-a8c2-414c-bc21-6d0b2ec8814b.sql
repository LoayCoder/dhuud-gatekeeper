-- Add MFA trust duration setting to tenants table
ALTER TABLE public.tenants 
ADD COLUMN mfa_trust_duration_days INTEGER DEFAULT 15;

-- Add comment for documentation
COMMENT ON COLUMN public.tenants.mfa_trust_duration_days IS 'Number of days a device remains trusted after MFA verification (default 15)';