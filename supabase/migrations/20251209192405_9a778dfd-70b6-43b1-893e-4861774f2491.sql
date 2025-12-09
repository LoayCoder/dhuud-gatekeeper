-- Fix the second calculate_next_inspection_due function (with parameters)
CREATE OR REPLACE FUNCTION public.calculate_next_inspection_due(
  p_frequency_type text, 
  p_frequency_value integer, 
  p_last_due date, 
  p_day_of_week integer DEFAULT NULL::integer, 
  p_day_of_month integer DEFAULT NULL::integer
)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_next_due DATE;
BEGIN
  CASE p_frequency_type
    WHEN 'daily' THEN 
      v_next_due := p_last_due + (p_frequency_value || ' days')::interval;
    WHEN 'weekly' THEN 
      v_next_due := p_last_due + (p_frequency_value * 7 || ' days')::interval;
    WHEN 'monthly' THEN 
      v_next_due := p_last_due + (p_frequency_value || ' months')::interval;
    WHEN 'quarterly' THEN 
      v_next_due := p_last_due + (p_frequency_value * 3 || ' months')::interval;
    WHEN 'semi_annually' THEN 
      v_next_due := p_last_due + (p_frequency_value * 6 || ' months')::interval;
    WHEN 'annually' THEN 
      v_next_due := p_last_due + (p_frequency_value || ' years')::interval;
    ELSE 
      v_next_due := p_last_due + (p_frequency_value || ' days')::interval;
  END CASE;
  
  -- Adjust for day_of_month if specified
  IF p_day_of_month IS NOT NULL AND p_frequency_type IN ('monthly', 'quarterly', 'semi_annually', 'annually') THEN
    v_next_due := make_date(
      EXTRACT(YEAR FROM v_next_due)::INT,
      EXTRACT(MONTH FROM v_next_due)::INT,
      LEAST(p_day_of_month, (DATE_TRUNC('month', v_next_due) + INTERVAL '1 month - 1 day')::DATE - DATE_TRUNC('month', v_next_due)::DATE + 1)
    );
  END IF;
  
  RETURN v_next_due;
END;
$$;