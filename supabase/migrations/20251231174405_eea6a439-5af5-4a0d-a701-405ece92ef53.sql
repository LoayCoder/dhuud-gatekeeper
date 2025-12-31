-- Drop department representative dashboard RPC functions
DROP FUNCTION IF EXISTS public.get_dept_rep_event_dashboard_stats();
DROP FUNCTION IF EXISTS public.get_dept_rep_events(text, text, integer, integer);
DROP FUNCTION IF EXISTS public.get_dept_rep_events(text, text);
DROP FUNCTION IF EXISTS public.get_dept_rep_sla_analytics(text);