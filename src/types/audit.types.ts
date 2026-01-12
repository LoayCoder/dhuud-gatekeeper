/**
 * Audit logging types
 * Standard interface for audit trail entries across all modules
 */

export type AuditActionType = 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'READ' 
  | 'EXPORT' 
  | 'APPROVE' 
  | 'REJECT' 
  | 'SUBMIT' 
  | 'CLOSE'
  | 'REOPEN'
  | 'ASSIGN'
  | 'TRANSFER'
  | 'ESCALATE';

export type AuditEntityType = 
  | 'incident' 
  | 'investigation' 
  | 'corrective_action'
  | 'inspection' 
  | 'inspection_session'
  | 'asset' 
  | 'asset_maintenance'
  | 'user' 
  | 'profile'
  | 'visitor' 
  | 'contractor_worker'
  | 'contractor_company'
  | 'gate_pass'
  | 'permit'
  | 'security_shift'
  | 'patrol'
  | 'risk_assessment';

export interface AuditLogEntry {
  /** UUID of the user performing the action */
  who_id: string;
  /** Type of action being performed */
  action_type: AuditActionType;
  /** Type of entity being acted upon */
  entity_type: AuditEntityType;
  /** UUID of the entity being modified */
  entity_id: string;
  /** Previous state of the entity (null for CREATE) */
  old_value: Record<string, unknown> | null;
  /** New state of the entity (null for DELETE) */
  new_value: Record<string, unknown> | null;
  /** ISO timestamp of the action */
  timestamp: string;
  /** IP address of the client (if available) */
  ip_address: string | null;
  /** Tenant ID for multi-tenancy isolation */
  tenant_id: string;
  /** Optional human-readable description */
  description?: string;
  /** Optional metadata for additional context */
  metadata?: Record<string, unknown>;
}

export interface AuditLogInsert extends Omit<AuditLogEntry, 'timestamp'> {
  timestamp?: string;
}

export interface AuditLogFilter {
  entity_type?: AuditEntityType;
  entity_id?: string;
  who_id?: string;
  action_type?: AuditActionType;
  start_date?: Date;
  end_date?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Helper to create a minimal audit entry for UPDATE actions
 * Only includes changed fields in old_value and new_value
 */
export function createDiffAuditEntry<T extends Record<string, unknown>>(
  original: T,
  updated: T
): { old_value: Partial<T>; new_value: Partial<T> } {
  const old_value: Partial<T> = {};
  const new_value: Partial<T> = {};

  for (const key of Object.keys(updated) as Array<keyof T>) {
    if (JSON.stringify(original[key]) !== JSON.stringify(updated[key])) {
      old_value[key] = original[key];
      new_value[key] = updated[key];
    }
  }

  return { old_value, new_value };
}
