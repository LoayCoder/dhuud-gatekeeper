
-- Add new event types for user management audit logging
ALTER TYPE public.activity_event_type ADD VALUE IF NOT EXISTS 'user_created';
ALTER TYPE public.activity_event_type ADD VALUE IF NOT EXISTS 'user_updated';
ALTER TYPE public.activity_event_type ADD VALUE IF NOT EXISTS 'user_deactivated';
ALTER TYPE public.activity_event_type ADD VALUE IF NOT EXISTS 'user_activated';
ALTER TYPE public.activity_event_type ADD VALUE IF NOT EXISTS 'user_deleted';
