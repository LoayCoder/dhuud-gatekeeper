import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeptRepProfile {
  id: string;
  email: string;
  full_name: string;
  preferred_language: string;
  assigned_department_id: string;
  dept_digest_opt_in: boolean;
  dept_digest_frequency: string;
  digest_preferred_time: string;
  digest_timezone: string;
  tenant_id: string;
}

interface GatePassStats {
  total_submitted: number;
  pending_approval: number;
  approved: number;
  rejected: number;
  completed: number;
}

interface PendingGatePass {
  id: string;
  reference_number: string;
  project_name: string;
  requester_name: string;
  material_description: string;
  pass_date: string;
  created_at: string;
}

interface UpcomingPass {
  pass_date: string;
  pass_count: number;
  top_project: string;
}

interface Department {
  id: string;
  name: string;
  name_ar: string;
}

const formatDate = (dateStr: string, lang: string): string => {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  };
  return date.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', options);
};

const formatRelativeTime = (dateStr: string, lang: string): string => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffHours < 1) {
    return lang === 'ar' ? 'منذ أقل من ساعة' : 'Less than 1 hour ago';
  } else if (diffHours < 24) {
    return lang === 'ar' ? `منذ ${diffHours} ساعة` : `${diffHours} hrs ago`;
  } else {
    const diffDays = Math.floor(diffHours / 24);
    return lang === 'ar' ? `منذ ${diffDays} يوم` : `${diffDays} days ago`;
  }
};

