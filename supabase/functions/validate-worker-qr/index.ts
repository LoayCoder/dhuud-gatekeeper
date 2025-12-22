import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPrelight, verifyAuth, unauthorizedResponse } from '../_shared/cors.ts';

interface ValidationRequest {
  qr_token: string;
  site_id?: string;
  zone_id?: string;
  tenant_id: string;
}

interface ValidationResult {
  is_valid: boolean;
  worker?: {
    id: string;
    full_name: string;
    full_name_ar: string | null;
    photo_path: string | null;
    company_name: string;
    project_name: string;
    nationality: string | null;
    preferred_language: string;
  };
  errors: string[];
  warnings: string[];
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
    const authResult = await verifyAuth(req, supabase);
    if (!authResult?.user) {
      console.error('[ValidateWorkerQR] Auth failed:', authResult?.error);
      return unauthorizedResponse(authResult?.error || 'Unauthorized', origin);
    }

    const { qr_token, site_id, zone_id, tenant_id }: ValidationRequest = await req.json();

    if (!qr_token || !tenant_id) {
      return new Response(
        JSON.stringify({ is_valid: false, errors: ['Missing QR token or tenant ID'] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result: ValidationResult = {
      is_valid: true,
      errors: [],
      warnings: [],
    };

    // Get QR code record
    const { data: qrCode, error: qrError } = await supabase
      .from('worker_qr_codes')
      .select(`
        id,
        worker_id,
        project_id,
        is_active,
        valid_from,
        valid_until,
        revoked_at,
        revocation_reason,
        worker:contractor_workers(
          id,
          full_name,
          full_name_ar,
          photo_path,
          nationality,
          preferred_language,
          approval_status,
          company:contractor_companies(company_name, status)
        ),
        project:contractor_projects(
          project_name,
          status,
          site_id,
          start_date,
          end_date
        )
      `)
      .eq('qr_token', qr_token)
      .eq('tenant_id', tenant_id)
      .single();

    if (qrError || !qrCode) {
      console.error('QR code not found:', qrError);
      return new Response(
        JSON.stringify({ is_valid: false, errors: ['Invalid QR code'] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const worker = qrCode.worker as any;
    const project = qrCode.project as any;
    const company = worker?.company as any;

    // Check QR code validity
    if (!qrCode.is_active) {
      result.is_valid = false;
      result.errors.push('QR code is inactive');
    }

    if (qrCode.revoked_at) {
      result.is_valid = false;
      result.errors.push(`QR code revoked: ${qrCode.revocation_reason || 'Unknown reason'}`);
    }

    if (qrCode.valid_from && new Date(qrCode.valid_from) > now) {
      result.is_valid = false;
      result.errors.push('QR code not yet valid');
    }

    if (qrCode.valid_until && new Date(qrCode.valid_until) < now) {
      result.is_valid = false;
      result.errors.push('QR code has expired');
    }

    // Check worker status
    if (worker?.approval_status !== 'approved') {
      result.is_valid = false;
      result.errors.push(`Worker not approved (status: ${worker?.approval_status})`);
    }

    // Check company status
    if (company?.status === 'suspended') {
      result.is_valid = false;
      result.errors.push('Contractor company is suspended');
    }

    // Check project status
    if (project?.status !== 'active') {
      result.is_valid = false;
      result.errors.push(`Project is not active (status: ${project?.status})`);
    }

    // Check project dates
    if (project?.start_date && new Date(project.start_date) > now) {
      result.is_valid = false;
      result.errors.push('Project has not started yet');
    }

    if (project?.end_date && new Date(project.end_date) < now) {
      result.is_valid = false;
      result.errors.push('Project has ended');
    }

    // Check site access (if site_id provided)
    if (site_id && project?.site_id && project.site_id !== site_id) {
      result.is_valid = false;
      result.errors.push('Worker not authorized for this site');
    }

    // Check induction status
    const { data: induction } = await supabase
      .from('worker_inductions')
      .select('status, acknowledged_at, expires_at')
      .eq('worker_id', qrCode.worker_id)
      .eq('project_id', qrCode.project_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!induction || induction.status !== 'completed' || !induction.acknowledged_at) {
      result.is_valid = false;
      result.errors.push('Safety induction not completed');
    } else if (induction.expires_at && new Date(induction.expires_at) < now) {
      result.is_valid = false;
      result.errors.push('Safety induction has expired');
    }

    // Populate worker info if valid
    if (worker) {
      result.worker = {
        id: worker.id,
        full_name: worker.full_name,
        full_name_ar: worker.full_name_ar,
        photo_path: worker.photo_path,
        company_name: company?.company_name || 'Unknown',
        project_name: project?.project_name || 'Unknown',
        nationality: worker.nationality,
        preferred_language: worker.preferred_language,
      };
    }

    // Log validation attempt with authenticated user
    await supabase.from('contractor_module_audit_logs').insert({
      tenant_id,
      entity_type: 'worker_qr_code',
      entity_id: qrCode.id,
      actor_id: authResult.user.id,
      action: result.is_valid ? 'qr_validated_success' : 'qr_validated_failed',
      new_value: {
        worker_id: qrCode.worker_id,
        project_id: qrCode.project_id,
        site_id,
        zone_id,
        is_valid: result.is_valid,
        errors: result.errors,
      },
    });

    console.log(`QR validation for worker ${worker?.full_name}: ${result.is_valid ? 'VALID' : 'INVALID'}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error validating worker QR:', error);
    const origin = req.headers.get('Origin');
    return new Response(
      JSON.stringify({ is_valid: false, errors: ['Internal server error'] }),
      { status: 500, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } }
    );
  }
});
