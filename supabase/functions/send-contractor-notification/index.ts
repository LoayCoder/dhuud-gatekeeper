import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  workerId: string;
  workerName: string;
  action: "worker_approved" | "worker_rejected";
  rejectionReason?: string;
  tenant_id: string;
}

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

    if (!requestData.workerId || !requestData.workerName || !requestData.action || !requestData.tenant_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the worker's company
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

    // Find all contractor representatives for this company
    const { data: reps, error: repsError } = await supabase
      .from("contractor_representatives")
      .select("user_id")
      .eq("company_id", worker.company_id)
      .is("deleted_at", null);

    if (repsError) {
      console.error("Failed to find representatives:", repsError);
      return new Response(
        JSON.stringify({ error: "Failed to find representatives" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!reps || reps.length === 0) {
      console.log("No representatives found for company:", worker.company_id);
      return new Response(
        JSON.stringify({ message: "No representatives to notify" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const notificationType = requestData.action === "worker_approved" 
      ? "contractor_worker_approved" 
      : "contractor_worker_rejected";

    const title = requestData.action === "worker_approved"
      ? "Worker Approved"
      : "Worker Rejected";

    const titleAr = requestData.action === "worker_approved"
      ? "تمت الموافقة على العامل"
      : "تم رفض العامل";

    const body = requestData.action === "worker_approved"
      ? `Your worker ${requestData.workerName} has been approved and can now proceed with induction.`
      : `Your worker ${requestData.workerName} has been rejected. ${requestData.rejectionReason ? `Reason: ${requestData.rejectionReason}` : ""}`;

    const bodyAr = requestData.action === "worker_approved"
      ? `تمت الموافقة على العامل ${requestData.workerName} ويمكنه الآن متابعة التعريف.`
      : `تم رفض العامل ${requestData.workerName}. ${requestData.rejectionReason ? `السبب: ${requestData.rejectionReason}` : ""}`;

    // Insert notifications for each representative
    const notifications = reps.map((rep) => ({
      user_id: rep.user_id,
      tenant_id: requestData.tenant_id,
      notification_type: notificationType,
      title,
      title_ar: titleAr,
      body,
      body_ar: bodyAr,
      related_entity_type: "contractor_worker",
      related_entity_id: requestData.workerId,
      is_read: false,
    }));

    const { error: insertError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (insertError) {
      console.error("Failed to insert notifications:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create notifications" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Created ${notifications.length} notifications for worker ${requestData.action}`);

    // Send email notifications if Resend is configured
    if (resendApiKey) {
      // Get user emails
      const userIds = reps.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", userIds);

      if (profiles && profiles.length > 0) {
        const emailPromises = profiles.map(async (profile) => {
          if (!profile.email) return;

          try {
            // Use fetch to call Resend API directly
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
        });

        await Promise.allSettled(emailPromises);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsSent: notifications.length,
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
