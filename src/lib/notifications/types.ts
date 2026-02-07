/**
 * UNIFIED NOTIFICATION TYPES
 *
 * Single source of truth for all notification-related type definitions.
 * All modules MUST use these types when interacting with the notification pipeline.
 */

// ============================================================================
// DELIVERY CHANNELS
// ============================================================================

export type NotificationChannel = 'in_app' | 'email' | 'whatsapp' | 'push';

export const ALL_CHANNELS: NotificationChannel[] = ['in_app', 'email', 'whatsapp', 'push'];

// ============================================================================
// ACTION EVENT TYPES (what triggers a notification)
// ============================================================================

/**
 * Every module exposes a finite set of action events.
 * The pipeline maps each event to the appropriate notification config.
 */
export type ActionEventType =
  // Incidents
  | 'incident.created'
  | 'incident.assigned'
  | 'incident.status_changed'
  | 'incident.closed'
  | 'incident.escalated'
  | 'incident.investigation_started'
  | 'incident.investigation_completed'
  // Observations
  | 'observation.created'
  | 'observation.reviewed'
  | 'observation.escalated'
  | 'observation.closed'
  // Gate Passes
  | 'gate_pass.requested'
  | 'gate_pass.approved'
  | 'gate_pass.rejected'
  | 'gate_pass.expired'
  | 'gate_pass.checked_in'
  | 'gate_pass.checked_out'
  // Inspections
  | 'inspection.scheduled'
  | 'inspection.started'
  | 'inspection.completed'
  | 'inspection.action_created'
  | 'inspection.finding_created'
  // Audits
  | 'audit.scheduled'
  | 'audit.started'
  | 'audit.completed'
  | 'audit.finding_created'
  | 'audit.corrective_action_created'
  // Corrective Actions (shared across modules)
  | 'action.assigned'
  | 'action.started'
  | 'action.completed'
  | 'action.verified'
  | 'action.returned'
  | 'action.overdue'
  | 'action.extension_requested'
  | 'action.extension_approved'
  | 'action.extension_rejected'
  // User Management
  | 'user.created'
  | 'user.role_changed'
  | 'user.deactivated'
  | 'user.invited'
  // Password Reset
  | 'password.reset_requested'
  | 'password.reset_completed'
  | 'password.admin_reset'
  // Contractors
  | 'contractor.registered'
  | 'contractor.approved'
  | 'contractor.rejected'
  | 'contractor.compliance_expiring'
  | 'contractor.worker_approved'
  | 'contractor.worker_rejected'
  // Video Induction
  | 'induction.assigned'
  | 'induction.completed'
  | 'induction.overdue'
  | 'induction.expired'
  // SLA & Escalation
  | 'sla.warning'
  | 'sla.overdue'
  | 'sla.escalated'
  // Emergency
  | 'emergency.alert_created'
  | 'emergency.alert_acknowledged'
  // HSSE Broadcast
  | 'hsse.notification_published'
  // Approvals
  | 'approval.requested'
  | 'approval.granted'
  | 'approval.denied';

// ============================================================================
// PRIORITY & URGENCY
// ============================================================================

export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low';

// ============================================================================
// NOTIFICATION PAYLOAD (input to the pipeline)
// ============================================================================

/**
 * The canonical action event that enters the notification pipeline.
 * Every module submits ONE of these, and the pipeline handles fan-out.
 */
export interface ActionEvent {
  /** Globally unique event ID for idempotency */
  eventId: string;
  /** The action that happened */
  eventType: ActionEventType;
  /** When the event occurred */
  timestamp: string;
  /** Priority determines delivery urgency and channel selection */
  priority: NotificationPriority;
  /** Tenant scope */
  tenantId: string;
  /** Who triggered the action (null for system-triggered events) */
  actorId: string | null;
  /** Source entity reference */
  source: {
    entityType: string;    // e.g. 'incident', 'gate_pass', 'inspection_session'
    entityId: string;
    referenceId?: string;  // e.g. 'INC-2024-001'
  };
  /** Template variables for message rendering */
  variables: Record<string, string>;
  /** Override recipients (if not using matrix-based routing) */
  recipientOverrides?: NotificationRecipient[];
  /** Module-specific metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// RECIPIENTS
// ============================================================================

export interface NotificationRecipient {
  userId: string;
  name?: string;
  email?: string;
  phone?: string;
  language?: string;
  /** Channels this specific recipient should receive (overrides defaults) */
  channels?: NotificationChannel[];
}

