/**
 * admin-disable-user Edge Function
 * 
 * MULTI-TENANT AWARE user deletion/disabling.
 * 
 * When a user is deleted from a tenant:
 * 1. Only soft-delete the profile for THIS tenant
 * 2. Invalidate sessions for this tenant only
 * 3. Clear tenant-specific MFA status
 * 4. DO NOT ban the global auth.users account unless user has NO other active profiles
 * 
 * This allows:
 * - Same user to remain active in other tenants
 * - User to be re-invited to the same tenant later
 * - Complete account ban only when user has no tenant access anywhere
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DisableRequest {
  user_id: string;       // The auth user ID
  profile_id?: string;   // Optional: specific profile ID to disable (for multi-tenant)
  tenant_id?: string;    // Optional: specific tenant to remove from
  reason?: string;
  full_ban?: boolean;    // If true, ban from all tenants (dangerous)
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

    // Get auth token from request - must be authenticated admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify caller is an admin
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user: caller }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if caller is admin
    const { data: isAdmin, error: adminCheckError } = await supabaseAdmin.rpc('is_admin', {
      p_user_id: caller.id
    });

    if (adminCheckError || !isAdmin) {
      console.warn('Non-admin attempted to disable user:', caller.id);
      return new Response(
        JSON.stringify({ success: false, error: 'Admin privileges required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get caller's tenant for authorization
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id')
      .eq('user_id', caller.id)
      .eq('is_deleted', false)
      .eq('is_active', true)
      .single();

    if (!callerProfile) {
      return new Response(
        JSON.stringify({ success: false, error: 'Caller profile not found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: DisableRequest = await req.json();
    
    if (!body.user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetUserId = body.user_id;
    const targetTenantId = body.tenant_id || callerProfile.tenant_id;
    const reason = body.reason || 'admin_deleted';

    console.log('Admin', caller.id, 'disabling user:', targetUserId, 'from tenant:', targetTenantId, 'Reason:', reason);

    // Get target user's profile for THIS TENANT
    const { data: targetProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, tenant_id, full_name, email')
      .eq('user_id', targetUserId)
      .eq('tenant_id', targetTenantId)
      .single();

    if (profileError || !targetProfile) {
      return new Response(
        JSON.stringify({ success: false, error: 'User profile not found in this tenant' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify caller can manage this tenant
    if (targetProfile.tenant_id !== callerProfile.tenant_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot manage users in other tenants' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Soft-delete ONLY this tenant's profile (don't touch other tenant profiles)
    const { error: deleteError } = await supabaseAdmin
      .from('profiles')
      .update({
        is_deleted: true,
        is_active: false,
        deleted_at: new Date().toISOString()
      })
      .eq('id', targetProfile.id);

    if (deleteError) {
      console.error('Failed to soft-delete profile:', deleteError);
    }

    // 2. Invalidate sessions for this tenant only
    const { error: sessionError } = await supabaseAdmin
      .from('user_sessions')
      .update({
        is_active: false,
        invalidated_at: new Date().toISOString(),
        invalidation_reason: reason
      })
      .eq('user_id', targetUserId)
      .eq('tenant_id', targetTenantId)
      .eq('is_active', true);

    if (sessionError) {
      console.error('Failed to invalidate sessions:', sessionError);
    }

    // 3. Clear tenant MFA status for this tenant only
    await supabaseAdmin
      .from('tenant_user_mfa_status')
      .delete()
      .eq('user_id', targetUserId)
      .eq('tenant_id', targetTenantId);

    // 4. Check if user has ANY other active profiles in other tenants
    const { data: otherProfiles, error: otherError } = await supabaseAdmin
      .from('profiles')
      .select('id, tenant_id')
      .eq('user_id', targetUserId)
      .eq('is_deleted', false)
      .eq('is_active', true);

    let accountBanned = false;

    // Only ban the global auth account if:
    // - User has NO other active profiles, OR
    // - full_ban is explicitly requested (dangerous operation)
    if ((!otherProfiles || otherProfiles.length === 0) || body.full_ban === true) {
      console.log('No other active profiles found for user:', targetUserId, '- Banning auth account');
      
      const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(
        targetUserId,
        {
          ban_duration: 'none', // Permanent ban
          user_metadata: {
            disabled: true,
            disabled_at: new Date().toISOString(),
            disabled_by: caller.id,
            disabled_reason: reason
          }
        }
      );

      if (banError) {
        console.error('Failed to ban auth account:', banError);
      } else {
        accountBanned = true;
      }
    } else {
      console.log('User', targetUserId, 'still has', otherProfiles.length, 'active profiles in other tenants - NOT banning auth account');
    }

    // 5. Log security audit event
    await supabaseAdmin.from('security_audit_logs').insert({
      tenant_id: targetTenantId,
      actor_id: caller.id,
      action: accountBanned ? 'user_account_disabled' : 'user_tenant_access_removed',
      table_name: 'profiles',
      record_id: targetProfile.id,
      old_value: { email: targetProfile.email, full_name: targetProfile.full_name },
      new_value: { 
        profile_deleted: true,
        auth_banned: accountBanned,
        reason,
        disabled_by: caller.id,
        disabled_at: new Date().toISOString(),
        other_active_profiles: otherProfiles?.length || 0
      }
    });

    console.log('User disabled from tenant:', targetUserId, 'Profile deleted:', targetProfile.id, 'Auth banned:', accountBanned);

    return new Response(
      JSON.stringify({ 
        success: true,
        user_id: targetUserId,
        profile_id: targetProfile.id,
        tenant_id: targetTenantId,
        profile_deleted: true,
        sessions_invalidated: !sessionError,
        account_banned: accountBanned,
        other_active_profiles: otherProfiles?.length || 0
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in admin-disable-user:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
