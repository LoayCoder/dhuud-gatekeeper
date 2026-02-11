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
import { normalizePhoneE164, type PhoneNormalizationOptions } from './phone-utils';

const log = logger.scope('NotificationPipeline');

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
          results.push(...await deliverWhatsApp(event, eligibleRecipients, template, config as unknown as Record<string, unknown>));
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
  const targetRecipients = recipients.length > 0 ? recipients : [];
  if (targetRecipients.length === 0) return [];

  // Build all notification rows up-front for a single bulk insert
  const notificationsToInsert = targetRecipients.map(recipient => {
    const lang = recipient.language || 'en';
    let title: string = String(event.eventType);
    let body: string | undefined;
    let titleAr: string | undefined;
    let bodyAr: string | undefined;

    if (template) {
      const rendered = renderTemplateForChannel(template, 'in_app', event.variables, lang);
      if (rendered) {
        title = rendered.title || title;
        body = rendered.body;
      }
      const renderedAr = renderTemplateForChannel(template, 'in_app', event.variables, 'ar');
      if (renderedAr) {
        titleAr = renderedAr.title;
        bodyAr = renderedAr.body;
      }
    }

    // Return notification row for bulk insert
    return {
      tenant_id: event.tenantId,
      user_id: recipient.userId,
      title,
      title_ar: titleAr,
      body,
      body_ar: bodyAr,
      type: event.eventType as string,
      related_entity_type: config.relatedEntityType || event.source.entityType,
      related_entity_id: config.relatedEntityId || event.source.entityId,
      is_read: false,
    };
  });

  try {
    const { error } = await supabase.from('notifications').insert(notificationsToInsert);
    const timestamp = new Date().toISOString();
    return targetRecipients.map(recipient => ({
      channel: 'in_app' as NotificationChannel,
      recipientId: recipient.userId,
      status: error ? 'failed' as const : 'sent' as const,
      error: error?.message,
      timestamp,
    }));
  } catch (err) {
    const timestamp = new Date().toISOString();
    return targetRecipients.map(recipient => ({
      channel: 'in_app' as NotificationChannel,
      recipientId: recipient.userId,
      status: 'failed' as const,
      error: err instanceof Error ? err.message : 'Unknown error',
      timestamp,
    }));
  }
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

  let title: string = String(event.eventType);
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
  if (recipients.length === 0) return [];

  // Separate recipients with and without email addresses
  const skipped: DeliveryResult[] = [];
  const toSend: NotificationRecipient[] = [];

  for (const r of recipients) {
    if (!r.email) {
      skipped.push({
        channel: 'email',
        recipientId: r.userId,
        status: 'skipped',
        error: 'No email address',
        timestamp: new Date().toISOString(),
      });
    } else {
      toSend.push(r);
    }
  }

  if (toSend.length === 0) return skipped;

  // Fire all edge-function invocations concurrently instead of sequentially
  const deliveryResults = await Promise.all(
    toSend.map(async (recipient): Promise<DeliveryResult> => {
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

        return {
          channel: 'email',
          recipientId: recipient.userId,
          status: error ? 'failed' : 'sent',
          error: error?.message,
          timestamp: new Date().toISOString(),
        };
      } catch (err) {
        return {
          channel: 'email',
          recipientId: recipient.userId,
          status: 'failed',
          error: err instanceof Error ? err.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        };
      }
    })
  );

  return [...skipped, ...deliveryResults];
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
  if (recipients.length === 0) return [];

  // Separate recipients with and without phone numbers
  const skipped: DeliveryResult[] = [];
  const toSend: NotificationRecipient[] = [];

  // Use tenant's default country code for local number normalization
  const phoneOptions: PhoneNormalizationOptions = {
    defaultCountryCode: event.metadata?.defaultPhoneCountryCode as string | undefined,
  };

  for (const r of recipients) {
    if (!r.phone) {
      skipped.push({
        channel: 'whatsapp',
        recipientId: r.userId,
        status: 'skipped',
        error: 'No phone number',
        timestamp: new Date().toISOString(),
      });
    } else {
      // Normalize phone number to E.164 using tenant's default country code
      const normalizedPhone = normalizePhoneE164(r.phone, phoneOptions);
      if (!normalizedPhone) {
        skipped.push({
          channel: 'whatsapp',
          recipientId: r.userId,
          status: 'skipped',
          error: `Invalid phone number format: ${r.phone}`,
          timestamp: new Date().toISOString(),
        });
      } else {
        toSend.push({ ...r, phone: normalizedPhone });
      }
    }
  }

  if (toSend.length === 0) return skipped;

  // Fire all edge-function invocations concurrently instead of sequentially
  const deliveryResults = await Promise.all(
    toSend.map(async (recipient): Promise<DeliveryResult> => {
      try {
        let message = '';

        if (template) {
          const rendered = renderTemplateForChannel(template, 'whatsapp', event.variables, recipient.language);
          if (rendered) {
            message = rendered.body || '';
          }
        }

        const { error } = await supabase.functions.invoke('send-whatsapp-notification', {
          body: {
            to: recipient.phone,
            message,
            tenant_id: event.tenantId,
            event_type: event.eventType,
            entity_type: event.source.entityType,
            entity_id: event.source.entityId,
          },
        });

        return {
          channel: 'whatsapp',
          recipientId: recipient.userId,
          status: error ? 'failed' : 'sent',
          error: error?.message,
          timestamp: new Date().toISOString(),
        };
      } catch (err) {
        return {
          channel: 'whatsapp',
          recipientId: recipient.userId,
          status: 'failed',
          error: err instanceof Error ? err.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        };
      }
    })
  );

  return [...skipped, ...deliveryResults];
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: prefs } = await (supabase as any)
        .from('push_notification_preferences')
        .select(`user_id, ${preferenceCategory}`)
        .in('user_id', userIds);

      if (!prefs) return recipients;

      const optedOut = new Set(
        (prefs as Array<Record<string, unknown>>)
          .filter(p => p[preferenceCategory] === false)
          .map(p => p.user_id as string)
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: prefs } = await (supabase as any)
        .from('email_notification_preferences')
        .select(`user_id, ${preferenceCategory}`)
        .in('user_id', userIds);

      if (!prefs) return recipients;

      const optedOut = new Set(
        (prefs as Array<Record<string, unknown>>)
          .filter(p => p[preferenceCategory] === false)
          .map(p => p.user_id as string)
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
    // Write per-delivery log entries (not a single summary)
    // This allows querying per channel, per recipient, per status
    const logEntries = results
      .filter(r => r.status !== 'skipped')
      .map(r => ({
        tenant_id: event.tenantId,
        user_id: r.recipientId,
        channel: r.channel,
        template_name: event.eventType,
        status: r.status === 'sent' ? 'sent' : 'failed',
        is_final: r.status === 'failed',
        to_address: r.recipientId,
        subject: `[Pipeline] ${event.eventType}`,
        related_entity_type: event.source.entityType,
        related_entity_id: event.source.entityId,
        idempotency_key: `${event.eventId}:${r.channel}:${r.recipientId}`,
        error_message: r.error || null,
        metadata: {
          event_id: event.eventId,
          priority: event.priority,
          reference_id: event.source.referenceId,
          duration_ms: durationMs,
          actor_id: event.actorId,
        },
      }));

    if (logEntries.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('notification_logs').upsert(
        logEntries,
        { onConflict: 'idempotency_key', ignoreDuplicates: true }
      );
      if (error) {
        log.warn('Audit log upsert partial failure:', error.message);
      }
    }

    // Log skipped count for debugging
    const skippedCount = results.filter(r => r.status === 'skipped').length;
    if (skippedCount > 0) {
      log.debug(`Skipped ${skippedCount} deliveries for event ${event.eventId}`);
    }

    log.debug('Audit log written for event:', event.eventId, `(${logEntries.length} entries)`);
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
