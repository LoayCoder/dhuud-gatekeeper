import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PageContent {
  title?: string;
  subtitle?: string;
  worker_name_label?: string;
  company_label?: string;
  project_label?: string;
  valid_until_label?: string;
  status_active?: string;
  status_revoked?: string;
  status_expired?: string;
  safety_title?: string;
  emergency_title?: string;
  qr_instruction?: string;
  save_pass?: string;
  share?: string;
}

interface WorkerAccessResponse {
  qr_token: string;
  valid_until: string;
  is_revoked: boolean;
  created_at: string;
  language: string;
  page_content: PageContent | null;
  worker: {
    full_name: string;
    nationality: string | null;
    company_name: string | null;
    worker_type: string | null; // 'worker' | 'site_representative' | 'safety_officer'
  };
  project: {
    project_name: string;
    tenant_name: string | null;
    hsse_instructions_ar: string | null;
    hsse_instructions_en: string | null;
    emergency_contact_number: string | null;
    emergency_contact_name: string | null;
  };
  tenant_branding: {
    logo_light_url: string | null;
    brand_color: string | null;
    hsse_department_name: string | null;
    hsse_department_name_ar: string | null;
  } | null;
  settings: {
    allow_download: boolean;
    allow_share: boolean;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    // Validate token format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!token || !uuidRegex.test(token)) {
      console.error('[get-worker-access-pass] Invalid token format:', token);
      return new Response(
        JSON.stringify({ error: 'Invalid token format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[get-worker-access-pass] Fetching worker access pass for token:', token);

    // Create admin client to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch worker QR code with related data
    const { data: qrData, error: qrError } = await supabaseAdmin
      .from('worker_qr_codes')
      .select(`
        id,
        qr_token,
        valid_until,
        is_revoked,
        created_at,
        worker_id,
        project_id
      `)
      .eq('qr_token', token)
      .is('deleted_at', null)
      .maybeSingle();

    if (qrError) {
      console.error('[get-worker-access-pass] Error fetching QR code:', qrError);
      throw qrError;
    }

    if (!qrData) {
      console.log('[get-worker-access-pass] No QR code found for token:', token);
      return new Response(
        JSON.stringify({ error: 'Access pass not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch worker data including worker_type
    const { data: workerData, error: workerError } = await supabaseAdmin
      .from('contractor_workers')
      .select(`
        full_name,
        nationality,
        company_id,
        worker_type
      `)
      .eq('id', qrData.worker_id)
      .is('deleted_at', null)
      .maybeSingle();

    if (workerError) {
      console.error('[get-worker-access-pass] Error fetching worker:', workerError);
    }

    // Fetch company name if worker has company
    let companyName: string | null = null;
    if (workerData?.company_id) {
      const { data: companyData } = await supabaseAdmin
        .from('contractor_companies')
        .select('company_name')
        .eq('id', workerData.company_id)
        .maybeSingle();
      companyName = companyData?.company_name || null;
    }

    // Fetch project and tenant data
    const { data: projectData, error: projectError } = await supabaseAdmin
      .from('contractor_projects')
      .select(`
        project_name,
        tenant_id
      `)
      .eq('id', qrData.project_id)
      .is('deleted_at', null)
      .maybeSingle();

    if (projectError) {
      console.error('[get-worker-access-pass] Error fetching project:', projectError);
    }

    // Fetch tenant data with branding
    let tenantData: {
      name: string | null;
      visitor_hsse_instructions_ar: string | null;
      visitor_hsse_instructions_en: string | null;
      emergency_contact_number: string | null;
      emergency_contact_name: string | null;
      logo_light_url: string | null;
      brand_color: string | null;
      hsse_department_name: string | null;
      hsse_department_name_ar: string | null;
    } | null = null;

    let tenantId: string | null = null;

    if (projectData?.tenant_id) {
      tenantId = projectData.tenant_id;
      const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select(`
          name,
          visitor_hsse_instructions_ar,
          visitor_hsse_instructions_en,
          emergency_contact_number,
          emergency_contact_name,
          logo_light_url,
          brand_color,
          hsse_department_name,
          hsse_department_name_ar
        `)
        .eq('id', projectData.tenant_id)
        .maybeSingle();
      tenantData = tenant;
    }

    // Fetch webpage notification settings for this tenant
    let webpageSettings = {
      worker_webpage_enabled: true,
      worker_allow_download: true,
      worker_allow_share: true,
    };

    if (tenantId) {
      const { data: settingsData } = await supabaseAdmin
        .from('webpage_notification_settings')
        .select('worker_webpage_enabled, worker_allow_download, worker_allow_share')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .maybeSingle();

      if (settingsData) {
        webpageSettings = settingsData;
      }
    }

    // Check if worker pages are disabled
    if (!webpageSettings.worker_webpage_enabled) {
      console.log('[get-worker-access-pass] Worker pages disabled for tenant:', tenantId);
      return new Response(
        JSON.stringify({ error: 'This page is currently unavailable' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Resolve language from worker nationality
    const nationality = workerData?.nationality?.toUpperCase() || '';
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
    
    console.log(`[get-worker-access-pass] Nationality: ${nationality}, Resolved language: ${resolvedLanguage}`);
    
    // Fetch dynamic page content for this language
    let pageContent: PageContent | null = null;
    if (tenantId) {
      const { data: contentVersion } = await supabaseAdmin
        .from('page_content_versions')
        .select('content')
        .eq('tenant_id', tenantId)
        .eq('page_type', 'worker_pass')
        .eq('language', resolvedLanguage)
        .eq('status', 'published')
        .is('deleted_at', null)
        .maybeSingle();
      
      if (contentVersion?.content) {
        pageContent = contentVersion.content as unknown as PageContent;
        console.log(`[get-worker-access-pass] Using dynamic content for language: ${resolvedLanguage}`);
      } else {
        // Fallback to English if no content found
        const { data: fallbackContent } = await supabaseAdmin
          .from('page_content_versions')
          .select('content')
          .eq('tenant_id', tenantId)
          .eq('page_type', 'worker_pass')
          .eq('language', 'en')
          .eq('status', 'published')
          .is('deleted_at', null)
          .maybeSingle();
        
        if (fallbackContent?.content) {
          pageContent = fallbackContent.content as unknown as PageContent;
          console.log(`[get-worker-access-pass] Fallback to English content`);
        }
      }
    }

    // Build response with only necessary public data
    const response: WorkerAccessResponse = {
      qr_token: qrData.qr_token,
      valid_until: qrData.valid_until,
      is_revoked: qrData.is_revoked,
      created_at: qrData.created_at,
      language: resolvedLanguage,
      page_content: pageContent,
      worker: {
        full_name: workerData?.full_name || 'Unknown Worker',
        nationality: workerData?.nationality || null,
        company_name: companyName,
        worker_type: workerData?.worker_type || 'worker',
      },
      project: {
        project_name: projectData?.project_name || 'Unknown Project',
        tenant_name: tenantData?.name || null,
        hsse_instructions_ar: tenantData?.visitor_hsse_instructions_ar || null,
        hsse_instructions_en: tenantData?.visitor_hsse_instructions_en || null,
        emergency_contact_number: tenantData?.emergency_contact_number || null,
        emergency_contact_name: tenantData?.emergency_contact_name || null,
      },
      tenant_branding: tenantData ? {
        logo_light_url: tenantData.logo_light_url || null,
        brand_color: tenantData.brand_color || null,
        hsse_department_name: tenantData.hsse_department_name || null,
        hsse_department_name_ar: tenantData.hsse_department_name_ar || null,
      } : null,
      settings: {
        allow_download: webpageSettings.worker_allow_download,
        allow_share: webpageSettings.worker_allow_share,
      },
    };

    console.log('[get-worker-access-pass] Successfully fetched access pass for:', workerData?.full_name);

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[get-worker-access-pass] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
