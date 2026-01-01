import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GetInductionRequest {
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

    const body: GetInductionRequest = await req.json();
    const inductionId = body.inductionId || body.induction_id;

    console.log('[GetInduction] Request for:', inductionId);

    if (!inductionId) {
      return new Response(
        JSON.stringify({ error: 'Missing induction ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch induction with related data
    const { data: induction, error: inductionError } = await supabase
      .from('worker_inductions')
      .select(`
        id,
        status,
        sent_at,
        viewed_at,
        acknowledged_at,
        acknowledgment_method,
        expires_at,
        worker:contractor_workers(
          id,
          full_name,
          full_name_ar,
          preferred_language
        ),
        project:contractor_projects(
          project_name
        ),
        video:induction_videos(
          id,
          title,
          title_ar,
          video_url,
          duration_seconds,
          language
        )
      `)
      .eq('id', inductionId)
      .is('deleted_at', null)
      .single();

    if (inductionError || !induction) {
      console.error('[GetInduction] Not found:', inductionError);
      return new Response(
        JSON.stringify({ error: 'Induction not found or expired' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if expired
    const expiresAt = new Date(induction.expires_at);
    if (expiresAt < new Date()) {
      return new Response(
        JSON.stringify({ error: 'This induction link has expired' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Type assertions for nested objects
    const worker = induction.worker as any;
    const project = induction.project as any;
    const video = induction.video as any;

    // Update viewed_at if not already set
    if (!induction.viewed_at) {
      await supabase
        .from('worker_inductions')
        .update({ 
          viewed_at: new Date().toISOString(),
          status: induction.status === 'sent' ? 'viewed' : induction.status
        })
        .eq('id', inductionId);
    }

    const response = {
      id: induction.id,
      worker_name: worker?.full_name || 'Unknown',
      worker_name_ar: worker?.full_name_ar,
      project_name: project?.project_name,
      video_title: video?.title || 'Safety Induction',
      video_title_ar: video?.title_ar,
      video_url: video?.video_url || '',
      duration_seconds: video?.duration_seconds || 0,
      language: worker?.preferred_language || video?.language || 'en',
      status: induction.status,
      expires_at: induction.expires_at,
      acknowledged_at: induction.acknowledged_at,
    };

    console.log('[GetInduction] Returning data for worker:', worker?.full_name);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[GetInduction] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
