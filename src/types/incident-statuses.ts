/**
 * Incident Status Constants
 * Single source of truth for all incident status strings.
 * Gradually migrate hardcoded strings to use these constants.
 */

export const INCIDENT_STATUS = {
  // Draft
  DRAFT: 'draft',

  // Screening
  SUBMITTED: 'submitted',
  PENDING_EXPERT_SCREENING: 'pending_expert_screening',
  PENDING_DEPT_REP_APPROVAL: 'pending_dept_rep_approval',
  PENDING_CONTRACTOR_SCREENING: 'pending_contractor_screening',
  PENDING_CONSULTANT_SCREENING: 'pending_consultant_screening',
  PENDING_SITE_CLIENT_APPROVAL: 'pending_site_client_approval',
  PENDING_CONTRACTOR_IMPLEMENTATION: 'pending_contractor_implementation',

  // Approval
  PENDING_MANAGER_APPROVAL: 'pending_manager_approval',
  PENDING_DEPARTMENT_MANAGER_APPROVAL: 'pending_department_manager_approval',

  // Rejection / Return
  RETURNED_TO_REPORTER: 'returned_to_reporter',
  EXPERT_REJECTED: 'expert_rejected',
  MANAGER_REJECTED: 'manager_rejected',
  HSSE_MANAGER_ESCALATION: 'hsse_manager_escalation',

  // Investigation
  INVESTIGATION_PENDING: 'investigation_pending',
  INVESTIGATION_IN_PROGRESS: 'investigation_in_progress',
  UNDER_INVESTIGATION: 'under_investigation',
  PENDING_INVESTIGATOR_ASSIGNMENT: 'pending_investigator_assignment',
  PENDING_WITNESS_REVIEW: 'pending_witness_review',
  PENDING_RCA_LOCKING: 'pending_rca_locking',
  PENDING_HSSE_VALIDATION: 'pending_hsse_validation',
  NO_INVESTIGATION_REQUIRED: 'no_investigation_required',

  // Governance
  PENDING_LEGAL_REVIEW: 'pending_legal_review',
  DISPUTE_RESOLUTION: 'dispute_resolution',
  PENDING_CONTRACTOR_DISPUTE_REVIEW: 'pending_contractor_dispute_review',
  PENDING_VIOLATION_APPROVAL: 'pending_violation_approval',
  PENDING_FINE_CALCULATION: 'pending_fine_calculation',

  // Action Management
  OBSERVATION_ACTIONS_PENDING: 'observation_actions_pending',
  PENDING_ACTION_COMPLETION: 'pending_action_completion',
  PENDING_ACTION_VERIFICATION: 'pending_action_verification',
  MONITORING_30_DAY: 'monitoring_30_day',
  MONITORING_60_DAY: 'monitoring_60_day',
  MONITORING_90_DAY: 'monitoring_90_day',
  PENDING_ACTION: 'pending_action',

  // Closure
  PENDING_CLOSURE: 'pending_closure',
  PENDING_FINAL_CLOSURE: 'pending_final_closure',
  INVESTIGATION_CLOSED: 'investigation_closed',
  CLOSED: 'closed',

  // Other
  REJECTED_INVALID: 'rejected_invalid',
  REOPENED: 'reopened',
} as const;

export type IncidentStatusValue = typeof INCIDENT_STATUS[keyof typeof INCIDENT_STATUS];
