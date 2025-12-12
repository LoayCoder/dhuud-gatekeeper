import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// AWS SES Configuration
const AWS_ACCESS_KEY_ID = Deno.env.get("AWS_ACCESS_KEY_ID");
const AWS_SECRET_ACCESS_KEY = Deno.env.get("AWS_SECRET_ACCESS_KEY");
const AWS_SES_REGION = Deno.env.get("AWS_SES_REGION") || "us-east-1";
const AWS_SES_FROM_EMAIL = Deno.env.get("AWS_SES_FROM_EMAIL") || "noreply@dhuud.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IncidentEmailRequest {
  type: 'severity_proposed' | 'severity_approved' | 'severity_rejected' | 'closure_requested' | 'closure_approved' | 'closure_rejected';
  incident_id: string;
  incident_title: string;
  incident_reference: string;
  current_severity: string;
  proposed_severity?: string;
  original_severity?: string;
  justification?: string;
  closure_notes?: string;
  rejection_notes?: string;
  actor_name: string;
  actor_email?: string;
  tenant_id: string;
}

// AWS SES email sending helper
async function sendEmailViaSES(to: string[], subject: string, html: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const host = `email.${AWS_SES_REGION}.amazonaws.com`;
  const endpoint = `https://${host}/`;
  const date = new Date();
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const params = new URLSearchParams({
    Action: 'SendEmail',
    Version: '2010-12-01',
    'Source': AWS_SES_FROM_EMAIL,
    'Message.Subject.Data': subject,
    'Message.Subject.Charset': 'UTF-8',
    'Message.Body.Html.Data': html,
    'Message.Body.Html.Charset': 'UTF-8',
  });

  // Add multiple recipients
  to.forEach((email, index) => {
    params.append(`Destination.ToAddresses.member.${index + 1}`, email);
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

const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'critical': return '#dc2626';
    case 'high': return '#ea580c';
    case 'medium': return '#ca8a04';
    case 'low': return '#16a34a';
    default: return '#6b7280';
  }
};

const getSeverityLabel = (severity: string): string => severity.charAt(0).toUpperCase() + severity.slice(1);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: IncidentEmailRequest = await req.json();
    console.log("Received incident email request:", payload);

    const { type, incident_title, incident_reference, current_severity, proposed_severity, original_severity, justification, actor_name, tenant_id } = payload;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: hsseUsers, error: rolesError } = await supabase
      .from('user_role_assignments')
      .select(`user_id, roles!inner(code)`)
      .in('roles.code', ['hsse_manager', 'hsse_officer', 'admin']);

    if (rolesError) console.error("Error fetching HSSE users:", rolesError);

    const hsseUserIds = hsseUsers?.map(u => u.user_id) || [];
    const recipientEmails: string[] = [];
    
    for (const userId of hsseUserIds) {
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      if (userData?.user?.email) recipientEmails.push(userData.user.email);
    }

    console.log("Recipient emails:", recipientEmails);

    if (recipientEmails.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No recipients to notify" }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const baseStyles = `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333;`;
    const cardStyles = `background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin: 20px 0;`;
    const badgeStyles = (color: string) => `display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; color: white; background-color: ${color};`;

    let subject = '';
    let htmlContent = '';

    switch (type) {
      case 'severity_proposed':
        subject = `🔔 Severity Change Proposed - ${incident_reference}`;
        htmlContent = `<div style="${baseStyles}"><div style="${cardStyles}"><h2 style="margin-top: 0; color: #1f2937;">Severity Change Proposed</h2><p style="color: #6b7280;">A severity change has been proposed for an incident and requires your review.</p><table style="width: 100%; border-collapse: collapse; margin: 20px 0;"><tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Reference:</td><td style="padding: 8px 0; font-weight: 600;">${incident_reference}</td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Title:</td><td style="padding: 8px 0;">${incident_title}</td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Current Severity:</td><td style="padding: 8px 0;"><span style="${badgeStyles(getSeverityColor(current_severity))}">${getSeverityLabel(current_severity)}</span></td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Proposed Severity:</td><td style="padding: 8px 0;"><span style="${badgeStyles(getSeverityColor(proposed_severity || ''))}">${getSeverityLabel(proposed_severity || '')}</span></td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Proposed By:</td><td style="padding: 8px 0;">${actor_name}</td></tr></table><div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 16px; margin: 20px 0;"><p style="margin: 0 0 8px 0; font-weight: 600; color: #92400e;">Justification:</p><p style="margin: 0; color: #78350f;">${justification || 'No justification provided'}</p></div><p style="color: #6b7280; font-size: 14px;">Please review this request in the Investigation Workspace.</p></div><p style="color: #9ca3af; font-size: 12px; text-align: center;">This is an automated notification from Dhuud HSSE Platform</p></div>`;
        break;
      case 'severity_approved':
        subject = `✅ Severity Change Approved - ${incident_reference}`;
        htmlContent = `<div style="${baseStyles}"><div style="${cardStyles}"><h2 style="margin-top: 0; color: #16a34a;">Severity Change Approved</h2><p style="color: #6b7280;">The severity change for the following incident has been approved.</p><table style="width: 100%; border-collapse: collapse; margin: 20px 0;"><tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Reference:</td><td style="padding: 8px 0; font-weight: 600;">${incident_reference}</td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Title:</td><td style="padding: 8px 0;">${incident_title}</td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Original Severity:</td><td style="padding: 8px 0;"><span style="${badgeStyles(getSeverityColor(original_severity || ''))}">${getSeverityLabel(original_severity || '')}</span></td></tr><tr><td style="padding: 8px 0; color: #6b7280;">New Severity:</td><td style="padding: 8px 0;"><span style="${badgeStyles(getSeverityColor(current_severity))}">${getSeverityLabel(current_severity)}</span></td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Approved By:</td><td style="padding: 8px 0;">${actor_name}</td></tr></table><div style="background: #dcfce7; border: 1px solid #86efac; border-radius: 6px; padding: 16px;"><p style="margin: 0; color: #166534;">✓ The severity has been officially updated in the system.</p></div></div><p style="color: #9ca3af; font-size: 12px; text-align: center;">This is an automated notification from Dhuud HSSE Platform</p></div>`;
        break;
      case 'severity_rejected':
        subject = `❌ Severity Change Rejected - ${incident_reference}`;
        htmlContent = `<div style="${baseStyles}"><div style="${cardStyles}"><h2 style="margin-top: 0; color: #dc2626;">Severity Change Rejected</h2><p style="color: #6b7280;">The severity change request has been rejected.</p><table style="width: 100%; border-collapse: collapse; margin: 20px 0;"><tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Reference:</td><td style="padding: 8px 0; font-weight: 600;">${incident_reference}</td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Title:</td><td style="padding: 8px 0;">${incident_title}</td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Proposed:</td><td style="padding: 8px 0;"><span style="${badgeStyles(getSeverityColor(proposed_severity || ''))}">${getSeverityLabel(proposed_severity || '')}</span> ← Rejected</td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Reverted To:</td><td style="padding: 8px 0;"><span style="${badgeStyles(getSeverityColor(original_severity || ''))}">${getSeverityLabel(original_severity || '')}</span></td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Rejected By:</td><td style="padding: 8px 0;">${actor_name}</td></tr></table><div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px;"><p style="margin: 0; color: #991b1b;">The severity has been reverted to its original value.</p></div></div><p style="color: #9ca3af; font-size: 12px; text-align: center;">This is an automated notification from Dhuud HSSE Platform</p></div>`;
        break;
      case 'closure_requested':
        subject = `🔒 Closure Requested - ${incident_reference}`;
        htmlContent = `<div style="${baseStyles}"><div style="${cardStyles}"><h2 style="margin-top: 0; color: #6366f1;">Incident Closure Requested</h2><p style="color: #6b7280;">A closure request has been submitted for the following incident.</p><table style="width: 100%; border-collapse: collapse; margin: 20px 0;"><tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Reference:</td><td style="padding: 8px 0; font-weight: 600;">${incident_reference}</td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Title:</td><td style="padding: 8px 0;">${incident_title}</td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Requested By:</td><td style="padding: 8px 0;">${actor_name}</td></tr></table>${payload.closure_notes ? `<div style="background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 20px 0;"><p style="margin: 0 0 8px 0; font-weight: 600; color: #374151;">Notes:</p><p style="margin: 0; color: #4b5563;">${payload.closure_notes}</p></div>` : ''}<p style="color: #6b7280; font-size: 14px;">Please review in the Investigation Workspace.</p></div><p style="color: #9ca3af; font-size: 12px; text-align: center;">This is an automated notification from Dhuud HSSE Platform</p></div>`;
        break;
      case 'closure_approved':
        subject = `✅ Incident Closed - ${incident_reference}`;
        htmlContent = `<div style="${baseStyles}"><div style="${cardStyles}"><h2 style="margin-top: 0; color: #16a34a;">Incident Closed</h2><p style="color: #6b7280;">The following incident has been officially closed.</p><table style="width: 100%; border-collapse: collapse; margin: 20px 0;"><tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Reference:</td><td style="padding: 8px 0; font-weight: 600;">${incident_reference}</td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Title:</td><td style="padding: 8px 0;">${incident_title}</td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Closed By:</td><td style="padding: 8px 0;">${actor_name}</td></tr></table><div style="background: #dcfce7; border: 1px solid #86efac; border-radius: 6px; padding: 16px;"><p style="margin: 0; color: #166534;">✓ This incident is now closed. All corrective actions have been verified.</p></div></div><p style="color: #9ca3af; font-size: 12px; text-align: center;">This is an automated notification from Dhuud HSSE Platform</p></div>`;
        break;
      case 'closure_rejected':
        subject = `❌ Closure Rejected - ${incident_reference}`;
        htmlContent = `<div style="${baseStyles}"><div style="${cardStyles}"><h2 style="margin-top: 0; color: #dc2626;">Closure Request Rejected</h2><p style="color: #6b7280;">The closure request has been rejected.</p><table style="width: 100%; border-collapse: collapse; margin: 20px 0;"><tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Reference:</td><td style="padding: 8px 0; font-weight: 600;">${incident_reference}</td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Title:</td><td style="padding: 8px 0;">${incident_title}</td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Rejected By:</td><td style="padding: 8px 0;">${actor_name}</td></tr></table>${payload.rejection_notes ? `<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin: 20px 0;"><p style="margin: 0 0 8px 0; font-weight: 600; color: #991b1b;">Rejection Reason:</p><p style="margin: 0; color: #7f1d1d;">${payload.rejection_notes}</p></div>` : ''}<p style="color: #6b7280; font-size: 14px;">The investigation remains open.</p></div><p style="color: #9ca3af; font-size: 12px; text-align: center;">This is an automated notification from Dhuud HSSE Platform</p></div>`;
        break;
    }

    const result = await sendEmailViaSES(recipientEmails, subject, htmlContent);
    console.log("Email sent successfully:", result);

    return new Response(JSON.stringify({ success: result.success, messageId: result.messageId }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: unknown) {
    console.error("Error in send-incident-email:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);
