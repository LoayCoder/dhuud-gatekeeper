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
  
  // Under Investigation - Info
  'investigation_pending': 'investigation',
  'investigation_in_progress': 'investigation',
  'under_investigation': 'investigation',
  
  // Action Required (pending approvals) - Warning
  'pending_manager_approval': 'action_required',
  'pending_dept_rep_approval': 'action_required',
  'pending_dept_rep_incident_review': 'action_required',
  'pending_hsse_escalation_review': 'action_required',
  'hsse_manager_escalation': 'action_required',
  
  // Pending CAPA/Closure - Pending
  'observation_actions_pending': 'pending_closure',
  'pending_closure': 'pending_closure',
  'pending_final_closure': 'pending_closure',
  
  // Rejected/Returned - Destructive
  'expert_rejected': 'rejected',
  'manager_rejected': 'rejected',
  'returned_to_reporter': 'rejected',
  
  // Closed - Success
  'closed': 'closed',
  'no_investigation_required': 'closed',
  'investigation_closed': 'closed',
};

// Closed statuses (for filtering)
const CLOSED_STATUSES = ['closed', 'no_investigation_required', 'investigation_closed'];

// Rejected statuses (for filtering)
const REJECTED_STATUSES = ['expert_rejected', 'manager_rejected'];

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
