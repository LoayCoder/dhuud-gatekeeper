import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get action from request
    const { action, provider } = await req.json();

    if (action === 'get') {
      // Fetch current provider setting
      const { data, error } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('setting_key', 'whatsapp_provider')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Check which providers have credentials configured
      const wasenderConfigured = !!Deno.env.get('WASENDER_API_KEY');
      const twilioConfigured = !!(
        Deno.env.get('TWILIO_ACCOUNT_SID') &&
        Deno.env.get('TWILIO_AUTH_TOKEN') &&
        Deno.env.get('TWILIO_WHATSAPP_NUMBER')
      );

      // Determine active provider
      let activeProvider = 'wasender'; // default
      if (data?.value?.active) {
        activeProvider = data.value.active;
      } else if (Deno.env.get('WHATSAPP_PROVIDER')) {
        activeProvider = Deno.env.get('WHATSAPP_PROVIDER')!.toLowerCase();
      } else if (wasenderConfigured) {
        activeProvider = 'wasender';
      } else if (twilioConfigured) {
        activeProvider = 'twilio';
      }

      return new Response(JSON.stringify({
        success: true,
        activeProvider,
        wasenderConfigured,
        twilioConfigured,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'set') {
      if (!provider || !['wasender', 'twilio'].includes(provider)) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid provider. Must be "wasender" or "twilio"',
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if setting exists
      const { data: existing } = await supabase
        .from('platform_settings')
        .select('id')
        .eq('setting_key', 'whatsapp_provider')
        .maybeSingle();

      let error;
      if (existing) {
        // Update existing
        const result = await supabase
          .from('platform_settings')
          .update({
            value: { active: provider },
            updated_at: new Date().toISOString(),
          })
          .eq('setting_key', 'whatsapp_provider');
        error = result.error;
      } else {
        // Insert new
        const result = await supabase
          .from('platform_settings')
          .insert({
            setting_key: 'whatsapp_provider',
            value: { active: provider },
            description: 'Active WhatsApp provider (wasender or twilio)',
          });
        error = result.error;
      }

      if (error) {
        console.error('[update-whatsapp-provider] Error upserting:', error);
        throw error;
      }

      console.log(`[update-whatsapp-provider] Set active provider to: ${provider}`);

      return new Response(JSON.stringify({
        success: true,
        provider,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid action. Use "get" or "set"',
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[update-whatsapp-provider] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
