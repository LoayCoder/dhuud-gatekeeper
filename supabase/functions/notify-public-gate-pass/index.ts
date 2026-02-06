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
  public_access_token?: string;
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
      public_access_token,
    } = payload;

    console.log(`[notify-public-gate-pass] Processing ${event_type} for gate pass ${reference_number}`);
    console.log(`[notify-public-gate-pass] Tenant ID: ${tenant_id}, Branch ID: ${branch_id}`);

    // Get tenant details including custom domain
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, slug, public_gate_pass_domain')
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
    // Prioritize tenant's configured custom domain for tracking URLs
    const siteUrl = tenant.public_gate_pass_domain 
      || Deno.env.get('SITE_URL') 
      || `https://${tenant.slug}.lovable.app`;
    const fullTrackingUrl = tracking_url.startsWith('http') ? tracking_url : `${siteUrl}${tracking_url}`;
    const truncatedMaterial = material_description?.substring(0, 100) || 'N/A';

    // Send notifications based on event type
    if (event_type === 'submitted') {
      // 1. Send confirmation to requester via WhatsApp (Bilingual)
      const requesterMessage = `
✅ *${tenant.name} - طلب تصريح جديد*
✅ *${tenant.name} - Gate Pass Submitted*

تم استلام طلبك بنجاح.
Your gate pass request has been received.

📋 المرجع | Reference: ${reference_number}
📅 التاريخ | Date: ${pass_date}
📦 المواد | Materials: ${truncatedMaterial}
${branchName ? `📍 الموقع | Location: ${branchName}` : ''}

⏳ *في انتظار | Pending with:*
إدارة النادي | Golf Club Management

🔗 *تتبع الحالة | Track status:*
${fullTrackingUrl}

سيتم إشعارك عند مراجعة طلبك.
You will be notified when your request is reviewed.
`.trim();

      const requesterResult = await sendWaSenderTextMessage(requester_phone, requesterMessage);
      results.push({
        type: 'requester_whatsapp',
        success: requesterResult.success,
        error: requesterResult.error,
      });
      console.log(`[notify-public-gate-pass] Requester notification: ${requesterResult.success ? 'sent' : 'failed'}`);

      // 2. Find Golf Club Management department for this tenant
      const { data: golfClubDepts, error: deptError } = await supabase
        .from('departments')
        .select('id, name')
        .eq('tenant_id', tenant_id)
        .or("name.eq.Golf Club Management,name.ilike.%golf%club%management%")
        .is('deleted_at', null);

      if (deptError) {
        console.error('[notify-public-gate-pass] Failed to fetch departments:', deptError);
      }

      console.log(`[notify-public-gate-pass] Found ${golfClubDepts?.length || 0} Golf Club Management departments`);

      if (golfClubDepts && golfClubDepts.length > 0) {
        const deptIds = golfClubDepts.map(d => d.id);
        
        // 3. Get staff with department_representative or department_manager role in Golf Club Management
        // Using the correct role assignment schema: user_role_assignments -> roles
        const { data: roleAssignments, error: roleError } = await supabase
          .from('user_role_assignments')
          .select(`
            user_id,
            roles!inner(code)
          `)
          .eq('tenant_id', tenant_id);

        if (roleError) {
          console.error('[notify-public-gate-pass] Failed to fetch role assignments:', roleError);
        }

        // Filter for department representatives/managers
        const repManagerUserIds = (roleAssignments || [])
          .filter((item: { roles: { code: string } }) => {
            const roleCode = item.roles?.code;
            return roleCode === 'department_representative' || roleCode === 'department_manager';
          })
          .map((item: { user_id: string }) => item.user_id);

        console.log(`[notify-public-gate-pass] Found ${repManagerUserIds.length} users with rep/manager roles`);

        if (repManagerUserIds.length > 0) {
          // Get profiles of these users who are assigned to Golf Club Management department
          const { data: staffUsers, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, phone_number, preferred_language, assigned_department_id')
            .in('id', repManagerUserIds)
            .in('assigned_department_id', deptIds)
            .eq('is_active', true)
            .is('deleted_at', null);

          if (profileError) {
            console.error('[notify-public-gate-pass] Failed to fetch staff profiles:', profileError);
          }

          console.log(`[notify-public-gate-pass] Found ${staffUsers?.length || 0} Golf Club Management staff to notify`);

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

            // Only filter if we found branch-specific assignments
            if (branchUserIds.size > 0) {
              const branchFilteredStaff = filteredStaff.filter(s => branchUserIds.has(s.id));
              // Use branch-filtered if any match, otherwise use all Golf Club Management staff
              if (branchFilteredStaff.length > 0) {
                filteredStaff = branchFilteredStaff;
              }
            }
          }

          console.log(`[notify-public-gate-pass] Notifying ${filteredStaff.length} staff after branch filtering`);

          for (const staff of filteredStaff) {
            if (!staff.phone_number) {
              console.log(`[notify-public-gate-pass] Staff ${staff.full_name} has no phone number, skipping`);
              continue;
            }

            const isArabic = staff.preferred_language === 'ar';
            const staffMessage = isArabic
              ? `
🆕 *طلب تصريح دخول عام جديد*

📋 المرجع: ${reference_number}
👤 مقدم الطلب: ${requester_name}
${requester_company ? `🏢 الشركة: ${requester_company}` : ''}
📦 المواد: ${truncatedMaterial}
📅 التاريخ: ${pass_date}
${branchName ? `📍 الموقع: ${branchName}` : ''}

⚡ يرجى مراجعة الطلب واتخاذ الإجراء المناسب.
`.trim()
              : `
🆕 *New Public Gate Pass Request*

📋 Reference: ${reference_number}
👤 Requester: ${requester_name}
${requester_company ? `🏢 Company: ${requester_company}` : ''}
📦 Materials: ${truncatedMaterial}
📅 Date: ${pass_date}
${branchName ? `📍 Location: ${branchName}` : ''}

⚡ Please review and take appropriate action.
`.trim();

            const staffResult = await sendWaSenderTextMessage(staff.phone_number, staffMessage);
            results.push({
              type: `staff_whatsapp_${staff.id}`,
              success: staffResult.success,
              error: staffResult.error,
            });
            console.log(`[notify-public-gate-pass] Staff ${staff.full_name} (${staff.phone_number}) notification: ${staffResult.success ? 'sent' : 'failed'}`);

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
        }
      }

    } else if (event_type === 'approved') {
      // Generate PDF URL for approved passes
      const pdfUrl = `${supabaseUrl}/functions/v1/generate-public-gate-pass-pdf?token=${public_access_token || ''}&tenant=${tenant.slug}`;
      
      // Send approval notification to requester (Bilingual with PDF link)
      const approvalMessage = `
🎉 *${tenant.name} - تمت الموافقة على التصريح*
🎉 *${tenant.name} - Gate Pass APPROVED*

تمت الموافقة على طلب تصريح المرور الخاص بك.
Great news! Your gate pass has been approved.

📋 المرجع | Reference: ${reference_number}
📅 تاريخ الصلاحية | Valid Date: ${pass_date}
${branchName ? `📍 الموقع | Location: ${branchName}` : ''}

📱 *عرض التصريح مع رمز QR | View pass with QR code:*
${fullTrackingUrl}

📄 *تحميل PDF للطباعة | Download PDF:*
${pdfUrl}

⚠️ قدم رمز QR أو PDF عند بوابة الأمن.
⚠️ Show QR code or PDF at the security gate.
`.trim();

      const approvalResult = await sendWaSenderTextMessage(requester_phone, approvalMessage);
      results.push({
        type: 'approval_whatsapp',
        success: approvalResult.success,
        error: approvalResult.error,
      });

    } else if (event_type === 'rejected') {
      // Send rejection notification to requester (Bilingual)
      const rejectionMessage = `
❌ *${tenant.name} - تم رفض الطلب*
❌ *${tenant.name} - Request Declined*

للأسف، تم رفض طلب تصريح المرور الخاص بك.
Unfortunately, your gate pass request has been declined.

📋 المرجع | Reference: ${reference_number}
${rejection_reason ? `📝 السبب | Reason: ${rejection_reason}` : ''}

يمكنك تقديم طلب جديد إذا لزم الأمر.
You may submit a new request if needed.
`.trim();

      const rejectionResult = await sendWaSenderTextMessage(requester_phone, rejectionMessage);
      results.push({
        type: 'rejection_whatsapp',
        success: rejectionResult.success,
        error: rejectionResult.error,
      });

    } else if (event_type === 'acknowledged') {
      // Send acknowledgment notification to requester (Bilingual)
      const ackMessage = `
✅ *${tenant.name} - تم استلام الطلب*
✅ *${tenant.name} - Request Acknowledged*

تم استلام طلب تصريح المرور الخاص بك من قبل الإدارة.
Your gate pass request has been acknowledged by management.

📋 المرجع | Reference: ${reference_number}

⏳ *في انتظار | Pending with:*
الأمن | Security

سيتم إشعارك عند الموافقة.
We will notify you once it's approved.

🔗 *تتبع الحالة | Track status:*
${fullTrackingUrl}
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
