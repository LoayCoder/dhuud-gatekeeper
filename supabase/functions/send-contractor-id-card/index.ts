import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendIdCardRequest {
  company_id: string;
  tenant_id: string;
  person_type: 'site_rep' | 'safety_officer';
  safety_officer_id?: string;
  person_name: string;
  person_phone: string;
  person_email?: string;
  company_name: string;
  contract_end_date?: string;
}

// Generate a unique QR token
function generateQRToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = 'CTR-';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Format phone number for WhatsApp
function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '966' + cleaned.substring(1);
  }
  if (!cleaned.startsWith('966') && cleaned.length === 9) {
    cleaned = '966' + cleaned;
  }
  return cleaned;
}

// Generate ID Card SVG
function generateIdCardSVG(params: {
  tenantName: string;
  personName: string;
  companyName: string;
  roleDisplay: string;
  roleDisplayAr: string;
  validUntil: string;
  qrToken: string;
  qrDataUrl: string;
}): string {
  const { tenantName, personName, companyName, roleDisplay, roleDisplayAr, validUntil, qrToken, qrDataUrl } = params;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="400" height="600" viewBox="0 0 400 600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e3a5f;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2d5a87;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f8fafc;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.15"/>
    </filter>
  </defs>
  
  <!-- Card Background -->
  <rect x="20" y="20" width="360" height="560" rx="16" fill="url(#cardGrad)" filter="url(#shadow)" stroke="#e2e8f0" stroke-width="1"/>
  
  <!-- Header -->
  <rect x="20" y="20" width="360" height="90" rx="16" fill="url(#headerGrad)"/>
  <rect x="20" y="80" width="360" height="30" fill="url(#headerGrad)"/>
  
  <!-- Header Text -->
  <text x="200" y="55" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="16" font-weight="bold">CONTRACTOR ACCESS CARD</text>
  <text x="200" y="80" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14">بطاقة دخول المقاول</text>
  <text x="200" y="100" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial, sans-serif" font-size="11">${tenantName}</text>
  
  <!-- QR Code Area -->
  <rect x="100" y="130" width="200" height="200" rx="8" fill="white" stroke="#e2e8f0" stroke-width="1"/>
  <image x="110" y="140" width="180" height="180" href="${qrDataUrl}"/>
  
  <!-- Person Info Section -->
  <rect x="40" y="350" width="320" height="180" rx="8" fill="#f1f5f9"/>
  
  <!-- Name -->
  <text x="200" y="380" text-anchor="middle" fill="#64748b" font-family="Arial, sans-serif" font-size="11">NAME / الاسم</text>
  <text x="200" y="402" text-anchor="middle" fill="#1e293b" font-family="Arial, sans-serif" font-size="16" font-weight="bold">${personName}</text>
  
  <!-- Separator -->
  <line x1="60" y1="415" x2="340" y2="415" stroke="#e2e8f0" stroke-width="1"/>
  
  <!-- Company -->
  <text x="200" y="435" text-anchor="middle" fill="#64748b" font-family="Arial, sans-serif" font-size="11">COMPANY / الشركة</text>
  <text x="200" y="455" text-anchor="middle" fill="#1e293b" font-family="Arial, sans-serif" font-size="13">${companyName}</text>
  
  <!-- Separator -->
  <line x1="60" y1="468" x2="340" y2="468" stroke="#e2e8f0" stroke-width="1"/>
  
  <!-- Role Badge -->
  <rect x="70" y="478" width="260" height="40" rx="20" fill="#059669"/>
  <text x="200" y="495" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="11" font-weight="bold">${roleDisplay}</text>
  <text x="200" y="510" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-family="Arial, sans-serif" font-size="10">${roleDisplayAr}</text>
  
  <!-- Footer -->
  <rect x="20" y="540" width="360" height="40" rx="0" fill="#f8fafc"/>
  <rect x="20" y="560" width="360" height="20" rx="0 0 16 16" fill="#f8fafc"/>
  
  <!-- Valid Until -->
  <text x="60" y="558" fill="#64748b" font-family="Arial, sans-serif" font-size="10">Valid Until: ${validUntil}</text>
  
  <!-- Access Code -->
  <text x="340" y="558" text-anchor="end" fill="#1e3a5f" font-family="monospace" font-size="10" font-weight="bold">${qrToken}</text>
  
  <!-- Security Strip -->
  <rect x="20" y="570" width="360" height="10" rx="0 0 16 16" fill="url(#headerGrad)"/>
</svg>`;
}

// Generate QR Code as Data URL using external API
async function generateQRCodeDataUrl(data: string): Promise<string> {
  try {
    const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(data)}&format=png`);
    if (!response.ok) throw new Error('QR generation failed');
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error('[ID Card] QR generation error:', error);
    // Return a placeholder if QR fails
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }
}

