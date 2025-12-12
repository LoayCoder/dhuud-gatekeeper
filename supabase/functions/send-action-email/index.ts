import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// AWS SES Configuration
const AWS_ACCESS_KEY_ID = Deno.env.get("AWS_ACCESS_KEY_ID");
const AWS_SECRET_ACCESS_KEY = Deno.env.get("AWS_SECRET_ACCESS_KEY");
const AWS_SES_REGION = Deno.env.get("AWS_SES_REGION") || "us-east-1";
const AWS_SES_FROM_EMAIL = Deno.env.get("AWS_SES_FROM_EMAIL") || "noreply@dhuud.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ActionEmailRequest {
  type: 'action_assigned' | 'witness_request_created' | 'action_returned';
  recipient_email: string;
  recipient_name: string;
  // For actions
  action_title?: string;
  action_priority?: string;
  due_date?: string;
  incident_reference?: string;
  incident_title?: string;
  action_description?: string;
  // For action returned
  rejection_notes?: string;
  return_count?: number;
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

// AWS SES email sending helper
async function sendEmailViaSES(to: string, subject: string, html: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const host = `email.${AWS_SES_REGION}.amazonaws.com`;
  const endpoint = `https://${host}/`;
  const date = new Date();
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const params = new URLSearchParams({
    Action: 'SendEmail',
    Version: '2010-12-01',
    'Source': AWS_SES_FROM_EMAIL,
    'Destination.ToAddresses.member.1': to,
    'Message.Subject.Data': subject,
    'Message.Subject.Charset': 'UTF-8',
    'Message.Body.Html.Data': html,
    'Message.Body.Html.Charset': 'UTF-8',
  });

  const body = params.toString();
  const hashedPayload = await sha256(body);
  const canonicalRequest = [
    'POST',
    '/',
    '',
    `host:${host}`,
    `x-amz-date:${amzDate}`,
    '',
    'host;x-amz-date',
    hashedPayload,
  ].join('\n');

  const hashedCanonicalRequest = await sha256(canonicalRequest);
  const credentialScope = `${dateStamp}/${AWS_SES_REGION}/ses/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    hashedCanonicalRequest,
  ].join('\n');

  const signingKey = await getSignatureKey(
    AWS_SECRET_ACCESS_KEY!,
    dateStamp,
    AWS_SES_REGION,
    'ses'
  );
  const signature = await hmacHex(signingKey, stringToSign);

  const authorizationHeader = [
    `AWS4-HMAC-SHA256 Credential=${AWS_ACCESS_KEY_ID}/${credentialScope}`,
    `SignedHeaders=host;x-amz-date`,
    `Signature=${signature}`,
  ].join(', ');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Host': host,
      'X-Amz-Date': amzDate,
      'Authorization': authorizationHeader,
    },
    body,
  });

  const responseText = await response.text();
  
  if (!response.ok) {
    console.error('SES Error Response:', responseText);
    return { success: false, error: responseText };
  }

  const messageIdMatch = responseText.match(/<MessageId>(.+?)<\/MessageId>/);
  return { 
    success: true, 
    messageId: messageIdMatch ? messageIdMatch[1] : undefined 
  };
}

// Helper functions for AWS signing
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmac(key: Uint8Array, message: string): Promise<Uint8Array> {
  // Convert Uint8Array to ArrayBuffer explicitly
  const keyBuffer = new ArrayBuffer(key.length);
  const keyView = new Uint8Array(keyBuffer);
  keyView.set(key);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  return new Uint8Array(signature);
}

async function hmacHex(key: Uint8Array, message: string): Promise<string> {
  const sig = await hmac(key, message);
  return Array.from(sig)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getSignatureKey(
  key: string,
  dateStamp: string,
  regionName: string,
  serviceName: string
): Promise<Uint8Array> {
  const kDate = await hmac(new TextEncoder().encode('AWS4' + key), dateStamp);
  const kRegion = await hmac(kDate, regionName);
  const kService = await hmac(kRegion, serviceName);
  return await hmac(kService, 'aws4_request');
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

function buildActionReturnedEmail(data: ActionEmailRequest): { subject: string; html: string } {
  const returnCountText = (data.return_count || 1) > 1 
    ? `This action has been returned ${data.return_count} times.`
    : '';
    
  return {
    subject: `[Action Returned] ${data.action_title} - Corrections Required`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Action Returned for Correction</h1>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px;">Hello <strong>${data.recipient_name || 'Team Member'}</strong>,</p>
          
          <p>Your corrective action has been reviewed and returned for correction. Please address the feedback below and resubmit.</p>
          
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h2 style="margin: 0 0 15px 0; color: #1e293b; font-size: 18px;">${data.action_title}</h2>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; width: 140px;">Related Incident:</td>
                <td style="padding: 8px 0;">${data.incident_reference || 'N/A'}</td>
              </tr>
              ${data.return_count && data.return_count > 1 ? `
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Return Count:</td>
                <td style="padding: 8px 0;">
                  <span style="background: #fef2f2; color: #dc2626; padding: 4px 12px; border-radius: 4px; font-size: 12px;">
                    ${data.return_count}x Returned
                  </span>
                </td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          ${data.rejection_notes ? `
            <div style="background: #fef2f2; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #fecaca;">
              <p style="color: #991b1b; margin: 0 0 10px 0; font-weight: bold; font-size: 14px;">📝 Verifier's Notes:</p>
              <p style="margin: 0; color: #7f1d1d; font-style: italic;">"${data.rejection_notes}"</p>
            </div>
          ` : ''}
          
          ${returnCountText ? `
            <p style="color: #dc2626; font-weight: 500; margin-top: 15px;">
              ${returnCountText}
            </p>
          ` : ''}
          
          <p style="margin-top: 25px;">Please log in to the platform to review the feedback and resubmit your corrective action.</p>
          
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
      case 'action_returned':
        emailContent = buildActionReturnedEmail(data);
        break;
      default:
        throw new Error(`Unknown email type: ${data.type}`);
    }

    // Send email via AWS SES
    const result = await sendEmailViaSES(
      data.recipient_email,
      emailContent.subject,
      emailContent.html
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to send email');
    }

    console.log("Email sent successfully via AWS SES:", result.messageId);

    return new Response(JSON.stringify({ success: true, messageId: result.messageId }), {
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
