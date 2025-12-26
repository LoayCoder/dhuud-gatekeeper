import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, verifyAuth, unauthorizedResponse } from '../_shared/cors.ts';
import { sendEmail, wrapEmailHtml, EmailModule } from '../_shared/email-sender.ts';

interface SendEmailTemplateRequest {
  email: string;
  templateSlug: string;
  dataObject: Record<string, string>;
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
      console.error('[SendEmailTemplate] Auth failed:', authResult?.error);
      return unauthorizedResponse(authResult?.error || 'Unauthorized', origin);
    }

    const body: SendEmailTemplateRequest = await req.json();
    const { email, templateSlug, dataObject, tenant_id } = body;

    if (!email || !templateSlug) {
      return new Response(
        JSON.stringify({ success: false, error: 'email and templateSlug are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    if (!email.includes('@')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch template by slug
    let query = supabase
      .from('notification_templates')
      .select('*')
      .eq('slug', templateSlug)
      .eq('is_active', true)
      .is('deleted_at', null)
      .or('channel_type.eq.email,channel_type.eq.both');

    if (tenant_id) {
      query = query.eq('tenant_id', tenant_id);
    }

    const { data: template, error: templateError } = await query.single();

    if (templateError || !template) {
      console.error('[SendEmailTemplate] Template not found:', templateSlug, templateError);
      return new Response(
        JSON.stringify({ success: false, error: `Email template "${templateSlug}" not found or not enabled for email` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SendEmailTemplate] Found template: ${templateSlug}, user: ${authResult.user.id}`);

    // Render message content
    const renderedMessage = replaceVariables(
      template.content_pattern,
      template.variable_keys || [],
      dataObject || {}
    );

    // Render subject
    const renderedSubject = template.email_subject 
      ? replaceVariables(template.email_subject, template.variable_keys || [], dataObject || {})
      : `Notification: ${templateSlug}`;

    // Wrap in HTML with proper styling
    const htmlContent = wrapEmailHtml(
      `<div style="white-space: pre-wrap;">${renderedMessage}</div>`,
      template.language || 'en'
    );

    console.log(`[SendEmailTemplate] Sending to: ${email}, subject: ${renderedSubject}`);

    // Determine email module based on category
    const moduleMap: Record<string, EmailModule> = {
      incidents: 'incident_report',
      inspections: 'inspection_reminder',
      actions: 'action_assigned',
      contractors: 'contractor_access',
      assets: 'inspection_reminder',
      alerts: 'system_alert',
      general: 'default',
    };
    const emailModule = moduleMap[template.category] || 'default';

    // Send email via Resend
    const result = await sendEmail({
      to: email,
      subject: renderedSubject,
      html: htmlContent,
      module: emailModule,
    });

    // Log to notification_logs if tenant_id provided
    if (tenant_id) {
      try {
        await supabase.from('notification_logs').insert({
          tenant_id,
          channel: 'email',
          recipient: email,
          template_name: templateSlug,
          message_content: renderedMessage,
          status: result.success ? 'sent' : 'failed',
          provider: 'resend',
          external_message_id: result.messageId,
          error_message: result.error,
          sent_at: new Date().toISOString(),
        });
      } catch (logError) {
        console.error('[SendEmailTemplate] Failed to log notification:', logError);
      }
    }

    return new Response(
      JSON.stringify({
        success: result.success,
        messageId: result.messageId,
        error: result.error,
        template: templateSlug,
        renderedSubject,
        renderedMessage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SendEmailTemplate] Error:', errorMessage);
    const origin = req.headers.get('Origin');
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } }
    );
  }
});
