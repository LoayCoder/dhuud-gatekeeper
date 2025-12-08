-- Add metadata column to invitations table for storing pre-fill user data
ALTER TABLE public.invitations 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add comment explaining the column purpose
COMMENT ON COLUMN public.invitations.metadata IS 'Stores user profile data (full_name, roles, hierarchy assignments) to be applied when user signs up';