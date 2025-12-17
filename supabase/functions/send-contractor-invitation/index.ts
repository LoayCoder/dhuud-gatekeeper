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

    // Get representative and company details including preferred_language
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

    // Generate portal access token
    const portalToken = crypto.randomUUID();

    // Build localized email content
    const subject = replaceVariables(t.subject, { tenant: tenantName });
    const bodyText = replaceVariables(t.body, { tenant: tenantName, company: companyName });

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
        
        <p><strong>${t.features}</strong></p>
        <ul style="margin: 16px 0; padding-${rtl ? 'right' : 'left'}: 20px;">
          <li style="margin: 8px 0;">${t.feature1}</li>
          <li style="margin: 8px 0;">${t.feature2}</li>
          <li style="margin: 8px 0;">${t.feature3}</li>
          <li style="margin: 8px 0;">${t.feature4}</li>
        </ul>
        
        ${emailButton(t.button, `${appUrl}/contractor-portal`, "#1a56db", rtl)}
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
        portal_token: portalToken,
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

    console.log(`Contractor invitation sent to ${rep.email} for company ${companyName} in ${userLanguage}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invitation sent to ${rep.email}`,
        representative: {
          name: rep.full_name,
          email: rep.email,
          company: companyName,
        },
        portal_token: portalToken,
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
