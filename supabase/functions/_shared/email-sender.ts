// Shared AWS SES Email Sender with Module-Based Sender Names
// This utility provides centralized email sending for all edge functions

// AWS SES Configuration
const AWS_ACCESS_KEY_ID = Deno.env.get("AWS_ACCESS_KEY_ID");

/**
 * Get the application base URL from environment
 */
export function getAppUrl(): string {
  return Deno.env.get("APP_URL") || "https://app.dhuud.com";
}

/**
 * Generate a styled CTA button for emails
 */
export function emailButton(text: string, url: string, color = "#1e40af"): string {
  return `
    <div style="text-align: center; margin: 24px 0;">
      <a href="${url}" style="display: inline-block; background: ${color}; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
        ${text} →
      </a>
    </div>
  `;
}
const AWS_SECRET_ACCESS_KEY = Deno.env.get("AWS_SECRET_ACCESS_KEY");
const AWS_SES_REGION = Deno.env.get("AWS_SES_REGION") || "us-east-1";
const AWS_SES_FROM_EMAIL = Deno.env.get("AWS_SES_FROM_EMAIL") || "noreply@dhuud.com";

// Module-based sender display names
export const EMAIL_SENDERS = {
  // HSSE Module
  incident_report: "DHUUD Incident Reporting",
  incident_workflow: "DHUUD HSSE Workflow",
  investigation: "DHUUD Investigation Team",
  
  // Corrective Actions Module
  action_assigned: "DHUUD Action Management",
  action_sla: "DHUUD SLA Alerts",
  action_escalation: "DHUUD Critical Alerts",
  action_warning: "DHUUD Action Reminders",
  
  // Inspection Module
  inspection_reminder: "DHUUD Inspections",
  inspection_schedule: "DHUUD Inspection Scheduler",
  inspection_assigned: "DHUUD Inspections",
  
  // Support Module
  support_ticket: "DHUUD Support Center",
  support_sla: "DHUUD Support Alerts",
  
  // Security Module
  security_alert: "DHUUD Security Operations",
  contractor_access: "DHUUD Contractor Portal",
  contractor_invitation: "DHUUD Contractor Portal",
  visitor_alert: "DHUUD Visitor Management",
  
  // Administration
  user_invitation: "DHUUD Platform",
  subscription: "DHUUD Billing",
  digest: "DHUUD Daily Digest",
  hsse_digest: "DHUUD HSSE Digest",
  
  // System
  system_alert: "DHUUD System Notifications",
  authentication: "DHUUD Security",
  
  // Default fallback
  default: "DHUUD Platform"
} as const;

export type EmailModule = keyof typeof EMAIL_SENDERS;

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  module: EmailModule;
  tenantName?: string; // Optional tenant name to override default sender
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// AWS Signature V4 Helper Functions
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmac(key: Uint8Array, message: string): Promise<Uint8Array> {
  const keyBuffer = new ArrayBuffer(key.length);
  const keyView = new Uint8Array(keyBuffer);
  keyView.set(key);
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(message)
  );
  return new Uint8Array(signature);
}

