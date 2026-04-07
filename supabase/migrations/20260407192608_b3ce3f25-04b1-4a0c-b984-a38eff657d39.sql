ALTER TABLE public.contractor_workers
  ADD COLUMN IF NOT EXISTS medical_certificate_path text,
  ADD COLUMN IF NOT EXISTS medical_check_date date,
  ADD COLUMN IF NOT EXISTS fitness_expiry_date date,
  ADD COLUMN IF NOT EXISTS fitness_acknowledged boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS fitness_acknowledged_by uuid,
  ADD COLUMN IF NOT EXISTS fitness_acknowledged_at timestamptz;