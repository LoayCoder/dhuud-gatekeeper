import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendIDCardRequest {
  entity_type: 'visitor' | 'visitor_vip' | 'worker' | 'employee' | 'contractor_rep';
  entity_id: string;
  tenant_id: string;
  recipient_phone: string;
  card_image_url?: string;
  is_resend?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: SendIDCardRequest = await req.json();
    const { entity_type, entity_id, tenant_id, recipient_phone, card_image_url, is_resend } = body;

    console.log('[SendIDCard] Request:', { entity_type, entity_id, tenant_id, recipient_phone });

    if (!entity_type || !entity_id || !tenant_id || !recipient_phone) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch tenant details
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name, hsse_department_name, hsse_department_name_ar')
      .eq('id', tenant_id)
      .single();

    if (tenantError) {
      console.error('[SendIDCard] Tenant fetch error:', tenantError);
    }

    // Format phone number
    let phone = recipient_phone.replace(/[\s\-\(\)]/g, '');
    if (!phone.startsWith('+')) {
      if (phone.startsWith('0')) {
        phone = '+966' + phone.substring(1);
      } else if (!phone.startsWith('966')) {
        phone = '+966' + phone;
      } else {
        phone = '+' + phone;
      }
    }

    let whatsappSent = false;

    // Send via WhatsApp if API key is configured
    const wasenderApiKey = Deno.env.get('WASENDER_API_KEY');
    if (wasenderApiKey && card_image_url) {
      try {
        // Determine message based on entity type
        const entityLabels: Record<string, { en: string; ar: string }> = {
          visitor: { en: 'Visitor', ar: 'زائر' },
          visitor_vip: { en: 'VIP Visitor', ar: 'زائر VIP' },
          worker: { en: 'Worker', ar: 'عامل' },
          employee: { en: 'Employee', ar: 'موظف' },
          contractor_rep: { en: 'Contractor Representative', ar: 'ممثل المقاول' },
        };

        const label = entityLabels[entity_type] || { en: 'ID Card', ar: 'بطاقة هوية' };
        const tenantName = tenant?.name || '';

        const messageAr = `🎫 *بطاقة الهوية الرقمية*\n\n${label.ar}\nالمنشأة: ${tenantName}\n\n📱 احفظ هذه البطاقة على جهازك وقدمها عند البوابة.`;
        const messageEn = `🎫 *Digital ID Card*\n\n${label.en}\nFacility: ${tenantName}\n\n📱 Save this card to your device and present it at the gate.`;

        // Send image with caption
        const response = await fetch('https://api.wasender.net/v1/messages/send-image', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${wasenderApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: phone,
            image: card_image_url,
            caption: messageAr + '\n\n---\n\n' + messageEn,
          }),
        });

        if (response.ok) {
          whatsappSent = true;
          console.log('[SendIDCard] WhatsApp image sent successfully to:', phone);
        } else {
          const errorText = await response.text();
          console.error('[SendIDCard] WhatsApp send error:', errorText);
          
          // Fallback to text message with link
          const fallbackResponse = await fetch('https://api.wasender.net/v1/messages/send-text', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${wasenderApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: phone,
              message: messageAr + '\n\n' + card_image_url + '\n\n---\n\n' + messageEn,
            }),
          });

          if (fallbackResponse.ok) {
            whatsappSent = true;
            console.log('[SendIDCard] WhatsApp text fallback sent to:', phone);
          }
        }
      } catch (waErr) {
        console.error('[SendIDCard] WhatsApp error:', waErr);
      }
    }

    // Update the entity's sent timestamp
    const tableMap: Record<string, string> = {
      visitor: 'visitors',
      visitor_vip: 'visitors',
      worker: 'contractor_workers',
      employee: 'profiles',
      contractor_rep: 'contractor_representatives',
    };

    const tableName = tableMap[entity_type];
    if (tableName && whatsappSent) {
      await supabase
        .from(tableName)
        .update({ 
          id_card_sent_at: new Date().toISOString(),
          id_card_image_path: card_image_url,
        })
        .eq('id', entity_id);
    }

    // Log notification
    await supabase.from('notification_logs').insert({
      tenant_id: tenant_id,
      channel: whatsappSent ? 'whatsapp' : 'none',
      recipient: phone,
      message_type: 'id_card',
      status: whatsappSent ? 'sent' : 'failed',
      sent_at: new Date().toISOString(),
      metadata: {
        entity_type,
        entity_id,
        card_image_url,
        is_resend: is_resend || false,
      },
    });

    console.log('[SendIDCard] Completed. WhatsApp:', whatsappSent);

    return new Response(
      JSON.stringify({
        success: true,
        whatsapp_sent: whatsappSent,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[SendIDCard] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
