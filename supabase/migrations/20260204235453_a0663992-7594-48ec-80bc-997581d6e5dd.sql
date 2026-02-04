-- Add custom domain column for public gate pass URLs
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS public_gate_pass_domain TEXT;

-- Add comment for documentation
COMMENT ON COLUMN tenants.public_gate_pass_domain IS 
  'Custom domain URL for public gate pass requests (e.g., https://www.dhuud.com)';