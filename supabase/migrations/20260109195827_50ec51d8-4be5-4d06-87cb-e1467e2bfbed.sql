-- =====================================================
-- CRITICAL FIX: Multi-Tenant Data Isolation
-- Fix global unique constraints to be per-tenant
-- =====================================================

-- 1. FIX INCIDENTS TABLE - THE CRITICAL BLOCKER
ALTER TABLE public.incidents 
DROP CONSTRAINT IF EXISTS incidents_reference_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS incidents_tenant_reference_id_key 
ON public.incidents (tenant_id, reference_id) 
WHERE deleted_at IS NULL;

-- 2. FIX ASSET_INSPECTIONS TABLE
ALTER TABLE public.asset_inspections 
DROP CONSTRAINT IF EXISTS asset_inspections_reference_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS asset_inspections_tenant_reference_id_key 
ON public.asset_inspections (tenant_id, reference_id) 
WHERE deleted_at IS NULL;

-- 3. FIX AREA_INSPECTION_FINDINGS TABLE
ALTER TABLE public.area_inspection_findings 
DROP CONSTRAINT IF EXISTS area_inspection_findings_reference_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS area_inspection_findings_tenant_reference_id_key 
ON public.area_inspection_findings (tenant_id, reference_id) 
WHERE deleted_at IS NULL;

-- 4. FIX INSPECTION_SESSIONS TABLE
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'inspection_sessions_reference_id_key'
  ) THEN
    ALTER TABLE public.inspection_sessions DROP CONSTRAINT inspection_sessions_reference_id_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS inspection_sessions_tenant_reference_id_key 
ON public.inspection_sessions (tenant_id, reference_id) 
WHERE deleted_at IS NULL;

-- 5. FIX RISK_ASSESSMENTS TABLE
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'risk_assessments_assessment_number_key'
  ) THEN
    ALTER TABLE public.risk_assessments DROP CONSTRAINT risk_assessments_assessment_number_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS risk_assessments_tenant_assessment_number_key 
ON public.risk_assessments (tenant_id, assessment_number) 
WHERE deleted_at IS NULL;

-- 6. FIX MATERIAL_GATE_PASSES TABLE (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_gate_passes' AND table_schema = 'public') THEN
    BEGIN
      ALTER TABLE public.material_gate_passes DROP CONSTRAINT IF EXISTS material_gate_passes_reference_id_key;
      CREATE UNIQUE INDEX IF NOT EXISTS material_gate_passes_tenant_reference_id_key 
      ON public.material_gate_passes (tenant_id, reference_id) WHERE deleted_at IS NULL;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

-- 7. FIX HSSE_ASSETS TABLE
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'hsse_assets_asset_code_key'
  ) THEN
    ALTER TABLE public.hsse_assets DROP CONSTRAINT hsse_assets_asset_code_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS hsse_assets_tenant_asset_code_key 
ON public.hsse_assets (tenant_id, asset_code) 
WHERE deleted_at IS NULL;

