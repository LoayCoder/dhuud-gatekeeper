-- Drop the OLD stale overload that uses wrong column names (p_branch_id uuid signature)
DROP FUNCTION IF EXISTS public.submit_public_gate_pass(
  text, uuid, text, text, text, text, text, text, text, text, text, text, text, text, date, boolean, boolean, boolean, text, jsonb, date, date
);

-- Also check and drop any stale get_public_gate_pass_status overloads
DROP FUNCTION IF EXISTS public.get_public_gate_pass_status(text);

-- Reload PostgREST schema cache to pick up the correct function
NOTIFY pgrst, 'reload schema';