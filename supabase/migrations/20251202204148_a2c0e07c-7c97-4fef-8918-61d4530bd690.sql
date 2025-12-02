-- Add new MFA event types to the activity_event_type enum
ALTER TYPE public.activity_event_type ADD VALUE IF NOT EXISTS 'mfa_enabled';
ALTER TYPE public.activity_event_type ADD VALUE IF NOT EXISTS 'mfa_disabled';
ALTER TYPE public.activity_event_type ADD VALUE IF NOT EXISTS 'mfa_verification_failed';