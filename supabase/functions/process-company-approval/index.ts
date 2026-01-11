import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApprovalRequest {
  company_id: string;
  action: 'approved' | 'rejected';
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

    const { company_id, action, tenant_id }: ApprovalRequest = await req.json();

    if (!company_id || !action || !tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only process approved companies
    if (action !== 'approved') {
      return new Response(
        JSON.stringify({ success: true, message: 'No action needed for rejected companies' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get company details
    const { data: company, error: companyError } = await supabase
      .from('contractor_companies')
      .select(`
        id,
        company_name,
        contractor_site_rep_name,
        contractor_site_rep_email,
        contractor_site_rep_phone,
        contractor_site_rep_national_id,
        contractor_safety_officer_name,
        contractor_safety_officer_email,
        contractor_safety_officer_phone
      `)
      .eq('id', company_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (companyError || !company) {
      console.error('Company not found:', companyError);
      return new Response(
        JSON.stringify({ error: 'Company not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = {
      site_rep: { created: false, linked: false, email: null as string | null },
      safety_officer: { created: false, linked: false, email: null as string | null },
    };

    // Get contractor_site_rep role
    const { data: siteRepRole } = await supabase
      .from('roles')
      .select('id')
      .eq('code', 'contractor_site_rep')
      .single();

    // Process Site Representative
    if (company.contractor_site_rep_email) {
      results.site_rep.email = company.contractor_site_rep_email;

      // Check if user already exists
      const { data: existingUser } = await supabase.auth.admin.listUsers();
      const existingSiteRep = existingUser?.users?.find(
        (u) => u.email?.toLowerCase() === company.contractor_site_rep_email?.toLowerCase()
      );

      let userId: string | null = null;

      if (existingSiteRep) {
        userId = existingSiteRep.id;
        console.log(`Site rep user already exists: ${userId}`);
      } else {
        // Create new user with temporary password (they'll need to reset)
        const tempPassword = crypto.randomUUID().slice(0, 12) + 'Aa1!';
        
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: company.contractor_site_rep_email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: company.contractor_site_rep_name,
            tenant_id: tenant_id,
          },
        });

        if (createError) {
          console.error('Failed to create site rep user:', createError);
        } else {
          userId = newUser.user?.id || null;
          results.site_rep.created = true;
          console.log(`Created site rep user: ${userId}`);
        }
      }

      if (userId) {
        // Ensure profile exists
        await supabase.from('profiles').upsert({
          id: userId,
          tenant_id: tenant_id,
          full_name: company.contractor_site_rep_name,
          email: company.contractor_site_rep_email,
          phone: company.contractor_site_rep_phone,
        }, { onConflict: 'id' });

        // Create contractor representative entry
        const { error: repError } = await supabase
          .from('contractor_representatives')
          .upsert({
            company_id: company_id,
            user_id: userId,
            full_name: company.contractor_site_rep_name,
            email: company.contractor_site_rep_email,
            phone: company.contractor_site_rep_phone,
            national_id: company.contractor_site_rep_national_id,
            representative_type: 'site_rep',
            is_primary: true,
            tenant_id: tenant_id,
          }, { 
            onConflict: 'company_id,email',
            ignoreDuplicates: false 
          });

        if (!repError) {
          results.site_rep.linked = true;
        }

        // Assign role if exists
        if (siteRepRole?.id) {
          await supabase
            .from('user_role_assignments')
            .upsert({
              user_id: userId,
              role_id: siteRepRole.id,
              tenant_id: tenant_id,
            }, { 
              onConflict: 'user_id,role_id',
              ignoreDuplicates: true 
            });
        }
      }
    }

    // Process Safety Officer (similar logic)
    if (company.contractor_safety_officer_email) {
      results.safety_officer.email = company.contractor_safety_officer_email;

      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingSafetyOfficer = existingUsers?.users?.find(
        (u) => u.email?.toLowerCase() === company.contractor_safety_officer_email?.toLowerCase()
      );

      let userId: string | null = null;

      if (existingSafetyOfficer) {
        userId = existingSafetyOfficer.id;
      } else {
        const tempPassword = crypto.randomUUID().slice(0, 12) + 'Aa1!';
        
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: company.contractor_safety_officer_email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: company.contractor_safety_officer_name,
            tenant_id: tenant_id,
          },
        });

        if (!createError && newUser.user) {
          userId = newUser.user.id;
          results.safety_officer.created = true;
        }
      }

      if (userId) {
        await supabase.from('profiles').upsert({
          id: userId,
          tenant_id: tenant_id,
          full_name: company.contractor_safety_officer_name,
          email: company.contractor_safety_officer_email,
          phone: company.contractor_safety_officer_phone,
        }, { onConflict: 'id' });

        const { error: repError } = await supabase
          .from('contractor_representatives')
          .upsert({
            company_id: company_id,
            user_id: userId,
            full_name: company.contractor_safety_officer_name,
            email: company.contractor_safety_officer_email,
            phone: company.contractor_safety_officer_phone,
            representative_type: 'safety_officer',
            is_primary: false,
            tenant_id: tenant_id,
          }, { 
            onConflict: 'company_id,email',
            ignoreDuplicates: false 
          });

        if (!repError) {
          results.safety_officer.linked = true;
        }
      }
    }

    // Log the automation
    await supabase.from('contractor_module_audit_logs').insert({
      tenant_id,
      entity_type: 'contractor_company',
      entity_id: company_id,
      action: 'post_approval_automation',
      old_value: null,
      new_value: results,
    });

    console.log(`Post-approval automation completed for company ${company_id}:`, results);

    return new Response(
      JSON.stringify({
        success: true,
        company_id,
        company_name: company.company_name,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in post-approval automation:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
