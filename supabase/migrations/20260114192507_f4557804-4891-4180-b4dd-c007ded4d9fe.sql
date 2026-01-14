-- Phase 2: Add branch_id to operational tables (safe version with existence checks)
DO $$
DECLARE
    tables_to_update TEXT[] := ARRAY[
        'visitors', 'gate_entry_logs', 'visit_requests',
        'contractor_companies', 'contractor_workers', 'contractor_projects', 'material_gate_passes',
        'contractor_safety_officers', 'worker_inductions', 'contractor_documents',
        'contractor_representatives', 'contractor_site_representatives', 'contractor_disputes',
        'contractor_module_audit_logs', 'contractor_access_logs', 'contractor_company_access_qr',
        'contractor_violation_summary', 'contractors', 'gate_pass_types', 'gate_pass_approvers',
        'gate_pass_items', 'gate_pass_photos',
        'inspection_sessions', 'inspection_templates', 'inspection_template_items',
        'inspection_template_categories', 'area_inspection_findings', 'area_inspection_responses',
        'area_inspection_photos', 'inspection_findings', 'inspection_responses',
        'inspection_schedules', 'inspection_session_assets', 'inspection_audit_logs',
        'incidents', 'investigations', 'corrective_actions', 'incident_injuries',
        'incident_property_damages', 'incident_audit_logs', 'incident_access_list',
        'incident_asset_links', 'incident_confidentiality_audit', 'incident_notification_matrix',
        'incident_violation_lifecycle', 'environmental_incident_details', 'environmental_contamination_entries',
        'evidence_items', 'action_evidence', 'action_extension_requests',
        'security_teams', 'security_team_members', 'emergency_alerts', 'emergency_response_protocols',
        'emergency_protocol_executions', 'patrol_routes', 'patrol_checkpoints', 'patrol_sessions',
        'checkpoint_visits', 'security_shifts', 'duty_roster', 'guard_site_assignments',
        'guard_attendance_logs', 'guard_tracking_history', 'guard_performance_metrics',
        'guard_training_records', 'guard_training_requirements', 'glass_break_events',
        'cctv_cameras', 'cctv_events', 'geofence_alerts', 'geofence_escalation_rules',
        'hsse_assets', 'asset_categories', 'asset_types', 'asset_subtypes',
        'asset_maintenance_schedules', 'asset_maintenance_history', 'asset_inspections',
        'asset_health_scores', 'asset_failure_predictions', 'asset_cost_transactions',
        'asset_documents', 'asset_photos', 'asset_audit_logs', 'asset_transfers',
        'asset_depreciation_schedules', 'asset_warranty_claims', 'asset_purchase_requests',
        'asset_purchase_approvals', 'asset_scan_logs', 'asset_offline_actions',
        'maintenance_parts', 'maintenance_part_usage', 'maintenance_schedule_parts',
        'work_permits', 'ptw_isolation_points', 'ptw_hazards', 'ptw_precautions',
        'ptw_ppe_requirements', 'ptw_gas_tests', 'ptw_approvals', 'ptw_extensions', 'ptw_permit_workers',
        'risk_assessments', 'risk_assessment_hazards',
        'audit_logs', 'menu_access_audit_logs', 'kpi_audit_logs',
        'notifications', 'hsse_notifications', 'hsse_scheduled_notifications',
        'hsse_notification_acknowledgments', 'hsse_notification_delivery_logs', 'hsse_notification_reads',
        'auto_notification_logs', 'email_delivery_logs',
        'document_branding', 'badge_definitions', 'clearance_templates', 'clearance_template_items',
        'induction_videos', 'manhours', 'kpi_targets',
        'ai_settings', 'ai_tags', 'ai_incident_patterns', 'ai_risk_predictions',
        'hse_weekly_messages', 'hsse_event_categories', 'hsse_event_subtypes',
        'challenge_participants', 'manager_team', 'approval_delegations', 'approval_escalation_config',
        'legal_review_triggers', 'app_updates', 'email_notification_preferences',
        'login_history', 'invitations', 'menu_items', 'role_menu_access',
        'user_role_assignments', 'roles', 'role_permissions'
    ];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY tables_to_update LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'branch_id') THEN
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN branch_id UUID REFERENCES public.branches(id)', tbl);
                EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_branch_id ON public.%I(branch_id)', tbl, tbl);
                RAISE NOTICE 'Added branch_id to %', tbl;
            END IF;
        END IF;
    END LOOP;
END $$;