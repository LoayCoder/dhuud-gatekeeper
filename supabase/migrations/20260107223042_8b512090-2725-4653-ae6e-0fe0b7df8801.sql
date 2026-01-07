-- 1. Create "Document Controller" Role
INSERT INTO roles (id, code, name, category, description, module_access, is_system, sort_order, is_active)
VALUES (
  gen_random_uuid(),
  'document_controller',
  'Document Controller',
  'general',
  'Can review, approve, reject, and manage contractor workers. Full control over /contractors/workers.',
  ARRAY['contractors', 'contractor_workers'],
  true,
  6,
  true
)
ON CONFLICT (code) DO NOTHING;

-- 2. Add Edit Tracking Columns to contractor_workers
ALTER TABLE contractor_workers
ADD COLUMN IF NOT EXISTS edited_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS edited_at timestamptz,
ADD COLUMN IF NOT EXISTS edit_pending_approval boolean DEFAULT false;

-- 3. Create Database Function: has_document_controller_access
CREATE OR REPLACE FUNCTION public.has_document_controller_access(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    has_role_by_code(p_user_id, 'document_controller') 
    OR is_admin(p_user_id),
    false
  )
$$;

-- 4. Create Trigger Function for Edit Tracking
CREATE OR REPLACE FUNCTION track_contractor_worker_edits()
RETURNS trigger AS $$
BEGIN
  -- Only flag if edited by contractor rep (not admin/doc controller)
  -- and worker was previously approved
  IF OLD.approval_status = 'approved' 
     AND NOT has_document_controller_access(auth.uid())
     AND NOT is_admin(auth.uid())
  THEN
    NEW.edit_pending_approval = true;
    NEW.edited_by = auth.uid();
    NEW.edited_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS contractor_worker_edit_tracking ON contractor_workers;
CREATE TRIGGER contractor_worker_edit_tracking
BEFORE UPDATE ON contractor_workers
FOR EACH ROW
EXECUTE FUNCTION track_contractor_worker_edits();

-- 5. Create Trigger Function to Prevent Contractor Rep Status Changes
CREATE OR REPLACE FUNCTION prevent_contractor_rep_status_changes()
RETURNS trigger AS $$
BEGIN
  -- If user is a contractor rep (not admin/doc controller)
  IF NOT has_document_controller_access(auth.uid()) 
     AND NOT is_admin(auth.uid()) 
  THEN
    -- Block changes to sensitive fields
    IF OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
      RAISE EXCEPTION 'Contractor representatives cannot change worker approval status';
    END IF;
    IF OLD.deleted_at IS DISTINCT FROM NEW.deleted_at THEN
      RAISE EXCEPTION 'Contractor representatives cannot delete workers';
    END IF;
    IF OLD.approved_by IS DISTINCT FROM NEW.approved_by THEN
      RAISE EXCEPTION 'Contractor representatives cannot set approval details';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS prevent_rep_status_changes ON contractor_workers;
CREATE TRIGGER prevent_rep_status_changes
BEFORE UPDATE ON contractor_workers
FOR EACH ROW
EXECUTE FUNCTION prevent_contractor_rep_status_changes();

-- 6. Add RLS Policy for Document Controllers (full control)
DROP POLICY IF EXISTS "Document controllers can manage all workers" ON contractor_workers;
CREATE POLICY "Document controllers can manage all workers"
ON contractor_workers FOR ALL
TO authenticated
USING (
  tenant_id = get_auth_tenant_id()
  AND has_document_controller_access(auth.uid())
)
WITH CHECK (
  tenant_id = get_auth_tenant_id()
  AND has_document_controller_access(auth.uid())
);