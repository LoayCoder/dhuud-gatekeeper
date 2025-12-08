import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  action: 'set' | 'verify' | 'status';
  password_hash?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get JWT from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's JWT
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    const body: RequestBody = await req.json();
    const { action, password_hash } = body;

    console.log(`Processing ${action} for user ${userId}`);

    // Check if user has HSSE Manager or Admin role
    const { data: hasHSSERole } = await supabaseClient.rpc('has_role_by_code', {
      _user_id: userId,
      _role_code: 'hsse_manager'
    });

    const { data: isAdmin } = await supabaseClient.rpc('is_admin', {
      _user_id: userId
    });

    if (!hasHSSERole && !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Access denied: requires HSSE Manager or Admin role' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (action) {
      case 'set': {
        if (!password_hash) {
          return new Response(
            JSON.stringify({ error: 'Password hash required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update the deletion password hash
        const { error: updateError } = await supabaseClient
          .from('profiles')
          .update({ deletion_password_hash: password_hash })
          .eq('id', userId);

        if (updateError) {
          console.error('Update error:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to set password' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Deletion password set for user ${userId}`);
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'verify': {
        if (!password_hash) {
          return new Response(
            JSON.stringify({ error: 'Password hash required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get stored password hash
        const { data: profile, error: fetchError } = await supabaseClient
          .from('profiles')
          .select('deletion_password_hash')
          .eq('id', userId)
          .single();

        if (fetchError) {
          console.error('Fetch error:', fetchError);
          return new Response(
            JSON.stringify({ error: 'Failed to verify password' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const isValid = profile?.deletion_password_hash === password_hash;
        return new Response(
          JSON.stringify({ valid: isValid }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'status': {
        // Check if deletion password is configured
        const { data: profile, error: fetchError } = await supabaseClient
          .from('profiles')
          .select('deletion_password_hash')
          .eq('id', userId)
          .single();

        if (fetchError) {
          console.error('Fetch error:', fetchError);
          return new Response(
            JSON.stringify({ error: 'Failed to check status' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const isConfigured = !!profile?.deletion_password_hash;
        return new Response(
          JSON.stringify({ configured: isConfigured }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
