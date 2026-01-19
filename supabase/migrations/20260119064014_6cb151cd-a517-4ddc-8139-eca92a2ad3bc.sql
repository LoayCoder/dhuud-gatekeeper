-- Create validation function to prevent future observation dates
CREATE OR REPLACE FUNCTION public.validate_observation_occurred_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate for observations
  IF NEW.event_type = 'observation' THEN
    -- Prevent future dates (with 5 minute tolerance for clock skew)
    IF NEW.occurred_at > NOW() + INTERVAL '5 minutes' THEN
      RAISE EXCEPTION 'Observation date cannot be in the future';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for insert and update
CREATE TRIGGER check_observation_occurred_at
BEFORE INSERT OR UPDATE ON public.incidents
FOR EACH ROW
EXECUTE FUNCTION public.validate_observation_occurred_at();