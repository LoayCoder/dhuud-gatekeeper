/**
 * Unified Status Color Utility for HSSE Incidents Module
 * 
 * Status Color Rules:
 * - Blue: Open/Submitted states
 * - Violet/Indigo: Under Investigation
 * - Orange: Action Required (pending approvals)
 * - Amber/Yellow: Pending CAPA/Closure
 * - Red: Rejected/Returned
 * - Green: Closed (ONLY when truly closed)
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
  // Open/Submitted states - Blue
  'submitted': 'open',
  'pending_review': 'open',
  'expert_screening': 'open',
  
  // Under Investigation - Violet
  'investigation_pending': 'investigation',
  'investigation_in_progress': 'investigation',
  'under_investigation': 'investigation',
  
  // Action Required (pending approvals) - Orange
  'pending_manager_approval': 'action_required',
  'pending_dept_rep_approval': 'action_required',
  'pending_dept_rep_incident_review': 'action_required',
  'pending_hsse_escalation_review': 'action_required',
  'hsse_manager_escalation': 'action_required',
  
  // Pending CAPA/Closure - Amber/Yellow
  'observation_actions_pending': 'pending_closure',
  'pending_closure': 'pending_closure',
  'pending_final_closure': 'pending_closure',
  
  // Rejected/Returned - Red
  'expert_rejected': 'rejected',
  'manager_rejected': 'rejected',
  'returned_to_reporter': 'rejected',
  
  // Closed - Green (ONLY truly closed)
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
 * Returns Tailwind border color class
 */
export function getStatusBorderColor(status: string | null | undefined): string {
  const category = getStatusCategory(status);
  
  switch (category) {
    case 'open':
      return 'border-s-blue-500';
    case 'investigation':
      return 'border-s-violet-500';
    case 'action_required':
      return 'border-s-orange-500';
    case 'pending_closure':
      return 'border-s-amber-500';
    case 'rejected':
      return 'border-s-destructive';
    case 'closed':
      return 'border-s-green-500';
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
      return 'bg-blue-50 dark:bg-blue-950/30';
    case 'investigation':
      return 'bg-violet-50 dark:bg-violet-950/30';
    case 'action_required':
      return 'bg-orange-50 dark:bg-orange-950/30';
    case 'pending_closure':
      return 'bg-amber-50 dark:bg-amber-950/30';
    case 'rejected':
      return 'bg-red-50 dark:bg-red-950/30';
    case 'closed':
      return 'bg-green-50 dark:bg-green-950/30';
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
      return 'text-blue-600 dark:text-blue-400';
    case 'investigation':
      return 'text-violet-600 dark:text-violet-400';
    case 'action_required':
      return 'text-orange-600 dark:text-orange-400';
    case 'pending_closure':
      return 'text-amber-600 dark:text-amber-400';
    case 'rejected':
      return 'text-red-600 dark:text-red-400';
    case 'closed':
      return 'text-green-600 dark:text-green-400';
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
