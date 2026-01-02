/**
 * WaSender API WhatsApp utility for sending messages
 * API Documentation: https://wasenderapi.com/api-docs
 * 
 * CORRECT FORMATS (per official docs):
 * - Endpoint: https://wasenderapi.com/api/send-message
 * - Phone format: E.164 with + prefix (e.g., +966501234567)
 * - Text payload: { to, text }
 * - Image payload: { to, text, imageUrl }
 */

// Rate limit retry configuration
const MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 5500; // 5.5 seconds (WaSender limit is 5s)

/**
 * Helper function to delay execution
 */
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if error is a rate limit error
 */
function isRateLimitError(status: number, responseData: Record<string, unknown>): boolean {
  if (status === 429) return true;
  const errorMessage = String(responseData.error || responseData.message || '').toLowerCase();
  return errorMessage.includes('account protection') || errorMessage.includes('rate limit');
}

export interface WaSenderResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Format phone number to E.164 format WITH + prefix
 * WaSender expects format like: +966501234567
 */
function formatPhoneNumber(phone: string): string {
  // Remove any whatsapp: prefix
  let cleaned = phone.replace(/^whatsapp:/, '');
  
  // Remove spaces, dashes, parentheses
  cleaned = cleaned.replace(/[\s\-\(\)]/g, '');
  
  // Handle 00 international prefix
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2);
  }
  
  // If starts with 0, assume Saudi Arabia
  if (cleaned.startsWith('0') && !cleaned.startsWith('00')) {
    cleaned = '+966' + cleaned.substring(1);
  }
  
  // If just 9 digits, assume Saudi Arabia
  if (/^\d{9}$/.test(cleaned)) {
    cleaned = '+966' + cleaned;
  }
  
  // Ensure + prefix exists
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
}

/**
 * Send a text message via WaSender API
 * Endpoint: POST https://wasenderapi.com/api/send-message
 * Payload: { to: "+966...", text: "message" }
 * 
 * Includes automatic retry logic for rate limiting (account protection)
 */
