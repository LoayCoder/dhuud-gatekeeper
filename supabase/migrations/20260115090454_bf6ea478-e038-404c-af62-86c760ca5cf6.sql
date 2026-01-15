-- Enhanced Asset Type Parts: Add subtype linking and content count
-- 1. Add new columns
ALTER TABLE public.asset_type_parts 
  ADD COLUMN IF NOT EXISTS subtype_id UUID REFERENCES public.asset_subtypes(id),
  ADD COLUMN IF NOT EXISTS content_count INTEGER,
  ADD COLUMN IF NOT EXISTS content_count_label TEXT;

-- 2. Make type_id nullable (parts can now be on subtype instead)
ALTER TABLE public.asset_type_parts 
  ALTER COLUMN type_id DROP NOT NULL;

-- 3. Add constraint: Must have either type_id OR subtype_id (not both, not neither)
ALTER TABLE public.asset_type_parts 
  ADD CONSTRAINT check_type_or_subtype 
  CHECK (
    (type_id IS NOT NULL AND subtype_id IS NULL) OR 
    (type_id IS NULL AND subtype_id IS NOT NULL)
  );

-- 4. Add index for subtype_id lookups
CREATE INDEX IF NOT EXISTS idx_asset_type_parts_subtype_id 
  ON public.asset_type_parts(subtype_id) 
  WHERE subtype_id IS NOT NULL AND deleted_at IS NULL;

-- 5. Add RLS policy for subtype-based parts
CREATE POLICY "Users can manage subtype parts within their tenant"
  ON public.asset_type_parts
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- 6. Drop the old unique constraint if it exists and create a new one
DO $$ 
BEGIN
  -- Try to drop old constraint
  ALTER TABLE public.asset_type_parts 
    DROP CONSTRAINT IF EXISTS asset_type_parts_tenant_id_type_id_code_key;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 7. Create function for auto-generating part codes
CREATE OR REPLACE FUNCTION public.generate_asset_part_code()
RETURNS TRIGGER AS $$
DECLARE
  base_code TEXT;
  final_code TEXT;
  counter INTEGER := 0;
BEGIN
  -- Only generate if code is empty or null
  IF NEW.code IS NULL OR NEW.code = '' THEN
    -- Generate base code from name (uppercase, replace spaces with hyphens, limit to 20 chars)
    base_code := UPPER(REGEXP_REPLACE(
      SUBSTRING(COALESCE(NEW.name, 'PART') FROM 1 FOR 20),
      '[^A-Za-z0-9]', '-', 'g'
    ));
    
    -- Remove consecutive hyphens and trim
    base_code := REGEXP_REPLACE(base_code, '-+', '-', 'g');
    base_code := TRIM(BOTH '-' FROM base_code);
    
    -- Try to find unique code
    final_code := base_code;
    WHILE EXISTS (
      SELECT 1 FROM public.asset_type_parts 
      WHERE code = final_code 
        AND tenant_id = NEW.tenant_id
        AND COALESCE(type_id, '00000000-0000-0000-0000-000000000000') = COALESCE(NEW.type_id, '00000000-0000-0000-0000-000000000000')
        AND COALESCE(subtype_id, '00000000-0000-0000-0000-000000000000') = COALESCE(NEW.subtype_id, '00000000-0000-0000-0000-000000000000')
        AND deleted_at IS NULL
    ) LOOP
      counter := counter + 1;
      final_code := base_code || '-' || counter;
    END LOOP;
    
    NEW.code := final_code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. Create trigger for auto-generating codes
DROP TRIGGER IF EXISTS trigger_generate_asset_part_code ON public.asset_type_parts;
CREATE TRIGGER trigger_generate_asset_part_code
  BEFORE INSERT ON public.asset_type_parts
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_asset_part_code();