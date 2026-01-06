
-- =====================================================================
-- PERMANENT USER DELETION: loay.smartphoto@gmail.com
-- User ID: a20a0016-2b95-4b45-a832-f68cd8116d45
-- =====================================================================

-- Disable validation triggers
ALTER TABLE incidents DISABLE TRIGGER trigger_validate_incident_fields;
ALTER TABLE user_role_assignments DISABLE TRIGGER prevent_normal_user_role_removal;

-- ======================= DELETE FROM NOTIFICATION TABLES =======================
DELETE FROM auto_notification_logs WHERE recipient_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
DELETE FROM notification_logs WHERE user_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
DELETE FROM notification_recipients WHERE user_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45' OR created_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
DELETE FROM hsse_notification_acknowledgments WHERE user_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
DELETE FROM hsse_notification_reads WHERE user_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE hsse_notifications SET created_by = NULL WHERE created_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE hsse_scheduled_notifications SET created_by = NULL WHERE created_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';

DELETE FROM incident_notification_matrix WHERE user_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
DELETE FROM site_stakeholders WHERE user_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
DELETE FROM duty_roster WHERE user_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE duty_roster SET created_by = NULL WHERE created_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE site_departments SET created_by = NULL WHERE created_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
DELETE FROM user_sessions WHERE user_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE user_sessions SET invalidated_by = NULL WHERE invalidated_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE security_scan_results SET resolved_by = NULL WHERE resolved_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
DELETE FROM incident_access_list WHERE user_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE incident_access_list SET granted_by = NULL, revoked_by = NULL WHERE granted_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45' OR revoked_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';

-- Asset tables
UPDATE asset_cost_transactions SET created_by = NULL WHERE created_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE asset_offline_actions SET created_by = NULL, resolved_by = NULL WHERE created_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45' OR resolved_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE asset_maintenance_history SET performed_by = NULL WHERE performed_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE asset_failure_predictions SET acknowledged_by = NULL WHERE acknowledged_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE asset_warranty_claims SET created_by = NULL WHERE created_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE asset_maintenance_schedules SET created_by = NULL WHERE created_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE asset_transfers SET approved_by = NULL, completed_by = NULL, requested_by = NULL WHERE 'a20a0016-2b95-4b45-a832-f68cd8116d45' IN (approved_by, completed_by, requested_by);
UPDATE asset_approval_configs SET created_by = NULL WHERE created_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE asset_approval_levels SET specific_user_id = NULL WHERE specific_user_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE asset_purchase_requests SET final_decision_by = NULL, requested_by = NULL WHERE final_decision_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45' OR requested_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
DELETE FROM asset_purchase_approvals WHERE approver_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
DELETE FROM asset_scan_logs WHERE scanned_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE part_stock_transactions SET created_by = NULL WHERE created_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE part_purchase_orders SET approved_by = NULL, created_by = NULL, received_by = NULL WHERE 'a20a0016-2b95-4b45-a832-f68cd8116d45' IN (approved_by, created_by, received_by);

-- Inspection tables
UPDATE inspection_templates SET created_by = NULL WHERE created_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE asset_inspections SET inspector_id = NULL WHERE inspector_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE inspection_sessions SET inspector_id = NULL WHERE inspector_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE inspection_session_assets SET inspected_by = NULL WHERE inspected_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE area_inspection_responses SET responded_by = NULL WHERE responded_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE area_inspection_photos SET uploaded_by = NULL WHERE uploaded_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE area_inspection_findings SET closed_by = NULL, created_by = NULL WHERE closed_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45' OR created_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE inspection_schedules SET assigned_inspector_id = NULL, created_by = NULL WHERE assigned_inspector_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45' OR created_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE role_menu_access SET created_by = NULL WHERE created_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE action_extension_requests SET hsse_manager_id = NULL, manager_id = NULL, requested_by = NULL WHERE 'a20a0016-2b95-4b45-a832-f68cd8116d45' IN (hsse_manager_id, manager_id, requested_by);
UPDATE manhours SET recorded_by = NULL WHERE recorded_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE kpi_targets SET created_by = NULL WHERE created_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE maintenance_parts SET created_by = NULL WHERE created_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE maintenance_part_usage SET used_by = NULL WHERE used_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';

