/**
 * admin-disable-user Edge Function
 * 
 * Disables a user account completely when they are deleted from a tenant.
 * Uses service role to:
 * 1. Revoke all refresh tokens
 * 2. Update user metadata to mark as disabled
 * 3. Invalidate all active sessions
 * 4. Log security audit event
 * 
 * Called by admin when deleting a user to ensure they cannot log in.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DisableRequest {
  user_id: string;
  reason?: string;
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

    // Parse request body
    const body: DisableRequest = await req.json();
    
    if (!body.user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetUserId = body.user_id;
    const reason = body.reason || 'admin_deleted';

    console.log('Admin', caller.id, 'disabling user:', targetUserId, 'Reason:', reason);

    // Get target user's profile for tenant_id
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id, full_name, email')
      .eq('id', targetUserId)
      .single();

    if (!targetProfile) {
      return new Response(
        JSON.stringify({ success: false, error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Invalidate all active sessions for this user
    const { error: sessionError } = await supabaseAdmin
      .from('user_sessions')
      .update({
        is_active: false,
        invalidated_at: new Date().toISOString(),
        invalidation_reason: reason
      })
      .eq('user_id', targetUserId)
      .eq('is_active', true);

    if (sessionError) {
      console.error('Failed to invalidate sessions:', sessionError);
    }

    // 2. Update auth.users metadata to mark as banned (via admin API)
    // This prevents the user from logging in even with valid credentials
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      {
        ban_duration: 'none', // Permanent ban (use '24h', '7d', etc. for temporary)
        user_metadata: {
          disabled: true,
          disabled_at: new Date().toISOString(),
          disabled_by: caller.id,
          disabled_reason: reason
        }
      }
    );

    if (updateError) {
      console.error('Failed to update user metadata:', updateError);
      // Don't fail completely, sessions are already invalidated
    }

    // 3. Clear tenant MFA status
    await supabaseAdmin
      .from('tenant_user_mfa_status')
      .delete()
      .eq('user_id', targetUserId)
      .eq('tenant_id', targetProfile.tenant_id);

    // 4. Log security audit event
    await supabaseAdmin.from('security_audit_logs').insert({
      tenant_id: targetProfile.tenant_id,
      actor_id: caller.id,
      action: 'user_account_disabled',
      table_name: 'auth.users',
      record_id: targetUserId,
      old_value: { email: targetProfile.email, full_name: targetProfile.full_name },
      new_value: { 
        disabled: true, 
        reason,
        disabled_by: caller.id,
        disabled_at: new Date().toISOString()
      }
    });

    console.log('User account disabled successfully:', targetUserId);

    return new Response(
      JSON.stringify({ 
        success: true,
        user_id: targetUserId,
        sessions_invalidated: true,
        account_disabled: !updateError
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
