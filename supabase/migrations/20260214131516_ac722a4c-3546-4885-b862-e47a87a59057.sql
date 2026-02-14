ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_notes TEXT,
  ADD COLUMN IF NOT EXISTS investigation_locked BOOLEAN DEFAULT false;