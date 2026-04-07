
CREATE OR REPLACE FUNCTION public.enforce_contractor_access_duration()
RETURNS trigger AS $$
BEGIN
  IF NEW.approval_status = 'approved' AND (OLD.approval_status IS NULL OR OLD.approval_status != 'approved') THEN
    IF NEW.start_date IS NULL THEN
      NEW.start_date := NOW();
    END IF;
    IF NEW.end_date IS NULL THEN
      NEW.end_date := NOW() + INTERVAL '1 year';
    END IF;
  END IF;

  IF NEW.approval_status = 'cancelled' THEN
    NEW.end_date := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS enforce_contractor_access_duration_trigger ON public.contractor_workers;
CREATE TRIGGER enforce_contractor_access_duration_trigger
BEFORE INSERT OR UPDATE ON public.contractor_workers
FOR EACH ROW
EXECUTE FUNCTION public.enforce_contractor_access_duration();
