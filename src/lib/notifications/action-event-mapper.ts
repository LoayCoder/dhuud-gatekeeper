/**
 * ACTION EVENT MAPPER
 *
 * Maps action events to notification delivery configurations.
 * This is the SINGLE place where event→notification routing is defined.
 *
 * Architecture:
 * 1. Module fires an ActionEvent
 * 2. Mapper resolves: which channels, which template, which recipients
 * 3. Pipeline delivers via resolved channels
 *
 * This replaces the scattered notification triggers across:
 * - dispatch-incident-notification (DB trigger)
 * - send-hsse-notification (admin-initiated)
 * - useCreateNotification() (ad-hoc in-app)
 * - useHostArrivalNotification() (gate-specific)
 * - Various SLA escalation functions
 */

import type {
  ActionEvent,
  ActionEventType,
  NotificationChannel,
  ChannelDeliveryConfig,
  NotificationPriority,
} from './types';

// ============================================================================
// DEFAULT CHANNEL MAPPING
// ============================================================================

/**
 * Default channels per event type.
 * These can be overridden by:
 * 1. incident_notification_matrix rules (for incidents/observations)
 * 2. Admin configuration
 * 3. Per-event recipientOverrides
 */
const DEFAULT_CHANNEL_MAP: Record<ActionEventType, NotificationChannel[]> = {
  // Incidents — multi-channel based on severity
  'incident.created':                 ['in_app', 'push', 'email'],
  'incident.assigned':                ['in_app', 'push', 'email'],
  'incident.status_changed':          ['in_app', 'push'],
  'incident.closed':                  ['in_app'],
  'incident.escalated':               ['in_app', 'push', 'email', 'whatsapp'],
  'incident.investigation_started':   ['in_app', 'push'],
  'incident.investigation_completed': ['in_app', 'push'],

  // Observations
  'observation.created':    ['in_app', 'push'],
  'observation.reviewed':   ['in_app'],
  'observation.escalated':  ['in_app', 'push', 'email'],
  'observation.closed':     ['in_app'],

  // Gate Passes
  'gate_pass.requested':    ['in_app', 'push'],
  'gate_pass.approved':     ['in_app', 'push', 'email'],
  'gate_pass.rejected':     ['in_app', 'push'],
  'gate_pass.expired':      ['in_app'],
  'gate_pass.checked_in':   ['in_app'],
  'gate_pass.checked_out':  ['in_app'],

  // Inspections
  'inspection.scheduled':       ['in_app', 'push'],
  'inspection.started':         ['in_app'],
  'inspection.completed':       ['in_app'],
  'inspection.action_created':  ['in_app', 'push', 'email'],
  'inspection.finding_created': ['in_app', 'push'],

  // Audits
  'audit.scheduled':                  ['in_app', 'push', 'email'],
  'audit.started':                    ['in_app'],
  'audit.completed':                  ['in_app', 'push'],
  'audit.finding_created':            ['in_app', 'push'],
  'audit.corrective_action_created':  ['in_app', 'push', 'email'],

  // Corrective Actions (cross-module)
  'action.assigned':            ['in_app', 'push', 'email'],
  'action.started':             ['in_app'],
  'action.completed':           ['in_app', 'push'],
  'action.verified':            ['in_app', 'push'],
  'action.returned':            ['in_app', 'push', 'email'],
  'action.overdue':             ['in_app', 'push', 'email'],
  'action.extension_requested': ['in_app', 'push'],
  'action.extension_approved':  ['in_app', 'push'],
  'action.extension_rejected':  ['in_app', 'push'],

  // User Management
  'user.created':       ['in_app', 'email'],
  'user.role_changed':  ['in_app', 'email'],
  'user.deactivated':   ['in_app', 'email'],
  'user.invited':       ['email'],

  // Password Reset
  'password.reset_requested': ['email'],
  'password.reset_completed': ['in_app'],
  'password.admin_reset':     ['email'],

  // Contractors
  'contractor.registered':          ['in_app', 'push'],
  'contractor.approved':            ['in_app', 'email', 'whatsapp'],
  'contractor.rejected':            ['in_app', 'email'],
  'contractor.compliance_expiring': ['in_app', 'push', 'email'],
  'contractor.worker_approved':     ['in_app', 'email', 'whatsapp'],
  'contractor.worker_rejected':     ['in_app', 'email'],

  // Video Induction
  'induction.assigned':  ['in_app', 'push', 'whatsapp'],
  'induction.completed': ['in_app'],
  'induction.overdue':   ['in_app', 'push', 'email'],
  'induction.expired':   ['in_app', 'push', 'email'],

  // SLA & Escalation
  'sla.warning':   ['in_app', 'push'],
  'sla.overdue':   ['in_app', 'push', 'email'],
  'sla.escalated': ['in_app', 'push', 'email', 'whatsapp'],

  // Emergency
  'emergency.alert_created':      ['in_app', 'push', 'whatsapp'],
  'emergency.alert_acknowledged': ['in_app'],

  // HSSE Broadcast
  'hsse.notification_published': ['in_app', 'push', 'email'],

  // Approvals
  'approval.requested': ['in_app', 'push'],
  'approval.granted':   ['in_app', 'push'],
  'approval.denied':    ['in_app', 'push'],
};

// ============================================================================
// DEFAULT TEMPLATE SLUGS PER EVENT TYPE
// ============================================================================

/**
 * Template slug convention: {module}_{event}_{channel}
 * Falls back to {module}_{event} for shared templates.
 */
