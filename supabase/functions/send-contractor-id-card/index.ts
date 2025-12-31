import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendIdCardRequest {
  company_id: string;
  tenant_id: string;
  person_type: 'site_rep' | 'safety_officer';
  safety_officer_id?: string;
  person_name: string;
  person_phone: string;
  person_email?: string;
  company_name: string;
  contract_end_date?: string;
}

// Generate a unique QR token
function generateQRToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = 'CTR-';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Format phone number to E.164 format WITH + prefix
 * WaSender expects format like: +966501234567
 */
function formatPhoneNumber(phone: string): string {
  // Remove any whatsapp: prefix
  let cleaned = phone.replace(/^whatsapp:/, '');
  
  // Remove spaces, dashes, parentheses
  cleaned = cleaned.replace(/[\s\-\(\)]/g, '');
  
  // Handle 00 international prefix
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2);
  }
  
  // If starts with 0, assume Saudi Arabia
  if (cleaned.startsWith('0') && !cleaned.startsWith('00')) {
    cleaned = '+966' + cleaned.substring(1);
  }
  
  // If just 9 digits, assume Saudi Arabia
  if (/^\d{9}$/.test(cleaned)) {
    cleaned = '+966' + cleaned;
  }
  
  // Ensure + prefix exists
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
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

    const requestData: SendIdCardRequest = await req.json();
    console.log('[Send ID Card] Request received:', JSON.stringify(requestData));

    const {
      company_id,
      tenant_id,
      person_type,
      safety_officer_id,
      person_name,
      person_phone,
      person_email,
      company_name,
      contract_end_date,
    } = requestData;

    // Validate required fields
    if (!company_id || !tenant_id || !person_name || !person_phone || !company_name) {
      throw new Error('Missing required fields: company_id, tenant_id, person_name, person_phone, company_name');
    }

    // Generate unique QR token
    const qr_token = generateQRToken();
    console.log('[Send ID Card] Generated QR token:', qr_token);

    // Calculate validity - use contract end date or 1 year from now
    const valid_until = contract_end_date 
      ? new Date(contract_end_date).toISOString()
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    // Check for existing active QR for this person and deactivate
    const existingQuery = supabase
      .from('contractor_company_access_qr')
      .update({ is_active: false, revoked_at: new Date().toISOString(), revocation_reason: 'Replaced by new card' })
      .eq('company_id', company_id)
      .eq('person_type', person_type)
      .eq('is_active', true)
      .is('deleted_at', null);

    if (safety_officer_id) {
      existingQuery.eq('safety_officer_id', safety_officer_id);
    } else {
      existingQuery.eq('person_name', person_name);
    }

    await existingQuery;

    // Create new QR record
    const { data: qrRecord, error: qrError } = await supabase
      .from('contractor_company_access_qr')
      .insert({
        company_id,
        tenant_id,
        person_type,
        safety_officer_id: safety_officer_id || null,
        person_name,
        person_phone,
        person_email: person_email || null,
        qr_token,
        valid_until,
        is_active: true,
      })
      .select()
      .single();

    if (qrError) {
      console.error('[Send ID Card] Error creating QR record:', qrError);
      throw new Error('Failed to create QR record: ' + qrError.message);
    }

    console.log('[Send ID Card] QR record created:', qrRecord.id);

    // Get tenant info for branding
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, name_ar')
      .eq('id', tenant_id)
      .single();

    const tenantName = tenant?.name || 'HSSA Platform';

    // Format role display
    const roleDisplay = person_type === 'site_rep' 
      ? 'Site Representative' 
      : 'Safety Officer';
    const roleDisplayAr = person_type === 'site_rep' 
      ? 'ممثل الموقع' 
      : 'مسؤول السلامة';

    // Format validity date
    const validUntilDate = new Date(valid_until).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    // Generate QR code URL
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr_token)}`;

    // Build the message
    const message = `🪪 *${tenantName}*
━━━━━━━━━━━━━━━━━━
*CONTRACTOR ACCESS CARD*
بطاقة دخول المقاول
━━━━━━━━━━━━━━━━━━

👤 *${person_name}*

🏢 ${company_name}

💼 ${roleDisplay}
     ${roleDisplayAr}

📅 Valid until: ${validUntilDate}

