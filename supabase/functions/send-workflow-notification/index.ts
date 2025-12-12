import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: WorkflowNotificationRequest = await req.json();
    const { incidentId, action } = payload;

    console.log(`Processing workflow notification: ${action} for incident ${incidentId}`);

    // Get incident details
    const { data: incident, error: incidentError } = await supabase
      .from("incidents")
      .select(`
        id,
        reference_id,
        title,
        reporter_id,
        tenant_id,
        approval_manager_id,
        profiles!incidents_reporter_id_fkey(id, full_name, email)
      `)
      .eq("id", incidentId)
      .single();

    if (incidentError || !incident) {
      console.error("Failed to fetch incident:", incidentError);
      return new Response(
        JSON.stringify({ error: "Incident not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get tenant details for branding
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", incident.tenant_id)
      .single();

    const tenantName = tenant?.name || "HSSE Platform";
    // profiles is an array from the join, get the first element
    const profilesArray = incident.profiles as unknown as Array<{ id: string; full_name: string; email: string }> | null;
    const reporterProfile = profilesArray?.[0] || null;

    // Determine recipients and email content based on action
    let recipients: string[] = [];
    let subject = "";
    let htmlContent = "";

    switch (action) {
      case "expert_return":
        // Notify reporter that their report needs correction
        if (reporterProfile?.email) {
          recipients.push(reporterProfile.email);
        }
        subject = `[${tenantName}] Action Required: Event Report Returned for Correction`;
        htmlContent = `
          <h2>Event Report Returned for Correction</h2>
          <p>Dear ${reporterProfile?.full_name || "Reporter"},</p>
          <p>Your event report <strong>${incident.reference_id}</strong> has been returned by the HSSE Expert for correction.</p>
          ${payload.returnReason ? `<p><strong>Reason:</strong> ${payload.returnReason}</p>` : ""}
          ${payload.returnInstructions ? `<p><strong>Instructions:</strong> ${payload.returnInstructions}</p>` : ""}
          <p>Please log in to review and resubmit your report.</p>
          <p>Best regards,<br>${tenantName} HSSE Team</p>
        `;
        break;

      case "expert_reject":
        // Notify reporter that their report was rejected
        if (reporterProfile?.email) {
          recipients.push(reporterProfile.email);
        }
        subject = `[${tenantName}] Event Report Rejected - Action Required`;
        htmlContent = `
          <h2>Event Report Rejected</h2>
          <p>Dear ${reporterProfile?.full_name || "Reporter"},</p>
          <p>Your event report <strong>${incident.reference_id}</strong> has been rejected by the HSSE Expert.</p>
          ${payload.rejectionReason ? `<p><strong>Reason:</strong> ${payload.rejectionReason}</p>` : ""}
          <p>Please log in to confirm this rejection or dispute it if you believe the decision is incorrect.</p>
          <p>Best regards,<br>${tenantName} HSSE Team</p>
        `;
        break;

      case "expert_investigate":
        // Notify department manager about pending approval
        if (incident.approval_manager_id) {
          const { data: manager } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("id", incident.approval_manager_id)
            .single();
          
          if (manager?.email) {
            recipients.push(manager.email);
          }
          
          subject = `[${tenantName}] Investigation Approval Required`;
          htmlContent = `
            <h2>Investigation Approval Required</h2>
            <p>Dear ${manager?.full_name || "Manager"},</p>
            <p>Event <strong>${incident.reference_id}</strong> has been recommended for investigation by the HSSE Expert.</p>
            <p><strong>Event Title:</strong> ${incident.title}</p>
            ${payload.notes ? `<p><strong>Expert Notes:</strong> ${payload.notes}</p>` : ""}
            <p>Please log in to review and approve or reject this investigation request.</p>
            <p>Best regards,<br>${tenantName} HSSE Team</p>
          `;
        }
        break;

      case "reporter_dispute_rejection":
        // Notify HSSE Managers about the dispute
        const { data: hsseManagers } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .eq("tenant_id", incident.tenant_id)
          .eq("is_active", true);

        if (hsseManagers) {
          // Filter to HSSE managers
          const { data: roleAssignments } = await supabase
            .from("user_role_assignments")
            .select("user_id, roles!inner(code)")
            .in("user_id", hsseManagers.map(m => m.id));

          const managerUserIds = new Set(
            roleAssignments
              ?.filter((ra: { user_id: string; roles: { code: string }[] }) => 
                ra.roles.some((role: { code: string }) => role.code === "hsse_manager")
              )
              .map((ra: { user_id: string }) => ra.user_id) || []
          );

          recipients = hsseManagers
            .filter(m => managerUserIds.has(m.id) && m.email)
            .map(m => m.email);
        }

        subject = `[${tenantName}] Rejection Dispute Escalated`;
        htmlContent = `
          <h2>Rejection Dispute Escalated</h2>
          <p>The reporter has disputed the rejection of event <strong>${incident.reference_id}</strong>.</p>
          <p><strong>Reporter:</strong> ${reporterProfile?.full_name || "Unknown"}</p>
          ${payload.disputeNotes ? `<p><strong>Dispute Notes:</strong> ${payload.disputeNotes}</p>` : ""}
          <p>Please log in to review and make a final decision.</p>
          <p>Best regards,<br>${tenantName} HSSE Team</p>
        `;
        break;

      case "expert_assign_actions":
        // Notify department representative about observation needing action assignment
        if (incident.approval_manager_id) {
          const { data: deptRep } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("id", incident.approval_manager_id)
            .single();
          
          if (deptRep?.email) {
            recipients.push(deptRep.email);
          }
          
          subject = `[${tenantName}] Observation Requires Action Assignment`;
          htmlContent = `
            <h2>Observation Requires Action Assignment</h2>
            <p>Dear ${deptRep?.full_name || "Department Representative"},</p>
            <p>Observation <strong>${incident.reference_id}</strong> has been reviewed by the HSSE Expert and requires corrective action assignment.</p>
            <p><strong>Observation Title:</strong> ${incident.title}</p>
            ${payload.notes ? `<p><strong>Expert Notes:</strong> ${payload.notes}</p>` : ""}
            <p>Please log in to review the observation, assign corrective actions, and approve for closure.</p>
            <p>Best regards,<br>${tenantName} HSSE Team</p>
          `;
        }
        break;

      case "dept_rep_approve":
        // Notify reporter that observation was closed
        if (reporterProfile?.email) {
          recipients.push(reporterProfile.email);
        }
        subject = `[${tenantName}] Observation Closed - ${incident.reference_id}`;
        htmlContent = `
          <h2>Observation Closed</h2>
          <p>Dear ${reporterProfile?.full_name || "Reporter"},</p>
          <p>Your observation <strong>${incident.reference_id}</strong> has been reviewed and closed by the department representative.</p>
          <p>Corrective actions have been assigned and the observation workflow is now complete.</p>
          <p>Thank you for your contribution to workplace safety.</p>
          <p>Best regards,<br>${tenantName} HSSE Team</p>
        `;
        break;

      case "dept_rep_escalate":
        // Notify department manager about escalation to investigation
        if (incident.approval_manager_id) {
          const { data: manager } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("id", incident.approval_manager_id)
            .single();
          
          if (manager?.email) {
            recipients.push(manager.email);
          }
          
          subject = `[${tenantName}] Observation Escalated to Investigation`;
          htmlContent = `
            <h2>Observation Escalated</h2>
            <p>Observation <strong>${incident.reference_id}</strong> has been escalated to the full investigation workflow.</p>
            <p><strong>Observation Title:</strong> ${incident.title}</p>
            ${payload.notes ? `<p><strong>Department Rep Notes:</strong> ${payload.notes}</p>` : ""}
            <p>Please log in to review and approve the investigation request.</p>
            <p>Best regards,<br>${tenantName} HSSE Team</p>
          `;
        }
        break;

      case "manager_approved":
        // Notify HSSE Expert to assign investigator
        // For now, we'll skip this as we don't have a specific recipient
        console.log("Manager approved - HSSE Expert should assign investigator");
        break;

      case "manager_rejected":
        // Escalated to HSSE Manager - similar to dispute
        console.log("Manager rejected - escalated to HSSE Manager");
        break;

      case "investigator_assigned":
        // Notify the assigned investigator
        if (payload.investigatorId) {
          const { data: investigator } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("id", payload.investigatorId)
            .single();

          if (investigator?.email) {
            recipients.push(investigator.email);
          }

          subject = `[${tenantName}] You Have Been Assigned to Investigate Event ${incident.reference_id}`;
          htmlContent = `
            <h2>Investigation Assignment</h2>
            <p>Dear ${investigator?.full_name || "Investigator"},</p>
            <p>You have been assigned to investigate event <strong>${incident.reference_id}</strong>.</p>
            <p><strong>Event Title:</strong> ${incident.title}</p>
            <p>Please log in to begin your investigation.</p>
            <p>Best regards,<br>${tenantName} HSSE Team</p>
          `;
        }
        break;

      default:
        console.log(`Unknown action: ${action}`);
    }

    // Send emails
    if (recipients.length > 0 && subject && htmlContent) {
      // Filter to valid email addresses (basic check)
      const validEmails = recipients.filter(r => r && r.includes("@"));
      
      if (validEmails.length > 0) {
        try {
          const emailResponse = await resend.emails.send({
            from: `${tenantName} <onboarding@resend.dev>`,
            to: validEmails,
            subject,
            html: htmlContent,
          });
          console.log("Email sent successfully:", emailResponse);
        } catch (emailError) {
          console.error("Failed to send email:", emailError);
          // Don't fail the whole request if email fails
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, action, recipientCount: recipients.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-workflow-notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
