import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, type EmailModule, getAppUrl, emailButton, wrapEmailHtml, getCommonTranslations, formatDateForLocale, getPriorityLabel } from "../_shared/email-sender.ts";
import { 
  ACTION_TRANSLATIONS, 
  getTranslations, 
  replaceVariables,
  isRTL,
  type SupportedLanguage 
} from "../_shared/email-translations.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ActionEmailRequest {
  type: 'action_assigned' | 'witness_request_created' | 'action_returned' | 'action_closed';
  recipient_email: string;
  recipient_name: string;
  recipient_id?: string; // User ID to fetch language preference
  action_title?: string;
  action_priority?: string;
  due_date?: string;
  incident_reference?: string;
  incident_title?: string;
  incident_id?: string;
  action_description?: string;
  rejection_notes?: string;
  return_count?: number;
  verification_notes?: string;
  verifier_name?: string;
  witness_name?: string;
  relationship?: string;
  assignment_instructions?: string;
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

function getEmailModule(type: string): EmailModule {
  switch (type) {
    case 'action_returned':
    case 'action_closed':
      return 'action_sla';
    case 'witness_request_created':
      return 'investigation';
    default:
      return 'action_assigned';
  }
}

function buildActionAssignedEmail(data: ActionEmailRequest, lang: string): { subject: string; html: string } {
  const t = getTranslations(ACTION_TRANSLATIONS, lang).action_assigned;
  const common = getCommonTranslations(lang);
  const rtl = isRTL(lang as SupportedLanguage);
  const priorityColor = getPriorityColor(data.action_priority || 'medium');
  const priorityLabel = getPriorityLabel(data.action_priority || 'medium', lang);
  const appUrl = getAppUrl();
  
  const subject = replaceVariables(t.subject, { title: data.action_title || 'Action', reference: data.incident_reference || 'HSSE Event' });
  
  const content = `
    <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">${t.heading}</h1>
    </div>
    
    <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
      <p style="font-size: 16px;">${replaceVariables(common.greeting, { name: data.recipient_name || 'Team Member' })}</p>
      
      <p>${t.body}</p>
      
      <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-${rtl ? 'right' : 'left'}: 4px solid ${priorityColor};">
        <h2 style="margin: 0 0 15px 0; color: #1e293b; font-size: 18px;">${data.action_title}</h2>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; width: 140px;">${common.priority}:</td>
            <td style="padding: 8px 0;">
              <span style="background: ${priorityColor}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; text-transform: uppercase;">
                ${priorityLabel}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">${common.dueDate}:</td>
            <td style="padding: 8px 0; font-weight: bold;">${formatDateForLocale(data.due_date, lang)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">${common.relatedIncident}:</td>
            <td style="padding: 8px 0;">${data.incident_reference || 'N/A'} - ${data.incident_title || ''}</td>
          </tr>
        </table>
        
        ${data.action_description ? `
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; margin: 0 0 8px 0; font-size: 14px;">${common.description}:</p>
            <p style="margin: 0; color: #334155;">${data.action_description}</p>
          </div>
        ` : ''}
      </div>
      
      ${emailButton(t.button, `${appUrl}/my-actions`, "#1e40af", rtl)}
    </div>
  `;

  return {
    subject,
    html: wrapEmailHtml(content, lang, data.tenant_name),
  };
}

function buildWitnessRequestEmail(data: ActionEmailRequest, lang: string, incidentId?: string): { subject: string; html: string } {
  const t = getTranslations(ACTION_TRANSLATIONS, lang).witness_request;
  const common = getCommonTranslations(lang);
  const rtl = isRTL(lang as SupportedLanguage);
  const appUrl = getAppUrl();
  
  const subject = replaceVariables(t.subject, { reference: data.incident_reference || 'HSSE Event Investigation' });
  
  const content = `
    <div style="background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">${t.heading}</h1>
    </div>
    
    <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
      <p style="font-size: 16px;">${replaceVariables(common.greeting, { name: data.recipient_name || data.witness_name || 'Team Member' })}</p>
      
      <p>${t.body}</p>
      
      <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-${rtl ? 'right' : 'left'}: 4px solid #7c3aed;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; width: 140px;">${t.incidentReference}:</td>
            <td style="padding: 8px 0; font-weight: bold;">${data.incident_reference || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">${t.incident}:</td>
            <td style="padding: 8px 0;">${data.incident_title || 'HSSE Event'}</td>
          </tr>
          ${data.relationship ? `
          <tr>
            <td style="padding: 8px 0; color: #64748b;">${t.yourRole}:</td>
            <td style="padding: 8px 0;">${data.relationship}</td>
          </tr>
          ` : ''}
        </table>
        
        ${data.assignment_instructions ? `
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; margin: 0 0 8px 0; font-size: 14px;">${t.investigatorInstructions}:</p>
            <p style="margin: 0; color: #334155;">${data.assignment_instructions}</p>
          </div>
        ` : ''}
      </div>
      
      ${incidentId ? emailButton(t.button, `${appUrl}/incidents/investigate?id=${incidentId}`, "#7c3aed", rtl) : ''}
      
      <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>${common.important}:</strong> ${t.importantNote}
        </p>
      </div>
    </div>
  `;

  return {
    subject,
    html: wrapEmailHtml(content, lang, data.tenant_name),
  };
}

