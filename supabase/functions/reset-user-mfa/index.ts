/**
 * reset-user-mfa Edge Function
 * 
 * ADMIN-ONLY function to completely reset all MFA-related data for a user.
 * Used for:
 * 1. Re-invitation flows - ensuring deleted users start fresh
 * 2. Support cases - when users need MFA reset
 * 3. Troubleshooting - clearing stuck MFA states
 * 
 * This function cleans:
 * - All MFA factors (TOTP, etc.) from auth.mfa_factors
 * - WebAuthn credentials
 * - WebAuthn challenges
 * - Tenant MFA status records
 * - Trusted devices
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResetMFARequest {
  user_id: string;       // The auth user ID to reset MFA for
  tenant_id?: string;    // Optional: only reset MFA for specific tenant
  reason?: string;       // Optional: reason for reset (for audit log)
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
      console.warn('Non-admin attempted to reset user MFA:', caller.id);
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
    const body: ResetMFARequest = await req.json();
    
    if (!body.user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetUserId = body.user_id;
    const targetTenantId = body.tenant_id || callerProfile.tenant_id;
    const reason = body.reason || 'admin_mfa_reset';

    console.log('Admin', caller.id, 'resetting MFA for user:', targetUserId, 'Tenant:', targetTenantId, 'Reason:', reason);

    // Verify target user exists in caller's tenant
    const { data: targetProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, tenant_id, email, full_name')
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

    const cleanupResults = {
      mfa_factors_deleted: 0,
      webauthn_credentials_deleted: false,
      webauthn_challenges_deleted: false,
      tenant_mfa_status_deleted: false,
      trusted_devices_deleted: false,
    };

    // 1. Delete all MFA factors from auth.mfa_factors via Admin API
    try {
      const { data: mfaFactors } = await supabaseAdmin.auth.admin.mfa.listFactors({ userId: targetUserId });
      if (mfaFactors?.factors && mfaFactors.factors.length > 0) {
        for (const factor of mfaFactors.factors) {
          console.log('Deleting MFA factor:', factor.id, 'type:', factor.factor_type, 'status:', factor.status);
          await supabaseAdmin.auth.admin.mfa.deleteFactor({ id: factor.id, userId: targetUserId });
        }
        cleanupResults.mfa_factors_deleted = mfaFactors.factors.length;
        console.log('Deleted', mfaFactors.factors.length, 'MFA factors');
      }
    } catch (mfaError) {
      console.error('Error cleaning MFA factors:', mfaError);
    }

    // 2. Delete WebAuthn credentials (soft delete)
    const { error: webauthnError } = await supabaseAdmin
      .from('webauthn_credentials')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', targetUserId);
    if (!webauthnError) {
      cleanupResults.webauthn_credentials_deleted = true;
      console.log('Soft-deleted WebAuthn credentials for user:', targetUserId);
    }

    // 3. Delete WebAuthn challenges
    const { error: challengeError } = await supabaseAdmin
      .from('webauthn_challenges')
      .delete()
      .eq('user_id', targetUserId);
    if (!challengeError) {
      cleanupResults.webauthn_challenges_deleted = true;
      console.log('Deleted WebAuthn challenges for user:', targetUserId);
    }

    // 4. Delete tenant MFA status (specific tenant or all if no tenant specified)
    let mfaStatusQuery = supabaseAdmin
      .from('tenant_user_mfa_status')
      .delete()
      .eq('user_id', targetUserId);
    
    if (body.tenant_id) {
      mfaStatusQuery = mfaStatusQuery.eq('tenant_id', body.tenant_id);
    }
    
    const { error: mfaStatusError } = await mfaStatusQuery;
    if (!mfaStatusError) {
      cleanupResults.tenant_mfa_status_deleted = true;
      console.log('Deleted tenant MFA status for user:', targetUserId);
    }

    // 5. Delete trusted devices
    const { error: trustedDevicesError } = await supabaseAdmin
      .from('trusted_devices')
      .delete()
      .eq('user_id', targetUserId);
    if (!trustedDevicesError) {
      cleanupResults.trusted_devices_deleted = true;
      console.log('Deleted trusted devices for user:', targetUserId);
    }

    // 6. Log security audit event
    await supabaseAdmin.from('security_audit_logs').insert({
      tenant_id: targetTenantId,
      actor_id: caller.id,
      action: 'user_mfa_reset',
      action_category: 'user_management',
      result: 'success',
      entity_type: 'profile',
      entity_id: targetProfile.id,
      entity_identifier: targetProfile.email,
      old_value: { reason },
      new_value: cleanupResults
    });

    console.log('MFA reset complete for user:', targetUserId, 'Results:', cleanupResults);

    return new Response(
      JSON.stringify({ 
        success: true,
        user_id: targetUserId,
        tenant_id: targetTenantId,
        cleanup_results: cleanupResults
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in reset-user-mfa:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
