import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// AWS SES Configuration
const AWS_ACCESS_KEY_ID = Deno.env.get("AWS_ACCESS_KEY_ID");
const AWS_SECRET_ACCESS_KEY = Deno.env.get("AWS_SECRET_ACCESS_KEY");
const AWS_SES_REGION = Deno.env.get("AWS_SES_REGION") || "us-east-1";
const AWS_SES_FROM_EMAIL = Deno.env.get("AWS_SES_FROM_EMAIL") || "noreply@dhuud.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SupportEmailRequest {
  type: 'status_changed' | 'new_reply' | 'ticket_assigned' | 'sla_warning' | 'sla_breached' | 'ticket_escalated';
  ticket_number: number;
  ticket_subject: string;
  customer_email: string;
  customer_name?: string;
  old_status?: string;
  new_status?: string;
  reply_message?: string;
  agent_name?: string;
  assigned_to_name?: string;
  sla_type?: 'first_response' | 'resolution';
  time_remaining?: string;
  escalation_level?: number;
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

const statusLabels: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  waiting_customer: 'Waiting for Customer',
  resolved: 'Resolved',
  closed: 'Closed',
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Support email function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized - No authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const payload: SupportEmailRequest = await req.json();
    console.log("Email payload:", payload);

    const { type, ticket_number, ticket_subject, customer_email, customer_name = 'Customer', old_status, new_status, reply_message, agent_name, assigned_to_name, sla_type, time_remaining, escalation_level } = payload;

    let subject = '';
    let htmlContent = '';
    const ticketLink = `Ticket #${ticket_number}`;

    switch (type) {
      case 'status_changed':
        subject = `[Ticket #${ticket_number}] Status Updated - ${ticket_subject}`;
        htmlContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1 style="color: #2563eb;">Ticket Status Updated</h1><p>Hello ${customer_name},</p><p>The status of your support ticket has been updated.</p><div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;"><h3 style="margin-top: 0;">${ticketLink}: ${ticket_subject}</h3><table style="width: 100%; border-collapse: collapse;"><tr><td style="padding: 8px 0;"><strong>Previous Status:</strong></td><td style="padding: 8px 0;">${statusLabels[old_status || ''] || old_status}</td></tr><tr><td style="padding: 8px 0;"><strong>New Status:</strong></td><td style="padding: 8px 0; color: #2563eb; font-weight: bold;">${statusLabels[new_status || ''] || new_status}</td></tr></table></div>${new_status === 'resolved' ? `<p style="color: #16a34a;">Your ticket has been resolved. If you have any further questions, feel free to reply to this email or create a new ticket.</p>` : ''}<p style="color: #6b7280; font-size: 12px; margin-top: 30px;">Dhuud HSSE Platform - Support Team</p></div>`;
        break;
      case 'new_reply':
        subject = `[Ticket #${ticket_number}] New Reply - ${ticket_subject}`;
        htmlContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1 style="color: #2563eb;">New Reply on Your Ticket</h1><p>Hello ${customer_name},</p><p>You have received a new reply on your support ticket.</p><div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bfdbfe;"><h3 style="margin-top: 0; color: #2563eb;">${ticketLink}: ${ticket_subject}</h3><p style="margin: 0;"><strong>From:</strong> ${agent_name || 'Support Team'}</p></div><div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;"><p style="margin: 0; white-space: pre-wrap;">${reply_message}</p></div><p>Log in to your account to view the full conversation and reply.</p><p style="color: #6b7280; font-size: 12px; margin-top: 30px;">Dhuud HSSE Platform - Support Team</p></div>`;
        break;
      case 'ticket_assigned':
        subject = `[Ticket #${ticket_number}] Agent Assigned - ${ticket_subject}`;
        htmlContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1 style="color: #2563eb;">Support Agent Assigned</h1><p>Hello ${customer_name},</p><p>A support agent has been assigned to your ticket and will be assisting you.</p><div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #86efac;"><h3 style="margin-top: 0; color: #16a34a;">${ticketLink}: ${ticket_subject}</h3><p style="margin: 0;"><strong>Assigned Agent:</strong> ${assigned_to_name}</p></div><p>You can expect a response shortly. We'll notify you when there's an update.</p><p style="color: #6b7280; font-size: 12px; margin-top: 30px;">Dhuud HSSE Platform - Support Team</p></div>`;
        break;
      case 'sla_warning':
        subject = `[INTERNAL] SLA Warning - Ticket #${ticket_number}`;
        htmlContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1 style="color: #f59e0b;">⚠️ SLA Warning</h1><p>A ticket is approaching its SLA deadline.</p><div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fcd34d;"><h3 style="margin-top: 0; color: #f59e0b;">${ticketLink}: ${ticket_subject}</h3><table style="width: 100%; border-collapse: collapse;"><tr><td style="padding: 8px 0;"><strong>SLA Type:</strong></td><td style="padding: 8px 0;">${sla_type === 'first_response' ? 'First Response' : 'Resolution'}</td></tr><tr><td style="padding: 8px 0;"><strong>Time Remaining:</strong></td><td style="padding: 8px 0; color: #f59e0b; font-weight: bold;">${time_remaining}</td></tr>${assigned_to_name ? `<tr><td style="padding: 8px 0;"><strong>Assigned To:</strong></td><td style="padding: 8px 0;">${assigned_to_name}</td></tr>` : ''}</table></div><p>Please take action to avoid an SLA breach.</p><p style="color: #6b7280; font-size: 12px; margin-top: 30px;">Dhuud HSSE Platform - Automated Alert</p></div>`;
        break;
      case 'sla_breached':
        subject = `[URGENT] SLA Breached - Ticket #${ticket_number}`;
        htmlContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1 style="color: #dc2626;">🚨 SLA Breached</h1><p>A ticket has breached its SLA deadline and requires immediate attention.</p><div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fecaca;"><h3 style="margin-top: 0; color: #dc2626;">${ticketLink}: ${ticket_subject}</h3><table style="width: 100%; border-collapse: collapse;"><tr><td style="padding: 8px 0;"><strong>SLA Type:</strong></td><td style="padding: 8px 0;">${sla_type === 'first_response' ? 'First Response' : 'Resolution'}</td></tr><tr><td style="padding: 8px 0;"><strong>Status:</strong></td><td style="padding: 8px 0; color: #dc2626; font-weight: bold;">BREACHED</td></tr>${assigned_to_name ? `<tr><td style="padding: 8px 0;"><strong>Assigned To:</strong></td><td style="padding: 8px 0;">${assigned_to_name}</td></tr>` : ''}</table></div><p style="color: #dc2626; font-weight: bold;">Immediate action required.</p><p style="color: #6b7280; font-size: 12px; margin-top: 30px;">Dhuud HSSE Platform - Automated Alert</p></div>`;
        break;
      case 'ticket_escalated':
        subject = `[ESCALATION] Ticket #${ticket_number} Escalated to Level ${escalation_level}`;
        htmlContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1 style="color: #7c3aed;">⬆️ Ticket Escalated</h1><p>A ticket has been escalated due to SLA concerns.</p><div style="background: #f5f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #c4b5fd;"><h3 style="margin-top: 0; color: #7c3aed;">${ticketLink}: ${ticket_subject}</h3><table style="width: 100%; border-collapse: collapse;"><tr><td style="padding: 8px 0;"><strong>Escalation Level:</strong></td><td style="padding: 8px 0; color: #7c3aed; font-weight: bold;">Level ${escalation_level}</td></tr>${assigned_to_name ? `<tr><td style="padding: 8px 0;"><strong>Currently Assigned:</strong></td><td style="padding: 8px 0;">${assigned_to_name}</td></tr>` : ''}</table></div><p>This ticket requires senior attention.</p><p style="color: #6b7280; font-size: 12px; margin-top: 30px;">Dhuud HSSE Platform - Automated Escalation</p></div>`;
        break;
      default:
        return new Response(JSON.stringify({ error: "Unknown email type" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const adminEmail = Deno.env.get("ADMIN_EMAIL") || "admin@dhuud.com";
    const isInternalAlert = ['sla_warning', 'sla_breached', 'ticket_escalated'].includes(type);
    const toEmail = isInternalAlert ? adminEmail : customer_email;

    console.log(`Sending ${type} email to ${toEmail}`);

    const result = await sendEmailViaSES(toEmail, subject, htmlContent);

    if (!result.success) {
      console.error("AWS SES error:", result.error);
      throw new Error(result.error || "Email sending failed");
    }

    console.log("Email sent successfully:", result.messageId);

    return new Response(JSON.stringify({ success: true, messageId: result.messageId }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: unknown) {
    console.error("Error in send-support-email function:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);
