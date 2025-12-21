import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  updateNotificationStatus, 
  logWebhookRequest,
  type NotificationStatus 
} from "../_shared/notification-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Status mapping from provider-specific to DHUUD unified statuses
const TWILIO_STATUS_MAP: Record<string, NotificationStatus> = {
  queued: 'pending',
  accepted: 'pending',
  sending: 'pending',
  sent: 'sent',
  delivered: 'delivered',
  read: 'read',
  failed: 'failed',
  undelivered: 'failed',
};

const RESEND_STATUS_MAP: Record<string, NotificationStatus> = {
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.delivery_delayed': 'pending',
};

// WAHA (WhatsApp HTTP API) status mapping
const WAHA_STATUS_MAP: Record<string, NotificationStatus> = {
  'sent': 'sent',
  'delivered': 'delivered',
  'read': 'read',
  'failed': 'failed',
  'error': 'failed',
};

// WaSender webhook status mapping
const WASENDER_STATUS_MAP: Record<string, NotificationStatus> = {
  'sent': 'sent',
  'delivered': 'delivered',
  'read': 'read',
  'failed': 'failed',
  'pending': 'pending',
  'queued': 'pending',
};

interface TwilioWebhookPayload {
  MessageSid: string;
  MessageStatus: string;
  ErrorCode?: string;
  ErrorMessage?: string;
  To?: string;
  From?: string;
}

interface ResendWebhookPayload {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from?: string;
    to?: string[];
    subject?: string;
  };
}

interface WahaWebhookPayload {
  event: string;
  session: string;
  payload?: {
    id?: string;
    from?: string;
    to?: string;
    timestamp?: number;
    ack?: number; // 0=pending, 1=sent, 2=delivered, 3=read
    ackName?: string;
    body?: string;
    hasMedia?: boolean;
    mediaUrl?: string;
    error?: string;
    _data?: {
      id?: {
        id?: string;
        _serialized?: string;
      };
    };
  };
  engine?: string;
  environment?: Record<string, unknown>;
}

// WaSender webhook payload structure
interface WaSenderWebhookPayload {
  messageId?: string;
  message_id?: string;
  id?: string;
  status?: string;
  event?: string;
  to?: string;
  phone?: string;
  recipient?: string;
  error?: string;
  errorMessage?: string;
  error_message?: string;
  timestamp?: string | number;
  data?: {
    messageId?: string;
    status?: string;
    error?: string;
  };
}

type WebhookProvider = 'twilio' | 'resend' | 'waha' | 'wasender' | 'unknown';

/**
 * Detect the webhook provider from the request
 */
function detectProvider(contentType: string, body: string): WebhookProvider {
  // Twilio sends form-urlencoded data
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return 'twilio';
  }
  
  // JSON-based providers: Resend, WAHA, and WaSender
  if (contentType.includes('application/json')) {
    try {
      const parsed = JSON.parse(body);
      
      // Resend has a "type" field starting with "email."
      if (parsed.type && parsed.type.startsWith('email.')) {
        return 'resend';
      }
      
      // WAHA has an "event" field and "session" field
      if (parsed.event && parsed.session) {
        return 'waha';
      }
      
      // WaSender detection - various possible structures
      // WaSender typically sends: messageId/message_id, status, and optionally phone/to/recipient
      if (
        (parsed.messageId || parsed.message_id || parsed.id) && 
        (parsed.status || parsed.event) &&
        !parsed.session // Exclude WAHA which also has event
      ) {
        return 'wasender';
      }
      
      // Also check for nested data structure from WaSender
      if (parsed.data && (parsed.data.messageId || parsed.data.status)) {
        return 'wasender';
      }
    } catch {
      // Not valid JSON
    }
  }
  
  return 'unknown';
}

/**
 * Parse Twilio form-urlencoded webhook data
 */
function parseTwilioPayload(body: string): TwilioWebhookPayload {
  const params = new URLSearchParams(body);
  return {
    MessageSid: params.get('MessageSid') || '',
    MessageStatus: params.get('MessageStatus') || '',
    ErrorCode: params.get('ErrorCode') || undefined,
    ErrorMessage: params.get('ErrorMessage') || undefined,
    To: params.get('To') || undefined,
    From: params.get('From') || undefined,
  };
}

/**
 * Append event to notification_logs webhook_events array
 */
async function appendWebhookEvent(
  providerMessageId: string,
  event: Record<string, unknown>
): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const eventWithTimestamp = {
      ...event,
      received_at: new Date().toISOString(),
    };

    await supabase.rpc('append_notification_webhook_event', {
      p_provider_message_id: providerMessageId,
      p_event: eventWithTimestamp,
    });

    console.log(`[Webhook] Appended event for message: ${providerMessageId}`);
  } catch (error) {
    console.error(`[Webhook] Failed to append event:`, error);
  }
}

/**
 * Process Twilio WhatsApp/SMS status callback
 */
