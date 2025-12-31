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

interface NotificationTemplate {
  id: string;
  slug: string;
  content_pattern: string;
  variable_keys: string[];
  channel_type: 'whatsapp' | 'email' | 'both';
  email_subject: string | null;
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

/**
 * Replace template variables with actual values
 * Supports {{1}}, {{2}}, etc. and {{variable_name}} formats
 */
function replaceTemplateVariables(template: string, variableKeys: string[], data: Record<string, string>): string {
  let result = template;
  
  // Replace {{1}}, {{2}} style placeholders based on variable_keys order
  variableKeys.forEach((key, index) => {
    const placeholder = `{{${index + 1}}}`;
    const value = data[key] || '';
    result = result.split(placeholder).join(value);
  });
  
  // Also replace {{variable_name}} style placeholders
  Object.entries(data).forEach(([key, value]) => {
    result = result.split(`{{${key}}}`).join(value);
  });
  
  return result;
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

    // Fetch the contractor_id_card template
    const { data: template, error: templateError } = await supabase
      .from('notification_templates')
      .select('id, slug, content_pattern, variable_keys, channel_type, email_subject')
      .eq('tenant_id', tenant_id)
      .eq('slug', 'contractor_id_card')
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (templateError || !template) {
      console.warn('[Send ID Card] Template not found, using fallback:', templateError?.message);
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

    // Build template data object
    const templateData: Record<string, string> = {
      tenant_name: tenantName,
      person_name: person_name,
      company_name: company_name,
      role: roleDisplay,
      role_ar: roleDisplayAr,
      valid_until: validUntilDate,
      qr_token: qr_token,
      qr_url: qrCodeUrl,
    };

    // Build the message from template or fallback
    let message: string;
    if (template) {
      message = replaceTemplateVariables(template.content_pattern, template.variable_keys, templateData);
      console.log('[Send ID Card] Using template:', template.slug);
    } else {
      // Fallback message if template not found
      message = `🪪 *${tenantName}*
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
      console.log('[Send ID Card] Using fallback message');
    }

    // Check if WaSender is configured
    const wasenderApiKey = Deno.env.get('WASENDER_API_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'noreply@example.com';

    let whatsappSuccess = false;
    let emailSuccess = false;
    let messageId = null;
    let emailMessageId = null;
    let whatsappError = null;
    let emailError = null;

    const formattedPhone = formatPhoneNumber(person_phone);

    // Send WhatsApp notification
    if (wasenderApiKey) {
      console.log('[Send ID Card] Sending WhatsApp to:', formattedPhone);

      try {
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
        messageId = wasenderResult.data?.msgId || wasenderResult.msgId || wasenderResult.messageId || wasenderResult.id || null;
        
        if (!whatsappSuccess) {
          whatsappError = wasenderResult.error || wasenderResult.message || 'Unknown error';
        }
      } catch (waError) {
        whatsappError = waError instanceof Error ? waError.message : 'Network error';
        console.error('[Send ID Card] WhatsApp send error:', whatsappError);
      }

      // Log WhatsApp notification
      try {
        await supabase.from('notification_logs').insert({
          tenant_id,
          channel: 'whatsapp',
          to_address: formattedPhone,
          subject: 'Contractor ID Card',
          status: whatsappSuccess ? 'sent' : 'failed',
          provider: 'wasender',
          provider_message_id: messageId ? String(messageId) : null,
          error_message: whatsappError,
          sent_at: new Date().toISOString(),
          template_name: 'contractor_id_card',
          related_entity_type: 'contractor_company_access_qr',
          related_entity_id: qrRecord.id,
          metadata: {
            person_type,
            person_name,
            company_name,
            qr_token,
            message_preview: `ID Card for ${person_name} - ${company_name}`,
          },
        });
      } catch (logError) {
        console.warn('[Send ID Card] Failed to log WhatsApp notification:', logError);
      }
    } else {
      console.warn('[Send ID Card] WASENDER_API_KEY not configured, skipping WhatsApp');
    }

    // Send Email notification if email is provided and channel supports it
    const shouldSendEmail = person_email && resendApiKey && 
      (template?.channel_type === 'both' || template?.channel_type === 'email' || !template);

    if (shouldSendEmail) {
      console.log('[Send ID Card] Sending email to:', person_email);

      try {
        // Build email subject
        const emailSubject = template?.email_subject 
          ? replaceTemplateVariables(template.email_subject, template.variable_keys, templateData)
          : `Contractor Access Card - ${company_name} | بطاقة دخول المقاول`;

        // Build HTML email content
        const emailHtml = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'IBM Plex Sans Arabic', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 24px; }
    .card { background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 16px 0; }
    .field { margin-bottom: 12px; }
    .field-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .field-value { font-size: 16px; font-weight: 600; color: #1e293b; margin-top: 4px; }
    .qr-section { text-align: center; padding: 20px; background: #f1f5f9; border-radius: 8px; margin-top: 20px; }
    .qr-code { font-family: monospace; font-size: 24px; font-weight: bold; color: #1e40af; background: white; padding: 16px 24px; border-radius: 8px; border: 2px dashed #3b82f6; display: inline-block; letter-spacing: 2px; }
    .qr-image { margin-top: 16px; }
    .footer { background: #f8fafc; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🪪 ${tenantName}</h1>
      <p style="margin: 8px 0 0; opacity: 0.9;">CONTRACTOR ACCESS CARD | بطاقة دخول المقاول</p>
    </div>
    <div class="content">
      <div class="card">
        <div class="field">
          <div class="field-label">Name / الاسم</div>
          <div class="field-value">${person_name}</div>
        </div>
        <div class="field">
          <div class="field-label">Company / الشركة</div>
          <div class="field-value">${company_name}</div>
        </div>
        <div class="field">
          <div class="field-label">Role / الدور</div>
          <div class="field-value">${roleDisplay} | ${roleDisplayAr}</div>
        </div>
        <div class="field">
          <div class="field-label">Valid Until / صالح حتى</div>
          <div class="field-value">${validUntilDate}</div>
        </div>
      </div>
      
      <div class="qr-section">
        <p style="margin: 0 0 12px; color: #475569;">🔐 ACCESS CODE | رمز الدخول</p>
        <div class="qr-code">${qr_token}</div>
        <div class="qr-image">
          <img src="${qrCodeUrl}" alt="QR Code" width="200" height="200" style="border-radius: 8px;" />
        </div>
        <p style="margin: 16px 0 0; font-size: 13px; color: #64748b;">
          Scan QR or present code at gate<br/>
          امسح الرمز أو قدمه عند البوابة
        </p>
      </div>
    </div>
    <div class="footer">
      <p>This is an automated message from ${tenantName}</p>
    </div>
  </div>
</body>
</html>`;

        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${tenantName} <${fromEmail}>`,
            to: [person_email],
            subject: emailSubject,
            html: emailHtml,
          }),
        });

        const emailResult = await emailResponse.json();
        console.log('[Send ID Card] Email response status:', emailResponse.status);
        console.log('[Send ID Card] Email response body:', JSON.stringify(emailResult));

        emailSuccess = emailResponse.ok;
        emailMessageId = emailResult.id || null;

        if (!emailSuccess) {
          emailError = emailResult.message || emailResult.error || 'Unknown email error';
        }
      } catch (emError) {
        emailError = emError instanceof Error ? emError.message : 'Email network error';
        console.error('[Send ID Card] Email send error:', emailError);
      }

      // Log email notification
      try {
        await supabase.from('notification_logs').insert({
          tenant_id,
          channel: 'email',
          to_address: person_email,
          subject: `Contractor Access Card - ${company_name}`,
          status: emailSuccess ? 'sent' : 'failed',
          provider: 'resend',
          provider_message_id: emailMessageId,
          error_message: emailError,
          sent_at: new Date().toISOString(),
          template_name: 'contractor_id_card',
          related_entity_type: 'contractor_company_access_qr',
          related_entity_id: qrRecord.id,
          metadata: {
            person_type,
            person_name,
            company_name,
            qr_token,
          },
        });
      } catch (logError) {
        console.warn('[Send ID Card] Failed to log email notification:', logError);
      }
    }

    // Update QR record with notification status
    if (whatsappSuccess || emailSuccess) {
      await supabase
        .from('contractor_company_access_qr')
        .update({
          whatsapp_sent_at: whatsappSuccess ? new Date().toISOString() : null,
          whatsapp_message_id: messageId ? String(messageId) : null,
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
        whatsapp_error: whatsappError,
        email_sent: emailSuccess,
        email_error: emailError,
        phone: formattedPhone,
        email: person_email || null,
        message_id: messageId,
        email_message_id: emailMessageId,
        template_used: template?.slug || 'fallback',
      },
    });

    console.log('[Send ID Card] Completed - WhatsApp:', whatsappSuccess ? 'sent' : 'failed', '| Email:', emailSuccess ? 'sent' : 'skipped/failed');

    return new Response(
      JSON.stringify({
        success: true,
        qr_record_id: qrRecord.id,
        qr_token,
        whatsapp_sent: whatsappSuccess,
        whatsapp_error: whatsappError,
        email_sent: emailSuccess,
        email_error: emailError,
        message_id: messageId,
        email_message_id: emailMessageId,
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