// ============================================================================
// CHANNEL DELIVERY CONFIG (output from the mapper)
// ============================================================================

export interface ChannelDeliveryConfig {
  channel: NotificationChannel;
  templateSlug: string;
  recipients: NotificationRecipient[];
  /** For in-app: entity linking */
  relatedEntityType?: string;
  relatedEntityId?: string;
  /** For push: additional data payload */
  pushData?: Record<string, unknown>;
  /** For email: subject override */
  emailSubject?: string;
}

// ============================================================================
// NOTIFICATION RESULT (returned after delivery)
// ============================================================================

export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'skipped';

export interface DeliveryResult {
  channel: NotificationChannel;
  recipientId: string;
  status: DeliveryStatus;
  providerId?: string;
  error?: string;
  timestamp: string;
}

export interface PipelineResult {
  eventId: string;
  eventType: ActionEventType;
  deliveries: DeliveryResult[];
  deduplicated: boolean;
  auditLogId?: string;
}

// ============================================================================
// TEMPLATE DEFINITION
// ============================================================================

export interface NotificationTemplate {
  slug: string;
  /** Channel-specific content patterns */
  channels: {
    in_app?: {
      titlePattern: string;
      titlePatternAr?: string;
      bodyPattern: string;
      bodyPatternAr?: string;
    };
    email?: {
      subjectPattern: string;
      bodyPattern: string;
    };
    whatsapp?: {
      metaTemplateName?: string;
      contentPattern: string;
    };
    push?: {
      titlePattern: string;
      bodyPattern: string;
      icon?: string;
      tag?: string;
    };
  };
  /** Variables expected by this template */
  variableKeys: string[];
  /** Default priority (can be overridden by event) */
  defaultPriority: NotificationPriority;
}

// ============================================================================
// ROUTING RULE (who gets notified for what)
// ============================================================================

export interface NotificationRoutingRule {
  eventType: ActionEventType;
  /** Stakeholder roles that should receive this notification */
  recipientRoles: string[];
  /** Which channels are active for this event */
  channels: NotificationChannel[];
  /** Template to use per channel */
  templateSlug: string;
  /** Conditions (e.g. severity >= 3, or has injury) */
  conditions?: Record<string, unknown>;
}

// ============================================================================
// NOTIFICATION PREFERENCE TYPES (for user opt-out)
// ============================================================================

export type PreferenceCategory =
  | 'incidents_new'
  | 'incidents_assigned'
  | 'incidents_status_change'
  | 'approvals_requested'
  | 'approvals_decision'
  | 'sla_warnings'
  | 'sla_overdue'
  | 'sla_escalations'
  | 'system_announcements'
  | 'visitor_checkin'
  | 'contractor_alerts'
  | 'gate_pass_approval'
  | 'daily_digest'
  | 'weekly_summary';

/**
 * Maps action event types to preference categories.
 * Used to check user opt-out before delivery.
 */
export const EVENT_TO_PREFERENCE: Partial<Record<ActionEventType, PreferenceCategory>> = {
  'incident.created': 'incidents_new',
  'incident.assigned': 'incidents_assigned',
  'incident.status_changed': 'incidents_status_change',
  'observation.created': 'incidents_new',
  'approval.requested': 'approvals_requested',
  'approval.granted': 'approvals_decision',
  'approval.denied': 'approvals_decision',
  'sla.warning': 'sla_warnings',
  'sla.overdue': 'sla_overdue',
  'sla.escalated': 'sla_escalations',
  'gate_pass.approved': 'gate_pass_approval',
  'gate_pass.rejected': 'gate_pass_approval',
  'contractor.approved': 'contractor_alerts',
  'contractor.rejected': 'contractor_alerts',
  'hsse.notification_published': 'system_announcements',
};

// ============================================================================
// AUDIT LOG ENTRY
// ============================================================================

export interface NotificationAuditEntry {
  id?: string;
  eventId: string;
  eventType: ActionEventType;
  tenantId: string;
  actorId: string | null;
  sourceEntityType: string;
  sourceEntityId: string;
  channels: NotificationChannel[];
  recipientCount: number;
  deliveredCount: number;
  failedCount: number;
  skippedCount: number;
  deduplicatedCount: number;
  pipelineStartedAt: string;
  pipelineCompletedAt: string;
  durationMs: number;
  metadata?: Record<string, unknown>;
}
