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
        tenant_id,
        worker:contractor_workers(
          id,
          full_name,
          full_name_ar,
          preferred_language,
          nationality
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

    // Fetch tenant branding
    let tenantBranding: {
      name: string | null;
      logo_light_url: string | null;
      brand_color: string | null;
      hsse_department_name: string | null;
      hsse_department_name_ar: string | null;
    } | null = null;

    // Fetch webpage settings
    let webpageSettings = {
      worker_webpage_enabled: true,
      worker_allow_download: true,
      worker_allow_share: true,
    };

    if (induction.tenant_id) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select(`
          name,
          logo_light_url,
          brand_color,
          hsse_department_name,
          hsse_department_name_ar
        `)
        .eq('id', induction.tenant_id)
        .maybeSingle();
      tenantBranding = tenant;

      // Fetch webpage notification settings
      const { data: settingsData } = await supabase
        .from('webpage_notification_settings')
        .select('worker_webpage_enabled, worker_allow_download, worker_allow_share')
        .eq('tenant_id', induction.tenant_id)
        .is('deleted_at', null)
        .maybeSingle();

      if (settingsData) {
        webpageSettings = settingsData;
      }
    }

    // Check if worker pages are disabled
    if (!webpageSettings.worker_webpage_enabled) {
      console.log('[GetInduction] Worker pages disabled for tenant:', induction.tenant_id);
      return new Response(
        JSON.stringify({ error: 'This page is currently unavailable' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Type assertions for nested objects
    const worker = induction.worker as any;
    const project = induction.project as any;
    const video = induction.video as any;

    // Resolve language from worker nationality
    const nationality = worker?.nationality?.toUpperCase() || '';
    const ARAB_COUNTRIES = ['SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'JO', 'LB', 'SY', 'IQ', 'EG', 'SD', 'LY', 'TN', 'DZ', 'MA', 'YE', 'PS'];
    let resolvedLanguage = 'en';
    
    if (ARAB_COUNTRIES.includes(nationality)) {
      resolvedLanguage = 'ar';
    } else if (nationality === 'IN') {
      resolvedLanguage = 'hi';
    } else if (nationality === 'PK') {
      resolvedLanguage = 'ur';
    } else if (nationality === 'PH') {
      resolvedLanguage = 'fil';
    } else if (nationality === 'CN') {
      resolvedLanguage = 'zh';
    }
    
    console.log(`[GetInduction] Nationality: ${nationality}, Resolved language: ${resolvedLanguage}`);
    
    // Fetch dynamic page content for this language
    let pageContent: Record<string, string> | null = null;
    if (induction.tenant_id) {
      const { data: contentVersion } = await supabase
        .from('page_content_versions')
        .select('content')
        .eq('tenant_id', induction.tenant_id)
        .eq('page_type', 'worker_induction')
        .eq('language', resolvedLanguage)
        .eq('status', 'published')
        .is('deleted_at', null)
        .maybeSingle();
      
      if (contentVersion?.content) {
        pageContent = contentVersion.content as Record<string, string>;
        console.log(`[GetInduction] Using dynamic content for language: ${resolvedLanguage}`);
      } else {
        // Fallback to English if no content found
        const { data: fallbackContent } = await supabase
          .from('page_content_versions')
          .select('content')
          .eq('tenant_id', induction.tenant_id)
          .eq('page_type', 'worker_induction')
          .eq('language', 'en')
          .eq('status', 'published')
          .is('deleted_at', null)
          .maybeSingle();
        
        if (fallbackContent?.content) {
          pageContent = fallbackContent.content as Record<string, string>;
          console.log(`[GetInduction] Fallback to English content`);
        }
      }
    }

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
      language: resolvedLanguage,
      page_content: pageContent,
      status: induction.status,
      expires_at: induction.expires_at,
      acknowledged_at: induction.acknowledged_at,
      // Tenant branding
      tenant_name: tenantBranding?.name || null,
      tenant_logo_url: tenantBranding?.logo_light_url || null,
      brand_color: tenantBranding?.brand_color || null,
      hsse_department_name: tenantBranding?.hsse_department_name || null,
      hsse_department_name_ar: tenantBranding?.hsse_department_name_ar || null,
      // Settings
      settings: {
        allow_download: webpageSettings.worker_allow_download,
        allow_share: webpageSettings.worker_allow_share,
      },
    };

    console.log('[GetInduction] Returning data for worker:', worker?.full_name, 'tenant:', tenantBranding?.name);

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
