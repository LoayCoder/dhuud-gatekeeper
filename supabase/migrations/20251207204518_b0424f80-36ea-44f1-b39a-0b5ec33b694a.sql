-- Add closure tracking columns to incidents table
ALTER TABLE public.incidents 
ADD COLUMN closure_requested_by UUID REFERENCES public.profiles(id),
ADD COLUMN closure_requested_at TIMESTAMPTZ,
ADD COLUMN closure_request_notes TEXT,
ADD COLUMN closure_approved_by UUID REFERENCES public.profiles(id),
ADD COLUMN closure_approved_at TIMESTAMPTZ,
ADD COLUMN closure_rejection_notes TEXT;