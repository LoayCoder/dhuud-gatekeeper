import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWhatsAppTemplate, TEMPLATE_SIDS } from "../_shared/twilio-whatsapp.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
      tenant_id,
      notification_type = 'visitor_welcome',
      visitor_name,
      destination_name,
      host_mobile,
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
    
    let recipientPhone: string;
    let templateSid: string;
    let variables: Record<string, string>;
    
    if (notification_type === 'host_notification' && host_mobile) {
      // Host notification when visitor arrives
      console.log(`[WhatsApp] Sending host notification to ${host_mobile}`);
      
      recipientPhone = host_mobile;
      // TODO: Add HOST_NOTIFICATION template SID when created
      templateSid = TEMPLATE_SIDS.VISITOR_WELCOME;
      variables = {
        "1": visitor_name || 'A visitor',
        "2": 'your location',
        "3": currentTime,
      };
      
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
      console.log(`[WhatsApp] Sending welcome to ${mobile_number}`);
      
      recipientPhone = mobile_number;
      templateSid = TEMPLATE_SIDS.VISITOR_WELCOME;
      // Template variables: {{1}}=company, {{2}}=destination, {{3}}=time
      variables = {
        "1": companyName,
        "2": destination_name || 'reception',
        "3": currentTime,
      };
    }
    
    // Send via Twilio WhatsApp Content Template API
    const twilioResult = await sendWhatsAppTemplate(recipientPhone, templateSid, variables);
    
    if (!twilioResult.success) {
      console.error(`[WhatsApp] Failed to send message: ${twilioResult.error}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: twilioResult.error,
          recipient: recipientPhone,
          notification_type 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const response = {
      success: true,
      message_sid: twilioResult.messageSid,
      recipient: recipientPhone,
      notification_type,
      template_sid: templateSid,
      sent_at: new Date().toISOString()
    };
    
    return new Response(
      JSON.stringify(response),
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
