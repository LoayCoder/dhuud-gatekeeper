import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const RETRY_DELAYS = [5 * 60, 30 * 60, 2 * 60 * 60];
const MAX_RETRIES = 3;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  console.log("Email retry processor started");
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: pendingEmails, error } = await supabase.from('email_delivery_logs')
      .select('*').eq('status', 'failed').lte('next_retry_at', new Date().toISOString()).lt('retry_count', MAX_RETRIES).order('next_retry_at').limit(50);

    if (error) return new Response(JSON.stringify({ error: "Failed to fetch pending emails" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // deno-lint-ignore no-explicit-any
    const emails = (pendingEmails || []) as any[];
    console.log(`Found ${emails.length} emails pending retry`);

    let successCount = 0, failureCount = 0, permanentlyFailedCount = 0;

    for (const emailLog of emails) {
      if (!emailLog.payload?.htmlContent || !emailLog.payload?.tenantName) {
        await supabase.from('email_delivery_logs').update({ status: 'permanently_failed', last_error: 'Missing payload data' }).eq('id', emailLog.id);
        permanentlyFailedCount++;
        continue;
      }

      try {
        const emailResponse = await resend.emails.send({ from: `${emailLog.payload.tenantName} <onboarding@resend.dev>`, to: [emailLog.recipient_email], subject: emailLog.subject, html: emailLog.payload.htmlContent });
        await supabase.from('email_delivery_logs').update({ status: 'sent', provider_message_id: (emailResponse as { id?: string })?.id, delivered_at: new Date().toISOString(), next_retry_at: null }).eq('id', emailLog.id);
        successCount++;
      } catch (sendError: unknown) {
        const newRetryCount = emailLog.retry_count + 1;
        const isLastRetry = newRetryCount >= MAX_RETRIES;
        const nextRetryAt = !isLastRetry && newRetryCount < RETRY_DELAYS.length ? new Date(Date.now() + RETRY_DELAYS[newRetryCount] * 1000).toISOString() : null;
        await supabase.from('email_delivery_logs').update({ status: isLastRetry ? 'permanently_failed' : 'failed', last_error: sendError instanceof Error ? sendError.message : 'Unknown', retry_count: newRetryCount, next_retry_at: nextRetryAt }).eq('id', emailLog.id);
        isLastRetry ? permanentlyFailedCount++ : failureCount++;
      }
    }

    return new Response(JSON.stringify({ success: true, processed: emails.length, successCount, failureCount, permanentlyFailedCount }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
