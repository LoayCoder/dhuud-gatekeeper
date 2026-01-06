import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { email, credential } = await req.json();

    if (!email || !credential || !credential.id) {
      return new Response(
        JSON.stringify({ error: 'Invalid request data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find user by email
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify challenge exists and hasn't expired
    const { data: challengeData, error: challengeError } = await supabaseAdmin
      .from('webauthn_challenges')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'authentication')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (challengeError || !challengeData) {
      return new Response(
        JSON.stringify({ error: 'Challenge expired or not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete the used challenge
    await supabaseAdmin
      .from('webauthn_challenges')
      .delete()
      .eq('id', challengeData.id);

    // Verify the credential exists for this user
    const { data: storedCredential, error: credError } = await supabaseAdmin
      .from('webauthn_credentials')
      .select('*')
      .eq('user_id', user.id)
      .eq('credential_id', credential.id)
      .is('deleted_at', null)
      .single();

    if (credError || !storedCredential) {
      return new Response(
        JSON.stringify({ error: 'Credential not found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last used timestamp and counter
    const newCounter = (credential.response?.authenticatorData?.counter || 0);
    if (newCounter > 0 && newCounter <= storedCredential.counter) {
      // Possible cloned authenticator - reject for security
      console.warn('Possible cloned authenticator detected for user:', user.id);
      return new Response(
        JSON.stringify({ error: 'Security validation failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabaseAdmin
      .from('webauthn_credentials')
      .update({ 
        last_used_at: new Date().toISOString(),
        counter: newCounter > storedCredential.counter ? newCounter : storedCredential.counter
      })
      .eq('id', storedCredential.id);

    // Check if user profile is active
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, tenant_id, is_active, is_deleted')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (!profile || !profile.is_active || profile.is_deleted) {
      return new Response(
        JSON.stringify({ error: 'Account is inactive or deleted' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate a magic link for passwordless login
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email!,
    });

    if (linkError || !linkData) {
      console.error('Error generating magic link:', linkError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract the token from the magic link
    const url = new URL(linkData.properties.action_link);
    const token = url.searchParams.get('token');
    const tokenType = url.searchParams.get('type');

    console.log('Biometric authentication successful for user:', user.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        token,
        tokenType,
        email: user.email,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error verifying authentication:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
