import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

// Simple in-memory rate limiter (per-token)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10; // Max requests per window
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute window

function checkRateLimit(token: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(token);
  
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(token, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  entry.count++;
  return true;
}

// UUID v4 validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(token: string): boolean {
  return UUID_REGEX.test(token);
}

function maskPhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return `****${digits.slice(-4)}`;
}

function maskNationalId(nationalId: string | null): string | null {
  if (!nationalId) return null;
  if (nationalId.length < 4) return '****';
  return `****${nationalId.slice(-4)}`;
}

interface ExpiryWarning {
  message: string;
  message_ar: string;
  expires_at: string;
  minutes_remaining: number;
}

interface PageContent {
  title?: string;
  subtitle?: string;
  visitor_name_label?: string;
  company_label?: string;
  host_label?: string;
  destination_label?: string;
  valid_until_label?: string;
  status_active?: string;
  status_inactive?: string;
  status_expired?: string;
  safety_title?: string;
  emergency_title?: string;
  qr_instruction?: string;
  save_badge?: string;
  share?: string;
  saving?: string;
  sharing?: string;
  invalid_badge_title?: string;
  invalid_badge_message?: string;
}

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
  is_expired: boolean;
  expiry_warning: ExpiryWarning | null;
  last_scanned_at: string | null;
  language: string;
  page_content: PageContent | null;
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

  const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';

  try {
    const body = await req.json().catch(() => ({}));
    const { token } = body;

    if (!token) {
      console.error(`[get-visitor-badge] No token provided from IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'No token provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate token format (must be UUID v4)
    if (!isValidUUID(token)) {
      console.error(`[get-visitor-badge] Invalid token format from IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'Invalid token format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting check
    if (!checkRateLimit(token)) {
      console.warn(`[get-visitor-badge] Rate limit exceeded for token: ${token.substring(0, 8)}... from IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } }
      );
    }

    console.log(`[get-visitor-badge] Looking up token: ${token.substring(0, 8)}... from IP: ${clientIP}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find visitor by QR token - with soft-delete filtering (HSSA compliance)
    const { data: visitor, error: visitorError } = await supabase
      .from('visitors')
      .select('id, full_name, company_name, national_id, phone, host_name, qr_code_token, tenant_id, is_active, visit_end_time, expiry_warning_sent_at, last_scanned_at, nationality')
      .eq('qr_code_token', token)
      .eq('is_active', true)
      .is('deleted_at', null) // Soft-delete filter
      .single();

    if (visitorError) {
      console.error(`[get-visitor-badge] Query error for token: ${token.substring(0, 8)}... from IP: ${clientIP}:`, visitorError.message);
      return new Response(
        JSON.stringify({ error: 'Visitor badge not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!visitor) {
      console.error(`[get-visitor-badge] Visitor not found for token: ${token.substring(0, 8)}... from IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'Visitor badge not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last_scanned_at and create scan notification
    const scanTime = new Date().toISOString();
    await supabase
      .from('visitors')
      .update({ last_scanned_at: scanTime })
      .eq('id', visitor.id);

    // Create scan alert notification for security team
    await supabase
      .from('in_app_notifications')
      .insert({
        tenant_id: visitor.tenant_id,
        title: 'Visitor Badge Scanned',
        title_ar: 'تم مسح بطاقة الزائر',
        body: `Visitor "${visitor.full_name}" badge was scanned at ${new Date().toLocaleString()}`,
        body_ar: `تم مسح بطاقة الزائر "${visitor.full_name}" في ${new Date().toLocaleString('ar-SA')}`,
        type: 'info',
        target_roles: ['admin', 'security_officer', 'receptionist'],
      });

    console.log(`[get-visitor-badge] Scan alert created for visitor: ${visitor.full_name}`);

    console.log(`[get-visitor-badge] Found visitor: ${visitor.full_name} (tenant: ${visitor.tenant_id})`);

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

    // Get tenant branding - explicit column selection
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, logo_light_url, logo_dark_url, brand_color, hsse_department_name, hsse_department_name_ar, visitor_hsse_instructions_en, visitor_hsse_instructions_ar, emergency_contact_number, emergency_contact_name')
      .eq('id', visitor.tenant_id)
      .single();

    // Get webpage notification settings
    // Resolve language from nationality (Visitor: Saudi/Arab -> ar, Others -> en)
    const nationality = visitor.nationality?.toUpperCase() || '';
    const ARAB_COUNTRIES = ['SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'JO', 'LB', 'SY', 'IQ', 'EG', 'SD', 'LY', 'TN', 'DZ', 'MA', 'YE', 'PS'];
    const resolvedLanguage: string = ARAB_COUNTRIES.includes(nationality) ? 'ar' : 'en';
    
    console.log(`[get-visitor-badge] Nationality: ${nationality}, Resolved language: ${resolvedLanguage}`);
    
    // Fetch dynamic page content for this language
    let pageContent: PageContent | null = null;
    const { data: contentVersion } = await supabase
      .from('page_content_versions')
      .select('content')
      .eq('tenant_id', visitor.tenant_id)
      .eq('page_type', 'visitor_badge')
      .eq('language', resolvedLanguage)
      .eq('status', 'published')
      .is('deleted_at', null)
      .maybeSingle();
    
    if (contentVersion?.content) {
      pageContent = contentVersion.content as unknown as PageContent;
      console.log(`[get-visitor-badge] Using dynamic content for language: ${resolvedLanguage}`);
    } else {
      // Fallback to English if no content found
      const { data: fallbackContent } = await supabase
        .from('page_content_versions')
        .select('content')
        .eq('tenant_id', visitor.tenant_id)
        .eq('page_type', 'visitor_badge')
        .eq('language', 'en')
        .eq('status', 'published')
        .is('deleted_at', null)
        .maybeSingle();
      
      if (fallbackContent?.content) {
        pageContent = fallbackContent.content as unknown as PageContent;
        console.log(`[get-visitor-badge] Fallback to English content`);
      }
    }

    const { data: settings } = await supabase
      .from('webpage_notification_settings')
      .select('visitor_webpage_enabled, visitor_allow_download, visitor_allow_share')
      .eq('tenant_id', visitor.tenant_id)
      .is('deleted_at', null)
      .maybeSingle();

    // Check if visitor pages are disabled
    if (settings && settings.visitor_webpage_enabled === false) {
      console.log(`[get-visitor-badge] Visitor pages disabled for tenant: ${visitor.tenant_id}`);
      return new Response(
        JSON.stringify({ error: 'This page is currently unavailable' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if visit is still valid (expiration enforcement)
    const now = new Date();
    const visitEndTime = visitor.visit_end_time ? new Date(visitor.visit_end_time) : null;
    const validUntil = request?.valid_until ? new Date(request.valid_until) : visitEndTime;
    const isExpired = validUntil ? validUntil < now : false;
    const isActive = request?.status === 'approved' && !isExpired;

    // Check for 1-hour expiration warning
    let expiryWarning = null;
    if (validUntil && !isExpired) {
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      const isExpiringWithinHour = validUntil <= oneHourFromNow;
      
      if (isExpiringWithinHour && !visitor.expiry_warning_sent_at) {
        const minutesRemaining = Math.round((validUntil.getTime() - now.getTime()) / (60 * 1000));
        expiryWarning = {
          message: `Your visitor badge will expire in ${minutesRemaining} minutes`,
          message_ar: `ستنتهي صلاحية بطاقة الزائر الخاصة بك خلال ${minutesRemaining} دقيقة`,
          expires_at: validUntil.toISOString(),
          minutes_remaining: minutesRemaining
        };

        // Mark warning as sent to prevent duplicates
        await supabase
          .from('visitors')
          .update({ expiry_warning_sent_at: now.toISOString() })
          .eq('id', visitor.id);

        // Create expiration warning notification
        await supabase
          .from('in_app_notifications')
          .insert({
            tenant_id: visitor.tenant_id,
            title: 'Visitor Badge Expiring Soon',
            title_ar: 'بطاقة الزائر ستنتهي قريباً',
            body: `Visitor "${visitor.full_name}" badge expires in ${minutesRemaining} minutes`,
            body_ar: `بطاقة الزائر "${visitor.full_name}" ستنتهي خلال ${minutesRemaining} دقيقة`,
            type: 'warning',
            target_roles: ['admin', 'security_officer', 'receptionist'],
          });

        console.log(`[get-visitor-badge] Expiry warning sent for visitor: ${visitor.full_name}, expires in ${minutesRemaining} minutes`);
      }
    }

    // Log badge access for audit
    console.log(`[get-visitor-badge] Badge accessed: visitor=${visitor.full_name}, active=${isActive}, expired=${isExpired}, IP=${clientIP}`);

    const response: VisitorBadgeData = {
      visitor_name: visitor.full_name,
      company_name: visitor.company_name,
      // SECURITY: Mask sensitive data
      national_id: maskNationalId(visitor.national_id),
      phone: maskPhone(visitor.phone),
      host_name: visitor.host_name,
      destination: siteName,
      valid_from: request?.valid_from || new Date().toISOString(),
      valid_until: request?.valid_until || new Date().toISOString(),
      qr_token: visitor.qr_code_token,
      status: isExpired ? 'expired' : (request?.status || 'pending'),
      is_active: isActive,
      is_expired: isExpired,
      expiry_warning: expiryWarning,
      last_scanned_at: visitor.last_scanned_at,
      language: resolvedLanguage,
      page_content: pageContent,
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

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[get-visitor-badge] Error from IP ${clientIP}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
