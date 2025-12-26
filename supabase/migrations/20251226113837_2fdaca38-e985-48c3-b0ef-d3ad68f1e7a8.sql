-- Add Potential Severity fields to incidents table
-- This allows investigators to document what COULD have happened (worst-case scenario)
-- Uses same approval workflow as Actual Severity

-- Add potential severity column (same enum as severity_v2)
ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS potential_severity_v2 severity_level_v2;

-- Add original potential severity (for tracking changes)
ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS original_potential_severity_v2 severity_level_v2;

-- Add pending approval flag for potential severity changes
ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS potential_severity_pending_approval boolean DEFAULT false;

-- Add justification for potential severity
ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS potential_severity_justification text;

-- Add approval tracking for potential severity
ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS potential_severity_approved_by uuid REFERENCES auth.users(id);

ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS potential_severity_approved_at timestamptz;

-- Add comment explaining the field
COMMENT ON COLUMN public.incidents.potential_severity_v2 IS 'Potential severity - what could have happened in worst-case scenario';
COMMENT ON COLUMN public.incidents.original_potential_severity_v2 IS 'Original potential severity before investigator change';
COMMENT ON COLUMN public.incidents.potential_severity_pending_approval IS 'Whether potential severity change is pending HSSE Manager approval';
COMMENT ON COLUMN public.incidents.potential_severity_justification IS 'Justification for potential severity assessment';