-- Security tables
UPDATE security_patrol_routes SET created_by = NULL WHERE created_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE security_patrols SET patrol_officer_id = NULL, reviewed_by = NULL WHERE patrol_officer_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45' OR reviewed_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE gate_entry_logs SET guard_id = NULL WHERE guard_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE contractor_access_logs SET guard_id = NULL WHERE guard_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE security_zones SET created_by = NULL WHERE created_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
DELETE FROM shift_roster WHERE guard_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE shift_roster SET created_by = NULL, relief_guard_id = NULL WHERE created_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45' OR relief_guard_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
DELETE FROM guard_tracking_history WHERE guard_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
DELETE FROM geofence_alerts WHERE guard_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE geofence_alerts SET acknowledged_by = NULL, resolved_by = NULL WHERE acknowledged_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45' OR resolved_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
DELETE FROM guard_performance_metrics WHERE guard_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
DELETE FROM offline_patrol_checkpoints WHERE guard_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
DELETE FROM guard_attendance_logs WHERE guard_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE guard_attendance_logs SET approved_by = NULL WHERE approved_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
DELETE FROM guard_training_records WHERE guard_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE guard_training_records SET verified_by = NULL WHERE verified_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
DELETE FROM guard_site_assignments WHERE guard_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
DELETE FROM shift_swap_requests WHERE requesting_guard_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45' OR target_guard_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE shift_swap_requests SET supervisor_id = NULL WHERE supervisor_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
DELETE FROM shift_handovers WHERE incoming_guard_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45' OR outgoing_guard_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
DELETE FROM emergency_alerts WHERE guard_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE emergency_alerts SET acknowledged_by = NULL, resolved_by = NULL WHERE acknowledged_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45' OR resolved_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE emergency_protocol_executions SET completed_by = NULL, escalated_to = NULL, started_by = NULL WHERE 'a20a0016-2b95-4b45-a832-f68cd8116d45' IN (completed_by, escalated_to, started_by);
UPDATE cctv_cameras SET assigned_to = NULL WHERE assigned_to = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE cctv_events SET reviewed_by = NULL WHERE reviewed_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE contractor_documents SET uploaded_by = NULL WHERE uploaded_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE risk_assessment_details SET verified_by = NULL WHERE verified_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE workflow_definitions SET created_by = NULL WHERE created_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE workflow_instances SET started_by = NULL WHERE started_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE page_content_versions SET created_by = NULL, updated_by = NULL WHERE created_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45' OR updated_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE monitoring_check_schedule SET completed_by = NULL WHERE completed_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
DELETE FROM system_alerts WHERE target_user_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45' OR related_user_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE system_alerts SET acknowledged_by = NULL, resolved_by = NULL WHERE acknowledged_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45' OR resolved_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE app_updates SET broadcast_by = NULL WHERE broadcast_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE contractors SET banned_by = NULL, created_by = NULL WHERE banned_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45' OR created_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE project_safety_officers SET created_by = NULL WHERE created_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE project_worker_assignments SET created_by = NULL WHERE created_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE induction_videos SET created_by = NULL WHERE created_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE worker_qr_codes SET revoked_by = NULL WHERE revoked_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE material_gate_passes SET entry_confirmed_by = NULL, exit_confirmed_by = NULL, guard_verified_by = NULL, pm_approved_by = NULL, rejected_by = NULL, safety_approved_by = NULL WHERE 'a20a0016-2b95-4b45-a832-f68cd8116d45' IN (entry_confirmed_by, exit_confirmed_by, guard_verified_by, pm_approved_by, rejected_by, safety_approved_by);
UPDATE gate_pass_photos SET uploaded_by = NULL WHERE uploaded_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE ptw_projects SET created_by = NULL, hsse_coordinator_id = NULL, project_manager_id = NULL WHERE 'a20a0016-2b95-4b45-a832-f68cd8116d45' IN (created_by, hsse_coordinator_id, project_manager_id);
UPDATE ptw_clearance_checks SET approved_by = NULL WHERE approved_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE ptw_permits SET applicant_id = NULL, closed_by = NULL, created_by = NULL, endorser_id = NULL, issuer_id = NULL WHERE 'a20a0016-2b95-4b45-a832-f68cd8116d45' IN (applicant_id, closed_by, created_by, endorser_id, issuer_id);
UPDATE ptw_safety_responses SET verified_by = NULL WHERE verified_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE ptw_gas_tests SET tested_by = NULL WHERE tested_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE ptw_signatures SET signer_id = NULL WHERE signer_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE incident_asset_links SET created_by = NULL WHERE created_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE hsse_assets SET created_by = NULL, updated_by = NULL WHERE created_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45' OR updated_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE asset_photos SET uploaded_by = NULL WHERE uploaded_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE asset_documents SET uploaded_by = NULL WHERE uploaded_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE visitors SET host_id = NULL WHERE host_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE visit_requests SET approved_by = NULL, host_id = NULL WHERE approved_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45' OR host_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';

-- Incidents
UPDATE incidents SET 
    reporter_id = NULL, approval_manager_id = NULL, closure_approved_by = NULL,
    closure_requested_by = NULL, closure_signed_by = NULL, confidentiality_set_by = NULL,
    contractor_dispute_reviewed_by = NULL, dept_rep_approved_by = NULL, dept_rep_rejected_by = NULL,
    dispute_opened_by = NULL, expert_rejected_by = NULL, expert_screened_by = NULL,
    hsse_manager_decision_by = NULL, hsse_rejection_reviewed_by = NULL, hsse_validated_by = NULL,
    investigation_approved_by = NULL, legal_reviewer_id = NULL, mediator_id = NULL,
    recognized_user_id = NULL, returned_by = NULL, violation_contract_controller_approved_by = NULL,
    violation_contractor_rep_acknowledged_by = NULL, violation_dept_manager_approved_by = NULL,
    violation_finalized_by = NULL, violation_hsse_decided_by = NULL
