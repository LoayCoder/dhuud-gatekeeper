import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MismatchedUser {
  user_id: string;
  full_name: string;
  profile_email: string;
  auth_email: string;
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
      .rpc('is_admin', { p_user_id: caller.id });
    
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

    // Get all users with login in this tenant
    const { data: usersWithLogin, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('tenant_id', callerProfile.tenant_id)
      .eq('has_login', true)
      .is('deleted_at', null)
      .not('email', 'is', null);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mismatches: MismatchedUser[] = [];

    // Check each user's auth email vs profile email
    for (const user of usersWithLogin || []) {
      try {
        const { data: authUser, error: authUserError } = await supabase.auth.admin.getUserById(user.id);
        
        if (authUserError || !authUser?.user) {
          console.log(`User ${user.id} not found in auth.users or error:`, authUserError);
          continue;
        }

        const authEmail = authUser.user.email;
        const profileEmail = user.email;

        if (authEmail && profileEmail && authEmail.toLowerCase() !== profileEmail.toLowerCase()) {
          mismatches.push({
            user_id: user.id,
            full_name: user.full_name || 'Unknown',
            profile_email: profileEmail,
            auth_email: authEmail,
          });
        }
      } catch (err) {
        console.error(`Error checking user ${user.id}:`, err);
      }
    }

    console.log(`Found ${mismatches.length} email mismatches in tenant ${callerProfile.tenant_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        mismatches,
        count: mismatches.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-email-mismatches:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
