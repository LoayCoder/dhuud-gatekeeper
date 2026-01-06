-- Step 1: Drop the problematic policy causing infinite recursion
DROP POLICY IF EXISTS "profiles_self_and_tenant" ON profiles;

-- Step 2: Ensure bypass function exists and is SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_auth_tenant_id_bypass()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
$$;

-- Step 3: Create trigger to mark invitations as used when user signs up
CREATE OR REPLACE FUNCTION mark_invitation_used_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE invitations 
  SET used = true 
  WHERE LOWER(email) = LOWER(NEW.email) 
    AND used = false 
    AND deleted_at IS NULL;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_profile_created_mark_invitation ON profiles;

-- Create the trigger
CREATE TRIGGER on_profile_created_mark_invitation
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION mark_invitation_used_on_signup();