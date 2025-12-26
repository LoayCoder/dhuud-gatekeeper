// Shared Resend Email Sender with Module-Based Sender Names
// This utility provides centralized email sending for all edge functions
// Supports localized emails with RTL for Arabic/Urdu

import { Resend } from "https://esm.sh/resend@4.0.0";
import { 
  isRTL, 
  type SupportedLanguage, 
  COMMON_TRANSLATIONS, 
  getTranslations, 
  replaceVariables 
} from "./email-translations.ts";

// Resend Configuration
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@dhuud.com";

/**
 * Get the application base URL from environment
 */
export function getAppUrl(): string {
  return Deno.env.get("APP_URL") || "https://app.dhuud.com";
}

/**
 * Generate a styled CTA button for emails with RTL support
 */
export function emailButton(text: string, url: string, color = "#1e40af", isRtl = false): string {
  const arrow = isRtl ? '←' : '→';
  return `
    <div style="text-align: center; margin: 24px 0;">
      <a href="${url}" style="display: inline-block; background: ${color}; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; direction: ${isRtl ? 'rtl' : 'ltr'};">
        ${isRtl ? `${arrow} ${text}` : `${text} ${arrow}`}
      </a>
    </div>
  `;
}

/**
 * Get font family based on language (Arabic/Urdu need specific fonts)
 */
export function getEmailFontFamily(lang: string): string {
  if (['ar', 'ur'].includes(lang)) {
    return "'Segoe UI', 'Tahoma', 'Cairo', 'IBM Plex Sans Arabic', sans-serif";
  }
  return "'Segoe UI', 'Tahoma', sans-serif";
}

/**
 * Wrap email HTML with proper RTL/LTR direction and font
 */
export function wrapEmailHtml(content: string, lang: string, tenantName?: string): string {
  const rtl = isRTL(lang as SupportedLanguage);
  const direction = rtl ? 'rtl' : 'ltr';
  const textAlign = rtl ? 'right' : 'left';
  const fontFamily = getEmailFontFamily(lang);
  const common = getTranslations(COMMON_TRANSLATIONS, lang);
  const footerText = replaceVariables(common.automatedMessage, { tenant: tenantName || 'DHUUD' });

  return `
    <!DOCTYPE html>
    <html dir="${direction}" lang="${lang}">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: ${fontFamily}; direction: ${direction}; text-align: ${textAlign}; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${content}
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px;">
        <p>${footerText}</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Get common translation strings for a language
 */
export function getCommonTranslations(lang: string) {
  return getTranslations(COMMON_TRANSLATIONS, lang);
}

/**
 * Format date according to locale
 */
export function formatDateForLocale(dateString: string | undefined, lang: string): string {
  if (!dateString) {
    const common = getTranslations(COMMON_TRANSLATIONS, lang);
    return common.notSpecified;
  }
  try {
    const localeMap: Record<string, string> = {
      en: 'en-US',
      ar: 'ar-SA',
      ur: 'ur-PK',
      hi: 'hi-IN',
      fil: 'fil-PH',
    };
    return new Date(dateString).toLocaleDateString(localeMap[lang] || 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Get priority label in the user's language
 */
export function getPriorityLabel(priority: string, lang: string): string {
  const common = getTranslations(COMMON_TRANSLATIONS, lang);
  const priorityMap: Record<string, keyof typeof common> = {
    critical: 'critical',
    high: 'high',
    medium: 'medium',
    low: 'low',
  };
  const key = priorityMap[priority?.toLowerCase()] || 'medium';
  return common[key] as string;
}

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
 * Send email via Resend with module-based sender name
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  const { to, subject, html, module, tenantName } = options;
  
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const recipients = Array.isArray(to) ? to : [to];
  const validRecipients = recipients.filter((r) => r && r.includes("@"));
  
  if (validRecipients.length === 0) {
    return { success: false, error: "No valid recipients" };
  }

  const senderName = getSenderName(module, tenantName);
  const fromAddress = `${senderName} <${FROM_EMAIL}>`;

  try {
    const resend = new Resend(RESEND_API_KEY);
    
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: validRecipients,
      subject: subject,
      html: html,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    const messageId = data?.id;
    console.log(
      `Email sent via ${senderName} to ${validRecipients.join(", ")}, MessageId: ${messageId}`
    );

    return { success: true, messageId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Resend request failed:", errorMessage);
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
