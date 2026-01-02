-- Add host arrival notification tracking columns to gate_entry_logs
ALTER TABLE public.gate_entry_logs 
ADD COLUMN IF NOT EXISTS host_arrival_notified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS visit_reference TEXT;

-- Create index for visit reference lookups
CREATE INDEX IF NOT EXISTS idx_gate_entry_logs_visit_reference 
ON public.gate_entry_logs(visit_reference) 
WHERE deleted_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.gate_entry_logs.host_arrival_notified_at IS 'Timestamp when host was notified of visitor arrival for audit trail';
COMMENT ON COLUMN public.gate_entry_logs.visit_reference IS 'Unique visit reference number for tracking (e.g., VIS-ABC123)';