const DEFAULT_TEMPLATE_MAP: Record<ActionEventType, string> = {
  'incident.created':                 'incident_created',
  'incident.assigned':                'incident_assigned',
  'incident.status_changed':          'incident_status_changed',
  'incident.closed':                  'incident_closed',
  'incident.escalated':               'incident_escalated',
  'incident.investigation_started':   'incident_investigation_started',
  'incident.investigation_completed': 'incident_investigation_completed',

  'observation.created':   'observation_created',
  'observation.reviewed':  'observation_reviewed',
  'observation.escalated': 'observation_escalated',
  'observation.closed':    'observation_closed',

  'gate_pass.requested':   'gate_pass_requested',
  'gate_pass.approved':    'gate_pass_approved',
  'gate_pass.rejected':    'gate_pass_rejected',
  'gate_pass.expired':     'gate_pass_expired',
  'gate_pass.checked_in':  'gate_pass_checked_in',
  'gate_pass.checked_out': 'gate_pass_checked_out',

  'inspection.scheduled':       'inspection_scheduled',
  'inspection.started':         'inspection_started',
  'inspection.completed':       'inspection_completed',
  'inspection.action_created':  'inspection_action_created',
  'inspection.finding_created': 'inspection_finding_created',

  'audit.scheduled':                 'audit_scheduled',
  'audit.started':                   'audit_started',
  'audit.completed':                 'audit_completed',
  'audit.finding_created':           'audit_finding_created',
  'audit.corrective_action_created': 'audit_corrective_action_created',

  'action.assigned':            'action_assigned',
  'action.started':             'action_started',
  'action.completed':           'action_completed',
  'action.verified':            'action_verified',
  'action.returned':            'action_returned',
  'action.overdue':             'action_overdue',
  'action.extension_requested': 'action_extension_requested',
  'action.extension_approved':  'action_extension_approved',
  'action.extension_rejected':  'action_extension_rejected',

  'user.created':      'user_created',
  'user.role_changed': 'user_role_changed',
  'user.deactivated':  'user_deactivated',
  'user.invited':      'user_invited',

  'password.reset_requested': 'password_reset_requested',
  'password.reset_completed': 'password_reset_completed',
  'password.admin_reset':     'password_admin_reset',

  'contractor.registered':          'contractor_registered',
  'contractor.approved':            'contractor_approved',
  'contractor.rejected':            'contractor_rejected',
  'contractor.compliance_expiring': 'contractor_compliance_expiring',
  'contractor.worker_approved':     'contractor_worker_approved',
  'contractor.worker_rejected':     'contractor_worker_rejected',

  'induction.assigned':  'induction_assigned',
  'induction.completed': 'induction_completed',
  'induction.overdue':   'induction_overdue',
  'induction.expired':   'induction_expired',

  'sla.warning':   'sla_warning',
  'sla.overdue':   'sla_overdue',
  'sla.escalated': 'sla_escalated',

  'emergency.alert_created':      'emergency_alert',
  'emergency.alert_acknowledged': 'emergency_acknowledged',

  'hsse.notification_published': 'hsse_broadcast',

  'approval.requested': 'approval_requested',
  'approval.granted':   'approval_granted',
  'approval.denied':    'approval_denied',
};

// ============================================================================
// PRIORITY ESCALATION — adds channels for higher priority
// ============================================================================

function escalateChannelsForPriority(
  baseChannels: NotificationChannel[],
  priority: NotificationPriority
): NotificationChannel[] {
  const channels = [...baseChannels];

  if (priority === 'critical') {
    // Critical: ensure all channels are active
    if (!channels.includes('push')) channels.push('push');
    if (!channels.includes('email')) channels.push('email');
    if (!channels.includes('whatsapp')) channels.push('whatsapp');
  } else if (priority === 'high') {
    // High: add push and email
    if (!channels.includes('push')) channels.push('push');
    if (!channels.includes('email')) channels.push('email');
  }

  return channels;
}

// ============================================================================
// MAIN MAPPER FUNCTION
// ============================================================================

/**
 * Maps an ActionEvent to a set of ChannelDeliveryConfigs.
 * This is the SINGLE point of truth for "what notification to send where".
 */
export function mapActionEventToDeliveries(event: ActionEvent): ChannelDeliveryConfig[] {
  const baseChannels = DEFAULT_CHANNEL_MAP[event.eventType] || ['in_app'];
  const templateSlug = DEFAULT_TEMPLATE_MAP[event.eventType] || event.eventType.replace('.', '_');

  // Escalate channels based on priority
  const channels = escalateChannelsForPriority(baseChannels, event.priority);

  // If explicit recipient overrides are provided, use them
  const recipients = event.recipientOverrides || [];

  // Build one ChannelDeliveryConfig per active channel
  return channels.map((channel): ChannelDeliveryConfig => ({
    channel,
    templateSlug: `${templateSlug}_${channel}`,
    recipients: recipients.filter(r => {
      // If recipient has channel overrides, only include if this channel is in their list
      if (r.channels && r.channels.length > 0) {
        return r.channels.includes(channel);
      }
      return true;
    }),
    relatedEntityType: event.source.entityType,
    relatedEntityId: event.source.entityId,
    pushData: channel === 'push' ? {
      eventType: event.eventType,
      entityType: event.source.entityType,
      entityId: event.source.entityId,
      referenceId: event.source.referenceId,
      priority: event.priority,
    } : undefined,
  }));
}

/**
 * Gets the default channels for an event type (for preview/UI).
 */
export function getDefaultChannelsForEvent(eventType: ActionEventType): NotificationChannel[] {
  return DEFAULT_CHANNEL_MAP[eventType] || ['in_app'];
}

/**
 * Gets the template slug for an event type.
 */
export function getTemplateSlugForEvent(eventType: ActionEventType): string {
  return DEFAULT_TEMPLATE_MAP[eventType] || eventType.replace('.', '_');
}
