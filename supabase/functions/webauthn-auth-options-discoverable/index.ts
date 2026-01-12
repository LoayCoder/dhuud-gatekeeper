import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Generates WebAuthn authentication options for discoverable credentials (passkeys).
 * This allows users to authenticate without entering their email first.
 * The authenticator will show a list of available passkeys on the device.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Generate a random challenge
    const challengeBytes = new Uint8Array(32);
    crypto.getRandomValues(challengeBytes);
    const challenge = btoa(String.fromCharCode(...challengeBytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Store the challenge without user_id (will be resolved from credential)
    // We'll use a special identifier for discoverable auth
    const { data: challengeRecord, error: insertError } = await supabaseAdmin
      .from('webauthn_challenges')
      .insert({
        user_id: null, // Will be resolved from userHandle in credential response
        challenge,
        type: 'discoverable_authentication',
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error storing challenge:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create challenge' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean up expired challenges
    await supabaseAdmin
      .from('webauthn_challenges')
      .delete()
      .lt('expires_at', new Date().toISOString());

    // Get the RP ID from origin header
    const origin = req.headers.get('origin') || supabaseUrl;
    const rpId = new URL(origin).hostname;

    // Create authentication options for discoverable credentials
    // Empty allowCredentials array tells the authenticator to show all available passkeys
    const options = {
      challenge,
      rpId,
      allowCredentials: [], // Empty = let authenticator show all available passkeys
      userVerification: 'required',
      timeout: 60000,
    };

    console.log('Generated discoverable auth options, challengeId:', challengeRecord.id);

    return new Response(
      JSON.stringify({ 
        options,
        challengeId: challengeRecord.id, // Client will send this back for verification
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating discoverable auth options:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
