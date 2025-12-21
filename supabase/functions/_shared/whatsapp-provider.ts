/**
 * WhatsApp Provider Abstraction
 * Allows switching between WaSender and Twilio providers
 * 
 * Set WHATSAPP_PROVIDER env var to 'wasender' or 'twilio' (default: wasender if WASENDER_API_KEY exists)
 */

import { sendWhatsAppMessage as sendTwilioMessage, sendWhatsAppTemplate as sendTwilioTemplate, TwilioResponse } from "./twilio-whatsapp.ts";
import { sendWaSenderTextMessage, WaSenderResponse } from "./wasender-whatsapp.ts";

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
