-- Drop the existing check constraint and add a new one with the additional type
ALTER TABLE public.webauthn_challenges 
DROP CONSTRAINT webauthn_challenges_type_check;

ALTER TABLE public.webauthn_challenges 
ADD CONSTRAINT webauthn_challenges_type_check 
CHECK (type = ANY (ARRAY['registration'::text, 'authentication'::text, 'discoverable_authentication'::text]));