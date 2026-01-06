-- Create webauthn_credentials table for storing biometric public keys
CREATE TABLE public.webauthn_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id text NOT NULL,
  public_key text NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  device_name text,
  transports text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  deleted_at timestamptz,
  UNIQUE(credential_id)
);

-- Create webauthn_challenges table for temporary challenge storage
CREATE TABLE public.webauthn_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  challenge text NOT NULL,
  type text NOT NULL CHECK (type IN ('registration', 'authentication')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_webauthn_credentials_user_id ON public.webauthn_credentials(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_webauthn_challenges_expires ON public.webauthn_challenges(expires_at);

-- Enable RLS
ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for webauthn_credentials
CREATE POLICY "Users can view their own credentials"
ON public.webauthn_credentials FOR SELECT TO authenticated
USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can insert their own credentials"
ON public.webauthn_credentials FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own credentials"
ON public.webauthn_credentials FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own credentials"
ON public.webauthn_credentials FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- RLS Policies for webauthn_challenges (service role only for edge functions)
CREATE POLICY "Service role can manage challenges"
ON public.webauthn_challenges FOR ALL
USING (true)
WITH CHECK (true);

-- Function to clean up expired challenges
CREATE OR REPLACE FUNCTION public.cleanup_expired_webauthn_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.webauthn_challenges WHERE expires_at < now();
END;
$$;