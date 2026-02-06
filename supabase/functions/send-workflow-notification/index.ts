import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, type EmailModule, getAppUrl, emailButton, wrapEmailHtml, getCommonTranslations } from "../_shared/email-sender.ts";
import { sendWhatsAppText } from "../_shared/whatsapp-provider.ts";
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

/**
 * Build a concise WhatsApp summary for a workflow action.
 * Returns null if no WhatsApp should be sent for this action.
 */
function buildWhatsAppMessage(
  action: string,
  referenceId: string,
  tenantName: string,
  extras: { notes?: string; reason?: string; recipientName?: string; incidentTitle?: string }
): string | null {
  const ref = referenceId;
  const name = extras.recipientName || '';
  const greeting = name ? `Dear ${name},\n\n` : '';

  switch (action) {
    case "expert_return":
      return `${greeting}⚠️ *${tenantName} – Report Returned*\n\nYour report *${ref}* has been returned for revision.${extras.reason ? `\nReason: ${extras.reason}` : ''}\n\nPlease revise and resubmit.`;
    case "expert_reject":
      return `${greeting}❌ *${tenantName} – Report Rejected*\n\nYour report *${ref}* has been rejected.${extras.reason ? `\nReason: ${extras.reason}` : ''}\n\nPlease review the feedback.`;
    case "expert_investigate":
      return `${greeting}🔍 *${tenantName} – Investigation Assigned*\n\nIncident *${ref}* has been assigned for investigation.${extras.incidentTitle ? `\nTitle: ${extras.incidentTitle}` : ''}${extras.notes ? `\nNotes: ${extras.notes}` : ''}\n\nPlease review in the portal.`;
    case "investigator_assigned":
      return `${greeting}📋 *${tenantName} – You Are Assigned as Investigator*\n\nYou have been assigned to investigate incident *${ref}*.${extras.incidentTitle ? `\nTitle: ${extras.incidentTitle}` : ''}\n\nPlease begin your investigation.`;
    case "expert_assign_actions":
      return `${greeting}📝 *${tenantName} – Actions Assigned for Review*\n\nCorrective actions for *${ref}* are ready for your review.${extras.incidentTitle ? `\nTitle: ${extras.incidentTitle}` : ''}\n\nPlease review in the portal.`;
    case "close_on_spot":
      return `${greeting}✅ *${tenantName} – Observation Closed On-Spot*\n\nObservation *${ref}* has been closed on-spot.${extras.notes ? `\nNotes: ${extras.notes}` : ''}`;
    case "observation_closed":
      return `${greeting}✅ *${tenantName} – Observation Closed*\n\nObservation *${ref}* has been closed successfully.`;
    case "incident_closed":
      return `${greeting}✅ *${tenantName} – Incident Closed*\n\nIncident *${ref}* investigation has been closed.`;
    case "dept_rep_incident_review":
      return `${greeting}🔔 *${tenantName} – New Event Requires Review*\n\nEvent report *${ref}* has been assigned to your department.${extras.incidentTitle ? `\nTitle: ${extras.incidentTitle}` : ''}\n\nPlease review and take action.`;
    case "escalation_reject":
      return `${greeting}❌ *${tenantName} – Escalation Rejected*\n\nYour escalation for *${ref}* has been rejected.${extras.notes ? `\nReason: ${extras.notes}` : ''}`;
    case "escalation_accept_observation":
      return `${greeting}✅ *${tenantName} – Escalation Accepted*\n\nThe escalation for observation *${ref}* has been accepted.`;
    case "escalation_upgraded":
      return `${greeting}⬆️ *${tenantName} – Observation Upgraded to Incident*\n\nObservation *${ref}* has been upgraded to an incident for investigation.${extras.notes ? `\nNotes: ${extras.notes}` : ''}`;
    case "violation_pending_approval":
      return `${greeting}⚠️ *${tenantName} – Violation Pending Approval*\n\nViolation for *${ref}* requires your approval.\n\nPlease review in the portal.`;
    case "violation_fine_pending":
      return `${greeting}💰 *${tenantName} – Fine Pending Approval*\n\nA fine for violation *${ref}* requires your approval.\n\nPlease review in the portal.`;
    case "violation_acknowledgment_required":
      return `${greeting}📋 *${tenantName} – Violation Acknowledgment Required*\n\nViolation *${ref}* requires your acknowledgment.\n\nPlease review and acknowledge.`;
    case "violation_contested":
      return `${greeting}⚡ *${tenantName} – Violation Contested*\n\nThe contractor has contested violation *${ref}*.${extras.notes ? `\nContest reason: ${extras.notes}` : ''}\n\nPlease review.`;
    case "violation_rejected_review":
      return `${greeting}❌ *${tenantName} – Violation/Fine Rejected*\n\nViolation *${ref}* has been rejected and needs review.${extras.notes ? `\nReason: ${extras.notes}` : ''}`;
    case "violation_finalized":
      return `${greeting}✅ *${tenantName} – Violation Finalized*\n\nViolation *${ref}* has been finalized.`;
    case "violation_cancelled":
      return `${greeting}🚫 *${tenantName} – Violation Cancelled*\n\nViolation *${ref}* has been cancelled.${extras.notes ? `\nReason: ${extras.notes}` : ''}`;
    default:
      return null;
  }
}

