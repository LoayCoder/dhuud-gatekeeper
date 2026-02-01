import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApprovalRequest {
  gate_pass_id: string;
  approval_action: 'approve' | 'reject';
  approval_notes?: string;
  tenant_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { gate_pass_id, approval_action, approval_notes, tenant_id }: ApprovalRequest = await req.json();

    if (!gate_pass_id || !approval_action || !tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get gate pass details - use main status column as single source of truth
    const { data: gatePass, error: passError } = await supabase
      .from('material_gate_passes')
      .select(`
        id,
        reference_number,
        status,
        is_internal_request,
        requested_by,
        project:contractor_projects(project_name, company_id),
        company:contractor_companies(company_name)
      `)
      .eq('id', gate_pass_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (passError || !gatePass) {
      console.error('Gate pass not found:', passError);
      return new Response(
        JSON.stringify({ error: 'Gate pass not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent self-approval
    if (gatePass.requested_by === user.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot approve your own request' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine which approval stage this is
    let updateData: Record<string, any> = {};
    let newStatus = gatePass.status;
    const now = new Date().toISOString();

    // Check user's role to determine which approval they can give
    const { data: userRoles } = await supabase
      .from('user_role_assignments')
      .select('role:roles(code)')
      .eq('user_id', user.id);

    const roleCodes = userRoles?.map(r => (r.role as any)?.code) || [];

    // Role checks for dual-path approval
    const isContractorConsultant = roleCodes.includes('contractor_consultant') || roleCodes.includes('admin');
    const isSecuritySupervisor = roleCodes.includes('hsse_officer') ||
                                  roleCodes.includes('hsse_manager') ||
                                  roleCodes.includes('security_supervisor') ||
                                  roleCodes.includes('admin');
    const isDepartmentRep = roleCodes.includes('department_representative') || roleCodes.includes('admin');

    // UNIFIED APPROVAL LOGIC using main status column
    // External: pending_contractor_approval -> pending_dept_ack -> approved
    // Internal: pending_dept_approval -> pending_security_approval -> approved

    const isInternalRequest = gatePass.is_internal_request === true;

    // Handle rejection (universal for all stages)
    if (approval_action === 'reject') {
      updateData = {
        status: 'rejected',
        rejected_by: user.id,
        rejected_at: now,
        rejection_reason: approval_notes,
      };
      newStatus = 'rejected';
    }
    // INTERNAL PATH
    else if (isInternalRequest) {
      if (gatePass.status === 'pending_dept_approval' && isDepartmentRep) {
        // Stage 1: Dept Rep approval -> move to security
        updateData = {
          pm_approved_by: user.id,
          pm_approved_at: now,
          pm_notes: approval_notes,
          status: 'pending_security_approval',
        };
        newStatus = 'pending_security_approval';
      } else if (gatePass.status === 'pending_security_approval' && isSecuritySupervisor) {
        // Stage 2: Security approval -> APPROVED + generate QR
        const qrToken = 'GP-' + crypto.randomUUID().replace(/-/g, '').substring(0, 32);
        updateData = {
          security_approved_by: user.id,
          security_approved_at: now,
          security_approval_notes: approval_notes,
          // Set legacy fields for backward compatibility
          safety_approved_by: user.id,
          safety_approved_at: now,
          safety_notes: approval_notes,
          status: 'approved',
          qr_code_token: qrToken,
          qr_generated_at: now,
        };
        newStatus = 'approved';
      } else {
        return new Response(
          JSON.stringify({ error: 'You are not authorized to approve this gate pass at this stage' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    // EXTERNAL PATH
    else {
      if (gatePass.status === 'pending_contractor_approval' && isContractorConsultant) {
        // Stage 1: Contractor Consultant approval -> move to dept ack
        updateData = {
          contractor_approved_by: user.id,
          contractor_approved_at: now,
          contractor_approval_notes: approval_notes,
          status: 'pending_dept_ack',
        };
        newStatus = 'pending_dept_ack';
      } else if (gatePass.status === 'pending_dept_ack' && isDepartmentRep) {
        // Stage 2: Dept Rep acknowledgment -> APPROVED + generate QR
        const qrToken = 'GP-' + crypto.randomUUID().replace(/-/g, '').substring(0, 32);
        updateData = {
          pm_approved_by: user.id,
          pm_approved_at: now,
          pm_notes: approval_notes,
          // Set legacy fields for backward compatibility
          safety_approved_by: user.id,
          safety_approved_at: now,
          safety_notes: approval_notes,
          status: 'approved',
          qr_code_token: qrToken,
          qr_generated_at: now,
        };
        newStatus = 'approved';
      } else if (gatePass.status === 'pending_security_approval' && isSecuritySupervisor) {
        // Stage 2 alt: Security approval (legacy external path)
        const qrToken = 'GP-' + crypto.randomUUID().replace(/-/g, '').substring(0, 32);
        updateData = {
          security_approved_by: user.id,
          security_approved_at: now,
          security_approval_notes: approval_notes,
          safety_approved_by: user.id,
          safety_approved_at: now,
          safety_notes: approval_notes,
          status: 'approved',
          qr_code_token: qrToken,
          qr_generated_at: now,
        };
        newStatus = 'approved';
      } else {
        return new Response(
          JSON.stringify({ error: 'You are not authorized to approve this gate pass at this stage' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update gate pass
    const { error: updateError } = await supabase
      .from('material_gate_passes')
      .update(updateData)
      .eq('id', gate_pass_id);

    if (updateError) {
      console.error('Error updating gate pass:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update gate pass' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the approval
    await supabase.from('contractor_module_audit_logs').insert({
      tenant_id,
      entity_type: 'material_gate_pass',
      entity_id: gate_pass_id,
      action: `gate_pass_${approval_action}ed`,
      actor_id: user.id,
      old_value: { status: gatePass.status },
      new_value: { status: newStatus, notes: approval_notes },
    });

    console.log(`Gate pass ${gatePass.reference_number} ${approval_action}ed by ${user.id} (${isInternalRequest ? 'internal' : 'external'} path)`);

    return new Response(
      JSON.stringify({
        success: true,
        reference_number: gatePass.reference_number,
        new_status: newStatus,
        approval_action,
        approved_by: user.id,
        approval_path: isInternalRequest ? 'internal' : 'external',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error approving gate pass:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
