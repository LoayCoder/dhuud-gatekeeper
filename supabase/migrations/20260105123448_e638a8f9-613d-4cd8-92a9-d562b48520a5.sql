-- Drop the existing unique constraint that includes deleted records
ALTER TABLE public.inspection_templates 
DROP CONSTRAINT IF EXISTS inspection_templates_tenant_id_code_key;

-- Create partial unique index that excludes soft-deleted records
-- This allows reuse of codes from deleted templates
CREATE UNIQUE INDEX inspection_templates_tenant_code_unique 
ON public.inspection_templates (tenant_id, code) 
WHERE deleted_at IS NULL;

COMMENT ON INDEX public.inspection_templates_tenant_code_unique 
IS 'Ensures template codes are unique within a tenant for active (non-deleted) templates';