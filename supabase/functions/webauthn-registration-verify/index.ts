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

    const { credential, deviceName } = await req.json();

    if (!credential || !credential.id || !credential.response) {
      return new Response(
        JSON.stringify({ error: 'Invalid credential data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify challenge exists and hasn't expired
    const { data: challengeData, error: challengeError } = await supabaseAdmin
      .from('webauthn_challenges')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'registration')
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

    // Get user's tenant_id
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .eq('is_active', true)
      .single();

    if (!profile?.tenant_id) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store the credential
    const { error: insertError } = await supabaseAdmin
      .from('webauthn_credentials')
      .insert({
        tenant_id: profile.tenant_id,
        user_id: user.id,
        credential_id: credential.id,
        public_key: credential.response.publicKey || credential.response.attestationObject,
        counter: 0,
        device_name: deviceName || detectDeviceName(req.headers.get('user-agent') || ''),
        transports: credential.response.transports || ['internal'],
      });

    if (insertError) {
      console.error('Error storing credential:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to store credential' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Registered new credential for user:', user.id);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error verifying registration:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function detectDeviceName(userAgent: string): string {
  if (userAgent.includes('iPhone')) return 'iPhone (Face ID/Touch ID)';
  if (userAgent.includes('iPad')) return 'iPad (Face ID/Touch ID)';
  if (userAgent.includes('Mac')) return 'Mac (Touch ID)';
  if (userAgent.includes('Windows')) return 'Windows (Hello)';
  if (userAgent.includes('Android')) return 'Android (Biometric)';
  if (userAgent.includes('Linux')) return 'Linux Device';
  return 'Unknown Device';
}
