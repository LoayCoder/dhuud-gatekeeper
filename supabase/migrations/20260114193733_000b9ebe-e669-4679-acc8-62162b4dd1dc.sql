-- Phase 3: Fully Dynamic Data Backfill

-- Helper function for safe updates
CREATE OR REPLACE FUNCTION backfill_branch_id_from_parent(
    child_table TEXT,
    parent_table TEXT,
    child_fk_column TEXT,
    parent_pk_column TEXT DEFAULT 'id'
) RETURNS void AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = child_table AND column_name = 'branch_id')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = child_table AND column_name = child_fk_column)
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = parent_table AND column_name = 'branch_id')
    THEN
        EXECUTE format(
            'UPDATE public.%I c SET branch_id = p.branch_id FROM public.%I p WHERE c.%I = p.%I AND c.branch_id IS NULL AND p.branch_id IS NOT NULL',
            child_table, parent_table, child_fk_column, parent_pk_column
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Execute backfills using the helper function
DO $$
BEGIN
    -- Contractor hierarchy
    PERFORM backfill_branch_id_from_parent('contractor_workers', 'contractor_companies', 'company_id');
    PERFORM backfill_branch_id_from_parent('contractor_documents', 'contractor_companies', 'company_id');
    PERFORM backfill_branch_id_from_parent('contractor_representatives', 'contractor_companies', 'company_id');
    PERFORM backfill_branch_id_from_parent('contractor_safety_officers', 'contractor_companies', 'company_id');
    PERFORM backfill_branch_id_from_parent('contractor_site_representatives', 'contractor_companies', 'company_id');
    PERFORM backfill_branch_id_from_parent('contractor_projects', 'contractor_companies', 'company_id');
    PERFORM backfill_branch_id_from_parent('worker_inductions', 'contractor_workers', 'worker_id');
    PERFORM backfill_branch_id_from_parent('material_gate_passes', 'contractor_companies', 'company_id');
    
    -- Inspection hierarchy
    PERFORM backfill_branch_id_from_parent('area_inspection_responses', 'inspection_sessions', 'session_id');
    PERFORM backfill_branch_id_from_parent('area_inspection_findings', 'inspection_sessions', 'session_id');
    PERFORM backfill_branch_id_from_parent('area_inspection_photos', 'area_inspection_responses', 'response_id');
    PERFORM backfill_branch_id_from_parent('inspection_responses', 'inspection_sessions', 'session_id');
    PERFORM backfill_branch_id_from_parent('inspection_findings', 'inspection_sessions', 'session_id');
    
    -- Incident hierarchy
    PERFORM backfill_branch_id_from_parent('incident_injuries', 'incidents', 'incident_id');
    PERFORM backfill_branch_id_from_parent('incident_property_damages', 'incidents', 'incident_id');
    PERFORM backfill_branch_id_from_parent('evidence_items', 'incidents', 'incident_id');
    PERFORM backfill_branch_id_from_parent('corrective_actions', 'incidents', 'incident_id');
    PERFORM backfill_branch_id_from_parent('investigations', 'incidents', 'incident_id');
    PERFORM backfill_branch_id_from_parent('incident_audit_logs', 'incidents', 'incident_id');
    
    -- Asset hierarchy
    PERFORM backfill_branch_id_from_parent('asset_maintenance_schedules', 'hsse_assets', 'asset_id');
    PERFORM backfill_branch_id_from_parent('asset_maintenance_history', 'hsse_assets', 'asset_id');
    PERFORM backfill_branch_id_from_parent('asset_inspections', 'hsse_assets', 'asset_id');
    PERFORM backfill_branch_id_from_parent('asset_documents', 'hsse_assets', 'asset_id');
    PERFORM backfill_branch_id_from_parent('asset_health_scores', 'hsse_assets', 'asset_id');
    PERFORM backfill_branch_id_from_parent('asset_failure_predictions', 'hsse_assets', 'asset_id');
    PERFORM backfill_branch_id_from_parent('asset_cost_transactions', 'hsse_assets', 'asset_id');
    PERFORM backfill_branch_id_from_parent('asset_audit_logs', 'hsse_assets', 'asset_id');
    PERFORM backfill_branch_id_from_parent('asset_transfers', 'hsse_assets', 'asset_id');
    
    -- Security hierarchy
    PERFORM backfill_branch_id_from_parent('security_team_members', 'security_teams', 'team_id');
    PERFORM backfill_branch_id_from_parent('patrol_checkpoints', 'patrol_routes', 'route_id');
    PERFORM backfill_branch_id_from_parent('patrol_sessions', 'patrol_routes', 'route_id');
    PERFORM backfill_branch_id_from_parent('checkpoint_visits', 'patrol_sessions', 'session_id');
    
    -- Org hierarchy
    PERFORM backfill_branch_id_from_parent('departments', 'divisions', 'division_id');
    PERFORM backfill_branch_id_from_parent('sections', 'departments', 'department_id');
    
    -- Buildings from sites
    PERFORM backfill_branch_id_from_parent('floors_zones', 'buildings', 'building_id');
    
    -- Action evidence from actions
    PERFORM backfill_branch_id_from_parent('action_evidence', 'corrective_actions', 'action_id');
    PERFORM backfill_branch_id_from_parent('action_extension_requests', 'corrective_actions', 'action_id');
END $$;

-- Drop helper function
DROP FUNCTION IF EXISTS backfill_branch_id_from_parent;