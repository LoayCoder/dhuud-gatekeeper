-- Drop existing broken policies
DROP POLICY IF EXISTS "Tenant isolation for item photos select" ON public.gate_pass_item_photos;
DROP POLICY IF EXISTS "Users can insert own item photos" ON public.gate_pass_item_photos;
DROP POLICY IF EXISTS "Users can update own item photos" ON public.gate_pass_item_photos;
DROP POLICY IF EXISTS "Users can delete own item photos" ON public.gate_pass_item_photos;
DROP POLICY IF EXISTS "Admins can manage all item photos" ON public.gate_pass_item_photos;

-- Create fixed policies using get_auth_tenant_id()

-- SELECT: All users in tenant can view item photos
CREATE POLICY "Tenant isolation for item photos select"
ON public.gate_pass_item_photos
FOR SELECT
USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
);

-- INSERT: Users can insert photos for their tenant
CREATE POLICY "Users can insert own item photos"
ON public.gate_pass_item_photos
FOR INSERT
WITH CHECK (
  tenant_id = get_auth_tenant_id()
  AND uploaded_by = auth.uid()
);

-- UPDATE: Users can update their own photos
CREATE POLICY "Users can update own item photos"
ON public.gate_pass_item_photos
FOR UPDATE
USING (
  tenant_id = get_auth_tenant_id()
  AND uploaded_by = auth.uid()
);

-- DELETE: Users can soft-delete their own photos
CREATE POLICY "Users can delete own item photos"
ON public.gate_pass_item_photos
FOR DELETE
USING (
  tenant_id = get_auth_tenant_id()
  AND uploaded_by = auth.uid()
);

-- Admin access policy for complete management
CREATE POLICY "Admins can manage all item photos"
ON public.gate_pass_item_photos
FOR ALL
USING (
  tenant_id = get_auth_tenant_id()
  AND is_admin(auth.uid())
);