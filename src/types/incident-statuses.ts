export const IncidentStatus = {
  // === Reporter / Submission ===
  SUBMITTED: 'submitted',
  RETURNED_TO_REPORTER: 'returned_to_reporter',

  // === Department Representative ===
  PENDING_DEPT_REP_REVIEW: 'pending_dept_rep_incident_review',
  PENDING_DEPT_REP_APPROVAL: 'pending_dept_rep_approval',
  PENDING_DEPT_REP_MANDATORY_ACTION: 'pending_dept_rep_mandatory_action',
  DEPT_REP_REJECTED: 'dept_rep_rejected',

  // === Department Manager ===
  PENDING_MANAGER_APPROVAL: 'pending_manager_approval',
  PENDING_DEPARTMENT_MANAGER_APPROVAL: 'pending_department_manager_approval',
  PENDING_NO_INVESTIGATION_APPROVAL: 'pending_no_investigation_approval',
  PENDING_DEPARTMENT_MANAGER_VIOLATION_APPROVAL: 'pending_department_manager_violation_approval',
  MANAGER_REJECTED: 'manager_rejected',

  // === HSSE Expert ===
  PENDING_EXPERT_SCREENING: 'pending_expert_screening',
  EXPERT_SCREENING: 'expert_screening',
  PENDING_HSSE_EXPERT_REVIEW: 'pending_hsse_expert_review',
  PENDING_HSSE_REJECTION_REVIEW: 'pending_hsse_rejection_review',
  PENDING_INVESTIGATOR_ASSIGNMENT: 'pending_investigator_assignment',
  EXPERT_REJECTED: 'expert_rejected',
  OSHA_REPORTABLE: 'osha_reportable',

  // === HSSE Manager ===
  HSSE_MANAGER_ESCALATION: 'hsse_manager_escalation',
  PENDING_HSSE_ESCALATION_REVIEW: 'pending_hsse_escalation_review',
  PENDING_HSSE_MANAGER_CLOSURE: 'pending_hsse_manager_closure',
  PENDING_ESCALATION_APPROVAL: 'pending_escalation_approval',
  HSSE_ENFORCED: 'hsse_enforced',

  // === Investigation ===
  INVESTIGATION_PENDING: 'investigation_pending',
  INVESTIGATION_IN_PROGRESS: 'investigation_in_progress',
  UNDER_INVESTIGATION: 'under_investigation',
  INVESTIGATION_CLOSED: 'investigation_closed',
  NO_INVESTIGATION_REQUIRED: 'no_investigation_required',

  // === Contractor / Consultant ===
  PENDING_CONSULTANT_SCREENING: 'pending_consultant_screening',
  PENDING_CONSULTANT_REVIEW: 'pending_consultant_review',
  PENDING_CONSULTANT_VERIFICATION: 'pending_consultant_verification',
  PENDING_CONSULTANT_ACTIONS: 'pending_consultant_actions',
  PENDING_CONTRACTOR_IMPLEMENTATION: 'pending_contractor_implementation',
  CONTRACTOR_ACTION_IMPLEMENTATION: 'contractor_action_implementation',
  PENDING_CONTRACTOR_ACTION: 'pending_contractor_action',
  PENDING_ACTION_DISPUTE_REVIEW: 'pending_action_dispute_review',
  PENDING_CONTRACT_CONTROLLER_APPROVAL: 'pending_contract_controller_approval',

  // === Site Client ===
  PENDING_SITE_CLIENT_APPROVAL: 'pending_site_client_approval',
  PENDING_SITE_CLIENT_ACTION_APPROVAL: 'pending_site_client_action_approval',

  // === Dispute & Legal ===
  DISPUTE_RESOLUTION: 'dispute_resolution',
  PENDING_CONTRACTOR_DISPUTE_REVIEW: 'pending_contractor_dispute_review',
  PENDING_LEGAL_REVIEW: 'pending_legal_review',

  // === Clinic ===
  PENDING_CLINIC_REVIEW: 'pending_clinic_review',

  // === HSSE Validation & Monitoring ===
  PENDING_HSSE_VALIDATION: 'pending_hsse_validation',
  PENDING_HSSE_INCIDENT_VALIDATION: 'pending_hsse_incident_validation',
  MONITORING_30_DAY: 'monitoring_30_day',
  MONITORING_60_DAY: 'monitoring_60_day',
  MONITORING_90_DAY: 'monitoring_90_day',

  // === Closure ===
  PENDING_CLOSURE: 'pending_closure',
  PENDING_FINAL_CLOSURE: 'pending_final_closure',
  CLOSED: 'closed',
  CLOSED_REJECTED_APPROVED_BY_HSSE: 'closed_rejected_approved_by_hsse',

  // === Observation Specific ===
  OBSERVATION_ACTIONS_PENDING: 'observation_actions_pending',
} as const;

export type IncidentStatusType = typeof IncidentStatus[keyof typeof IncidentStatus];
