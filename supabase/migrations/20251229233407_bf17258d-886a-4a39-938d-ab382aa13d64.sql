-- Enable pgcrypto extension if not already enabled and make it accessible
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- Update the generate_reference_id_and_qr function to use public.gen_random_bytes
CREATE OR REPLACE FUNCTION public.generate_reference_id_and_qr()
RETURNS TRIGGER AS $$
DECLARE
  year_suffix TEXT;
  sequence_num INTEGER;
BEGIN
  year_suffix := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(NULLIF(SPLIT_PART(reference_id, '-', 3), '') AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM ptw_permits
  WHERE tenant_id = NEW.tenant_id
    AND reference_id LIKE 'PTW-' || year_suffix || '-%';
  
  NEW.reference_id := 'PTW-' || year_suffix || '-' || LPAD(sequence_num::text, 5, '0');
  NEW.qr_code_token := 'PTW-' || encode(public.gen_random_bytes(16), 'hex');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update generate_gatepass_qr function
CREATE OR REPLACE FUNCTION public.generate_gatepass_qr()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate QR token when both PM and safety have approved
  IF NEW.pm_approved_at IS NOT NULL 
     AND NEW.safety_approved_at IS NOT NULL 
     AND OLD.qr_code_token IS NULL 
     AND NEW.qr_code_token IS NULL THEN
    NEW.qr_code_token := 'GP-' || encode(public.gen_random_bytes(16), 'hex');
    NEW.qr_generated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;