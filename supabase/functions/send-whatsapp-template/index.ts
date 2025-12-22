import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWaSenderTextMessage } from "../_shared/wasender-whatsapp.ts";
import { getCorsHeaders, verifyAuth, unauthorizedResponse } from '../_shared/cors.ts';

interface SendTemplateRequest {
  phone: string;
  templateSlug: string;
  dataObject: Record<string, string>;
  gateway?: 'official' | 'wasender';
  tenant_id?: string;
}

/**
 * Replace {{1}}, {{2}}, etc. with values from dataObject using variable_keys mapping
 */
function replaceVariables(
  pattern: string,
  keys: string[],
  data: Record<string, string>
): string {
  let result = pattern;
  keys.forEach((key, index) => {
    const placeholder = `{{${index + 1}}}`;
    const value = data[key] ?? `[${key}]`; // Graceful fallback
    result = result.replaceAll(placeholder, value);
  });
  return result;
}

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
    const authResult = await verifyAuth(req, supabase);
    if (!authResult?.user) {
      console.error('[SendTemplate] Auth failed:', authResult?.error);
      return unauthorizedResponse(authResult?.error || 'Unauthorized', origin);
    }

    const body: SendTemplateRequest = await req.json();
    const { phone, templateSlug, dataObject, gateway, tenant_id } = body;

    if (!phone || !templateSlug) {
      return new Response(
        JSON.stringify({ success: false, error: 'phone and templateSlug are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch template by slug
    let query = supabase
      .from('notification_templates')
      .select('*')
      .eq('slug', templateSlug)
      .eq('is_active', true)
      .is('deleted_at', null);

    if (tenant_id) {
      query = query.eq('tenant_id', tenant_id);
    }

    const { data: template, error: templateError } = await query.single();

    if (templateError || !template) {
      console.error('[SendTemplate] Template not found:', templateSlug, templateError);
      return new Response(
        JSON.stringify({ success: false, error: `Template "${templateSlug}" not found` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine which gateway to use
    const selectedGateway = gateway || template.default_gateway;
    
    console.log(`[SendTemplate] Using gateway: ${selectedGateway}, template: ${templateSlug}, user: ${authResult.user.id}`);

    let result;
    let renderedMessage: string;

    if (selectedGateway === 'official') {
      // Meta Cloud API - not implemented yet
      return new Response(
        JSON.stringify({ success: false, error: 'Official Meta API not configured yet' }),
        { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // WaSender: String replacement
      renderedMessage = replaceVariables(
        template.content_pattern,
        template.variable_keys || [],
        dataObject || {}
      );
      
      console.log(`[SendTemplate] Rendered message: ${renderedMessage}`);
      
      result = await sendWaSenderTextMessage(phone, renderedMessage);
    }

    // Log to notification_logs if tenant_id provided
    if (tenant_id) {
      try {
        await supabase.from('notification_logs').insert({
          tenant_id,
          channel: 'whatsapp',
          recipient: phone,
          template_name: templateSlug,
          message_content: renderedMessage,
          status: result.success ? 'sent' : 'failed',
          provider: selectedGateway === 'official' ? 'meta' : 'wasender',
          external_message_id: result.messageId,
          error_message: result.error,
          sent_at: new Date().toISOString(),
        });
      } catch (logError) {
        console.error('[SendTemplate] Failed to log notification:', logError);
      }
    }

    return new Response(
      JSON.stringify({
        success: result.success,
        messageId: result.messageId,
        error: result.error,
        gateway: selectedGateway,
        template: templateSlug,
        renderedMessage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SendTemplate] Error:', errorMessage);
    const origin = req.headers.get('Origin');
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } }
    );
  }
});
