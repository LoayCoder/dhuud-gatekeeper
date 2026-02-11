/**
 * SEND WHATSAPP NOTIFICATION
 *
 * Generic WhatsApp message sender for the unified notification pipeline.
 * Accepts a pre-rendered message and phone number.
 * Logs delivery to notification_logs for audit trail.
 *
 * NOT for visitor/gate-specific scenarios (use send-gate-whatsapp for that).
 * NOT for template-based DB sends (use send-whatsapp-template for that).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendWhatsAppText } from '../_shared/whatsapp-provider.ts';
import { logNotificationSent } from '../_shared/notification-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendWhatsAppRequest {
  to: string;
  message: string;
  tenant_id: string;
  event_type?: string;
  entity_type?: string;
  entity_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: SendWhatsAppRequest = await req.json();
    const { to, message, tenant_id, event_type, entity_type, entity_id } = body;

    if (!to || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'to and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SendWhatsApp] Sending to ${to}, event: ${event_type || 'unknown'}`);

    const result = await sendWhatsAppText(to, message);

    // Log to notification_logs for audit
    if (tenant_id && result.messageId) {
      await logNotificationSent({
        tenant_id,
        channel: 'whatsapp',
        provider: result.provider === 'wasender' ? 'wasender' : 'twilio',
        provider_message_id: result.messageId,
        to_address: to,
        template_name: event_type || 'pipeline_whatsapp',
        status: result.success ? 'sent' : 'failed',
        related_entity_type: entity_type,
        related_entity_id: entity_id,
        metadata: {
          source: 'unified_pipeline',
          event_type,
          message_length: message.length,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: result.success,
        messageId: result.messageId,
        provider: result.provider,
        error: result.error,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SendWhatsApp] Error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
