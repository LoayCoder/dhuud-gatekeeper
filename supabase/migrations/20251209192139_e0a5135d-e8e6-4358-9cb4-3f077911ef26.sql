-- Fix calculate_next_inspection_due function search path
CREATE OR REPLACE FUNCTION public.calculate_next_inspection_due()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.last_inspection_date IS NOT NULL THEN
    NEW.next_inspection_due := NEW.last_inspection_date + 
      (COALESCE(NEW.inspection_interval_days, 30) || ' days')::INTERVAL;
  ELSIF NEW.commissioning_date IS NOT NULL AND NEW.inspection_interval_days IS NOT NULL THEN
    NEW.next_inspection_due := NEW.commissioning_date + 
      (NEW.inspection_interval_days || ' days')::INTERVAL;
  END IF;
  RETURN NEW;
END;
$$;