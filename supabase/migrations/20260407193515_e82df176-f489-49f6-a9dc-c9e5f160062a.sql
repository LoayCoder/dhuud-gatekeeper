
-- Add access control columns
ALTER TABLE public.contractor_workers
  ADD COLUMN IF NOT EXISTS user_type text DEFAULT 'short_term_contractor',
  ADD COLUMN IF NOT EXISTS access_start_date date,
  ADD COLUMN IF NOT EXISTS access_end_date date,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS expiry_warning_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS expiry_final_warning_sent_at timestamptz;

-- Create trigger function to enforce 3-month access cap
CREATE OR REPLACE FUNCTION public.enforce_contractor_access_duration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_end_date date;
  v_project_start_date date;
  v_max_end_date date;
BEGIN
  -- Only enforce for contractor users
  IF NEW.user_type = 'short_term_contractor' THEN
    -- On approval (status changing to approved), set approved_at and compute dates
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
      NEW.approved_at := COALESCE(NEW.approved_at, now());
    END IF;

    -- If we have an approval date and a project, compute access dates
    IF NEW.approved_at IS NOT NULL AND NEW.project_id IS NOT NULL THEN
      SELECT start_date, end_date INTO v_project_start_date, v_project_end_date
      FROM contractor_projects
      WHERE id = NEW.project_id;

      -- Access start = project start date or approval date
      NEW.access_start_date := COALESCE(v_project_start_date, NEW.approved_at::date);

      -- Max end = 3 months from approval
      v_max_end_date := (NEW.approved_at::date + interval '3 months')::date;

      -- Access end = LEAST(project end, approval + 3 months)
      IF v_project_end_date IS NOT NULL THEN
        NEW.access_end_date := LEAST(v_project_end_date, v_max_end_date);
      ELSE
        NEW.access_end_date := v_max_end_date;
      END IF;
    END IF;

    -- Prevent manual override: always enforce the cap
    IF NEW.approved_at IS NOT NULL AND NEW.access_end_date IS NOT NULL THEN
      v_max_end_date := (NEW.approved_at::date + interval '3 months')::date;
      IF NEW.access_end_date > v_max_end_date THEN
        NEW.access_end_date := v_max_end_date;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_enforce_contractor_access_duration ON public.contractor_workers;
CREATE TRIGGER trg_enforce_contractor_access_duration
  BEFORE INSERT OR UPDATE ON public.contractor_workers
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_contractor_access_duration();
