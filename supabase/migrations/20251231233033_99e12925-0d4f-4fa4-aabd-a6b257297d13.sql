-- Add worker_id column to contractor_access_logs for new contractor workers model
ALTER TABLE public.contractor_access_logs 
ADD COLUMN IF NOT EXISTS worker_id UUID REFERENCES public.contractor_workers(id);

-- Add project_id column to contractor_access_logs
ALTER TABLE public.contractor_access_logs 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.contractor_projects(id);

-- Make contractor_id nullable since we may use worker_id instead
ALTER TABLE public.contractor_access_logs 
ALTER COLUMN contractor_id DROP NOT NULL;

-- Add constraint to ensure at least one of contractor_id or worker_id is set
-- Using a trigger since CHECK constraints can be tricky with nullable columns
CREATE OR REPLACE FUNCTION public.check_contractor_or_worker_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contractor_id IS NULL AND NEW.worker_id IS NULL THEN
    RAISE EXCEPTION 'Either contractor_id or worker_id must be set';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS check_contractor_or_worker_id_trigger ON public.contractor_access_logs;
CREATE TRIGGER check_contractor_or_worker_id_trigger
BEFORE INSERT OR UPDATE ON public.contractor_access_logs
FOR EACH ROW
EXECUTE FUNCTION public.check_contractor_or_worker_id();

-- Create index for worker_id lookups
CREATE INDEX IF NOT EXISTS idx_contractor_access_logs_worker_id 
ON public.contractor_access_logs(worker_id) WHERE worker_id IS NOT NULL;

-- Create index for finding workers currently on site
CREATE INDEX IF NOT EXISTS idx_contractor_access_logs_on_site 
ON public.contractor_access_logs(tenant_id, entry_time) 
WHERE exit_time IS NULL AND deleted_at IS NULL;