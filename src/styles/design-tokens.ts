/**
 * HSSE Design System Tokens
 * 
 * Centralized design tokens for the entire HSSE platform.
 * All pages and components MUST use these tokens for consistency.
 * 
 * IMPORTANT: These are utility constants for TypeScript usage.
 * Actual styling should use Tailwind classes that reference CSS variables from index.css
 */

// ============================================
// STATUS SEMANTIC COLORS
// Used for status indicators across the system
// ============================================

export const STATUS_VARIANTS = {
  /** Informational - Soft Blue */
  informational: {
    container: 'bg-info/10 border-info/20',
    text: 'text-info',
    badge: 'bg-info/10 text-info border-info/20',
  },
  /** Pending/Warning - Soft Orange */
  pending: {
    container: 'bg-warning/10 border-warning/20',
    text: 'text-warning',
    badge: 'bg-warning/10 text-warning border-warning/20',
  },
  /** Critical/Danger - Soft Red */
  critical: {
    container: 'bg-destructive/10 border-destructive/20',
    text: 'text-destructive',
    badge: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  /** Completed/Success - Soft Green */
  completed: {
    container: 'bg-success/10 border-success/20',
    text: 'text-success',
    badge: 'bg-success/10 text-success border-success/20',
  },
  /** Neutral/Default */
  neutral: {
    container: 'bg-muted border-muted',
    text: 'text-muted-foreground',
    badge: 'bg-muted text-muted-foreground border-muted',
  },
} as const;

export type StatusVariant = keyof typeof STATUS_VARIANTS;

// ============================================
// CARD VARIANTS
// Standardized card styles
// ============================================

export const CARD_VARIANTS = {
  /** Default card */
  default: 'rounded-lg border bg-card shadow-sm',
  /** Summary card - action-oriented */
  summary: 'rounded-lg border bg-card p-4 shadow-sm',
  /** Clickable action card */
  action: 'rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer',
  /** Alert/attention card */
  alert: 'rounded-lg border-2 p-4',
  /** Flat card - minimal styling */
  flat: 'rounded-lg border bg-card p-4',
  /** KPI card - metric display */
  kpi: 'rounded-lg border bg-card p-3 text-center',
} as const;

export type CardVariant = keyof typeof CARD_VARIANTS;

// ============================================
// TYPOGRAPHY CLASSES
// Consistent text hierarchy
// ============================================

export const TYPOGRAPHY = {
  /** Page title - largest heading */
  pageTitle: 'text-2xl font-bold tracking-tight',
  /** Section title */
  sectionTitle: 'text-lg font-semibold',
  /** Card title */
  cardTitle: 'text-sm font-medium',
  /** Body text */
  body: 'text-sm text-foreground',
  /** Helper/muted text */
  helper: 'text-xs text-muted-foreground',
  /** Label text */
  label: 'text-sm font-medium text-foreground',
} as const;

// ============================================
// SPACING CONSTANTS
// Consistent spacing values
// ============================================

export const SPACING = {
  /** Page padding */
  page: 'p-4 sm:p-6',
  /** Section gap */
  section: 'space-y-6',
  /** Card content padding */
  card: 'p-4',
  /** Compact spacing */
  compact: 'space-y-3',
  /** Grid gap */
  grid: 'gap-4',
} as const;

// ============================================
// PRIORITY MAPPING
// Map priority values to status variants
// ============================================

export const PRIORITY_TO_STATUS: Record<string, StatusVariant> = {
  critical: 'critical',
  high: 'critical',
  major: 'critical',
  medium: 'pending',
  moderate: 'pending',
  low: 'informational',
  minor: 'informational',
  observation: 'neutral',
};

// ============================================
// STATUS MAPPING
// Map workflow statuses to status variants
// ============================================

export const WORKFLOW_STATUS_TO_VARIANT: Record<string, StatusVariant> = {
  // Open/Active states
  open: 'informational',
  active: 'informational',
  in_progress: 'informational',
  pending: 'pending',
  
  // Warning states
  overdue: 'critical',
  escalated: 'critical',
  rejected: 'critical',
  
  // Completed states
  completed: 'completed',
  closed: 'completed',
  approved: 'completed',
  resolved: 'completed',
  
  // Draft/Neutral states
  draft: 'neutral',
  cancelled: 'neutral',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get status variant from priority string
 */
export function getStatusFromPriority(priority: string | null | undefined): StatusVariant {
  if (!priority) return 'neutral';
  return PRIORITY_TO_STATUS[priority.toLowerCase()] || 'neutral';
}

/**
 * Get status variant from workflow status
 */
export function getStatusFromWorkflow(status: string | null | undefined): StatusVariant {
  if (!status) return 'neutral';
  return WORKFLOW_STATUS_TO_VARIANT[status.toLowerCase()] || 'neutral';
}

/**
 * Get the appropriate status classes
 */
export function getStatusClasses(variant: StatusVariant) {
  return STATUS_VARIANTS[variant];
}
