/**
 * UNIFIED NOTIFICATION PIPELINE
 *
 * The SINGLE entry point for all notifications across the platform.
 * All modules MUST use this pipeline instead of directly calling
 * supabase.from('notifications').insert() or invoking edge functions.
 *
 * Pipeline Flow:
 * ┌──────────────┐
 * │ ActionEvent  │  (module fires event)
 * └──────┬───────┘
 *        ▼
 * ┌──────────────┐
 * │ Idempotency  │  (check for duplicates)
 * └──────┬───────┘
 *        ▼
 * ┌──────────────┐
 * │   Mapper     │  (event → channels + templates + recipients)
 * └──────┬───────┘
 *        ▼
 * ┌──────────────┐
 * │ Preferences  │  (filter by user opt-out)
 * └──────┬───────┘
 *        ▼
 * ┌──────────────┐
 * │  Template    │  (resolve + render templates)
 * │  Registry    │
 * └──────┬───────┘
 *        ▼
 * ┌──────────────┐
 * │  Fan-Out     │  (dispatch to each channel in parallel)
 * │  Delivery    │
 * └──────┬───────┘
 *        ▼
 * ┌──────────────┐
 * │  Audit Log   │  (log entire lifecycle)
 * └──────────────┘
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import type {
  ActionEvent,
  NotificationChannel,
  DeliveryResult,
  PipelineResult,
  NotificationAuditEntry,
  NotificationRecipient,
} from './types';
import { EVENT_TO_PREFERENCE } from './types';
import { mapActionEventToDeliveries } from './action-event-mapper';
import { resolveTemplate, renderTemplateForChannel } from './template-registry';
import { isDuplicateEvent, markEventProcessed, generateEventId } from './idempotency';

const log = logger.scoped('NotificationPipeline');

// ============================================================================
// MAIN PIPELINE FUNCTION
// ============================================================================

/**
 * Process a single action event through the notification pipeline.
 * This is the ONLY function modules should call to trigger notifications.
 */
