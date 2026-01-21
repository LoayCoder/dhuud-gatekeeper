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

    // Get company basic details (no legacy site rep fields)
    const { data: company, error: companyError } = await supabase
      .from('contractor_companies')
      .select(`
        id,
        company_name,
        contract_start_date,
        contract_end_date,
        scope_of_work,
        branch_id
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

    // Get site representative from dedicated table
    const { data: siteRep } = await supabase
      .from('contractor_representatives')
      .select('id, full_name, email, mobile_number, national_id, is_primary')
      .eq('company_id', company_id)
      .eq('is_primary', true)
      .is('deleted_at', null)
      .maybeSingle();

    const results = {
      site_rep: { created: false, linked: false, email: null as string | null, invitation_sent: false },
      safety_officer: { created: false, linked: false, email: null as string | null },
    };

    // Get contractor_site_rep role
    const { data: siteRepRole } = await supabase
      .from('roles')
      .select('id')
      .eq('code', 'contractor_site_rep')
      .single();

    // Process Site Representative from dedicated table
    if (siteRep?.email) {
      results.site_rep.email = siteRep.email;

      // Check if user already exists
      const { data: existingUser } = await supabase.auth.admin.listUsers();
      const existingSiteRepUser = existingUser?.users?.find(
        (u) => u.email?.toLowerCase() === siteRep.email?.toLowerCase()
      );

      let userId: string | null = null;

      if (existingSiteRepUser) {
        userId = existingSiteRepUser.id;
        console.log(`Site rep user already exists: ${userId}`);
      } else {
        // Create new user with temporary password (they'll need to reset)
        const tempPassword = crypto.randomUUID().slice(0, 12) + 'Aa1!';
        
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: siteRep.email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: siteRep.full_name,
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
        // Ensure profile exists with contract dates from company
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: userId,
          tenant_id: tenant_id,
          full_name: siteRep.full_name,
          email: siteRep.email,
          phone_number: siteRep.mobile_number,
          contract_start: company.contract_start_date,
          contract_end: company.contract_end_date,
          contractor_company_name: company.company_name,
          contractor_type: 'contractor',
          user_type: 'contractor',
          has_login: true,
          assigned_branch_id: company.branch_id,
        }, { onConflict: 'id' });

        if (profileError) {
          console.error('Failed to upsert profile:', profileError);
        }

        // Update contractor representative with user_id
        const { error: repError } = await supabase
          .from('contractor_representatives')
          .update({ user_id: userId })
          .eq('id', siteRep.id);

        if (!repError) {
          results.site_rep.linked = true;
          
          // Send invitation email
          try {
            const inviteResponse = await fetch(`${supabaseUrl}/functions/v1/send-contractor-invitation`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                company_id: company_id,
                representative_id: siteRep.id,
                tenant_id: tenant_id,
              }),
            });

            if (inviteResponse.ok) {
              results.site_rep.invitation_sent = true;
              console.log(`Invitation email sent to site rep: ${siteRep.email}`);
            } else {
              const inviteError = await inviteResponse.text();
              console.error(`Failed to send invitation email: ${inviteError}`);
            }
          } catch (inviteErr) {
            console.error('Error calling send-contractor-invitation:', inviteErr);
          }
        } else {
          console.error('Failed to update contractor representative:', repError);
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

    // Get safety officer from dedicated table
    const { data: safetyOfficer } = await supabase
      .from('contractor_safety_officers')
      .select('id, name, email, phone')
      .eq('company_id', company_id)
      .eq('is_primary', true)
      .is('deleted_at', null)
      .maybeSingle();

    // Process Safety Officer from dedicated table
    if (safetyOfficer?.email) {
      results.safety_officer.email = safetyOfficer.email;

      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingSafetyOfficer = existingUsers?.users?.find(
        (u) => u.email?.toLowerCase() === safetyOfficer.email?.toLowerCase()
      );

      let userId: string | null = null;

      if (existingSafetyOfficer) {
        userId = existingSafetyOfficer.id;
      } else {
        const tempPassword = crypto.randomUUID().slice(0, 12) + 'Aa1!';
        
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: safetyOfficer.email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: safetyOfficer.name,
            tenant_id: tenant_id,
          },
        });

        if (!createError && newUser.user) {
          userId = newUser.user.id;
          results.safety_officer.created = true;
        }
      }

      if (userId) {
        // Upsert profile with contract dates
        await supabase.from('profiles').upsert({
          id: userId,
          tenant_id: tenant_id,
          full_name: safetyOfficer.name,
          email: safetyOfficer.email,
          phone_number: safetyOfficer.phone,
          contract_start: company.contract_start_date,
          contract_end: company.contract_end_date,
          contractor_company_name: company.company_name,
          contractor_type: 'contractor',
          user_type: 'contractor',
          has_login: true,
          assigned_branch_id: company.branch_id,
        }, { onConflict: 'id' });

        // Update safety officer with user_id
        const { error: repError } = await supabase
          .from('contractor_safety_officers')
          .update({ user_id: userId })
          .eq('id', safetyOfficer.id);

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
