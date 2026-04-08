-- Add residual_severity column
ALTER TABLE public.site_clearance_risks 
ADD COLUMN residual_severity TEXT DEFAULT NULL;

-- Update validation trigger to also validate residual_severity
CREATE OR REPLACE FUNCTION public.validate_risk_severity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.severity NOT IN ('low', 'medium', 'high', 'critical') THEN
    RAISE EXCEPTION 'Invalid severity value: %', NEW.severity;
  END IF;
  IF NEW.residual_severity IS NOT NULL AND NEW.residual_severity NOT IN ('low', 'medium', 'high', 'critical') THEN
    RAISE EXCEPTION 'Invalid residual_severity value: %', NEW.residual_severity;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;