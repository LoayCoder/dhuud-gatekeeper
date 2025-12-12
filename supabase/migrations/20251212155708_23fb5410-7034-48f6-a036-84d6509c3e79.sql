-- Add reference_id column to corrective_actions
ALTER TABLE public.corrective_actions 
ADD COLUMN IF NOT EXISTS reference_id text;

-- Add unique constraint per tenant (only for non-deleted records)
CREATE UNIQUE INDEX IF NOT EXISTS idx_corrective_actions_reference_id 
ON public.corrective_actions(tenant_id, reference_id) 
WHERE deleted_at IS NULL AND reference_id IS NOT NULL;

-- Create function to generate action reference ID
CREATE OR REPLACE FUNCTION generate_action_reference_id()
RETURNS TRIGGER AS $$
DECLARE
  parent_ref text;
  sequence_num integer;
BEGIN
  -- Get parent reference based on source
  IF NEW.incident_id IS NOT NULL THEN
    SELECT reference_id INTO parent_ref 
    FROM incidents WHERE id = NEW.incident_id;
  ELSIF NEW.session_id IS NOT NULL THEN
    SELECT reference_id INTO parent_ref 
    FROM inspection_sessions WHERE id = NEW.session_id;
  ELSIF NEW.source_finding_id IS NOT NULL THEN
    SELECT reference_id INTO parent_ref 
    FROM area_inspection_findings WHERE id = NEW.source_finding_id;
  END IF;
  
  -- Calculate sequence number within parent context
  IF parent_ref IS NOT NULL THEN
    SELECT COALESCE(MAX(
      CAST(NULLIF(SPLIT_PART(reference_id, '-ACT-', 2), '') AS INTEGER)
    ), 0) + 1
    INTO sequence_num
    FROM corrective_actions
    WHERE tenant_id = NEW.tenant_id
      AND reference_id LIKE parent_ref || '-ACT-%'
      AND deleted_at IS NULL;
    
    NEW.reference_id := parent_ref || '-ACT-' || LPAD(sequence_num::text, 4, '0');
  ELSE
    -- Standalone action (no parent)
    SELECT COALESCE(MAX(
      CAST(NULLIF(SPLIT_PART(reference_id, '-', 3), '') AS INTEGER)
    ), 0) + 1
    INTO sequence_num
    FROM corrective_actions
    WHERE tenant_id = NEW.tenant_id
      AND reference_id LIKE 'ACT-' || TO_CHAR(NOW(), 'YYYY') || '-%'
      AND deleted_at IS NULL;
    
    NEW.reference_id := 'ACT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(sequence_num::text, 4, '0');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto-generation on insert
DROP TRIGGER IF EXISTS set_action_reference_id ON corrective_actions;
CREATE TRIGGER set_action_reference_id
  BEFORE INSERT ON corrective_actions
  FOR EACH ROW
  WHEN (NEW.reference_id IS NULL)
  EXECUTE FUNCTION generate_action_reference_id();

-- Backfill existing actions without reference_id
DO $$
DECLARE
  action_record RECORD;
  parent_ref text;
  seq_num integer;
  new_ref text;
BEGIN
  FOR action_record IN 
    SELECT ca.id, ca.tenant_id, ca.incident_id, ca.session_id, ca.source_finding_id, ca.created_at
    FROM corrective_actions ca
    WHERE ca.reference_id IS NULL AND ca.deleted_at IS NULL
    ORDER BY ca.created_at
  LOOP
    parent_ref := NULL;
    
    -- Get parent reference
    IF action_record.incident_id IS NOT NULL THEN
      SELECT reference_id INTO parent_ref 
      FROM incidents WHERE id = action_record.incident_id;
    ELSIF action_record.session_id IS NOT NULL THEN
      SELECT reference_id INTO parent_ref 
      FROM inspection_sessions WHERE id = action_record.session_id;
    ELSIF action_record.source_finding_id IS NOT NULL THEN
      SELECT reference_id INTO parent_ref 
      FROM area_inspection_findings WHERE id = action_record.source_finding_id;
    END IF;
    
    -- Calculate sequence and generate reference
    IF parent_ref IS NOT NULL THEN
      SELECT COALESCE(MAX(
        CAST(NULLIF(SPLIT_PART(reference_id, '-ACT-', 2), '') AS INTEGER)
      ), 0) + 1
      INTO seq_num
      FROM corrective_actions
      WHERE tenant_id = action_record.tenant_id
        AND reference_id LIKE parent_ref || '-ACT-%'
        AND deleted_at IS NULL;
      
      new_ref := parent_ref || '-ACT-' || LPAD(seq_num::text, 4, '0');
    ELSE
      SELECT COALESCE(MAX(
        CAST(NULLIF(SPLIT_PART(reference_id, '-', 3), '') AS INTEGER)
      ), 0) + 1
      INTO seq_num
      FROM corrective_actions
      WHERE tenant_id = action_record.tenant_id
        AND reference_id LIKE 'ACT-' || EXTRACT(YEAR FROM action_record.created_at)::text || '-%'
        AND deleted_at IS NULL;
      
      new_ref := 'ACT-' || EXTRACT(YEAR FROM action_record.created_at)::text || '-' || LPAD(seq_num::text, 4, '0');
    END IF;
    
    UPDATE corrective_actions SET reference_id = new_ref WHERE id = action_record.id;
  END LOOP;
END $$;