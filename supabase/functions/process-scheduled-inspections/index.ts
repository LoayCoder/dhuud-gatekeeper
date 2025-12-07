import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreatedSession {
  session_id: string;
  schedule_id: string;
  schedule_name: string;
  inspector_id: string;
  tenant_id: string;
}

interface ProcessResult {
  sessions_created: number;
  sessions: CreatedSession[];
  processed_at: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Processing scheduled inspections...");

    // Call the database function to process due schedules
    const { data: result, error: processError } = await supabase.rpc(
      "process_due_inspection_schedules"
    );

    if (processError) {
      console.error("Error processing schedules:", processError);
      throw processError;
    }

    const processResult = result as ProcessResult;
    console.log(`Created ${processResult.sessions_created} sessions`);

    // Send reminder emails for each created session
    if (resendApiKey && processResult.sessions_created > 0) {
      for (const session of processResult.sessions) {
        try {
          // Get inspector email
          const { data: inspector } = await supabase
            .from("profiles")
            .select("full_name, id")
            .eq("id", session.inspector_id)
            .single();

          // Get user email from auth
          const { data: authData } = await supabase.auth.admin.getUserById(
            session.inspector_id
          );

          if (authData?.user?.email && inspector) {
            // Get tenant info
            const { data: tenant } = await supabase
              .from("tenants")
              .select("name")
              .eq("id", session.tenant_id)
              .single();

            const emailResponse = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${resendApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "HSSE Platform <noreply@dhuud.com>",
                to: authData.user.email,
                subject: `New Inspection Session Assigned: ${session.schedule_name}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #1a56db;">New Inspection Session</h2>
                    <p>Hello ${inspector.full_name},</p>
                    <p>A new inspection session has been automatically created from your scheduled inspection:</p>
                    <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                      <p><strong>Schedule:</strong> ${session.schedule_name}</p>
                      <p><strong>Organization:</strong> ${tenant?.name || "N/A"}</p>
                    </div>
                    <p>Please log in to the HSSE platform to start this inspection.</p>
                    <p style="color: #6b7280; font-size: 12px; margin-top: 32px;">
                      This is an automated message from the HSSE Platform.
                    </p>
                  </div>
                `,
              }),
            });

            if (!emailResponse.ok) {
              console.error(
                `Failed to send email to ${authData.user.email}:`,
                await emailResponse.text()
              );
            } else {
              console.log(`Reminder email sent to ${authData.user.email}`);
            }
          }
        } catch (emailError) {
          console.error(
            `Error sending email for session ${session.session_id}:`,
            emailError
          );
          // Continue processing other sessions
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sessions_created: processResult.sessions_created,
        processed_at: processResult.processed_at,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in process-scheduled-inspections:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
