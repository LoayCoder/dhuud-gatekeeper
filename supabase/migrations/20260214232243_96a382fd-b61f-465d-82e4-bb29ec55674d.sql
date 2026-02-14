-- Create a simple RPC wrapper for nextval so frontend can call it
CREATE OR REPLACE FUNCTION public.nextval_gate_pass_ref()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nextval('gate_pass_ref_seq');
$$;