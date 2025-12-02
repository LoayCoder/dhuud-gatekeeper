-- Create enum for activity event types
CREATE TYPE public.activity_event_type AS ENUM ('login', 'logout', 'session_timeout', 'session_extended');

-- Create user activity logs table for audit purposes
CREATE TABLE public.user_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type activity_event_type NOT NULL,
  session_duration_seconds INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying by user and time
CREATE INDEX idx_user_activity_logs_user_id ON public.user_activity_logs(user_id);
CREATE INDEX idx_user_activity_logs_created_at ON public.user_activity_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own activity logs
CREATE POLICY "Users can view their own activity logs"
ON public.user_activity_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own activity logs
CREATE POLICY "Users can insert their own activity logs"
ON public.user_activity_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all activity logs (for audit purposes)
CREATE POLICY "Admins can view all activity logs"
ON public.user_activity_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));