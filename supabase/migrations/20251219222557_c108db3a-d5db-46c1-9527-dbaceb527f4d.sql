-- Enable realtime on profiles table for email change detection
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;