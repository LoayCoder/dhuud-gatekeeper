-- =====================================================
-- PTW-Contractor Integration: Database Integrity Layer
-- =====================================================

-- 1. Create function to check if project is mobilized
CREATE OR REPLACE FUNCTION public.is_project_mobilized(project_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  project_record RECORD;
BEGIN
  SELECT status, mobilization_percentage 
  INTO project_record
  FROM public.ptw_projects 
  WHERE id = project_id_param 
    AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Must be active AND have 100% mobilization
  RETURN project_record.status = 'active' 
    AND project_record.mobilization_percentage = 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Create function to handle project status changes (cascade to permits)
CREATE OR REPLACE FUNCTION public.handle_ptw_project_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When project completes, close all active permits
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.ptw_permits 
    SET status = 'closed', 
        updated_at = NOW()
    WHERE project_id = NEW.id 
      AND status NOT IN ('closed', 'cancelled', 'rejected')
      AND deleted_at IS NULL;
  END IF;
  
  -- When project suspended, suspend active permits
  IF NEW.status = 'suspended' AND OLD.status != 'suspended' THEN
    UPDATE public.ptw_permits 
    SET status = 'suspended', 
        updated_at = NOW()
    WHERE project_id = NEW.id 
      AND status IN ('issued', 'activated')
      AND deleted_at IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on ptw_projects for status changes
DROP TRIGGER IF EXISTS on_ptw_project_status_change ON public.ptw_projects;
CREATE TRIGGER on_ptw_project_status_change
  AFTER UPDATE OF status ON public.ptw_projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_ptw_project_status_change();

-- 3. Create function to handle contractor status changes (cascade to projects and workers)
CREATE OR REPLACE FUNCTION public.handle_contractor_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When contractor is blacklisted or suspended
  IF NEW.status IN ('blacklisted', 'suspended') AND OLD.status NOT IN ('blacklisted', 'suspended') THEN
    -- Suspend all active projects for this contractor
    UPDATE public.ptw_projects 
    SET status = 'suspended',
        updated_at = NOW()
    WHERE contractor_company_id = NEW.id 
      AND status = 'active'
      AND deleted_at IS NULL;
      
    -- Suspend workers from this contractor
    UPDATE public.contractor_workers 
    SET approval_status = 'suspended',
        updated_at = NOW()
    WHERE company_id = NEW.id 
      AND approval_status = 'approved'
      AND deleted_at IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on contractor_companies for status changes
DROP TRIGGER IF EXISTS on_contractor_status_change ON public.contractor_companies;
CREATE TRIGGER on_contractor_status_change
  AFTER UPDATE OF status ON public.contractor_companies
  FOR EACH ROW EXECUTE FUNCTION public.handle_contractor_status_change();

-- 4. Add unique constraint to prevent duplicate active worker assignments
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_worker_project 
ON public.project_worker_assignments (project_id, worker_id) 
WHERE is_active = TRUE AND deleted_at IS NULL;