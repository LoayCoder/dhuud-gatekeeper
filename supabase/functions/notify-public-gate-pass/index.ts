import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWaSenderTextMessage } from "../_shared/wasender-whatsapp.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotifyPublicGatePassPayload {
  gate_pass_id: string;
  tenant_id: string;
  branch_id?: string;
  reference_number: string;
  requester_name: string;
  requester_phone: string;
  requester_email?: string;
  requester_company?: string;
  material_description: string;
  pass_date: string;
  tracking_url: string;
  event_type: 'submitted' | 'approved' | 'rejected' | 'acknowledged';
  rejection_reason?: string;
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

    const payload: NotifyPublicGatePassPayload = await req.json();
    const {
      gate_pass_id,
      tenant_id,
      branch_id,
      reference_number,
      requester_name,
      requester_phone,
      requester_email,
      requester_company,
      material_description,
      pass_date,
      tracking_url,
      event_type,
      rejection_reason,
    } = payload;

    console.log(`[notify-public-gate-pass] Processing ${event_type} for gate pass ${reference_number}`);

    // Get tenant details
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, slug')
      .eq('id', tenant_id)
      .single();

    if (tenantError || !tenant) {
      console.error('[notify-public-gate-pass] Failed to fetch tenant:', tenantError);
      return new Response(
        JSON.stringify({ success: false, error: 'Tenant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get branch details if available
    let branchName = '';
    if (branch_id) {
      const { data: branch } = await supabase
        .from('branches')
        .select('name')
        .eq('id', branch_id)
        .single();
      branchName = branch?.name || '';
    }

    const results: { type: string; success: boolean; error?: string }[] = [];
    const fullTrackingUrl = `${Deno.env.get('SITE_URL')!}${tracking_url}`;
    const truncatedMaterial = material_description?.substring(0, 100) || 'N/A';

    // Send notifications based on event type
    if (event_type === 'submitted') {
      // 1. Send confirmation to requester via WhatsApp
      const requesterMessage = `
*${tenant.name} - Gate Pass Submitted*

Your gate pass request has been received.

Reference: ${reference_number}
Date: ${pass_date}
Materials: ${truncatedMaterial}
${branchName ? `Location: ${branchName}` : ''}

Track status: ${fullTrackingUrl}

You will be notified when your request is reviewed.
`.trim();

      const requesterResult = await sendWaSenderTextMessage(requester_phone, requesterMessage);
      results.push({
        type: 'requester_whatsapp',
        success: requesterResult.success,
        error: requesterResult.error,
      });

      // 2. Notify staff with golf_club_mgmt role for the branch
      const { data: staffUsers, error: staffError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          mobile_number,
          preferred_language,
          user_roles!inner(role)
        `)
        .eq('tenant_id', tenant_id)
        .eq('user_roles.role', 'golf_club_mgmt')
        .eq('is_active', true);

      if (staffError) {
        console.error('[notify-public-gate-pass] Failed to get staff:', staffError);
      }

      // Filter by branch if specified
      let filteredStaff = staffUsers || [];
      if (branch_id && filteredStaff.length > 0) {
        // Get users assigned to this branch
        const { data: branchAssignments } = await supabase
          .from('user_branch_assignments')
          .select('user_id')
          .eq('branch_id', branch_id);

        const branchUserIds = new Set((branchAssignments || []).map(a => a.user_id));

        // Also include users directly assigned to the branch
        const { data: directAssigned } = await supabase
          .from('profiles')
          .select('id')
          .eq('assigned_branch_id', branch_id)
          .eq('is_active', true);

        (directAssigned || []).forEach(u => branchUserIds.add(u.id));

        if (branchUserIds.size > 0) {
          filteredStaff = filteredStaff.filter(s => branchUserIds.has(s.id));
        }
      }

      console.log(`[notify-public-gate-pass] Found ${filteredStaff.length} staff to notify`);

      for (const staff of filteredStaff) {
        if (!staff.mobile_number) continue;

        const isArabic = staff.preferred_language === 'ar';
        const staffMessage = isArabic
          ? `
*طلب تصريح دخول جديد*

المرجع: ${reference_number}
مقدم الطلب: ${requester_name}
${requester_company ? `الشركة: ${requester_company}` : ''}
المواد: ${truncatedMaterial}
التاريخ: ${pass_date}
${branchName ? `الموقع: ${branchName}` : ''}

يرجى مراجعة الطلب في لوحة التحكم.
`.trim()
          : `
*New Public Gate Pass Request*

Reference: ${reference_number}
Requester: ${requester_name}
${requester_company ? `Company: ${requester_company}` : ''}
Materials: ${truncatedMaterial}
Date: ${pass_date}
${branchName ? `Location: ${branchName}` : ''}

Please review in the dashboard.
`.trim();

        const staffResult = await sendWaSenderTextMessage(staff.mobile_number, staffMessage);
        results.push({
          type: `staff_whatsapp_${staff.id}`,
          success: staffResult.success,
          error: staffResult.error,
        });

        // Also create in-app notification
        await supabase
          .from('user_notifications')
          .insert({
            user_id: staff.id,
            title: isArabic ? 'طلب تصريح دخول عام جديد' : 'New Public Gate Pass Request',
            body: isArabic
              ? `طلب جديد ${reference_number} من ${requester_name}`
              : `New request ${reference_number} from ${requester_name}`,
            type: 'gate_pass',
            data: {
              gate_pass_id,
              reference_number,
              requester_name,
              event_type: 'public_submitted',
              deep_link: '/dept-gate-passes',
            },
            is_read: false,
          });
      }

    } else if (event_type === 'approved') {
      // Send approval notification to requester
      const approvalMessage = `
*${tenant.name} - Gate Pass Approved*

Great news! Your gate pass has been approved.

Reference: ${reference_number}
Date: ${pass_date}

View your digital pass with QR code:
${fullTrackingUrl}

Please show this QR code at the gate.
`.trim();

      const approvalResult = await sendWaSenderTextMessage(requester_phone, approvalMessage);
      results.push({
        type: 'approval_whatsapp',
        success: approvalResult.success,
        error: approvalResult.error,
      });

    } else if (event_type === 'rejected') {
      // Send rejection notification to requester
      const rejectionMessage = `
*${tenant.name} - Gate Pass Request Declined*

Unfortunately, your gate pass request has been declined.

Reference: ${reference_number}
${rejection_reason ? `Reason: ${rejection_reason}` : ''}

You may submit a new request if needed.
`.trim();

      const rejectionResult = await sendWaSenderTextMessage(requester_phone, rejectionMessage);
      results.push({
        type: 'rejection_whatsapp',
        success: rejectionResult.success,
        error: rejectionResult.error,
      });

    } else if (event_type === 'acknowledged') {
      // Send acknowledgment notification to requester
      const ackMessage = `
*${tenant.name} - Request Acknowledged*

Your gate pass request has been acknowledged by management.

Reference: ${reference_number}

We will notify you once it's approved.

Track status: ${fullTrackingUrl}
`.trim();

      const ackResult = await sendWaSenderTextMessage(requester_phone, ackMessage);
      results.push({
        type: 'acknowledgment_whatsapp',
        success: ackResult.success,
        error: ackResult.error,
      });
    }

    // Log all notification attempts
    for (const result of results) {
      await supabase
        .from('auto_notification_logs')
        .insert({
          tenant_id,
          notification_type: `public_gate_pass_${event_type}`,
          recipient_id: null, // Public user, no internal ID
          recipient_email: requester_email || null,
          channel: 'whatsapp',
          status: result.success ? 'sent' : 'failed',
          payload: {
            gate_pass_id,
            reference_number,
            requester_name,
            requester_phone,
            event_type,
            notification_type: result.type,
          },
          error_message: result.error || null,
        });
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[notify-public-gate-pass] Sent ${successCount}/${results.length} notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        total: results.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[notify-public-gate-pass] Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
