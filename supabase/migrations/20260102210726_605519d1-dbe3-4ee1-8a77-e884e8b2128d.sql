-- Add deleted_at column for soft-delete compliance (HSSA data retention)
ALTER TABLE public.visitors 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add visit_end_time to track when visit expires (for 1-hour warning)
ALTER TABLE public.visitors 
ADD COLUMN IF NOT EXISTS visit_end_time TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add expiry_warning_sent_at to prevent duplicate warnings
ALTER TABLE public.visitors 
ADD COLUMN IF NOT EXISTS expiry_warning_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add last_scanned_at to track when QR was last scanned
ALTER TABLE public.visitors 
ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for soft-delete queries
CREATE INDEX IF NOT EXISTS idx_visitors_deleted_at ON public.visitors(deleted_at) WHERE deleted_at IS NULL;

-- Create index for expiration checks
CREATE INDEX IF NOT EXISTS idx_visitors_visit_end_time ON public.visitors(visit_end_time) WHERE visit_end_time IS NOT NULL AND deleted_at IS NULL;