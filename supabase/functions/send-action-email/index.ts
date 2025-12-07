import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ActionEmailRequest {
  type: 'action_assigned' | 'witness_request_created';
  recipient_email: string;
  recipient_name: string;
  // For actions
  action_title?: string;
  action_priority?: string;
  due_date?: string;
  incident_reference?: string;
  incident_title?: string;
  action_description?: string;
  // For witness requests
  witness_name?: string;
  relationship?: string;
  assignment_instructions?: string;
  // Common
  tenant_name?: string;
}

function getPriorityColor(priority: string): string {
  switch (priority?.toLowerCase()) {
    case 'critical': return '#dc2626';
    case 'high': return '#ea580c';
    case 'medium': return '#ca8a04';
    case 'low': return '#16a34a';
    default: return '#6b7280';
  }
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'Not specified';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

function buildActionAssignedEmail(data: ActionEmailRequest): { subject: string; html: string } {
  const priorityColor = getPriorityColor(data.action_priority || 'medium');
  
  return {
    subject: `[Action Required] ${data.action_title} - ${data.incident_reference || 'HSSE Event'}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Action Assigned to You</h1>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px;">Hello <strong>${data.recipient_name || 'Team Member'}</strong>,</p>
          
          <p>A corrective action has been assigned to you and requires your attention.</p>
          
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid ${priorityColor};">
            <h2 style="margin: 0 0 15px 0; color: #1e293b; font-size: 18px;">${data.action_title}</h2>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; width: 140px;">Priority:</td>
                <td style="padding: 8px 0;">
                  <span style="background: ${priorityColor}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; text-transform: uppercase;">
                    ${data.action_priority || 'Medium'}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Due Date:</td>
                <td style="padding: 8px 0; font-weight: bold;">${formatDate(data.due_date)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Related Incident:</td>
                <td style="padding: 8px 0;">${data.incident_reference || 'N/A'} - ${data.incident_title || ''}</td>
              </tr>
            </table>
            
            ${data.action_description ? `
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
                <p style="color: #64748b; margin: 0 0 8px 0; font-size: 14px;">Description:</p>
                <p style="margin: 0; color: #334155;">${data.action_description}</p>
              </div>
            ` : ''}
          </div>
          
          <p style="margin-top: 25px;">Please log in to the platform to view the full details and update the action status.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px;">
            <p>This is an automated message from ${data.tenant_name || 'DHUUD HSSE Platform'}</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

function buildWitnessRequestEmail(data: ActionEmailRequest): { subject: string; html: string } {
  return {
    subject: `[Witness Statement Request] ${data.incident_reference || 'HSSE Event Investigation'}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Witness Statement Request</h1>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px;">Hello <strong>${data.recipient_name || data.witness_name || 'Team Member'}</strong>,</p>
          
          <p>You have been identified as a witness to an HSSE event and your statement is requested as part of the investigation.</p>
          
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #7c3aed;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; width: 140px;">Incident Reference:</td>
                <td style="padding: 8px 0; font-weight: bold;">${data.incident_reference || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Incident:</td>
                <td style="padding: 8px 0;">${data.incident_title || 'HSSE Event'}</td>
              </tr>
              ${data.relationship ? `
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Your Role:</td>
                <td style="padding: 8px 0;">${data.relationship}</td>
              </tr>
              ` : ''}
            </table>
            
            ${data.assignment_instructions ? `
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
                <p style="color: #64748b; margin: 0 0 8px 0; font-size: 14px;">Instructions from Investigator:</p>
                <p style="margin: 0; color: #334155;">${data.assignment_instructions}</p>
              </div>
            ` : ''}
          </div>
          
          <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>Important:</strong> Please log in to the platform to provide your witness statement. Your input is valuable to ensure a thorough investigation.
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px;">
            <p>This is an automated message from ${data.tenant_name || 'DHUUD HSSE Platform'}</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: ActionEmailRequest = await req.json();
    console.log("Received action email request:", { type: data.type, recipient: data.recipient_email });

    if (!data.recipient_email) {
      throw new Error("Recipient email is required");
    }

    let emailContent: { subject: string; html: string };

    switch (data.type) {
      case 'action_assigned':
        emailContent = buildActionAssignedEmail(data);
        break;
      case 'witness_request_created':
        emailContent = buildWitnessRequestEmail(data);
        break;
      default:
        throw new Error(`Unknown email type: ${data.type}`);
    }

    const emailResponse = await resend.emails.send({
      from: "DHUUD HSSE Platform <onboarding@resend.dev>",
      to: [data.recipient_email],
      subject: emailContent.subject,
      html: emailContent.html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, id: emailResponse.data?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Error in send-action-email function:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
