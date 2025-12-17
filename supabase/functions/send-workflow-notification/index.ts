import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, type EmailModule, getAppUrl, emailButton, wrapEmailHtml, getCommonTranslations } from "../_shared/email-sender.ts";
import { 
  WORKFLOW_TRANSLATIONS, 
  getTranslations, 
  replaceVariables,
  isRTL,
  type SupportedLanguage 
} from "../_shared/email-translations.ts";

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

function getEmailModule(action: string): EmailModule {
  switch (action) {
    case 'investigator_assigned':
      return 'investigation';
    case 'expert_investigate':
      return 'incident_workflow';
    default:
      return 'incident_workflow';
  }
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

    const result = await sendEmail({
      to: recipientEmail,
      subject,
      html: htmlContent,
      module: getEmailModule(emailType),
      tenantName,
    });
    
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

// deno-lint-ignore no-explicit-any
async function getRecipientLanguage(supabase: any, recipientId: string): Promise<string> {
  const { data } = await supabase.from("profiles").select("preferred_language").eq("id", recipientId).single();
  return data?.preferred_language || 'en';
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const payload: WorkflowNotificationRequest = await req.json();
    const { incidentId, action } = payload;
    console.log(`Processing workflow notification: ${action} for incident ${incidentId}`);

    const { data: incident, error: incidentError } = await supabase.from("incidents")
      .select(`id, reference_id, title, reporter_id, tenant_id, approval_manager_id, profiles!incidents_reporter_id_fkey(id, full_name, email, preferred_language)`)
      .eq("id", incidentId).single();

    if (incidentError || !incident) return new Response(JSON.stringify({ error: "Incident not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: tenant } = await supabase.from("tenants").select("name").eq("id", incident.tenant_id).single();
    const tenantName = tenant?.name || "HSSE Platform";
    // deno-lint-ignore no-explicit-any
    const reporterProfile = (incident.profiles as any)?.[0] || null;

    let recipients: string[] = [];
    let subject = "";
    let htmlContent = "";
    let recipientLang = reporterProfile?.preferred_language || 'en';

    const appUrl = getAppUrl();
    
    switch (action) {
      case "expert_return": {
        if (reporterProfile?.email) recipients.push(reporterProfile.email);
        const t = getTranslations(WORKFLOW_TRANSLATIONS, recipientLang).expert_return;
        const common = getCommonTranslations(recipientLang);
        const rtl = isRTL(recipientLang as SupportedLanguage);
        
        subject = `[${tenantName}] ${t.subject}`;
        const bodyText = replaceVariables(t.body, { reference: incident.reference_id });
        
        const content = `
          <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h2 style="color: white; margin: 0;">${t.title}</h2>
          </div>
          <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
            <p>${replaceVariables(common.greeting, { name: reporterProfile?.full_name || 'Reporter' })}</p>
            <p>${bodyText}</p>
            ${payload.returnReason ? `<p><strong>${common.reason}:</strong> ${payload.returnReason}</p>` : ""}
            ${payload.returnInstructions ? `<p><strong>${common.instructions}:</strong> ${payload.returnInstructions}</p>` : ""}
            ${emailButton(t.button, `${appUrl}/incidents/report?edit=${incidentId}`, "#dc2626", rtl)}
            <p>${common.signature}<br>${replaceVariables(common.team, { tenant: tenantName })}</p>
          </div>
        `;
        htmlContent = wrapEmailHtml(content, recipientLang, tenantName);
        break;
      }
      case "expert_reject": {
        if (reporterProfile?.email) recipients.push(reporterProfile.email);
        const t = getTranslations(WORKFLOW_TRANSLATIONS, recipientLang).expert_reject;
        const common = getCommonTranslations(recipientLang);
        const rtl = isRTL(recipientLang as SupportedLanguage);
        
        subject = `[${tenantName}] ${t.subject}`;
        const bodyText = replaceVariables(t.body, { reference: incident.reference_id });
        
        const content = `
          <div style="background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h2 style="color: white; margin: 0;">${t.title}</h2>
          </div>
          <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
            <p>${replaceVariables(common.greeting, { name: reporterProfile?.full_name || 'Reporter' })}</p>
            <p>${bodyText}</p>
            ${payload.rejectionReason ? `<p><strong>${common.reason}:</strong> ${payload.rejectionReason}</p>` : ""}
            ${emailButton(t.button, `${appUrl}/incidents/${incidentId}`, "#6b7280", rtl)}
            <p>${common.signature}<br>${replaceVariables(common.team, { tenant: tenantName })}</p>
          </div>
        `;
        htmlContent = wrapEmailHtml(content, recipientLang, tenantName);
        break;
      }
      case "expert_investigate": {
        if (incident.approval_manager_id) {
          const { data: manager } = await supabase.from("profiles").select("email, full_name, preferred_language").eq("id", incident.approval_manager_id).single();
          if (manager?.email) {
            recipients.push(manager.email);
            recipientLang = manager.preferred_language || 'en';
          }
          const t = getTranslations(WORKFLOW_TRANSLATIONS, recipientLang).expert_investigate;
          const common = getCommonTranslations(recipientLang);
          const rtl = isRTL(recipientLang as SupportedLanguage);
          
          subject = `[${tenantName}] ${t.subject}`;
          const bodyText = replaceVariables(t.body, { reference: incident.reference_id });
          
          const content = `
            <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h2 style="color: white; margin: 0;">${t.title}</h2>
            </div>
            <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
              <p>${replaceVariables(common.greeting, { name: manager?.full_name || 'Manager' })}</p>
              <p>${bodyText}</p>
              <p><strong>${t.eventTitle}:</strong> ${incident.title}</p>
              ${payload.notes ? `<p><strong>${t.expertNotes}:</strong> ${payload.notes}</p>` : ""}
              ${emailButton(t.button, `${appUrl}/incidents/investigate?id=${incidentId}`, "#1e40af", rtl)}
              <p>${common.signature}<br>${replaceVariables(common.team, { tenant: tenantName })}</p>
            </div>
          `;
          htmlContent = wrapEmailHtml(content, recipientLang, tenantName);
        }
        break;
      }
      case "investigator_assigned": {
        if (payload.investigatorId) {
          const { data: investigator } = await supabase.from("profiles").select("email, full_name, preferred_language").eq("id", payload.investigatorId).single();
          if (investigator?.email) {
            recipients.push(investigator.email);
            recipientLang = investigator.preferred_language || 'en';
          }
          const t = getTranslations(WORKFLOW_TRANSLATIONS, recipientLang).investigator_assigned;
          const common = getCommonTranslations(recipientLang);
          const rtl = isRTL(recipientLang as SupportedLanguage);
          
          subject = `[${tenantName}] ${replaceVariables(t.subject, { reference: incident.reference_id })}`;
          const bodyText = replaceVariables(t.body, { reference: incident.reference_id });
          
          const content = `
            <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h2 style="color: white; margin: 0;">${t.title}</h2>
            </div>
            <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
              <p>${replaceVariables(common.greeting, { name: investigator?.full_name || 'Investigator' })}</p>
              <p>${bodyText}</p>
              <p><strong>${t.eventTitle}:</strong> ${incident.title}</p>
              ${emailButton(t.button, `${appUrl}/incidents/investigate?id=${incidentId}`, "#16a34a", rtl)}
              <p>${common.signature}<br>${replaceVariables(common.team, { tenant: tenantName })}</p>
            </div>
          `;
          htmlContent = wrapEmailHtml(content, recipientLang, tenantName);
        }
        break;
      }
      default:
        console.log(`Unknown action: ${action}`);
    }

    let result = { success: true, sentCount: 0 };
    if (recipients.length > 0 && subject && htmlContent) {
      result = await sendEmailWithTracking(supabase, incident.tenant_id, tenantName, action, recipients, subject, htmlContent, incidentId, { ...payload, language: recipientLang });
    }

    return new Response(JSON.stringify({ success: true, action, recipientCount: recipients.length, sentCount: result.sentCount, language: recipientLang }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    console.error("Error in send-workflow-notification:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
