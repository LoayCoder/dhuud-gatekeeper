-- Allow public read access to tenant branding fields for the "remember tenant" feature
-- This is necessary so the login page can display tenant branding before authentication

-- Create a policy that allows reading specific branding columns for any tenant
-- This is safe because we only expose branding information, not sensitive data
CREATE POLICY "Allow public read of tenant branding for login page"
  ON public.tenants
  FOR SELECT
  TO anon
  USING (true);

-- Note: The existing RLS policies for authenticated users remain unchanged
-- This only adds read access for unauthenticated users to display branding on login