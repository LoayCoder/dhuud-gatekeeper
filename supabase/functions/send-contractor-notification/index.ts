import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';
import { sendEmail, wrapEmailHtml } from '../_shared/email-sender.ts';
import { sendWaSenderTextMessage } from '../_shared/wasender-whatsapp.ts';

interface NotificationRequest {
  workerId: string;
  workerName: string;
  action: 
    | "worker_approved" 
    | "worker_rejected" 
    | "worker_security_rejected" 
    | "company_rejected"
    | "company_approved"
    | "worker_stage1_approved"
    | "worker_security_approved";
  rejectionReason?: string;
  tenant_id: string;
  companyId?: string;
  targetUserId?: string;
  approverName?: string;
}

// Helper to add delay between messages
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to format date for templates
const formatDate = (date: Date = new Date()): string => {
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

// Helper to get template and render content
async function getTemplateContent(
  supabase: any,
  tenantId: string,
  slug: string,
  variables: Record<string, string>
): Promise<{ subject: string; body: string; found: boolean }> {
  try {
    const { data: template, error } = await supabase
      .from('notification_templates')
      .select('content_pattern, email_subject, variable_keys')
      .eq('tenant_id', tenantId)
      .eq('slug', slug)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (error || !template) {
      console.log(`[Template] Template '${slug}' not found for tenant ${tenantId}`);
      return { subject: '', body: '', found: false };
    }

    // Replace variables in template using {{1}}, {{2}} pattern
    let body = template.content_pattern;
    let subject = template.email_subject || '';
    
    const keys = template.variable_keys || [];
    keys.forEach((key: string, index: number) => {
      const placeholder = `{{${index + 1}}}`;
      const value = variables[key] || `[${key}]`;
      body = body.replaceAll(placeholder, value);
      subject = subject.replaceAll(placeholder, value);
    });

    return { subject, body, found: true };
  } catch (err) {
    console.error(`[Template] Error fetching template '${slug}':`, err);
    return { subject: '', body: '', found: false };
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestData: NotificationRequest = await req.json();

    if (!requestData.workerName || !requestData.action || !requestData.tenant_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let recipientUserIds: string[] = [];

    // For company notifications, notify the specific user who created it
    if ((requestData.action === "company_rejected" || requestData.action === "company_approved") && requestData.targetUserId) {
      recipientUserIds = [requestData.targetUserId];
    } else if (requestData.workerId) {
      // Get the worker's company if not provided
      let companyId = requestData.companyId;
      
      if (!companyId) {
        const { data: worker, error: workerError } = await supabase
          .from("contractor_workers")
          .select("company_id")
          .eq("id", requestData.workerId)
          .single();

        if (workerError || !worker) {
          console.error("Failed to find worker:", workerError);
          return new Response(
            JSON.stringify({ error: "Worker not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        companyId = worker.company_id;
      }

      // Find all contractor representatives for this company
      const { data: reps, error: repsError } = await supabase
        .from("contractor_representatives")
        .select("user_id")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .not("user_id", "is", null);

      if (repsError) {
        console.error("Failed to find representatives:", repsError);
        return new Response(
          JSON.stringify({ error: "Failed to find representatives" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (reps && reps.length > 0) {
        recipientUserIds = reps.map((r) => r.user_id).filter(Boolean);
      }
    }

    if (recipientUserIds.length === 0) {
      console.log("No recipients to notify");
      return new Response(
        JSON.stringify({ message: "No recipients to notify" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine notification content and template based on action
    let notificationType: string;
    let title: string;
    let titleAr: string;
    let body: string;
    let bodyAr: string;
    let templateSlugBase: string;
    let templateVariables: Record<string, string>;
    const currentDate = formatDate();

    switch (requestData.action) {
      case "company_approved":
        notificationType = "contractor_company_approved";
        title = "Company Registration Approved";
        titleAr = "تمت الموافقة على تسجيل الشركة";
        body = `Your company ${requestData.workerName} has been approved. You can now add workers and request gate passes.`;
        bodyAr = `تمت الموافقة على شركتك ${requestData.workerName}. يمكنك الآن إضافة عمال وطلب تصاريح المرور.`;
        templateSlugBase = "company_approved";
        templateVariables = {
          company_name: requestData.workerName,
          approved_by: requestData.approverName || "HSSE Manager",
          approval_date: currentDate,
          login_url: `${Deno.env.get("SITE_URL") || "https://app.example.com"}/contractors`,
        };
        break;

      case "company_rejected":
        notificationType = "contractor_company_rejected";
        title = "Company Registration Rejected";
        titleAr = "تم رفض تسجيل الشركة";
        body = `Your company registration for ${requestData.workerName} has been rejected by the HSSE Manager. ${requestData.rejectionReason ? `Reason: ${requestData.rejectionReason}` : ""}`;
        bodyAr = `تم رفض تسجيل شركتك ${requestData.workerName} من قبل مدير الصحة والسلامة. ${requestData.rejectionReason ? `السبب: ${requestData.rejectionReason}` : ""}`;
        templateSlugBase = "company_rejected";
        templateVariables = {
          company_name: requestData.workerName,
          rejection_reason: requestData.rejectionReason || "Not specified",
          rejected_by: requestData.approverName || "HSSE Manager",
          rejection_date: currentDate,
          resubmit_url: `${Deno.env.get("SITE_URL") || "https://app.example.com"}/contractors/register`,
        };
        break;

      case "worker_stage1_approved":
        notificationType = "contractor_worker_stage1_approved";
        title = "Worker Approved - Pending Security Review";
        titleAr = "تمت الموافقة على العامل - في انتظار المراجعة الأمنية";
        body = `Your worker ${requestData.workerName} has been approved by the Contractor Admin. Security review is pending.`;
        bodyAr = `تمت الموافقة على العامل ${requestData.workerName} من قبل مسؤول المقاولين. المراجعة الأمنية قيد الانتظار.`;
        templateSlugBase = "worker_stage1_approved";
        templateVariables = {
          worker_name: requestData.workerName,
          company_name: "", // Will be fetched if needed
          approved_by: requestData.approverName || "Contractor Admin",
          approval_date: currentDate,
        };
        break;

      case "worker_approved":
      case "worker_security_approved":
        notificationType = "contractor_worker_approved";
        title = "Worker Approved";
        titleAr = "تمت الموافقة على العامل";
        body = `Your worker ${requestData.workerName} has been approved and will receive their safety induction shortly.`;
        bodyAr = `تمت الموافقة على العامل ${requestData.workerName} وسيتلقى التعريف بالسلامة قريباً.`;
        templateSlugBase = "worker_security_approved";
        templateVariables = {
          worker_name: requestData.workerName,
          company_name: "",
          approved_by: requestData.approverName || "Security Supervisor",
          approval_date: currentDate,
          access_date: currentDate,
        };
        break;

      case "worker_rejected":
        notificationType = "contractor_worker_rejected";
        title = "Worker Rejected";
        titleAr = "تم رفض العامل";
        body = `Your worker ${requestData.workerName} has been rejected. ${requestData.rejectionReason ? `Reason: ${requestData.rejectionReason}` : ""}`;
        bodyAr = `تم رفض العامل ${requestData.workerName}. ${requestData.rejectionReason ? `السبب: ${requestData.rejectionReason}` : ""}`;
        templateSlugBase = "worker_rejected";
        templateVariables = {
          worker_name: requestData.workerName,
          company_name: "",
          stage: "Initial Review",
          rejected_by: requestData.approverName || "Contractor Admin",
          rejection_date: currentDate,
          rejection_reason: requestData.rejectionReason || "Not specified",
        };
        break;

      case "worker_security_rejected":
        notificationType = "contractor_worker_security_returned";
        title = "Worker Returned - Security Review";
        titleAr = "تم إرجاع العامل - مراجعة الأمن";
        body = `Your worker ${requestData.workerName} has been returned with security comments. Please address the concerns and resubmit. ${requestData.rejectionReason ? `Comments: ${requestData.rejectionReason}` : ""}`;
        bodyAr = `تم إرجاع العامل ${requestData.workerName} مع ملاحظات أمنية. يرجى معالجة المخاوف وإعادة التقديم. ${requestData.rejectionReason ? `الملاحظات: ${requestData.rejectionReason}` : ""}`;
        templateSlugBase = "worker_security_returned";
        templateVariables = {
          worker_name: requestData.workerName,
          company_name: "",
          reviewer_name: requestData.approverName || "Security Supervisor",
          review_date: currentDate,
          security_comments: requestData.rejectionReason || "Not specified",
        };
        break;

      default:
        notificationType = "contractor_notification";
        title = "Contractor Update";
        titleAr = "تحديث المقاول";
        body = `Update regarding ${requestData.workerName}`;
        bodyAr = `تحديث بخصوص ${requestData.workerName}`;
        templateSlugBase = "";
        templateVariables = {};
    }

    // Insert notifications with 10-second delay between each
    const notifications = [];
    let insertedCount = 0;

    for (let i = 0; i < recipientUserIds.length; i++) {
      const userId = recipientUserIds[i];
      
      // Wait 10 seconds between messages (except for the first one)
      if (i > 0) {
        console.log(`Waiting 10 seconds before sending notification ${i + 1}...`);
        await delay(10000);
      }

      const notification = {
        user_id: userId,
        tenant_id: requestData.tenant_id,
        notification_type: notificationType,
        title,
        title_ar: titleAr,
        body,
        body_ar: bodyAr,
        related_entity_type: requestData.action.includes("company") ? "contractor_company" : "contractor_worker",
        related_entity_id: requestData.workerId,
        is_read: false,
      };

      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notification);

      if (insertError) {
        console.error(`Failed to insert notification for user ${userId}:`, insertError);
      } else {
        insertedCount++;
        notifications.push(notification);
        console.log(`Notification ${i + 1} sent to user ${userId}`);
      }
    }

    console.log(`Created ${insertedCount} notifications for ${requestData.action}`);

    // Send templated email notifications
    if (insertedCount > 0 && templateSlugBase) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, preferred_language")
        .in("id", recipientUserIds);

      if (profiles && profiles.length > 0) {
        for (let i = 0; i < profiles.length; i++) {
          const profile = profiles[i];
          if (!profile.email) continue;

          // Wait 10 seconds between emails (except for the first one)
          if (i > 0) {
            console.log(`Waiting 10 seconds before sending email ${i + 1}...`);
            await delay(10000);
          }

          // Determine language preference
          const lang = profile.preferred_language?.toLowerCase().startsWith("ar") ? "ar" : "en";
          const templateSlug = `${templateSlugBase}_${lang}`;

          try {
            // Try to get template from database
            const templateContent = await getTemplateContent(
              supabase,
              requestData.tenant_id,
              templateSlug,
              templateVariables
            );

            let emailSubject: string;
            let emailBody: string;

            if (templateContent.found) {
              emailSubject = templateContent.subject;
              emailBody = wrapEmailHtml(
                `<div style="white-space: pre-wrap;">${templateContent.body}</div>`,
                lang
              );
            } else {
              // Fallback to hardcoded content
              emailSubject = lang === "ar" ? titleAr : title;
              emailBody = wrapEmailHtml(
                `<h2>${lang === "ar" ? titleAr : title}</h2>
                <p>${lang === "ar" ? bodyAr : body}</p>
                <p style="color: #666; font-size: 12px;">This is an automated notification from the HSSE Platform.</p>`,
                lang
              );
            }

            const result = await sendEmail({
              to: profile.email,
              subject: emailSubject,
              html: emailBody,
              module: 'contractor_access',
            });

            if (result.success) {
              console.log(`Email sent to ${profile.email} using template ${templateSlug}`);
            } else {
              console.error(`Failed to send email to ${profile.email}:`, result.error);
            }
          } catch (emailError) {
            console.error(`Failed to send email to ${profile.email}:`, emailError);
          }
        }
      }
    }

    // Send WhatsApp notifications
    let whatsappSentCount = 0;
    const wasenderApiKey = Deno.env.get('WASENDER_API_KEY');
    
    if (wasenderApiKey && insertedCount > 0) {
      console.log('[WhatsApp] WaSender API key configured, sending WhatsApp notifications...');
      
      // Get profiles with phone numbers and contractor reps with mobile numbers
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, phone_number, preferred_language, full_name")
        .in("id", recipientUserIds);

      // Also get contractor rep mobile numbers
      let repMobileNumbers: { user_id: string; mobile_number: string; full_name: string }[] = [];
      if (requestData.companyId) {
        const { data: reps } = await supabase
          .from("contractor_representatives")
          .select("user_id, mobile_number, full_name")
          .eq("company_id", requestData.companyId)
          .is("deleted_at", null)
          .not("mobile_number", "is", null);
        
        if (reps) {
          repMobileNumbers = reps;
        }
      }

      // Build a map of phone numbers to send to (avoid duplicates)
      const phoneMap = new Map<string, { phone: string; lang: string; name: string }>();
      
      // Add profile phone numbers
      if (profiles) {
        for (const profile of profiles) {
          if (profile.phone_number) {
            const lang = profile.preferred_language?.toLowerCase().startsWith("ar") ? "ar" : "en";
            phoneMap.set(profile.id, { 
              phone: profile.phone_number, 
              lang, 
              name: profile.full_name || '' 
            });
          }
        }
      }

      // Add contractor rep mobile numbers (may override profile phone)
      for (const rep of repMobileNumbers) {
        if (rep.mobile_number && rep.user_id) {
          const existing = phoneMap.get(rep.user_id);
          phoneMap.set(rep.user_id, { 
            phone: rep.mobile_number, 
            lang: existing?.lang || 'en', 
            name: rep.full_name || existing?.name || '' 
          });
        }
      }

      // Send WhatsApp to each recipient
      const phoneEntries = Array.from(phoneMap.entries());
      for (let i = 0; i < phoneEntries.length; i++) {
        const [userId, { phone, lang }] = phoneEntries[i];
        
        // Wait 10 seconds between WhatsApp messages (except for the first one)
        if (i > 0) {
          console.log(`[WhatsApp] Waiting 10 seconds before sending WhatsApp ${i + 1}...`);
          await delay(10000);
        }

        // Build bilingual WhatsApp message
        const whatsAppMessage = buildWhatsAppMessage(requestData.action, {
          name: requestData.workerName,
          reason: requestData.rejectionReason,
          approver: requestData.approverName,
          lang,
        });

        try {
          console.log(`[WhatsApp] Sending to ${phone} (user: ${userId}, lang: ${lang})`);
          const result = await sendWaSenderTextMessage(phone, whatsAppMessage);
          
          if (result.success) {
            whatsappSentCount++;
            console.log(`[WhatsApp] Message sent successfully to ${phone}, messageId: ${result.messageId}`);
          } else {
            console.error(`[WhatsApp] Failed to send to ${phone}:`, result.error);
          }
        } catch (whatsAppError) {
          console.error(`[WhatsApp] Exception sending to ${phone}:`, whatsAppError);
        }
      }

      console.log(`[WhatsApp] Sent ${whatsappSentCount}/${phoneEntries.length} WhatsApp messages`);
    } else if (!wasenderApiKey) {
      console.log('[WhatsApp] WaSender API key not configured, skipping WhatsApp notifications');
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsSent: insertedCount,
        whatsappSent: whatsappSentCount,
        action: requestData.action,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-contractor-notification:", error);
    const origin = req.headers.get('Origin');
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" } }
    );
  }
});

// Helper function to build WhatsApp messages based on action type
function buildWhatsAppMessage(
  action: NotificationRequest['action'],
  params: {
    name: string;
    reason?: string;
    approver?: string;
    lang: string;
  }
): string {
  const { name, reason, approver, lang } = params;
  const isArabic = lang === 'ar';

  const messages: Record<NotificationRequest['action'], { en: string; ar: string }> = {
    company_approved: {
      en: `✅ *Company Registration Approved*

Hello,

Your company *${name}* has been approved${approver ? ` by ${approver}` : ''}.

You can now:
• Add workers for site access
• Submit gate pass requests
• Manage your company profile

Login to your portal to get started.

— HSSE Management Team`,
      ar: `✅ *تمت الموافقة على تسجيل الشركة*

مرحباً،

تمت الموافقة على شركتك *${name}*${approver ? ` من قبل ${approver}` : ''}.

يمكنك الآن:
• إضافة عمال للوصول إلى الموقع
• تقديم طلبات تصاريح المرور
• إدارة ملف شركتك

قم بتسجيل الدخول إلى البوابة للبدء.

— فريق إدارة الصحة والسلامة`,
    },
    company_rejected: {
      en: `❌ *Company Registration Rejected*

Hello,

Your company registration for *${name}* was not approved.

${reason ? `*Reason:* ${reason}` : ''}

Please address the concerns and resubmit your application.

— HSSE Management Team`,
      ar: `❌ *تم رفض تسجيل الشركة*

مرحباً،

لم تتم الموافقة على تسجيل شركتك *${name}*.

${reason ? `*السبب:* ${reason}` : ''}

يرجى معالجة المخاوف وإعادة تقديم طلبك.

— فريق إدارة الصحة والسلامة`,
    },
    worker_stage1_approved: {
      en: `🔄 *Worker Approved - Security Review Pending*

Hello,

Worker *${name}* has been approved by ${approver || 'Contractor Admin'}.

*Next Step:* Security supervisor review is in progress.
You will be notified once security approval is complete.

— HSSE Management Team`,
      ar: `🔄 *تمت الموافقة على العامل - المراجعة الأمنية قيد الانتظار*

مرحباً،

تمت الموافقة على العامل *${name}* من قبل ${approver || 'مسؤول المقاولين'}.

*الخطوة التالية:* المراجعة الأمنية قيد التنفيذ.
سيتم إبلاغك عند اكتمال الموافقة الأمنية.

— فريق إدارة الصحة والسلامة`,
    },
    worker_approved: {
      en: `✅ *Worker Fully Approved*

Hello,

Worker *${name}* has received full approval.

The worker will receive a safety induction shortly and can then present their QR code at the gate for entry.

— HSSE Management Team`,
      ar: `✅ *تمت الموافقة الكاملة على العامل*

مرحباً،

حصل العامل *${name}* على الموافقة الكاملة.

سيتلقى العامل التعريف بالسلامة قريباً ويمكنه بعد ذلك تقديم رمز QR الخاص به عند البوابة للدخول.

— فريق إدارة الصحة والسلامة`,
    },
    worker_security_approved: {
      en: `✅ *Worker Security Approved*

Hello,

Worker *${name}* has received security approval${approver ? ` from ${approver}` : ''}.

The worker will receive a safety induction shortly and can then present their QR code at the gate for entry.

— HSSE Management Team`,
      ar: `✅ *تمت الموافقة الأمنية على العامل*

مرحباً،

حصل العامل *${name}* على الموافقة الأمنية${approver ? ` من ${approver}` : ''}.

سيتلقى العامل التعريف بالسلامة قريباً ويمكنه بعد ذلك تقديم رمز QR الخاص به عند البوابة للدخول.

— فريق إدارة الصحة والسلامة`,
    },
    worker_rejected: {
      en: `❌ *Worker Rejected*

Hello,

Worker *${name}* has been rejected${approver ? ` by ${approver}` : ''}.

${reason ? `*Reason:* ${reason}` : ''}

Please address the concerns and resubmit the worker application.

— HSSE Management Team`,
      ar: `❌ *تم رفض العامل*

مرحباً،

تم رفض العامل *${name}*${approver ? ` من قبل ${approver}` : ''}.

${reason ? `*السبب:* ${reason}` : ''}

يرجى معالجة المخاوف وإعادة تقديم طلب العامل.

— فريق إدارة الصحة والسلامة`,
    },
    worker_security_rejected: {
      en: `🔄 *Worker Returned - Security Review*

Hello,

Worker *${name}* has been returned with security comments.

${reason ? `*Comments:* ${reason}` : ''}

Please address the concerns and resubmit.

— HSSE Management Team`,
      ar: `🔄 *تم إرجاع العامل - المراجعة الأمنية*

مرحباً،

تم إرجاع العامل *${name}* مع ملاحظات أمنية.

${reason ? `*الملاحظات:* ${reason}` : ''}

يرجى معالجة المخاوف وإعادة التقديم.

— فريق إدارة الصحة والسلامة`,
    },
  };

  const template = messages[action];
  return isArabic ? template.ar : template.en;
}
