import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  workerId: string;
  workerName: string;
  action: "worker_approved" | "worker_rejected" | "worker_security_rejected" | "company_rejected";
  rejectionReason?: string;
  tenant_id: string;
  companyId?: string;
  targetUserId?: string; // Specific user to notify (for company rejection)
}

// Helper to add delay between messages
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestData: NotificationRequest = await req.json();

    if (!requestData.workerName || !requestData.action || !requestData.tenant_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let recipientUserIds: string[] = [];

    // For company rejection, notify the specific user who created it
    if (requestData.action === "company_rejected" && requestData.targetUserId) {
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

    // Determine notification content based on action
    let notificationType: string;
    let title: string;
    let titleAr: string;
    let body: string;
    let bodyAr: string;

    switch (requestData.action) {
      case "worker_approved":
        notificationType = "contractor_worker_approved";
        title = "Worker Approved";
        titleAr = "تمت الموافقة على العامل";
        body = `Your worker ${requestData.workerName} has been approved and will receive their safety induction shortly.`;
        bodyAr = `تمت الموافقة على العامل ${requestData.workerName} وسيتلقى التعريف بالسلامة قريباً.`;
        break;

      case "worker_rejected":
        notificationType = "contractor_worker_rejected";
        title = "Worker Rejected";
        titleAr = "تم رفض العامل";
        body = `Your worker ${requestData.workerName} has been rejected. ${requestData.rejectionReason ? `Reason: ${requestData.rejectionReason}` : ""}`;
        bodyAr = `تم رفض العامل ${requestData.workerName}. ${requestData.rejectionReason ? `السبب: ${requestData.rejectionReason}` : ""}`;
        break;

      case "worker_security_rejected":
        notificationType = "contractor_worker_security_returned";
        title = "Worker Returned - Security Review";
        titleAr = "تم إرجاع العامل - مراجعة الأمن";
        body = `Your worker ${requestData.workerName} has been returned with security comments. Please address the concerns and resubmit. ${requestData.rejectionReason ? `Comments: ${requestData.rejectionReason}` : ""}`;
        bodyAr = `تم إرجاع العامل ${requestData.workerName} مع ملاحظات أمنية. يرجى معالجة المخاوف وإعادة التقديم. ${requestData.rejectionReason ? `الملاحظات: ${requestData.rejectionReason}` : ""}`;
        break;

      case "company_rejected":
        notificationType = "contractor_company_rejected";
        title = "Company Registration Rejected";
        titleAr = "تم رفض تسجيل الشركة";
        body = `Your company registration for ${requestData.workerName} has been rejected by the HSSE Manager. ${requestData.rejectionReason ? `Reason: ${requestData.rejectionReason}` : ""}`;
        bodyAr = `تم رفض تسجيل شركتك ${requestData.workerName} من قبل مدير الصحة والسلامة. ${requestData.rejectionReason ? `السبب: ${requestData.rejectionReason}` : ""}`;
        break;

      default:
        notificationType = "contractor_notification";
        title = "Contractor Update";
        titleAr = "تحديث المقاول";
        body = `Update regarding ${requestData.workerName}`;
        bodyAr = `تحديث بخصوص ${requestData.workerName}`;
    }

    // Insert notifications with 10-second delay between each
    const notifications = [];
    let insertedCount = 0;

    for (let i = 0; i < recipientUserIds.length; i++) {
      const userId = recipientUserIds[i];
      
      // Wait 10 seconds between messages (except for the first one)
      if (i > 0) {
        console.log(`Waiting 10 seconds before sending notification ${i + 1}...`);
        await delay(10000); // 10 seconds
      }

      const notification = {
        user_id: userId,
        tenant_id: requestData.tenant_id,
        notification_type: notificationType,
        title,
        title_ar: titleAr,
        body,
        body_ar: bodyAr,
        related_entity_type: requestData.action === "company_rejected" ? "contractor_company" : "contractor_worker",
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

    // Send email notifications if Resend is configured (also with delays)
    if (resendApiKey && insertedCount > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
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

          try {
            const response = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${resendApiKey}`,
              },
              body: JSON.stringify({
                from: "HSSE Platform <noreply@resend.dev>",
                to: [profile.email],
                subject: title,
                html: `
                  <h2>${title}</h2>
                  <p>${body}</p>
                  <p style="color: #666; font-size: 12px;">This is an automated notification from the HSSE Platform.</p>
                `,
              }),
            });

            if (response.ok) {
              console.log(`Email sent to ${profile.email}`);
            } else {
              const errorText = await response.text();
              console.error(`Failed to send email to ${profile.email}:`, errorText);
            }
          } catch (emailError) {
            console.error(`Failed to send email to ${profile.email}:`, emailError);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsSent: insertedCount,
        action: requestData.action,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-contractor-notification:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
