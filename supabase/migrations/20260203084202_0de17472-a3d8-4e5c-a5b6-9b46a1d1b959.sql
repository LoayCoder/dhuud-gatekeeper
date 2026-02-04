-- Fix the trigger function to use extensions schema for gen_random_bytes
CREATE OR REPLACE FUNCTION public.generate_gate_pass_qr_token()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Only generate if status just changed to 'approved' and QR token is empty
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') AND NEW.qr_code_token IS NULL THEN
    NEW.qr_code_token := 'GP-' || encode(extensions.gen_random_bytes(16), 'hex');
    NEW.qr_generated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- Now add the missing columns
-- 1. ADD DATE RANGE COLUMNS
ALTER TABLE public.material_gate_passes
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Migrate existing pass_date to start_date and end_date
UPDATE public.material_gate_passes
SET start_date = pass_date, end_date = pass_date
WHERE start_date IS NULL AND pass_date IS NOT NULL;

-- 2. ADD RENEWAL TRACKING COLUMNS
ALTER TABLE public.material_gate_passes
ADD COLUMN IF NOT EXISTS renewal_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS renewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS renewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS original_end_date DATE,
ADD COLUMN IF NOT EXISTS renewal_expires_at TIMESTAMPTZ;

-- 3. ADD INDEX FOR EFFICIENT QUERIES
CREATE INDEX IF NOT EXISTS idx_gate_passes_date_range
ON public.material_gate_passes(start_date, end_date, status)
WHERE deleted_at IS NULL;