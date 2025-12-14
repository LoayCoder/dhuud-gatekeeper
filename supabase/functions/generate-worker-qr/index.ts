import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QRGenerationRequest {
  worker_id: string;
  project_id: string;
  tenant_id: string;
  valid_days?: number; // Default 30 days
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { worker_id, project_id, tenant_id, valid_days = 30 }: QRGenerationRequest = await req.json();

    if (!worker_id || !project_id || !tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify worker is approved
    const { data: worker, error: workerError } = await supabase
      .from('contractor_workers')
      .select('full_name, mobile_number, approval_status, company_id')
      .eq('id', worker_id)
      .single();

    if (workerError || !worker) {
      console.error('Worker not found:', workerError);
      return new Response(
        JSON.stringify({ error: 'Worker not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (worker.approval_status !== 'approved') {
      return new Response(
        JSON.stringify({ error: 'Worker must be approved before generating QR code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify project is active
    const { data: project, error: projectError } = await supabase
      .from('contractor_projects')
      .select('project_name, status, company_id')
      .eq('id', project_id)
      .single();

    if (projectError || !project) {
      console.error('Project not found:', projectError);
      return new Response(
        JSON.stringify({ error: 'Project not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (project.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Project must be active to generate QR codes' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify worker belongs to the same company as project
    if (worker.company_id !== project.company_id) {
      return new Response(
        JSON.stringify({ error: 'Worker does not belong to the project company' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify induction is completed
    const { data: induction } = await supabase
      .from('worker_inductions')
      .select('status, acknowledged_at')
      .eq('worker_id', worker_id)
      .eq('project_id', project_id)
      .eq('status', 'completed')
      .not('acknowledged_at', 'is', null)
      .limit(1)
      .single();

    if (!induction) {
      return new Response(
        JSON.stringify({ error: 'Worker must complete safety induction before generating QR code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Revoke any existing active QR codes for this worker-project combination
    await supabase
      .from('worker_qr_codes')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revocation_reason: 'Replaced by new QR code',
      })
      .eq('worker_id', worker_id)
      .eq('project_id', project_id)
      .eq('is_active', true);

    // Generate new QR token
    const qrToken = crypto.randomUUID();
    const validFrom = new Date();
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + valid_days);

    // Create new QR code record
    const { data: qrCode, error: qrError } = await supabase
      .from('worker_qr_codes')
      .insert({
        worker_id,
        project_id,
        qr_token: qrToken,
        valid_from: validFrom.toISOString(),
        valid_until: validUntil.toISOString(),
        is_active: true,
        tenant_id,
      })
      .select()
      .single();

    if (qrError) {
      console.error('Error creating QR code:', qrError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate QR code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log QR generation
    await supabase.from('contractor_module_audit_logs').insert({
      tenant_id,
      entity_type: 'worker_qr_code',
      entity_id: qrCode.id,
      action: 'qr_code_generated',
      new_value: {
        worker_id,
        project_id,
        valid_from: validFrom.toISOString(),
        valid_until: validUntil.toISOString(),
      },
    });

    // Generate QR code data URL (for display/download)
    const qrCodeData = {
      token: qrToken,
      worker: worker.full_name,
      project: project.project_name,
      valid_until: validUntil.toISOString(),
    };

    console.log(`QR code generated for worker ${worker.full_name} on project ${project.project_name}`);

    return new Response(
      JSON.stringify({
        success: true,
        qr_code_id: qrCode.id,
        qr_token: qrToken,
        qr_data: JSON.stringify(qrCodeData),
        worker_name: worker.full_name,
        project_name: project.project_name,
        valid_from: validFrom.toISOString(),
        valid_until: validUntil.toISOString(),
        mobile_number: worker.mobile_number,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating worker QR:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
