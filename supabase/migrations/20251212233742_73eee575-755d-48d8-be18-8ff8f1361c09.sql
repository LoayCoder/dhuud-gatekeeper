-- Enable RLS on asset_categories table
ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read asset categories
CREATE POLICY "Authenticated users can read asset categories" 
ON public.asset_categories 
FOR SELECT 
TO authenticated 
USING (true);

-- Allow admins to manage asset categories
CREATE POLICY "Admins can manage asset categories" 
ON public.asset_categories 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON ura.role_id = r.id
    WHERE ura.user_id = auth.uid()
    AND r.code = 'admin'
  )
);