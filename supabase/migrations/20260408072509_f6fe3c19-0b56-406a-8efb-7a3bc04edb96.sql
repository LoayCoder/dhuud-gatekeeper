-- Drop both duplicate broken triggers
DROP TRIGGER IF EXISTS enforce_contractor_access_duration_trigger ON public.contractor_workers;
DROP TRIGGER IF EXISTS trg_enforce_contractor_access_duration ON public.contractor_workers;

-- Drop the broken function
DROP FUNCTION IF EXISTS public.enforce_contractor_access_duration();