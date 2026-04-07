CREATE OR REPLACE FUNCTION public.validate_gate_pass_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- On UPDATE, only validate if date fields are actually changing
  -- This prevents blocking approval workflows that don't touch dates
  IF TG_OP = 'UPDATE' THEN
    -- If start_date and end_date haven't changed, skip validation
    IF NEW.start_date IS NOT DISTINCT FROM OLD.start_date
       AND NEW.end_date IS NOT DISTINCT FROM OLD.end_date THEN
      -- Still sync pass_date if start_date exists
      IF NEW.start_date IS NOT NULL THEN
        NEW.pass_date := NEW.start_date;
      END IF;
      RETURN NEW;
    END IF;
  END IF;

  -- For INSERT or when dates are being changed, validate fully
  IF NEW.start_date IS NULL THEN RAISE EXCEPTION 'start_date is required'; END IF;
  IF NEW.end_date IS NULL THEN RAISE EXCEPTION 'end_date is required'; END IF;
  IF NEW.end_date < NEW.start_date THEN RAISE EXCEPTION 'end_date cannot be before start_date'; END IF;
  IF NEW.pass_type IN ('in', 'out') AND NEW.end_date != NEW.start_date THEN
    RAISE EXCEPTION 'in/out passes must be for a single day';
  END IF;
  IF NEW.pass_type = 'in_out' AND (NEW.end_date - NEW.start_date) > 7 THEN
    RAISE EXCEPTION 'in_out passes cannot exceed 7 days';
  END IF;

  -- Sync legacy pass_date from start_date
  NEW.pass_date := NEW.start_date;

  RETURN NEW;
END;
$$;