const generateEmailHtml = (
  deptName: string,
  stats: GatePassStats,
  pendingPasses: PendingGatePass[],
  upcomingPasses: UpcomingPass[],
  lang: string,
  dashboardUrl: string
): string => {
  const isArabic = lang === 'ar';
  const dir = isArabic ? 'rtl' : 'ltr';
  const textAlign = isArabic ? 'right' : 'left';
  
  const labels = isArabic ? {
    subject: `📊 الملخص اليومي لتصاريح الدخول - ${deptName}`,
    summary: 'ملخص',
    newSubmissions: 'طلبات جديدة',
    pendingApproval: 'بانتظار موافقتك',
    approvedYesterday: 'تمت الموافقة أمس',
    rejectedYesterday: 'تم الرفض أمس',
    pendingTitle: 'الموافقات المعلقة',
    reference: 'المرجع',
    project: 'المشروع',
    requester: 'مقدم الطلب',
    submitted: 'تاريخ التقديم',
    upcomingTitle: 'التصاريح القادمة (7 أيام)',
    date: 'التاريخ',
    count: 'العدد',
    topProject: 'أعلى مشروع',
    noActivity: 'لا يوجد نشاط لتصاريح الدخول في قسمك أمس.',
    viewDashboard: 'فتح لوحة تصاريح الدخول',
    noPending: 'لا توجد موافقات معلقة',
    noUpcoming: 'لا توجد تصاريح قادمة',
  } : {
    subject: `📊 Daily Gate Pass Digest - ${deptName}`,
    summary: 'Summary',
    newSubmissions: 'New Submissions',
    pendingApproval: 'Pending Your Approval',
    approvedYesterday: 'Approved Yesterday',
    rejectedYesterday: 'Rejected Yesterday',
    pendingTitle: 'Pending Approvals',
    reference: 'Reference',
    project: 'Project',
    requester: 'Requester',
    submitted: 'Submitted',
    upcomingTitle: 'Upcoming Passes (Next 7 Days)',
    date: 'Date',
    count: 'Count',
    topProject: 'Top Project',
    noActivity: 'No gate pass activity in your department yesterday.',
    viewDashboard: 'Open Gate Pass Dashboard',
    noPending: 'No pending approvals',
    noUpcoming: 'No upcoming passes',
  };

  const hasActivity = stats.total_submitted > 0 || stats.pending_approval > 0;

  return `
<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${labels.subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; direction: ${dir};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%); padding: 30px 40px; text-align: ${textAlign};">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">📊 ${isArabic ? 'الملخص اليومي' : 'Daily Digest'}</h1>
              <p style="color: #bee3f8; margin: 8px 0 0 0; font-size: 16px;">${deptName}</p>
              <p style="color: #90cdf4; margin: 4px 0 0 0; font-size: 14px;">${formatDate(new Date().toISOString(), lang)}</p>
            </td>
          </tr>

          ${!hasActivity ? `
          <!-- No Activity -->
          <tr>
            <td style="padding: 40px; text-align: center;">
              <p style="color: #718096; font-size: 16px; margin: 0;">✨ ${labels.noActivity}</p>
            </td>
          </tr>
          ` : `
          <!-- Summary Stats -->
          <tr>
            <td style="padding: 30px 40px;">
              <h2 style="color: #2d3748; font-size: 18px; margin: 0 0 20px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; text-align: ${textAlign};">📈 ${labels.summary}</h2>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="25%" style="text-align: center; padding: 15px;">
                    <div style="background: #ebf8ff; border-radius: 8px; padding: 15px;">
                      <p style="color: #2b6cb0; font-size: 28px; font-weight: bold; margin: 0;">${stats.total_submitted}</p>
                      <p style="color: #4a5568; font-size: 12px; margin: 5px 0 0 0;">${labels.newSubmissions}</p>
                    </div>
                  </td>
                  <td width="25%" style="text-align: center; padding: 15px;">
                    <div style="background: #fef3c7; border-radius: 8px; padding: 15px;">
                      <p style="color: #d97706; font-size: 28px; font-weight: bold; margin: 0;">${stats.pending_approval}</p>
                      <p style="color: #4a5568; font-size: 12px; margin: 5px 0 0 0;">${labels.pendingApproval}</p>
                    </div>
                  </td>
                  <td width="25%" style="text-align: center; padding: 15px;">
                    <div style="background: #c6f6d5; border-radius: 8px; padding: 15px;">
                      <p style="color: #22543d; font-size: 28px; font-weight: bold; margin: 0;">${stats.approved}</p>
                      <p style="color: #4a5568; font-size: 12px; margin: 5px 0 0 0;">${labels.approvedYesterday}</p>
                    </div>
                  </td>
                  <td width="25%" style="text-align: center; padding: 15px;">
                    <div style="background: #fed7d7; border-radius: 8px; padding: 15px;">
                      <p style="color: #c53030; font-size: 28px; font-weight: bold; margin: 0;">${stats.rejected}</p>
                      <p style="color: #4a5568; font-size: 12px; margin: 5px 0 0 0;">${labels.rejectedYesterday}</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Pending Approvals -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <h2 style="color: #2d3748; font-size: 18px; margin: 0 0 15px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; text-align: ${textAlign};">🔔 ${labels.pendingTitle}</h2>
              ${pendingPasses.length === 0 ? `
                <p style="color: #a0aec0; font-style: italic; text-align: ${textAlign};">${labels.noPending}</p>
              ` : `
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                  <tr style="background-color: #f7fafc;">
                    <th style="padding: 12px; text-align: ${textAlign}; font-size: 12px; color: #4a5568; border-bottom: 1px solid #e2e8f0;">${labels.reference}</th>
                    <th style="padding: 12px; text-align: ${textAlign}; font-size: 12px; color: #4a5568; border-bottom: 1px solid #e2e8f0;">${labels.project}</th>
                    <th style="padding: 12px; text-align: ${textAlign}; font-size: 12px; color: #4a5568; border-bottom: 1px solid #e2e8f0;">${labels.requester}</th>
                    <th style="padding: 12px; text-align: ${textAlign}; font-size: 12px; color: #4a5568; border-bottom: 1px solid #e2e8f0;">${labels.submitted}</th>
                  </tr>
                  ${pendingPasses.slice(0, 5).map((pass, idx) => `
                    <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f7fafc'};">
                      <td style="padding: 12px; font-size: 13px; color: #2d3748; border-bottom: 1px solid #e2e8f0;">${pass.reference_number}</td>
                      <td style="padding: 12px; font-size: 13px; color: #2d3748; border-bottom: 1px solid #e2e8f0;">${pass.project_name || '-'}</td>
                      <td style="padding: 12px; font-size: 13px; color: #2d3748; border-bottom: 1px solid #e2e8f0;">${pass.requester_name || '-'}</td>
                      <td style="padding: 12px; font-size: 13px; color: #718096; border-bottom: 1px solid #e2e8f0;">${formatRelativeTime(pass.created_at, lang)}</td>
                    </tr>
                  `).join('')}
                </table>
                ${pendingPasses.length > 5 ? `<p style="color: #718096; font-size: 12px; margin-top: 10px; text-align: ${textAlign};">+${pendingPasses.length - 5} more...</p>` : ''}
              `}
            </td>
          </tr>

          <!-- Upcoming Passes -->
          ${upcomingPasses.length > 0 ? `
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <h2 style="color: #2d3748; font-size: 18px; margin: 0 0 15px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; text-align: ${textAlign};">📅 ${labels.upcomingTitle}</h2>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <tr style="background-color: #f7fafc;">
                  <th style="padding: 12px; text-align: ${textAlign}; font-size: 12px; color: #4a5568; border-bottom: 1px solid #e2e8f0;">${labels.date}</th>
                  <th style="padding: 12px; text-align: center; font-size: 12px; color: #4a5568; border-bottom: 1px solid #e2e8f0;">${labels.count}</th>
                  <th style="padding: 12px; text-align: ${textAlign}; font-size: 12px; color: #4a5568; border-bottom: 1px solid #e2e8f0;">${labels.topProject}</th>
                </tr>
                ${upcomingPasses.map((pass, idx) => `
                  <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f7fafc'};">
                    <td style="padding: 12px; font-size: 13px; color: #2d3748; border-bottom: 1px solid #e2e8f0;">${formatDate(pass.pass_date, lang)}</td>
                    <td style="padding: 12px; font-size: 13px; color: #2d3748; text-align: center; border-bottom: 1px solid #e2e8f0;">${pass.pass_count}</td>
                    <td style="padding: 12px; font-size: 13px; color: #2d3748; border-bottom: 1px solid #e2e8f0;">${pass.top_project || '-'}</td>
                  </tr>
                `).join('')}
              </table>
            </td>
          </tr>
          ` : ''}
          `}

          <!-- CTA Button -->
          <tr>
            <td style="padding: 20px 40px 40px 40px; text-align: center;">
              <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #3182ce 0%, #2b6cb0 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                ${labels.viewDashboard} →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f7fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #a0aec0; font-size: 12px; margin: 0;">
                ${isArabic ? 'تم إرسال هذا الملخص تلقائيًا بناءً على تفضيلاتك' : 'This digest was sent automatically based on your preferences'}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting dept rep gate pass digest processing...");

    // Get all department representatives who have opted into the digest
    const { data: deptReps, error: deptRepsError } = await supabase
      .from("profiles")
      .select(`
        id,
        email,
        full_name,
        preferred_language,
        assigned_department_id,
        dept_digest_opt_in,
        dept_digest_frequency,
        digest_preferred_time,
        digest_timezone,
        tenant_id
      `)
      .eq("dept_digest_opt_in", true)
      .not("assigned_department_id", "is", null)
      .not("email", "is", null);

    if (deptRepsError) {
      console.error("Error fetching dept reps:", deptRepsError);
      throw deptRepsError;
    }

    console.log(`Found ${deptReps?.length || 0} department representatives with digest enabled`);

    if (!deptReps || deptReps.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No recipients to process", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const rep of deptReps as DeptRepProfile[]) {
      try {
        // Get department info
        const { data: department } = await supabase
          .from("departments")
          .select("id, name, name_ar")
          .eq("id", rep.assigned_department_id)
          .single();

        if (!department) {
          console.log(`No department found for rep ${rep.id}`);
          continue;
        }

        const deptName = rep.preferred_language === 'ar' && department.name_ar 
          ? department.name_ar 
          : department.name;

        // Get gate pass statistics
        const { data: statsData } = await supabase.rpc("get_department_gate_pass_stats", {
          p_department_id: rep.assigned_department_id,
          p_tenant_id: rep.tenant_id,
        });

        const stats: GatePassStats = statsData?.[0] || {
          total_submitted: 0,
          pending_approval: 0,
          approved: 0,
          rejected: 0,
          completed: 0,
        };

        // Get pending gate passes
        const { data: pendingData } = await supabase.rpc("get_department_pending_gate_passes", {
          p_department_id: rep.assigned_department_id,
          p_tenant_id: rep.tenant_id,
          p_limit: 10,
        });

        const pendingPasses: PendingGatePass[] = pendingData || [];

        // Get upcoming passes
        const { data: upcomingData } = await supabase.rpc("get_department_upcoming_gate_passes", {
          p_department_id: rep.assigned_department_id,
          p_tenant_id: rep.tenant_id,
        });

        const upcomingPasses: UpcomingPass[] = upcomingData || [];

        // Generate dashboard URL
        const dashboardUrl = `${supabaseUrl.replace('.supabase.co', '')}/dept-gate-passes`;

        // Generate email content
        const lang = rep.preferred_language || 'en';
        const htmlContent = generateEmailHtml(
          deptName,
          stats,
          pendingPasses,
          upcomingPasses,
          lang,
          dashboardUrl
        );

        const subject = lang === 'ar' 
          ? `📊 الملخص اليومي لتصاريح الدخول - ${deptName}`
          : `📊 Daily Gate Pass Digest - ${deptName}`;

        // Send email via existing email function
        const { error: emailError } = await supabase.functions.invoke("send-email", {
          body: {
            to: rep.email,
            subject,
            html: htmlContent,
            from_name: lang === 'ar' ? 'ملخص تصاريح الدخول' : 'Gate Pass Digest',
          },
        });

        if (emailError) {
          console.error(`Error sending digest to ${rep.email}:`, emailError);
          results.push({ email: rep.email, success: false, error: emailError.message });
        } else {
          console.log(`Successfully sent digest to ${rep.email}`);
          results.push({ email: rep.email, success: true });

          // Log to auto_notification_logs
          await supabase.from("auto_notification_logs").insert({
            tenant_id: rep.tenant_id,
            recipient_id: rep.id,
            recipient_email: rep.email,
            notification_type: "dept_rep_gate_pass_digest",
            channel: "email",
            status: "sent",
            sent_at: new Date().toISOString(),
            metadata: {
              department_id: rep.assigned_department_id,
              department_name: deptName,
              stats,
              pending_count: pendingPasses.length,
              upcoming_count: upcomingPasses.length,
            },
          });
        }
      } catch (repError) {
        console.error(`Error processing rep ${rep.id}:`, repError);
        results.push({ 
          email: rep.email, 
          success: false, 
          error: repError instanceof Error ? repError.message : "Unknown error" 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`Digest processing complete. Success: ${successCount}, Failed: ${failCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        successful: successCount,
        failed: failCount,
        details: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in dept-rep-gate-pass-digest:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
