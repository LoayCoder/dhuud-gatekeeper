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

    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find user by email
    const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      // Don't reveal if user exists or not
      return new Response(
        JSON.stringify({ error: 'No biometric credentials found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's credentials
    const { data: credentials, error: credError } = await supabaseAdmin
      .from('webauthn_credentials')
      .select('credential_id, transports')
      .eq('user_id', user.id)
      .is('deleted_at', null);

    if (credError || !credentials || credentials.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No biometric credentials found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      email: email.toLowerCase(),
      challenge,
      type: 'authentication',
    });

    // Clean up expired challenges
    await supabaseAdmin
      .from('webauthn_challenges')
      .delete()
      .lt('expires_at', new Date().toISOString());

    // Create authentication options
    const options = {
      challenge,
      rpId: new URL(req.headers.get('origin') || supabaseUrl).hostname,
      allowCredentials: credentials.map(cred => ({
        id: cred.credential_id,
        type: 'public-key',
        transports: cred.transports || ['internal'],
      })),
      userVerification: 'required',
      timeout: 60000,
    };

    console.log('Generated auth options for email:', email);

    return new Response(
      JSON.stringify({ options, userId: user.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating auth options:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
