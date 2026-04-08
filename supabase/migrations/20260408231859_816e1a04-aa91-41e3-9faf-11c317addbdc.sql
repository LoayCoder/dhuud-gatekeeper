CREATE OR REPLACE FUNCTION public.validate_mobilization_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'in_progress', 'approved', 'rejected', 'draft') THEN
    RAISE EXCEPTION 'Invalid mobilization status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;