export async function processActionEvent(event: ActionEvent): Promise<PipelineResult> {
  const startTime = Date.now();

  // Ensure event has an ID
  if (!event.eventId) {
    event.eventId = generateEventId(
      event.eventType,
      event.tenantId,
      event.source.entityId,
      event.timestamp
    );
  }

  log.info(`Processing event: ${event.eventType} [${event.eventId}]`);

  // Step 1: Idempotency check
  if (isDuplicateEvent(event.eventId)) {
    log.info(`Skipped duplicate event: ${event.eventId}`);
    return {
      eventId: event.eventId,
      eventType: event.eventType,
      deliveries: [],
      deduplicated: true,
    };
  }

  // Step 2: Map event to delivery configs
  const deliveryConfigs = mapActionEventToDeliveries(event);

  // Step 3: Fan out to channels in parallel
  const deliveryPromises = deliveryConfigs.map(async (config) => {
    const results: DeliveryResult[] = [];

    // Filter recipients by user preferences
    const eligibleRecipients = await filterByPreferences(
      config.recipients,
      config.channel,
      event.eventType
    );

    if (eligibleRecipients.length === 0 && config.recipients.length > 0) {
      log.debug(`All recipients opted out of ${config.channel} for ${event.eventType}`);
      return results;
    }

    // Resolve and render template
    const template = resolveTemplate(config.templateSlug);
    if (!template) {
      log.warn(`No template found for slug: ${config.templateSlug}, using event type as fallback`);
    }

    // Deliver based on channel
    try {
      switch (config.channel) {
        case 'in_app':
          results.push(...await deliverInApp(event, eligibleRecipients, template, config));
          break;
        case 'push':
          results.push(...await deliverPush(event, eligibleRecipients, template, config));
          break;
        case 'email':
          results.push(...await deliverEmail(event, eligibleRecipients, template, config));
          break;
        case 'whatsapp':
          results.push(...await deliverWhatsApp(event, eligibleRecipients, template, config));
          break;
      }
    } catch (error) {
      log.error(`Channel ${config.channel} delivery failed:`, error);
      // Record failure for each recipient
      for (const recipient of eligibleRecipients) {
        results.push({
          channel: config.channel,
          recipientId: recipient.userId,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      }
    }

    return results;
  });

  const allResults = (await Promise.all(deliveryPromises)).flat();

  // Step 4: Mark event as processed for idempotency
  markEventProcessed(event.eventId);

  // Step 5: Write audit log
  const pipelineResult: PipelineResult = {
    eventId: event.eventId,
    eventType: event.eventType,
    deliveries: allResults,
    deduplicated: false,
  };

  const endTime = Date.now();
  await writeAuditLog(event, allResults, endTime - startTime);

  log.info(
    `Pipeline complete: ${event.eventType} — ` +
    `${allResults.filter(r => r.status === 'sent').length} sent, ` +
    `${allResults.filter(r => r.status === 'failed').length} failed, ` +
    `${allResults.filter(r => r.status === 'skipped').length} skipped ` +
    `(${endTime - startTime}ms)`
  );

  return pipelineResult;
}

// ============================================================================
// CHANNEL-SPECIFIC DELIVERY
// ============================================================================

/**
 * In-app notification — writes to `notifications` table.
 */
async function deliverInApp(
  event: ActionEvent,
  recipients: NotificationRecipient[],
  template: ReturnType<typeof resolveTemplate>,
  config: { relatedEntityType?: string; relatedEntityId?: string }
): Promise<DeliveryResult[]> {
  const results: DeliveryResult[] = [];

  // If no explicit recipients, use actorId context (for self-notifications)
  const targetRecipients = recipients.length > 0 ? recipients : [];

  for (const recipient of targetRecipients) {
    try {
      const lang = recipient.language || 'en';
      let title = event.eventType;
      let body: string | undefined;
      let titleAr: string | undefined;
      let bodyAr: string | undefined;

      if (template) {
        const rendered = renderTemplateForChannel(template, 'in_app', event.variables, lang);
        if (rendered) {
          title = rendered.title || title;
          body = rendered.body;
        }
        // Also render Arabic version
        const renderedAr = renderTemplateForChannel(template, 'in_app', event.variables, 'ar');
        if (renderedAr) {
          titleAr = renderedAr.title;
          bodyAr = renderedAr.body;
        }
      }

      const { error } = await supabase
        .from('notifications')
        .insert({
          tenant_id: event.tenantId,
          user_id: recipient.userId,
          title,
          title_ar: titleAr,
          body,
          body_ar: bodyAr,
          type: event.eventType,
          related_entity_type: config.relatedEntityType || event.source.entityType,
          related_entity_id: config.relatedEntityId || event.source.entityId,
          is_read: false,
        });

      results.push({
        channel: 'in_app',
        recipientId: recipient.userId,
        status: error ? 'failed' : 'sent',
        error: error?.message,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      results.push({
        channel: 'in_app',
        recipientId: recipient.userId,
        status: 'failed',
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  return results;
}

/**
 * Push notification — invokes the send-push-notification edge function.
 */
async function deliverPush(
  event: ActionEvent,
  recipients: NotificationRecipient[],
  template: ReturnType<typeof resolveTemplate>,
  config: { pushData?: Record<string, unknown> }
): Promise<DeliveryResult[]> {
  if (recipients.length === 0) return [];

  let title = event.eventType;
  let body = '';

  if (template) {
    const rendered = renderTemplateForChannel(template, 'push', event.variables);
    if (rendered) {
      title = rendered.title || title;
      body = rendered.body || '';
    }
  }

  const userIds = recipients.map(r => r.userId);

  try {
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        user_ids: userIds,
        payload: {
          title,
          body,
          data: {
            ...(config.pushData || {}),
            eventId: event.eventId,
            url: buildActionUrl(event),
          },
          tag: `${event.eventType}-${event.source.entityId}`,
        },
        notification_type: event.eventType.split('.')[0],
      },
    });

    return recipients.map(r => ({
      channel: 'push' as NotificationChannel,
      recipientId: r.userId,
      status: error ? 'failed' as const : 'sent' as const,
      error: error?.message,
      timestamp: new Date().toISOString(),
    }));
  } catch (err) {
    return recipients.map(r => ({
      channel: 'push' as NotificationChannel,
      recipientId: r.userId,
      status: 'failed' as const,
      error: err instanceof Error ? err.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }));
  }
}

/**
 * Email notification — invokes the send-email-template edge function.
 */
async function deliverEmail(
  event: ActionEvent,
  recipients: NotificationRecipient[],
  template: ReturnType<typeof resolveTemplate>,
  _config: { emailSubject?: string }
): Promise<DeliveryResult[]> {
  const results: DeliveryResult[] = [];

  for (const recipient of recipients) {
    if (!recipient.email) {
      results.push({
        channel: 'email',
        recipientId: recipient.userId,
        status: 'skipped',
        error: 'No email address',
        timestamp: new Date().toISOString(),
      });
      continue;
    }

    try {
      let subject = _config.emailSubject || event.eventType;
      let body = '';

      if (template) {
        const rendered = renderTemplateForChannel(template, 'email', event.variables, recipient.language);
        if (rendered) {
          subject = rendered.subject || subject;
          body = rendered.body || '';
        }
      }

      const { error } = await supabase.functions.invoke('send-email-template', {
        body: {
          to: recipient.email,
          subject,
          body,
          variables: event.variables,
          language: recipient.language || 'en',
          tenant_id: event.tenantId,
        },
      });

      results.push({
        channel: 'email',
        recipientId: recipient.userId,
        status: error ? 'failed' : 'sent',
        error: error?.message,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      results.push({
        channel: 'email',
        recipientId: recipient.userId,
        status: 'failed',
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  return results;
}

/**
 * WhatsApp notification — invokes the send-gate-whatsapp edge function.
 */
async function deliverWhatsApp(
  event: ActionEvent,
  recipients: NotificationRecipient[],
  template: ReturnType<typeof resolveTemplate>,
  _config: Record<string, unknown>
): Promise<DeliveryResult[]> {
  const results: DeliveryResult[] = [];

  for (const recipient of recipients) {
    if (!recipient.phone) {
      results.push({
        channel: 'whatsapp',
        recipientId: recipient.userId,
        status: 'skipped',
        error: 'No phone number',
        timestamp: new Date().toISOString(),
      });
      continue;
    }

    try {
      let message = '';

      if (template) {
        const rendered = renderTemplateForChannel(template, 'whatsapp', event.variables, recipient.language);
        if (rendered) {
          message = rendered.body || '';
        }
      }

      const { error } = await supabase.functions.invoke('send-gate-whatsapp', {
        body: {
          mobile_number: recipient.phone,
          message,
          tenant_id: event.tenantId,
          notification_type: event.eventType,
          variables: event.variables,
        },
      });

      results.push({
        channel: 'whatsapp',
        recipientId: recipient.userId,
        status: error ? 'failed' : 'sent',
        error: error?.message,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      results.push({
        channel: 'whatsapp',
        recipientId: recipient.userId,
        status: 'failed',
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  return results;
}

// ============================================================================
// PREFERENCE FILTERING
// ============================================================================

/**
 * Filters recipients based on their notification preferences.
 * Users who have opted out of a notification type are removed.
 */
async function filterByPreferences(
  recipients: NotificationRecipient[],
  channel: NotificationChannel,
  eventType: string
): Promise<NotificationRecipient[]> {
  if (recipients.length === 0) return recipients;

  const preferenceCategory = EVENT_TO_PREFERENCE[eventType as keyof typeof EVENT_TO_PREFERENCE];
  if (!preferenceCategory) {
    // No preference mapping = always deliver
    return recipients;
  }

  // For push notifications, check push_notification_preferences
  if (channel === 'push') {
    try {
      const userIds = recipients.map(r => r.userId);
      const { data: prefs } = await supabase
        .from('push_notification_preferences')
        .select(`user_id, ${preferenceCategory}`)
        .in('user_id', userIds);

      if (!prefs) return recipients;

      const optedOut = new Set(
        prefs
          .filter(p => p[preferenceCategory as keyof typeof p] === false)
          .map(p => p.user_id)
      );

      return recipients.filter(r => !optedOut.has(r.userId));
    } catch {
      return recipients; // On error, deliver anyway
    }
  }

  // For email, check email_notification_preferences
  if (channel === 'email') {
    try {
      const userIds = recipients.map(r => r.userId);
      const { data: prefs } = await supabase
        .from('email_notification_preferences')
        .select(`user_id, ${preferenceCategory}`)
        .in('user_id', userIds);

      if (!prefs) return recipients;

      const optedOut = new Set(
        prefs
          .filter(p => p[preferenceCategory as keyof typeof p] === false)
          .map(p => p.user_id)
      );

      return recipients.filter(r => !optedOut.has(r.userId));
    } catch {
      return recipients;
    }
  }

  // In-app and WhatsApp: no user-level opt-out currently
  return recipients;
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

async function writeAuditLog(
  event: ActionEvent,
  results: DeliveryResult[],
  durationMs: number
): Promise<void> {
  try {
    const channels = [...new Set(results.map(r => r.channel))];
    const entry: NotificationAuditEntry = {
      eventId: event.eventId,
      eventType: event.eventType,
      tenantId: event.tenantId,
      actorId: event.actorId,
      sourceEntityType: event.source.entityType,
      sourceEntityId: event.source.entityId,
      channels,
      recipientCount: results.length,
      deliveredCount: results.filter(r => r.status === 'sent' || r.status === 'delivered').length,
      failedCount: results.filter(r => r.status === 'failed').length,
      skippedCount: results.filter(r => r.status === 'skipped').length,
      deduplicatedCount: 0,
      pipelineStartedAt: event.timestamp,
      pipelineCompletedAt: new Date().toISOString(),
      durationMs,
      metadata: {
        priority: event.priority,
        referenceId: event.source.referenceId,
      },
    };

    // Log to notification_logs table for audit trail
    await supabase.from('notification_logs').insert({
      tenant_id: event.tenantId,
      user_id: event.actorId,
      channel: channels.join(','),
      template_name: event.eventType,
      status: results.some(r => r.status === 'failed') ? 'partial' : 'sent',
      is_final: true,
      to_address: `${results.length} recipients`,
      subject: `[Pipeline] ${event.eventType} — ${event.eventId}`,
    });

    log.debug('Audit log written for event:', event.eventId);
  } catch (error) {
    // Never fail the pipeline due to audit logging errors
    log.error('Failed to write audit log:', error);
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Builds a deep-link URL for the notification action.
 */
function buildActionUrl(event: ActionEvent): string {
  const { entityType, entityId } = event.source;

  const urlMap: Record<string, string> = {
    incident: `/incidents/${entityId}`,
    corrective_action: '/incidents/my-actions',
    gate_pass: '/my-gate-passes',
    inspection_session: '/inspections/sessions',
    finding: '/inspections/my-actions',
    contractor_company: '/contractors/companies',
    contractor_worker: '/contractors/workers',
    emergency_alert: `/security/emergency-alerts`,
    user: '/admin/users',
  };

  return urlMap[entityType] || '/action-center';
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Fire a notification event with minimal boilerplate.
 * Convenience wrapper around processActionEvent.
 */
export function createActionEvent(
  params: Omit<ActionEvent, 'eventId' | 'timestamp'>
): ActionEvent {
  return {
    ...params,
    eventId: generateEventId(
      params.eventType,
      params.tenantId,
      params.source.entityId
    ),
    timestamp: new Date().toISOString(),
  };
}
