-- Add has_full_branch_access column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS has_full_branch_access boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN profiles.has_full_branch_access IS 'When true, user has access to all organizational branches instead of a single assigned branch';