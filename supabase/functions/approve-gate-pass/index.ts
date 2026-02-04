import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendWhatsAppText } from '../_shared/whatsapp-provider.ts';
import { logNotificationSent } from '../_shared/notification-logger.ts';

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
        is_public_request,
        requested_by,
        public_requester_name,
        public_requester_phone,
        public_requester_email,
        public_access_token,
        branch_id,
        pass_date,
        material_description,
        project:contractor_projects(project_name, company_id),
        company:contractor_companies(company_name),
        branch:branches(name)
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
    // Public: pending_management -> approved (single-step for management roles)

    const isInternalRequest = gatePass.is_internal_request === true;
    const isPublicRequest = gatePass.is_public_request === true;

    // Additional role check for public requests
    const isGolfClubMgmt = roleCodes.includes('golf_club_mgmt') || roleCodes.includes('admin');
    const canApprovePublic = isGolfClubMgmt || isSecuritySupervisor || isDepartmentRep;

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
    // PUBLIC REQUEST PATH
    else if (isPublicRequest) {
      if (gatePass.status === 'pending_management' && canApprovePublic) {
        // Single-step approval for public requests -> APPROVED + generate QR
        const qrToken = 'GP-' + crypto.randomUUID().replace(/-/g, '').substring(0, 32);
        updateData = {
          pm_approved_by: user.id,
          pm_approved_at: now,
          pm_notes: approval_notes,
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
          JSON.stringify({ error: 'You are not authorized to approve this public gate pass' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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

    // Send notification to public requester if this is a public request
    if (isPublicRequest && gatePass.public_requester_phone) {
      try {
        const appUrl = Deno.env.get('APP_URL') || 'https://www.dhuud.com';

        // Get tenant info for branding
        const { data: tenant } = await supabase
          .from('tenants')
          .select('name, slug')
          .eq('id', tenant_id)
          .single();

        const trackingUrl = `${appUrl}/p/${tenant?.slug || ''}/gate-pass/status/${gatePass.public_access_token}`;
        const branchName = (gatePass.branch as any)?.name || 'the facility';

        let notificationMessage: string;

        if (newStatus === 'approved') {
          notificationMessage = `Your Gate Pass for ${tenant?.name || 'the facility'} is APPROVED!

Reference: ${gatePass.reference_number}
Location: ${branchName}
Date: ${gatePass.pass_date}

Show the QR code at the gate:
${trackingUrl}

Please arrive during your scheduled time window.`;
        } else if (newStatus === 'rejected') {
          notificationMessage = `Your Gate Pass request has been DECLINED.

Reference: ${gatePass.reference_number}
${approval_notes ? `Reason: ${approval_notes}` : ''}

Please contact ${tenant?.name || 'the facility'} for more information.`;
        } else {
          // Status update notification
          notificationMessage = `Gate Pass Update

Reference: ${gatePass.reference_number}
Status: ${newStatus.replace(/_/g, ' ').toUpperCase()}

Track your request:
${trackingUrl}`;
        }

        const whatsappResult = await sendWhatsAppText(
          gatePass.public_requester_phone,
          notificationMessage
        );

        if (whatsappResult.success) {
          console.log(`[Approve Gate Pass] Notification sent to public requester ${gatePass.public_requester_phone}`);

          await logNotificationSent({
            tenant_id,
            channel: 'whatsapp',
            provider: whatsappResult.provider,
            provider_message_id: whatsappResult.messageId || '',
            to_address: gatePass.public_requester_phone,
            template_name: newStatus === 'approved' ? 'public_gate_pass_approved' : 'public_gate_pass_rejected',
            status: 'pending',
            related_entity_type: 'material_gate_pass',
            related_entity_id: gate_pass_id,
            metadata: {
              reference_number: gatePass.reference_number,
              new_status: newStatus,
            }
          });
        } else {
          console.warn(`[Approve Gate Pass] Failed to send notification: ${whatsappResult.error}`);
        }
      } catch (notifError) {
        console.error('[Approve Gate Pass] Notification error:', notifError);
        // Don't fail the approval if notification fails
      }
    }

    const approvalPath = isPublicRequest ? 'public' : (isInternalRequest ? 'internal' : 'external');
    console.log(`Gate pass ${gatePass.reference_number} ${approval_action}ed by ${user.id} (${approvalPath} path)`);

    return new Response(
      JSON.stringify({
        success: true,
        reference_number: gatePass.reference_number,
        new_status: newStatus,
        approval_action,
        approved_by: user.id,
        approval_path: approvalPath,
        is_public_request: isPublicRequest,
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
