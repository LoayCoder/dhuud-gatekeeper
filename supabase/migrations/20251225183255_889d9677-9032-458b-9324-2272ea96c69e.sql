-- Add return flow columns to witness_statements table
ALTER TABLE public.witness_statements 
ADD COLUMN IF NOT EXISTS return_reason text,
ADD COLUMN IF NOT EXISTS return_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS returned_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS returned_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone;

-- Add comment for documentation
COMMENT ON COLUMN public.witness_statements.return_reason IS 'Reason provided when statement is returned for corrections';
COMMENT ON COLUMN public.witness_statements.return_count IS 'Number of times statement has been returned';
COMMENT ON COLUMN public.witness_statements.returned_by IS 'User who returned the statement';
COMMENT ON COLUMN public.witness_statements.returned_at IS 'Timestamp when statement was returned';
COMMENT ON COLUMN public.witness_statements.reviewed_by IS 'User who approved the statement';
COMMENT ON COLUMN public.witness_statements.reviewed_at IS 'Timestamp when statement was approved';