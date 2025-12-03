-- Create table for MFA backup codes
CREATE TABLE public.mfa_backup_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_mfa_backup_codes_user_id ON public.mfa_backup_codes(user_id);

-- Enable RLS
ALTER TABLE public.mfa_backup_codes ENABLE ROW LEVEL SECURITY;

-- Users can view their own backup codes (but only see if used, not the hash)
CREATE POLICY "Users can view own backup codes"
ON public.mfa_backup_codes
FOR SELECT
USING (auth.uid() = user_id);

-- Users can delete their own backup codes (for regeneration)
CREATE POLICY "Users can delete own backup codes"
ON public.mfa_backup_codes
FOR DELETE
USING (auth.uid() = user_id);

-- Only service role can insert/update (via edge function)
CREATE POLICY "Service role can manage backup codes"
ON public.mfa_backup_codes
FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- Function to generate backup codes (called from edge function)
CREATE OR REPLACE FUNCTION public.generate_mfa_backup_codes(p_user_id UUID, p_code_hashes TEXT[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete existing backup codes for this user
  DELETE FROM mfa_backup_codes WHERE user_id = p_user_id;
  
  -- Insert new backup codes
  INSERT INTO mfa_backup_codes (user_id, code_hash)
  SELECT p_user_id, unnest(p_code_hashes);
END;
$$;

-- Function to verify and consume a backup code
CREATE OR REPLACE FUNCTION public.verify_mfa_backup_code(p_user_id UUID, p_code_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code_id UUID;
BEGIN
  -- Find unused backup code matching the hash
  SELECT id INTO v_code_id
  FROM mfa_backup_codes
  WHERE user_id = p_user_id
    AND code_hash = p_code_hash
    AND used_at IS NULL
  LIMIT 1;
  
  IF v_code_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Mark code as used
  UPDATE mfa_backup_codes
  SET used_at = now()
  WHERE id = v_code_id;
  
  RETURN TRUE;
END;
$$;