import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPrelight, verifyAuth, unauthorizedResponse } from '../_shared/cors.ts';

interface ValidationRequest {
  qr_token?: string;
  search_term?: string;
  search_mode?: boolean;
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
    national_id?: string;
    mobile_number?: string;
    tenant_id?: string;
  };
  induction?: {
    status: string;
    expires_at: string | null;
    acknowledged_at: string | null;
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

    const requestData = await req.json();
    const { qr_token, search_term, search_mode, site_id, zone_id, tenant_id }: ValidationRequest = requestData;
    // Also support legacy qr_data parameter
    const searchValue = search_term || requestData.qr_data;

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ is_valid: false, errors: ['Missing tenant ID'] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!qr_token && !searchValue) {
      return new Response(
        JSON.stringify({ is_valid: false, errors: ['Missing QR token or search term'] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result: ValidationResult = {
      is_valid: true,
      errors: [],
      warnings: [],
    };

    const now = new Date();
    let qrCode: any = null;
    let worker: any = null;
    let project: any = null;
    let company: any = null;

    // SEARCH MODE: Find worker by national_id, name, or mobile
    if (search_mode || (!qr_token && searchValue)) {
      console.log(`[ValidateWorkerQR] Search mode - looking for: ${searchValue}`);
      
      // Search for worker
      const { data: workers, error: searchError } = await supabase
        .from('contractor_workers')
        .select(`
          id,
          full_name,
          full_name_ar,
          photo_path,
          nationality,
          preferred_language,
          approval_status,
          national_id,
          mobile_number,
          tenant_id,
          company:contractor_companies(id, company_name, status)
        `)
        .eq('tenant_id', tenant_id)
        .is('deleted_at', null)
        .or(`national_id.ilike.%${searchValue}%,full_name.ilike.%${searchValue}%,mobile_number.ilike.%${searchValue}%`)
        .limit(1);

      if (searchError || !workers || workers.length === 0) {
        console.error('Worker not found:', searchError);
        return new Response(
          JSON.stringify({ is_valid: false, errors: ['Worker not found'] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      worker = workers[0];
      company = worker.company;

      // Check worker approval status
      if (worker.approval_status !== 'approved') {
        result.is_valid = false;
        result.errors.push(`Worker not approved (status: ${worker.approval_status})`);
      }

      // Check company status
      if (company?.status === 'suspended') {
        result.is_valid = false;
        result.errors.push('Contractor company is suspended');
      }

      // Get active project assignments
      const { data: assignments } = await supabase
        .from('project_worker_assignments')
        .select(`
          project:contractor_projects(
            id,
            project_name,
            status,
            site_id,
            start_date,
            end_date
          )
        `)
        .eq('worker_id', worker.id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .limit(1);

      if (assignments && assignments.length > 0) {
        project = assignments[0].project;
        
        // Check project status
        if (project?.status !== 'active') {
          result.warnings.push(`Project is not active (status: ${project?.status})`);
        }

        // Check site access
        if (site_id && project?.site_id && project.site_id !== site_id) {
          result.is_valid = false;
          result.errors.push('Worker not authorized for this site');
        }

        // Check induction status
        const { data: induction } = await supabase
          .from('worker_inductions')
          .select('status, acknowledged_at, expires_at')
          .eq('worker_id', worker.id)
          .eq('project_id', project.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!induction || induction.status !== 'acknowledged' || !induction.acknowledged_at) {
          result.warnings.push('Safety induction not completed');
        } else if (induction.expires_at && new Date(induction.expires_at) < now) {
          result.warnings.push('Safety induction has expired');
        }

        // Add induction data to result
        if (induction) {
          result.induction = {
            status: induction.status,
            expires_at: induction.expires_at,
            acknowledged_at: induction.acknowledged_at,
          };
        }
      } else {
        result.warnings.push('No active project assignment found');
      }

      // Populate worker info
      result.worker = {
        id: worker.id,
        full_name: worker.full_name,
        full_name_ar: worker.full_name_ar,
        photo_path: worker.photo_path,
        company_name: company?.company_name || 'Unknown',
        project_name: project?.project_name || 'No active project',
        nationality: worker.nationality,
        preferred_language: worker.preferred_language,
        national_id: worker.national_id,
        mobile_number: worker.mobile_number,
        tenant_id: worker.tenant_id,
      };

    } else {
      // QR TOKEN MODE: Validate by QR token
      console.log(`[ValidateWorkerQR] QR token mode - validating: ${qr_token}`);

      // Get QR code record
      const { data: qrData, error: qrError } = await supabase
        .from('worker_qr_codes')
        .select(`
          id,
          worker_id,
          project_id,
          valid_from,
          valid_until,
          is_revoked,
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
            national_id,
            mobile_number,
            tenant_id,
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

      if (qrError || !qrData) {
        console.error('QR code not found:', qrError);
        return new Response(
          JSON.stringify({ is_valid: false, errors: ['Invalid QR code'] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      qrCode = qrData;
      worker = qrCode.worker as any;
      project = qrCode.project as any;
      company = worker?.company as any;

      // Check QR code validity - use is_revoked column (not is_active)
      if (qrCode.is_revoked || qrCode.revoked_at) {
        result.is_valid = false;
        result.errors.push(`QR code has been revoked${qrCode.revocation_reason ? ': ' + qrCode.revocation_reason : ''}`);
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

      // ========================================
      // BLACKLIST CHECK - Check if worker is on security blacklist
      // ========================================
      if (worker?.national_id) {
        const { data: blacklistEntry } = await supabase
          .from('security_blacklist')
          .select('id, reason, listed_at')
          .eq('tenant_id', tenant_id)
          .eq('national_id', worker.national_id)
          .maybeSingle();

        if (blacklistEntry) {
          result.is_valid = false;
          result.errors.push(`BLACKLISTED: ${blacklistEntry.reason || 'Security violation'}`);
          console.log(`[ValidateWorkerQR] Worker ${worker.full_name} is BLACKLISTED: ${blacklistEntry.reason}`);
        }
      }

      // ========================================
      // ZONE ACCESS CHECK - If zone_id provided, validate zone authorization
      // ========================================
      if (zone_id && worker?.id) {
        const { data: zoneAuth } = await supabase
          .from('worker_zone_authorizations')
          .select('id, zone:security_zones(zone_name, risk_level)')
          .eq('worker_id', worker.id)
          .eq('zone_id', zone_id)
          .is('deleted_at', null)
          .maybeSingle();

        if (!zoneAuth) {
          result.is_valid = false;
          result.errors.push('Worker not authorized for this zone');
          console.log(`[ValidateWorkerQR] Worker ${worker.full_name} not authorized for zone ${zone_id}`);
        } else {
          console.log(`[ValidateWorkerQR] Worker authorized for zone: ${(zoneAuth.zone as any)?.zone_name}`);
        }
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

      if (!induction || induction.status !== 'acknowledged' || !induction.acknowledged_at) {
        result.is_valid = false;
        result.errors.push('Safety induction not completed');
      } else if (induction.expires_at && new Date(induction.expires_at) < now) {
        result.is_valid = false;
        result.errors.push('Safety induction has expired');
      }

      // Add induction data to result
      if (induction) {
        result.induction = {
          status: induction.status,
          expires_at: induction.expires_at,
          acknowledged_at: induction.acknowledged_at,
        };
      }

      // Populate worker info
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
          national_id: worker.national_id,
          mobile_number: worker.mobile_number,
          tenant_id: worker.tenant_id,
        };
      }
    }

    // Log validation attempt with authenticated user
    const logEntityId = qrCode?.id || worker?.id;
    const logEntityType = qrCode ? 'worker_qr_code' : 'contractor_worker';
    
    // Determine if this was a blacklist failure for distinct audit action
    const isBlacklistFailure = result.errors.some(e => e.startsWith('BLACKLISTED:'));
    const isZoneFailure = result.errors.some(e => e.includes('not authorized for this zone'));
    
    let auditAction = result.is_valid ? 'qr_validated_success' : 'qr_validated_failed';
    if (isBlacklistFailure) auditAction = 'qr_validation_failed_blacklist';
    if (isZoneFailure) auditAction = 'qr_validation_failed_zone';
    
    if (logEntityId) {
      await supabase.from('contractor_module_audit_logs').insert({
        tenant_id,
        entity_type: logEntityType,
        entity_id: logEntityId,
        actor_id: authResult.user.id,
        action: auditAction,
        new_value: {
          worker_id: worker?.id,
          project_id: project?.id || qrCode?.project_id,
          site_id,
          zone_id,
          is_valid: result.is_valid,
          errors: result.errors,
          warnings: result.warnings,
          search_mode: search_mode || false,
          blacklist_match: isBlacklistFailure,
          zone_access_denied: isZoneFailure,
        },
      });
    }

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
