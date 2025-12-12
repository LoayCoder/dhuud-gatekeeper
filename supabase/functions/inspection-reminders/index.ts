import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

// AWS SES Configuration
const AWS_ACCESS_KEY_ID = Deno.env.get("AWS_ACCESS_KEY_ID");
const AWS_SECRET_ACCESS_KEY = Deno.env.get("AWS_SECRET_ACCESS_KEY");
const AWS_SES_REGION = Deno.env.get("AWS_SES_REGION") || "us-east-1";
const AWS_SES_FROM_EMAIL = Deno.env.get("AWS_SES_FROM_EMAIL") || "noreply@dhuud.com";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpcomingSchedule {
  id: string;
  reference_id: string;
  name: string;
  schedule_type: string;
  next_due: string;
  days_until: number;
  assigned_inspector_id: string | null;
  template_id: string;
  tenant_id: string;
  reminder_days_before: number;
  last_reminder_sent: string | null;
}

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[inspection-reminders] Starting reminder check...');

    const { data: schedules, error: schedulesError } = await supabase
      .from('inspection_schedules')
      .select(`id, reference_id, name, schedule_type, next_due, assigned_inspector_id, template_id, tenant_id, reminder_days_before, last_reminder_sent`)
      .eq('is_active', true)
      .is('deleted_at', null)
      .not('next_due', 'is', null);

    if (schedulesError) throw schedulesError;

    console.log(`[inspection-reminders] Found ${schedules?.length || 0} active schedules`);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const remindersToSend: UpcomingSchedule[] = [];

    for (const schedule of schedules || []) {
      const nextDue = new Date(schedule.next_due);
      const daysUntil = Math.ceil((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntil <= schedule.reminder_days_before && daysUntil >= 0) {
        const lastSent = schedule.last_reminder_sent ? new Date(schedule.last_reminder_sent) : null;
        const lastSentToday = lastSent && lastSent.getFullYear() === today.getFullYear() && lastSent.getMonth() === today.getMonth() && lastSent.getDate() === today.getDate();

        if (!lastSentToday) {
          remindersToSend.push({ ...schedule, days_until: daysUntil });
        }
      }
    }

    console.log(`[inspection-reminders] ${remindersToSend.length} reminders to send`);

    const results = { processed: 0, emailsSent: 0, errors: [] as string[] };

    for (const schedule of remindersToSend) {
      try {
        let inspectorEmail: string | null = null;
        let inspectorName: string | null = null;

        if (schedule.assigned_inspector_id) {
          const { data: inspector } = await supabase.from('profiles').select('full_name, user_id').eq('id', schedule.assigned_inspector_id).single();

          if (inspector?.user_id) {
            const { data: authUser } = await supabase.auth.admin.getUserById(inspector.user_id);
            inspectorEmail = authUser?.user?.email || null;
            inspectorName = inspector.full_name;
          }
        }

        const { data: tenant } = await supabase.from('tenants').select('name').eq('id', schedule.tenant_id).single();

        if (inspectorEmail) {
          const dueText = schedule.days_until === 0 ? 'today' : schedule.days_until === 1 ? 'tomorrow' : `in ${schedule.days_until} days`;

          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a1a1a;">Inspection Reminder</h2>
              <p>Hello ${inspectorName || 'Inspector'},</p>
              <p>This is a reminder that you have an inspection scheduled ${dueText}:</p>
              <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 0;"><strong>Schedule:</strong> ${schedule.name}</p>
                <p style="margin: 8px 0 0;"><strong>Reference:</strong> ${schedule.reference_id}</p>
                <p style="margin: 8px 0 0;"><strong>Type:</strong> ${schedule.schedule_type}</p>
                <p style="margin: 8px 0 0;"><strong>Due Date:</strong> ${new Date(schedule.next_due).toLocaleDateString()}</p>
              </div>
              <p>Please ensure you complete this inspection on time.</p>
              <p style="color: #666; font-size: 12px; margin-top: 24px;">This is an automated reminder from ${tenant?.name || 'DHUUD Platform'}.</p>
            </div>
          `;

          const result = await sendEmailViaSES(inspectorEmail, `Inspection Reminder: ${schedule.name} due ${dueText}`, emailHtml);
          
          if (result.success) {
            results.emailsSent++;
            console.log(`[inspection-reminders] Email sent to ${inspectorEmail} for schedule ${schedule.reference_id}`);
          } else {
            console.error(`[inspection-reminders] Email failed: ${result.error}`);
          }
        }

        await supabase.from('inspection_schedules').update({ last_reminder_sent: new Date().toISOString() }).eq('id', schedule.id);
        results.processed++;
      } catch (err) {
        const errorMsg = `Error processing schedule ${schedule.reference_id}: ${err}`;
        console.error(`[inspection-reminders] ${errorMsg}`);
        results.errors.push(errorMsg);
      }
    }

    console.log(`[inspection-reminders] Complete. Processed: ${results.processed}, Emails: ${results.emailsSent}`);

    return new Response(JSON.stringify({ success: true, ...results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[inspection-reminders] Fatal error:', error);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});
