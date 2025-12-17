import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, type EmailModule, getAppUrl, emailButton } from "../_shared/email-sender.ts";

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

    const appUrl = getAppUrl();
    
    switch (action) {
      case "expert_return":
        if (reporterProfile?.email) recipients.push(reporterProfile.email);
        subject = `[${tenantName}] Action Required: Event Report Returned for Correction`;
        htmlContent = `<h2>Event Report Returned for Correction</h2><p>Dear ${reporterProfile?.full_name || "Reporter"},</p><p>Your event report <strong>${incident.reference_id}</strong> has been returned by the HSSE Expert for correction.</p>${payload.returnReason ? `<p><strong>Reason:</strong> ${payload.returnReason}</p>` : ""}${payload.returnInstructions ? `<p><strong>Instructions:</strong> ${payload.returnInstructions}</p>` : ""}${emailButton("Edit & Resubmit Report", `${appUrl}/incidents/report?edit=${incidentId}`, "#dc2626")}<p>Best regards,<br>${tenantName} HSSE Team</p>`;
        break;
      case "expert_reject":
        if (reporterProfile?.email) recipients.push(reporterProfile.email);
        subject = `[${tenantName}] Event Report Rejected - Action Required`;
        htmlContent = `<h2>Event Report Rejected</h2><p>Dear ${reporterProfile?.full_name || "Reporter"},</p><p>Your event report <strong>${incident.reference_id}</strong> has been rejected by the HSSE Expert.</p>${payload.rejectionReason ? `<p><strong>Reason:</strong> ${payload.rejectionReason}</p>` : ""}${emailButton("View Incident Details", `${appUrl}/incidents/${incidentId}`, "#6b7280")}<p>Best regards,<br>${tenantName} HSSE Team</p>`;
        break;
      case "expert_investigate":
        if (incident.approval_manager_id) {
          const { data: manager } = await supabase.from("profiles").select("email, full_name").eq("id", incident.approval_manager_id).single();
          if (manager?.email) recipients.push(manager.email);
          subject = `[${tenantName}] Investigation Approval Required`;
          htmlContent = `<h2>Investigation Approval Required</h2><p>Dear ${manager?.full_name || "Manager"},</p><p>Event <strong>${incident.reference_id}</strong> has been recommended for investigation by the HSSE Expert.</p><p><strong>Event Title:</strong> ${incident.title}</p>${payload.notes ? `<p><strong>Expert Notes:</strong> ${payload.notes}</p>` : ""}${emailButton("Review & Approve", `${appUrl}/incidents/investigate?id=${incidentId}`, "#1e40af")}<p>Best regards,<br>${tenantName} HSSE Team</p>`;
        }
        break;
      case "investigator_assigned":
        if (payload.investigatorId) {
          const { data: investigator } = await supabase.from("profiles").select("email, full_name").eq("id", payload.investigatorId).single();
          if (investigator?.email) recipients.push(investigator.email);
          subject = `[${tenantName}] You Have Been Assigned to Investigate Event ${incident.reference_id}`;
          htmlContent = `<h2>Investigation Assignment</h2><p>Dear ${investigator?.full_name || "Investigator"},</p><p>You have been assigned to investigate event <strong>${incident.reference_id}</strong>.</p><p><strong>Event Title:</strong> ${incident.title}</p>${emailButton("Start Investigation", `${appUrl}/incidents/investigate?id=${incidentId}`, "#16a34a")}<p>Best regards,<br>${tenantName} HSSE Team</p>`;
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
