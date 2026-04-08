CREATE POLICY "Allow authenticated read public gate pass tenant info"
ON public.tenants
FOR SELECT
TO authenticated
USING (allow_public_gate_pass_requests = true);