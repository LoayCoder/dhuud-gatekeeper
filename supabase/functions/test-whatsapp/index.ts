import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone_number, message } = await req.json();

    if (!phone_number) {
      throw new Error('Phone number is required');
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Twilio credentials not configured');
    }

    console.log('Sending test WhatsApp message to:', phone_number);
    console.log('Using Twilio Account SID:', accountSid.substring(0, 10) + '...');
    console.log('From WhatsApp Number:', fromNumber);

    // Format phone number for WhatsApp
    let formattedPhone = phone_number.replace(/\s+/g, '').replace(/-/g, '');
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }
    
    const toWhatsApp = `whatsapp:${formattedPhone}`;
    const fromWhatsApp = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`;

    const testMessage = message || `🧪 Test Message from HSSA Platform\n\nThis is a test WhatsApp message sent at ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' })} (Riyadh Time).\n\nIf you received this message, your WhatsApp API is working correctly! ✅`;

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append('To', toWhatsApp);
    formData.append('From', fromWhatsApp);
    formData.append('Body', testMessage);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Twilio API error:', result);
      throw new Error(result.message || 'Failed to send WhatsApp message');
    }

    console.log('WhatsApp message sent successfully:', result.sid);

    return new Response(
      JSON.stringify({
        success: true,
        message_sid: result.sid,
        status: result.status,
        to: toWhatsApp,
        from: fromWhatsApp,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error sending test WhatsApp:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
