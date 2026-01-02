import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VisitorBadgeData {
  visitor_name: string;
  company_name: string | null;
  national_id: string | null;
  phone: string | null;
  host_name: string | null;
  destination: string | null;
  valid_from: string;
  valid_until: string;
  qr_token: string;
  status: string;
  is_active: boolean;
  tenant_branding: {
    name: string;
    logo_light_url: string | null;
    logo_dark_url: string | null;
    brand_color: string | null;
    hsse_department_name: string | null;
    hsse_department_name_ar: string | null;
    visitor_hsse_instructions_en: string | null;
    visitor_hsse_instructions_ar: string | null;
    emergency_contact_number: string | null;
    emergency_contact_name: string | null;
  } | null;
  settings: {
    allow_download: boolean;
    allow_share: boolean;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token) {
      console.error('[get-visitor-badge] No token provided');
      return new Response(
        JSON.stringify({ error: 'No token provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[get-visitor-badge] Looking up token: ${token.substring(0, 8)}...`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find visitor by QR token
    const { data: visitor, error: visitorError } = await supabase
      .from('visitors')
      .select(`
        id, full_name, company_name, national_id, phone, 
        host_name, qr_code_token, tenant_id
      `)
      .eq('qr_code_token', token)
      .is('deleted_at', null)
      .single();

    if (visitorError || !visitor) {
      console.error('[get-visitor-badge] Visitor not found:', visitorError?.message);
      return new Response(
        JSON.stringify({ error: 'Visitor badge not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[get-visitor-badge] Found visitor: ${visitor.full_name}`);

    // Get the latest approved visit request for this visitor
    const { data: visitRequests } = await supabase
      .from('visit_requests')
      .select('id, status, valid_from, valid_until, site_id')
      .eq('visitor_id', visitor.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1);

    let request = visitRequests?.[0] || null;
    let siteName: string | null = null;

    if (!request) {
      // Try to find any visit request
      const { data: anyRequests } = await supabase
        .from('visit_requests')
        .select('id, status, valid_from, valid_until, site_id')
        .eq('visitor_id', visitor.id)
        .order('created_at', { ascending: false })
        .limit(1);

      request = anyRequests?.[0] || null;
    }

    // Get site name if we have a request with site_id
    if (request?.site_id) {
      const { data: site } = await supabase
        .from('sites')
        .select('name')
        .eq('id', request.site_id)
        .single();
      siteName = site?.name || null;
    }

    // Get tenant branding
    const { data: tenant } = await supabase
      .from('tenants')
      .select(`
        name, logo_light_url, logo_dark_url, brand_color,
        hsse_department_name, hsse_department_name_ar,
        visitor_hsse_instructions_en, visitor_hsse_instructions_ar,
        emergency_contact_number, emergency_contact_name
      `)
      .eq('id', visitor.tenant_id)
      .single();

    // Get webpage notification settings
    const { data: settings } = await supabase
      .from('webpage_notification_settings')
      .select('visitor_allow_download, visitor_allow_share')
      .eq('tenant_id', visitor.tenant_id)
      .is('deleted_at', null)
      .single();

    // Check if visit is still valid
    const now = new Date();
    const validUntil = request?.valid_until ? new Date(request.valid_until) : null;
    const isExpired = validUntil ? validUntil < now : false;
    const isActive = request?.status === 'approved' && !isExpired;

    const response: VisitorBadgeData = {
      visitor_name: visitor.full_name,
      company_name: visitor.company_name,
      national_id: visitor.national_id ? `***${visitor.national_id.slice(-4)}` : null,
      phone: visitor.phone,
      host_name: visitor.host_name,
      destination: siteName,
      valid_from: request?.valid_from || new Date().toISOString(),
      valid_until: request?.valid_until || new Date().toISOString(),
      qr_token: visitor.qr_code_token,
      status: request?.status || 'pending',
      is_active: isActive,
      tenant_branding: tenant ? {
        name: tenant.name,
        logo_light_url: tenant.logo_light_url,
        logo_dark_url: tenant.logo_dark_url,
        brand_color: tenant.brand_color,
        hsse_department_name: tenant.hsse_department_name,
        hsse_department_name_ar: tenant.hsse_department_name_ar,
        visitor_hsse_instructions_en: tenant.visitor_hsse_instructions_en,
        visitor_hsse_instructions_ar: tenant.visitor_hsse_instructions_ar,
        emergency_contact_number: tenant.emergency_contact_number,
        emergency_contact_name: tenant.emergency_contact_name,
      } : null,
      settings: {
        allow_download: settings?.visitor_allow_download ?? true,
        allow_share: settings?.visitor_allow_share ?? true,
      },
    };

    console.log(`[get-visitor-badge] Returning badge for ${visitor.full_name}, active: ${isActive}`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[get-visitor-badge] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
