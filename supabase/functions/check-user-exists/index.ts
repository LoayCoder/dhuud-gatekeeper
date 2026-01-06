/**
 * check-user-exists Edge Function
 * 
 * MULTI-TENANT AWARE user existence check for the invitation flow.
 * 
 * Checks:
 * 1. If user exists in auth.users (global auth account)
 * 2. If user has a profile in the TARGET tenant (active, deleted, or inactive)
 * 
 * This enables:
 * - Same email to be invited to multiple tenants
 * - Deleted users to be re-invited to the same tenant
 * - Proper routing to login vs signup based on auth existence
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-edge-secret',
};

// In-memory rate limiting (resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // max 10 requests per minute per IP

function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  
  entry.count++;
  return false;
}

function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         req.headers.get('x-real-ip') || 
         'unknown';
}

interface CheckUserRequest {
  email: string;
  tenant_id: string; // REQUIRED: Must specify which tenant to check
}

interface CheckUserResponse {
  // Auth status
  exists_in_auth: boolean;           // User has a Supabase Auth account
  
  // Tenant-specific profile status
  exists_in_tenant: boolean;         // User has ANY profile in this tenant
  is_active_in_tenant: boolean;      // User has ACTIVE profile in this tenant
  is_deleted_in_tenant: boolean;     // User was deleted from this tenant
  is_inactive_in_tenant: boolean;    // User is inactive in this tenant
  
  // Computed routing flags
  should_login: boolean;             // Has auth account - route to login
  should_signup: boolean;            // No auth account - route to signup
  can_be_reactivated: boolean;       // Was deleted, can be re-invited
  
  // Legacy compatibility
  exists: boolean;                   // Can actively access this tenant
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting check
    const clientIP = getClientIP(req);
    if (isRateLimited(clientIP)) {
      console.warn(`Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: CheckUserRequest = await req.json();
    const { email, tenant_id } = body;

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: 'tenant_id is required for multi-tenant check' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Input validation - prevent email enumeration attacks
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 254) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Checking user existence:', email.substring(0, 3) + '***', 'Tenant:', tenant_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check auth.users for this email
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error('Error listing users:', authError);
      return new Response(
        JSON.stringify({ error: 'Failed to check user existence' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authUser = authData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    const existsInAuth = !!authUser;

    // Build response
    const response: CheckUserResponse = {
      exists_in_auth: existsInAuth,
      exists_in_tenant: false,
      is_active_in_tenant: false,
      is_deleted_in_tenant: false,
      is_inactive_in_tenant: false,
      should_login: existsInAuth,      // If auth exists, go to login
      should_signup: !existsInAuth,    // If no auth, go to signup
      can_be_reactivated: false,
      exists: false,                   // Legacy: true only if actively accessible
    };

    // Check for profile in THIS SPECIFIC TENANT
    if (authUser) {
      // Use user_id (multi-tenant) not id to find the profile
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, user_id, is_deleted, is_active, deleted_at')
        .eq('user_id', authUser.id)
        .eq('tenant_id', tenant_id)
        .maybeSingle();

      if (profileError) {
        console.error('Error checking profile:', profileError);
      }

      if (profile) {
        response.exists_in_tenant = true;
        response.is_deleted_in_tenant = profile.is_deleted === true || profile.deleted_at !== null;
        response.is_inactive_in_tenant = profile.is_active === false;
        response.is_active_in_tenant = !response.is_deleted_in_tenant && !response.is_inactive_in_tenant;
        response.can_be_reactivated = response.is_deleted_in_tenant;
        
        // Legacy: user "exists" for active access only if profile is active and not deleted
        response.exists = response.is_active_in_tenant;
      } else {
        // User has auth but NO profile in this tenant yet
        // They need to be invited/added to this tenant
        response.exists_in_tenant = false;
      }
    }

    console.log('User check result:', email.substring(0, 3) + '***', {
      auth: response.exists_in_auth,
      tenant: response.exists_in_tenant,
      active: response.is_active_in_tenant,
      deleted: response.is_deleted_in_tenant,
      route: response.should_login ? 'LOGIN' : 'SIGNUP'
    });

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-user-exists function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
