import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmergencyRequest {
  token: string;
  alert_type: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  photo_path?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: EmergencyRequest = await req.json();
    const { token, alert_type, latitude, longitude, notes, photo_path } = requestData;

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate token format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      console.error(`[Emergency] Invalid token format: ${token.substring(0, 8)}...`);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[Emergency] Processing alert for token: ${token.substring(0, 8)}...`);

    // Step 1: Find visitor by their qr_code_token (token is on visitors table, not visit_requests)
    const { data: visitor, error: visitorError } = await supabase
      .from('visitors')
      .select('id, full_name, phone, host_name, tenant_id, qr_code_token')
      .eq('qr_code_token', token)
      .is('deleted_at', null)
      .eq('is_active', true)
      .maybeSingle();

    if (visitorError) {
      console.error(`[Emergency] Database error finding visitor:`, visitorError);
      throw visitorError;
    }

    if (!visitor) {
      console.error(`[Emergency] Visitor not found for token: ${token.substring(0, 8)}...`);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired visitor token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Emergency] Found visitor: ${visitor.full_name} (${visitor.id})`);

    // Step 2: Get the latest approved visit request for this visitor (for host contact info)
    const { data: visitRequest, error: visitError } = await supabase
      .from('visit_requests')
      .select('id, host_id, host_name, host_phone, destination_name, site_id')
      .eq('visitor_id', visitor.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (visitError) {
      console.error(`[Emergency] Error fetching visit request:`, visitError);
      // Continue even without visit request - visitor can still trigger emergency
    }

    const tenantId = visitor.tenant_id;

    console.log(`[Emergency] Creating alert for visitor: ${visitor.full_name}`);

    // Create emergency alert
    const { data: alert, error: alertError } = await supabase
      .from('emergency_alerts')
      .insert({
        tenant_id: tenantId,
        alert_type: alert_type || 'panic',
        status: 'pending',
        latitude,
        longitude,
        description: notes || `Visitor emergency alert from ${visitor.full_name}`,
        source_type: 'visitor',
        source_id: visitor.id,
        source_name: visitor.full_name,
        photo_evidence_path: photo_path,
      })
      .select('id')
      .single();

    if (alertError) {
      console.error(`[Emergency] Failed to create alert:`, alertError);
      throw alertError;
    }

    console.log(`[Emergency] Alert created: ${alert.id}`);

    // Get tenant emergency contact
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, emergency_contact_number, emergency_contact_name')
      .eq('id', tenantId)
      .single();

    // Send WhatsApp notification to host (if we have visit request with host phone)
    const hostPhone = visitRequest?.host_phone;
    if (hostPhone) {
      try {
        const hostMessage = `🚨 تنبيه طوارئ | Emergency Alert

زائرك يحتاج مساعدة فورية!
Your visitor needs immediate assistance!

👤 الزائر | Visitor: ${visitor.full_name}
📍 ${visitRequest?.destination_name || 'الموقع غير محدد | Location unknown'}
${latitude && longitude ? `🗺️ GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}` : ''}
${notes ? `📝 ملاحظات | Notes: ${notes}` : ''}

⚡ يرجى الاستجابة فوراً أو الاتصال بالأمن
Please respond immediately or contact security.`;

        await supabase.functions.invoke('send-gate-whatsapp', {
          body: {
            mobile_number: hostPhone,
            tenant_id: tenantId,
            notification_type: 'host_notification',
            visitor_name: visitor.full_name,
          }
        });
        
        console.log(`[Emergency] Host notified: ${hostPhone}`);
      } catch (whatsappError) {
        console.error(`[Emergency] Failed to notify host:`, whatsappError);
        // Continue even if WhatsApp fails
      }
    } else {
      console.log(`[Emergency] No host phone available for notification`);
    }

    // Dispatch emergency notification to security team
    try {
      await supabase.functions.invoke('dispatch-emergency-alert', {
        body: {
          alert_id: alert.id,
          tenant_id: tenantId,
          alert_type: alert_type || 'panic',
          source_type: 'visitor',
          source_name: visitor.full_name,
          latitude,
          longitude,
          notes,
        }
      });
      console.log(`[Emergency] Security team notified`);
    } catch (dispatchError) {
      console.error(`[Emergency] Failed to dispatch to security:`, dispatchError);
      // Continue even if dispatch fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        alert_id: alert.id,
        emergency_contact: tenant?.emergency_contact_number,
        emergency_contact_name: tenant?.emergency_contact_name,
        message: 'Emergency alert sent successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Emergency] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
