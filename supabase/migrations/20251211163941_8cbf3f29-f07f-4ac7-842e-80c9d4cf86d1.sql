-- Fix trusted_devices: Add trigger to auto-populate tenant_id from user's profile
CREATE OR REPLACE FUNCTION public.set_trusted_device_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-populate tenant_id from the user's profile
  IF NEW.tenant_id IS NULL THEN
    SELECT tenant_id INTO NEW.tenant_id FROM public.profiles WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS set_trusted_device_tenant_id_trigger ON public.trusted_devices;
CREATE TRIGGER set_trusted_device_tenant_id_trigger
BEFORE INSERT ON public.trusted_devices
FOR EACH ROW EXECUTE FUNCTION public.set_trusted_device_tenant_id();

-- Simplify SELECT policy - user_id alone is sufficient for device trust lookup
DROP POLICY IF EXISTS "Users can view own trusted devices" ON public.trusted_devices;
CREATE POLICY "Users can view own trusted devices"
ON public.trusted_devices FOR SELECT
USING (auth.uid() = user_id);

-- Fix INSERT policy to allow insert without tenant_id (trigger will set it)
DROP POLICY IF EXISTS "Users can add trusted devices" ON public.trusted_devices;
CREATE POLICY "Users can add trusted devices"
ON public.trusted_devices FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Fix UPDATE policy
DROP POLICY IF EXISTS "Users can update own trusted devices" ON public.trusted_devices;
CREATE POLICY "Users can update own trusted devices"
ON public.trusted_devices FOR UPDATE
USING (auth.uid() = user_id);

-- Clean up any orphaned records without tenant_id
UPDATE public.trusted_devices td
SET tenant_id = p.tenant_id
FROM public.profiles p
WHERE td.user_id = p.id AND td.tenant_id IS NULL;