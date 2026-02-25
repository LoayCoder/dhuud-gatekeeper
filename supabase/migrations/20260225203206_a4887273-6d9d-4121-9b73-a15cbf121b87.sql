-- Ensure pending_dept_rep_review exists in incident_status enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'pending_dept_rep_review'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'incident_status')
  ) THEN
    ALTER TYPE public.incident_status ADD VALUE 'pending_dept_rep_review';
  END IF;
END$$;
