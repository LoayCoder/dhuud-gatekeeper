import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWhatsAppTemplateMessage, sendWhatsAppText, getActiveProvider } from "../_shared/whatsapp-provider.ts";
import { TEMPLATE_SIDS } from "../_shared/twilio-whatsapp.ts";
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
  notification_type?: 'visitor_welcome' | 'host_notification' | 'visitor_badge_link' | 'host_arrival';
  
  // For visitor welcome (enhanced with 7 variables)
  visitor_name?: string;
  destination_name?: string;
  visit_duration_hours?: number;
  notes?: string;
  entry_id?: string;
  
  // For visitor badge link
  badge_url?: string;
  
  // For host notification
  host_mobile?: string;
  host_name?: string;
  
  // For host arrival notification
  visit_reference?: string;
  entry_time?: string;
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
      badge_url,
      visit_reference,
      entry_time,
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
    
    if (notification_type === 'host_arrival') {
      // Host arrival notification when visitor enters gate
      console.log(`[WhatsApp] Sending host arrival notification to ${mobile_number}`);
      
      // Check if already notified (prevent duplicates)
      if (entry_id) {
        const { data: existingEntry } = await supabase
          .from('gate_entry_logs')
          .select('host_arrival_notified_at')
          .eq('id', entry_id)
          .single();
        
        if (existingEntry?.host_arrival_notified_at) {
          console.log(`[WhatsApp] Host already notified for entry ${entry_id}, skipping`);
          return new Response(
            JSON.stringify({ 
              success: true, 
              already_notified: true,
              notified_at: existingEntry.host_arrival_notified_at 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      
      // Format entry time for display
      const formattedTime = entry_time 
        ? new Date(entry_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      
      // Bilingual message for host arrival
      const hostArrivalMessage = `📢 وصول زائر | Visitor Arrival

لقد وصل زائرك إلى البوابة وفي الطريق إليك.
Your visitor has arrived at the gate and is on the way.

👤 الزائر | Visitor: ${visitor_name || 'Unknown'}
🎫 رقم الزيارة | Reference: ${visit_reference || 'N/A'}
⏰ وقت الدخول | Entry Time: ${formattedTime}

أنت مسؤول عن سلامة وصحة الزائر خلال الزيارة.
You are fully responsible for the visitor's safety and health during the visit.

للتواصل مع الزائر، يرجى الاتصال مباشرة.
To contact the visitor, please call directly.`;
      
      const result = await sendWhatsAppText(mobile_number, hostArrivalMessage);
      
      // Update entry log with notification timestamp for audit
      if (entry_id && result.success) {
        await supabase
          .from('gate_entry_logs')
          .update({
            host_arrival_notified_at: new Date().toISOString(),
            notification_status: 'host_arrival_sent',
          })
          .eq('id', entry_id);
        
        console.log(`[WhatsApp] Updated entry ${entry_id} with host_arrival_notified_at`);
      }
      
      // Log notification for audit
      if (result.messageId) {
        await logNotificationSent({
          tenant_id,
          channel: 'whatsapp',
          provider: result.provider,
          provider_message_id: result.messageId,
          to_address: mobile_number,
          template_name: 'host_arrival_notification',
          status: 'pending',
          related_entity_type: 'gate_entry',
          related_entity_id: entry_id || undefined,
          metadata: {
            notification_type: 'host_arrival',
            visitor_name,
            visit_reference,
            entry_time: formattedTime,
          }
        });
      }
      
      return new Response(
        JSON.stringify({ 
          success: result.success, 
          message_id: result.messageId, 
          provider: result.provider,
          notification_type: 'host_arrival',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (notification_type === 'visitor_badge_link') {
      // Visitor badge link notification after approval
      console.log(`[WhatsApp] Sending badge link to visitor ${mobile_number}`);
      
      recipientPhone = mobile_number;
      templateSid = TEMPLATE_SIDS.VISITOR_WELCOME;
      
      const fallbackBadgeMessage = `🎫 بطاقة الزائر جاهزة | Your Visitor Badge is Ready

👤 ${visitor_name}
📍 ${destination_name || 'الاستقبال | Reception'}

🔗 اطلع على بطاقتك | View your badge:
${badge_url}

يرجى إظهار رمز QR عند البوابة
Please show the QR code at the gate`;
      
      variables = {
        "1": visitor_name || 'Guest',
        "2": destination_name || 'Reception',
        "3": badge_url || '',
      };
      
      // Use text message for badge link (template may not support URL)
      const result = await sendWhatsAppText(recipientPhone, fallbackBadgeMessage);
      
      return new Response(
        JSON.stringify({ success: result.success, message_id: result.messageId, provider: result.provider }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (notification_type === 'host_notification' && host_mobile) {
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
      // Visitor welcome message with 8 variables (including QR verification link)
      
      // Get qr_code_token for the entry
      let qrCodeToken = '';
      if (entry_id) {
        const { data: entryData } = await supabase
          .from('gate_entry_logs')
          .select('qr_code_token')
          .eq('id', entry_id)
          .single();
        qrCodeToken = entryData?.qr_code_token || '';
      }
      
      // Generate verification URL
      const appUrl = Deno.env.get('APP_URL') || Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || 'https://app.example.com';
      const verificationUrl = qrCodeToken ? `${appUrl}/visitor-pass/${qrCodeToken}` : '';
      
      console.log(`[WhatsApp] Sending enhanced welcome to ${mobile_number}`);
      console.log(`[WhatsApp] Variables: visitor=${visitor_name}, company=${companyName}, destination=${destination_name}, duration=${durationText}, hsse=${hsseInstructions?.substring(0, 50)}..., emergency=${emergencyContact}, notes=${securityNotes?.substring(0, 30)}..., url=${verificationUrl}`);
      
      recipientPhone = mobile_number;
      templateSid = TEMPLATE_SIDS.VISITOR_WELCOME_V2;
      
      // Template variables: {{1}}=Visitor Name, {{2}}=Company, {{3}}=Destination, 
      // {{4}}=Duration, {{5}}=HSSE, {{6}}=Emergency, {{7}}=Notes, {{8}}=Verification URL
      variables = {
        "1": visitor_name || 'Guest',
        "2": companyName,
        "3": destination_name || 'Reception',
        "4": durationText,
        "5": hsseInstructions,
        "6": emergencyContact,
        "7": securityNotes,
        "8": verificationUrl || 'N/A',
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
    
    // Generate fallback message for WaSender (which doesn't support Twilio templates)
    const fallbackMessage = notification_type === 'host_notification'
      ? `📢 Visitor Alert\n\n${variables["1"]} has arrived at ${variables["2"]} at ${variables["3"]}.`
      : `🏢 Welcome to ${variables["2"]}!\n\n👤 ${variables["1"]}\n📍 Destination: ${variables["3"]}\n⏱️ Duration: ${variables["4"]}\n\n⚠️ Safety: ${variables["5"]}\n📞 Emergency: ${variables["6"]}\n📝 Notes: ${variables["7"]}\n\n🔗 Pass: ${variables["8"]}`;
    
    // Send via active WhatsApp provider
    const activeProvider = getActiveProvider();
    console.log(`[WhatsApp] Using provider: ${activeProvider}`);
    
    const result = await sendWhatsAppTemplateMessage(recipientPhone, templateSid, variables, fallbackMessage);
    
    if (!result.success) {
      console.error(`[WhatsApp] Failed to send message: ${result.error}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.error,
          recipient: recipientPhone,
          notification_type,
          provider: result.provider
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Log to notification_logs for delivery tracking
    if (result.messageId) {
      await logNotificationSent({
        tenant_id,
        channel: 'whatsapp',
        provider: result.provider,
        provider_message_id: result.messageId,
        to_address: recipientPhone,
        template_name: result.provider === 'twilio' ? templateSid : 'text_message',
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
          provider: result.provider,
        }
      });
    }
    
    const response = {
      success: true,
      message_id: result.messageId,
      provider: result.provider,
      recipient: recipientPhone,
      notification_type,
      template_sid: result.provider === 'twilio' ? templateSid : null,
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
