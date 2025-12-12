import { supabase } from '@/integrations/supabase/client';

export type ReportAccessLevel = 'manager' | 'hsse_full';

/**
 * Determine the report access level for a user
 * - 'hsse_full': HSSE Expert, HSSE Manager, or Admin - sees complete report
 * - 'manager': Regular managers - sees restricted summary report
 */
export async function getReportAccessLevel(userId: string): Promise<ReportAccessLevel> {
  // Check if user has HSSE access (Admin, HSSE Expert, HSSE Manager)
  const { data: hasHsseAccess } = await supabase.rpc('has_hsse_incident_access', { 
    _user_id: userId 
  });
  
  if (hasHsseAccess) {
    return 'hsse_full';
  }
  
  return 'manager';
}

// Audit actions visible to managers (limited view)
export const MANAGER_AUDIT_ACTIONS = [
  'incident_created',
  'incident_submitted',
  'status_changed',
  'manager_approved',
  'manager_rejected',
  'action_created',
  'action_updated',
  'action_completed',
  'action_verified',
  'investigation_started',
  'closure_requested',
  'closure_approved',
];

// All audit actions for HSSE full report
export const FULL_AUDIT_ACTIONS = [
  ...MANAGER_AUDIT_ACTIONS,
  'evidence_uploaded',
  'evidence_deleted',
  'witness_statement_added',
  'witness_statement_updated',
  'rca_updated',
  'root_cause_added',
  'contributing_factor_added',
  'investigation_completed',
  'severity_changed',
  'severity_approved',
  'expert_screened',
  'expert_rejected',
  'returned_to_reporter',
  'resubmitted',
  'incident_reopened',
  'incident_closed',
];
