import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationRequest {
  qr_token: string;
  tenant_id: string;
}

interface ValidationResult {
  is_valid: boolean;
  pass?: {
    id: string;
    reference_number: string;
    pass_type: string;
    material_description: string;
    quantity: string | null;
    vehicle_plate: string | null;
    driver_name: string | null;
    driver_mobile: string | null;
    pass_date: string;
    time_window_start: string | null;
    time_window_end: string | null;
    status: string;
    entry_time: string | null;
    exit_time: string | null;
    project_name: string;
    company_name: string;
  };
  items?: Array<{
    item_name: string;
    description: string | null;
    quantity: string | null;
    unit: string | null;
  }>;
  photos?: Array<{
    storage_path: string;
    file_name: string;
  }>;
  errors: string[];
  warnings: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { qr_token, tenant_id }: ValidationRequest = await req.json();

    if (!qr_token || !tenant_id) {
      return new Response(
        JSON.stringify({ is_valid: false, errors: ['Missing QR token or tenant ID'] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ValidateMaterialQR] Validating token: ${qr_token.substring(0, 8)}...`);

    const result: ValidationResult = {
      is_valid: true,
      errors: [],
      warnings: [],
    };

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Fetch gate pass by QR token
    const { data: pass, error: passError } = await supabase
      .from('material_gate_passes')
      .select(`
        id,
        reference_number,
        pass_type,
        material_description,
        quantity,
        vehicle_plate,
        driver_name,
        driver_mobile,
        pass_date,
        time_window_start,
        time_window_end,
        status,
        entry_time,
        exit_time,
        project:contractor_projects(project_name),
        company:contractor_companies(company_name)
      `)
      .eq('qr_code_token', qr_token)
      .eq('tenant_id', tenant_id)
      .is('deleted_at', null)
      .single();

    if (passError || !pass) {
      console.error('[ValidateMaterialQR] Pass not found:', passError);
      return new Response(
        JSON.stringify({ is_valid: false, errors: ['Invalid or expired gate pass QR code'] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check pass status
    if (pass.status !== 'approved') {
      result.is_valid = false;
      result.errors.push(`Gate pass is not approved (status: ${pass.status})`);
    }

    // Check pass date
    if (pass.pass_date !== today) {
      result.is_valid = false;
      result.errors.push(`Gate pass is for ${pass.pass_date}, not valid today`);
    }

    // Check time window if specified
    if (pass.time_window_start && pass.time_window_end) {
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM
      if (currentTime < pass.time_window_start || currentTime > pass.time_window_end) {
        result.warnings.push(`Outside time window: ${pass.time_window_start} - ${pass.time_window_end}`);
      }
    }

    // Check if already completed
    if (pass.exit_time) {
      result.is_valid = false;
      result.errors.push('Gate pass already completed (exit recorded)');
    }

    // Fetch items
    const { data: items } = await supabase
      .from('gate_pass_items')
      .select('item_name, description, quantity, unit')
      .eq('gate_pass_id', pass.id)
      .is('deleted_at', null);

    // Fetch photos
    const { data: photos } = await supabase
      .from('gate_pass_photos')
      .select('storage_path, file_name')
      .eq('gate_pass_id', pass.id)
      .is('deleted_at', null);

    // Build result
    result.pass = {
      id: pass.id,
      reference_number: pass.reference_number,
      pass_type: pass.pass_type,
      material_description: pass.material_description,
      quantity: pass.quantity,
      vehicle_plate: pass.vehicle_plate,
      driver_name: pass.driver_name,
      driver_mobile: pass.driver_mobile,
      pass_date: pass.pass_date,
      time_window_start: pass.time_window_start,
      time_window_end: pass.time_window_end,
      status: pass.status,
      entry_time: pass.entry_time,
      exit_time: pass.exit_time,
      project_name: (pass.project as any)?.project_name || 'Unknown',
      company_name: (pass.company as any)?.company_name || 'Unknown',
    };

    result.items = items || [];
    result.photos = photos || [];

    console.log(`[ValidateMaterialQR] Pass ${pass.reference_number}: ${result.is_valid ? 'VALID' : 'INVALID'}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[ValidateMaterialQR] Error:', error);
    return new Response(
      JSON.stringify({ is_valid: false, errors: ['Internal server error'] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