async function hmacHex(key: Uint8Array, message: string): Promise<string> {
  const sig = await hmac(key, message);
  return Array.from(sig)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getSignatureKey(
  key: string,
  dateStamp: string,
  regionName: string,
  serviceName: string
): Promise<Uint8Array> {
  const kDate = await hmac(new TextEncoder().encode("AWS4" + key), dateStamp);
  const kRegion = await hmac(kDate, regionName);
  const kService = await hmac(kRegion, serviceName);
  return await hmac(kService, "aws4_request");
}

/**
 * Get the sender display name for a given module
 */
export function getSenderName(module: EmailModule, tenantName?: string): string {
  if (tenantName) {
    // Use tenant name as prefix instead of DHUUD for tenant-specific emails
    const baseName = EMAIL_SENDERS[module] || EMAIL_SENDERS.default;
    return baseName.replace("DHUUD", tenantName);
  }
  return EMAIL_SENDERS[module] || EMAIL_SENDERS.default;
}

/**
 * Send email via AWS SES with module-based sender name
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  const { to, subject, html, module, tenantName } = options;
  
  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    console.error("AWS credentials not configured");
    return { success: false, error: "AWS credentials not configured" };
  }

  const recipients = Array.isArray(to) ? to : [to];
  const validRecipients = recipients.filter((r) => r && r.includes("@"));
  
  if (validRecipients.length === 0) {
    return { success: false, error: "No valid recipients" };
  }

  const senderName = getSenderName(module, tenantName);
  const fromAddress = `${senderName} <${AWS_SES_FROM_EMAIL}>`;

  const host = `email.${AWS_SES_REGION}.amazonaws.com`;
  const endpoint = `https://${host}/`;
  const date = new Date();
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const params = new URLSearchParams({
    Action: "SendEmail",
    Version: "2010-12-01",
    Source: fromAddress,
    "Message.Subject.Data": subject,
    "Message.Subject.Charset": "UTF-8",
    "Message.Body.Html.Data": html,
    "Message.Body.Html.Charset": "UTF-8",
  });

  // Add recipients
  validRecipients.forEach((email, index) => {
    params.append(`Destination.ToAddresses.member.${index + 1}`, email);
  });

  const body = params.toString();
  const hashedPayload = await sha256(body);
  const canonicalRequest = [
    "POST",
    "/",
    "",
    `host:${host}`,
    `x-amz-date:${amzDate}`,
    "",
    "host;x-amz-date",
    hashedPayload,
  ].join("\n");

  const hashedCanonicalRequest = await sha256(canonicalRequest);
  const credentialScope = `${dateStamp}/${AWS_SES_REGION}/ses/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    hashedCanonicalRequest,
  ].join("\n");

  const signingKey = await getSignatureKey(
    AWS_SECRET_ACCESS_KEY,
    dateStamp,
    AWS_SES_REGION,
    "ses"
  );
  const signature = await hmacHex(signingKey, stringToSign);

  const authorizationHeader = [
    `AWS4-HMAC-SHA256 Credential=${AWS_ACCESS_KEY_ID}/${credentialScope}`,
    `SignedHeaders=host;x-amz-date`,
    `Signature=${signature}`,
  ].join(", ");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Host: host,
        "X-Amz-Date": amzDate,
        Authorization: authorizationHeader,
      },
      body,
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error("SES Error Response:", responseText);
      return { success: false, error: responseText };
    }

    const messageIdMatch = responseText.match(/<MessageId>(.+?)<\/MessageId>/);
    const messageId = messageIdMatch ? messageIdMatch[1] : undefined;

    console.log(
      `Email sent via ${senderName} to ${validRecipients.join(", ")}, MessageId: ${messageId}`
    );

    return { success: true, messageId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("AWS SES request failed:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Send email to a single recipient (convenience wrapper)
 */
export async function sendEmailToOne(
  to: string,
  subject: string,
  html: string,
  module: EmailModule,
  tenantName?: string
): Promise<EmailResult> {
  return sendEmail({ to, subject, html, module, tenantName });
}

/**
 * Send email to multiple recipients (convenience wrapper)
 */
export async function sendEmailToMany(
  to: string[],
  subject: string,
  html: string,
  module: EmailModule,
  tenantName?: string
): Promise<EmailResult> {
  return sendEmail({ to, subject, html, module, tenantName });
}

/**
 * Legacy-compatible function name for backward compatibility
 * @deprecated Use sendEmail or sendEmailToOne instead
 */
export async function sendEmailViaSES(
  to: string,
  subject: string,
  html: string,
  module: EmailModule = 'default',
  tenantName?: string
): Promise<EmailResult> {
  return sendEmail({ to, subject, html, module, tenantName });
}
