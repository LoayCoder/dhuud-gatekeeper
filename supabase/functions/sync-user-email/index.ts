import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client for auth operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get authorization header to verify caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the caller is authenticated
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !caller) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Caller authenticated:', caller.id);

    // Check if caller is admin
    const { data: isAdmin, error: adminCheckError } = await supabaseAdmin.rpc('is_admin', { 
      p_user_id: caller.id 
    });

    if (adminCheckError || !isAdmin) {
      console.error('Admin check failed:', adminCheckError);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { user_id } = await req.json();
    
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Syncing email for user:', user_id);

    // Get caller's tenant_id
    const { data: callerProfile, error: callerError } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id')
      .eq('id', caller.id)
      .single();

    if (callerError || !callerProfile?.tenant_id) {
      console.error('Failed to get caller tenant:', callerError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify caller tenant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get target user's profile with email
    const { data: targetProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, tenant_id, full_name')
      .eq('id', user_id)
      .single();

    if (profileError || !targetProfile) {
      console.error('Failed to get target profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify tenant isolation
    if (targetProfile.tenant_id !== callerProfile.tenant_id) {
      console.error('Tenant mismatch - caller:', callerProfile.tenant_id, 'target:', targetProfile.tenant_id);
      return new Response(
        JSON.stringify({ error: 'Access denied: cross-tenant operation' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!targetProfile.email) {
      return new Response(
        JSON.stringify({ error: 'User has no email in profile' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current auth user email
    const { data: { user: authUser }, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(user_id);
    
    if (getUserError || !authUser) {
      console.error('Failed to get auth user:', getUserError);
      return new Response(
        JSON.stringify({ error: 'Auth user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const oldEmail = authUser.email;
    const newEmail = targetProfile.email;

    console.log('Current auth email:', oldEmail);
    console.log('Target profile email:', newEmail);

    if (oldEmail === newEmail) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Emails already in sync',
          email: newEmail 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if new email is already in use by another user
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailInUse = existingUsers?.users?.some(
      u => u.email?.toLowerCase() === newEmail.toLowerCase() && u.id !== user_id
    );

    if (emailInUse) {
      console.error('Email already in use:', newEmail);
      return new Response(
        JSON.stringify({ error: 'Email address is already in use by another account' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update auth.users email
    console.log('Updating auth.users email from', oldEmail, 'to', newEmail);
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { 
        email: newEmail,
        email_confirm: true // Auto-confirm the new email
      }
    );

    if (updateError) {
      console.error('Failed to update auth user:', updateError);
      return new Response(
        JSON.stringify({ error: `Failed to sync email: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Auth user email updated successfully');

    // Log the sync action
    try {
      await supabaseAdmin.from('admin_audit_logs').insert({
        tenant_id: callerProfile.tenant_id,
        admin_id: caller.id,
        event_type: 'email_synced',
        target_table: 'auth.users',
        target_id: user_id,
        old_value: { email: oldEmail },
        new_value: { email: newEmail },
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      });
      console.log('Audit log created');
    } catch (auditError) {
      console.warn('Failed to create audit log:', auditError);
      // Don't fail the operation for audit log errors
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email synced successfully',
        old_email: oldEmail,
        new_email: newEmail,
        user_name: targetProfile.full_name
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
