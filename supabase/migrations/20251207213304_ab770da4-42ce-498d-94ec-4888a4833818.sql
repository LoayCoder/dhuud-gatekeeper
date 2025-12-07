-- Add digest preferences columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS digest_opt_in BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS digest_preferred_time TIME DEFAULT '07:00:00',
ADD COLUMN IF NOT EXISTS digest_timezone TEXT DEFAULT 'Asia/Riyadh';

-- Enable realtime for corrective_actions table
ALTER PUBLICATION supabase_realtime ADD TABLE public.corrective_actions;

-- Create index for faster SLA dashboard queries
CREATE INDEX IF NOT EXISTS idx_corrective_actions_sla_status 
ON public.corrective_actions(tenant_id, status, due_date, escalation_level) 
WHERE deleted_at IS NULL;