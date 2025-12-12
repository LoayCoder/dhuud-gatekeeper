import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// AWS SES Configuration
const AWS_ACCESS_KEY_ID = Deno.env.get("AWS_ACCESS_KEY_ID");
const AWS_SECRET_ACCESS_KEY = Deno.env.get("AWS_SECRET_ACCESS_KEY");
const AWS_SES_REGION = Deno.env.get("AWS_SES_REGION") || "us-east-1";
const AWS_SES_FROM_EMAIL = Deno.env.get("AWS_SES_FROM_EMAIL") || "noreply@dhuud.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RETRY_DELAYS = [5 * 60, 30 * 60, 2 * 60 * 60];

interface WorkflowNotificationRequest {
  incidentId: string;
  action: string;
  notes?: string;
  returnReason?: string;
  returnInstructions?: string;
  rejectionReason?: string;
  disputeNotes?: string;
  justification?: string;
  investigatorId?: string;
}

// AWS SES Helper Functions
async function sha256(message: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  return await crypto.subtle.digest("SHA-256", encoder.encode(message));
}

async function hmac(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(message));
}

async function hmacHex(key: ArrayBuffer, message: string): Promise<string> {
  const sig = await hmac(key, message);
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function getSignatureKey(key: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
  const kDate = await hmac(new TextEncoder().encode("AWS4" + key).buffer as ArrayBuffer, dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  return await hmac(kService, "aws4_request");
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function sendEmailViaSES(to: string, subject: string, htmlBody: string, fromName?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    console.error("AWS credentials not configured");
    return { success: false, error: "AWS credentials not configured" };
  }

  const service = "ses";
  const host = `email.${AWS_SES_REGION}.amazonaws.com`;
  const endpoint = `https://${host}/`;
  const method = "POST";

  const fromAddress = fromName ? `${fromName} <${AWS_SES_FROM_EMAIL}>` : AWS_SES_FROM_EMAIL;

  const params = new URLSearchParams();
  params.append("Action", "SendEmail");
  params.append("Source", fromAddress);
  params.append("Destination.ToAddresses.member.1", to);
  params.append("Message.Subject.Data", subject);
  params.append("Message.Subject.Charset", "UTF-8");
  params.append("Message.Body.Html.Data", htmlBody);
  params.append("Message.Body.Html.Charset", "UTF-8");
  params.append("Version", "2010-12-01");

  const body = params.toString();
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const contentType = "application/x-www-form-urlencoded";
  const payloadHash = toHex(await sha256(body));

  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-date";
  const canonicalRequest = `${method}\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${AWS_SES_REGION}/${service}/aws4_request`;
  const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${toHex(await sha256(canonicalRequest))}`;

  const signingKey = await getSignatureKey(AWS_SECRET_ACCESS_KEY, dateStamp, AWS_SES_REGION, service);
  const signature = await hmacHex(signingKey, stringToSign);

  const authorizationHeader = `${algorithm} Credential=${AWS_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  try {
    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": contentType,
        "X-Amz-Date": amzDate,
        "Authorization": authorizationHeader,
      },
      body,
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error("AWS SES error response:", responseText);
      return { success: false, error: `SES error: ${response.status} - ${responseText}` };
    }

    const messageIdMatch = responseText.match(/<MessageId>(.+?)<\/MessageId>/);
    const messageId = messageIdMatch ? messageIdMatch[1] : undefined;

    console.log(`Email sent successfully via AWS SES to ${to}, MessageId: ${messageId}`);
    return { success: true, messageId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("AWS SES request failed:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

// deno-lint-ignore no-explicit-any
async function createEmailLog(supabase: any, entry: Record<string, unknown>): Promise<string | null> {
  const { data, error } = await supabase.from('email_delivery_logs').insert(entry).select('id').single();
  if (error) { console.error('Failed to create email log:', error); return null; }
  return data?.id || null;
}

// deno-lint-ignore no-explicit-any
async function updateEmailLog(supabase: any, logId: string, updates: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from('email_delivery_logs').update(updates).eq('id', logId);
  if (error) console.error('Failed to update email log:', error);
}

// deno-lint-ignore no-explicit-any
async function sendEmailWithTracking(supabase: any, tenantId: string, tenantName: string, emailType: string, recipients: string[], subject: string, htmlContent: string, relatedEntityId: string, payload: Record<string, unknown>): Promise<{ success: boolean; sentCount: number }> {
  const validEmails = recipients.filter(r => r && r.includes("@"));
  if (validEmails.length === 0) return { success: true, sentCount: 0 };

  let sentCount = 0;
  for (const recipientEmail of validEmails) {
    const logId = await createEmailLog(supabase, {
      tenant_id: tenantId, function_name: 'send-workflow-notification', email_type: emailType,
      recipient_email: recipientEmail, subject, status: 'pending', retry_count: 0, max_retries: 3,
      related_entity_type: 'incident', related_entity_id: relatedEntityId,
      payload: { ...payload, htmlContent, tenantName }
    });
    if (!logId) continue;

    const result = await sendEmailViaSES(recipientEmail, subject, htmlContent, tenantName);
    
    if (result.success) {
      await updateEmailLog(supabase, logId, { status: 'sent', provider_message_id: result.messageId, delivered_at: new Date().toISOString() });
      console.log(`Email sent to ${recipientEmail}`);
      sentCount++;
    } else {
      const nextDelay = RETRY_DELAYS[0];
      await updateEmailLog(supabase, logId, { status: 'failed', last_error: result.error, retry_count: 1, next_retry_at: new Date(Date.now() + nextDelay * 1000).toISOString() });
    }
  }
  return { success: true, sentCount };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const payload: WorkflowNotificationRequest = await req.json();
    const { incidentId, action } = payload;
    console.log(`Processing workflow notification: ${action} for incident ${incidentId}`);

    const { data: incident, error: incidentError } = await supabase.from("incidents")
      .select(`id, reference_id, title, reporter_id, tenant_id, approval_manager_id, profiles!incidents_reporter_id_fkey(id, full_name, email)`)
      .eq("id", incidentId).single();

    if (incidentError || !incident) return new Response(JSON.stringify({ error: "Incident not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: tenant } = await supabase.from("tenants").select("name").eq("id", incident.tenant_id).single();
    const tenantName = tenant?.name || "HSSE Platform";
    // deno-lint-ignore no-explicit-any
    const reporterProfile = (incident.profiles as any)?.[0] || null;

    let recipients: string[] = [];
    let subject = "";
    let htmlContent = "";

    switch (action) {
      case "expert_return":
        if (reporterProfile?.email) recipients.push(reporterProfile.email);
        subject = `[${tenantName}] Action Required: Event Report Returned for Correction`;
        htmlContent = `<h2>Event Report Returned for Correction</h2><p>Dear ${reporterProfile?.full_name || "Reporter"},</p><p>Your event report <strong>${incident.reference_id}</strong> has been returned by the HSSE Expert for correction.</p>${payload.returnReason ? `<p><strong>Reason:</strong> ${payload.returnReason}</p>` : ""}${payload.returnInstructions ? `<p><strong>Instructions:</strong> ${payload.returnInstructions}</p>` : ""}<p>Please log in to review and resubmit your report.</p><p>Best regards,<br>${tenantName} HSSE Team</p>`;
        break;
      case "expert_reject":
        if (reporterProfile?.email) recipients.push(reporterProfile.email);
        subject = `[${tenantName}] Event Report Rejected - Action Required`;
        htmlContent = `<h2>Event Report Rejected</h2><p>Dear ${reporterProfile?.full_name || "Reporter"},</p><p>Your event report <strong>${incident.reference_id}</strong> has been rejected by the HSSE Expert.</p>${payload.rejectionReason ? `<p><strong>Reason:</strong> ${payload.rejectionReason}</p>` : ""}<p>Please log in to confirm this rejection or dispute it.</p><p>Best regards,<br>${tenantName} HSSE Team</p>`;
        break;
      case "expert_investigate":
        if (incident.approval_manager_id) {
          const { data: manager } = await supabase.from("profiles").select("email, full_name").eq("id", incident.approval_manager_id).single();
          if (manager?.email) recipients.push(manager.email);
          subject = `[${tenantName}] Investigation Approval Required`;
          htmlContent = `<h2>Investigation Approval Required</h2><p>Dear ${manager?.full_name || "Manager"},</p><p>Event <strong>${incident.reference_id}</strong> has been recommended for investigation by the HSSE Expert.</p><p><strong>Event Title:</strong> ${incident.title}</p>${payload.notes ? `<p><strong>Expert Notes:</strong> ${payload.notes}</p>` : ""}<p>Please log in to review and approve or reject this investigation request.</p><p>Best regards,<br>${tenantName} HSSE Team</p>`;
        }
        break;
      case "investigator_assigned":
        if (payload.investigatorId) {
          const { data: investigator } = await supabase.from("profiles").select("email, full_name").eq("id", payload.investigatorId).single();
          if (investigator?.email) recipients.push(investigator.email);
          subject = `[${tenantName}] You Have Been Assigned to Investigate Event ${incident.reference_id}`;
          htmlContent = `<h2>Investigation Assignment</h2><p>Dear ${investigator?.full_name || "Investigator"},</p><p>You have been assigned to investigate event <strong>${incident.reference_id}</strong>.</p><p><strong>Event Title:</strong> ${incident.title}</p><p>Please log in to begin your investigation.</p><p>Best regards,<br>${tenantName} HSSE Team</p>`;
        }
        break;
      default:
        console.log(`Unknown action: ${action}`);
    }

    let result = { success: true, sentCount: 0 };
    if (recipients.length > 0 && subject && htmlContent) {
      result = await sendEmailWithTracking(supabase, incident.tenant_id, tenantName, action, recipients, subject, htmlContent, incidentId, { ...payload });
    }

    return new Response(JSON.stringify({ success: true, action, recipientCount: recipients.length, sentCount: result.sentCount }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    console.error("Error in send-workflow-notification:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
