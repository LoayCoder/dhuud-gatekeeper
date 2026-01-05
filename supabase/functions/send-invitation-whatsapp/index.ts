import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWaSenderTextMessage } from "../_shared/wasender-whatsapp.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  invitation_id: string;
  phone_number: string;
  code: string;
  tenant_name: string;
  expires_at: string;
  full_name?: string;
  invite_url?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: RequestBody = await req.json();
    const { invitation_id, phone_number, code, tenant_name, expires_at, full_name, invite_url } = body;

    console.log('[send-invitation-whatsapp] Request received:', {
      invitation_id,
      phone_number,
      tenant_name,
      full_name,
    });

    // Validate required fields
    if (!invitation_id || !phone_number || !code || !tenant_name) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: invitation_id, phone_number, code, tenant_name' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format expiry date
    const expiryDate = new Date(expires_at);
    const formattedExpiryAr = expiryDate.toLocaleDateString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedExpiryEn = expiryDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Build bilingual message
    const name = full_name || '';
    const url = invite_url || 'https://dhuud.com';
    
    const message = `مرحباً${name ? ` ${name}` : ''}! 🎉

تمت دعوتك للانضمام إلى ${tenant_name} على منصة ضود للسلامة والصحة المهنية.

🔐 رمز الدعوة: *${code}*

📱 رابط التسجيل:
${url}

⏰ تنتهي صلاحية الدعوة: ${formattedExpiryAr}

---

Hello${name ? ` ${name}` : ''}! 🎉

You've been invited to join ${tenant_name} on Dhuud HSSE Platform.

🔐 Invitation Code: *${code}*

📱 Registration Link:
${url}

⏰ Expires: ${formattedExpiryEn}`;

    // Send WhatsApp message
    console.log('[send-invitation-whatsapp] Sending WhatsApp message...');
    const result = await sendWaSenderTextMessage(phone_number, message);

    if (!result.success) {
      console.error('[send-invitation-whatsapp] WhatsApp send failed:', result.error);
      
      // Update invitation with error
      await supabase
        .from('invitations')
        .update({
          delivery_status: 'failed',
          last_send_error: result.error,
        })
        .eq('id', invitation_id);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.error || 'Failed to send WhatsApp message' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[send-invitation-whatsapp] WhatsApp message sent successfully:', result.messageId);

    // Update invitation with success
    await supabase
      .from('invitations')
      .update({
        delivery_status: 'sent',
        whatsapp_sent_at: new Date().toISOString(),
        last_send_error: null,
      })
      .eq('id', invitation_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.messageId 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-invitation-whatsapp] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