-- 8. FIX CONTRACTOR_PROJECTS TABLE (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contractor_projects' AND table_schema = 'public') THEN
    BEGIN
      ALTER TABLE public.contractor_projects DROP CONSTRAINT IF EXISTS contractor_projects_project_code_key;
      CREATE UNIQUE INDEX IF NOT EXISTS contractor_projects_tenant_project_code_key 
      ON public.contractor_projects (tenant_id, project_code) WHERE deleted_at IS NULL;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

-- =====================================================
-- UPDATE REFERENCE ID GENERATORS WITH ADVISORY LOCKING
-- =====================================================

-- 9. UPDATE generate_incident_reference_id() with advisory lock
CREATE OR REPLACE FUNCTION public.generate_incident_reference_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  year_suffix text;
  sequence_num integer;
  prefix text;
  lock_key bigint;
BEGIN
  year_suffix := TO_CHAR(NOW(), 'YYYY');
  
  IF NEW.event_type = 'observation' THEN
    prefix := 'OBS';
  ELSE
    prefix := 'INC';
  END IF;
  
  lock_key := abs(hashtext(NEW.tenant_id::text || prefix || year_suffix));
  PERFORM pg_advisory_xact_lock(lock_key);
  
  SELECT COALESCE(MAX(
    CAST(NULLIF(SPLIT_PART(reference_id, '-', 3), '') AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM incidents
  WHERE tenant_id = NEW.tenant_id
    AND deleted_at IS NULL
    AND reference_id LIKE prefix || '-' || year_suffix || '-%';
  
  NEW.reference_id := prefix || '-' || year_suffix || '-' || LPAD(sequence_num::text, 4, '0');
  
  RETURN NEW;
END;
$function$;

-- 10. UPDATE generate_finding_reference_id() with advisory lock
CREATE OR REPLACE FUNCTION public.generate_finding_reference_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  year_suffix text;
  sequence_num integer;
  prefix text;
  lock_key bigint;
BEGIN
  year_suffix := TO_CHAR(NOW(), 'YYYY');
  prefix := 'FND';
  
  lock_key := abs(hashtext(NEW.tenant_id::text || prefix || year_suffix));
  PERFORM pg_advisory_xact_lock(lock_key);
  
  SELECT COALESCE(MAX(
    CAST(NULLIF(SPLIT_PART(reference_id, '-', 3), '') AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM area_inspection_findings
  WHERE tenant_id = NEW.tenant_id
    AND deleted_at IS NULL
    AND reference_id LIKE prefix || '-' || year_suffix || '-%';
  
  NEW.reference_id := prefix || '-' || year_suffix || '-' || LPAD(sequence_num::text, 4, '0');
  
  RETURN NEW;
END;
$function$;

-- 11. UPDATE generate_inspection_reference_id() with advisory lock
CREATE OR REPLACE FUNCTION public.generate_inspection_reference_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  year_suffix text;
  sequence_num integer;
  prefix text;
  lock_key bigint;
BEGIN
  year_suffix := TO_CHAR(NOW(), 'YYYY');
  prefix := 'INS';
  
  lock_key := abs(hashtext(NEW.tenant_id::text || prefix || year_suffix));
  PERFORM pg_advisory_xact_lock(lock_key);
  
  SELECT COALESCE(MAX(
    CAST(NULLIF(SPLIT_PART(reference_id, '-', 3), '') AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM asset_inspections
  WHERE tenant_id = NEW.tenant_id
    AND deleted_at IS NULL
    AND reference_id LIKE prefix || '-' || year_suffix || '-%';
  
  NEW.reference_id := prefix || '-' || year_suffix || '-' || LPAD(sequence_num::text, 4, '0');
  
  RETURN NEW;
END;
$function$;

-- 12. UPDATE generate_inspection_schedule_reference_id() with advisory lock
CREATE OR REPLACE FUNCTION public.generate_inspection_schedule_reference_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  year_suffix text;
  sequence_num integer;
  prefix text;
  lock_key bigint;
BEGIN
  year_suffix := TO_CHAR(NOW(), 'YYYY');
  prefix := 'SCH';
  
  lock_key := abs(hashtext(NEW.tenant_id::text || prefix || year_suffix));
  PERFORM pg_advisory_xact_lock(lock_key);
  
  SELECT COALESCE(MAX(
    CAST(NULLIF(SPLIT_PART(reference_id, '-', 3), '') AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM inspection_sessions
  WHERE tenant_id = NEW.tenant_id
    AND deleted_at IS NULL
    AND reference_id LIKE prefix || '-' || year_suffix || '-%';
  
  NEW.reference_id := prefix || '-' || year_suffix || '-' || LPAD(sequence_num::text, 4, '0');
  
  RETURN NEW;
END;
$function$;

-- 13. UPDATE generate_asset_code() with advisory lock
CREATE OR REPLACE FUNCTION public.generate_asset_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  category_code text;
  sequence_num integer;
  lock_key bigint;
BEGIN
  SELECT code INTO category_code
  FROM asset_categories
  WHERE id = NEW.category_id;
  
  IF category_code IS NULL THEN
    category_code := 'AST';
  END IF;
  
  lock_key := abs(hashtext(NEW.tenant_id::text || category_code));
  PERFORM pg_advisory_xact_lock(lock_key);
  
  SELECT COALESCE(MAX(
    CAST(NULLIF(SPLIT_PART(asset_code, '-', 2), '') AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM hsse_assets
  WHERE tenant_id = NEW.tenant_id
    AND deleted_at IS NULL
    AND asset_code LIKE category_code || '-%';
  
  NEW.asset_code := category_code || '-' || LPAD(sequence_num::text, 5, '0');
  
  RETURN NEW;
END;
$function$;

-- 14. UPDATE generate_assessment_number() with advisory lock
CREATE OR REPLACE FUNCTION public.generate_assessment_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  year_suffix text;
  sequence_num integer;
  prefix text;
  lock_key bigint;
BEGIN
  year_suffix := TO_CHAR(NOW(), 'YYYY');
  prefix := 'RA';
  
  lock_key := abs(hashtext(NEW.tenant_id::text || prefix || year_suffix));
  PERFORM pg_advisory_xact_lock(lock_key);
  
  SELECT COALESCE(MAX(
    CAST(NULLIF(SPLIT_PART(assessment_number, '-', 3), '') AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM risk_assessments
  WHERE tenant_id = NEW.tenant_id
    AND deleted_at IS NULL
    AND assessment_number LIKE prefix || '-' || year_suffix || '-%';
  
  NEW.assessment_number := prefix || '-' || year_suffix || '-' || LPAD(sequence_num::text, 4, '0');
  
  RETURN NEW;
END;
$function$;

-- =====================================================
-- CREATE TENANT ISOLATION AUDIT FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.verify_tenant_isolation()
RETURNS TABLE (
  table_name text,
  issue_type text,
  details text,
  recommendation text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    tc.table_name::text,
    'global_unique_constraint'::text as issue_type,
    ('Constraint ' || tc.constraint_name || ' on column(s): ' || 
     string_agg(kcu.column_name, ', '))::text as details,
    'Consider adding tenant_id to unique constraint'::text as recommendation
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  WHERE tc.constraint_type = 'UNIQUE'
    AND tc.table_schema = 'public'
    AND EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = tc.table_schema
        AND c.table_name = tc.table_name
        AND c.column_name = 'tenant_id'
    )
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.key_column_usage kcu2
      WHERE kcu2.constraint_name = tc.constraint_name
        AND kcu2.column_name = 'tenant_id'
    )
  GROUP BY tc.table_name, tc.constraint_name;
  
  RETURN;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.verify_tenant_isolation() TO authenticated;