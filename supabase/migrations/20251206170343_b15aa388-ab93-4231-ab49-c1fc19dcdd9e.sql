-- Add immediate_actions_data JSONB column for structured immediate action data
ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS immediate_actions_data JSONB;

-- Add comment explaining the structure
COMMENT ON COLUMN public.incidents.immediate_actions_data IS 'Structured immediate action data: {description, photo_path, is_closed, closed_by_reporter, hsse_action_required}';

-- Create index for querying pending HSSE actions
CREATE INDEX IF NOT EXISTS idx_incidents_immediate_actions_hsse_required 
ON public.incidents ((immediate_actions_data->>'hsse_action_required'))
WHERE immediate_actions_data IS NOT NULL;