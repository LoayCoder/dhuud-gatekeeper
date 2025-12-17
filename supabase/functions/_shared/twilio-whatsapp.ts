/**
 * Shared Twilio WhatsApp utility for sending messages
 */

export interface TwilioResponse {
  success: boolean;
  messageSid?: string;
  error?: string;
}

/**
 * Format phone number to E.164 with whatsapp: prefix
 */
function formatWhatsAppNumber(phone: string): string {
  // Remove any existing whatsapp: prefix
  let cleaned = phone.replace(/^whatsapp:/, '');
  
  // Remove spaces, dashes, parentheses
  cleaned = cleaned.replace(/[\s\-\(\)]/g, '');
  
  // Ensure + prefix
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return `whatsapp:${cleaned}`;
}

/**
 * Send a WhatsApp message via Twilio API
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
