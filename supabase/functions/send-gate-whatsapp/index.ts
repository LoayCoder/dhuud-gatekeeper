import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Multi-language welcome templates for visitors
const welcomeTemplates: Record<string, string> = {
  en: "Welcome to {company}! Please proceed to {destination}. Your entry has been logged at {time}.",
  ar: "أهلاً بك في {company}! يرجى التوجه إلى {destination}. تم تسجيل دخولك في {time}.",
  ur: "{company} میں خوش آمدید! براہ کرم {destination} کی طرف جائیں۔ آپ کا داخلہ {time} پر درج ہوگیا۔",
  hi: "{company} में आपका स्वागत है! कृपया {destination} की ओर बढ़ें। आपकी एंट्री {time} पर लॉग की गई है।",
  fil: "Maligayang pagdating sa {company}! Mangyaring magpatuloy sa {destination}. Naitala ang iyong pagpasok noong {time}."
};

// Multi-language host notification templates
const hostNotificationTemplates: Record<string, string> = {
  en: "🔔 Visitor Alert: {visitor_name} has arrived at the gate and is heading to your location. Entry logged at {time}.",
  ar: "🔔 تنبيه زائر: وصل {visitor_name} إلى البوابة ويتجه إلى موقعك. تم تسجيل الدخول في {time}.",
  ur: "🔔 مہمان کی اطلاع: {visitor_name} گیٹ پر پہنچ گئے ہیں اور آپ کے مقام کی طرف آ رہے ہیں۔ اندراج {time} پر ہوا۔",
  hi: "🔔 विज़िटर अलर्ट: {visitor_name} गेट पर पहुंच गए हैं और आपके स्थान की ओर आ रहे हैं। एंट्री {time} पर लॉग की गई।",
  fil: "🔔 Visitor Alert: Dumating na si {visitor_name} sa gate at papunta sa iyong lokasyon. Naitala ang pagpasok noong {time}."
};

interface WhatsAppRequest {
  // Common fields
  mobile_number: string;
  language?: string;
  tenant_id: string;
  
  // Notification type
  notification_type?: 'visitor_welcome' | 'host_notification';
  
  // For visitor welcome
  visitor_name?: string;
  destination_name?: string;
  
  // For host notification
  host_mobile?: string;
  host_name?: string;
  entry_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: WhatsAppRequest = await req.json();
    const { 
      mobile_number,
      language = 'en',
      tenant_id,
      notification_type = 'visitor_welcome',
      visitor_name,
      destination_name,
      host_mobile,
      host_name,
      entry_id,
    } = requestData;
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get tenant info for company name
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenant_id)
      .single();
    
    const companyName = tenant?.name || 'Our Facility';
    const currentTime = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    let message: string;
    let recipientPhone: string;
    
    if (notification_type === 'host_notification' && host_mobile) {
      // Host notification when visitor arrives
      console.log(`[WhatsApp] Sending host notification to ${host_mobile}`);
      
      const template = hostNotificationTemplates[language] || hostNotificationTemplates.en;
      message = template
        .replace('{visitor_name}', visitor_name || 'A visitor')
        .replace('{time}', currentTime);
      
      recipientPhone = host_mobile;
      
      // Update entry log with notification status
      if (entry_id) {
        await supabase
          .from('gate_entry_logs')
          .update({
            host_notified_at: new Date().toISOString(),
            notification_status: 'sent',
          })
          .eq('id', entry_id);
      }
    } else {
      // Visitor welcome message
      console.log(`[WhatsApp] Sending welcome to ${mobile_number} in ${language}`);
      
      const template = welcomeTemplates[language] || welcomeTemplates.en;
      message = template
        .replace('{company}', companyName)
        .replace('{destination}', destination_name || 'reception')
        .replace('{time}', currentTime);
      
      recipientPhone = mobile_number;
    }
    
    // TODO: Replace with actual WhatsApp Business API integration
    // const whatsappApiUrl = Deno.env.get('WHATSAPP_API_URL');
    // const whatsappToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    
    console.log(`[MOCK] WhatsApp message to ${recipientPhone}: ${message}`);
    
    // Mock WhatsApp API response
    const mockResponse = {
      success: true,
      message_id: `mock_${Date.now()}`,
      recipient: recipientPhone,
      notification_type,
      message_preview: message.substring(0, 50) + '...',
      sent_at: new Date().toISOString()
    };
    
    return new Response(
      JSON.stringify(mockResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('WhatsApp send error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
