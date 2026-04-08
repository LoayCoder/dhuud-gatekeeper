import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendInductionToWorker } from "../_shared/induction-sender.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InductionRequest {
  // Support both camelCase (frontend) and snake_case formats
  workerId?: string;
  worker_id?: string;
  videoId?: string;
  video_id?: string;
  projectId?: string;
  project_id?: string;
  tenantId?: string;
  tenant_id?: string;
  inductionId?: string;
  induction_id?: string;
  mobileNumber?: string;
  mobile_number?: string;
  language?: string;
  isResend?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: InductionRequest = await req.json();

    // Normalize field names (support both camelCase and snake_case)
    const workerId = body.workerId || body.worker_id;
    const videoId = body.videoId || body.video_id;
    const projectId = body.projectId || body.project_id;
    const tenantId = body.tenantId || body.tenant_id;

    console.log('[Induction] Request received:', { workerId, videoId, projectId, tenantId });

    if (!workerId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: workerId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve tenant_id if not provided
    let resolvedTenantId = tenantId;
    if (!resolvedTenantId) {
      const { data: worker } = await supabase
        .from('contractor_workers')
        .select('tenant_id')
        .eq('id', workerId)
        .single();
      resolvedTenantId = worker?.tenant_id;
    }

    if (!resolvedTenantId) {
      return new Response(
        JSON.stringify({ error: 'Could not resolve tenant_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delegate to shared induction sender
    const result = await sendInductionToWorker(supabase, {
      workerId,
      projectId: projectId || null,
      videoId: videoId || null,
      tenantId: resolvedTenantId,
    });

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error,
          induction_id: result.inductionId,
          video_title: result.videoTitle,
          project_name: result.projectName,
        }),
        { status: result.error === 'Worker not found' ? 404 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Induction video sent successfully',
        induction_id: result.inductionId,
        video_title: result.videoTitle,
        project_name: result.projectName,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending induction video:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
