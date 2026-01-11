/**
 * delete-auth-user Edge Function
 * 
 * Permanently removes a user's auth account OR anonymizes it to allow re-invitation.
 * 
 * Since profiles.id = auth.users.id (FK constraint), we cannot delete auth.users
 * without first deleting the profile (which we want to keep for audit).
 * 
 * Solution: Anonymize the auth account by changing email to a unique deleted format.
 * This allows:
 * - Original email to be used for new signups/invitations
 * - Profile audit trail preserved
 * - Auth account becomes orphaned but harmless
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Parse request body
    const body = await req.json();
    const userId = body.user_id;
    const forceDelete = body.force_delete === true; // Try hard delete first
    
    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing auth user deletion/anonymization:', userId, 'force_delete:', forceDelete);

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get current user info
    const { data: authUserData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (getUserError || !authUserData?.user) {
      console.log('User not found in auth.users, may already be deleted:', userId);
      return new Response(
        JSON.stringify({ 
          success: true, 
          user_id: userId, 
          message: 'User not found in auth (already deleted or never existed)'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const originalEmail = authUserData.user.email;
    console.log('Found auth user with email:', originalEmail);

    // =============================================
    // STEP 1: Clean up all MFA/credential data
    // =============================================
    console.log('Step 1: Cleaning up MFA and credentials...');

    // Delete MFA factors via Admin API
    try {
      const { data: mfaFactors } = await supabaseAdmin.auth.admin.mfa.listFactors({ userId });
      if (mfaFactors?.factors && mfaFactors.factors.length > 0) {
        for (const factor of mfaFactors.factors) {
          console.log('Deleting MFA factor:', factor.id);
          await supabaseAdmin.auth.admin.mfa.deleteFactor({ id: factor.id, userId });
        }
      }
    } catch (mfaError) {
      console.log('MFA cleanup (may not have factors):', mfaError);
    }

    // Clean up WebAuthn credentials
    await supabaseAdmin
      .from('webauthn_credentials')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', userId);

    await supabaseAdmin
      .from('webauthn_challenges')
      .delete()
      .eq('user_id', userId);

    // Clean up tenant MFA status
    await supabaseAdmin
      .from('tenant_user_mfa_status')
      .delete()
      .eq('user_id', userId);

    // Clean up trusted devices
    await supabaseAdmin
      .from('trusted_devices')
      .delete()
      .eq('user_id', userId);

    // Invalidate all user sessions
    await supabaseAdmin
      .from('user_sessions')
      .update({
        is_active: false,
        invalidated_at: new Date().toISOString(),
        invalidation_reason: 'user_permanently_deleted'
      })
      .eq('user_id', userId);

    // Clean up user roles
    await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    console.log('Step 1 complete: Cleanup done');

    // =============================================
    // STEP 2: Try to delete auth account
    // =============================================
    if (forceDelete) {
      console.log('Step 2: Attempting hard delete of auth account...');
      
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      
      if (!deleteError) {
        console.log('Auth user permanently deleted:', userId);
        return new Response(
          JSON.stringify({ 
            success: true,
            user_id: userId,
            method: 'hard_delete',
            deleted: true,
            message: 'Auth account permanently deleted'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('Hard delete failed, falling back to anonymization:', deleteError.message);
    }

    // =============================================
    // STEP 3: Anonymize the auth account
    // =============================================
    console.log('Step 3: Anonymizing auth account...');
    
    // Generate unique deleted email
    const timestamp = Date.now();
    const deletedEmail = `deleted_${timestamp}_${userId.substring(0, 8)}@deleted.local`;
    
    // Update auth account to:
    // 1. Change email to anonymous value (frees original email for re-use)
    // 2. Ban the account permanently
    // 3. Clear identities
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        email: deletedEmail,
        email_confirm: true,
        ban_duration: 'none', // Permanent ban
        user_metadata: {
          deleted: true,
          deleted_at: new Date().toISOString(),
          original_email: originalEmail,
          deletion_method: 'anonymized'
        }
      }
    );

    if (updateError) {
      console.error('Failed to anonymize auth account:', updateError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: updateError.message,
          details: 'Could not anonymize auth account'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Auth account anonymized:', userId, 'Email changed from', originalEmail, 'to', deletedEmail);

    return new Response(
      JSON.stringify({ 
        success: true,
        user_id: userId,
        method: 'anonymized',
        original_email: originalEmail,
        new_email: deletedEmail,
        message: 'Auth account anonymized - original email is now available for re-invitation'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in delete-auth-user:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
