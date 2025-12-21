/**
 * WaSender API WhatsApp utility for sending messages
 * API Documentation: https://wasenderapi.com/
 */

export interface WaSenderResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Format phone number to WaSender format (just digits with country code)
 */
function formatPhoneNumber(phone: string): string {
  // Remove any whatsapp: prefix
  let cleaned = phone.replace(/^whatsapp:/, '');
  
  // Remove spaces, dashes, parentheses, plus sign
  cleaned = cleaned.replace(/[\s\-\(\)\+]/g, '');
  
  // Handle 00 international prefix
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }
  
  return cleaned;
}

/**
 * Send a text message via WaSender API
 */
export async function sendWaSenderTextMessage(
  to: string,
  message: string
): Promise<WaSenderResponse> {
  const apiKey = Deno.env.get('WASENDER_API_KEY');

  if (!apiKey) {
    console.error('[WaSender] Missing API key');
    return {
      success: false,
      error: 'WaSender API key not configured'
    };
  }

  const formattedPhone = formatPhoneNumber(to);

  console.log(`[WaSender] Sending text message to ${formattedPhone}`);

  try {
    const response = await fetch('https://api.wasenderapi.com/api/v1/message/text', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: formattedPhone,
        text: message
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('[WaSender] API error:', responseData);
      return {
        success: false,
        error: responseData.message || responseData.error || `HTTP ${response.status}: ${response.statusText}`
      };
    }

    console.log(`[WaSender] Message sent successfully. ID: ${responseData.messageId || responseData.id}`);
    
    return {
      success: true,
      messageId: responseData.messageId || responseData.id || 'sent'
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[WaSender] Request failed:', errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Send a media message (image/video) via WaSender API
 */
export async function sendWaSenderMediaMessage(
  to: string,
  mediaUrl: string,
  caption?: string,
  mediaType: 'image' | 'video' | 'document' = 'image'
): Promise<WaSenderResponse> {
  const apiKey = Deno.env.get('WASENDER_API_KEY');

  if (!apiKey) {
    console.error('[WaSender] Missing API key');
    return {
      success: false,
      error: 'WaSender API key not configured'
    };
  }

  const formattedPhone = formatPhoneNumber(to);

  console.log(`[WaSender] Sending ${mediaType} to ${formattedPhone}`);

  try {
    const endpoint = mediaType === 'video' 
      ? 'https://api.wasenderapi.com/api/v1/message/video'
      : mediaType === 'document'
      ? 'https://api.wasenderapi.com/api/v1/message/document'
      : 'https://api.wasenderapi.com/api/v1/message/image';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: formattedPhone,
        url: mediaUrl,
        caption: caption || ''
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('[WaSender] API error:', responseData);
      return {
        success: false,
        error: responseData.message || responseData.error || `HTTP ${response.status}: ${response.statusText}`
      };
    }

    console.log(`[WaSender] Media sent successfully. ID: ${responseData.messageId || responseData.id}`);
    
    return {
      success: true,
      messageId: responseData.messageId || responseData.id || 'sent'
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[WaSender] Request failed:', errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  }
}
