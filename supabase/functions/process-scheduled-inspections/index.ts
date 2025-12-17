import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmailViaSES, getAppUrl, emailButton } from "../_shared/email-sender.ts";

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Processing scheduled inspections...");

    const { data: result, error: processError } = await supabase.rpc("process_due_inspection_schedules");
    if (processError) throw processError;

    const processResult = result as ProcessResult;
    console.log(`Created ${processResult.sessions_created} sessions`);

    if (processResult.sessions_created > 0) {
      for (const session of processResult.sessions) {
        try {
          const { data: inspector } = await supabase.from("profiles").select("full_name, id").eq("id", session.inspector_id).single();
          const { data: authData } = await supabase.auth.admin.getUserById(session.inspector_id);

          if (authData?.user?.email && inspector) {
            const { data: tenant } = await supabase.from("tenants").select("name").eq("id", session.tenant_id).single();
            const appUrl = getAppUrl();

            const emailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a56db;">New Inspection Session</h2>
                <p>Hello ${inspector.full_name},</p>
                <p>A new inspection session has been automatically created from your scheduled inspection:</p>
                <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                  <p><strong>Schedule:</strong> ${session.schedule_name}</p>
                  <p><strong>Organization:</strong> ${tenant?.name || "N/A"}</p>
                </div>
                ${emailButton("Start Inspection", `${appUrl}/inspections/sessions/${session.session_id}`, "#16a34a")}
                <p style="color: #6b7280; font-size: 12px; margin-top: 32px;">This is an automated message from the HSSE Platform.</p>
              </div>
            `;

            const emailResult = await sendEmailViaSES(
              authData.user.email,
              `New Inspection Session Assigned: ${session.schedule_name}`,
              emailHtml,
              'inspection_assigned'
            );
            
            if (emailResult.success) {
              console.log(`Reminder email sent to ${authData.user.email}`);
            } else {
              console.error(`Failed to send email to ${authData.user.email}:`, emailResult.error);
            }
          }
        } catch (emailError) {
          console.error(`Error sending email for session ${session.session_id}:`, emailError);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, sessions_created: processResult.sessions_created, processed_at: processResult.processed_at }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (error) {
    console.error("Error in process-scheduled-inspections:", error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});