━━━━━━━━━━━━━━━━━━
🔐 *ACCESS CODE*
\`${qr_token}\`
━━━━━━━━━━━━━━━━━━

📱 Scan QR or present code at gate
امسح الرمز أو قدمه عند البوابة

🔗 ${qrCodeUrl}`;

    // Check if WaSender is configured
    const wasenderApiKey = Deno.env.get('WASENDER_API_KEY');
    if (!wasenderApiKey) {
      console.warn('[Send ID Card] WASENDER_API_KEY not configured, skipping WhatsApp');
      
      // Log to audit
      await supabase.from('contractor_module_audit_logs').insert({
        tenant_id,
        entity_type: 'contractor_company_access_qr',
        entity_id: qrRecord.id,
        action: 'id_card_created',
        new_value: {
          person_name,
          person_type,
          company_name,
          whatsapp_sent: false,
          reason: 'WhatsApp not configured',
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          qr_record_id: qrRecord.id,
          qr_token,
          whatsapp_sent: false,
          message: 'ID card created but WhatsApp not configured'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formattedPhone = formatPhoneNumber(person_phone);
    console.log('[Send ID Card] Sending WhatsApp to:', formattedPhone);

    let whatsappSuccess = false;
    let messageId = null;
    let whatsappError = null;

    try {
      // Use the CORRECT WaSender API endpoint and format (per official docs)
      // Endpoint: https://wasenderapi.com/api/send-message
      // Payload: { to: "+966...", text: "message" }
      const payload = {
        to: formattedPhone,
        text: message
      };
      
      console.log('[Send ID Card] WaSender request payload:', JSON.stringify(payload));
      
      const wasenderResponse = await fetch('https://wasenderapi.com/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${wasenderApiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const wasenderResult = await wasenderResponse.json();
      console.log('[Send ID Card] WaSender response status:', wasenderResponse.status);
      console.log('[Send ID Card] WaSender response body:', JSON.stringify(wasenderResult));
      
      whatsappSuccess = wasenderResponse.ok && wasenderResult.success !== false;
      
      // Extract message ID from response data structure
      messageId = wasenderResult.data?.msgId || wasenderResult.msgId || wasenderResult.messageId || wasenderResult.id || null;
      
      if (!whatsappSuccess) {
        whatsappError = wasenderResult.error || wasenderResult.message || 'Unknown error';
      }
    } catch (waError) {
      whatsappError = waError instanceof Error ? waError.message : 'Network error';
      console.error('[Send ID Card] WhatsApp send error:', whatsappError);
    }

    // Update QR record with WhatsApp status
    if (whatsappSuccess) {
      await supabase
        .from('contractor_company_access_qr')
        .update({
          whatsapp_sent_at: new Date().toISOString(),
          whatsapp_message_id: messageId ? String(messageId) : null,
        })
        .eq('id', qrRecord.id);
    }

    // Log to notification_logs table for delivery tracking
    try {
      await supabase.from('notification_logs').insert({
        tenant_id,
        notification_type: 'whatsapp',
        recipient: formattedPhone,
        subject: 'Contractor ID Card',
        message_preview: `ID Card for ${person_name} - ${company_name}`,
        status: whatsappSuccess ? 'sent' : 'failed',
        provider: 'wasender',
        provider_message_id: messageId ? String(messageId) : null,
        error_message: whatsappError,
        metadata: {
          entity_type: 'contractor_company_access_qr',
          entity_id: qrRecord.id,
          person_type,
          qr_token,
        },
      });
      console.log('[Send ID Card] Notification logged to notification_logs');
    } catch (logError) {
      console.warn('[Send ID Card] Failed to log to notification_logs:', logError);
    }

    // Log to audit
    await supabase.from('contractor_module_audit_logs').insert({
      tenant_id,
      entity_type: 'contractor_company_access_qr',
      entity_id: qrRecord.id,
      action: 'id_card_sent',
      new_value: {
        person_name,
        person_type,
        company_name,
        whatsapp_sent: whatsappSuccess,
        whatsapp_error: whatsappError,
        phone: formattedPhone,
        message_id: messageId,
      },
    });

    console.log('[Send ID Card] Completed - WhatsApp:', whatsappSuccess ? 'sent' : 'failed');

    return new Response(
      JSON.stringify({
        success: true,
        qr_record_id: qrRecord.id,
        qr_token,
        whatsapp_sent: whatsappSuccess,
        whatsapp_error: whatsappError,
        message_id: messageId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Send ID Card] Error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
