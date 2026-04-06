-- Fix PTW permit function: use extensions.gen_random_bytes instead of unqualified call
CREATE OR REPLACE FUNCTION public.generate_ptw_permit_reference_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  NEW.qr_code_token := 'PTW-' || encode(extensions.gen_random_bytes(16), 'hex');
  RETURN NEW;
END;
$function$;

-- Fix gatepass QR function: same schema reference fix
CREATE OR REPLACE FUNCTION public.generate_gatepass_qr()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.pm_approved_at IS NOT NULL 
     AND NEW.safety_approved_at IS NOT NULL 
     AND OLD.qr_code_token IS NULL 
     AND NEW.qr_code_token IS NULL THEN
    NEW.qr_code_token := 'GP-' || encode(extensions.gen_random_bytes(16), 'hex');
    NEW.qr_generated_at := NOW();
  END IF;
  RETURN NEW;
END;
$function$;