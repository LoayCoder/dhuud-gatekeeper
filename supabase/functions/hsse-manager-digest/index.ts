import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

// AWS SES Configuration
const AWS_ACCESS_KEY_ID = Deno.env.get("AWS_ACCESS_KEY_ID");
const AWS_SECRET_ACCESS_KEY = Deno.env.get("AWS_SECRET_ACCESS_KEY");
const AWS_SES_REGION = Deno.env.get("AWS_SES_REGION") || "us-east-1";
const AWS_SES_FROM_EMAIL = Deno.env.get("AWS_SES_FROM_EMAIL") || "noreply@dhuud.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

// deno-lint-ignore no-explicit-any
function generateDigestHtml(tenantName: string, pendingClosures: any[], escalatedActions: any[], atRiskActions: any[]): string {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1a365d; border-bottom: 2px solid #3182ce; padding-bottom: 10px;">📊 HSSE Manager Daily Digest</h1>
      <p style="color: #666;">${today} | ${tenantName}</p>
      <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h2 style="margin: 0; font-size: 16px;">📊 SUMMARY</h2>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Pending Closures: <strong>${pendingClosures.length}</strong></li>
          <li>Escalated Actions: <strong>${escalatedActions.length}</strong></li>
          <li>Actions at Risk: <strong>${atRiskActions.length}</strong></li>
        </ul>
      </div>
  `;

  if (pendingClosures.length > 0) {
    html += `<h2 style="color: #744210; margin-top: 30px;">🔒 Pending Closure Requests</h2><table style="width: 100%; border-collapse: collapse;">`;
    for (const closure of pendingClosures) {
      const requestedAgo = closure.closure_requested_at ? Math.ceil((Date.now() - new Date(closure.closure_requested_at).getTime()) / (1000 * 60 * 60 * 24)) : 0;
      html += `<tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px;"><strong>${closure.reference_id}</strong> - ${closure.title}<br/><small style="color: #666;">Requested by: ${closure.profiles?.full_name || "Unknown"} | ${requestedAgo} days ago</small></td></tr>`;
    }
    html += `</table>`;
  }

  if (escalatedActions.length > 0) {
    html += `<h2 style="color: #c53030; margin-top: 30px;">🚨 Escalated Actions</h2><table style="width: 100%; border-collapse: collapse;">`;
    for (const action of escalatedActions) {
      const daysOverdue = action.due_date ? Math.ceil((Date.now() - new Date(action.due_date).getTime()) / (1000 * 60 * 60 * 24)) : 0;
      html += `<tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px;"><span style="background: ${action.escalation_level >= 2 ? "#c53030" : "#dd6b20"}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px;">Level ${action.escalation_level}</span> <strong>${action.title}</strong><br/><small style="color: #666;">Assigned to: ${action.profiles?.full_name || "Unassigned"} | ${daysOverdue} days overdue</small></td></tr>`;
    }
    html += `</table>`;
  }

  if (atRiskActions.length > 0) {
    html += `<h2 style="color: #b7791f; margin-top: 30px;">⚠️ Actions at Risk</h2><table style="width: 100%; border-collapse: collapse;">`;
    for (const action of atRiskActions) {
      const daysUntilDue = action.due_date ? Math.ceil((new Date(action.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
      html += `<tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px;"><strong>${action.title}</strong><br/><small style="color: #666;">Assigned to: ${action.profiles?.full_name || "Unassigned"} | Due in ${daysUntilDue} days</small></td></tr>`;
    }
    html += `</table>`;
  }

  html += `<p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #666; font-size: 12px;">This is an automated digest from DHUUD Platform. Log in to take action.</p></div>`;

  return html;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting HSSE Manager digest generation...");

    const { data: tenants, error: tenantsError } = await supabase.from("tenants").select("id, name").eq("status", "active");
    if (tenantsError) throw tenantsError;

    let emailsSent = 0;

    for (const tenant of tenants || []) {
      const { data: pendingClosures } = await supabase
        .from("incidents")
        .select(`id, reference_id, title, closure_requested_at, profiles!incidents_closure_requested_by_fkey(full_name)`)
        .eq("tenant_id", tenant.id)
        .eq("status", "pending_closure")
        .is("deleted_at", null);

      const { data: escalatedActions } = await supabase
        .from("corrective_actions")
        .select(`id, title, priority, due_date, escalation_level, profiles!corrective_actions_assigned_to_fkey(full_name)`)
        .eq("tenant_id", tenant.id)
        .gt("escalation_level", 0)
        .not("status", "in", "(completed,verified,closed)")
        .is("deleted_at", null);

      const { data: slaConfigs } = await supabase.from("action_sla_configs").select("*");
      const today = new Date();
      const { data: allActions } = await supabase
        .from("corrective_actions")
        .select(`id, title, priority, due_date, profiles!corrective_actions_assigned_to_fkey(full_name)`)
        .eq("tenant_id", tenant.id)
        .not("status", "in", "(completed,verified,closed)")
        .not("due_date", "is", null)
        .eq("escalation_level", 0)
        .is("deleted_at", null);

      const atRiskActions = (allActions || []).filter((action) => {
        if (!action.due_date) return false;
        const config = slaConfigs?.find((c) => c.priority === (action.priority || "medium"));
        if (!config) return false;
        const dueDate = new Date(action.due_date);
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilDue <= config.warning_days_before && daysUntilDue > 0;
      });

      if ((!pendingClosures || pendingClosures.length === 0) && (!escalatedActions || escalatedActions.length === 0) && atRiskActions.length === 0) {
        continue;
      }

      const { data: hsseManagers } = await supabase
        .from("user_role_assignments")
        .select(`user_id, profiles!inner(id, full_name, tenant_id, digest_opt_in, digest_preferred_time, digest_timezone), roles!inner(code)`)
        .eq("profiles.tenant_id", tenant.id)
        .eq("profiles.digest_opt_in", true)
        .in("roles.code", ["hsse_manager", "admin"]);

      for (const manager of hsseManagers || []) {
        const { data: authUser } = await supabase.auth.admin.getUserById(manager.user_id);

        if (authUser?.user?.email) {
          const html = generateDigestHtml(tenant.name, pendingClosures || [], escalatedActions || [], atRiskActions);
          await sendEmailViaSES(authUser.user.email, `📊 Daily HSSE Manager Digest - ${tenant.name}`, html);
          emailsSent++;
        }
      }
    }

    console.log(`Digest complete: ${emailsSent} emails sent`);

    return new Response(JSON.stringify({ success: true, emails_sent: emailsSent }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    console.error("Digest error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
