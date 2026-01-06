-- Create site_sections table
CREATE TABLE public.site_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  UNIQUE(site_id, section_id)
);

-- Enable RLS
ALTER TABLE public.site_sections ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view their tenant's data
CREATE POLICY "Users can view their tenant site_sections" ON public.site_sections
FOR SELECT TO authenticated
USING (tenant_id = public.get_auth_tenant_id());

-- INSERT: Admin or data_entry can add
CREATE POLICY "Data entry users can insert site_sections" ON public.site_sections
FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.get_auth_tenant_id() AND public.can_manage_data(auth.uid()));

-- UPDATE: Admin or data_entry can update
CREATE POLICY "Data entry users can update site_sections" ON public.site_sections
FOR UPDATE TO authenticated
USING (tenant_id = public.get_auth_tenant_id() AND public.can_manage_data(auth.uid()))
WITH CHECK (tenant_id = public.get_auth_tenant_id() AND public.can_manage_data(auth.uid()));

-- DELETE: Admin only (soft delete pattern - but we keep hard delete policy for admin)
CREATE POLICY "Only admins can delete site_sections" ON public.site_sections
FOR DELETE TO authenticated
USING (tenant_id = public.get_auth_tenant_id() AND public.is_tenant_admin(auth.uid()));

-- Create function to auto-remove sections when department is removed from site
CREATE OR REPLACE FUNCTION public.cascade_site_department_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a department is soft-deleted from a site, also soft-delete its sections
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    UPDATE public.site_sections ss
    SET deleted_at = NEW.deleted_at
    WHERE ss.site_id = NEW.site_id
      AND ss.deleted_at IS NULL
      AND ss.section_id IN (
        SELECT s.id FROM public.sections s
        WHERE s.department_id = NEW.department_id
      );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for cascade removal
CREATE TRIGGER trigger_cascade_site_department_removal
AFTER UPDATE ON public.site_departments
FOR EACH ROW
EXECUTE FUNCTION public.cascade_site_department_removal();