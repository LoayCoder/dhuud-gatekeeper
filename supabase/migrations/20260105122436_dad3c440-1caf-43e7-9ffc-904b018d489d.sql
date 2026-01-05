-- Add template_code_prefix column to tenants table
ALTER TABLE public.tenants 
ADD COLUMN template_code_prefix TEXT;

COMMENT ON COLUMN public.tenants.template_code_prefix 
IS 'Optional prefix for auto-generated inspection template codes (e.g., GS for Golf Saudi)';