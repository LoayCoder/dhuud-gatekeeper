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

// Format phone number for WhatsApp
function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '966' + cleaned.substring(1);
  }
  if (!cleaned.startsWith('966') && cleaned.length === 9) {
    cleaned = '966' + cleaned;
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

    // Check for existing active QR for this person
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
      ? 'Site Representative / ممثل الموقع' 
      : 'Safety Officer / مسؤول السلامة';

    // Format validity date
    const validUntilDate = new Date(valid_until).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    // Create text message with QR code link
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr_token)}`;
    
    const message = `🪪 *${tenantName} - Contractor Access Card*
بطاقة دخول المقاول

━━━━━━━━━━━━━━━━━━
👤 *Name / الاسم:*
${person_name}

🏢 *Company / الشركة:*
${company_name}

💼 *Role / المنصب:*
${roleDisplay}

📅 *Valid Until / صالحة حتى:*
${validUntilDate}

🔐 *Access Code / رمز الدخول:*
\`${qr_token}\`
━━━━━━━━━━━━━━━━━━

📱 Present this code or QR at the security gate
قدم هذا الرمز أو QR عند بوابة الأمن

🔗 QR Code: ${qrCodeUrl}`;

    // Send via WhatsApp using WaSender
    const wasenderApiKey = Deno.env.get('WASENDER_API_KEY');
    if (!wasenderApiKey) {
      console.warn('[Send ID Card] WASENDER_API_KEY not configured, skipping WhatsApp');
      return new Response(
        JSON.stringify({
          success: true,
          qr_record_id: qrRecord.id,
          qr_token,
          whatsapp_sent: false,
          message: 'QR code created but WhatsApp not configured'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formattedPhone = formatPhoneNumber(person_phone);
    console.log('[Send ID Card] Sending WhatsApp to:', formattedPhone);

    const wasenderResponse = await fetch('https://api.wasender.dev/api/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${wasenderApiKey}`,
      },
      body: JSON.stringify({
        to: formattedPhone,
        text: message,
      }),
    });

    const wasenderResult = await wasenderResponse.json();
    console.log('[Send ID Card] WaSender response:', JSON.stringify(wasenderResult));

    const whatsappSuccess = wasenderResponse.ok && wasenderResult.success !== false;
    const messageId = wasenderResult.messageId || wasenderResult.id || null;

    // Update QR record with WhatsApp status
    if (whatsappSuccess) {
      await supabase
        .from('contractor_company_access_qr')
        .update({
          whatsapp_sent_at: new Date().toISOString(),
          whatsapp_message_id: messageId,
        })
        .eq('id', qrRecord.id);
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
        phone: formattedPhone,
      },
    });

    console.log('[Send ID Card] Completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        qr_record_id: qrRecord.id,
        qr_token,
        whatsapp_sent: whatsappSuccess,
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
