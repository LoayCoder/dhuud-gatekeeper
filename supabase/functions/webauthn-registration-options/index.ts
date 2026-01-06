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

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's existing credentials
    const { data: existingCredentials } = await supabaseAdmin
      .from('webauthn_credentials')
      .select('credential_id')
      .eq('user_id', user.id)
      .is('deleted_at', null);

    // Generate a random challenge
    const challengeBytes = new Uint8Array(32);
    crypto.getRandomValues(challengeBytes);
    const challenge = btoa(String.fromCharCode(...challengeBytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Store the challenge
    await supabaseAdmin.from('webauthn_challenges').insert({
      user_id: user.id,
      challenge,
      type: 'registration',
    });

    // Clean up expired challenges
    await supabaseAdmin
      .from('webauthn_challenges')
      .delete()
      .lt('expires_at', new Date().toISOString());

    // Create registration options
    const options = {
      challenge,
      rp: {
        name: 'DHUUD HSSE',
        id: new URL(req.headers.get('origin') || supabaseUrl).hostname,
      },
      user: {
        id: btoa(user.id).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''),
        name: user.email || user.id,
        displayName: user.email?.split('@')[0] || 'User',
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        userVerification: 'preferred',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
      excludeCredentials: (existingCredentials || []).map(cred => ({
        id: cred.credential_id,
        type: 'public-key',
        transports: ['internal'],
      })),
    };

    console.log('Generated registration options for user:', user.id);

    return new Response(
      JSON.stringify({ options }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating registration options:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