/**
 * Collect user IDs from the workflow case to resolve phone numbers.
 * Each action case may target the reporter, approval_manager, investigator, or role-based users.
 */
// deno-lint-ignore no-explicit-any
function getRecipientUserIds(action: string, incident: any, payload: WorkflowNotificationRequest): string[] {
  const ids: string[] = [];
  switch (action) {
    case "expert_return":
    case "expert_reject":
    case "close_on_spot":
    case "observation_closed":
    case "incident_closed":
      if (incident.reporter_id) ids.push(incident.reporter_id);
      break;
    case "expert_investigate":
    case "expert_assign_actions":
    case "dept_rep_incident_review":
    case "escalation_reject":
      if (incident.approval_manager_id) ids.push(incident.approval_manager_id);
      break;
    case "investigator_assigned":
      if (payload.investigatorId) ids.push(payload.investigatorId);
      break;
    case "escalation_accept_observation":
    case "escalation_upgraded":
    case "violation_finalized":
    case "violation_cancelled":
      if (incident.reporter_id) ids.push(incident.reporter_id);
      if (incident.approval_manager_id) ids.push(incident.approval_manager_id);
      if (payload.investigatorId) ids.push(payload.investigatorId);
      break;
    // violation_pending_approval uses approval_manager_id
    case "violation_pending_approval":
      if (incident.approval_manager_id) ids.push(incident.approval_manager_id);
      break;
  }
  return [...new Set(ids.filter(Boolean))];
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
              ${emailButton(t.button, `${appUrl}/incidents/${incidentId}`, "#1e40af", rtl)}
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
              ${emailButton(t.button, `${appUrl}/incidents/${incidentId}`, "#16a34a", rtl)}
              <p>${common.signature}<br>${replaceVariables(common.team, { tenant: tenantName })}</p>
            </div>
          `;
          htmlContent = wrapEmailHtml(content, recipientLang, tenantName);
        }
        break;
      }
      case "expert_assign_actions": {
        // Notify department representative that observation needs their review
        if (incident.approval_manager_id) {
          const { data: deptRep } = await supabase.from("profiles").select("email, full_name, preferred_language").eq("id", incident.approval_manager_id).single();
          if (deptRep?.email) {
            recipients.push(deptRep.email);
            recipientLang = deptRep.preferred_language || 'en';
          }
          const t = getTranslations(WORKFLOW_TRANSLATIONS, recipientLang).expert_assign_actions;
          const common = getCommonTranslations(recipientLang);
          const rtl = isRTL(recipientLang as SupportedLanguage);
          
          subject = `[${tenantName}] ${replaceVariables(t.subject, { reference: incident.reference_id })}`;
          const bodyText = replaceVariables(t.body, { reference: incident.reference_id });
          
          const content = `
            <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h2 style="color: white; margin: 0;">${t.title}</h2>
            </div>
            <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
              <p>${replaceVariables(common.greeting, { name: deptRep?.full_name || 'Department Representative' })}</p>
              <p>${bodyText}</p>
              <p><strong>${t.eventTitle}:</strong> ${incident.title}</p>
              ${payload.notes ? `<p><strong>${t.expertNotes}:</strong> ${payload.notes}</p>` : ""}
              ${emailButton(t.button, `${appUrl}/incidents/${incidentId}`, "#7c3aed", rtl)}
              <p>${common.signature}<br>${replaceVariables(common.team, { tenant: tenantName })}</p>
            </div>
          `;
          htmlContent = wrapEmailHtml(content, recipientLang, tenantName);
        }
        break;
      }
      case "close_on_spot": {
        // Notify reporter that their observation was closed on spot
        if (reporterProfile?.email) recipients.push(reporterProfile.email);
        const t = getTranslations(WORKFLOW_TRANSLATIONS, recipientLang).close_on_spot;
        const common = getCommonTranslations(recipientLang);
        const rtl = isRTL(recipientLang as SupportedLanguage);
        
        subject = `[${tenantName}] ${replaceVariables(t.subject, { reference: incident.reference_id })}`;
        const bodyText = replaceVariables(t.body, { reference: incident.reference_id });
        
        const content = `
          <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h2 style="color: white; margin: 0;">${t.title}</h2>
          </div>
          <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
            <p>${replaceVariables(common.greeting, { name: reporterProfile?.full_name || 'Reporter' })}</p>
            <p>${bodyText}</p>
            ${payload.notes ? `<p><strong>${t.notes}:</strong> ${payload.notes}</p>` : ""}
            ${emailButton(t.button, `${appUrl}/incidents/${incidentId}`, "#16a34a", rtl)}
            <p>${common.signature}<br>${replaceVariables(common.team, { tenant: tenantName })}</p>
          </div>
        `;
        htmlContent = wrapEmailHtml(content, recipientLang, tenantName);
        break;
      }
      case "observation_closed": {
        // Notify reporter that their observation has been closed
        if (reporterProfile?.email) recipients.push(reporterProfile.email);
        const t = getTranslations(WORKFLOW_TRANSLATIONS, recipientLang).observation_closed;
        const common = getCommonTranslations(recipientLang);
        const rtl = isRTL(recipientLang as SupportedLanguage);
        
        subject = `[${tenantName}] ${replaceVariables(t.subject, { reference: incident.reference_id })}`;
        const bodyText = replaceVariables(t.body, { reference: incident.reference_id });
        
        const content = `
          <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h2 style="color: white; margin: 0;">${t.title}</h2>
          </div>
          <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
            <p>${replaceVariables(common.greeting, { name: reporterProfile?.full_name || 'Reporter' })}</p>
            <p>${bodyText}</p>
            ${emailButton(t.button, `${appUrl}/incidents/${incidentId}`, "#16a34a", rtl)}
            <p>${common.signature}<br>${replaceVariables(common.team, { tenant: tenantName })}</p>
          </div>
        `;
        htmlContent = wrapEmailHtml(content, recipientLang, tenantName);
        break;
      }
      case "incident_closed": {
        // Notify reporter that incident investigation has been closed
        if (reporterProfile?.email) recipients.push(reporterProfile.email);
        const t = getTranslations(WORKFLOW_TRANSLATIONS, recipientLang).incident_closed;
        const common = getCommonTranslations(recipientLang);
        const rtl = isRTL(recipientLang as SupportedLanguage);
        
        subject = `[${tenantName}] ${replaceVariables(t.subject, { reference: incident.reference_id })}`;
        const bodyText = replaceVariables(t.body, { reference: incident.reference_id });
        
        const content = `
          <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h2 style="color: white; margin: 0;">${t.title}</h2>
          </div>
          <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
            <p>${replaceVariables(common.greeting, { name: reporterProfile?.full_name || 'Reporter' })}</p>
            <p>${bodyText}</p>
            ${emailButton(t.button, `${appUrl}/incidents/${incidentId}`, "#16a34a", rtl)}
            <p>${common.signature}<br>${replaceVariables(common.team, { tenant: tenantName })}</p>
          </div>
        `;
        htmlContent = wrapEmailHtml(content, recipientLang, tenantName);
        break;
      }
      case "dept_rep_incident_review": {
        // Notify dept rep that a new incident requires their review
        if (incident.approval_manager_id) {
          const { data: deptRep } = await supabase.from("profiles").select("email, full_name, preferred_language").eq("id", incident.approval_manager_id).single();
          if (deptRep?.email) {
            recipients.push(deptRep.email);
            recipientLang = deptRep.preferred_language || 'en';
          }
          const t = getTranslations(WORKFLOW_TRANSLATIONS, recipientLang).dept_rep_incident_review;
          const common = getCommonTranslations(recipientLang);
          const rtl = isRTL(recipientLang as SupportedLanguage);
          
          subject = `[${tenantName}] ${replaceVariables(t.subject, { reference: incident.reference_id })}`;
          const bodyText = replaceVariables(t.body, { reference: incident.reference_id });
          
          const content = `
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h2 style="color: white; margin: 0;">${t.title}</h2>
            </div>
            <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
              <p>${replaceVariables(common.greeting, { name: deptRep?.full_name || 'Department Representative' })}</p>
              <p>${bodyText}</p>
              <p><strong>${t.eventTitle}:</strong> ${incident.title}</p>
              ${emailButton(t.button, `${appUrl}/incidents/${incidentId}`, "#f59e0b", rtl)}
              <p>${common.signature}<br>${replaceVariables(common.team, { tenant: tenantName })}</p>
            </div>
          `;
          htmlContent = wrapEmailHtml(content, recipientLang, tenantName);
        }
        break;
      }
      case "escalation_reject": {
        // Notify Dept Rep that their escalation was rejected
        if (incident.approval_manager_id) {
          const { data: deptRep } = await supabase.from("profiles").select("email, full_name, preferred_language").eq("id", incident.approval_manager_id).single();
          if (deptRep?.email) {
            recipients.push(deptRep.email);
            recipientLang = deptRep.preferred_language || 'en';
          }
          const t = getTranslations(WORKFLOW_TRANSLATIONS, recipientLang).escalation_reject;
          const common = getCommonTranslations(recipientLang);
          const rtl = isRTL(recipientLang as SupportedLanguage);
          
          subject = `[${tenantName}] ${replaceVariables(t.subject, { reference: incident.reference_id })}`;
          const bodyText = replaceVariables(t.body, { reference: incident.reference_id });
          
          const content = `
            <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h2 style="color: white; margin: 0;">${t.title}</h2>
            </div>
            <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
              <p>${replaceVariables(common.greeting, { name: deptRep?.full_name || 'Department Representative' })}</p>
              <p>${bodyText}</p>
              ${payload.notes ? `<p><strong>${t.rejectionReason}:</strong> ${payload.notes}</p>` : ""}
              ${emailButton(t.button, `${appUrl}/incidents/${incidentId}`, "#dc2626", rtl)}
              <p>${common.signature}<br>${replaceVariables(common.team, { tenant: tenantName })}</p>
            </div>
          `;
          htmlContent = wrapEmailHtml(content, recipientLang, tenantName);
        }
        break;
      }
      case "escalation_accept_observation": {
        // Notify Dept Rep and Reporter that observation was accepted
        if (reporterProfile?.email) recipients.push(reporterProfile.email);
        if (incident.approval_manager_id) {
          const { data: deptRep } = await supabase.from("profiles").select("email").eq("id", incident.approval_manager_id).single();
          if (deptRep?.email && !recipients.includes(deptRep.email)) recipients.push(deptRep.email);
        }
        const t = getTranslations(WORKFLOW_TRANSLATIONS, recipientLang).escalation_accept_observation;
        const common = getCommonTranslations(recipientLang);
        const rtl = isRTL(recipientLang as SupportedLanguage);
        
        subject = `[${tenantName}] ${replaceVariables(t.subject, { reference: incident.reference_id })}`;
        const bodyText = replaceVariables(t.body, { reference: incident.reference_id });
        
        const content = `
          <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h2 style="color: white; margin: 0;">${t.title}</h2>
          </div>
          <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
            <p>${replaceVariables(common.greeting, { name: reporterProfile?.full_name || 'Reporter' })}</p>
            <p>${bodyText}</p>
            ${emailButton(t.button, `${appUrl}/incidents/${incidentId}`, "#16a34a", rtl)}
            <p>${common.signature}<br>${replaceVariables(common.team, { tenant: tenantName })}</p>
          </div>
        `;
        htmlContent = wrapEmailHtml(content, recipientLang, tenantName);
        break;
      }
      case "escalation_upgraded": {
        // Notify Reporter, Dept Rep, and Investigator about upgrade
        if (reporterProfile?.email) recipients.push(reporterProfile.email);
        if (incident.approval_manager_id) {
          const { data: deptRep } = await supabase.from("profiles").select("email").eq("id", incident.approval_manager_id).single();
          if (deptRep?.email && !recipients.includes(deptRep.email)) recipients.push(deptRep.email);
        }
        if (payload.investigatorId) {
          const { data: investigator } = await supabase.from("profiles").select("email").eq("id", payload.investigatorId).single();
          if (investigator?.email && !recipients.includes(investigator.email)) recipients.push(investigator.email);
        }
        const t = getTranslations(WORKFLOW_TRANSLATIONS, recipientLang).escalation_upgraded;
        const common = getCommonTranslations(recipientLang);
        const rtl = isRTL(recipientLang as SupportedLanguage);
        
        // Get new incident reference
        let newIncidentRef = '';
        if ((payload as any).newIncidentId) {
          const { data: newInc } = await supabase.from("incidents").select("reference_id").eq("id", (payload as any).newIncidentId).single();
          newIncidentRef = newInc?.reference_id || '';
        }
        
        subject = `[${tenantName}] ${replaceVariables(t.subject, { reference: incident.reference_id })}`;
        const bodyText = replaceVariables(t.body, { reference: incident.reference_id });
        
        const content = `
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h2 style="color: white; margin: 0;">${t.title}</h2>
          </div>
          <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
            <p>${replaceVariables(common.greeting, { name: reporterProfile?.full_name || 'Reporter' })}</p>
            <p>${bodyText}</p>
            ${newIncidentRef ? `<p><strong>${t.newReference}:</strong> ${newIncidentRef}</p>` : ""}
            ${payload.notes ? `<p><strong>${common.notes}:</strong> ${payload.notes}</p>` : ""}
            ${emailButton(t.button, `${appUrl}/incidents/${(payload as any).newIncidentId || incidentId}`, "#f59e0b", rtl)}
            <p>${common.signature}<br>${replaceVariables(common.team, { tenant: tenantName })}</p>
          </div>
        `;
        htmlContent = wrapEmailHtml(content, recipientLang, tenantName);
        break;
      }
      // ============= CONTRACTOR VIOLATION WORKFLOW NOTIFICATIONS =============
      case "violation_pending_approval": {
        // Notify Department Manager that violation needs approval
        if (incident.approval_manager_id) {
          const { data: deptManager } = await supabase.from("profiles").select("email, full_name, preferred_language").eq("id", incident.approval_manager_id).single();
          if (deptManager?.email) {
            recipients.push(deptManager.email);
            recipientLang = deptManager.preferred_language || 'en';
          }
          
          // Fetch violation and contractor details
          const { data: violationData } = await supabase.from("incidents")
            .select(`
              violation_type_id,
              violation_fine_amount,
              related_contractor_company_id,
              violation_types!violation_type_id(name, name_ar),
              contractor_companies!related_contractor_company_id(name, name_ar)
            `)
            .eq("id", incidentId).single();
          
          const t = getTranslations(WORKFLOW_TRANSLATIONS, recipientLang).violation_pending_approval;
          const common = getCommonTranslations(recipientLang);
          const rtl = isRTL(recipientLang as SupportedLanguage);
          
          const violationType = recipientLang === 'ar' 
            ? (violationData?.violation_types as any)?.name_ar || (violationData?.violation_types as any)?.name
            : (violationData?.violation_types as any)?.name || 'N/A';
          const contractorName = recipientLang === 'ar'
            ? (violationData?.contractor_companies as any)?.name_ar || (violationData?.contractor_companies as any)?.name
            : (violationData?.contractor_companies as any)?.name || 'N/A';
          
          subject = `[${tenantName}] ${replaceVariables(t.subject, { reference: incident.reference_id })}`;
          const bodyText = replaceVariables(t.body, { reference: incident.reference_id });
          
          const content = `
            <div style="background: linear-gradient(135deg, #dc2626 0%, #f97316 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h2 style="color: white; margin: 0;">${t.title}</h2>
            </div>
            <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
              <p>${replaceVariables(common.greeting, { name: deptManager?.full_name || 'Manager' })}</p>
              <p>${bodyText}</p>
              <p><strong>${t.violationType}:</strong> ${violationType}</p>
              <p><strong>${t.contractor}:</strong> ${contractorName}</p>
              ${violationData?.violation_fine_amount ? `<p><strong>${t.fineAmount}:</strong> ${violationData.violation_fine_amount} SAR</p>` : ""}
              ${emailButton(t.button, `${appUrl}/incidents/${incidentId}`, "#dc2626", rtl)}
              <p>${common.signature}<br>${replaceVariables(common.team, { tenant: tenantName })}</p>
            </div>
          `;
          htmlContent = wrapEmailHtml(content, recipientLang, tenantName);
        }
        break;
      }
      case "violation_fine_pending": {
        // Notify Contract Controller that fine needs approval
        const { data: incidentWithContractor } = await supabase.from("incidents")
          .select(`
            violation_type_id,
            violation_fine_amount,
            related_contractor_company_id,
            violation_types!violation_type_id(name, name_ar),
            contractor_companies!related_contractor_company_id(id, name, name_ar, controller_id)
          `)
          .eq("id", incidentId).single();
        
        const controllerId = (incidentWithContractor?.contractor_companies as any)?.controller_id;
        if (controllerId) {
          const { data: controller } = await supabase.from("profiles").select("email, full_name, preferred_language").eq("id", controllerId).single();
          if (controller?.email) {
            recipients.push(controller.email);
            recipientLang = controller.preferred_language || 'en';
          }
          
          const t = getTranslations(WORKFLOW_TRANSLATIONS, recipientLang).violation_fine_pending;
          const common = getCommonTranslations(recipientLang);
          const rtl = isRTL(recipientLang as SupportedLanguage);
          
          const violationType = recipientLang === 'ar' 
            ? (incidentWithContractor?.violation_types as any)?.name_ar || (incidentWithContractor?.violation_types as any)?.name
            : (incidentWithContractor?.violation_types as any)?.name || 'N/A';
          const contractorName = recipientLang === 'ar'
            ? (incidentWithContractor?.contractor_companies as any)?.name_ar || (incidentWithContractor?.contractor_companies as any)?.name
            : (incidentWithContractor?.contractor_companies as any)?.name || 'N/A';
          
          subject = `[${tenantName}] ${replaceVariables(t.subject, { reference: incident.reference_id })}`;
          const bodyText = replaceVariables(t.body, { reference: incident.reference_id });
          
          const content = `
            <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h2 style="color: white; margin: 0;">${t.title}</h2>
            </div>
            <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
              <p>${replaceVariables(common.greeting, { name: controller?.full_name || 'Contract Controller' })}</p>
              <p>${bodyText}</p>
              <p><strong>${t.violationType}:</strong> ${violationType}</p>
              <p><strong>${t.contractor}:</strong> ${contractorName}</p>
              ${incidentWithContractor?.violation_fine_amount ? `<p><strong>${t.fineAmount}:</strong> ${incidentWithContractor.violation_fine_amount} SAR</p>` : ""}
              ${emailButton(t.button, `${appUrl}/incidents/${incidentId}`, "#7c3aed", rtl)}
              <p>${common.signature}<br>${replaceVariables(common.team, { tenant: tenantName })}</p>
            </div>
          `;
          htmlContent = wrapEmailHtml(content, recipientLang, tenantName);
        }
        break;
      }
      case "violation_acknowledgment_required": {
        // Notify Contractor Site Rep that violation needs acknowledgment
        const { data: incidentData } = await supabase.from("incidents")
          .select(`
            violation_type_id,
            violation_fine_amount,
            related_contractor_company_id,
            violation_types!violation_type_id(name, name_ar),
            contractor_companies!related_contractor_company_id(id, name, name_ar, site_representative_id)
          `)
          .eq("id", incidentId).single();
        
        const siteRepId = (incidentData?.contractor_companies as any)?.site_representative_id;
        if (siteRepId) {
          const { data: siteRep } = await supabase.from("profiles").select("email, full_name, preferred_language").eq("id", siteRepId).single();
          if (siteRep?.email) {
            recipients.push(siteRep.email);
            recipientLang = siteRep.preferred_language || 'en';
          }
          
          const t = getTranslations(WORKFLOW_TRANSLATIONS, recipientLang).violation_acknowledgment_required;
          const common = getCommonTranslations(recipientLang);
          const rtl = isRTL(recipientLang as SupportedLanguage);
          
          const violationType = recipientLang === 'ar' 
            ? (incidentData?.violation_types as any)?.name_ar || (incidentData?.violation_types as any)?.name
            : (incidentData?.violation_types as any)?.name || 'N/A';
          
          subject = `[${tenantName}] ${replaceVariables(t.subject, { reference: incident.reference_id })}`;
          const bodyText = replaceVariables(t.body, { reference: incident.reference_id });
          
          const content = `
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h2 style="color: white; margin: 0;">${t.title}</h2>
            </div>
            <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
              <p>${replaceVariables(common.greeting, { name: siteRep?.full_name || 'Site Representative' })}</p>
              <p>${bodyText}</p>
              <p><strong>${t.violationType}:</strong> ${violationType}</p>
              ${incidentData?.violation_fine_amount ? `<p><strong>${t.fineAmount}:</strong> ${incidentData.violation_fine_amount} SAR</p>` : ""}
              ${emailButton(t.button, `${appUrl}/incidents/${incidentId}`, "#f59e0b", rtl)}
              <p>${common.signature}<br>${replaceVariables(common.team, { tenant: tenantName })}</p>
            </div>
          `;
          htmlContent = wrapEmailHtml(content, recipientLang, tenantName);
        }
        break;
      }
      case "violation_contested": {
        // Notify HSSE Expert that contractor contested
        const { data: hsseExperts } = await supabase.from("user_roles")
          .select("user_id, profiles!user_roles_user_id_fkey(email, full_name, preferred_language)")
          .eq("role", "hsse_expert");
        
        if (hsseExperts && hsseExperts.length > 0) {
          for (const expert of hsseExperts) {
            const profile = (expert.profiles as any);
            if (profile?.email) recipients.push(profile.email);
            if (!recipientLang || recipientLang === 'en') recipientLang = profile?.preferred_language || 'en';
          }
          
          const t = getTranslations(WORKFLOW_TRANSLATIONS, recipientLang).violation_contested;
          const common = getCommonTranslations(recipientLang);
          const rtl = isRTL(recipientLang as SupportedLanguage);
          
          subject = `[${tenantName}] ${replaceVariables(t.subject, { reference: incident.reference_id })}`;
          const bodyText = replaceVariables(t.body, { reference: incident.reference_id });
          
          const content = `
            <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h2 style="color: white; margin: 0;">${t.title}</h2>
            </div>
            <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
              <p>${replaceVariables(common.greeting, { name: 'HSSE Expert' })}</p>
              <p>${bodyText}</p>
              ${payload.notes ? `<p><strong>${t.contestReason}:</strong> ${payload.notes}</p>` : ""}
              ${emailButton(t.button, `${appUrl}/incidents/${incidentId}`, "#dc2626", rtl)}
              <p>${common.signature}<br>${replaceVariables(common.team, { tenant: tenantName })}</p>
            </div>
          `;
          htmlContent = wrapEmailHtml(content, recipientLang, tenantName);
        }
        break;
      }
      case "violation_rejected_review": {
        // Notify HSSE that violation or fine was rejected
        const { data: hsseExperts } = await supabase.from("user_roles")
          .select("user_id, profiles!user_roles_user_id_fkey(email, full_name, preferred_language)")
          .eq("role", "hsse_expert");
        
        if (hsseExperts && hsseExperts.length > 0) {
          for (const expert of hsseExperts) {
            const profile = (expert.profiles as any);
            if (profile?.email) recipients.push(profile.email);
            if (!recipientLang || recipientLang === 'en') recipientLang = profile?.preferred_language || 'en';
          }
          
          const t = getTranslations(WORKFLOW_TRANSLATIONS, recipientLang).violation_rejected_review;
          const common = getCommonTranslations(recipientLang);
          const rtl = isRTL(recipientLang as SupportedLanguage);
          
          subject = `[${tenantName}] ${replaceVariables(t.subject, { reference: incident.reference_id })}`;
          const bodyText = replaceVariables(t.body, { reference: incident.reference_id });
          
          const content = `
            <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h2 style="color: white; margin: 0;">${t.title}</h2>
            </div>
            <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
              <p>${replaceVariables(common.greeting, { name: 'HSSE Expert' })}</p>
              <p>${bodyText}</p>
              ${payload.notes ? `<p><strong>${t.rejectionReason}:</strong> ${payload.notes}</p>` : ""}
              ${emailButton(t.button, `${appUrl}/incidents/${incidentId}`, "#dc2626", rtl)}
              <p>${common.signature}<br>${replaceVariables(common.team, { tenant: tenantName })}</p>
            </div>
          `;
          htmlContent = wrapEmailHtml(content, recipientLang, tenantName);
        }
        break;
      }
      case "violation_finalized": {
        // Notify all parties (reporter, contractor rep) of final decision
        if (reporterProfile?.email) recipients.push(reporterProfile.email);
        
        // Also notify contractor site rep
        const { data: incidentData } = await supabase.from("incidents")
          .select(`
            violation_fine_amount,
            contractor_companies!related_contractor_company_id(site_representative_id)
          `)
          .eq("id", incidentId).single();
        
        const siteRepId = (incidentData?.contractor_companies as any)?.site_representative_id;
        if (siteRepId) {
          const { data: siteRep } = await supabase.from("profiles").select("email").eq("id", siteRepId).single();
          if (siteRep?.email && !recipients.includes(siteRep.email)) recipients.push(siteRep.email);
        }
        
        const t = getTranslations(WORKFLOW_TRANSLATIONS, recipientLang).violation_finalized;
        const common = getCommonTranslations(recipientLang);
        const rtl = isRTL(recipientLang as SupportedLanguage);
        
        subject = `[${tenantName}] ${replaceVariables(t.subject, { reference: incident.reference_id })}`;
        const bodyText = replaceVariables(t.body, { reference: incident.reference_id });
        
        const content = `
          <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h2 style="color: white; margin: 0;">${t.title}</h2>
          </div>
          <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
            <p>${replaceVariables(common.greeting, { name: reporterProfile?.full_name || 'User' })}</p>
            <p>${bodyText}</p>
            ${incidentData?.violation_fine_amount ? `<p><strong>${t.fineAmount}:</strong> ${incidentData.violation_fine_amount} SAR</p>` : ""}
            ${emailButton(t.button, `${appUrl}/incidents/${incidentId}`, "#16a34a", rtl)}
            <p>${common.signature}<br>${replaceVariables(common.team, { tenant: tenantName })}</p>
          </div>
        `;
        htmlContent = wrapEmailHtml(content, recipientLang, tenantName);
        break;
      }
      case "violation_cancelled": {
        // Notify all parties that violation was cancelled
        if (reporterProfile?.email) recipients.push(reporterProfile.email);
        
        // Also notify contractor site rep
        const { data: incidentData } = await supabase.from("incidents")
          .select(`contractor_companies!related_contractor_company_id(site_representative_id)`)
          .eq("id", incidentId).single();
        
        const siteRepId = (incidentData?.contractor_companies as any)?.site_representative_id;
        if (siteRepId) {
          const { data: siteRep } = await supabase.from("profiles").select("email").eq("id", siteRepId).single();
          if (siteRep?.email && !recipients.includes(siteRep.email)) recipients.push(siteRep.email);
        }
        
        const t = getTranslations(WORKFLOW_TRANSLATIONS, recipientLang).violation_cancelled;
        const common = getCommonTranslations(recipientLang);
        const rtl = isRTL(recipientLang as SupportedLanguage);
        
        subject = `[${tenantName}] ${replaceVariables(t.subject, { reference: incident.reference_id })}`;
        const bodyText = replaceVariables(t.body, { reference: incident.reference_id });
        
        const content = `
          <div style="background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h2 style="color: white; margin: 0;">${t.title}</h2>
          </div>
          <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
            <p>${replaceVariables(common.greeting, { name: reporterProfile?.full_name || 'User' })}</p>
            <p>${bodyText}</p>
            ${payload.notes ? `<p><strong>${t.cancelReason}:</strong> ${payload.notes}</p>` : ""}
            ${emailButton(t.button, `${appUrl}/incidents/${incidentId}`, "#6b7280", rtl)}
            <p>${common.signature}<br>${replaceVariables(common.team, { tenant: tenantName })}</p>
          </div>
        `;
        htmlContent = wrapEmailHtml(content, recipientLang, tenantName);
        break;
      }
      default:
        console.log(`Unknown action: ${action}`);
    }

    let result = { success: true, sentCount: 0 };
    if (recipients.length > 0 && subject && htmlContent) {
      result = await sendEmailWithTracking(supabase, incident.tenant_id, tenantName, action, recipients, subject, htmlContent, incidentId, { ...payload, language: recipientLang });
    }

    // --- WhatsApp Notification ---
    let whatsappSentCount = 0;
    const whatsappMessage = buildWhatsAppMessage(action, incident.reference_id, tenantName, {
      notes: payload.notes,
      reason: payload.returnReason || payload.rejectionReason,
      recipientName: reporterProfile?.full_name,
      incidentTitle: incident.title,
    });

    if (whatsappMessage) {
      // Resolve phone numbers for the targeted recipients
      const recipientUserIds = getRecipientUserIds(action, incident, payload);
      // For role-based actions (violation_contested, violation_rejected_review, violation_fine_pending, violation_acknowledgment_required)
      // phone numbers are resolved from the same profiles queried in each case;
      // for simplicity we look them up from profiles table by user ID.
      const phoneNumbers: string[] = [];
      for (const uid of recipientUserIds) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("phone_number")
          .eq("id", uid)
          .single();
        if (profile?.phone_number) {
          phoneNumbers.push(profile.phone_number);
        }
      }

      // Deduplicate
      const uniquePhones = [...new Set(phoneNumbers)];
      for (const phone of uniquePhones) {
        try {
          const waResult = await sendWhatsAppText(phone, whatsappMessage);
          if (waResult.success) {
            whatsappSentCount++;
            console.log(`[WhatsApp] Sent workflow notification to ${phone}`);
          } else {
            console.error(`[WhatsApp] Failed to send to ${phone}: ${waResult.error}`);
          }
        } catch (waError) {
          console.error(`[WhatsApp] Error sending to ${phone}:`, waError);
        }
      }
      console.log(`[WhatsApp] Sent ${whatsappSentCount}/${uniquePhones.length} workflow WhatsApp messages for action ${action}`);
    }

    return new Response(JSON.stringify({ success: true, action, recipientCount: recipients.length, sentCount: result.sentCount, whatsappSentCount, language: recipientLang }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    console.error("Error in send-workflow-notification:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
