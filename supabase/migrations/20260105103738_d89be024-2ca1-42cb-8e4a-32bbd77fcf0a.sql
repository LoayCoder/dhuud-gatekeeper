-- Fix 1: Function Search Path - Set immutable search_path
CREATE OR REPLACE FUNCTION public.validate_incident_required_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate required fields based on incident type
  IF NEW.incident_type IS NULL THEN
    RAISE EXCEPTION 'Incident type is required';
  END IF;
  
  IF NEW.title IS NULL OR NEW.title = '' THEN
    RAISE EXCEPTION 'Title is required';
  END IF;
  
  IF NEW.description IS NULL OR NEW.description = '' THEN
    RAISE EXCEPTION 'Description is required';
  END IF;
  
  IF NEW.incident_date IS NULL THEN
    RAISE EXCEPTION 'Incident date is required';
  END IF;
  
  IF NEW.reporter_id IS NULL THEN
    RAISE EXCEPTION 'Reporter ID is required';
  END IF;
  
  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant ID is required';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix 2: Nationality Language Mapping - Restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can read nationality mappings" ON public.nationality_language_mapping;

CREATE POLICY "Authenticated users can read nationality mappings"
ON public.nationality_language_mapping
FOR SELECT
TO authenticated
USING (true);

-- Fix 3: Inspection Template Categories - Require authentication for SELECT
DROP POLICY IF EXISTS "Users can view categories in their tenant or system categories" ON public.inspection_template_categories;

CREATE POLICY "Authenticated users can view tenant or system categories"
ON public.inspection_template_categories
FOR SELECT
TO authenticated
USING (
  (tenant_id = (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()))
  OR 
  (tenant_id IS NULL AND is_system = true)
);