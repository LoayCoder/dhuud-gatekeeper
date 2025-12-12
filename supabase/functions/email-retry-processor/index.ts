import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// AWS SES Configuration
const AWS_ACCESS_KEY_ID = Deno.env.get("AWS_ACCESS_KEY_ID");
const AWS_SECRET_ACCESS_KEY = Deno.env.get("AWS_SECRET_ACCESS_KEY");
const AWS_SES_REGION = Deno.env.get("AWS_SES_REGION") || "us-east-1";
const AWS_SES_FROM_EMAIL = Deno.env.get("AWS_SES_FROM_EMAIL") || "noreply@dhuud.com";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const RETRY_DELAYS = [5 * 60, 30 * 60, 2 * 60 * 60];
const MAX_RETRIES = 3;

// AWS SES email sending helper
async function sendEmailViaSES(to: string, subject: string, html: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const host = `email.${AWS_SES_REGION}.amazonaws.com`;
  const endpoint = `https://${host}/`;
  const date = new Date();
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const params = new URLSearchParams({
    Action: 'SendEmail',
    Version: '2010-12-01',
    'Source': AWS_SES_FROM_EMAIL,
    'Destination.ToAddresses.member.1': to,
    'Message.Subject.Data': subject,
    'Message.Subject.Charset': 'UTF-8',
    'Message.Body.Html.Data': html,
    'Message.Body.Html.Charset': 'UTF-8',
  });

  const body = params.toString();
  const hashedPayload = await sha256(body);
  const canonicalRequest = ['POST', '/', '', `host:${host}`, `x-amz-date:${amzDate}`, '', 'host;x-amz-date', hashedPayload].join('\n');

  const hashedCanonicalRequest = await sha256(canonicalRequest);
  const credentialScope = `${dateStamp}/${AWS_SES_REGION}/ses/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, hashedCanonicalRequest].join('\n');

  const signingKey = await getSignatureKey(AWS_SECRET_ACCESS_KEY!, dateStamp, AWS_SES_REGION, 'ses');
  const signature = await hmacHex(signingKey, stringToSign);

  const authorizationHeader = [`AWS4-HMAC-SHA256 Credential=${AWS_ACCESS_KEY_ID}/${credentialScope}`, `SignedHeaders=host;x-amz-date`, `Signature=${signature}`].join(', ');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Host': host, 'X-Amz-Date': amzDate, 'Authorization': authorizationHeader },
    body,
  });

  const responseText = await response.text();
  if (!response.ok) {
    console.error('SES Error Response:', responseText);
    return { success: false, error: responseText };
  }

  const messageIdMatch = responseText.match(/<MessageId>(.+?)<\/MessageId>/);
  return { success: true, messageId: messageIdMatch ? messageIdMatch[1] : undefined };
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmac(key: Uint8Array, message: string): Promise<Uint8Array> {
  const keyBuffer = new ArrayBuffer(key.length);
  const keyView = new Uint8Array(keyBuffer);
  keyView.set(key);
  const cryptoKey = await crypto.subtle.importKey('raw', keyBuffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  return new Uint8Array(signature);
}

async function hmacHex(key: Uint8Array, message: string): Promise<string> {
  const sig = await hmac(key, message);
  return Array.from(sig).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Promise<Uint8Array> {
  const kDate = await hmac(new TextEncoder().encode('AWS4' + key), dateStamp);
  const kRegion = await hmac(kDate, regionName);
  const kService = await hmac(kRegion, serviceName);
  return await hmac(kService, 'aws4_request');
}

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
      if (!emailLog.payload?.htmlContent) {
        await supabase.from('email_delivery_logs').update({ status: 'permanently_failed', last_error: 'Missing payload data' }).eq('id', emailLog.id);
        permanentlyFailedCount++;
        continue;
      }

      try {
        const result = await sendEmailViaSES(emailLog.recipient_email, emailLog.subject, emailLog.payload.htmlContent);
        if (result.success) {
          await supabase.from('email_delivery_logs').update({ status: 'sent', provider_message_id: result.messageId, delivered_at: new Date().toISOString(), next_retry_at: null }).eq('id', emailLog.id);
          successCount++;
        } else {
          throw new Error(result.error || 'AWS SES send failed');
        }
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
