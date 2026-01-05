-- Fix Security Definer View warnings by setting SECURITY INVOKER
ALTER VIEW public.profiles_secure SET (security_invoker = on);
ALTER VIEW public.visitors_secure SET (security_invoker = on);
ALTER VIEW public.contractors_secure SET (security_invoker = on);
ALTER VIEW public.contractor_workers_secure SET (security_invoker = on);