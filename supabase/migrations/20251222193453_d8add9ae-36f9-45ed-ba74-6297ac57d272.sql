-- Create new 5-level severity enum
CREATE TYPE severity_level_v2 AS ENUM ('level_1', 'level_2', 'level_3', 'level_4', 'level_5');

-- Add new severity columns to incidents table
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS severity_v2 severity_level_v2;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS original_severity_v2 severity_level_v2;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS severity_override_reason TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS severity_auto_calculated severity_level_v2;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS erp_activated BOOLEAN DEFAULT FALSE;

-- Migrate existing severity data to new system
-- low → level_1, medium → level_2, high → level_3, critical → level_4
UPDATE incidents SET severity_v2 = CASE 
  WHEN severity = 'low' THEN 'level_1'::severity_level_v2
  WHEN severity = 'medium' THEN 'level_2'::severity_level_v2
  WHEN severity = 'high' THEN 'level_3'::severity_level_v2
  WHEN severity = 'critical' THEN 'level_4'::severity_level_v2
  ELSE NULL
END WHERE severity IS NOT NULL AND severity_v2 IS NULL;

-- Migrate original_severity to original_severity_v2
UPDATE incidents SET original_severity_v2 = CASE 
  WHEN original_severity = 'low' THEN 'level_1'::severity_level_v2
  WHEN original_severity = 'medium' THEN 'level_2'::severity_level_v2
  WHEN original_severity = 'high' THEN 'level_3'::severity_level_v2
  WHEN original_severity = 'critical' THEN 'level_4'::severity_level_v2
  ELSE NULL
END WHERE original_severity IS NOT NULL AND original_severity_v2 IS NULL;

-- Create validation function for severity rules
CREATE OR REPLACE FUNCTION validate_incident_severity()
RETURNS TRIGGER AS $$
DECLARE
  min_required severity_level_v2 := 'level_1';
  validation_reason TEXT := '';
BEGIN
  -- Only validate if severity_v2 is being set
  IF NEW.severity_v2 IS NULL THEN
    RETURN NEW;
  END IF;

  -- Rule 1: Fatality or permanent disability → must be Level 5
  IF NEW.injury_classification IN ('fatality', 'permanent_disability') THEN
    min_required := 'level_5'::severity_level_v2;
    validation_reason := 'Fatality or permanent disability requires Level 5';
  
  -- Rule 2: LTI/LWDC → minimum Level 4
  ELSIF NEW.injury_classification IN ('lost_time_injury', 'lost_time', 'lwdc') THEN
    min_required := 'level_4'::severity_level_v2;
    validation_reason := 'Lost Time Injury/LWDC requires minimum Level 4';
  END IF;

  -- Rule 3: ERP activated or emergency_crisis → minimum Level 4
  IF (NEW.erp_activated = TRUE OR NEW.event_type = 'emergency_crisis') THEN
    IF min_required < 'level_4'::severity_level_v2 THEN
      min_required := 'level_4'::severity_level_v2;
      validation_reason := 'ERP activation requires minimum Level 4';
    END IF;
  END IF;

  -- Store the auto-calculated minimum for reference
  NEW.severity_auto_calculated := min_required;

  -- Enforce minimum severity (unless override reason is provided)
  IF NEW.severity_v2 < min_required THEN
    IF NEW.severity_override_reason IS NULL OR TRIM(NEW.severity_override_reason) = '' THEN
      RAISE EXCEPTION 'Severity cannot be less than % because: %. Provide an override reason to proceed.', 
        min_required, validation_reason;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for severity validation
DROP TRIGGER IF EXISTS validate_incident_severity_trigger ON incidents;
CREATE TRIGGER validate_incident_severity_trigger
  BEFORE INSERT OR UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION validate_incident_severity();

-- Add permanent_disability to injury_classification if not exists
-- First check if the enum value exists, if not add it
DO $$
BEGIN
  -- Check if permanent_disability exists in injury_classification enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'permanent_disability' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'injury_classification')
  ) THEN
    -- Only add if injury_classification type exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'injury_classification') THEN
      ALTER TYPE injury_classification ADD VALUE IF NOT EXISTS 'permanent_disability';
    END IF;
  END IF;
END $$;