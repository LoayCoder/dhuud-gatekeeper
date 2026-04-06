
ALTER TABLE public.contractor_workers
  ADD COLUMN photo_verified_by UUID REFERENCES public.profiles(id),
  ADD COLUMN photo_verified_at TIMESTAMPTZ;
