import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { sendEmail, getAppUrl, emailButton } from "../_shared/email-sender.ts";
import { sendWhatsAppText } from "../_shared/whatsapp-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IncidentEmailRequest {
  type: 'severity_proposed' | 'severity_approved' | 'severity_rejected' | 'closure_requested' | 'closure_approved' | 'closure_rejected' | 'dept_rep_assignment';
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
  event_type?: string;
  department_name?: string;
  reporter_name?: string;
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
    const appUrl = getAppUrl();

    const { type, incident_title, incident_reference, current_severity, proposed_severity, original_severity, justification, actor_name, tenant_id, event_type, department_name, reporter_name } = payload;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let recipientEmails: string[] = [];

    // For dept_rep_assignment, we need to find department representatives
    if (type === 'dept_rep_assignment') {
      // Get department_id from the incident
      const { data: incident } = await supabase
        .from('incidents')
        .select('department_id')
        .eq('id', payload.incident_id)
        .single();

      if (incident?.department_id) {
        // Find users with department_representative role in the same department
        const { data: deptRepUsers } = await supabase
          .from('user_role_assignments')
          .select(`user_id, profiles!inner(department_id), roles!inner(code)`)
          .eq('roles.code', 'department_representative')
          .eq('profiles.department_id', incident.department_id);

        const deptRepUserIds = deptRepUsers?.map(u => u.user_id) || [];
        for (const userId of deptRepUserIds) {
          const { data: userData } = await supabase.auth.admin.getUserById(userId);
          if (userData?.user?.email) recipientEmails.push(userData.user.email);
        }
      }
    } else {
      // Original logic for HSSE users
      const { data: hsseUsers, error: rolesError } = await supabase
        .from('user_role_assignments')
        .select(`user_id, roles!inner(code)`)
        .in('roles.code', ['hsse_manager', 'hsse_officer', 'admin']);

      if (rolesError) console.error("Error fetching HSSE users:", rolesError);

      const hsseUserIds = hsseUsers?.map(u => u.user_id) || [];
      for (const userId of hsseUserIds) {
        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        if (userData?.user?.email) recipientEmails.push(userData.user.email);
      }
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
      case 'dept_rep_assignment':
        subject = `📋 New Event Report Assigned - ${incident_reference}`;
        htmlContent = `<div style="${baseStyles}"><div style="${cardStyles}"><h2 style="margin-top: 0; color: #1e40af;">New Event Report Requires Your Review</h2><p style="color: #6b7280;">A new event report has been submitted and assigned to your department for review.</p><table style="width: 100%; border-collapse: collapse; margin: 20px 0;"><tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Reference:</td><td style="padding: 8px 0; font-weight: 600;">${incident_reference}</td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Title:</td><td style="padding: 8px 0;">${incident_title}</td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Event Type:</td><td style="padding: 8px 0;">${event_type || 'N/A'}</td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Department:</td><td style="padding: 8px 0;">${department_name || 'N/A'}</td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Severity:</td><td style="padding: 8px 0;"><span style="${badgeStyles(getSeverityColor(current_severity))}">${getSeverityLabel(current_severity)}</span></td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Reported By:</td><td style="padding: 8px 0;">${reporter_name || actor_name}</td></tr></table><div style="background: #dbeafe; border: 1px solid #93c5fd; border-radius: 6px; padding: 16px; margin: 20px 0;"><p style="margin: 0; color: #1e40af;">⚡ Action Required: Please review this event report and take appropriate action.</p></div>${emailButton("Review Event Report", `${appUrl}/incidents/investigate?id=${payload.incident_id}`, "#1e40af")}</div><p style="color: #9ca3af; font-size: 12px; text-align: center;">This is an automated notification from DHUUD HSSE Platform</p></div>`;
        break;
      case 'severity_proposed':
        subject = `🔔 Severity Change Proposed - ${incident_reference}`;
        htmlContent = `<div style="${baseStyles}"><div style="${cardStyles}"><h2 style="margin-top: 0; color: #1f2937;">Severity Change Proposed</h2><p style="color: #6b7280;">A severity change has been proposed for an incident and requires your review.</p><table style="width: 100%; border-collapse: collapse; margin: 20px 0;"><tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Reference:</td><td style="padding: 8px 0; font-weight: 600;">${incident_reference}</td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Title:</td><td style="padding: 8px 0;">${incident_title}</td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Current Severity:</td><td style="padding: 8px 0;"><span style="${badgeStyles(getSeverityColor(current_severity))}">${getSeverityLabel(current_severity)}</span></td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Proposed Severity:</td><td style="padding: 8px 0;"><span style="${badgeStyles(getSeverityColor(proposed_severity || ''))}">${getSeverityLabel(proposed_severity || '')}</span></td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Proposed By:</td><td style="padding: 8px 0;">${actor_name}</td></tr></table><div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 16px; margin: 20px 0;"><p style="margin: 0 0 8px 0; font-weight: 600; color: #92400e;">Justification:</p><p style="margin: 0; color: #78350f;">${justification || 'No justification provided'}</p></div>${emailButton("Review in Investigation Workspace", `${appUrl}/incidents/investigate?id=${payload.incident_id}`, "#1e40af")}</div><p style="color: #9ca3af; font-size: 12px; text-align: center;">This is an automated notification from DHUUD HSSE Platform</p></div>`;
        break;
      case 'severity_approved':
        subject = `✅ Severity Change Approved - ${incident_reference}`;
        htmlContent = `<div style="${baseStyles}"><div style="${cardStyles}"><h2 style="margin-top: 0; color: #16a34a;">Severity Change Approved</h2><p style="color: #6b7280;">The severity change for the following incident has been approved.</p><table style="width: 100%; border-collapse: collapse; margin: 20px 0;"><tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Reference:</td><td style="padding: 8px 0; font-weight: 600;">${incident_reference}</td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Title:</td><td style="padding: 8px 0;">${incident_title}</td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Original Severity:</td><td style="padding: 8px 0;"><span style="${badgeStyles(getSeverityColor(original_severity || ''))}">${getSeverityLabel(original_severity || '')}</span></td></tr><tr><td style="padding: 8px 0; color: #6b7280;">New Severity:</td><td style="padding: 8px 0;"><span style="${badgeStyles(getSeverityColor(current_severity))}">${getSeverityLabel(current_severity)}</span></td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Approved By:</td><td style="padding: 8px 0;">${actor_name}</td></tr></table><div style="background: #dcfce7; border: 1px solid #86efac; border-radius: 6px; padding: 16px;"><p style="margin: 0; color: #166534;">✓ The severity has been officially updated in the system.</p></div>${emailButton("View Incident", `${appUrl}/incidents/investigate?id=${payload.incident_id}`, "#16a34a")}</div><p style="color: #9ca3af; font-size: 12px; text-align: center;">This is an automated notification from DHUUD HSSE Platform</p></div>`;
        break;
      case 'severity_rejected':
        subject = `❌ Severity Change Rejected - ${incident_reference}`;
        htmlContent = `<div style="${baseStyles}"><div style="${cardStyles}"><h2 style="margin-top: 0; color: #dc2626;">Severity Change Rejected</h2><p style="color: #6b7280;">The severity change request has been rejected.</p><table style="width: 100%; border-collapse: collapse; margin: 20px 0;"><tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Reference:</td><td style="padding: 8px 0; font-weight: 600;">${incident_reference}</td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Title:</td><td style="padding: 8px 0;">${incident_title}</td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Proposed:</td><td style="padding: 8px 0;"><span style="${badgeStyles(getSeverityColor(proposed_severity || ''))}">${getSeverityLabel(proposed_severity || '')}</span> ← Rejected</td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Reverted To:</td><td style="padding: 8px 0;"><span style="${badgeStyles(getSeverityColor(original_severity || ''))}">${getSeverityLabel(original_severity || '')}</span></td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Rejected By:</td><td style="padding: 8px 0;">${actor_name}</td></tr></table><div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px;"><p style="margin: 0; color: #991b1b;">The severity has been reverted to its original value.</p></div>${emailButton("View Incident", `${appUrl}/incidents/investigate?id=${payload.incident_id}`, "#6b7280")}</div><p style="color: #9ca3af; font-size: 12px; text-align: center;">This is an automated notification from DHUUD HSSE Platform</p></div>`;
        break;
      case 'closure_requested':
        subject = `🔒 Closure Requested - ${incident_reference}`;
        htmlContent = `<div style="${baseStyles}"><div style="${cardStyles}"><h2 style="margin-top: 0; color: #6366f1;">Incident Closure Requested</h2><p style="color: #6b7280;">A closure request has been submitted for the following incident.</p><table style="width: 100%; border-collapse: collapse; margin: 20px 0;"><tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Reference:</td><td style="padding: 8px 0; font-weight: 600;">${incident_reference}</td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Title:</td><td style="padding: 8px 0;">${incident_title}</td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Requested By:</td><td style="padding: 8px 0;">${actor_name}</td></tr></table>${payload.closure_notes ? `<div style="background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 20px 0;"><p style="margin: 0 0 8px 0; font-weight: 600; color: #374151;">Notes:</p><p style="margin: 0; color: #4b5563;">${payload.closure_notes}</p></div>` : ''}${emailButton("Review Closure Request", `${appUrl}/incidents/investigate?id=${payload.incident_id}`, "#6366f1")}</div><p style="color: #9ca3af; font-size: 12px; text-align: center;">This is an automated notification from DHUUD HSSE Platform</p></div>`;
        break;
      case 'closure_approved':
        subject = `✅ Incident Closed - ${incident_reference}`;
        htmlContent = `<div style="${baseStyles}"><div style="${cardStyles}"><h2 style="margin-top: 0; color: #16a34a;">Incident Closed</h2><p style="color: #6b7280;">The following incident has been officially closed.</p><table style="width: 100%; border-collapse: collapse; margin: 20px 0;"><tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Reference:</td><td style="padding: 8px 0; font-weight: 600;">${incident_reference}</td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Title:</td><td style="padding: 8px 0;">${incident_title}</td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Closed By:</td><td style="padding: 8px 0;">${actor_name}</td></tr></table><div style="background: #dcfce7; border: 1px solid #86efac; border-radius: 6px; padding: 16px;"><p style="margin: 0; color: #166534;">✓ This incident is now closed. All corrective actions have been verified.</p></div>${emailButton("View Closed Incident", `${appUrl}/incidents/investigate?id=${payload.incident_id}`, "#16a34a")}</div><p style="color: #9ca3af; font-size: 12px; text-align: center;">This is an automated notification from DHUUD HSSE Platform</p></div>`;
        break;
      case 'closure_rejected':
        subject = `❌ Closure Rejected - ${incident_reference}`;
        htmlContent = `<div style="${baseStyles}"><div style="${cardStyles}"><h2 style="margin-top: 0; color: #dc2626;">Closure Request Rejected</h2><p style="color: #6b7280;">The closure request has been rejected.</p><table style="width: 100%; border-collapse: collapse; margin: 20px 0;"><tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Reference:</td><td style="padding: 8px 0; font-weight: 600;">${incident_reference}</td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Title:</td><td style="padding: 8px 0;">${incident_title}</td></tr><tr><td style="padding: 8px 0; color: #6b7280;">Rejected By:</td><td style="padding: 8px 0;">${actor_name}</td></tr></table>${payload.rejection_notes ? `<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin: 20px 0;"><p style="margin: 0 0 8px 0; font-weight: 600; color: #991b1b;">Rejection Reason:</p><p style="margin: 0; color: #7f1d1d;">${payload.rejection_notes}</p></div>` : ''}${emailButton("View Investigation", `${appUrl}/incidents/investigate?id=${payload.incident_id}`, "#dc2626")}</div><p style="color: #9ca3af; font-size: 12px; text-align: center;">This is an automated notification from DHUUD HSSE Platform</p></div>`;
        break;
    }

    const result = await sendEmail({
      to: recipientEmails,
      subject,
      html: htmlContent,
      module: 'incident_report',
    });

    console.log("Email sent successfully:", result);

    // --- WhatsApp Notification ---
    let whatsappSentCount = 0;
    // Build a concise WhatsApp message based on the incident email type
    let waMessage: string | null = null;
    const ref = payload.incident_reference;
    const title = payload.incident_title;
    switch (type) {
      case 'severity_proposed':
        waMessage = `🔔 *Severity Change Proposed – ${ref}*\n\nA severity change from *${getSeverityLabel(payload.current_severity)}* to *${getSeverityLabel(payload.proposed_severity || '')}* has been proposed for "${title}".\n\nProposed by: ${payload.actor_name}\n\nPlease review in the portal.`;
        break;
      case 'severity_approved':
        waMessage = `✅ *Severity Change Approved – ${ref}*\n\nSeverity for "${title}" has been updated from *${getSeverityLabel(payload.original_severity || '')}* to *${getSeverityLabel(payload.current_severity)}*.\n\nApproved by: ${payload.actor_name}`;
        break;
      case 'severity_rejected':
        waMessage = `❌ *Severity Change Rejected – ${ref}*\n\nThe proposed severity change to *${getSeverityLabel(payload.proposed_severity || '')}* for "${title}" has been rejected. Reverted to *${getSeverityLabel(payload.original_severity || '')}*.\n\nRejected by: ${payload.actor_name}`;
        break;
      case 'closure_requested':
        waMessage = `🔒 *Closure Requested – ${ref}*\n\nA closure has been requested for "${title}" by ${payload.actor_name}.${payload.closure_notes ? `\nNotes: ${payload.closure_notes}` : ''}\n\nPlease review.`;
        break;
      case 'closure_approved':
        waMessage = `✅ *Incident Closed – ${ref}*\n\n"${title}" has been officially closed by ${payload.actor_name}.`;
        break;
      case 'closure_rejected':
        waMessage = `❌ *Closure Rejected – ${ref}*\n\nThe closure request for "${title}" has been rejected by ${payload.actor_name}.${payload.rejection_notes ? `\nReason: ${payload.rejection_notes}` : ''}`;
        break;
      case 'dept_rep_assignment':
        waMessage = `📋 *New Event Assigned – ${ref}*\n\n"${title}" has been assigned to your department for review.\n\nSeverity: ${getSeverityLabel(payload.current_severity)}\nReported by: ${payload.reporter_name || payload.actor_name}\n\nPlease review and take action.`;
        break;
    }

    if (waMessage) {
      // Collect phone numbers of the same recipients that received emails
      const recipientUserIds: string[] = [];
      if (type === 'dept_rep_assignment') {
        const { data: incident } = await supabase
          .from('incidents')
          .select('department_id')
          .eq('id', payload.incident_id)
          .single();
        if (incident?.department_id) {
          const { data: deptRepUsers } = await supabase
            .from('user_role_assignments')
            .select('user_id, profiles!inner(department_id), roles!inner(code)')
            .eq('roles.code', 'department_representative')
            .eq('profiles.department_id', incident.department_id);
          (deptRepUsers || []).forEach((u: { user_id: string }) => recipientUserIds.push(u.user_id));
        }
      } else {
        const { data: hsseUsers } = await supabase
          .from('user_role_assignments')
          .select('user_id, roles!inner(code)')
          .in('roles.code', ['hsse_manager', 'hsse_officer', 'admin']);
        (hsseUsers || []).forEach((u: { user_id: string }) => recipientUserIds.push(u.user_id));
      }

      // Batch fetch phone numbers in a single query instead of N+1
      const uniqueUserIds = [...new Set(recipientUserIds)];
      const { data: phoneProfiles, error: phoneError } = await supabase
        .from('profiles')
        .select('phone_number')
        .in('id', uniqueUserIds)
        .not('phone_number', 'is', null);

      if (phoneError) {
        console.error('[WhatsApp] Error fetching profiles for phone numbers:', phoneError);
      }

      const uniquePhones = [...new Set((phoneProfiles || []).map(p => p.phone_number!))];
      for (const phone of uniquePhones) {
        try {
          const waResult = await sendWhatsAppText(phone, waMessage);
          if (waResult.success) {
            whatsappSentCount++;
            console.log(`[WhatsApp] Incident notification sent to ${phone}`);
          } else {
            console.error(`[WhatsApp] Failed: ${phone}: ${waResult.error}`);
          }
        } catch (waErr) {
          console.error(`[WhatsApp] Error sending to ${phone}:`, waErr);
        }
      }
      console.log(`[WhatsApp] Sent ${whatsappSentCount} incident WhatsApp messages for type ${type}`);
    }

    return new Response(JSON.stringify({ success: result.success, messageId: result.messageId, whatsappSentCount }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: unknown) {
    console.error("Error in send-incident-email:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);
