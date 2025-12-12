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

interface SubscriptionEmailRequest {
  type: 'request_submitted' | 'request_approved' | 'request_declined' | 'request_modified' | 'request_canceled' | 'trial_started' | 'trial_extended' | 'trial_ended' | 'module_enabled' | 'module_disabled';
  request_id?: string;
  tenant_name: string;
  tenant_email: string;
  plan_name?: string;
  user_count?: number;
  total_monthly?: number;
  billing_period?: string;
  admin_notes?: string;
  trial_end_date?: string;
  days_added?: number;
  module_name?: string;
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

const formatPrice = (cents: number): string => {
  return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(cents / 100);
};

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Subscription email function called");
  
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

    const payload: SubscriptionEmailRequest = await req.json();
    console.log("Email payload:", payload);

    const { type, tenant_name, tenant_email, plan_name, user_count, total_monthly, billing_period, admin_notes, trial_end_date, days_added, module_name } = payload;

    let subject = '';
    let htmlContent = '';
    const priceDisplay = total_monthly ? `${formatPrice(total_monthly)}/${billing_period === 'yearly' ? 'year' : 'month'}` : '';

    switch (type) {
      case 'request_submitted':
        subject = `New Subscription Request from ${tenant_name}`;
        htmlContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1 style="color: #2563eb;">New Subscription Request</h1><p>A new subscription request has been submitted and requires review.</p><div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;"><h3 style="margin-top: 0;">Request Details</h3><table style="width: 100%; border-collapse: collapse;"><tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Organization:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${tenant_name}</td></tr><tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Plan:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${plan_name}</td></tr><tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Users:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${user_count}</td></tr><tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Billing:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${billing_period === 'yearly' ? 'Annual' : 'Monthly'}</td></tr><tr><td style="padding: 8px 0;"><strong>Price:</strong></td><td style="padding: 8px 0; color: #2563eb; font-weight: bold;">${priceDisplay}</td></tr></table></div><p>Please review this request in the admin dashboard.</p><p style="color: #6b7280; font-size: 12px; margin-top: 30px;">This is an automated notification from Dhuud HSSE Platform.</p></div>`;
        break;
      case 'request_approved':
        subject = `Your Subscription Request Has Been Approved - ${tenant_name}`;
        htmlContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1 style="color: #16a34a;">Subscription Approved! ✓</h1><p>Great news! Your subscription request has been approved and your plan is now active.</p><div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #86efac;"><h3 style="margin-top: 0; color: #16a34a;">Your Active Plan</h3><table style="width: 100%; border-collapse: collapse;"><tr><td style="padding: 8px 0;"><strong>Plan:</strong></td><td style="padding: 8px 0;">${plan_name}</td></tr><tr><td style="padding: 8px 0;"><strong>Users:</strong></td><td style="padding: 8px 0;">${user_count}</td></tr><tr><td style="padding: 8px 0;"><strong>Price:</strong></td><td style="padding: 8px 0; color: #16a34a; font-weight: bold;">${priceDisplay}</td></tr></table></div>${admin_notes ? `<div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;"><p style="margin: 0;"><strong>Admin Note:</strong></p><p style="margin: 8px 0 0 0;">${admin_notes}</p></div>` : ''}<p>You can now access all features included in your plan.</p><p style="color: #6b7280; font-size: 12px; margin-top: 30px;">Dhuud HSSE Platform</p></div>`;
        break;
      case 'request_declined':
        subject = `Subscription Request Update - ${tenant_name}`;
        htmlContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1 style="color: #dc2626;">Subscription Request Declined</h1><p>We regret to inform you that your subscription request could not be approved at this time.</p><div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fecaca;"><h3 style="margin-top: 0;">Request Details</h3><table style="width: 100%; border-collapse: collapse;"><tr><td style="padding: 8px 0;"><strong>Plan:</strong></td><td style="padding: 8px 0;">${plan_name}</td></tr><tr><td style="padding: 8px 0;"><strong>Users:</strong></td><td style="padding: 8px 0;">${user_count}</td></tr></table></div>${admin_notes ? `<div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;"><p style="margin: 0;"><strong>Reason:</strong></p><p style="margin: 8px 0 0 0;">${admin_notes}</p></div>` : ''}<p>Please contact our support team if you have any questions.</p><p style="color: #6b7280; font-size: 12px; margin-top: 30px;">Dhuud HSSE Platform</p></div>`;
        break;
      case 'trial_started':
        subject = `Trial Period Started - ${tenant_name}`;
        htmlContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1 style="color: #2563eb;">🎉 Your Trial Has Started!</h1><p>Welcome to Dhuud HSSE Platform! Your trial period is now active.</p><div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bfdbfe;"><h3 style="margin-top: 0; color: #2563eb;">Trial Details</h3><table style="width: 100%; border-collapse: collapse;"><tr><td style="padding: 8px 0;"><strong>Organization:</strong></td><td style="padding: 8px 0;">${tenant_name}</td></tr><tr><td style="padding: 8px 0;"><strong>Trial Ends:</strong></td><td style="padding: 8px 0; color: #2563eb; font-weight: bold;">${trial_end_date ? formatDate(trial_end_date) : 'N/A'}</td></tr></table></div><p>During your trial, you have access to all platform features.</p><p style="color: #6b7280; font-size: 12px; margin-top: 30px;">Dhuud HSSE Platform</p></div>`;
        break;
      case 'trial_extended':
        subject = `Trial Period Extended - ${tenant_name}`;
        htmlContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1 style="color: #16a34a;">✨ Your Trial Has Been Extended!</h1><p>Great news! Your trial period has been extended.</p><div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #86efac;"><h3 style="margin-top: 0; color: #16a34a;">Extended Trial Details</h3><table style="width: 100%; border-collapse: collapse;"><tr><td style="padding: 8px 0;"><strong>Organization:</strong></td><td style="padding: 8px 0;">${tenant_name}</td></tr>${days_added ? `<tr><td style="padding: 8px 0;"><strong>Days Added:</strong></td><td style="padding: 8px 0;">${days_added} days</td></tr>` : ''}<tr><td style="padding: 8px 0;"><strong>New End Date:</strong></td><td style="padding: 8px 0; color: #16a34a; font-weight: bold;">${trial_end_date ? formatDate(trial_end_date) : 'N/A'}</td></tr></table></div><p>Continue exploring all the features!</p><p style="color: #6b7280; font-size: 12px; margin-top: 30px;">Dhuud HSSE Platform</p></div>`;
        break;
      case 'trial_ended':
        subject = `Trial Period Ended - ${tenant_name}`;
        htmlContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1 style="color: #f59e0b;">⏰ Your Trial Has Ended</h1><p>Your trial period has come to an end.</p><div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fcd34d;"><h3 style="margin-top: 0; color: #f59e0b;">What's Next?</h3><p>To continue using Dhuud HSSE Platform, please subscribe to one of our plans.</p></div><p>Contact our team if you have any questions.</p><p style="color: #6b7280; font-size: 12px; margin-top: 30px;">Dhuud HSSE Platform</p></div>`;
        break;
      case 'module_enabled':
        subject = `Module Access Enabled - ${tenant_name}`;
        htmlContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1 style="color: #16a34a;">✅ Module Access Enabled</h1><p>A new feature module has been enabled for your organization.</p><div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #86efac;"><h3 style="margin-top: 0; color: #16a34a;">Module Details</h3><table style="width: 100%; border-collapse: collapse;"><tr><td style="padding: 8px 0;"><strong>Organization:</strong></td><td style="padding: 8px 0;">${tenant_name}</td></tr><tr><td style="padding: 8px 0;"><strong>Module:</strong></td><td style="padding: 8px 0; color: #16a34a; font-weight: bold;">${module_name}</td></tr><tr><td style="padding: 8px 0;"><strong>Status:</strong></td><td style="padding: 8px 0;">Enabled</td></tr></table></div><p>You can now access this module's features in your dashboard.</p><p style="color: #6b7280; font-size: 12px; margin-top: 30px;">Dhuud HSSE Platform</p></div>`;
        break;
      case 'module_disabled':
        subject = `Module Access Disabled - ${tenant_name}`;
        htmlContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1 style="color: #dc2626;">Module Access Disabled</h1><p>A feature module has been disabled for your organization.</p><div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fecaca;"><h3 style="margin-top: 0; color: #dc2626;">Module Details</h3><table style="width: 100%; border-collapse: collapse;"><tr><td style="padding: 8px 0;"><strong>Organization:</strong></td><td style="padding: 8px 0;">${tenant_name}</td></tr><tr><td style="padding: 8px 0;"><strong>Module:</strong></td><td style="padding: 8px 0;">${module_name}</td></tr><tr><td style="padding: 8px 0;"><strong>Status:</strong></td><td style="padding: 8px 0; color: #dc2626;">Disabled</td></tr></table></div><p>If this was unexpected, please contact support.</p><p style="color: #6b7280; font-size: 12px; margin-top: 30px;">Dhuud HSSE Platform</p></div>`;
        break;
      default:
        subject = `Subscription Update - ${tenant_name}`;
        htmlContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Subscription Update</h1><p>There has been an update to your subscription.</p><p style="color: #6b7280; font-size: 12px; margin-top: 30px;">Dhuud HSSE Platform</p></div>`;
    }

    const result = await sendEmailViaSES(tenant_email, subject, htmlContent);

    if (!result.success) {
      console.error("AWS SES error:", result.error);
      throw new Error(result.error || "Failed to send email");
    }

    console.log("Email sent successfully:", result.messageId);

    return new Response(JSON.stringify({ success: true, messageId: result.messageId }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: unknown) {
    console.error("Error in send-subscription-email function:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);
