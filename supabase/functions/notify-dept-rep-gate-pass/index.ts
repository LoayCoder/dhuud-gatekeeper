import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, wrapEmailHtml, emailButton, getAppUrl } from "../_shared/email-sender.ts";
import { sendWhatsAppText } from "../_shared/whatsapp-provider.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotifyDeptRepPayload {
  gate_pass_id: string;
  project_id: string;
  tenant_id: string;
  reference_number: string;
  material_description: string;
  requester_name: string;
  pass_date: string;
  event_type: 'gate_pass_created' | 'gate_pass_approved' | 'gate_pass_rejected';
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
    
    const payload: NotifyDeptRepPayload = await req.json();
    const {
      gate_pass_id,
      project_id,
      tenant_id,
      reference_number,
      material_description,
      requester_name,
      pass_date,
      event_type,
    } = payload;

    console.log(`[notify-dept-rep-gate-pass] Processing ${event_type} for gate pass ${reference_number}`);

    // Get project details including department_id
    const { data: project, error: projectError } = await supabase
      .from('contractor_projects')
      .select('id, name, name_ar, department_id')
      .eq('id', project_id)
      .single();

    if (projectError || !project) {
      console.error('[notify-dept-rep-gate-pass] Failed to fetch project:', projectError);
      return new Response(
        JSON.stringify({ success: false, error: 'Project not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!project.department_id) {
      console.log('[notify-dept-rep-gate-pass] Project has no department_id, skipping notification');
      return new Response(
        JSON.stringify({ success: true, message: 'No department assigned to project' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all department representatives for this department
    const { data: deptReps, error: deptRepsError } = await supabase
      .rpc('get_all_department_representatives', { p_department_id: project.department_id });

    if (deptRepsError) {
      console.error('[notify-dept-rep-gate-pass] Failed to get dept reps:', deptRepsError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to get department representatives' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!deptReps || deptReps.length === 0) {
      console.log('[notify-dept-rep-gate-pass] No department representatives found');
      return new Response(
        JSON.stringify({ success: true, message: 'No department representatives to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[notify-dept-rep-gate-pass] Found ${deptReps.length} department representatives`);

    // Prepare notification content (bilingual)
    const truncatedMaterial = material_description?.substring(0, 50) || 'N/A';
    
    const notificationContent = {
      title: 'New Gate Pass Submitted',
      title_ar: 'تم تقديم تصريح دخول جديد',
      body: `Gate pass ${reference_number} submitted by ${requester_name} for ${project.name}. Materials: ${truncatedMaterial}`,
      body_ar: `تم تقديم تصريح الدخول ${reference_number} بواسطة ${requester_name} للمشروع ${project.name_ar || project.name}. المواد: ${truncatedMaterial}`,
    };

    const notificationResults = [];

    // Send notifications to each department representative
    for (const rep of deptReps) {
      const isArabic = rep.preferred_language === 'ar';
      
      try {
        // 1. Insert in-app notification
        const { error: notifError } = await supabase
          .from('user_notifications')
          .insert({
            user_id: rep.user_id,
            title: isArabic ? notificationContent.title_ar : notificationContent.title,
            body: isArabic ? notificationContent.body_ar : notificationContent.body,
            type: 'gate_pass',
            data: {
              gate_pass_id,
              project_id,
              reference_number,
              event_type,
              deep_link: '/dept-gate-passes',
            },
            is_read: false,
          });

        if (notifError) {
          console.error(`[notify-dept-rep-gate-pass] Failed to insert notification for ${rep.user_id}:`, notifError);
        }

        // 2. Send push notification via existing edge function
        try {
          await supabase.functions.invoke('send-push-notification', {
            body: {
              user_id: rep.user_id,
              title: isArabic ? notificationContent.title_ar : notificationContent.title,
              body: isArabic ? notificationContent.body_ar : notificationContent.body,
              data: {
                type: 'gate_pass',
                gate_pass_id,
                url: '/dept-gate-passes',
              },
            },
          });
        } catch (pushErr) {
          console.error(`[notify-dept-rep-gate-pass] Push notification failed for ${rep.user_id}:`, pushErr);
        }

        // 3. Send email notification
        if (rep.email) {
          try {
            const appUrl = getAppUrl();
            const emailHtml = wrapEmailHtml(`
              <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h2 style="color: white; margin: 0;">${isArabic ? notificationContent.title_ar : notificationContent.title}</h2>
              </div>
              <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
                <p>${isArabic ? notificationContent.body_ar : notificationContent.body}</p>
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                  <tr><td style="padding: 8px 0; color: #6b7280;">${isArabic ? 'المرجع' : 'Reference'}:</td><td style="padding: 8px 0; font-weight: 600;">${reference_number}</td></tr>
                  <tr><td style="padding: 8px 0; color: #6b7280;">${isArabic ? 'مقدم الطلب' : 'Requester'}:</td><td style="padding: 8px 0;">${requester_name}</td></tr>
                  <tr><td style="padding: 8px 0; color: #6b7280;">${isArabic ? 'المشروع' : 'Project'}:</td><td style="padding: 8px 0;">${isArabic ? (project.name_ar || project.name) : project.name}</td></tr>
                  <tr><td style="padding: 8px 0; color: #6b7280;">${isArabic ? 'التاريخ' : 'Date'}:</td><td style="padding: 8px 0;">${pass_date}</td></tr>
                  <tr><td style="padding: 8px 0; color: #6b7280;">${isArabic ? 'المواد' : 'Materials'}:</td><td style="padding: 8px 0;">${truncatedMaterial}</td></tr>
                </table>
                ${emailButton(isArabic ? 'مراجعة التصريح' : 'Review Gate Pass', `${appUrl}/dept-gate-passes`, '#1e40af', isArabic)}
              </div>
            `, isArabic ? 'ar' : 'en');
            const emailResult = await sendEmail({
              to: rep.email,
              subject: `${isArabic ? 'تصريح دخول جديد' : 'New Gate Pass'} - ${reference_number}`,
              html: emailHtml,
              module: 'visitor_alert',
            });
            if (emailResult.success) {
              console.log(`[notify-dept-rep-gate-pass] Email sent to ${rep.email}`);
            } else {
              console.error(`[notify-dept-rep-gate-pass] Email failed for ${rep.email}: ${emailResult.error}`);
            }
          } catch (emailErr) {
            console.error(`[notify-dept-rep-gate-pass] Email error for ${rep.user_id}:`, emailErr);
          }
        }

        // 4. Send WhatsApp notification
        if (rep.phone_number) {
          try {
            const waMsg = isArabic
              ? `🆕 *تصريح دخول جديد*\n\n📋 المرجع: ${reference_number}\n👤 مقدم الطلب: ${requester_name}\n📦 المواد: ${truncatedMaterial}\n📅 التاريخ: ${pass_date}\n🏗️ المشروع: ${project.name_ar || project.name}\n\n⚡ يرجى مراجعة الطلب.`
              : `🆕 *New Gate Pass Submitted*\n\n📋 Reference: ${reference_number}\n👤 Requester: ${requester_name}\n📦 Materials: ${truncatedMaterial}\n📅 Date: ${pass_date}\n🏗️ Project: ${project.name}\n\n⚡ Please review and take action.`;
            const waResult = await sendWhatsAppText(rep.phone_number, waMsg);
            if (waResult.success) {
              console.log(`[notify-dept-rep-gate-pass] WhatsApp sent to ${rep.phone_number}`);
            } else {
              console.error(`[notify-dept-rep-gate-pass] WhatsApp failed for ${rep.phone_number}: ${waResult.error}`);
            }
          } catch (waErr) {
            console.error(`[notify-dept-rep-gate-pass] WhatsApp error for ${rep.user_id}:`, waErr);
          }
        }

        // 5. Log to auto_notification_logs for audit trail
        await supabase
          .from('auto_notification_logs')
          .insert({
            tenant_id,
            notification_type: 'gate_pass_submitted',
            recipient_id: rep.user_id,
            recipient_email: rep.email,
            channel: 'in_app',
            status: notifError ? 'failed' : 'sent',
            payload: {
              gate_pass_id,
              reference_number,
              project_name: project.name,
              requester_name,
              event_type,
            },
            error_message: notifError?.message || null,
          });

        notificationResults.push({
          user_id: rep.user_id,
          success: !notifError,
        });

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[notify-dept-rep-gate-pass] Error notifying ${rep.user_id}:`, err);
        notificationResults.push({
          user_id: rep.user_id,
          success: false,
          error: errorMessage,
        });
      }
    }

    const successCount = notificationResults.filter(r => r.success).length;
    console.log(`[notify-dept-rep-gate-pass] Sent ${successCount}/${deptReps.length} notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        total: deptReps.length,
        results: notificationResults,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[notify-dept-rep-gate-pass] Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