async function processTwilioCallback(payload: TwilioWebhookPayload): Promise<{ success: boolean; message: string }> {
  const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = payload;

  if (!MessageSid || !MessageStatus) {
    return { success: false, message: 'Missing MessageSid or MessageStatus' };
  }

  const dhuudStatus = TWILIO_STATUS_MAP[MessageStatus.toLowerCase()];
  if (!dhuudStatus) {
    console.warn(`[Webhook] Unknown Twilio status: ${MessageStatus}`);
    return { success: true, message: `Unknown status ignored: ${MessageStatus}` };
  }

  console.log(`[Webhook] Processing Twilio callback: ${MessageSid} -> ${dhuudStatus}`);

  // Append event to history
  await appendWebhookEvent(MessageSid, {
    provider: 'twilio',
    event_type: MessageStatus,
    status: dhuudStatus,
    error_code: ErrorCode,
    error_message: ErrorMessage,
    raw_payload: payload,
  });

  const result = await updateNotificationStatus(
    MessageSid,
    dhuudStatus,
    ErrorCode,
    ErrorMessage
  );

  return {
    success: result.success,
    message: result.success 
      ? `Updated status to ${dhuudStatus}` 
      : result.error || 'Update failed'
  };
}

/**
 * Process Resend email status webhook
 */
async function processResendCallback(payload: ResendWebhookPayload): Promise<{ success: boolean; message: string }> {
  const { type, data } = payload;

  if (!type || !data?.email_id) {
    return { success: false, message: 'Missing type or email_id' };
  }

  const dhuudStatus = RESEND_STATUS_MAP[type];
  if (!dhuudStatus) {
    console.warn(`[Webhook] Unknown Resend event type: ${type}`);
    return { success: true, message: `Unknown event type ignored: ${type}` };
  }

  console.log(`[Webhook] Processing Resend callback: ${data.email_id} -> ${dhuudStatus}`);

  // Append event to history
  await appendWebhookEvent(data.email_id, {
    provider: 'resend',
    event_type: type,
    status: dhuudStatus,
    raw_payload: payload,
  });

  const result = await updateNotificationStatus(
    data.email_id,
    dhuudStatus
  );

  return {
    success: result.success,
    message: result.success 
      ? `Updated status to ${dhuudStatus}` 
      : result.error || 'Update failed'
  };
}

/**
 * Process WAHA (WhatsApp HTTP API) webhook
 */
async function processWahaCallback(payload: WahaWebhookPayload): Promise<{ success: boolean; message: string }> {
  const { event, session, payload: messagePayload } = payload;

  if (!event) {
    return { success: false, message: 'Missing event type' };
  }

  console.log(`[Webhook] Processing WAHA event: ${event} (session: ${session})`);

  // Get message ID from various possible locations
  const messageId = messagePayload?.id || 
                    messagePayload?._data?.id?.id || 
                    messagePayload?._data?.id?._serialized;

  // Handle different WAHA events
  switch (event) {
    case 'message.ack': {
      // ACK events indicate delivery status
      const ack = messagePayload?.ack;
      const ackName = messagePayload?.ackName;
      
      let dhuudStatus: NotificationStatus | null = null;
      
      if (ack === 1 || ackName === 'sent') {
        dhuudStatus = 'sent';
      } else if (ack === 2 || ackName === 'delivered') {
        dhuudStatus = 'delivered';
      } else if (ack === 3 || ackName === 'read') {
        dhuudStatus = 'read';
      } else if (ack === -1 || ackName === 'error') {
        dhuudStatus = 'failed';
      }

      if (dhuudStatus && messageId) {
        // Append event to history
        await appendWebhookEvent(messageId, {
          provider: 'waha',
          event_type: event,
          ack,
          ack_name: ackName,
          status: dhuudStatus,
          raw_payload: payload,
        });

        const result = await updateNotificationStatus(messageId, dhuudStatus);
        return {
          success: result.success,
          message: result.success 
            ? `Updated status to ${dhuudStatus}` 
            : result.error || 'Update failed'
        };
      }

      return { success: true, message: `ACK event processed (ack: ${ack})` };
    }

    case 'message': 
    case 'message.any': {
      // Log incoming messages but don't update status
      if (messageId) {
        await appendWebhookEvent(messageId, {
          provider: 'waha',
          event_type: event,
          from: messagePayload?.from,
          to: messagePayload?.to,
          body: messagePayload?.body?.substring(0, 100), // Truncate for privacy
          raw_payload: payload,
        });
      }
      return { success: true, message: 'Message event logged' };
    }

    case 'session.status': {
      // Log session status changes
      console.log(`[Webhook] WAHA session status: ${JSON.stringify(payload)}`);
      return { success: true, message: 'Session status logged' };
    }

    case 'message.waiting': {
      // Message queued
      if (messageId) {
        await appendWebhookEvent(messageId, {
          provider: 'waha',
          event_type: event,
          status: 'pending',
          raw_payload: payload,
        });
        await updateNotificationStatus(messageId, 'pending');
      }
      return { success: true, message: 'Message waiting event logged' };
    }

    case 'message.failed': {
      // Message failed
      const errorMessage = messagePayload?.error || 'Unknown error';
      if (messageId) {
        await appendWebhookEvent(messageId, {
          provider: 'waha',
          event_type: event,
          status: 'failed',
          error: errorMessage,
          raw_payload: payload,
        });
        await updateNotificationStatus(messageId, 'failed', undefined, errorMessage);
      }
      return { success: true, message: 'Message failed event processed' };
    }

    default: {
      // Log unknown events for debugging
      console.log(`[Webhook] Unknown WAHA event type: ${event}`);
      return { success: true, message: `Unknown event type logged: ${event}` };
    }
  }
}

