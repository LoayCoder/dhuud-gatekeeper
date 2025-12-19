import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateUserRequest {
  user_id: string;
  new_email?: string;
  old_email?: string;
  updates?: Record<string, any>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is authenticated and is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: No auth header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if caller is admin using is_admin function
    const { data: isAdminResult, error: adminCheckError } = await supabase
      .rpc('is_admin', { _user_id: caller.id });
    
    if (adminCheckError || !isAdminResult) {
      console.error('Admin check failed:', adminCheckError);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData: UpdateUserRequest = await req.json();
    const { user_id, new_email, old_email, updates } = requestData;

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get caller's tenant_id
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', caller.id)
      .single();

    if (!callerProfile?.tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Caller tenant not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify target user belongs to same tenant (tenant isolation)
    const { data: targetUser, error: targetError } = await supabase
      .from('profiles')
      .select('tenant_id, email, full_name')
      .eq('id', user_id)
      .single();

    if (targetError || !targetUser) {
      return new Response(
        JSON.stringify({ error: 'Target user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (targetUser.tenant_id !== callerProfile.tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Cross-tenant operation not allowed' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let emailUpdateResult = null;

    // Handle email change in auth.users if new_email is provided and different
    if (new_email && old_email && new_email !== old_email) {
      console.log(`Updating auth email for user ${user_id}: ${old_email} -> ${new_email}`);
      
      // Check if new email is already in use
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', new_email)
        .neq('id', user_id)
        .maybeSingle();

      if (existingUser) {
        return new Response(
          JSON.stringify({ error: 'Email already in use by another user' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update auth.users using admin API
      const { data: authUpdate, error: authUpdateError } = await supabase.auth.admin.updateUserById(
        user_id,
        { email: new_email, email_confirm: true }
      );

      if (authUpdateError) {
        console.error('Failed to update auth.users email:', authUpdateError);
        return new Response(
          JSON.stringify({ error: `Failed to update login credentials: ${authUpdateError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      emailUpdateResult = { success: true, old_email, new_email };
      console.log(`Auth email updated successfully for user ${user_id}`);

      // Log the email change to audit_logs
      const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                        req.headers.get('x-real-ip') || 
                        'unknown';

      await supabase
        .from('admin_audit_logs')
        .insert({
          admin_id: caller.id,
          tenant_id: callerProfile.tenant_id,
          event_type: 'user_updated',
          target_user_id: user_id,
          metadata: {
            action: 'email_change',
            old_email: old_email,
            new_email: new_email,
            changed_by: caller.email,
            ip_address: ipAddress,
            timestamp: new Date().toISOString(),
          }
        });
    }

    // Update profiles table if updates provided
    if (updates && Object.keys(updates).length > 0) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user_id);

      if (profileError) {
        console.error('Failed to update profiles:', profileError);
        // If email was already changed in auth, we should warn about partial failure
        if (emailUpdateResult) {
          return new Response(
            JSON.stringify({ 
              warning: 'Email was updated in login credentials but profile update failed',
              email_update: emailUpdateResult,
              profile_error: profileError.message 
            }),
            { status: 207, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({ error: `Failed to update profile: ${profileError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: user_id,
        email_updated: emailUpdateResult !== null,
        email_update: emailUpdateResult,
        message: emailUpdateResult 
          ? 'User email and profile updated successfully' 
          : 'User profile updated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in admin-update-user:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
