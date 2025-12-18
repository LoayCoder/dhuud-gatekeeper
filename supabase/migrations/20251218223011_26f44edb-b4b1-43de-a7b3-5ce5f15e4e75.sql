-- Enable realtime for PTW tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.ptw_permits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ptw_signatures;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ptw_safety_responses;