
-- Add induction_status column to contractor_workers
ALTER TABLE public.contractor_workers
ADD COLUMN IF NOT EXISTS induction_status text NOT NULL DEFAULT 'none';

-- Create trigger function to sync induction status from worker_inductions
CREATE OR REPLACE FUNCTION public.sync_worker_induction_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When induction is completed/acknowledged
  IF NEW.status = 'completed' OR NEW.acknowledged_at IS NOT NULL THEN
    UPDATE public.contractor_workers
    SET induction_status = 'completed'
    WHERE id = NEW.worker_id;
  -- When induction is sent
  ELSIF NEW.status = 'sent' THEN
    -- Only update if not already completed
    UPDATE public.contractor_workers
    SET induction_status = 'sent'
    WHERE id = NEW.worker_id
    AND induction_status != 'completed';
  -- When induction expires
  ELSIF NEW.status = 'expired' THEN
    UPDATE public.contractor_workers
    SET induction_status = 'expired'
    WHERE id = NEW.worker_id
    AND induction_status != 'completed';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on worker_inductions
DROP TRIGGER IF EXISTS trg_sync_worker_induction_status ON public.worker_inductions;
CREATE TRIGGER trg_sync_worker_induction_status
  AFTER INSERT OR UPDATE OF status, acknowledged_at
  ON public.worker_inductions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_worker_induction_status();
