-- Migration: Add review status fields for specialist data review cycles
-- This enables the Leader Review workflow per the architecture spec

-- Add review status to incident_injuries
ALTER TABLE public.incident_injuries
  ADD COLUMN IF NOT EXISTS review_status TEXT CHECK (review_status IN ('draft', 'submitted', 'approved', 'returned')) DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- Add review status to incident_property_damages
ALTER TABLE public.incident_property_damages
  ADD COLUMN IF NOT EXISTS review_status TEXT CHECK (review_status IN ('draft', 'submitted', 'approved', 'returned')) DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- Add review status to environmental_incident_details
ALTER TABLE public.environmental_incident_details
  ADD COLUMN IF NOT EXISTS review_status TEXT CHECK (review_status IN ('draft', 'submitted', 'approved', 'returned')) DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- Create indexes for performance on review queries
CREATE INDEX IF NOT EXISTS idx_incident_injuries_review_status
  ON public.incident_injuries(review_status, incident_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_incident_property_damages_review_status
  ON public.incident_property_damages(review_status, incident_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_environmental_details_review_status
  ON public.environmental_incident_details(review_status, incident_id);

-- Add comment for documentation
COMMENT ON COLUMN public.incident_injuries.review_status IS 'Review status: draft (being edited), submitted (awaiting review), approved (validated by reviewer), returned (needs corrections)';
COMMENT ON COLUMN public.incident_property_damages.review_status IS 'Review status: draft (being edited), submitted (awaiting review), approved (validated by reviewer), returned (needs corrections)';
COMMENT ON COLUMN public.environmental_incident_details.review_status IS 'Review status: draft (being edited), submitted (awaiting review), approved (validated by reviewer), returned (needs corrections)';
