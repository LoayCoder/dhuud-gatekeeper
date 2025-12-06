-- Add contributing_factors_list JSONB column to investigations table
-- This enables multiple contributing factors similar to root_causes
ALTER TABLE public.investigations 
ADD COLUMN IF NOT EXISTS contributing_factors_list JSONB DEFAULT '[]'::jsonb;

-- Add linked_cause_type to corrective_actions to differentiate between root cause and contributing factor links
ALTER TABLE public.corrective_actions 
ADD COLUMN IF NOT EXISTS linked_cause_type TEXT DEFAULT NULL;

-- Add index for linked_cause_type filtering
CREATE INDEX IF NOT EXISTS idx_corrective_actions_linked_cause_type 
ON public.corrective_actions(linked_cause_type) 
WHERE linked_cause_type IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.investigations.contributing_factors_list IS 'Array of contributing factors: [{id: uuid, text: string}]';
COMMENT ON COLUMN public.corrective_actions.linked_cause_type IS 'Type of linked cause: root_cause or contributing_factor';