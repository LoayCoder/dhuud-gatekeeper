import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logNotificationSent } from "../_shared/notification-logger.ts";
import { sendWhatsAppText, getActiveProvider, isProviderConfigured } from "../_shared/whatsapp-provider.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone_number, message, tenant_id } = await req.json();

    if (!phone_number) {
      throw new Error('Phone number is required');
    }

    // Check provider configuration
    const providerStatus = isProviderConfigured();
    if (!providerStatus.configured) {
      throw new Error(`${providerStatus.provider} credentials not configured. Missing: ${providerStatus.missing.join(', ')}`);
    }

    const activeProvider = getActiveProvider();
    console.log(`[Test WhatsApp] Using provider: ${activeProvider}`);
    console.log('Sending test WhatsApp message to:', phone_number);

    const testMessage = message || `🧪 Test Message from HSSA Platform\n\nThis is a test WhatsApp message sent at ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' })} (Riyadh Time).\n\nProvider: ${activeProvider.toUpperCase()}\n\nIf you received this message, your WhatsApp API is working correctly! ✅`;

    // Send via the active provider
    const result = await sendWhatsAppText(phone_number, testMessage);

    if (!result.success) {
      console.error(`${activeProvider} API error:`, result.error);
      throw new Error(result.error || 'Failed to send WhatsApp message');
    }

    console.log('WhatsApp message sent successfully:', result.messageId);

    // Log the notification to the notification_logs table
    if (tenant_id) {
      const logResult = await logNotificationSent({
        tenant_id: tenant_id,
        channel: 'whatsapp',
        provider: activeProvider,
        provider_message_id: result.messageId || 'sent',
        to_address: phone_number,
        template_name: 'test_message',
        subject: 'Test WhatsApp Message',
        status: 'sent',
        related_entity_type: 'test',
        metadata: {
          test_type: 'manual_test',
          message_preview: testMessage.substring(0, 100),
          provider: activeProvider,
        },
      });

      if (logResult.success) {
        console.log('Notification logged successfully:', logResult.logId);
      } else {
        console.warn('Failed to log notification:', logResult.error);
      }
    } else {
      console.log('No tenant_id provided, skipping notification logging');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message_id: result.messageId,
        provider: activeProvider,
        to: phone_number,
        logged: !!tenant_id,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error sending test WhatsApp:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        provider: getActiveProvider(),
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});