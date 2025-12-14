import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RevocationRequest {
  worker_id: string;
  project_id?: string; // If not provided, revoke all access
  revocation_reason: string;
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

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { worker_id, project_id, revocation_reason, tenant_id }: RevocationRequest = await req.json();

    if (!worker_id || !revocation_reason || !tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get worker details
    const { data: worker, error: workerError } = await supabase
      .from('contractor_workers')
      .select('full_name, company_id')
      .eq('id', worker_id)
      .single();

    if (workerError || !worker) {
      console.error('Worker not found:', workerError);
      return new Response(
        JSON.stringify({ error: 'Worker not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date().toISOString();
    let qrCodesRevoked = 0;
    let assignmentsRemoved = 0;

    // Build query for QR codes to revoke
    let qrQuery = supabase
      .from('worker_qr_codes')
      .update({
        is_active: false,
        revoked_at: now,
        revoked_by: user.id,
        revocation_reason,
      })
      .eq('worker_id', worker_id)
      .eq('is_active', true);

    if (project_id) {
      qrQuery = qrQuery.eq('project_id', project_id);
    }

    const { data: revokedQRs, error: qrError } = await qrQuery.select('id');

    if (qrError) {
      console.error('Error revoking QR codes:', qrError);
    } else {
      qrCodesRevoked = revokedQRs?.length || 0;
    }

    // Remove project assignments if project_id provided
    if (project_id) {
      const { data: removedAssignments, error: assignmentError } = await supabase
        .from('project_worker_assignments')
        .update({
          is_active: false,
          removed_at: now,
          removed_by: user.id,
          removal_reason: revocation_reason,
        })
        .eq('worker_id', worker_id)
        .eq('project_id', project_id)
        .eq('is_active', true)
        .select('id');

      if (assignmentError) {
        console.error('Error removing assignments:', assignmentError);
      } else {
        assignmentsRemoved = removedAssignments?.length || 0;
      }
    } else {
      // Revoke all project assignments
      const { data: removedAssignments, error: assignmentError } = await supabase
        .from('project_worker_assignments')
        .update({
          is_active: false,
          removed_at: now,
          removed_by: user.id,
          removal_reason: revocation_reason,
        })
        .eq('worker_id', worker_id)
        .eq('is_active', true)
        .select('id');

      if (assignmentError) {
        console.error('Error removing assignments:', assignmentError);
      } else {
        assignmentsRemoved = removedAssignments?.length || 0;
      }
    }

    // Log the revocation
    await supabase.from('contractor_module_audit_logs').insert({
      tenant_id,
      entity_type: 'contractor_worker',
      entity_id: worker_id,
      action: project_id ? 'worker_project_access_revoked' : 'worker_all_access_revoked',
      actor_id: user.id,
      new_value: {
        project_id,
        revocation_reason,
        qr_codes_revoked: qrCodesRevoked,
        assignments_removed: assignmentsRemoved,
      },
    });

    console.log(`Access revoked for worker ${worker.full_name}: ${qrCodesRevoked} QR codes, ${assignmentsRemoved} assignments`);

    return new Response(
      JSON.stringify({
        success: true,
        worker_name: worker.full_name,
        project_id,
        revocation_reason,
        qr_codes_revoked: qrCodesRevoked,
        assignments_removed: assignmentsRemoved,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error revoking worker access:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