// Convert SVG to PNG using resvg-wasm
async function svgToPng(svg: string): Promise<Uint8Array> {
  // Use external SVG to PNG converter API
  try {
    const response = await fetch('https://svg2png.onrender.com/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ svg, width: 400, height: 600 })
    });
    
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    }
  } catch (e) {
    console.log('[ID Card] External converter failed, using SVG directly');
  }
  
  // Fallback: Return SVG as-is encoded
  return new TextEncoder().encode(svg);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestData: SendIdCardRequest = await req.json();
    console.log('[Send ID Card] Request received:', JSON.stringify(requestData));

    const {
      company_id,
      tenant_id,
      person_type,
      safety_officer_id,
      person_name,
      person_phone,
      person_email,
      company_name,
      contract_end_date,
    } = requestData;

    // Validate required fields
    if (!company_id || !tenant_id || !person_name || !person_phone || !company_name) {
      throw new Error('Missing required fields: company_id, tenant_id, person_name, person_phone, company_name');
    }

    // Generate unique QR token
    const qr_token = generateQRToken();
    console.log('[Send ID Card] Generated QR token:', qr_token);

    // Calculate validity - use contract end date or 1 year from now
    const valid_until = contract_end_date 
      ? new Date(contract_end_date).toISOString()
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    // Check for existing active QR for this person and deactivate
    const existingQuery = supabase
      .from('contractor_company_access_qr')
      .update({ is_active: false, revoked_at: new Date().toISOString(), revocation_reason: 'Replaced by new card' })
      .eq('company_id', company_id)
      .eq('person_type', person_type)
      .eq('is_active', true)
      .is('deleted_at', null);

    if (safety_officer_id) {
      existingQuery.eq('safety_officer_id', safety_officer_id);
    } else {
      existingQuery.eq('person_name', person_name);
    }

    await existingQuery;

    // Create new QR record
    const { data: qrRecord, error: qrError } = await supabase
      .from('contractor_company_access_qr')
      .insert({
        company_id,
        tenant_id,
        person_type,
        safety_officer_id: safety_officer_id || null,
        person_name,
        person_phone,
        person_email: person_email || null,
        qr_token,
        valid_until,
        is_active: true,
      })
      .select()
      .single();

    if (qrError) {
      console.error('[Send ID Card] Error creating QR record:', qrError);
      throw new Error('Failed to create QR record: ' + qrError.message);
    }

    console.log('[Send ID Card] QR record created:', qrRecord.id);

    // Get tenant info for branding
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, name_ar')
      .eq('id', tenant_id)
      .single();

    const tenantName = tenant?.name || 'HSSA Platform';

    // Format role display
    const roleDisplay = person_type === 'site_rep' 
      ? 'Site Representative' 
      : 'Safety Officer';
    const roleDisplayAr = person_type === 'site_rep' 
      ? 'ممثل الموقع' 
      : 'مسؤول السلامة';

    // Format validity date
    const validUntilDate = new Date(valid_until).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    // Generate QR code data URL
    console.log('[Send ID Card] Generating QR code...');
    const qrDataUrl = await generateQRCodeDataUrl(qr_token);

    // Generate ID Card SVG
    console.log('[Send ID Card] Generating ID card image...');
    const idCardSvg = generateIdCardSVG({
      tenantName,
      personName: person_name,
      companyName: company_name,
      roleDisplay,
      roleDisplayAr,
      validUntil: validUntilDate,
      qrToken: qr_token,
      qrDataUrl,
    });

    // Convert to PNG or use SVG
    const imageData = await svgToPng(idCardSvg);
    const isSvg = imageData.length < 10000; // SVG is typically smaller
    const fileExt = isSvg ? 'svg' : 'png';
    const mimeType = isSvg ? 'image/svg+xml' : 'image/png';

    // Upload to storage
    const storagePath = `id-cards/${company_id}/${qr_token}.${fileExt}`;
    console.log('[Send ID Card] Uploading to storage:', storagePath);

    const { error: uploadError } = await supabase.storage
      .from('contractor-documents')
      .upload(storagePath, imageData, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error('[Send ID Card] Upload error:', uploadError);
      // Continue without image - will send text message instead
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('contractor-documents')
      .getPublicUrl(storagePath);
    
    const imageUrl = urlData?.publicUrl || null;
    console.log('[Send ID Card] Image URL:', imageUrl);

    // Update QR record with image path
    if (imageUrl) {
      await supabase
        .from('contractor_company_access_qr')
        .update({ card_image_path: storagePath })
        .eq('id', qrRecord.id);
    }

    // Send via WhatsApp using WaSender
    const wasenderApiKey = Deno.env.get('WASENDER_API_KEY');
    if (!wasenderApiKey) {
      console.warn('[Send ID Card] WASENDER_API_KEY not configured, skipping WhatsApp');
      return new Response(
        JSON.stringify({
          success: true,
          qr_record_id: qrRecord.id,
          qr_token,
          image_url: imageUrl,
          whatsapp_sent: false,
          message: 'ID card created but WhatsApp not configured'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formattedPhone = formatPhoneNumber(person_phone);
    console.log('[Send ID Card] Sending WhatsApp to:', formattedPhone);

    // Create caption for the image
    const caption = `🪪 ${tenantName} - Contractor Access Card
بطاقة دخول المقاول

👤 ${person_name}
🏢 ${company_name}
💼 ${roleDisplay} / ${roleDisplayAr}
📅 Valid until: ${validUntilDate}
🔐 Code: ${qr_token}

📱 Present this card at the security gate
قدم هذه البطاقة عند بوابة الأمن`;

    let wasenderResponse;
    let wasenderResult;
    let whatsappSuccess = false;
    let messageId = null;

    // Try sending as image first, fallback to text
    if (imageUrl) {
      // Send image message
      wasenderResponse = await fetch('https://api.wasender.dev/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${wasenderApiKey}`,
        },
        body: JSON.stringify({
          to: formattedPhone,
          imageUrl: imageUrl,
          caption: caption,
        }),
      });

      wasenderResult = await wasenderResponse.json();
      console.log('[Send ID Card] WaSender image response:', JSON.stringify(wasenderResult));
      
      whatsappSuccess = wasenderResponse.ok && wasenderResult.success !== false;
      messageId = wasenderResult.messageId || wasenderResult.id || null;
    }

    // Fallback to text message if image fails
    if (!whatsappSuccess) {
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr_token)}`;
      const textMessage = `${caption}\n\n🔗 QR Code: ${qrCodeUrl}`;

      wasenderResponse = await fetch('https://api.wasender.dev/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${wasenderApiKey}`,
        },
        body: JSON.stringify({
          to: formattedPhone,
          text: textMessage,
        }),
      });

      wasenderResult = await wasenderResponse.json();
      console.log('[Send ID Card] WaSender text response:', JSON.stringify(wasenderResult));
      
      whatsappSuccess = wasenderResponse.ok && wasenderResult.success !== false;
      messageId = wasenderResult.messageId || wasenderResult.id || null;
    }

    // Update QR record with WhatsApp status
    if (whatsappSuccess) {
      await supabase
        .from('contractor_company_access_qr')
        .update({
          whatsapp_sent_at: new Date().toISOString(),
          whatsapp_message_id: messageId,
        })
        .eq('id', qrRecord.id);
    }

    // Log to audit
    await supabase.from('contractor_module_audit_logs').insert({
      tenant_id,
      entity_type: 'contractor_company_access_qr',
      entity_id: qrRecord.id,
      action: 'id_card_sent',
      new_value: {
        person_name,
        person_type,
        company_name,
        whatsapp_sent: whatsappSuccess,
        phone: formattedPhone,
        image_url: imageUrl,
      },
    });

    console.log('[Send ID Card] Completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        qr_record_id: qrRecord.id,
        qr_token,
        image_url: imageUrl,
        whatsapp_sent: whatsappSuccess,
        message_id: messageId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Send ID Card] Error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
