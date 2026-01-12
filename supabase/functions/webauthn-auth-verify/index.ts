import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Decode base64url encoded userHandle to get the original user ID
 */
function decodeUserHandle(userHandle: string): string {
  // Add padding if needed
  let base64 = userHandle.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  return atob(base64);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { email, credential, challengeId } = await req.json();

    if (!credential || !credential.id) {
      return new Response(
        JSON.stringify({ error: 'Invalid request data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let user;
    let challengeData;

    // Check if this is a discoverable credential authentication (no email provided)
    if (!email && credential.response?.userHandle) {
      // Discoverable credential flow - extract user ID from userHandle
      const userId = decodeUserHandle(credential.response.userHandle);
      console.log('[WebAuthn] Discoverable auth - decoded userId:', userId);

      // Verify challenge exists using challengeId
      if (!challengeId) {
        return new Response(
          JSON.stringify({ error: 'Challenge ID required for discoverable authentication' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: discoverableChallenge, error: challengeError } = await supabaseAdmin
        .from('webauthn_challenges')
        .select('*')
        .eq('id', challengeId)
        .eq('type', 'discoverable_authentication')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (challengeError || !discoverableChallenge) {
        console.error('[WebAuthn] Challenge error:', challengeError);
        return new Response(
          JSON.stringify({ error: 'Challenge expired or not found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      challengeData = discoverableChallenge;

      // Get user by ID from auth
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (userError || !userData?.user) {
        console.error('[WebAuthn] User not found:', userError);
        return new Response(
          JSON.stringify({ error: 'Authentication failed' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      user = userData.user;
    } else if (email) {
      // Legacy email-based flow
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      user = users?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

      if (!user) {
        return new Response(
          JSON.stringify({ error: 'Authentication failed' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify challenge exists and hasn't expired
      const { data: emailChallengeData, error: challengeError } = await supabaseAdmin
        .from('webauthn_challenges')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'authentication')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (challengeError || !emailChallengeData) {
        return new Response(
          JSON.stringify({ error: 'Challenge expired or not found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      challengeData = emailChallengeData;
    } else {
      return new Response(
        JSON.stringify({ error: 'Email or discoverable credential required' }),
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
