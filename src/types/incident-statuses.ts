export const IncidentStatus = {
  SUBMITTED: 'submitted',
  PENDING_DEPT_REP_REVIEW: 'pending_dept_rep_incident_review',
  DEPT_REP_REJECTED: 'dept_rep_rejected',
  RETURNED_TO_REPORTER: 'returned_to_reporter',
  PENDING_EXPERT_SCREENING: 'pending_expert_screening',
  PENDING_MANAGER_APPROVAL: 'pending_manager_approval', // Dept Manager
  PENDING_DEPARTMENT_MANAGER_APPROVAL: 'pending_department_manager_approval',
  PENDING_NO_INVESTIGATION_APPROVAL: 'pending_no_investigation_approval',
  MANAGER_REJECTED: 'manager_rejected',
  HSSE_MANAGER_ESCALATION: 'hsse_manager_escalation',
  INVESTIGATION_PENDING: 'investigation_pending', // Waiting for assignment
  INVESTIGATION_IN_PROGRESS: 'investigation_in_progress',
  PENDING_CLOSURE: 'pending_closure',
  INVESTIGATION_CLOSED: 'investigation_closed',
  NO_INVESTIGATION_REQUIRED: 'no_investigation_required',
  CLOSED: 'closed',

  // Observation specific
  OBSERVATION_ACTIONS_PENDING: 'observation_actions_pending',
  PENDING_HSSE_VALIDATION: 'pending_hsse_validation',

  // New statuses from C4/C10
  OSHA_REPORTABLE: 'osha_reportable',
  PENDING_ESCALATION_APPROVAL: 'pending_escalation_approval',
  PENDING_LEGAL_REVIEW: 'pending_legal_review',
} as const;

export type IncidentStatusType = typeof IncidentStatus[keyof typeof IncidentStatus];
