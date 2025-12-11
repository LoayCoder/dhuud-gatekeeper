-- Add missing investigator assignment tracking columns
ALTER TABLE public.investigations 
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES auth.users(id);