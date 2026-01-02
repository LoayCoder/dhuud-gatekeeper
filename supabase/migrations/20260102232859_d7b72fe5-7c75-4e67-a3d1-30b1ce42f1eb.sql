-- Enable realtime for visit_requests and gate_entry_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.visit_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gate_entry_logs;

-- Add comment for documentation
COMMENT ON TABLE public.visit_requests IS 'Visitor access requests with full lifecycle tracking (pending -> approved -> checked_in -> checked_out)';