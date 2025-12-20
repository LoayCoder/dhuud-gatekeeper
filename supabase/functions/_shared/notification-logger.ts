/**
 * Shared utility for logging notifications to the notification_logs table
 * Supports WhatsApp, Email, and SMS (future) channels
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type NotificationChannel = 'whatsapp' | 'email' | 'sms';
export type NotificationProvider = 'twilio' | 'resend' | 'twilio_sms';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'bounced' | 'complained';

export interface NotificationLogEntry {
  tenant_id: string;
  user_id?: string;
  channel: NotificationChannel;
  provider: NotificationProvider;
  provider_message_id: string;
  to_address: string;
  from_address?: string;
  template_name?: string;
  subject?: string;
  status?: NotificationStatus;
  related_entity_type?: string;
  related_entity_id?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationLogResult {
  success: boolean;
  logId?: string;
  error?: string;
}

/**
 * Log a notification that was sent
 */
export async function logNotificationSent(
  entry: NotificationLogEntry
): Promise<NotificationLogResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data, error } = await supabase
      .from('notification_logs')
      .insert({
        tenant_id: entry.tenant_id,
        user_id: entry.user_id || null,
        channel: entry.channel,
        provider: entry.provider,
        provider_message_id: entry.provider_message_id,
        to_address: entry.to_address,
        from_address: entry.from_address || null,
        template_name: entry.template_name || null,
        subject: entry.subject || null,
        status: entry.status || 'pending',
        is_final: false,
        related_entity_type: entry.related_entity_type || null,
        related_entity_id: entry.related_entity_id || null,
        metadata: entry.metadata || {},
        sent_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('[NotificationLogger] Failed to log notification:', error);
      return { success: false, error: error.message };
    }

    console.log(`[NotificationLogger] Logged ${entry.channel} notification via ${entry.provider}: ${data.id}`);
    return { success: true, logId: data.id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[NotificationLogger] Error:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Update notification status from webhook callback
 */
export async function updateNotificationStatus(
  providerMessageId: string,
  status: NotificationStatus,
  errorCode?: string,
  errorMessage?: string
): Promise<NotificationLogResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const FINAL_STATUSES: NotificationStatus[] = ['delivered', 'read', 'failed', 'bounced', 'complained'];
  const isFinal = FINAL_STATUSES.includes(status);

  try {
    // Build update object
    const updateData: Record<string, unknown> = {
      status,
      is_final: isFinal,
      updated_at: new Date().toISOString(),
    };

    // Add timestamp based on status
    switch (status) {
      case 'delivered':
        updateData.delivered_at = new Date().toISOString();
        break;
      case 'read':
        updateData.read_at = new Date().toISOString();
        break;
      case 'failed':
      case 'bounced':
      case 'complained':
        updateData.failed_at = new Date().toISOString();
        if (errorCode) updateData.error_code = errorCode;
        if (errorMessage) updateData.error_message = errorMessage;
        break;
    }

    const { data, error } = await supabase
      .from('notification_logs')
      .update(updateData)
      .eq('provider_message_id', providerMessageId)
      .select('id')
      .single();

    if (error) {
      // May not find record if it was sent before logging was implemented
      if (error.code === 'PGRST116') {
        console.warn(`[NotificationLogger] No record found for message ID: ${providerMessageId}`);
        return { success: false, error: 'Record not found' };
      }
      console.error('[NotificationLogger] Failed to update status:', error);
      return { success: false, error: error.message };
    }

    console.log(`[NotificationLogger] Updated status to ${status} for: ${data.id}`);
    return { success: true, logId: data.id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[NotificationLogger] Error updating status:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Log a webhook request for audit purposes
 */
export async function logWebhookRequest(
  endpoint: string,
  provider: string,
  requestBody: unknown,
  requestHeaders: Record<string, string>,
  responseStatus: number,
  processingResult: string,
  ipAddress?: string,
  errorMessage?: string
): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Sanitize headers (remove sensitive auth headers)
    const sanitizedHeaders = { ...requestHeaders };
    delete sanitizedHeaders['authorization'];
    delete sanitizedHeaders['x-twilio-signature'];

    await supabase
      .from('webhook_request_logs')
      .insert({
        endpoint,
        provider,
        request_body: requestBody,
        request_headers: sanitizedHeaders,
        response_status: responseStatus,
        processing_result: processingResult,
        ip_address: ipAddress || null,
        error_message: errorMessage || null,
      });

    console.log(`[WebhookLogger] Logged ${provider} webhook request: ${processingResult}`);
  } catch (error) {
    // Don't throw - logging failures shouldn't break the webhook
    console.error('[WebhookLogger] Failed to log webhook:', error);
  }
}
