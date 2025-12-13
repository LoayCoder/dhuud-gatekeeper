import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationResult {
  valid: boolean;
  contractor_id?: string;
  contractor_name?: string;
  company_name?: string;
  errors: string[];
  warnings: string[];
  nationality?: string;
  preferred_language?: string;
  photo_url?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contractor_code, site_id, zone_id, tenant_id } = await req.json();
    
    console.log(`Validating contractor: ${contractor_code} for site: ${site_id}`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Find contractor by code or QR data
    const { data: contractor, error } = await supabase
      .from('contractors')
      .select(`
        id, full_name, company_name, nationality, preferred_language,
        photo_path, is_banned, ban_reason, ban_expires_at,
        permit_number, permit_expiry_date,
        safety_induction_date, safety_induction_expiry,
        medical_exam_date, medical_exam_expiry,
        allowed_sites, allowed_zones
      `)
      .eq('tenant_id', tenant_id)
      .or(`contractor_code.eq.${contractor_code},qr_code_data.eq.${contractor_code}`)
      .is('deleted_at', null)
      .single();
    
    if (error || !contractor) {
      return new Response(
        JSON.stringify({
          valid: false,
          errors: ['contractor_not_found'],
          warnings: []
        } as ValidationResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const result: ValidationResult = {
      valid: true,
      contractor_id: contractor.id,
      contractor_name: contractor.full_name,
      company_name: contractor.company_name,
      nationality: contractor.nationality,
      preferred_language: contractor.preferred_language || 'en',
      errors: [],
      warnings: []
    };
    
    const today = new Date();
    
    // Check if banned
    if (contractor.is_banned) {
      const banExpiry = contractor.ban_expires_at ? new Date(contractor.ban_expires_at) : null;
      if (!banExpiry || banExpiry > today) {
        result.valid = false;
        result.errors.push('contractor_banned');
      }
    }
    
    // Check permit expiry
    if (contractor.permit_expiry_date) {
      const permitExpiry = new Date(contractor.permit_expiry_date);
      if (permitExpiry < today) {
        result.valid = false;
        result.errors.push('permit_expired');
      } else if (permitExpiry < new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) {
        result.warnings.push('permit_expiring_soon');
      }
    }
    
    // Check safety induction expiry
    if (contractor.safety_induction_expiry) {
      const inductionExpiry = new Date(contractor.safety_induction_expiry);
      if (inductionExpiry < today) {
        result.valid = false;
        result.errors.push('induction_expired');
      } else if (inductionExpiry < new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) {
        result.warnings.push('induction_expiring_soon');
      }
    }
    
    // Check medical exam expiry
    if (contractor.medical_exam_expiry) {
      const medicalExpiry = new Date(contractor.medical_exam_expiry);
      if (medicalExpiry < today) {
        result.valid = false;
        result.errors.push('medical_expired');
      } else if (medicalExpiry < new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)) {
        result.warnings.push('medical_expiring_soon');
      }
    }
    
    // Check site access
    if (site_id && contractor.allowed_sites && contractor.allowed_sites.length > 0) {
      if (!contractor.allowed_sites.includes(site_id)) {
        result.valid = false;
        result.errors.push('site_not_authorized');
      }
    }
    
    // Check zone access
    if (zone_id && contractor.allowed_zones && contractor.allowed_zones.length > 0) {
      if (!contractor.allowed_zones.includes(zone_id)) {
        result.valid = false;
        result.errors.push('zone_not_authorized');
      }
    }
    
    // Get photo URL if exists
    if (contractor.photo_path) {
      const { data: photoData } = supabase.storage
        .from('contractors')
        .getPublicUrl(contractor.photo_path);
      result.photo_url = photoData?.publicUrl;
    }
    
    console.log(`Contractor validation result: ${result.valid ? 'PASS' : 'FAIL'}`, result.errors);
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Contractor validation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ valid: false, errors: [errorMessage], warnings: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
