/**
 * validate-user-access Edge Function
 * 
 * Validates if a user can access the system after Supabase Auth succeeds.
 * Checks:
 * 1. Profile exists for this user in the target tenant
 * 2. Profile is NOT deleted (is_deleted = false)
 * 3. Profile is active (is_active = true)
 * 4. Returns tenant-scoped MFA status
 * 
 * Called immediately after successful login to enforce tenant isolation
 * and deleted user blocking.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationRequest {
  target_tenant_id?: string; // Optional: validate access for specific tenant
}

interface ValidationResponse {
  allowed: boolean;
  reason?: 'user_deleted' | 'user_inactive' | 'profile_not_found' | 'tenant_mismatch' | 'missing_auth' | 'invalid_auth' | 'server_error';
  tenant_id?: string;
  tenant_name?: string;
  requires_mfa_setup?: boolean;
  user_id?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ allowed: false, reason: 'missing_auth' } as ValidationResponse),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user client to verify the token
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the user's token
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      console.error('Auth verification failed:', authError?.message);
      return new Response(
        JSON.stringify({ allowed: false, reason: 'invalid_auth' } as ValidationResponse),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body (optional)
    let body: ValidationRequest = {};
    try {
      const text = await req.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      // Empty body is OK
    }

    // Create admin client for profile lookup
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user's profile - explicitly select only needed columns (data minimization)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, tenant_id, is_deleted, is_active, full_name')
      .eq('id', user.id)
      .is('deleted_at', null) // Extra safety check
      .single();

    if (profileError || !profile) {
      console.warn('Profile not found for user:', user.id);
      return new Response(
        JSON.stringify({ 
          allowed: false, 
          reason: 'profile_not_found',
          user_id: user.id
        } as ValidationResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is deleted
    if (profile.is_deleted === true) {
      console.warn('Deleted user attempted login:', user.id);
      
      // Log security event
      await supabaseAdmin.from('security_audit_logs').insert({
        tenant_id: profile.tenant_id,
        actor_id: user.id,
        action: 'deleted_user_login_blocked',
        table_name: 'profiles',
        record_id: user.id,
        new_value: { email: user.email, blocked_at: new Date().toISOString() }
      });

      return new Response(
        JSON.stringify({ 
          allowed: false, 
          reason: 'user_deleted',
          user_id: user.id
        } as ValidationResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is inactive
    if (profile.is_active === false) {
      console.warn('Inactive user attempted login:', user.id);
      
      // Log security event
      await supabaseAdmin.from('security_audit_logs').insert({
        tenant_id: profile.tenant_id,
        actor_id: user.id,
        action: 'inactive_user_login_blocked',
        table_name: 'profiles',
        record_id: user.id,
        new_value: { email: user.email, blocked_at: new Date().toISOString() }
      });

      return new Response(
        JSON.stringify({ 
          allowed: false, 
          reason: 'user_inactive',
          user_id: user.id
        } as ValidationResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If target tenant specified, validate it matches
    if (body.target_tenant_id && body.target_tenant_id !== profile.tenant_id) {
      console.warn('Tenant mismatch for user:', user.id, 'Expected:', body.target_tenant_id, 'Got:', profile.tenant_id);
      return new Response(
        JSON.stringify({ 
          allowed: false, 
          reason: 'tenant_mismatch',
          user_id: user.id
        } as ValidationResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch tenant name
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('name')
      .eq('id', profile.tenant_id)
      .single();

    // Check tenant-scoped MFA status
    const { data: mfaStatus } = await supabaseAdmin
      .from('tenant_user_mfa_status')
      .select('requires_setup, mfa_verified_at')
      .eq('user_id', user.id)
      .eq('tenant_id', profile.tenant_id)
      .single();

    // If no MFA status record exists for this tenant, user needs to set up MFA
    const requiresMfaSetup = !mfaStatus || mfaStatus.requires_setup === true;

    console.log('User access validated:', user.id, 'Tenant:', profile.tenant_id, 'MFA required:', requiresMfaSetup);

    return new Response(
      JSON.stringify({ 
        allowed: true,
        tenant_id: profile.tenant_id,
        tenant_name: tenant?.name || 'Unknown',
        requires_mfa_setup: requiresMfaSetup,
        user_id: user.id
      } as ValidationResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in validate-user-access:', error);
    return new Response(
      JSON.stringify({ allowed: false, reason: 'server_error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
