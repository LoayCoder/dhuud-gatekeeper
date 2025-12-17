/**
 * Shared Twilio WhatsApp utility for sending messages using Content Templates
 */

export interface TwilioResponse {
  success: boolean;
  messageSid?: string;
  error?: string;
}

export interface TemplateMessage {
  templateSid: string;
  variables: Record<string, string>;
}

// Content Template SIDs (not sensitive - just identifiers)
export const TEMPLATE_SIDS = {
  VISITOR_WELCOME: 'HX811880b27dfbe00031c4a058807de3fc',
  // Add more template SIDs as they are created:
  // HOST_NOTIFICATION: 'HX...',
  // CONTRACTOR_ALERT: 'HX...',
  // INDUCTION_VIDEO: 'HX...',
};

/**
 * Format phone number to E.164 with whatsapp: prefix
 */
function formatWhatsAppNumber(phone: string): string {
  // Remove any existing whatsapp: prefix
  let cleaned = phone.replace(/^whatsapp:/, '');
  
  // Remove spaces, dashes, parentheses
  cleaned = cleaned.replace(/[\s\-\(\)]/g, '');
  
  // Handle 00 international prefix (replace with +)
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2);
  }
  // Ensure + prefix
  else if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return `whatsapp:${cleaned}`;
}

/**
 * Send a WhatsApp message via Twilio Content Templates API
 */
export async function sendWhatsAppTemplate(
  to: string,
  templateSid: string,
  variables: Record<string, string>
): Promise<TwilioResponse> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER');

  if (!accountSid || !authToken || !fromNumber) {
    console.error('[Twilio] Missing credentials - SID:', !!accountSid, 'Token:', !!authToken, 'From:', !!fromNumber);
    return {
      success: false,
      error: 'Twilio credentials not configured'
    };
  }

  const formattedTo = formatWhatsAppNumber(to);
  const formattedFrom = formatWhatsAppNumber(fromNumber);

  console.log(`[Twilio] Sending WhatsApp template ${templateSid} to ${formattedTo}`);
  console.log(`[Twilio] Variables:`, JSON.stringify(variables));

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    // Create Basic Auth header
    const credentials = btoa(`${accountSid}:${authToken}`);
    
    // Build form data with Content Template
    const formData = new URLSearchParams();
    formData.append('To', formattedTo);
    formData.append('From', formattedFrom);
    formData.append('ContentSid', templateSid);
    formData.append('ContentVariables', JSON.stringify(variables));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('[Twilio] API error:', responseData);
      return {
        success: false,
        error: responseData.message || `HTTP ${response.status}: ${response.statusText}`
      };
    }

    console.log(`[Twilio] Template message sent successfully. SID: ${responseData.sid}`);
    
    return {
      success: true,
      messageSid: responseData.sid
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Twilio] Request failed:', errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * @deprecated Use sendWhatsAppTemplate instead for WhatsApp Business API
 * Send a WhatsApp message via Twilio API (free-form - only works with Sandbox)
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string
): Promise<TwilioResponse> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER');

  if (!accountSid || !authToken || !fromNumber) {
    console.error('[Twilio] Missing credentials - SID:', !!accountSid, 'Token:', !!authToken, 'From:', !!fromNumber);
    return {
      success: false,
      error: 'Twilio credentials not configured'
    };
  }

  const formattedTo = formatWhatsAppNumber(to);
  const formattedFrom = formatWhatsAppNumber(fromNumber);

  console.log(`[Twilio] Sending WhatsApp message to ${formattedTo} from ${formattedFrom}`);

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    // Create Basic Auth header
    const credentials = btoa(`${accountSid}:${authToken}`);
    
    // Build form data
    const formData = new URLSearchParams();
    formData.append('To', formattedTo);
    formData.append('From', formattedFrom);
    formData.append('Body', message);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('[Twilio] API error:', responseData);
      return {
        success: false,
        error: responseData.message || `HTTP ${response.status}: ${response.statusText}`
      };
    }

    console.log(`[Twilio] Message sent successfully. SID: ${responseData.sid}`);
    
    return {
      success: true,
      messageSid: responseData.sid
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Twilio] Request failed:', errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  }
}
