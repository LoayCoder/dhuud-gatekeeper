import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    // Get tenant branding for email
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, primary_color')
      .eq('id', tenant_id)
      .single();

    const companyName = (rep.company as any)?.company_name || 'Your Company';
    const tenantName = tenant?.name || 'DHUUD Platform';
    const primaryColor = tenant?.primary_color || '221.2 83.2% 53.3%';

    // Generate portal access token (mock for now)
    const portalToken = crypto.randomUUID();

    // Log the invitation attempt
    await supabase.from('contractor_module_audit_logs').insert({
      tenant_id,
      entity_type: 'contractor_representative',
      entity_id: representative_id,
      action: 'invitation_sent',
      new_value: { email: rep.email, company_id, portal_token: portalToken },
    });

    console.log(`Contractor invitation sent to ${rep.email} for company ${companyName}`);

    // In production, send email via AWS SES
    // For now, return success with mock data
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
