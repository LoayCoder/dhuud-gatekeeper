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

    // Find the visitor by QR token
    const { data: visitRequest, error: visitError } = await supabase
      .from('visit_requests')
      .select(`
        id,
        visitor_id,
        host_id,
        host_name,
        host_phone,
        destination_name,
        tenant_id,
        visitors!inner(id, full_name, phone)
      `)
      .eq('qr_code_token', token)
      .is('deleted_at', null)
      .maybeSingle();

    if (visitError) {
      console.error(`[Emergency] Database error:`, visitError);
      throw visitError;
    }

    if (!visitRequest) {
      console.error(`[Emergency] Token not found: ${token.substring(0, 8)}...`);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid visitor token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const visitor = visitRequest.visitors as unknown as { id: string; full_name: string; phone: string };
    const tenantId = visitRequest.tenant_id;

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

    // Send WhatsApp notification to host
    if (visitRequest.host_phone) {
      try {
        const hostMessage = `🚨 تنبيه طوارئ | Emergency Alert

زائرك يحتاج مساعدة فورية!
Your visitor needs immediate assistance!

👤 الزائر | Visitor: ${visitor.full_name}
📍 ${visitRequest.destination_name || 'الموقع غير محدد | Location unknown'}
${latitude && longitude ? `🗺️ GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}` : ''}
${notes ? `📝 ملاحظات | Notes: ${notes}` : ''}

⚡ يرجى الاستجابة فوراً أو الاتصال بالأمن
Please respond immediately or contact security.`;

        await supabase.functions.invoke('send-gate-whatsapp', {
          body: {
            mobile_number: visitRequest.host_phone,
            tenant_id: tenantId,
            notification_type: 'host_notification',
            visitor_name: visitor.full_name,
          }
        });
        
        console.log(`[Emergency] Host notified: ${visitRequest.host_phone}`);
      } catch (whatsappError) {
        console.error(`[Emergency] Failed to notify host:`, whatsappError);
        // Continue even if WhatsApp fails
      }
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