WHERE 'a20a0016-2b95-4b45-a832-f68cd8116d45' IN (
    reporter_id, approval_manager_id, closure_approved_by, closure_requested_by, closure_signed_by,
    confidentiality_set_by, contractor_dispute_reviewed_by, dept_rep_approved_by, dept_rep_rejected_by,
    dispute_opened_by, expert_rejected_by, expert_screened_by, hsse_manager_decision_by,
    hsse_rejection_reviewed_by, hsse_validated_by, investigation_approved_by, legal_reviewer_id,
    mediator_id, recognized_user_id, returned_by, violation_contract_controller_approved_by,
    violation_contractor_rep_acknowledged_by, violation_dept_manager_approved_by, violation_finalized_by,
    violation_hsse_decided_by
);

UPDATE investigations SET investigator_id = NULL, violation_submitted_by = NULL WHERE investigator_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45' OR violation_submitted_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE witness_statements SET assigned_witness_id = NULL, created_by = NULL, returned_by = NULL, reviewed_by = NULL WHERE 'a20a0016-2b95-4b45-a832-f68cd8116d45' IN (assigned_witness_id, created_by, returned_by, reviewed_by);
UPDATE corrective_actions SET assigned_to = NULL, delegated_by = NULL, delegated_verifier_id = NULL, rejected_by = NULL, verified_by = NULL WHERE 'a20a0016-2b95-4b45-a832-f68cd8116d45' IN (assigned_to, delegated_by, delegated_verifier_id, rejected_by, verified_by);
UPDATE evidence_items SET reviewed_by = NULL, uploaded_by = NULL WHERE reviewed_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45' OR uploaded_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE action_evidence SET uploaded_by = NULL WHERE uploaded_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE contractor_companies SET assigned_client_pm_id = NULL, client_site_rep_id = NULL, created_by = NULL, suspended_by = NULL WHERE 'a20a0016-2b95-4b45-a832-f68cd8116d45' IN (assigned_client_pm_id, client_site_rep_id, created_by, suspended_by);
UPDATE contractor_projects SET created_by = NULL, project_manager_id = NULL WHERE created_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45' OR project_manager_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE contractor_representatives SET created_by = NULL, user_id = NULL WHERE created_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45' OR user_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE contractor_workers SET approved_by = NULL, created_by = NULL WHERE approved_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45' OR created_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE contractor_disputes SET reviewed_by = NULL, submitted_by = NULL WHERE reviewed_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45' OR submitted_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
UPDATE contractor_violation_summary SET contract_controller_decision_by = NULL, contractor_rep_decision_by = NULL, dept_manager_decision_by = NULL, hsse_decision_by = NULL, hsse_validated_by = NULL, submitted_by = NULL WHERE 'a20a0016-2b95-4b45-a832-f68cd8116d45' IN (contract_controller_decision_by, contractor_rep_decision_by, dept_manager_decision_by, hsse_decision_by, hsse_validated_by, submitted_by);
UPDATE incident_violation_lifecycle SET contract_controller_id = NULL, contractor_rep_id = NULL, dept_manager_id = NULL, finalized_by = NULL, hsse_manager_id = NULL, identified_by = NULL, submitted_by = NULL WHERE 'a20a0016-2b95-4b45-a832-f68cd8116d45' IN (contract_controller_id, contractor_rep_id, dept_manager_id, finalized_by, hsse_manager_id, identified_by, submitted_by);

-- Delete from audit/log tables
DELETE FROM incident_audit_logs WHERE actor_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
DELETE FROM asset_audit_logs WHERE actor_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
DELETE FROM contractor_module_audit_logs WHERE actor_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
DELETE FROM ptw_audit_logs WHERE actor_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
DELETE FROM inspection_audit_logs WHERE actor_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
DELETE FROM workflow_step_history WHERE actor_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
DELETE FROM incident_confidentiality_audit WHERE actor_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45' OR affected_user_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';
DELETE FROM page_content_audit_logs WHERE performed_by = 'a20a0016-2b95-4b45-a832-f68cd8116d45';

-- Delete from manager_team
DELETE FROM manager_team WHERE user_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45' OR manager_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';

-- Delete role assignments
DELETE FROM user_role_assignments WHERE user_id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';

-- Delete the profile
DELETE FROM profiles WHERE id = 'a20a0016-2b95-4b45-a832-f68cd8116d45';

-- Re-enable triggers
ALTER TABLE incidents ENABLE TRIGGER trigger_validate_incident_fields;
ALTER TABLE user_role_assignments ENABLE TRIGGER prevent_normal_user_role_removal;