function buildActionReturnedEmail(data: ActionEmailRequest, lang: string): { subject: string; html: string } {
  const t = getTranslations(ACTION_TRANSLATIONS, lang).action_returned;
  const common = getCommonTranslations(lang);
  const rtl = isRTL(lang as SupportedLanguage);
  const appUrl = getAppUrl();
  
  const subject = replaceVariables(t.subject, { title: data.action_title || 'Action' });
  const returnCountText = (data.return_count || 1) > 1 
    ? replaceVariables(t.returnCount, { count: String(data.return_count) })
    : '';
    
  const content = `
    <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ ${t.heading}</h1>
    </div>
    
    <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
      <p style="font-size: 16px;">${replaceVariables(common.greeting, { name: data.recipient_name || 'Team Member' })}</p>
      
      <p>${t.body}</p>
      
      <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-${rtl ? 'right' : 'left'}: 4px solid #dc2626;">
        <h2 style="margin: 0 0 15px 0; color: #1e293b; font-size: 18px;">${data.action_title}</h2>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; width: 140px;">${common.relatedIncident}:</td>
            <td style="padding: 8px 0;">${data.incident_reference || 'N/A'}</td>
          </tr>
          ${data.return_count && data.return_count > 1 ? `
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Return Count:</td>
            <td style="padding: 8px 0;">
              <span style="background: #fef2f2; color: #dc2626; padding: 4px 12px; border-radius: 4px; font-size: 12px;">
                ${data.return_count}x
              </span>
            </td>
          </tr>
          ` : ''}
        </table>
      </div>
      
      ${data.rejection_notes ? `
        <div style="background: #fef2f2; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #fecaca;">
          <p style="color: #991b1b; margin: 0 0 10px 0; font-weight: bold; font-size: 14px;">📝 ${t.verifierNotes}:</p>
          <p style="margin: 0; color: #7f1d1d; font-style: italic;">"${data.rejection_notes}"</p>
        </div>
      ` : ''}
      
      ${returnCountText ? `
        <p style="color: #dc2626; font-weight: 500; margin-top: 15px;">
          ${returnCountText}
        </p>
      ` : ''}
      
      ${emailButton(t.button, `${appUrl}/my-actions`, "#dc2626", rtl)}
    </div>
  `;

  return {
    subject,
    html: wrapEmailHtml(content, lang, data.tenant_name),
  };
}

function buildActionClosedEmail(data: ActionEmailRequest, lang: string): { subject: string; html: string } {
  const t = getTranslations(ACTION_TRANSLATIONS, lang).action_closed;
  const common = getCommonTranslations(lang);
  const rtl = isRTL(lang as SupportedLanguage);
  const appUrl = getAppUrl();
  
  const subject = replaceVariables(t.subject, { title: data.action_title || 'Action' });
  
  const content = `
    <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">✓ ${t.heading}</h1>
    </div>
    
    <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
      <p style="font-size: 16px;">${replaceVariables(common.greeting, { name: data.recipient_name || 'Team Member' })}</p>
      
      <p>${t.body}</p>
      
      <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-${rtl ? 'right' : 'left'}: 4px solid #16a34a;">
        <h2 style="margin: 0 0 15px 0; color: #1e293b; font-size: 18px;">${data.action_title}</h2>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; width: 140px;">${common.status}:</td>
            <td style="padding: 8px 0;">
              <span style="background: #16a34a; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; text-transform: uppercase;">
                ${common.closed}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">${common.relatedIncident}:</td>
            <td style="padding: 8px 0;">${data.incident_reference || 'N/A'}</td>
          </tr>
          ${data.verifier_name ? `
          <tr>
            <td style="padding: 8px 0; color: #64748b;">${t.verifiedBy}:</td>
            <td style="padding: 8px 0;">${data.verifier_name}</td>
          </tr>
          ` : ''}
        </table>
      </div>
      
      ${data.verification_notes ? `
        <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #bbf7d0;">
          <p style="color: #166534; margin: 0 0 10px 0; font-weight: bold; font-size: 14px;">✓ ${t.verificationNotes}:</p>
          <p style="margin: 0; color: #15803d;">"${data.verification_notes}"</p>
        </div>
      ` : ''}
      
      ${emailButton(t.button, `${appUrl}/my-actions`, "#16a34a", rtl)}
      
      <p style="margin-top: 25px;">${t.thankYou}</p>
    </div>
  `;

  return {
    subject,
    html: wrapEmailHtml(content, lang, data.tenant_name),
  };
}

serve(async (req: Request) => {
  console.log("Action email function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: ActionEmailRequest = await req.json();
    console.log("Received action email request:", data.type);

    // Get recipient's preferred language
    let lang = 'en';
    if (data.recipient_id) {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: profile } = await supabase.from("profiles").select("preferred_language").eq("id", data.recipient_id).single();
      if (profile?.preferred_language) {
        lang = profile.preferred_language;
      }
    }

    let emailContent: { subject: string; html: string };
    
    switch (data.type) {
      case 'action_assigned':
        emailContent = buildActionAssignedEmail(data, lang);
        break;
      case 'witness_request_created':
        emailContent = buildWitnessRequestEmail(data, lang, data.incident_id);
        break;
      case 'action_returned':
        emailContent = buildActionReturnedEmail(data, lang);
        break;
      case 'action_closed':
        emailContent = buildActionClosedEmail(data, lang);
        break;
      default:
        return new Response(
          JSON.stringify({ error: "Unknown email type" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }

    const result = await sendEmail({
      to: data.recipient_email,
      subject: emailContent.subject,
      html: emailContent.html,
      module: getEmailModule(data.type),
      tenantName: data.tenant_name,
    });

    if (!result.success) {
      console.error("Email sending failed:", result.error);
      throw new Error(result.error || "Email sending failed");
    }

    console.log(`Email sent successfully in ${lang}:`, result.messageId);

    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId, language: lang }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in send-action-email function:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
