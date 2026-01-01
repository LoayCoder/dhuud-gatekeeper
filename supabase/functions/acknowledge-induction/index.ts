import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AcknowledgeRequest {
  inductionId?: string;
  induction_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: AcknowledgeRequest = await req.json();
    const inductionId = body.inductionId || body.induction_id;

    console.log('[AcknowledgeInduction] Request for:', inductionId);

    if (!inductionId) {
      return new Response(
        JSON.stringify({ error: 'Missing induction ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch induction to verify it exists and is valid
    const { data: induction, error: fetchError } = await supabase
      .from('worker_inductions')
      .select(`
        id,
        status,
        acknowledged_at,
        expires_at,
        worker_id,
        video_id,
        project_id,
        tenant_id,
        worker:contractor_workers(full_name)
      `)
      .eq('id', inductionId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !induction) {
      console.error('[AcknowledgeInduction] Not found:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Induction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already acknowledged
    if (induction.acknowledged_at) {
      console.log('[AcknowledgeInduction] Already acknowledged');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Already acknowledged',
          acknowledged_at: induction.acknowledged_at 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if expired
    const expiresAt = new Date(induction.expires_at);
    if (expiresAt < new Date()) {
      return new Response(
        JSON.stringify({ error: 'This induction has expired' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date().toISOString();

    // Update induction record
    const { error: updateError } = await supabase
      .from('worker_inductions')
      .update({
        acknowledged_at: now,
        acknowledgment_method: 'web',
        status: 'completed',
        updated_at: now,
      })
      .eq('id', inductionId);

    if (updateError) {
      console.error('[AcknowledgeInduction] Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save acknowledgment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log to audit table
    const worker = induction.worker as any;
    await supabase.from('contractor_module_audit_logs').insert({
      tenant_id: induction.tenant_id,
      entity_type: 'worker_induction',
      entity_id: induction.worker_id,
      action: 'induction_acknowledged',
      new_value: {
        induction_id: inductionId,
        video_id: induction.video_id,
        project_id: induction.project_id,
        acknowledged_at: now,
        acknowledgment_method: 'web',
      },
    });

    console.log('[AcknowledgeInduction] Success for worker:', worker?.full_name);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Induction acknowledged successfully',
        acknowledged_at: now,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[AcknowledgeInduction] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
