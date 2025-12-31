import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidateQRRequest {
  qr_token: string;
  tenant_id?: string;
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

    const { qr_token, tenant_id }: ValidateQRRequest = await req.json();
    console.log('[Validate Contractor QR] Token:', qr_token);

    if (!qr_token) {
      return new Response(
        JSON.stringify({ valid: false, error: 'QR token is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Look up QR record
    let query = supabase
      .from('contractor_company_access_qr')
      .select(`
        id,
        company_id,
        tenant_id,
        person_type,
        person_name,
        person_phone,
        person_email,
        qr_token,
        valid_from,
        valid_until,
        is_active,
        is_revoked,
        revocation_reason
      `)
      .eq('qr_token', qr_token)
      .is('deleted_at', null)
      .single();

    const { data: qrRecord, error: qrError } = await query;

    if (qrError || !qrRecord) {
      console.log('[Validate Contractor QR] Token not found');
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Invalid QR code',
          error_ar: 'رمز QR غير صالح'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if revoked
    if (qrRecord.is_revoked) {
      console.log('[Validate Contractor QR] Token revoked');
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Access has been revoked: ' + (qrRecord.revocation_reason || 'No reason provided'),
          error_ar: 'تم إلغاء الوصول'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if active
    if (!qrRecord.is_active) {
      console.log('[Validate Contractor QR] Token inactive');
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Access card is no longer active',
          error_ar: 'بطاقة الدخول لم تعد نشطة'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check validity dates
    const now = new Date();
    if (qrRecord.valid_from && new Date(qrRecord.valid_from) > now) {
      console.log('[Validate Contractor QR] Not yet valid');
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Access card not yet valid',
          error_ar: 'بطاقة الدخول لم تصبح صالحة بعد'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (qrRecord.valid_until && new Date(qrRecord.valid_until) < now) {
      console.log('[Validate Contractor QR] Expired');
      // Mark as inactive
      await supabase
        .from('contractor_company_access_qr')
        .update({ is_active: false })
        .eq('id', qrRecord.id);

      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Access card has expired',
          error_ar: 'انتهت صلاحية بطاقة الدخول'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get company details
    const { data: company } = await supabase
      .from('contractor_companies')
      .select('id, company_name, company_name_ar, status, contract_end_date')
      .eq('id', qrRecord.company_id)
      .is('deleted_at', null)
      .single();

    if (!company) {
      console.log('[Validate Contractor QR] Company not found');
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Company no longer exists',
          error_ar: 'الشركة لم تعد موجودة'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check company status
    if (company.status !== 'active') {
      console.log('[Validate Contractor QR] Company not active:', company.status);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: `Company status: ${company.status}`,
          error_ar: `حالة الشركة: ${company.status}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log successful validation
    await supabase.from('contractor_module_audit_logs').insert({
      tenant_id: qrRecord.tenant_id,
      entity_type: 'contractor_company_access_qr',
      entity_id: qrRecord.id,
      action: 'qr_validated',
      new_value: {
        person_name: qrRecord.person_name,
        company_name: company.company_name,
        validated_at: now.toISOString(),
      },
    });

    console.log('[Validate Contractor QR] Valid - Access granted');

    return new Response(
      JSON.stringify({
        valid: true,
        person: {
          name: qrRecord.person_name,
          type: qrRecord.person_type,
          type_label: qrRecord.person_type === 'site_rep' ? 'Site Representative' : 'Safety Officer',
          type_label_ar: qrRecord.person_type === 'site_rep' ? 'ممثل الموقع' : 'مسؤول السلامة',
          phone: qrRecord.person_phone,
          email: qrRecord.person_email,
        },
        company: {
          id: company.id,
          name: company.company_name,
          name_ar: company.company_name_ar,
          status: company.status,
        },
        validity: {
          valid_from: qrRecord.valid_from,
          valid_until: qrRecord.valid_until,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Validate Contractor QR] Error:', errorMessage);
    return new Response(
      JSON.stringify({ valid: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
