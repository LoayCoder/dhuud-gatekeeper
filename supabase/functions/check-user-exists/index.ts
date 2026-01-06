/**
 * check-user-exists Edge Function
 * 
 * TENANT-AWARE user existence check for the invitation flow.
 * 
 * Now checks:
 * 1. If user exists in auth.users
 * 2. If user has an ACTIVE profile in the TARGET tenant (not deleted, not inactive)
 * 
 * This ensures that:
 * - Deleted users are treated as "new" for re-invitation purposes
 * - Users from other tenants are treated as "new" for this tenant
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
  tenant_id?: string; // Optional: check if user exists in specific tenant
}

interface CheckUserResponse {
  exists: boolean;
  exists_in_auth: boolean;        // User exists in auth.users
  exists_in_tenant: boolean;      // User has active profile in target tenant
  is_deleted_in_tenant: boolean;  // User was deleted from target tenant
  is_inactive_in_tenant: boolean; // User is inactive in target tenant
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

    // Input validation - prevent email enumeration attacks
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 254) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Checking if user exists (rate-limited):', email.substring(0, 3) + '***', 'Tenant:', tenant_id || 'any');

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Create Supabase admin client for user lookup
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check auth.users
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

    // Default response
    const response: CheckUserResponse = {
      exists: false,
      exists_in_auth: existsInAuth,
      exists_in_tenant: false,
      is_deleted_in_tenant: false,
      is_inactive_in_tenant: false
    };

    // If tenant_id provided, check tenant-specific status
    if (tenant_id && authUser) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, is_deleted, is_active, deleted_at')
        .eq('id', authUser.id)
        .eq('tenant_id', tenant_id)
        .single();

      if (profile) {
        response.exists_in_tenant = true;
        response.is_deleted_in_tenant = profile.is_deleted === true || profile.deleted_at !== null;
        response.is_inactive_in_tenant = profile.is_active === false;
        
        // User "exists" for login purposes only if active and not deleted in this tenant
        response.exists = !response.is_deleted_in_tenant && !response.is_inactive_in_tenant;
      } else {
        // User exists in auth but NOT in this tenant - treat as new for this tenant
        response.exists = false;
      }
    } else if (existsInAuth) {
      // No tenant specified - check if user has ANY active profile
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, is_deleted, is_active, deleted_at')
        .eq('id', authUser.id)
        .is('deleted_at', null)
        .eq('is_deleted', false)
        .eq('is_active', true)
        .single();

      response.exists = !!profile;
    }

    // Log without revealing the full email
    console.log('User check completed:', email.substring(0, 3) + '***', 
      'AuthExists:', response.exists_in_auth, 
      'TenantExists:', response.exists_in_tenant,
      'CanLogin:', response.exists);

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