export async function sendWaSenderTextMessage(
  to: string,
  message: string,
  retryCount = 0
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

  console.log(`[WaSender] Sending text message to ${formattedPhone}${retryCount > 0 ? ` (retry ${retryCount}/${MAX_RETRIES})` : ''}`);

  try {
    const payload = {
      to: formattedPhone,
      text: message
    };
    
    console.log(`[WaSender] Request payload: ${JSON.stringify(payload)}`);

    const response = await fetch('https://wasenderapi.com/api/send-message', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    console.log(`[WaSender] Response status: ${response.status}`);
    console.log(`[WaSender] Response body: ${JSON.stringify(responseData)}`);

    // Check for rate limiting and retry if needed
    if (isRateLimitError(response.status, responseData) && retryCount < MAX_RETRIES) {
      console.log(`[WaSender] Rate limited. Waiting ${DEFAULT_RETRY_DELAY_MS}ms before retry ${retryCount + 1}/${MAX_RETRIES}`);
      await sleep(DEFAULT_RETRY_DELAY_MS);
      return sendWaSenderTextMessage(to, message, retryCount + 1);
    }

    if (!response.ok || responseData.success === false) {
      console.error('[WaSender] API error:', responseData);
      return {
        success: false,
        error: responseData.message || responseData.error || `HTTP ${response.status}: ${response.statusText}`
      };
    }

    console.log(`[WaSender] Message sent successfully:`, responseData);
    
    // Extract message ID from response data structure
    const msgId = responseData.data?.msgId || responseData.msgId || responseData.messageId || responseData.id || 'sent';
    
    return {
      success: true,
      messageId: String(msgId)
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
 * Send an image message via WaSender API
 * Endpoint: POST https://wasenderapi.com/api/send-message
 * Payload: { to: "+966...", text: "caption", imageUrl: "https://..." }
 * 
 * Supported formats: JPEG, PNG. Max size: 5MB
 * Includes automatic retry logic for rate limiting (account protection)
 */
export async function sendWaSenderMediaMessage(
  to: string,
  mediaUrl: string,
  caption?: string,
  mediaType: 'image' | 'video' | 'document' = 'image',
  retryCount = 0
): Promise<WaSenderResponse> {
  const apiKey = Deno.env.get('WASENDER_API_KEY');

  if (!apiKey) {
    console.error('[WaSender Media] Missing API key');
    return {
      success: false,
      error: 'WaSender API key not configured'
    };
  }

  const formattedPhone = formatPhoneNumber(to);
  const startTime = Date.now();

  console.log(`[WaSender Media] === SENDING ${mediaType.toUpperCase()} ===`);
  console.log(`[WaSender Media] To: ${formattedPhone}`);
  console.log(`[WaSender Media] URL: ${mediaUrl}`);
  console.log(`[WaSender Media] Caption: ${caption ? caption.substring(0, 100) + '...' : '(none)'}`);

  // Validate URL accessibility before sending
  try {
    console.log(`[WaSender Media] Validating URL accessibility...`);
    const urlCheck = await fetch(mediaUrl, { method: 'HEAD' });
    const contentType = urlCheck.headers.get('content-type');
    const contentLength = urlCheck.headers.get('content-length');
    
    console.log(`[WaSender Media] URL Check Status: ${urlCheck.status} ${urlCheck.statusText}`);
    console.log(`[WaSender Media] Content-Type: ${contentType}`);
    console.log(`[WaSender Media] Content-Length: ${contentLength ? `${Math.round(parseInt(contentLength) / 1024)} KB` : 'unknown'}`);
    
    if (!urlCheck.ok) {
      console.error(`[WaSender Media] URL not accessible: HTTP ${urlCheck.status}`);
      return {
        success: false,
        error: `Media URL not accessible: HTTP ${urlCheck.status}`
      };
    }
  } catch (urlError) {
    const errorMsg = urlError instanceof Error ? urlError.message : 'Unknown error';
    console.warn(`[WaSender Media] URL validation failed: ${errorMsg}`);
    console.log(`[WaSender Media] Proceeding anyway - WaSender might still fetch it`);
  }

  try {
    // Build payload using the CORRECT WaSender format from docs
    // Image: { to, text (caption), imageUrl }
    interface MediaPayload {
      to: string;
      text?: string;
      imageUrl?: string;
      videoUrl?: string;
      documentUrl?: string;
    }

    const payload: MediaPayload = {
      to: formattedPhone,
    };

    // Add caption if provided
    if (caption) {
      payload.text = caption;
    }

    // Add media URL based on type
    switch (mediaType) {
      case 'image':
        payload.imageUrl = mediaUrl;
        break;
      case 'video':
        payload.videoUrl = mediaUrl;
        break;
      case 'document':
        payload.documentUrl = mediaUrl;
        break;
    }

    console.log(`[WaSender Media] Request payload: ${JSON.stringify(payload)}`);

    const response = await fetch('https://wasenderapi.com/api/send-message', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();
    const duration = Date.now() - startTime;

    console.log(`[WaSender Media] API Response Status: ${response.status} ${response.statusText}`);
    console.log(`[WaSender Media] API Response Body: ${JSON.stringify(responseData)}`);
    console.log(`[WaSender Media] Request Duration: ${duration}ms`);

    // Check for rate limiting and retry if needed
    if (isRateLimitError(response.status, responseData) && retryCount < MAX_RETRIES) {
      console.log(`[WaSender Media] Rate limited. Waiting ${DEFAULT_RETRY_DELAY_MS}ms before retry ${retryCount + 1}/${MAX_RETRIES}`);
      await sleep(DEFAULT_RETRY_DELAY_MS);
      return sendWaSenderMediaMessage(to, mediaUrl, caption, mediaType, retryCount + 1);
    }

    if (!response.ok || responseData.success === false) {
      console.error(`[WaSender Media] === FAILED (${duration}ms) ===`);
      console.error(`[WaSender Media] Error details: ${JSON.stringify(responseData)}`);
      return {
        success: false,
        error: responseData.message || responseData.error || `HTTP ${response.status}: ${response.statusText}`
      };
    }

    // Extract message ID from response data structure
    const msgId = responseData.data?.msgId || responseData.msgId || responseData.messageId || responseData.id || 'sent';
    console.log(`[WaSender Media] === SUCCESS (${duration}ms) ===`);
    console.log(`[WaSender Media] Message ID: ${msgId}`);
    
    return {
      success: true,
      messageId: String(msgId)
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[WaSender Media] === EXCEPTION (${duration}ms) ===`);
    console.error(`[WaSender Media] Error: ${errorMessage}`);
    return {
      success: false,
      error: errorMessage
    };
  }
}
