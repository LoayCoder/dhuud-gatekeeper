import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWhatsAppText, isProviderConfigured } from "../_shared/whatsapp-provider.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      guard_id, 
      tenant_id, 
      zone_name,
      reason,
    } = await req.json();
    
    console.log(`[GPS Off Alert] Guard ${guard_id} disabled GPS. Reason: ${reason}`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const now = new Date();
    
    // Get guard details
    const { data: guard } = await supabase
      .from('profiles')
      .select('full_name, employee_id')
      .eq('id', guard_id)
      .single();
    
    const guardName = guard?.full_name || guard?.employee_id || 'Unknown Guard';
    
    // DEDUPLICATION: Check if we already have an unresolved gps_disabled alert for this guard
    // within the last 30 minutes to prevent duplicate alerts
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    const { data: existingAlert } = await supabase
      .from('geofence_alerts')
      .select('id')
      .eq('guard_id', guard_id)
      .eq('alert_type', 'gps_disabled')
      .is('resolved_at', null)
      .gte('created_at', thirtyMinutesAgo)
      .limit(1);
    
    if (existingAlert && existingAlert.length > 0) {
      console.log(`[GPS Off Alert] Alert already exists for guard ${guard_id}: ${existingAlert[0].id}`);
      return new Response(
        JSON.stringify({
          success: true,
          alert_created: false,
          existing_alert_id: existingAlert[0].id,
          reason: 'Unresolved alert already exists',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get supervisor(s) for this tenant who should receive alerts
    // Look for users with security_supervisor or security_manager role
    const { data: supervisors } = await supabase
      .from('profiles')
      .select('id, full_name, mobile, phone')
      .eq('tenant_id', tenant_id)
      .in('role', ['security_supervisor', 'security_manager', 'admin'])
      .is('deleted_at', null)
      .limit(5);
    
    console.log(`[GPS Off Alert] Found ${supervisors?.length || 0} supervisors to notify`);
    
    // Create geofence alert record (status is derived from acknowledged_at and resolved_at timestamps)
    const { data: alertData, error: alertError } = await supabase
      .from('geofence_alerts')
      .insert({
        guard_id,
        tenant_id,
        alert_type: 'gps_disabled',
        severity: 'critical',
        alert_message: `Guard ${guardName} has disabled GPS during active shift. Zone: ${zone_name || 'Unknown'}`,
      })
      .select('id')
      .single();
    
    if (alertError) {
      console.error('[GPS Off Alert] Failed to create alert record:', alertError);
    } else {
      console.log(`[GPS Off Alert] Created alert ${alertData?.id} for guard ${guard_id}`);
    }
    
    // Check WhatsApp provider
    const providerStatus = isProviderConfigured();
    console.log(`[GPS Off Alert] WhatsApp provider: ${providerStatus.provider}, configured: ${providerStatus.configured}`);
    
    if (!providerStatus.configured) {
      console.warn(`[GPS Off Alert] WhatsApp not configured. Missing: ${providerStatus.missing.join(', ')}`);
      return new Response(
        JSON.stringify({
          success: true,
          alert_created: true,
          whatsapp_sent: false,
          reason: 'WhatsApp not configured',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Send WhatsApp to each supervisor
    let sentCount = 0;
    const timestamp = now.toLocaleString('en-GB', { 
      timeZone: 'Asia/Riyadh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    
    for (const supervisor of supervisors || []) {
      const phone = supervisor.mobile || supervisor.phone;
      if (!phone) {
        console.log(`[GPS Off Alert] No phone for supervisor ${supervisor.id}`);
        continue;
      }
      
      const message = `⚠️ *تحذير GPS | GPS Alert*

الحارس *${guardName}* قام بإيقاف GPS أثناء المناوبة
Guard *${guardName}* has disabled GPS during shift

📍 *المنطقة | Zone:* ${zone_name || 'غير محدد | Unknown'}
⏰ *الوقت | Time:* ${timestamp}
❌ *السبب | Reason:* ${reason || 'GPS disabled'}

يرجى التحقق فوراً!
Please verify immediately!`;

      try {
        const result = await sendWhatsAppText(phone, message);
        if (result.success) {
          console.log(`[GPS Off Alert] WhatsApp sent to ${supervisor.full_name || supervisor.id}`);
          sentCount++;
        } else {
          console.error(`[GPS Off Alert] Failed to send to ${phone}: ${result.error}`);
        }
      } catch (err) {
        console.error(`[GPS Off Alert] Error sending to ${phone}:`, err);
      }
    }
    
    console.log(`[GPS Off Alert] Completed. Sent ${sentCount}/${supervisors?.length || 0} WhatsApp messages`);
    
    return new Response(
      JSON.stringify({
        success: true,
        alert_created: true,
        whatsapp_sent: sentCount > 0,
        supervisors_notified: sentCount,
        total_supervisors: supervisors?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[GPS Off Alert] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});