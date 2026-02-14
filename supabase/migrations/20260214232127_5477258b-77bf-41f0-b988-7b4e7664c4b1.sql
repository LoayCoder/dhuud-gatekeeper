-- Create a sequence for gate pass reference numbers to prevent race conditions
CREATE SEQUENCE IF NOT EXISTS public.gate_pass_ref_seq START 1;

-- Grant usage to authenticated users (needed for nextval in RLS context)
GRANT USAGE, SELECT ON SEQUENCE public.gate_pass_ref_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.gate_pass_ref_seq TO anon;