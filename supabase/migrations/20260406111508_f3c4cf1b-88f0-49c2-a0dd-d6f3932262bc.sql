-- Fix duplicate reference number: first deduplicate existing data
UPDATE public.material_gate_passes 
SET reference_number = reference_number || '-DUP-' || LEFT(id::text, 8)
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY tenant_id, reference_number ORDER BY created_at ASC) as rn
    FROM public.material_gate_passes
    WHERE deleted_at IS NULL
  ) sub WHERE rn > 1
);

-- Add unique constraint
ALTER TABLE public.material_gate_passes 
ADD CONSTRAINT uq_material_gate_passes_tenant_ref 
UNIQUE (tenant_id, reference_number);

-- Create auto-expire function
CREATE OR REPLACE FUNCTION public.auto_expire_pending_gate_passes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count integer;
BEGIN
  UPDATE material_gate_passes
  SET status = 'expired',
      updated_at = now()
  WHERE deleted_at IS NULL
    AND end_date < CURRENT_DATE
    AND status IN (
      'pending_contractor_approval',
      'pending_club_mgmt_ack', 
      'pending_security_approval',
      'pending_dept_approval',
      'pending_safety_approval'
    );
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  IF expired_count > 0 THEN
    RAISE LOG 'Auto-expired % pending gate passes past end_date', expired_count;
  END IF;
  
  RETURN expired_count;
END;
$$;

-- Grant execute to authenticated users (for edge function calls)
GRANT EXECUTE ON FUNCTION public.auto_expire_pending_gate_passes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_expire_pending_gate_passes() TO service_role;