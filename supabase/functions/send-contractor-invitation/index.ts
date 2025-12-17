import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmailViaSES } from "../_shared/email-sender.ts";

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

    const companyName = (rep.company as any)?.company_name || 'Your Company';
    const tenantName = tenant?.name || 'DHUUD Platform';

    // Generate portal access token
    const portalToken = crypto.randomUUID();

    // Send invitation email
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a56db;">Contractor Portal Invitation</h2>
        <p>Hello ${rep.full_name},</p>
        <p>You have been invited to access the ${tenantName} Contractor Portal as a representative of <strong>${companyName}</strong>.</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Company:</strong> ${companyName}</p>
          <p><strong>Organization:</strong> ${tenantName}</p>
        </div>
        <p>Through the Contractor Portal, you will be able to:</p>
        <ul>
          <li>Manage worker registrations and documentation</li>
          <li>Submit gate pass requests</li>
          <li>Track project assignments</li>
          <li>View induction video requirements</li>
        </ul>
        <p>Please contact your project manager for portal access credentials.</p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 32px;">This is an automated invitation from the HSSE Platform.</p>
      </div>
    `;

    const emailResult = await sendEmailViaSES(
      rep.email,
      `Contractor Portal Invitation - ${tenantName}`,
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
        email_error: emailResult.error 
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

    console.log(`Contractor invitation sent to ${rep.email} for company ${companyName}`);

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
