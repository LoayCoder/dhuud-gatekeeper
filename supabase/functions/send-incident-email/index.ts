import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IncidentEmailRequest {
  type: 'severity_proposed' | 'severity_approved' | 'severity_rejected';
  incident_id: string;
  incident_title: string;
  incident_reference: string;
  current_severity: string;
  proposed_severity?: string;
  original_severity?: string;
  justification?: string;
  actor_name: string;
  actor_email?: string;
  tenant_id: string;
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

const getSeverityLabel = (severity: string): string => {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: IncidentEmailRequest = await req.json();
    console.log("Received incident email request:", payload);

    const {
      type,
      incident_id,
      incident_title,
      incident_reference,
      current_severity,
      proposed_severity,
      original_severity,
      justification,
      actor_name,
      tenant_id,
    } = payload;

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get HSSE managers and relevant stakeholders for notifications
    const { data: stakeholders, error: stakeholdersError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        tenant_id,
        user_id:id
      `)
      .eq('tenant_id', tenant_id)
      .eq('is_active', true);

    if (stakeholdersError) {
      console.error("Error fetching stakeholders:", stakeholdersError);
      throw stakeholdersError;
    }

    // Get user emails from auth.users via user_role_assignments for HSSE roles
    const { data: hsseUsers, error: rolesError } = await supabase
      .from('user_role_assignments')
      .select(`
        user_id,
        roles!inner(code)
      `)
      .in('roles.code', ['hsse_manager', 'hsse_officer', 'admin']);

    if (rolesError) {
      console.error("Error fetching HSSE users:", rolesError);
    }

    const hsseUserIds = hsseUsers?.map(u => u.user_id) || [];
    console.log("HSSE user IDs to notify:", hsseUserIds);

    // Get emails for HSSE users
    const recipientEmails: string[] = [];
    
    for (const userId of hsseUserIds) {
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      if (userData?.user?.email) {
        recipientEmails.push(userData.user.email);
      }
    }

    console.log("Recipient emails:", recipientEmails);

    if (recipientEmails.length === 0) {
      console.log("No recipients found, skipping email");
      return new Response(
        JSON.stringify({ success: true, message: "No recipients to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Build email content based on type
    let subject = '';
    let htmlContent = '';

    const baseStyles = `
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
    `;

    const cardStyles = `
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 24px;
      margin: 20px 0;
    `;

    const badgeStyles = (color: string) => `
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      color: white;
      background-color: ${color};
    `;

    switch (type) {
      case 'severity_proposed':
        subject = `🔔 Severity Change Proposed - ${incident_reference}`;
        htmlContent = `
          <div style="${baseStyles}">
            <div style="${cardStyles}">
              <h2 style="margin-top: 0; color: #1f2937;">Severity Change Proposed</h2>
              <p style="color: #6b7280;">A severity change has been proposed for an incident and requires your review.</p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; width: 140px;">Reference:</td>
                  <td style="padding: 8px 0; font-weight: 600;">${incident_reference}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Title:</td>
                  <td style="padding: 8px 0;">${incident_title}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Current Severity:</td>
                  <td style="padding: 8px 0;">
                    <span style="${badgeStyles(getSeverityColor(current_severity))}">${getSeverityLabel(current_severity)}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Proposed Severity:</td>
                  <td style="padding: 8px 0;">
                    <span style="${badgeStyles(getSeverityColor(proposed_severity || ''))}">${getSeverityLabel(proposed_severity || '')}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Proposed By:</td>
                  <td style="padding: 8px 0;">${actor_name}</td>
                </tr>
              </table>
              
              <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0; font-weight: 600; color: #92400e;">Justification:</p>
                <p style="margin: 0; color: #78350f;">${justification || 'No justification provided'}</p>
              </div>
              
              <p style="color: #6b7280; font-size: 14px;">
                Please review this request and approve or reject the severity change in the Investigation Workspace.
              </p>
            </div>
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              This is an automated notification from Dhuud HSSE Platform
            </p>
          </div>
        `;
        break;

      case 'severity_approved':
        subject = `✅ Severity Change Approved - ${incident_reference}`;
        htmlContent = `
          <div style="${baseStyles}">
            <div style="${cardStyles}">
              <h2 style="margin-top: 0; color: #16a34a;">Severity Change Approved</h2>
              <p style="color: #6b7280;">The severity change for the following incident has been approved.</p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; width: 140px;">Reference:</td>
                  <td style="padding: 8px 0; font-weight: 600;">${incident_reference}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Title:</td>
                  <td style="padding: 8px 0;">${incident_title}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Original Severity:</td>
                  <td style="padding: 8px 0;">
                    <span style="${badgeStyles(getSeverityColor(original_severity || ''))}">${getSeverityLabel(original_severity || '')}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">New Severity:</td>
                  <td style="padding: 8px 0;">
                    <span style="${badgeStyles(getSeverityColor(current_severity))}">${getSeverityLabel(current_severity)}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Approved By:</td>
                  <td style="padding: 8px 0;">${actor_name}</td>
                </tr>
              </table>
              
              <div style="background: #dcfce7; border: 1px solid #86efac; border-radius: 6px; padding: 16px;">
                <p style="margin: 0; color: #166534;">
                  ✓ The severity has been officially updated in the system.
                </p>
              </div>
            </div>
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              This is an automated notification from Dhuud HSSE Platform
            </p>
          </div>
        `;
        break;

      case 'severity_rejected':
        subject = `❌ Severity Change Rejected - ${incident_reference}`;
        htmlContent = `
          <div style="${baseStyles}">
            <div style="${cardStyles}">
              <h2 style="margin-top: 0; color: #dc2626;">Severity Change Rejected</h2>
              <p style="color: #6b7280;">The severity change request for the following incident has been rejected.</p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; width: 140px;">Reference:</td>
                  <td style="padding: 8px 0; font-weight: 600;">${incident_reference}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Title:</td>
                  <td style="padding: 8px 0;">${incident_title}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Proposed Severity:</td>
                  <td style="padding: 8px 0;">
                    <span style="${badgeStyles(getSeverityColor(proposed_severity || ''))}">${getSeverityLabel(proposed_severity || '')}</span>
                    <span style="color: #dc2626; margin-left: 8px;">← Rejected</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Reverted To:</td>
                  <td style="padding: 8px 0;">
                    <span style="${badgeStyles(getSeverityColor(original_severity || ''))}">${getSeverityLabel(original_severity || '')}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Rejected By:</td>
                  <td style="padding: 8px 0;">${actor_name}</td>
                </tr>
              </table>
              
              <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px;">
                <p style="margin: 0; color: #991b1b;">
                  The severity has been reverted to its original value.
                </p>
              </div>
            </div>
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              This is an automated notification from Dhuud HSSE Platform
            </p>
          </div>
        `;
        break;
    }

    // Send email to all recipients
    const emailResponse = await resend.emails.send({
      from: "Dhuud HSSE <notifications@resend.dev>",
      to: recipientEmails,
      subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-incident-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
