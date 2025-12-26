import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's auth
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user and get their tenant
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's profile to get tenant_id
    const { data: profile, error: profileError } = await supabaseUser
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.tenant_id) {
      console.error('Profile error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Could not get user tenant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tenantId = profile.tenant_id;

    // Get first available site
    const { data: sites } = await supabaseUser
      .from('sites')
      .select('id, branch_id')
      .eq('tenant_id', tenantId)
      .limit(1);

    const siteId = sites?.[0]?.id || null;
    const branchId = sites?.[0]?.branch_id || null;

    // Get first department
    const { data: departments } = await supabaseUser
      .from('departments')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1);

    const departmentId = departments?.[0]?.id || null;

    console.log(`Creating test observations for tenant ${tenantId}`);

    // Define test observations at each severity level
    const testObservations = [
      {
        severity_v2: 'level_1',
        title: 'TEST L1 - Low Risk: Minor housekeeping observation',
        description: 'Test observation at Level 1 (Low Risk). This can be closed on spot by the reporter with photo evidence.',
        subtype: 'unsafe_condition',
        status: 'submitted', // Can be closed on spot
      },
      {
        severity_v2: 'level_2',
        title: 'TEST L2 - Moderate Risk: PPE compliance observation',
        description: 'Test observation at Level 2 (Moderate Risk). This can be closed on spot by the reporter with photo evidence.',
        subtype: 'unsafe_act',
        status: 'submitted', // Can be closed on spot
      },
      {
        severity_v2: 'level_3',
        title: 'TEST L3 - Serious Risk: Equipment guard missing',
        description: 'Test observation at Level 3 (Serious Risk). This requires HSSE Expert validation after corrective actions are assigned.',
        subtype: 'unsafe_condition',
        status: 'pending_hsse_validation', // Awaiting HSSE Expert validation
      },
      {
        severity_v2: 'level_4',
        title: 'TEST L4 - Major Risk: Fall hazard from height',
        description: 'Test observation at Level 4 (Major Risk). This requires HSSE Expert validation after corrective actions are assigned.',
        subtype: 'unsafe_condition',
        status: 'pending_hsse_validation', // Awaiting HSSE Expert validation
      },
      {
        severity_v2: 'level_5',
        title: 'TEST L5 - Catastrophic Risk: Confined space entry without permit',
        description: 'Test observation at Level 5 (Catastrophic Risk). This requires HSSE Manager final closure after all actions are completed and HSSE validation is accepted.',
        subtype: 'unsafe_act',
        status: 'pending_final_closure', // Awaiting HSSE Manager final closure
        closure_requires_manager: true,
        hsse_validation_status: 'accepted',
        hsse_validated_by: user.id,
        hsse_validated_at: new Date().toISOString(),
      },
    ];

    const createdObservations = [];

    for (const obs of testObservations) {
      // Generate unique reference ID
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      const referenceId = `OBS-TEST-${obs.severity_v2.toUpperCase()}-${timestamp}${random}`;

      const insertData: any = {
        tenant_id: tenantId,
        reference_id: referenceId,
        title: obs.title,
        description: obs.description,
        event_type: 'observation',
        subtype: obs.subtype,
        severity_v2: obs.severity_v2,
        potential_severity_v2: obs.severity_v2,
        status: obs.status,
        reporter_id: user.id,
        occurred_at: new Date().toISOString(),
        site_id: siteId,
        branch_id: branchId,
        department_id: departmentId,
      };

      // Add L5-specific fields
      if (obs.closure_requires_manager) {
        insertData.closure_requires_manager = true;
        insertData.hsse_validation_status = obs.hsse_validation_status;
        insertData.hsse_validated_by = obs.hsse_validated_by;
        insertData.hsse_validated_at = obs.hsse_validated_at;
      }

      const { data: created, error: insertError } = await supabaseUser
        .from('incidents')
        .insert(insertData)
        .select('id, reference_id, severity_v2, status')
        .single();

      if (insertError) {
        console.error(`Error creating ${obs.severity_v2} observation:`, insertError);
        continue;
      }

      createdObservations.push(created);
      console.log(`Created ${obs.severity_v2} observation: ${created.reference_id}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${createdObservations.length} test observations`,
        observations: createdObservations,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in seed-test-observations:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
