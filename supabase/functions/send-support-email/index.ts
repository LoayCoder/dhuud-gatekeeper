import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SupportEmailRequest {
  type: 'status_changed' | 'new_reply' | 'ticket_assigned' | 'sla_warning' | 'sla_breached' | 'ticket_escalated';
  ticket_number: number;
  ticket_subject: string;
  customer_email: string;
  customer_name?: string;
  // Status change
  old_status?: string;
  new_status?: string;
  // Reply
  reply_message?: string;
  agent_name?: string;
  // Assignment
  assigned_to_name?: string;
  // SLA
  sla_type?: 'first_response' | 'resolution';
  time_remaining?: string;
  // Escalation
  escalation_level?: number;
}

const statusLabels: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  waiting_customer: 'Waiting for Customer',
  resolved: 'Resolved',
  closed: 'Closed',
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Support email function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check - require valid JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's auth token
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('Invalid or expired token:', userError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    const payload: SupportEmailRequest = await req.json();
    console.log("Email payload:", payload);

    const { 
      type, 
      ticket_number, 
      ticket_subject, 
      customer_email, 
      customer_name = 'Customer',
      old_status,
      new_status,
      reply_message,
      agent_name,
      assigned_to_name,
      sla_type,
      time_remaining,
      escalation_level 
    } = payload;

    let subject = '';
    let htmlContent = '';

    const ticketLink = `Ticket #${ticket_number}`;

    switch (type) {
      case 'status_changed':
        subject = `[Ticket #${ticket_number}] Status Updated - ${ticket_subject}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Ticket Status Updated</h1>
            <p>Hello ${customer_name},</p>
            <p>The status of your support ticket has been updated.</p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">${ticketLink}: ${ticket_subject}</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0;"><strong>Previous Status:</strong></td>
                  <td style="padding: 8px 0;">${statusLabels[old_status || ''] || old_status}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>New Status:</strong></td>
                  <td style="padding: 8px 0; color: #2563eb; font-weight: bold;">${statusLabels[new_status || ''] || new_status}</td>
                </tr>
              </table>
            </div>
            
            ${new_status === 'resolved' ? `
              <p style="color: #16a34a;">Your ticket has been resolved. If you have any further questions, feel free to reply to this email or create a new ticket.</p>
            ` : ''}
            
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
              Dhuud HSSE Platform - Support Team
            </p>
          </div>
        `;
        break;

      case 'new_reply':
        subject = `[Ticket #${ticket_number}] New Reply - ${ticket_subject}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">New Reply on Your Ticket</h1>
            <p>Hello ${customer_name},</p>
            <p>You have received a new reply on your support ticket.</p>
            
            <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bfdbfe;">
              <h3 style="margin-top: 0; color: #2563eb;">${ticketLink}: ${ticket_subject}</h3>
              <p style="margin: 0;"><strong>From:</strong> ${agent_name || 'Support Team'}</p>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
              <p style="margin: 0; white-space: pre-wrap;">${reply_message}</p>
            </div>
            
            <p>Log in to your account to view the full conversation and reply.</p>
            
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
              Dhuud HSSE Platform - Support Team
            </p>
          </div>
        `;
        break;

      case 'ticket_assigned':
        subject = `[Ticket #${ticket_number}] Agent Assigned - ${ticket_subject}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Support Agent Assigned</h1>
            <p>Hello ${customer_name},</p>
            <p>A support agent has been assigned to your ticket and will be assisting you.</p>
            
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #86efac;">
              <h3 style="margin-top: 0; color: #16a34a;">${ticketLink}: ${ticket_subject}</h3>
              <p style="margin: 0;"><strong>Assigned Agent:</strong> ${assigned_to_name}</p>
            </div>
            
            <p>You can expect a response shortly. We'll notify you when there's an update.</p>
            
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
              Dhuud HSSE Platform - Support Team
            </p>
          </div>
        `;
        break;

      case 'sla_warning':
        subject = `[INTERNAL] SLA Warning - Ticket #${ticket_number}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #f59e0b;">⚠️ SLA Warning</h1>
            <p>A ticket is approaching its SLA deadline.</p>
            
            <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fcd34d;">
              <h3 style="margin-top: 0; color: #f59e0b;">${ticketLink}: ${ticket_subject}</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0;"><strong>SLA Type:</strong></td>
                  <td style="padding: 8px 0;">${sla_type === 'first_response' ? 'First Response' : 'Resolution'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Time Remaining:</strong></td>
                  <td style="padding: 8px 0; color: #f59e0b; font-weight: bold;">${time_remaining}</td>
                </tr>
                ${assigned_to_name ? `
                <tr>
                  <td style="padding: 8px 0;"><strong>Assigned To:</strong></td>
                  <td style="padding: 8px 0;">${assigned_to_name}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <p>Please take action to avoid an SLA breach.</p>
            
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
              Dhuud HSSE Platform - Automated Alert
            </p>
          </div>
        `;
        break;

      case 'sla_breached':
        subject = `[URGENT] SLA Breached - Ticket #${ticket_number}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #dc2626;">🚨 SLA Breached</h1>
            <p>A ticket has breached its SLA deadline and requires immediate attention.</p>
            
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fecaca;">
              <h3 style="margin-top: 0; color: #dc2626;">${ticketLink}: ${ticket_subject}</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0;"><strong>SLA Type:</strong></td>
                  <td style="padding: 8px 0;">${sla_type === 'first_response' ? 'First Response' : 'Resolution'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Status:</strong></td>
                  <td style="padding: 8px 0; color: #dc2626; font-weight: bold;">BREACHED</td>
                </tr>
                ${assigned_to_name ? `
                <tr>
                  <td style="padding: 8px 0;"><strong>Assigned To:</strong></td>
                  <td style="padding: 8px 0;">${assigned_to_name}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <p style="color: #dc2626; font-weight: bold;">Immediate action required.</p>
            
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
              Dhuud HSSE Platform - Automated Alert
            </p>
          </div>
        `;
        break;

      case 'ticket_escalated':
        subject = `[ESCALATION] Ticket #${ticket_number} Escalated to Level ${escalation_level}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #7c3aed;">⬆️ Ticket Escalated</h1>
            <p>A ticket has been escalated due to SLA concerns.</p>
            
            <div style="background: #f5f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #c4b5fd;">
              <h3 style="margin-top: 0; color: #7c3aed;">${ticketLink}: ${ticket_subject}</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0;"><strong>Escalation Level:</strong></td>
                  <td style="padding: 8px 0; color: #7c3aed; font-weight: bold;">Level ${escalation_level}</td>
                </tr>
                ${assigned_to_name ? `
                <tr>
                  <td style="padding: 8px 0;"><strong>Currently Assigned:</strong></td>
                  <td style="padding: 8px 0;">${assigned_to_name}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <p>This ticket requires senior attention.</p>
            
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
              Dhuud HSSE Platform - Automated Escalation
            </p>
          </div>
        `;
        break;

      default:
        console.log("Unknown email type:", type);
        return new Response(JSON.stringify({ error: "Unknown email type" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
    }

    // Determine recipient - internal alerts go to admin, customer notifications to customer
    const adminEmail = Deno.env.get("ADMIN_EMAIL") || "admin@dhuud.com";
    const isInternalAlert = ['sla_warning', 'sla_breached', 'ticket_escalated'].includes(type);
    const toEmail = isInternalAlert ? adminEmail : customer_email;

    console.log(`Sending ${type} email to ${toEmail}`);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Dhuud Support <onboarding@resend.dev>",
        to: [toEmail],
        subject,
        html: htmlContent,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Resend API error:", errorText);
      throw new Error(`Email sending failed: ${errorText}`);
    }

    const result = await emailResponse.json();
    console.log("Email sent successfully:", result);

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Error in send-support-email function:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