/**
 * Process WaSender webhook callback
 */
async function processWaSenderCallback(payload: WaSenderWebhookPayload): Promise<{ success: boolean; message: string }> {
  // Extract message ID from various possible fields
  const messageId = payload.messageId || 
                    payload.message_id || 
                    payload.id || 
                    payload.data?.messageId;

  // Extract status from various possible fields
  const status = payload.status || 
                 payload.event || 
                 payload.data?.status;

  // Extract error message if present
  const errorMessage = payload.error || 
                       payload.errorMessage || 
                       payload.error_message || 
                       payload.data?.error;

  console.log(`[Webhook] Processing WaSender callback: messageId=${messageId}, status=${status}`);

  if (!messageId) {
    console.warn('[Webhook] WaSender payload missing message ID');
    return { success: false, message: 'Missing message ID in WaSender payload' };
  }

  if (!status) {
    console.warn('[Webhook] WaSender payload missing status');
    return { success: false, message: 'Missing status in WaSender payload' };
  }

  // Map WaSender status to unified status
  const normalizedStatus = status.toLowerCase();
  const dhuudStatus = WASENDER_STATUS_MAP[normalizedStatus];

  if (!dhuudStatus) {
    console.warn(`[Webhook] Unknown WaSender status: ${status}`);
    // Still log the event even if we don't recognize the status
    await appendWebhookEvent(messageId, {
      provider: 'wasender',
      event_type: status,
      status: 'unknown',
      raw_payload: payload,
    });
    return { success: true, message: `Unknown status logged: ${status}` };
  }

  console.log(`[Webhook] WaSender status mapped: ${status} -> ${dhuudStatus}`);

  // Append event to webhook history
  await appendWebhookEvent(messageId, {
    provider: 'wasender',
    event_type: status,
    status: dhuudStatus,
    error: errorMessage,
    raw_payload: payload,
  });

  // Update notification status
  const result = await updateNotificationStatus(
    messageId,
    dhuudStatus,
    undefined,
    errorMessage
  );

  return {
    success: result.success,
    message: result.success 
      ? `Updated status to ${dhuudStatus}` 
      : result.error || 'Update failed'
  };
}

serve(async (req) => {
  // Only accept POST requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const contentType = req.headers.get('content-type') || '';
  const body = await req.text();
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';

  // Convert headers to object for logging
  const headersObj: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headersObj[key] = value;
  });

  // Detect provider
  const provider = detectProvider(contentType, body);
  console.log(`[Webhook] Received ${provider} callback`);

  if (provider === 'unknown') {
    await logWebhookRequest(
      '/webhook-notification-status',
      'unknown',
      body,
      headersObj,
      400,
      'unknown_provider',
      ipAddress,
      'Could not identify webhook provider'
    );

    return new Response(
      JSON.stringify({ error: 'Unknown webhook provider' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let result: { success: boolean; message: string };
  let parsedBody: unknown;

  try {
    if (provider === 'twilio') {
      const twilioPayload = parseTwilioPayload(body);
      parsedBody = twilioPayload;
      result = await processTwilioCallback(twilioPayload);
    } else if (provider === 'resend') {
      const resendPayload: ResendWebhookPayload = JSON.parse(body);
      parsedBody = resendPayload;
      result = await processResendCallback(resendPayload);
    } else if (provider === 'waha') {
      const wahaPayload: WahaWebhookPayload = JSON.parse(body);
      parsedBody = wahaPayload;
      result = await processWahaCallback(wahaPayload);
    } else if (provider === 'wasender') {
      const wasenderPayload: WaSenderWebhookPayload = JSON.parse(body);
      parsedBody = wasenderPayload;
      result = await processWaSenderCallback(wasenderPayload);
    } else {
      result = { success: false, message: 'Unknown provider' };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Webhook] Processing error:`, errorMessage);

    await logWebhookRequest(
      '/webhook-notification-status',
      provider,
      body,
      headersObj,
      500,
      'processing_error',
      ipAddress,
      errorMessage
    );

    return new Response(
      JSON.stringify({ error: 'Processing failed', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Log the webhook request
  await logWebhookRequest(
    '/webhook-notification-status',
    provider,
    parsedBody,
    headersObj,
    result.success ? 200 : 422,
    result.success ? 'success' : 'update_failed',
    ipAddress,
    result.success ? undefined : result.message
  );

  // Always return 200 to acknowledge receipt (even if update failed)
  // This prevents providers from retrying unnecessarily
  return new Response(
    JSON.stringify({ 
      success: true, 
      provider,
      processed: result.success,
      message: result.message 
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
