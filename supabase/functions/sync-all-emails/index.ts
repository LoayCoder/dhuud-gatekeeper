import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncResult {
  user_id: string;
  full_name: string;
  old_email: string;
  new_email: string;
  success: boolean;
  error?: string;
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

    // Check if caller is admin
    const { data: isAdminResult, error: adminCheckError } = await supabase
      .rpc('is_admin', { _user_id: caller.id });
    
    if (adminCheckError || !isAdminResult) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                      req.headers.get('x-real-ip') || 
                      'unknown';

    // Get all users with login in this tenant
    const { data: usersWithLogin, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('tenant_id', callerProfile.tenant_id)
      .eq('has_login', true)
      .is('deleted_at', null)
      .not('email', 'is', null);

    if (usersError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: SyncResult[] = [];

    // Check each user and sync if mismatched
    for (const user of usersWithLogin || []) {
      try {
        const { data: authUser, error: authUserError } = await supabase.auth.admin.getUserById(user.id);
        
        if (authUserError || !authUser?.user) {
          continue;
        }

        const authEmail = authUser.user.email;
        const profileEmail = user.email;

        if (authEmail && profileEmail && authEmail.toLowerCase() !== profileEmail.toLowerCase()) {
          // Check if new email is already in use
          const { data: existingUser } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', profileEmail)
            .neq('id', user.id)
            .maybeSingle();

          if (existingUser) {
            results.push({
              user_id: user.id,
              full_name: user.full_name || 'Unknown',
              old_email: authEmail,
              new_email: profileEmail,
              success: false,
              error: 'Email already in use by another user',
            });
            continue;
          }

          // Update auth.users
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            user.id,
            { email: profileEmail, email_confirm: true }
          );

          if (updateError) {
            results.push({
              user_id: user.id,
              full_name: user.full_name || 'Unknown',
              old_email: authEmail,
              new_email: profileEmail,
              success: false,
              error: updateError.message,
            });
          } else {
            results.push({
              user_id: user.id,
              full_name: user.full_name || 'Unknown',
              old_email: authEmail,
              new_email: profileEmail,
              success: true,
            });

            // Log the sync
            await supabase.from('admin_audit_logs').insert({
              admin_id: caller.id,
              tenant_id: callerProfile.tenant_id,
              event_type: 'user_updated',
              target_user_id: user.id,
              metadata: {
                action: 'email_sync',
                old_email: authEmail,
                new_email: profileEmail,
                synced_by: caller.email,
                ip_address: ipAddress,
                timestamp: new Date().toISOString(),
              }
            });
          }
        }
      } catch (err) {
        console.error(`Error syncing user ${user.id}:`, err);
        results.push({
          user_id: user.id,
          full_name: user.full_name || 'Unknown',
          old_email: 'unknown',
          new_email: user.email || 'unknown',
          success: false,
          error: 'Unexpected error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`Synced ${successCount} emails, ${failCount} failed in tenant ${callerProfile.tenant_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        synced_count: successCount,
        failed_count: failCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in sync-all-emails:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
