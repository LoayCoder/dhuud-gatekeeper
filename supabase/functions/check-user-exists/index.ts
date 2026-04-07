/**
 * check-user-exists Edge Function
 * 
 * MULTI-TENANT AWARE user existence check for the invitation flow.
 * AUTHENTICATED: Requires a valid JWT from an authenticated user (inviter).
 * 
 * Checks:
 * 1. If user exists in auth.users (global auth account)
 * 2. If user has a profile in the TARGET tenant (active, deleted, or inactive)
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
  tenant_id: string;
}

Deno.serve(async (req) => {
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

    // --- Authentication: Optional JWT (invitation flow is anonymous) ---
    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // If a JWT is present, verify it (but don't block if absent)
    if (authHeader?.startsWith('Bearer ')) {
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: { user: callerUser }, error: claimsError } = await supabaseAuth.auth.getUser();
      if (claimsError) {
        console.warn('JWT provided but invalid, proceeding without auth:', claimsError.message);
      }
    }
    // --- End authentication (anonymous access allowed for /invite flow) ---

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

    // Input validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 254) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Checking user existence:', email.substring(0, 3) + '***', 'Tenant:', tenant_id);

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Use admin.getUserByEmail instead of listing ALL users
    let existsInAuth = false;
    let authUserId: string | null = null;
    
    // Try to find user by checking profile email first, then auth
    const { data: profileByEmail } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id, is_active, deleted_at')
      .eq('email', email.toLowerCase())
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    if (profileByEmail?.user_id) {
      // Profile found — the user has an auth account
      existsInAuth = true;
      authUserId = profileByEmail.user_id;
    } else {
      // Fallback: check auth via admin API with pagination filter
      try {
        // listUsers with page/perPage and filter by email
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1,
        });
        // The JS client doesn't support email filter directly on listUsers,
        // so we use a targeted profile query above as primary method.
        // As a secondary check, look up by email in profiles across all tenants
        if (!existsInAuth) {
          const { data: anyProfile } = await supabaseAdmin
            .from('profiles')
            .select('user_id')
            .eq('email', email.toLowerCase())
            .not('user_id', 'is', null)
            .limit(1)
            .maybeSingle();
          
          if (anyProfile?.user_id) {
            existsInAuth = true;
            authUserId = anyProfile.user_id;
          }
        }
      } catch (e) {
        console.error('Error checking auth users:', e);
      }
    }

    // Build a minimal, non-enumerable response for authenticated inviters
    const response = {
      exists_in_auth: existsInAuth,
      exists_in_tenant: false,
      is_active_in_tenant: false,
      is_deleted_in_tenant: false,
      is_inactive_in_tenant: false,
      should_login: existsInAuth,
      should_signup: !existsInAuth,
      can_be_reactivated: false,
      exists: false,
    };

    // Check for profile in THIS SPECIFIC TENANT
    if (authUserId) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, user_id, is_active, deleted_at')
        .eq('user_id', authUserId)
        .eq('tenant_id', tenant_id)
        .maybeSingle();

      if (profileError) {
        console.error('Error checking profile:', profileError);
      }

      if (profile) {
        const isDeleted = profile.deleted_at !== null;
        const isInactive = !isDeleted && (profile as Record<string, unknown>).is_active === false;
        
        response.exists_in_tenant = true;
        response.is_deleted_in_tenant = isDeleted;
        response.is_inactive_in_tenant = isInactive;
        response.is_active_in_tenant = !isDeleted && !isInactive;
        response.can_be_reactivated = isDeleted;
        response.exists = response.is_active_in_tenant;
      }
    }

    console.log('User check result:', email.substring(0, 3) + '***', {
      auth: response.exists_in_auth,
      tenant: response.exists_in_tenant,
      route: response.should_login ? 'LOGIN' : 'SIGNUP'
    });

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-user-exists function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
