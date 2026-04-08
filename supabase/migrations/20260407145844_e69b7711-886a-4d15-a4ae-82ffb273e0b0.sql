ALTER TABLE public.risk_assessment_team
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;