import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Recipient {
  name: string;
  phone: string;
  email?: string;
}

interface SendWelcomeRequest {
  tenant_id: string;
  company_id: string;
  company_name: string;
  contract_end_date?: string;
  recipients: Recipient[];
}

interface NotificationTemplate {
  id: string;
  slug: string;
  content_pattern: string;
  variable_keys: string[];
  channel_type: 'whatsapp' | 'email' | 'both';
  email_subject: string | null;
}

/**
 * Format phone number to E.164 format WITH + prefix
 */
function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/^whatsapp:/, '');
  cleaned = cleaned.replace(/[\s\-\(\)]/g, '');
  
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2);
  }
  
  if (cleaned.startsWith('0') && !cleaned.startsWith('00')) {
    cleaned = '+966' + cleaned.substring(1);
  }
  
  if (/^\d{9}$/.test(cleaned)) {
    cleaned = '+966' + cleaned;
  }
  
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
}

/**
 * Replace template variables with actual values
 */
function replaceTemplateVariables(template: string, variableKeys: string[], data: Record<string, string>): string {
  let result = template;
  
  variableKeys.forEach((key, index) => {
    const placeholder = `{{${index + 1}}}`;
    const value = data[key] || '';
    result = result.split(placeholder).join(value);
  });
  
  Object.entries(data).forEach(([key, value]) => {
    result = result.split(`{{${key}}}`).join(value);
  });
  
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestData: SendWelcomeRequest = await req.json();
    console.log('[Send Welcome] Request received:', JSON.stringify(requestData));

    const { tenant_id, company_id, company_name, contract_end_date, recipients } = requestData;

    if (!tenant_id || !company_name || !recipients || recipients.length === 0) {
      throw new Error('Missing required fields: tenant_id, company_name, recipients');
    }

    // Fetch the contractor_company_welcome template
    const { data: template, error: templateError } = await supabase
      .from('notification_templates')
      .select('id, slug, content_pattern, variable_keys, channel_type, email_subject')
      .eq('tenant_id', tenant_id)
      .eq('slug', 'contractor_company_welcome')
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (templateError || !template) {
      console.warn('[Send Welcome] Template not found, using fallback:', templateError?.message);
    }

    // Get tenant info
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, name_ar')
      .eq('id', tenant_id)
      .single();

    const tenantName = tenant?.name || 'HSSA Platform';

    const wasenderApiKey = Deno.env.get('WASENDER_API_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'noreply@example.com';

    const results: Array<{
      recipient: string;
      whatsapp_sent: boolean;
      email_sent: boolean;
      whatsapp_error?: string;
      email_error?: string;
    }> = [];

    // Format contract end date for display
    const formattedEndDate = contract_end_date 
      ? new Date(contract_end_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : 'N/A';

    for (const recipient of recipients) {
      const templateData: Record<string, string> = {
        person_name: recipient.name,
        company_name: company_name,
        tenant_name: tenantName,
        contract_end_date: formattedEndDate,
      };

      // Build message from template or fallback
      let message: string;
      if (template) {
        message = replaceTemplateVariables(template.content_pattern, template.variable_keys, templateData);
      } else {
        message = `Welcome ${recipient.name}! 

Your company ${company_name} has been registered with ${tenantName}.

Contract valid until: ${formattedEndDate}

You will receive your access credentials shortly.

مرحباً ${recipient.name}!

تم تسجيل شركتكم ${company_name} لدى ${tenantName}.

العقد صالح حتى: ${formattedEndDate}

ستتلقون بيانات الدخول قريباً.`;
      }

      let whatsappSuccess = false;
      let emailSuccess = false;
      let whatsappError: string | undefined;
      let emailError: string | undefined;
      let messageId: string | null = null;
      let emailMessageId: string | null = null;

      const formattedPhone = formatPhoneNumber(recipient.phone);

      // Send WhatsApp
      if (wasenderApiKey && recipient.phone) {
        try {
          const wasenderResponse = await fetch('https://wasenderapi.com/api/send-message', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${wasenderApiKey}`,
            },
            body: JSON.stringify({ to: formattedPhone, text: message }),
          });

          const wasenderResult = await wasenderResponse.json();
          whatsappSuccess = wasenderResponse.ok && wasenderResult.success !== false;
          messageId = wasenderResult.data?.msgId || wasenderResult.msgId || wasenderResult.messageId || null;
          
          if (!whatsappSuccess) {
            whatsappError = wasenderResult.error || wasenderResult.message || 'Unknown error';
          }
        } catch (err) {
          whatsappError = err instanceof Error ? err.message : 'Network error';
        }

        // Log WhatsApp
        try {
          await supabase.from('notification_logs').insert({
            tenant_id,
            channel: 'whatsapp',
            to_address: formattedPhone,
            subject: 'Contractor Welcome',
            status: whatsappSuccess ? 'sent' : 'failed',
            provider: 'wasender',
            provider_message_id: messageId,
            error_message: whatsappError,
            sent_at: new Date().toISOString(),
            template_name: 'contractor_company_welcome',
            related_entity_type: 'contractor_companies',
            related_entity_id: company_id,
            metadata: { person_name: recipient.name, company_name },
          });
        } catch (logErr) {
          console.warn('[Send Welcome] Failed to log WhatsApp:', logErr);
        }
      }

      // Send Email
      const shouldSendEmail = recipient.email && resendApiKey && 
        (template?.channel_type === 'both' || template?.channel_type === 'email' || !template);

      if (shouldSendEmail) {
        try {
          const emailSubject = template?.email_subject 
            ? replaceTemplateVariables(template.email_subject, template.variable_keys, templateData)
            : `Welcome to ${tenantName} - Contractor Access Confirmed | مرحباً بكم`;

          const emailHtml = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'IBM Plex Sans Arabic', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 24px; text-align: center; }
    .content { padding: 24px; }
    .info-box { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to ${tenantName}</h1>
      <p>مرحباً بكم</p>
    </div>
    <div class="content">
      <p>Dear ${recipient.name},</p>
      <p>Your company <strong>${company_name}</strong> has been successfully registered.</p>
      
      <div class="info-box">
        <p><strong>Contract Valid Until:</strong> ${formattedEndDate}</p>
      </div>
      
      <p>You will receive your access credentials shortly.</p>
      
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      
      <p dir="rtl">عزيزي ${recipient.name}،</p>
      <p dir="rtl">تم تسجيل شركتكم <strong>${company_name}</strong> بنجاح.</p>
      <p dir="rtl">ستتلقون بيانات الدخول قريباً.</p>
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
              to: [recipient.email],
              subject: emailSubject,
              html: emailHtml,
            }),
          });

          const emailResult = await emailResponse.json();
          emailSuccess = emailResponse.ok;
          emailMessageId = emailResult.id || null;

          if (!emailSuccess) {
            emailError = emailResult.message || emailResult.error || 'Unknown error';
          }
        } catch (err) {
          emailError = err instanceof Error ? err.message : 'Email network error';
        }

        // Log email
        try {
          await supabase.from('notification_logs').insert({
            tenant_id,
            channel: 'email',
            to_address: recipient.email,
            subject: `Welcome to ${tenantName}`,
            status: emailSuccess ? 'sent' : 'failed',
            provider: 'resend',
            provider_message_id: emailMessageId,
            error_message: emailError,
            sent_at: new Date().toISOString(),
            template_name: 'contractor_company_welcome',
            related_entity_type: 'contractor_companies',
            related_entity_id: company_id,
            metadata: { person_name: recipient.name, company_name },
          });
        } catch (logErr) {
          console.warn('[Send Welcome] Failed to log email:', logErr);
        }
      }

      results.push({
        recipient: recipient.name,
        whatsapp_sent: whatsappSuccess,
        email_sent: emailSuccess,
        whatsapp_error: whatsappError,
        email_error: emailError,
      });
    }

    console.log('[Send Welcome] Completed for', results.length, 'recipients');

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Send Welcome] Error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
