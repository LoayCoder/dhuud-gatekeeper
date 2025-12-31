/**
 * WhatsApp Provider Abstraction
 * Allows switching between WaSender and Twilio providers
 * 
 * Set WHATSAPP_PROVIDER env var to 'wasender' or 'twilio' (default: wasender if WASENDER_API_KEY exists)
 */

import { sendWhatsAppMessage as sendTwilioMessage, sendWhatsAppTemplate as sendTwilioTemplate, TwilioResponse } from "./twilio-whatsapp.ts";
import { sendWaSenderTextMessage, sendWaSenderMediaMessage, WaSenderResponse } from "./wasender-whatsapp.ts";

export interface WhatsAppProviderResponse {
  success: boolean;
  messageId?: string;
  provider: 'wasender' | 'twilio';
  error?: string;
}

/**
 * Detect which provider to use based on environment variables
 */
export function getActiveProvider(): 'wasender' | 'twilio' {
  const configuredProvider = Deno.env.get('WHATSAPP_PROVIDER')?.toLowerCase();
  
  if (configuredProvider === 'twilio') {
    return 'twilio';
  }
  
  if (configuredProvider === 'wasender') {
    return 'wasender';
  }
  
  // Auto-detect: prefer WaSender if API key exists, else fall back to Twilio
  if (Deno.env.get('WASENDER_API_KEY')) {
    return 'wasender';
  }
  
  return 'twilio';
}

/**
 * Send a text message via the active WhatsApp provider
 */
export async function sendWhatsAppText(
  to: string,
  message: string
): Promise<WhatsAppProviderResponse> {
  const provider = getActiveProvider();
  console.log(`[WhatsApp Provider] Using ${provider} to send message to ${to}`);
  
  if (provider === 'wasender') {
    const result: WaSenderResponse = await sendWaSenderTextMessage(to, message);
    return {
      success: result.success,
      messageId: result.messageId,
      provider: 'wasender',
      error: result.error
    };
  } else {
    const result: TwilioResponse = await sendTwilioMessage(to, message);
    return {
      success: result.success,
      messageId: result.messageSid,
      provider: 'twilio',
      error: result.error
    };
  }
}

/**
 * Send a template message (only supported by Twilio)
 * Falls back to plain text for WaSender
 */
export async function sendWhatsAppTemplateMessage(
  to: string,
  templateSid: string,
  variables: Record<string, string>,
  fallbackMessage?: string
): Promise<WhatsAppProviderResponse> {
  const provider = getActiveProvider();
  console.log(`[WhatsApp Provider] Using ${provider} to send template to ${to}`);
  
  if (provider === 'wasender') {
    // WaSender doesn't support Twilio templates, use fallback message
    if (!fallbackMessage) {
      // Generate a basic message from variables if no fallback provided
      fallbackMessage = Object.values(variables).join(' - ');
    }
    
    console.log(`[WhatsApp Provider] WaSender: Using fallback text message instead of template`);
    const result: WaSenderResponse = await sendWaSenderTextMessage(to, fallbackMessage);
    return {
      success: result.success,
      messageId: result.messageId,
      provider: 'wasender',
      error: result.error
    };
  } else {
    const result: TwilioResponse = await sendTwilioTemplate(to, templateSid, variables);
    return {
      success: result.success,
      messageId: result.messageSid,
      provider: 'twilio',
      error: result.error
    };
  }
}

/**
 * Send a text message with optional media attachments via the active WhatsApp provider
 * Sends text first, then each media file as a separate message
 */
