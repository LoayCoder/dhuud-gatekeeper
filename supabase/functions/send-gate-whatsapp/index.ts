import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Multi-language welcome templates
const welcomeTemplates: Record<string, string> = {
  en: "Welcome to {company}! Please proceed to {destination}. Your entry has been logged at {time}.",
  ar: "أهلاً بك في {company}! يرجى التوجه إلى {destination}. تم تسجيل دخولك في {time}.",
  ur: "{company} میں خوش آمدید! براہ کرم {destination} کی طرف جائیں۔ آپ کا داخلہ {time} پر درج ہوگیا۔",
  hi: "{company} में आपका स्वागत है! कृपया {destination} की ओर बढ़ें। आपकी एंट्री {time} पर लॉग की गई है।",
  fil: "Maligayang pagdating sa {company}! Mangyaring magpatuloy sa {destination}. Naitala ang iyong pagpasok noong {time}."
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      mobile_number, 
      visitor_name, 
      destination_name, 
      language = 'en',
      tenant_id 
    } = await req.json();
    
    console.log(`Sending WhatsApp welcome to ${mobile_number} in ${language}`);
    
    // Get tenant info for company name
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenant_id)
      .single();
    
    const companyName = tenant?.name || 'Our Facility';
    const template = welcomeTemplates[language] || welcomeTemplates.en;
    const currentTime = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const message = template
      .replace('{company}', companyName)
      .replace('{destination}', destination_name)
      .replace('{time}', currentTime);
    
    // TODO: Replace with actual WhatsApp Business API integration
    // const whatsappApiUrl = Deno.env.get('WHATSAPP_API_URL');
    // const whatsappToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    
    console.log(`[MOCK] WhatsApp message to ${mobile_number}: ${message}`);
    
    // Mock WhatsApp API response
    const mockResponse = {
      success: true,
      message_id: `mock_${Date.now()}`,
      recipient: mobile_number,
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
