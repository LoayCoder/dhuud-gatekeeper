import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { wildcardCorsHeaders } from '../_shared/cors.ts';

interface PublicGatePassStatusResponse {
  success: boolean;
  data?: {
    id: string;
    reference_number: string;
    status: string;
    pass_date: string;
    time_window_start: string | null;
    time_window_end: string | null;
    material_description: string;
    quantity: string | null;
    pass_type: 'in' | 'out' | 'in_out';
    vehicle_plate: string | null;
    driver_name: string | null;
    public_requester_name: string;
    public_requester_company: string | null;
    branch: {
      id: string;
      name: string;
      address: string | null;
      google_maps_url: string | null;
    } | null;
    tenant: {
      name: string;
      logo_url: string | null;
      brand_color: string | null;
    } | null;
    // QR code for approved passes
    qr_code_token: string | null;
    qr_generated_at: string | null;
    // Approval info
    approved_at: string | null;
    approved_by_name: string | null;
    rejection_reason: string | null;
    // Timestamps
    created_at: string;
    updated_at: string;
  };
  error?: string;
}

// Map status to user-friendly workflow step
function getWorkflowStep(status: string): { step: number; label: string; isComplete: boolean }[] {
  const steps = [
    { step: 1, label: 'Submitted', isComplete: true },
    { step: 2, label: 'Management Review', isComplete: false },
    { step: 3, label: 'Approved', isComplete: false },
  ];

  switch (status) {
    case 'pending_management':
    case 'pending_pm':
    case 'pending_dept_approval':
    case 'pending_contractor_approval':
      steps[1].isComplete = false;
      break;
    case 'pending_security_approval':
    case 'pending_dept_ack':
    case 'pending_safety':
      steps[1].isComplete = true;
      break;
    case 'approved':
    case 'used':
      steps[1].isComplete = true;
      steps[2].isComplete = true;
      break;
    case 'rejected':
      steps[1].isComplete = true;
      steps[2] = { step: 3, label: 'Rejected', isComplete: true };
      break;
    case 'cancelled':
    case 'expired':
      steps[2] = { step: 3, label: status === 'cancelled' ? 'Cancelled' : 'Expired', isComplete: true };
      break;
  }

  return steps;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: wildcardCorsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get token from URL or body
    let publicToken: string | null = null;
    let tenantSlug: string | null = null;

    if (req.method === 'GET') {
      const url = new URL(req.url);
      publicToken = url.searchParams.get('token');
      tenantSlug = url.searchParams.get('tenant_slug');
    } else {
      const body = await req.json();
      publicToken = body.token;
      tenantSlug = body.tenant_slug;
    }

    if (!publicToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Access token is required' }),
        { status: 400, headers: { ...wildcardCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(publicToken)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token format' }),
        { status: 400, headers: { ...wildcardCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all data in a single optimized query with nested selects
    const { data: gatePass, error: fetchError } = await supabase
      .from('material_gate_passes')
      .select(`
        id,
        reference_number,
        status,
        pass_date,
        time_window_start,
        time_window_end,
        material_description,
        quantity,
        pass_type,
        vehicle_plate,
        driver_name,
        public_requester_name,
        public_requester_company,
        qr_code_token,
        qr_generated_at,
        rejection_reason,
        pm_approved_at,
        safety_approved_at,
        created_at,
        updated_at,
        tenant:tenants!material_gate_passes_tenant_id_fkey(id, slug, name, logo_url, brand_color),
        branch:branches!material_gate_passes_branch_id_fkey(id, name, address, google_maps_url),
        pm_approver:profiles!material_gate_passes_pm_approved_by_fkey(full_name),
        safety_approver:profiles!material_gate_passes_safety_approved_by_fkey(full_name)
      `)
      .eq('public_access_token', publicToken)
      .eq('is_public_request', true)
      .is('deleted_at', null)
      .single();

    if (fetchError || !gatePass) {
      console.error('Gate pass not found:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Gate pass not found or invalid token' }),
        { status: 404, headers: { ...wildcardCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Type assertions for nested objects
    const tenant = gatePass.tenant as { id: string; slug: string; name: string; logo_url: string | null; brand_color: string | null } | null;
    const branch = gatePass.branch as { id: string; name: string; address: string | null; google_maps_url: string | null } | null;
    const pmApprover = gatePass.pm_approver as { full_name: string } | null;
    const safetyApprover = gatePass.safety_approver as { full_name: string } | null;

    // Validate tenant slug if provided
    if (tenantSlug && tenant && tenant.slug !== tenantSlug) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token does not belong to this organization' }),
        { status: 403, headers: { ...wildcardCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get approved_at and approver name from the relevant approver
    const approvedAt = gatePass.safety_approved_at || gatePass.pm_approved_at || null;
    const approvedByName = safetyApprover?.full_name || pmApprover?.full_name || null;

    const response: PublicGatePassStatusResponse = {
      success: true,
      data: {
        id: gatePass.id,
        reference_number: gatePass.reference_number,
        status: gatePass.status,
        pass_date: gatePass.pass_date,
        time_window_start: gatePass.time_window_start,
        time_window_end: gatePass.time_window_end,
        material_description: gatePass.material_description,
        quantity: gatePass.quantity,
        pass_type: gatePass.pass_type,
        vehicle_plate: gatePass.vehicle_plate,
        driver_name: gatePass.driver_name,
        public_requester_name: gatePass.public_requester_name,
        public_requester_company: gatePass.public_requester_company,
        branch: branch ? {
          id: branch.id,
          name: branch.name,
          address: branch.address,
          google_maps_url: branch.google_maps_url,
        } : null,
        tenant: tenant ? {
          name: tenant.name,
          logo_url: tenant.logo_url,
          brand_color: tenant.brand_color,
        } : null,
        qr_code_token: gatePass.status === 'approved' ? gatePass.qr_code_token : null,
        qr_generated_at: gatePass.qr_generated_at,
        approved_at: approvedAt,
        approved_by_name: approvedByName,
        rejection_reason: gatePass.rejection_reason,
        created_at: gatePass.created_at,
        updated_at: gatePass.updated_at,
      },
    };

    return new Response(
      JSON.stringify({
        ...response,
        workflow_steps: getWorkflowStep(gatePass.status),
      }),
      { headers: { ...wildcardCorsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching public gate pass status:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...wildcardCorsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
