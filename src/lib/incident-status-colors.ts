/**
 * Unified Status Color Utility for HSSE Incidents Module
 * 
 * Uses semantic design tokens for consistent theming:
 * - info: Open/Submitted states
 * - info: Under Investigation
 * - warning: Action Required (pending approvals)
 * - pending: Pending CAPA/Closure
 * - destructive: Rejected/Returned
 * - success: Closed (ONLY when truly closed)
 */

export type StatusCategory =
  | 'open'
  | 'investigation'
  | 'action_required'
  | 'pending_closure'
  | 'rejected'
  | 'closed';

// Status to category mapping
const STATUS_CATEGORIES: Record<string, StatusCategory> = {
  // Open/Submitted states - Info
  'submitted': 'open',
  'pending_review': 'open',
  'expert_screening': 'open',

  // NEW: Consultant/Dept Rep initial review stages
  'pending_consultant_screening': 'open',
  'pending_dept_rep_review': 'open',

  // Under Investigation - Info
  'investigation_pending': 'investigation',
  'investigation_in_progress': 'investigation',
  'under_investigation': 'investigation',

  // Action Required (pending approvals) - Warning
  'pending_manager_approval': 'action_required',
  'pending_dept_rep_approval': 'action_required',
  'pending_dept_rep_incident_review': 'action_required',
  'pending_department_manager_approval': 'action_required',
  'pending_clinic_review': 'action_required',
  'pending_hsse_escalation_review': 'action_required',
  'hsse_manager_escalation': 'action_required',
  'pending_site_client_approval': 'action_required',
  'pending_hsse_expert_review': 'action_required',
  'pending_action_dispute_review': 'action_required',
  'pending_contractor_implementation': 'action_required',
  'pending_no_investigation_approval': 'action_required',       // C4: new gate
  'pending_escalation_approval': 'action_required',             // Spec: obs→incident escalation

  // Monitoring - Pending
  'monitoring_30_day': 'pending_closure',
  'monitoring_60_day': 'pending_closure',
  'monitoring_90_day': 'pending_closure',

  // Pending CAPA/Closure - Pending
  'observation_actions_pending': 'pending_closure',
  'pending_closure': 'pending_closure',
  'pending_final_closure': 'pending_closure',

  // Rejected/Returned - Destructive
  'expert_rejected': 'rejected',
  'manager_rejected': 'rejected',
  'returned_to_reporter': 'rejected',
  'dept_rep_rejected': 'rejected',                              // Spec: dept rep rejection

  // Compliance
  'osha_reportable': 'action_required',                         // C10: OSHA flagged
  'pending_legal_review': 'action_required',
  'dispute_resolution': 'action_required',
  'pending_contractor_dispute_review': 'action_required',

  // Closed - Success
  'closed': 'closed',
  'no_investigation_required': 'closed',
  'investigation_closed': 'closed',
  'hsse_enforced': 'closed',
  'closed_rejected_approved_by_hsse': 'closed',
};

// Closed statuses (for filtering)
const CLOSED_STATUSES = ['closed', 'no_investigation_required', 'investigation_closed', 'closed_rejected_approved_by_hsse'];

// Rejected statuses (for filtering)
const REJECTED_STATUSES = ['expert_rejected', 'manager_rejected', 'dept_rep_rejected'];

/**
 * Human-readable display labels for all incident statuses.
 * C19: Every status code MUST have a Title Case label — never show underscores to users.
 */
const STATUS_LABELS: Record<string, string> = {
  // --- Screening ---
  submitted: 'Submitted',
  pending_review: 'Pending Review',
  expert_screening: 'Expert Screening',
  pending_expert_screening: 'Expert Screening',
  pending_dept_rep_approval: 'Dept Rep Approval',
  pending_dept_rep_incident_review: 'Dept Rep Review',
  pending_consultant_screening: 'Consultant Screening',
  pending_consultant_review: 'Consultant Review',
  pending_consultant_actions: 'Consultant Actions',
  pending_dept_rep_review: 'Dept Rep Review',
  dept_rep_rejected: 'Rejected By Dept Rep',

  // --- Rejection / Return ---
  returned_to_reporter: 'Returned To Reporter',
  expert_rejected: 'Expert Rejected',
  manager_rejected: 'Manager Rejected',

  // --- Gates ---
  pending_no_investigation_approval: 'No-Investigation Approval',
  no_investigation_required: 'No Investigation Required',
  pending_manager_approval: 'Manager Approval',
  pending_department_manager_approval: 'Dept Manager Approval',
  pending_escalation_approval: 'Escalation Approval',

  // --- Investigation ---
  investigation_pending: 'Awaiting Assignment',
  investigation_in_progress: 'Investigation In Progress',
  under_investigation: 'Under Investigation',
  pending_investigator_assignment: 'Investigator Assignment',

  // --- Escalation ---
  hsse_manager_escalation: 'HSSE Manager Escalation',
  pending_hsse_escalation_review: 'HSSE Escalation Review',

  // --- Closure ---
  pending_closure: 'Pending Closure',
  investigation_closed: 'Investigation Closed',
  pending_final_closure: 'Final Closure',
  closed: 'Closed',
  closed_rejected_approved_by_hsse: 'Closed (HSSE Approved)',

  // --- Observation ---
  observation_actions_pending: 'Actions Pending',
  pending_hsse_validation: 'HSSE Validation',
  pending_dept_rep_mandatory_action: 'Dept Rep Mandatory Action',

  // --- Monitoring ---
  monitoring_30_day: 'Monitoring (30 Day)',
  monitoring_60_day: 'Monitoring (60 Day)',
  monitoring_90_day: 'Monitoring (90 Day)',

  // --- Compliance ---
  osha_reportable: 'OSHA Flagged',
  pending_legal_review: 'Legal Review',
  pending_hsse_rejection_review: 'HSSE Rejection Review',

  // --- Dispute ---
  dispute_resolution: 'Dispute Resolution',
  pending_contractor_dispute_review: 'Contractor Dispute Review',
  pending_action_dispute_review: 'Action Dispute Review',

  // --- Clinic ---
  pending_clinic_review: 'Clinic Review',

  // --- Contractor Violations ---
  pending_department_manager_violation_approval: 'Violation Approval',
  pending_contract_controller_approval: 'Contract Controller Approval',
  pending_contractor_site_rep_approval: 'Contractor Site Rep Approval',
  pending_hsse_violation_review: 'HSSE Violation Review',
  contractor_violation_enforced: 'Violation Enforced',
  contractor_violation_approved_fine: 'Fine Approved',
  contractor_violation_cancelled: 'Violation Cancelled',
  contractor_violation_warning: 'Violation Warning',
  contractor_violation_terminated: 'Violation Terminated',

  // --- Other ---
  pending_site_client_approval: 'Site Client Approval',
  pending_hsse_expert_review: 'HSSE Expert Review',
  pending_contractor_implementation: 'Contractor Implementation',
  rejected_invalid: 'Invalid (Rejected)',
  draft: 'Draft',
};

