-- Fix search_path for the validation function (security best practice)
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
$$ LANGUAGE plpgsql
SET search_path = public;