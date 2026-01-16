/**
 * Client-side Audit Logger
 * Helper for logging audit events to the centralized audit_logs table
 */

import { supabase } from '@/integrations/supabase/client';

export type AuditActionType = 
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VIEW'
  | 'APPROVE'
  | 'REJECT'
  | 'SUBMIT'
  | 'ASSIGN'
  | 'ESCALATE'
  | 'CLOSE'
  | 'REOPEN'
  | 'EXPORT'
  | 'IMPORT'
  | 'LOGIN'
  | 'LOGOUT'
  | 'PASSWORD_CHANGE'
  | 'PERMISSION_CHANGE';

export type EntityType =
  | 'incident'
  | 'inspection'
  | 'asset'
  | 'user'
  | 'profile'
  | 'corrective_action'
  | 'gate_entry'
  | 'visitor'
  | 'patrol'
  | 'permit'
  | 'contractor'
  | 'report'
  | 'setting'
  | 'role'
  | 'department'
  | 'branch'
  | 'site';

export interface AuditLogEntry {
  action_type: AuditActionType;
  entity_type: EntityType;
  entity_id: string;
  old_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Capture client context for enhanced audit logging
 */
function getClientContext(): Record<string, unknown> {
  if (typeof window === 'undefined') return {};
  
  return {
    user_agent: navigator.userAgent,
    screen: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    url: window.location.pathname,
  };
}

/**
 * Log an audit event to the centralized audit_logs table
 */
export async function logAudit(entry: AuditLogEntry): Promise<{ success: boolean; error?: string }> {
  try {
    // Capture client context for enhanced auditing
    const clientContext = getClientContext();
    
    const { error } = await supabase.rpc('log_audit', {
      p_action_type: entry.action_type,
      p_entity_type: entry.entity_type,
      p_entity_id: entry.entity_id,
      p_old_value: entry.old_value ? JSON.parse(JSON.stringify(entry.old_value)) : null,
      p_new_value: entry.new_value ? JSON.parse(JSON.stringify(entry.new_value)) : null,
      p_description: entry.description ?? null,
      p_metadata: JSON.parse(JSON.stringify({ ...clientContext, ...entry.metadata })),
    });

    if (error) {
      console.error('Audit log error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Audit log exception:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Log a CREATE action
 */
export async function logCreate(
  entityType: EntityType,
  entityId: string,
  newValue: Record<string, unknown>,
  description?: string
) {
  return logAudit({
    action_type: 'CREATE',
    entity_type: entityType,
    entity_id: entityId,
    new_value: newValue,
    description,
  });
}

/**
 * Log an UPDATE action
 */
export async function logUpdate(
  entityType: EntityType,
  entityId: string,
  oldValue: Record<string, unknown>,
  newValue: Record<string, unknown>,
  description?: string
) {
  return logAudit({
    action_type: 'UPDATE',
    entity_type: entityType,
    entity_id: entityId,
    old_value: oldValue,
    new_value: newValue,
    description,
  });
}

/**
 * Log a DELETE action
 */
export async function logDelete(
  entityType: EntityType,
  entityId: string,
  oldValue: Record<string, unknown>,
  description?: string
) {
  return logAudit({
    action_type: 'DELETE',
    entity_type: entityType,
    entity_id: entityId,
    old_value: oldValue,
    description,
  });
}

/**
 * Log a status change (common pattern)
 */
export async function logStatusChange(
  entityType: EntityType,
  entityId: string,
  oldStatus: string,
  newStatus: string,
  description?: string
) {
  return logAudit({
    action_type: 'UPDATE',
    entity_type: entityType,
    entity_id: entityId,
    old_value: { status: oldStatus },
    new_value: { status: newStatus },
    description: description ?? `Status changed from ${oldStatus} to ${newStatus}`,
  });
}

/**
 * Log an approval action
 */
export async function logApproval(
  entityType: EntityType,
  entityId: string,
  approved: boolean,
  notes?: string
) {
  return logAudit({
    action_type: approved ? 'APPROVE' : 'REJECT',
    entity_type: entityType,
    entity_id: entityId,
    new_value: { approved, notes },
    description: approved ? 'Approved' : 'Rejected',
  });
}

/**
 * Log an assignment action
 */
export async function logAssignment(
  entityType: EntityType,
  entityId: string,
  assignedTo: string,
  previousAssignee?: string
) {
  return logAudit({
    action_type: 'ASSIGN',
    entity_type: entityType,
    entity_id: entityId,
    old_value: previousAssignee ? { assigned_to: previousAssignee } : null,
    new_value: { assigned_to: assignedTo },
    description: `Assigned to ${assignedTo}`,
  });
}

/**
 * Log data export
 */
export async function logExport(
  entityType: EntityType,
  format: string,
  recordCount: number,
  filters?: Record<string, unknown>
) {
  return logAudit({
    action_type: 'EXPORT',
    entity_type: entityType,
    entity_id: 'bulk',
    new_value: { format, recordCount, filters },
    description: `Exported ${recordCount} ${entityType} records as ${format}`,
  });
}
