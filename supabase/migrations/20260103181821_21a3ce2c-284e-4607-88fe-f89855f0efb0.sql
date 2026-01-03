-- Drop the incorrect unique constraint that blocks multiple translations
ALTER TABLE public.page_content_versions 
DROP CONSTRAINT IF EXISTS unique_main_page;

-- Create a partial unique index for main pages only
-- This allows only one main page per tenant/page_type while allowing multiple translations (is_main = false)
CREATE UNIQUE INDEX IF NOT EXISTS unique_main_page_per_tenant 
ON public.page_content_versions (tenant_id, page_type) 
WHERE is_main = true AND deleted_at IS NULL;