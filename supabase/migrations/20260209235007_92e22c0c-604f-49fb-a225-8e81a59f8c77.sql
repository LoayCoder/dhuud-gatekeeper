
CREATE OR REPLACE FUNCTION public.validate_gate_pass_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.start_date IS NULL THEN RAISE EXCEPTION 'start_date is required'; END IF;
  IF NEW.end_date IS NULL THEN RAISE EXCEPTION 'end_date is required'; END IF;
  IF NEW.end_date < NEW.start_date THEN RAISE EXCEPTION 'end_date cannot be before start_date'; END IF;
  IF NEW.pass_type IN ('in', 'out') AND NEW.end_date != NEW.start_date THEN
    RAISE EXCEPTION 'in/out passes must be for a single day';
  END IF;
  IF NEW.pass_type = 'in_out' AND (NEW.end_date - NEW.start_date) > 7 THEN
    RAISE EXCEPTION 'in_out passes cannot exceed 7 days';
  END IF;

  -- Sync legacy pass_date from start_date to satisfy NOT NULL constraint
  NEW.pass_date := NEW.start_date;

  RETURN NEW;
END;
$$;
