import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmailViaSES, getAppUrl, emailButton, wrapEmailHtml } from "../_shared/email-sender.ts";
import { 
  CONTRACTOR_TRANSLATIONS, 
  getTranslations, 
  replaceVariables,
  isRTL,
  type SupportedLanguage 
} from "../_shared/email-translations.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvitationRequest {
  company_id: string;
  representative_id: string;
  tenant_id: string;
}

function generateInvitationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 8; i++) {
    code += chars[arr[i] % chars.length];
  }
  return code;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { company_id, representative_id, tenant_id }: InvitationRequest = await req.json();

    if (!company_id || !representative_id || !tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get representative and company details
    const { data: rep, error: repError } = await supabase
      .from('contractor_representatives')
      .select('full_name, email, mobile_number, company:contractor_companies(company_name)')
      .eq('id', representative_id)
      .single();

    if (repError || !rep) {
      console.error('Representative not found:', repError);
      return new Response(
        JSON.stringify({ error: 'Representative not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!rep.email) {
      return new Response(
        JSON.stringify({ error: 'Representative email not available' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get tenant branding for email
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, primary_color')
      .eq('id', tenant_id)
      .single();

    // Try to get user's preferred language if they have a profile
    let userLanguage = 'en';
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('preferred_language')
      .eq('email', rep.email)
      .single();
    
    if (userProfile?.preferred_language) {
      userLanguage = userProfile.preferred_language;
    }

    const companyName = (rep.company as any)?.company_name || 'Your Company';
    const tenantName = tenant?.name || 'DHUUD Platform';
    const appUrl = getAppUrl();
    const rtl = isRTL(userLanguage as SupportedLanguage);

    // Get localized translations
    const t = getTranslations(CONTRACTOR_TRANSLATIONS, userLanguage).invitation;

    // Generate unique invitation code
    const invitationCode = generateInvitationCode();

    // Set expiry to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation record in invitations table
    const { error: inviteInsertError } = await supabase
      .from('invitations')
      .insert({
        code: invitationCode,
        email: rep.email,
        full_name: rep.full_name || null,
        phone_number: rep.mobile_number || null,
        tenant_id,
        expires_at: expiresAt.toISOString(),
        metadata: {
          type: 'contractor_representative',
          company_id,
          representative_id,
          company_name: companyName,
        },
        delivery_channel: 'email',
        used: false,
      });

    if (inviteInsertError) {
      console.error('Failed to create invitation record:', inviteInsertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create invitation', details: inviteInsertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the invite URL with code
    const inviteUrl = `${appUrl}/invite?code=${invitationCode}`;

    // Build localized email content
    const subject = replaceVariables(t.subject, { tenant: tenantName });
    const bodyText = replaceVariables(t.body, { tenant: tenantName, company: companyName });

    const codeLabel = rtl ? 'رمز الدعوة' : 'Invitation Code';
    const codeInstruction = rtl
      ? 'استخدم هذا الرمز للتسجيل وإنشاء حسابك:'
      : 'Use this code to register and create your account:';

    const emailContent = `
      <div style="background: linear-gradient(135deg, #1a56db 0%, #3b82f6 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${t.title}</h1>
      </div>
      
      <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px;">${bodyText}</p>
        
        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-${rtl ? 'right' : 'left'}: 4px solid #1a56db;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 140px;"><strong>${t.company}:</strong></td>
              <td style="padding: 8px 0;">${companyName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>${t.organization}:</strong></td>
              <td style="padding: 8px 0;">${tenantName}</td>
            </tr>
          </table>
        </div>

        <!-- Invitation Code Box -->
        <div style="background: #eef2ff; border: 2px dashed #1a56db; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
          <p style="margin: 0 0 8px; font-size: 14px; color: #64748b;">${codeInstruction}</p>
          <p style="margin: 0 0 4px; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">${codeLabel}</p>
          <p style="margin: 0; font-size: 32px; font-weight: bold; color: #1a56db; letter-spacing: 4px; font-family: monospace;">${invitationCode}</p>
        </div>
        
        <p><strong>${t.features}</strong></p>
        <ul style="margin: 16px 0; padding-${rtl ? 'right' : 'left'}: 20px;">
          <li style="margin: 8px 0;">${t.feature1}</li>
          <li style="margin: 8px 0;">${t.feature2}</li>
          <li style="margin: 8px 0;">${t.feature3}</li>
          <li style="margin: 8px 0;">${t.feature4}</li>
        </ul>
        
        ${emailButton(t.button, inviteUrl, "#1a56db", rtl)}
      </div>
    `;

    const emailHtml = wrapEmailHtml(emailContent, userLanguage, tenantName);

    const emailResult = await sendEmailViaSES(
      rep.email,
      `[${tenantName}] ${subject}`,
      emailHtml,
      'contractor_invitation'
    );

    // Log the invitation attempt
    await supabase.from('contractor_module_audit_logs').insert({
      tenant_id,
      entity_type: 'contractor_representative',
      entity_id: representative_id,
      action: 'invitation_sent',
      new_value: { 
        email: rep.email, 
        company_id, 
        invitation_code: invitationCode,
        email_sent: emailResult.success,
        email_error: emailResult.error,
        language: userLanguage
      },
    });

    if (!emailResult.success) {
      console.error(`Failed to send invitation email to ${rep.email}:`, emailResult.error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to send invitation email',
          details: emailResult.error 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Contractor invitation sent to ${rep.email} for company ${companyName} with code ${invitationCode}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invitation sent to ${rep.email}`,
        representative: {
          name: rep.full_name,
          email: rep.email,
          company: companyName,
        },
        invitation_code: invitationCode,
        language: userLanguage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending contractor invitation:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
