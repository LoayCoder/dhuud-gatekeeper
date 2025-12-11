-- Add assignment_notes column to investigations table for HSSE Expert notes
ALTER TABLE public.investigations 
ADD COLUMN IF NOT EXISTS assignment_notes TEXT;