export async function sendWhatsAppWithMedia(
  to: string,
  message: string,
  mediaUrls?: string[]
): Promise<WhatsAppProviderResponse> {
  const provider = getActiveProvider();
  const totalStartTime = Date.now();
  
  console.log(`[WhatsApp Media] ========================================`);
  console.log(`[WhatsApp Media] === START MEDIA DELIVERY ===`);
  console.log(`[WhatsApp Media] Provider: ${provider}`);
  console.log(`[WhatsApp Media] Recipient: ${to}`);
  console.log(`[WhatsApp Media] Text Length: ${message.length} chars`);
  console.log(`[WhatsApp Media] Media Count: ${mediaUrls?.length || 0}`);
  
  // Log each media URL for debugging
  if (mediaUrls && mediaUrls.length > 0) {
    mediaUrls.forEach((url, i) => {
      console.log(`[WhatsApp Media] Photo ${i + 1}/${mediaUrls.length}: ${url.substring(0, 80)}...`);
    });
  }
  
  // First send the text message
  console.log(`[WhatsApp Media] Step 1: Sending text message...`);
  const textStartTime = Date.now();
  const textResult = await sendWhatsAppText(to, message);
  const textDuration = Date.now() - textStartTime;
  
  console.log(`[WhatsApp Media] Text result: ${textResult.success ? 'SUCCESS' : 'FAILED'} (${textDuration}ms)`);
  
  if (!textResult.success) {
    console.error(`[WhatsApp Media] Text failed, aborting media delivery`);
    console.log(`[WhatsApp Media] === END (ABORTED) ===`);
    return textResult;
  }
  
  // If no media, we're done
  if (!mediaUrls || mediaUrls.length === 0) {
    console.log(`[WhatsApp Media] No media to send, done.`);
    console.log(`[WhatsApp Media] === END (TEXT ONLY) ===`);
    return textResult;
  }
  
  // Send each media file as a separate message
  console.log(`[WhatsApp Media] Step 2: Sending ${mediaUrls.length} photos...`);
  let mediaErrors: string[] = [];
  let successCount = 0;
  
  if (provider === 'wasender') {
    for (let i = 0; i < mediaUrls.length; i++) {
      const mediaUrl = mediaUrls[i];
      const photoStartTime = Date.now();
      
      console.log(`[WhatsApp Media] --- Photo ${i + 1}/${mediaUrls.length} ---`);
      
      const mediaResult = await sendWaSenderMediaMessage(to, mediaUrl, '', 'image');
      const photoDuration = Date.now() - photoStartTime;
      
      if (mediaResult.success) {
        successCount++;
        console.log(`[WhatsApp Media] Photo ${i + 1}: SUCCESS (${photoDuration}ms) - ID: ${mediaResult.messageId}`);
      } else {
        console.error(`[WhatsApp Media] Photo ${i + 1}: FAILED (${photoDuration}ms) - ${mediaResult.error}`);
        mediaErrors.push(`Photo ${i + 1}: ${mediaResult.error || 'Unknown error'}`);
      }
      
      // Small delay between media messages to avoid rate limiting
      if (i < mediaUrls.length - 1) {
        console.log(`[WhatsApp Media] Waiting 500ms before next photo...`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  } else {
    // Twilio doesn't have a direct media message via our current implementation
    console.warn(`[WhatsApp Media] Twilio media attachments not implemented, skipping ${mediaUrls.length} photos`);
  }
  
  const totalDuration = Date.now() - totalStartTime;
  
  // Summary logging
  console.log(`[WhatsApp Media] ========================================`);
  console.log(`[WhatsApp Media] === DELIVERY SUMMARY ===`);
  console.log(`[WhatsApp Media] Total Duration: ${totalDuration}ms`);
  console.log(`[WhatsApp Media] Text: SENT`);
  console.log(`[WhatsApp Media] Photos: ${successCount}/${mediaUrls.length} sent successfully`);
  if (mediaErrors.length > 0) {
    console.log(`[WhatsApp Media] Errors: ${mediaErrors.join('; ')}`);
  }
  console.log(`[WhatsApp Media] === END ===`);
  console.log(`[WhatsApp Media] ========================================`);
  
  // Return success even if some media failed (text was sent)
  return {
    success: true,
    messageId: textResult.messageId,
    provider,
    error: mediaErrors.length > 0 ? `Text sent, but ${mediaErrors.length}/${mediaUrls.length} media failed: ${mediaErrors.join('; ')}` : undefined
  };
}

/**
 * Check if the active provider is configured correctly
 */
export function isProviderConfigured(): { configured: boolean; provider: 'wasender' | 'twilio'; missing: string[] } {
  const provider = getActiveProvider();
  const missing: string[] = [];
  
  if (provider === 'wasender') {
    if (!Deno.env.get('WASENDER_API_KEY')) {
      missing.push('WASENDER_API_KEY');
    }
  } else {
    if (!Deno.env.get('TWILIO_ACCOUNT_SID')) missing.push('TWILIO_ACCOUNT_SID');
    if (!Deno.env.get('TWILIO_AUTH_TOKEN')) missing.push('TWILIO_AUTH_TOKEN');
    if (!Deno.env.get('TWILIO_WHATSAPP_NUMBER')) missing.push('TWILIO_WHATSAPP_NUMBER');
  }
  
  return {
    configured: missing.length === 0,
    provider,
    missing
  };
}
