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
  NEW.qr_code_token := 'PTW-' || encode(extensions.gen_random_bytes(16), 'hex');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;