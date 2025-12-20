import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWhatsAppTemplate, TEMPLATE_SIDS } from "../_shared/twilio-whatsapp.ts";
import { logNotificationSent } from "../_shared/notification-logger.ts";

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
  
  // For visitor welcome (enhanced with 7 variables)
  visitor_name?: string;
  destination_name?: string;
  visit_duration_hours?: number;
  notes?: string;
  entry_id?: string;
  
  // For host notification
  host_mobile?: string;
  host_name?: string;
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
      visit_duration_hours = 1,
      notes,
      entry_id,
      host_mobile,
    } = requestData;
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get tenant info with HSSE settings and emergency contact
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, visitor_hsse_instructions_ar, visitor_hsse_instructions_en, emergency_contact_number, emergency_contact_name')
      .eq('id', tenant_id)
      .single();
    
    const companyName = tenant?.name || 'Our Facility';
    const currentTime = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    // Format visit duration
    const durationText = visit_duration_hours >= 8 
      ? 'Full day' 
      : `${visit_duration_hours} hour${visit_duration_hours > 1 ? 's' : ''}`;
    
    // Get HSSE instructions (Arabic by default, fallback to English)
    const hsseInstructions = tenant?.visitor_hsse_instructions_ar 
      || tenant?.visitor_hsse_instructions_en 
      || 'اتبع تعليمات السلامة | Follow safety guidelines';
    
    // Get emergency contact
    const emergencyContact = tenant?.emergency_contact_number || '911';
    
    // Security notes (from guard input)
    const securityNotes = notes || 'لا توجد ملاحظات | None';
    
    let recipientPhone: string;
    let templateSid: string;
    let variables: Record<string, string>;
    
    if (notification_type === 'host_notification' && host_mobile) {
      // Host notification when visitor arrives
      console.log(`[WhatsApp] Sending host notification to ${host_mobile}`);
      
      recipientPhone = host_mobile;
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
      // Visitor welcome message with 7 variables
      console.log(`[WhatsApp] Sending enhanced welcome to ${mobile_number}`);
      console.log(`[WhatsApp] Variables: visitor=${visitor_name}, company=${companyName}, destination=${destination_name}, duration=${durationText}, hsse=${hsseInstructions?.substring(0, 50)}..., emergency=${emergencyContact}, notes=${securityNotes?.substring(0, 30)}...`);
      
      recipientPhone = mobile_number;
      templateSid = TEMPLATE_SIDS.VISITOR_WELCOME_V2;
      
      // Template variables: {{1}}=Visitor Name, {{2}}=Company, {{3}}=Destination, 
      // {{4}}=Duration, {{5}}=HSSE, {{6}}=Emergency, {{7}}=Notes
      variables = {
        "1": visitor_name || 'Guest',
        "2": companyName,
        "3": destination_name || 'Reception',
        "4": durationText,
        "5": hsseInstructions,
        "6": emergencyContact,
        "7": securityNotes,
      };
      
      // Update entry log with visit duration if entry_id provided
      if (entry_id) {
        await supabase
          .from('gate_entry_logs')
          .update({
            visit_duration_hours: visit_duration_hours,
            notification_status: 'sent',
          })
          .eq('id', entry_id);
      }
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
    
    // Log to notification_logs for delivery tracking
    if (twilioResult.messageSid) {
      await logNotificationSent({
        tenant_id,
        channel: 'whatsapp',
        provider: 'twilio',
        provider_message_id: twilioResult.messageSid,
        to_address: recipientPhone,
        template_name: templateSid,
        status: 'pending',
        related_entity_type: entry_id ? 'gate_entry' : undefined,
        related_entity_id: entry_id || undefined,
        metadata: {
          notification_type,
          visitor_name,
          destination_name,
          visit_duration_hours,
          has_hsse_instructions: !!tenant?.visitor_hsse_instructions_ar || !!tenant?.visitor_hsse_instructions_en,
          has_emergency_contact: !!tenant?.emergency_contact_number,
        }
      });
    }
    
    const response = {
      success: true,
      message_sid: twilioResult.messageSid,
      recipient: recipientPhone,
      notification_type,
      template_sid: templateSid,
      variables_sent: Object.keys(variables).length,
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
