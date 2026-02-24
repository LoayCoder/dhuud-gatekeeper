
-- 1. Soft-delete stale branch assignments for users with full branch access
UPDATE public.user_branch_assignments
SET deleted_at = NOW()
WHERE user_id IN (
  SELECT id FROM public.profiles
  WHERE has_full_branch_access = true
)
AND deleted_at IS NULL;

-- 2. Create trigger to auto-cleanup when full access is enabled
CREATE OR REPLACE FUNCTION public.cleanup_branch_assignments_on_full_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When has_full_branch_access is set to true, soft-delete all active branch assignments
  IF NEW.has_full_branch_access = true AND (OLD.has_full_branch_access IS DISTINCT FROM true) THEN
    UPDATE public.user_branch_assignments
    SET deleted_at = NOW()
    WHERE user_id = NEW.id
    AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cleanup_branch_assignments_on_full_access
BEFORE UPDATE ON public.profiles
FOR EACH ROW
WHEN (NEW.has_full_branch_access = true AND OLD.has_full_branch_access IS DISTINCT FROM true)
EXECUTE FUNCTION public.cleanup_branch_assignments_on_full_access();