/**
 * Convert a snake_case status code to a human-readable Title Case label.
 * Uses the explicit STATUS_LABELS map first, then falls back to Title Case conversion.
 * 
 * C19: This MUST be used everywhere a status is displayed to users.
 * Never show raw snake_case strings in the UI.
 * 
 * @example formatStatusLabel('investigation_in_progress') → "Investigation In Progress"
 * @example formatStatusLabel('osha_reportable') → "OSHA Flagged"
 */
export function formatStatusLabel(status: string | null | undefined): string {
  if (!status) return 'Unknown';

  // Check explicit labels first (handles special cases like OSHA, HSSE)
  if (STATUS_LABELS[status]) {
    return STATUS_LABELS[status];
  }

  // Fallback: convert snake_case to Title Case
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Get the category for a given status
 */
export function getStatusCategory(status: string | null | undefined): StatusCategory {
  if (!status) return 'open';
  return STATUS_CATEGORIES[status] || 'open';
}

/**
 * Get border color class for card based on status
 * Returns Tailwind border color class using semantic tokens
 */
export function getStatusBorderColor(status: string | null | undefined): string {
  const category = getStatusCategory(status);

  switch (category) {
    case 'open':
      return 'border-s-info';
    case 'investigation':
      return 'border-s-info';
    case 'action_required':
      return 'border-s-warning';
    case 'pending_closure':
      return 'border-s-pending';
    case 'rejected':
      return 'border-s-destructive';
    case 'closed':
      return 'border-s-success';
    default:
      return 'border-s-muted';
  }
}

/**
 * Get background color class for status category
 * Used for subtle row highlighting or badges
 */
export function getStatusBackgroundColor(status: string | null | undefined): string {
  const category = getStatusCategory(status);

  switch (category) {
    case 'open':
      return 'bg-info/10';
    case 'investigation':
      return 'bg-info/10';
    case 'action_required':
      return 'bg-warning/10';
    case 'pending_closure':
      return 'bg-pending/10';
    case 'rejected':
      return 'bg-destructive/10';
    case 'closed':
      return 'bg-success/10';
    default:
      return 'bg-muted/50';
  }
}

/**
 * Get text color class for status category
 */
export function getStatusTextColor(status: string | null | undefined): string {
  const category = getStatusCategory(status);

  switch (category) {
    case 'open':
      return 'text-info';
    case 'investigation':
      return 'text-info';
    case 'action_required':
      return 'text-warning';
    case 'pending_closure':
      return 'text-pending';
    case 'rejected':
      return 'text-destructive';
    case 'closed':
      return 'text-success';
    default:
      return 'text-muted-foreground';
  }
}

/**
 * Get badge variant for status category
 */
export function getStatusBadgeVariant(status: string | null | undefined): 'default' | 'secondary' | 'destructive' | 'outline' {
  const category = getStatusCategory(status);

  switch (category) {
    case 'open':
      return 'default';
    case 'investigation':
      return 'default';
    case 'action_required':
      return 'secondary';
    case 'pending_closure':
      return 'secondary';
    case 'rejected':
      return 'destructive';
    case 'closed':
      return 'outline';
    default:
      return 'secondary';
  }
}

/**
 * Check if status is considered "open" (not closed and not rejected)
 */
export function isOpenStatus(status: string | null | undefined): boolean {
  if (!status) return true;
  return !CLOSED_STATUSES.includes(status) && !REJECTED_STATUSES.includes(status);
}

/**
 * Check if status is considered "closed"
 */
export function isClosedStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return CLOSED_STATUSES.includes(status);
}

/**
 * Check if status is considered "rejected"
 */
export function isRejectedStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return REJECTED_STATUSES.includes(status);
}

/**
 * Get all closed statuses (for filtering)
 */
export function getClosedStatuses(): string[] {
  return [...CLOSED_STATUSES];
}

/**
 * Get all rejected statuses (for filtering)
 */
export function getRejectedStatuses(): string[] {
  return [...REJECTED_STATUSES];
}
