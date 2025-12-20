import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

/**
 * Detect the webhook provider from the request
 */
function detectProvider(contentType: string, body: string): 'twilio' | 'resend' | 'unknown' {
  // Twilio sends form-urlencoded data
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return 'twilio';
  }
  
  // Resend sends JSON with a "type" field
  if (contentType.includes('application/json')) {
    try {
      const parsed = JSON.parse(body);
      if (parsed.type && parsed.type.startsWith('email.')) {
        return 'resend';
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
    } else {
      const resendPayload: ResendWebhookPayload = JSON.parse(body);
      parsedBody = resendPayload;
      result = await processResendCallback(resendPayload);
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
