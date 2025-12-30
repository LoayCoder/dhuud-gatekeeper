/**
 * WaSender API WhatsApp utility for sending messages
 * API Documentation: https://wasenderapi.com/api-docs/messages/send-text-message
 */

export interface WaSenderResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Format phone number to WaSender format (just digits with country code, no + sign)
 */
function formatPhoneNumber(phone: string): string {
  // Remove any whatsapp: prefix
  let cleaned = phone.replace(/^whatsapp:/, '');
  
  // Remove spaces, dashes, parentheses
  cleaned = cleaned.replace(/[\s\-\(\)]/g, '');
  
  // Keep the + for WaSender API - they accept +1234567890 format
  // But also handle 00 international prefix
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2);
  }
  
  // If no + prefix, add it
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
}

/**
 * Send a text message via WaSender API
 * Endpoint: POST https://www.wasenderapi.com/api/send-message
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
    const response = await fetch('https://www.wasenderapi.com/api/send-message', {
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

    console.log(`[WaSender] Message sent successfully:`, responseData);
    
    return {
      success: true,
      messageId: responseData.messageId || responseData.id || responseData.message_id || 'sent'
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
 * Send a media message (image/video/document) via WaSender API
 * Endpoint: POST https://www.wasenderapi.com/api/send-media
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
    // Build payload using the correct parameter for each media type
    // WaSender API uses /api/send-message with imageUrl, videoUrl, or documentUrl
    const mediaPayload: Record<string, string> = {
      to: formattedPhone,
    };

    // Add caption as text if provided
    if (caption) {
      mediaPayload.text = caption;
    }

    // Add the appropriate media URL based on type
    switch (mediaType) {
      case 'image':
        mediaPayload.imageUrl = mediaUrl;
        break;
      case 'video':
        mediaPayload.videoUrl = mediaUrl;
        break;
      case 'document':
        mediaPayload.documentUrl = mediaUrl;
        break;
    }

    console.log(`[WaSender] Sending ${mediaType} via /api/send-message with ${mediaType}Url`);

    const response = await fetch('https://www.wasenderapi.com/api/send-message', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mediaPayload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('[WaSender] API error:', responseData);
      return {
        success: false,
        error: responseData.message || responseData.error || `HTTP ${response.status}: ${response.statusText}`
      };
    }

    console.log(`[WaSender] Media sent successfully:`, responseData);
    
    return {
      success: true,
      messageId: responseData.messageId || responseData.id || responseData.message_id || 'sent'
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
