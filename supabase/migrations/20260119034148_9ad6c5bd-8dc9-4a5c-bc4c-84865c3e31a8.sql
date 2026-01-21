-- Migration: Add validation trigger for site_departments to prevent cross-branch assignments
-- and clean up existing invalid data

-- Step 1: Soft-delete existing cross-branch site-department mappings
-- These are records where the site's branch_id doesn't match the department's branch_id
UPDATE public.site_departments sd
SET deleted_at = NOW()
WHERE deleted_at IS NULL
  AND EXISTS (
    SELECT 1 
    FROM public.sites s
    JOIN public.departments d ON d.id = sd.department_id
    WHERE s.id = sd.site_id
      AND s.branch_id IS NOT NULL
      AND d.branch_id IS NOT NULL
      AND s.branch_id != d.branch_id
  );

-- Step 2: Create a validation function to prevent future cross-branch assignments
CREATE OR REPLACE FUNCTION public.validate_site_department_branch_consistency()
RETURNS TRIGGER AS $$
DECLARE
  site_branch_id uuid;
  dept_branch_id uuid;
BEGIN
  -- Get the site's branch_id
  SELECT branch_id INTO site_branch_id
  FROM public.sites
  WHERE id = NEW.site_id AND deleted_at IS NULL;

  -- Get the department's branch_id
  SELECT branch_id INTO dept_branch_id
  FROM public.departments
  WHERE id = NEW.department_id AND deleted_at IS NULL;

  -- If both have branch_ids and they differ, block the operation
  -- Allow if either is null (hybrid/tenant-wide entities)
  IF site_branch_id IS NOT NULL 
     AND dept_branch_id IS NOT NULL 
     AND site_branch_id != dept_branch_id THEN
    RAISE EXCEPTION 'Cannot assign department from branch % to site from branch %. Site and department must belong to the same branch.', 
      dept_branch_id, site_branch_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 3: Create trigger to validate on insert and update
DROP TRIGGER IF EXISTS validate_site_department_branch_trigger ON public.site_departments;

CREATE TRIGGER validate_site_department_branch_trigger
  BEFORE INSERT OR UPDATE ON public.site_departments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_site_department_branch_consistency();

-- Add comment explaining the constraint
COMMENT ON FUNCTION public.validate_site_department_branch_consistency() IS 
  'Ensures site_departments entries only link sites and departments from the same branch. 
   Allows hybrid entities (null branch_id) to be assigned anywhere.';
