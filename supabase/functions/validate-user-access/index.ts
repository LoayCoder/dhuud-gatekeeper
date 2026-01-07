/**
 * validate-user-access Edge Function
 * 
 * MULTI-TENANT AWARE access validation after Supabase Auth succeeds.
 * 
 * Checks:
 * 1. Profile exists for this user in the target tenant (using user_id + tenant_id)
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
  profile_id?: string; // The actual profile ID in this tenant
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

    // MULTI-TENANT: Fetch user's profile using user_id, optionally filtered by tenant
    let profileQuery = supabaseAdmin
      .from('profiles')
      .select('id, user_id, tenant_id, is_deleted, is_active, full_name, deleted_at')
      .eq('user_id', user.id); // Use user_id for multi-tenant lookup

    // If target tenant specified, only check that tenant
    if (body.target_tenant_id) {
      profileQuery = profileQuery.eq('tenant_id', body.target_tenant_id);
    }

    // Filter to non-deleted first, but we'll check status explicitly
    const { data: profiles, error: profileError } = await profileQuery;

    if (profileError) {
      console.error('Profile query error:', profileError);
      return new Response(
        JSON.stringify({ 
          allowed: false, 
          reason: 'server_error',
          user_id: user.id
        } as ValidationResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no profiles found at all
    if (!profiles || profiles.length === 0) {
      console.warn('No profile found for user:', user.id, 'Target tenant:', body.target_tenant_id);
      return new Response(
        JSON.stringify({ 
          allowed: false, 
          reason: 'profile_not_found',
          user_id: user.id
        } as ValidationResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find an active, non-deleted profile (prefer target tenant if specified)
    let profile = profiles.find(p => !p.is_deleted && p.is_active && !p.deleted_at);
    
    // If no active profile, check if user has deleted/inactive profiles for better error messages
    if (!profile) {
      const deletedProfile = profiles.find(p => p.is_deleted || p.deleted_at);
      const inactiveProfile = profiles.find(p => !p.is_active);
      
      if (deletedProfile) {
        console.warn('Deleted user attempted login:', user.id);
        
        // Log security event
        await supabaseAdmin.from('security_audit_logs').insert({
          tenant_id: deletedProfile.tenant_id,
          actor_id: user.id,
          action: 'deleted_user_login_blocked',
          action_category: 'authentication',
          result: 'blocked',
          entity_type: 'profile',
          entity_id: deletedProfile.id,
          entity_identifier: user.email,
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

      if (inactiveProfile) {
        console.warn('Inactive user attempted login:', user.id);
        
        // Log security event
        await supabaseAdmin.from('security_audit_logs').insert({
          tenant_id: inactiveProfile.tenant_id,
          actor_id: user.id,
          action: 'inactive_user_login_blocked',
          action_category: 'authentication',
          result: 'blocked',
          entity_type: 'profile',
          entity_id: inactiveProfile.id,
          entity_identifier: user.email,
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
    }

    // We have an active profile
    if (!profile) {
      // Shouldn't reach here, but safety check
      return new Response(
        JSON.stringify({ 
          allowed: false, 
          reason: 'profile_not_found',
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

    console.log('User access validated:', user.id, 'Profile:', profile.id, 'Tenant:', profile.tenant_id, 'MFA required:', requiresMfaSetup);

    return new Response(
      JSON.stringify({ 
        allowed: true,
        tenant_id: profile.tenant_id,
        tenant_name: tenant?.name || 'Unknown',
        requires_mfa_setup: requiresMfaSetup,
        user_id: user.id,
        profile_id: profile.id
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
